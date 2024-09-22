import { Database } from "@/lib/types/schema";
import {
    AdSegmentSchema,
    generateScript,
} from "../../script/generate/services";
import { Video } from "../../broll/route";
import { supabase } from "@/lib/supabase/client";
import { exec } from "child_process";
import util from "util";
import path from "path";
import os from "os";
import { promises as fs } from "fs";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { generateVideo } from "../../video/generate/services";
import { GenerateVideoResponse } from "../../video/generate/types";

const execPromise = util.promisify(exec);

// Add this new function
async function safeExecPromise(command: string): Promise<string> {
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const { stdout } = await execPromise(command);
            // if (stderr) {
            //     console.warn(`FFmpeg command produced stderr: ${stderr}`);
            // }
            return stdout;
        } catch (error) {
            console.error(
                `Error executing FFmpeg command (attempt ${
                    retries + 1
                }/${maxRetries}): ${command}`,
            );
            console.error(`Error details:`, error);
            retries++;

            if (retries === maxRetries) {
                if (error instanceof Error) {
                    throw new Error(
                        `FFmpeg command failed after ${maxRetries} attempts: ${error.message}`,
                    );
                } else {
                    throw new Error(
                        `FFmpeg command failed after ${maxRetries} attempts: Unknown error`,
                    );
                }
            }

            // Wait for a short time before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }

    // This line should never be reached, but TypeScript requires it
    throw new Error("Unexpected error in safeExecPromise");
}

type VoterRecord = Database["public"]["Tables"]["voter_records"]["Row"];
type AdjustedTimestamp = {
    start: number;
    end: number;
    is_b_roll: boolean;
    b_roll_link: string | null;
};
type AudioResponse = {
    audio: string;
    wordTimings: [string, number, number][];
};
type VideoWithTimings = {
    video: Video;
    start: number;
    end: number;
};

// Main function to generate an ad for a given voter
export async function generateAd(voter: VoterRecord) {
    // 1. Get script segments
    const script_segments: z.infer<typeof AdSegmentSchema>[] =
        await getScriptSegments(voter);
    // 2. Combine all script segments into a full transcript
    const full_transcript: string = getFullTranscript(script_segments);
    // 3. Generate audio from full transcript
    const audio_response: AudioResponse = await generateAudio(full_transcript);
    // 4. Generate B-roll options
    const b_roll_options = await generateBRollOptions(script_segments);
    // 5. Get b-roll timestamps
    const b_roll_timestamps = await getBRollTimestamps(
        script_segments,
        audio_response.wordTimings,
    );
    // 6. Filter b-roll options based on b-roll timestamps
    const filtered_b_roll_with_timestamps: VideoWithTimings[] =
        await filterBRollOptions(b_roll_options, b_roll_timestamps);

    // 7. Get AI mask video url from supabase
    const { data: { publicUrl: video_url } } = await supabase.storage.from(
        "video-files",
    )
        .getPublicUrl("kamala_clip_1.mp4");
    console.log("video_url", video_url);

    // Upload audio to supabase and get public url
    const { publicUrl: audio_url } = await upload_audio_to_supabase(
        audio_response.audio,
    );

    // 9. Generate AI video without cropped B-roll
    const ai_generated_video = await generateVideo({
        videoUrl: video_url,
        audioUrl: audio_url,
    });

    if (ai_generated_video.error) {
        throw new Error("Error generating AI video");
    } else if (!ai_generated_video.resultUrl) {
        throw new Error("AI video generation failed");
    }

    console.log(
        "filtered_b_roll_with_timestamps",
        filtered_b_roll_with_timestamps,
    );

    // 10. Crop B-roll videos to match allocated time
    const croppedBRollVideos = await Promise.all(
        filtered_b_roll_with_timestamps.map(async (bRoll, index) => {
            const { video, start, end } = bRoll;
            const requiredDuration = Math.max(end - start, 5);
            const tempDir = await fs.mkdtemp(
                path.join(os.tmpdir(), "broll-cropping-"),
            );
            const inputPath = path.join(tempDir, `input${index}.mp4`);
            const outputPath = path.join(tempDir, `output${index}.mp4`);

            try {
                // Download the video
                const response = await fetch(video.video_files[0].link);
                const buffer = Buffer.from(await response.arrayBuffer());
                await fs.writeFile(inputPath, buffer);

                if (video.duration > requiredDuration) {
                    // Crop the video
                    const ffmpegCommand =
                        `ffmpeg -i "${inputPath}" -t ${requiredDuration} -c copy "${outputPath}"`;
                    console.log("ffmpegCommand", ffmpegCommand);
                    await execPromise(ffmpegCommand);
                }
            } catch (error) {
                console.error("Error in cropping B-roll:", error);
                await fs.rm(tempDir, { recursive: true, force: true });
                return null; // Return original if cropping fails
            }
            // Return the output path, it's start timestamp, and its actual end timestamp (could be less than required)
            return {
                outputPath,
                start,
                end: Math.max(Math.min(start + video.duration, end), start + 5),
            };
        }).filter((v) => v !== null),
    );

    console.log("croppedBRollVideos", croppedBRollVideos);

    // 11. Download the AI generated video
    const aiVideoTempPath = path.join(os.tmpdir(), `ai_video_${uuidv4()}.mp4`);
    const aiVideoResponse = await fetch(ai_generated_video.resultUrl);
    const aiVideoBuffer = await aiVideoResponse.arrayBuffer();
    await fs.writeFile(aiVideoTempPath, Buffer.from(aiVideoBuffer));

    // 12. Overlay B-roll videos on the AI generated video
    const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "video-processing-"),
    );
    const outputPath = path.join(tempDir, `final_output.mp4`);

    const inputs = [
        aiVideoTempPath,
        ...croppedBRollVideos.map((bRoll) => bRoll!.outputPath),
    ];
    const filterComplexParts = [];
    let overlayChains = "";
    let lastOutput = "[0:v]";

    for (let i = 0; i < croppedBRollVideos.length; i++) {
        const bRoll = croppedBRollVideos[i];
        if (!bRoll) {
            console.log("bRoll is null");
            continue;
        }
        const inputIndex = i + 1; // Since input 0 is the main video
        const duration = bRoll.end - bRoll.start;
        const startTime = bRoll.start;

        // Prepare the B-roll filter
        filterComplexParts.push(`
            [${inputIndex}:v]trim=start=0:duration=${duration},setpts=PTS-STARTPTS+${startTime}/TB,scale=1920:1080,setsar=1[v${i}];
        `);

        // Overlay the B-roll onto the main video or previous overlay
        const nextOutput = i === croppedBRollVideos.length - 1
            ? "[outv]"
            : `[tmp${i}]`;
        overlayChains += `
            ${lastOutput}[v${i}]overlay=enable='between(t,${startTime},${
            startTime + duration
        })':x=(W-w)/2:y=(H-h)/2${nextOutput};
        `;
        lastOutput = nextOutput;
    }

    const filterComplex = filterComplexParts.join("") + overlayChains;

    const ffmpegCommand = `ffmpeg ${
        inputs.map((input) => `-i "${input}"`).join(" ")
    } -filter_complex "${filterComplex}" -map "[outv]" -map 0:a -c:v libx264 -c:a aac "${outputPath}"`;

    // Execute the ffmpeg command
    console.log("ffmpegCommand", ffmpegCommand);
    await execPromise(ffmpegCommand);

    // 13. Upload the final video to Supabase
    const finalVideoBuffer = await fs.readFile(outputPath);
    const finalVideoName = `final_ad_${uuidv4()}.mp4`;
    const { error: uploadError } = await supabase.storage
        .from("video-files")
        .upload(finalVideoName, finalVideoBuffer, {
            contentType: "video/mp4",
        });

    if (uploadError) {
        throw new Error(`Error uploading final video: ${uploadError.message}`);
    }

    // 14. Get the public URL of the uploaded video
    const { data: { publicUrl } } = supabase.storage
        .from("video-files")
        .getPublicUrl(finalVideoName);

    if (!publicUrl) {
        throw new Error("Failed to get public URL for final video");
    }

    // 15. Clean up temporary files
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.unlink(aiVideoTempPath);

    // 16. Return the public URL of the final video
    return { finalVideoUrl: publicUrl };
}

async function download_video_from_supabase_to_local_and_return_path(
    video_url: string,
    location: string,
): Promise<string> {
    // Extract the file name from the URL
    const fileName = video_url.split("/").pop();
    if (!fileName) {
        throw new Error("Invalid video URL");
    }

    // Get the public URL for the file
    const { data } = await supabase.storage.from(location).getPublicUrl(
        fileName,
    );
    if (!data.publicUrl) {
        console.error("Error fetching video file:", data.publicUrl);
        throw new Error("Failed to fetch video file from Supabase");
    }

    // Create a temporary directory
    const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "video-processing-"),
    );
    const tempFilePath = path.join(tempDir, fileName);

    try {
        // Download the file
        const response = await fetch(data.publicUrl);
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.statusText}`);
        }

        // Write the file to the temporary directory
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.writeFile(tempFilePath, buffer);

        return tempFilePath;
    } catch (error) {
        // Clean up the temporary directory in case of an error
        await fs.rm(tempDir, { recursive: true, force: true });
        throw error;
    }
}

async function upload_audio_to_supabase(
    audio: string,
): Promise<{ publicUrl: string }> {
    const filename = `audio_${Date.now()}`;
    console.log("filename", filename);

    const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "video-processing-"),
    );
    console.log("tempDir", tempDir);

    // Decode base64 audio string
    const audioBuffer = Buffer.from(audio, "base64");

    // Save the PCM file locally
    const localPcmPath = path.join(tempDir, `${filename}.pcm`);
    console.log("localPcmPath", localPcmPath);
    await fs.writeFile(localPcmPath, audioBuffer);

    // Run ffmpeg command to convert PCM to WAV
    const localWAVPath = path.join(tempDir, `${filename}.wav`);
    console.log("localWAVPath", localWAVPath);
    const ffmpegCommand =
        `ffmpeg -f f32le -i "${localPcmPath}" "${localWAVPath}"`;
    console.log("ffmpegCommand", ffmpegCommand);
    await execPromise(ffmpegCommand);

    const wavFileStats = await fs.stat(localWAVPath);
    console.log("WAV file size:", wavFileStats.size);

    // Read the WAV file
    const fileBuffer = await fs.readFile(localWAVPath);

    // Upload to Supabase
    const { error } = await supabase.storage
        .from("audio-files")
        .upload(`${filename}.wav`, fileBuffer, { contentType: "audio/wav" });

    if (error) {
        console.error(`Error uploading file to Supabase: ${error.message}`);
        throw error;
    }

    const { data } = supabase.storage
        .from("audio-files")
        .getPublicUrl(`${filename}.wav`);

    if (!data || !data.publicUrl) {
        throw new Error("Failed to get public URL for uploaded audio");
    }

    // Clean up temporary files
    await fs.unlink(localPcmPath);
    await fs.unlink(localWAVPath);
    await fs.rmdir(tempDir);

    return { publicUrl: data.publicUrl };
}

async function getAIVideoMask(video_url: string): Promise<string> {
    const { data: { publicUrl } } = await supabase.storage.from("video-files")
        .getPublicUrl(video_url);
    if (!publicUrl) {
        console.error("Error fetching video file:", publicUrl);
        throw new Error("Failed to fetch video file from Supabase");
    }
    return publicUrl;
}

async function decodeConvertAudio(
    audioBase64: string,
): Promise<{ wavFile: string }> {
    const audioBuffer = Buffer.from(audioBase64, "base64");

    // Generate a unique filename
    const filename = `audio_${Date.now()}`;
    console.log("filename", filename);

    const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "video-processing-"),
    );
    console.log("tempDir", tempDir);

    // Save the PCM file locally
    const localPcmPath = path.join(tempDir, `${filename}.pcm`);
    console.log("localPcmPath", localPcmPath);
    await fs.writeFile(localPcmPath, audioBuffer);

    // Run ffmpeg command to convert PCM to WAV
    const localWAVPath = path.join(tempDir, `${filename}.wav`);
    console.log("localWAVPath", localWAVPath);
    const ffmpegCommand =
        `ffmpeg -f f32le -i "${localPcmPath}" "${localWAVPath}"`;
    console.log("ffmpegCommand", ffmpegCommand);
    await execPromise(ffmpegCommand);
    return { wavFile: localWAVPath };
}

async function getBRollTimestamps(
    segments: z.infer<typeof AdSegmentSchema>[],
    wordTimings: [string, number, number][],
): Promise<[number, number][]> {
    const bRollTimestamps: [number, number][] = [];
    let wordTimingsIdx = 0;

    for (const segment of segments) {
        const segmentWordCount = segment.spoken_transcript.split(" ").length;

        if (segment.is_b_roll) {
            const startIdx = wordTimingsIdx;
            const endIdx = wordTimingsIdx + segmentWordCount - 1;

            if (endIdx >= wordTimings.length) {
                throw new Error("Word timings index out of bounds");
            }

            const new_start = wordTimings[startIdx][1];
            const new_end = wordTimings[endIdx][2];
            bRollTimestamps.push([new_start, new_end]);
        }

        wordTimingsIdx += segmentWordCount;
    }

    return bRollTimestamps;
}

// while (segmentIdx < segments.length && wordTimingsIdx < wordTimings.length) {
//     if (chunkIdx >= chunk.length) {
//         segmentIdx += 1
//         chunkIdx = 0
//         end = wordTimings[wordTimingsIdx][1]
//         bRollTimestamps.push([start, end])
//     }
//     if (segments[segmentIdx].is_b_roll) {
//         start = wordTimings[wordTimingsIdx][1]
//         wordTimingsIdx += 1
//     }
//     chunkIdx += 1
//     wordTimingsIdx += 1
// }
//     if (chunkIdx >= chunk.length) {
//         segmentIdx += 1
//         chunkIdx = 0
//         end = wordTimings[segmentIdx][1]
//         bRollTimestamps.push([start, end])
//     }
//     if (segmentIdx >= segments.length) {
//         throw new Error("Segment index out of bounds");
//     }
//     if (chunkIdx === 0) {
//         if (is_b_roll) {
//         start = wordTimings[segmentIdx][1]
//         chunk = segment.spoken_transcript.split(" ")
//     }

//     if (chunk[chunkIdx].toLowerCase() !== wordTimings[segmentIdx][0].toLowerCase()) {
//         throw new Error("Word mismatch");
//     }
//     chunkIdx += 1
// }

function filterBRollOptions(
    b_roll_options: Video[][],
    b_roll_timestamps: [number, number][],
): VideoWithTimings[] {
    return b_roll_timestamps
        .map(([start, end], index) => {
            const video = b_roll_options[index]?.find((v) =>
                v.duration >= end - start - 2
            );
            return video ? { video, start, end } : null;
        })
        .filter((v): v is VideoWithTimings => v !== null);
}

async function PromiseAllBatch<T>(
    promises: Promise<T>[],
    n_proc: number,
): Promise<T[]> {
    const batches = Array.from(
        { length: Math.ceil(promises.length / n_proc) },
        (_, i) => promises.slice(i * n_proc, (i + 1) * n_proc),
    );
    const batchPromises = batches.map((batch) => Promise.all(batch));
    return (await Promise.all(batchPromises)).flat();
}

async function getScriptSegments(voter: VoterRecord) {
    return (await generateScript(voter)).segments;
}

function getFullTranscript(script_segments: z.infer<typeof AdSegmentSchema>[]) {
    return script_segments.map((segment) => segment.spoken_transcript).join(
        " ",
    );
}

async function generateAudio(transcript: string) {
    console.log("Generating audio");
    const audio_response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/voice/generate`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript }),
        },
    );

    if (!audio_response.ok) {
        throw new Error("Failed to generate audio");
    }

    const result = await audio_response.json();
    console.log("Audio generated");
    return result;
}

async function generateBRollOptions(
    script_segments: z.infer<typeof AdSegmentSchema>[],
): Promise<(Video[])[]> {
    const getBRollOptions = async (
        query: string,
    ): Promise<Video[]> => {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/broll`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ query }),
            },
        );

        if (!response.ok) {
            console.error("Failed to generate b-roll options");
            return [];
        }

        const data: { videos: Video[] } = await response.json();
        return data.videos;
    };

    return Promise.all(
        script_segments
            .filter((segment) =>
                segment.is_b_roll && segment.b_roll_search_query
            )
            .map(async (segment) =>
                getBRollOptions(segment.b_roll_search_query!)
            ),
    );
}

async function convertAndSaveTempAudio(
    audioBase64: string,
): Promise<{ wavFile: string }> {
    // Decode base64 audio string
    const audioBuffer = Buffer.from(audioBase64, "base64");

    // Generate a unique filename
    const filename = `audio_${Date.now()}`;
    console.log("filename", filename);

    const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "video-processing-"),
    );
    console.log("tempDir", tempDir);

    // Save the PCM file locally
    const localPcmPath = path.join(tempDir, `${filename}.pcm`);
    console.log("localPcmPath", localPcmPath);
    await fs.writeFile(localPcmPath, audioBuffer);

    // Run ffmpeg command to convert PCM to WAV
    const localWAVPath = path.join(tempDir, `${filename}.wav`);
    console.log("localWAVPath", localWAVPath);
    const ffmpegCommand =
        `ffmpeg -f f32le -i "${localPcmPath}" "${localWAVPath}"`;
    console.log("ffmpegCommand", ffmpegCommand);
    await safeExecPromise(ffmpegCommand);

    const wavFileStats = await fs.stat(localWAVPath);
    console.log("WAV file size:", wavFileStats.size);

    // Return the filenames for further use if needed
    return {
        wavFile: localWAVPath,
    };
}

function constructSegmentTimestamps(
    script_segments: z.infer<typeof AdSegmentSchema>[],
    wordTimings: [string, number, number][],
): [number, number][] {
    const segmentTimestamps: [number, number][] = [];
    let segmentIndex = 0;
    let wordIndex = 0;
    let currentSegmentWords: string[] = [];

    console.log(
        "Script segments:",
        script_segments.map((segment) => segment.spoken_transcript),
    );
    console.log("Word timings:", wordTimings);
    let segmentStartTime = 0;
    let segmentEndTime = 0;

    for (const [word, start, end] of wordTimings) {
        if (segmentIndex === script_segments.length) {
            throw new Error(
                `Generated audio is longer than the script: ${
                    script_segments.map((segment) => segment.spoken_transcript)
                        .join(" ")
                }`,
            );
        }

        if (wordIndex === 0) {
            currentSegmentWords = script_segments[segmentIndex]
                .spoken_transcript
                .split(" ")
                .map((w) => w.replace(/[^\w]/g, "").toLowerCase());
            segmentStartTime = start;
        }

        const cleanedWord = word.replace(/[^\w]/g, "").toLowerCase();
        if (currentSegmentWords[wordIndex] === cleanedWord) {
            wordIndex++;
            segmentEndTime = end;

            if (wordIndex === currentSegmentWords.length) {
                segmentTimestamps.push([segmentStartTime, segmentEndTime]);
                console.log(
                    `Segment ${segmentIndex} timestamps: [${segmentStartTime}, ${segmentEndTime}]`,
                );
                segmentIndex++;
                wordIndex = 0;
            }
        } else {
            throw new Error(
                `Word mismatch: Expected "${
                    currentSegmentWords[wordIndex]
                }", got "${word}"`,
            );
        }
    }

    if (segmentIndex < script_segments.length) {
        throw new Error("Generated audio is shorter than the script");
    }

    return segmentTimestamps;
}

function filterBRollSegments(
    b_roll_response: (Video[] | null)[],
    segmentTimestamps: [number, number][],
): (Video | null)[] {
    return b_roll_response.map(
        (broll: Video[] | null, index: number) => {
            const [start, end] = segmentTimestamps[index];
            if (!broll) {
                return null;
            }
            for (const video of broll) {
                const length = end - start;
                if (
                    video.duration >= length - 2 && video.video_files.length > 0
                ) {
                    return video;
                }
            }
            return null;
        },
    );
}

async function adjustTimestamps(
    segmentTimestamps: [number, number][],
    filteredBRollSegments: (Video | null)[],
): Promise<AdjustedTimestamp[]> {
    const adjustedTimestamps: AdjustedTimestamp[] = [];
    const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "b-roll-processing-"),
    );

    for (let i = 0; i < segmentTimestamps.length; i++) {
        const [start, end] = segmentTimestamps[i];
        const bRoll = filteredBRollSegments[i];
        if (bRoll) {
            const segmentDuration = end - start;
            if (segmentDuration > bRoll.duration) {
                // B-roll is shorter than the segment, use it as is
                adjustedTimestamps.push({
                    start,
                    end: start + bRoll.duration,
                    is_b_roll: true,
                    b_roll_link: bRoll.video_files[0].link,
                });
                adjustedTimestamps.push({
                    start: start + bRoll.duration,
                    end,
                    is_b_roll: false,
                    b_roll_link: null,
                });
            } else {
                // B-roll needs to be cropped
                const croppedBRollLink = await cropAndUploadBRoll(
                    bRoll,
                    segmentDuration,
                    tempDir,
                );
                adjustedTimestamps.push({
                    start,
                    end,
                    is_b_roll: true,
                    b_roll_link: croppedBRollLink,
                });
            }
        } else {
            adjustedTimestamps.push({
                start,
                end,
                is_b_roll: false,
                b_roll_link: null,
            });
        }
    }

    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });

    return adjustedTimestamps;
}

async function cropAndUploadBRoll(
    bRoll: Video,
    duration: number,
    tempDir: string,
): Promise<string> {
    const videoUrl = bRoll.video_files[0].link;
    const tempFilePath = path.join(tempDir, `original_${uuidv4()}.mp4`);
    const croppedFilePath = path.join(tempDir, `cropped_${uuidv4()}.mp4`);

    try {
        // Download the video
        const response = await fetch(videoUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(tempFilePath, buffer);

        // Crop the video
        const ffmpegCommand =
            `ffmpeg -i "${tempFilePath}" -t ${duration} -c copy "${croppedFilePath}"`;
        await safeExecPromise(ffmpegCommand);

        // Upload the cropped video to Supabase
        const fileBuffer = await fs.readFile(croppedFilePath);
        const fileName = `cropped_b_roll_${uuidv4()}.mp4`;
        const { error } = await supabase.storage
            .from("broll")
            .upload(fileName, fileBuffer, { contentType: "video/mp4" });

        if (error) {
            throw new Error(
                `Error uploading cropped B-roll to Supabase: ${error.message}`,
            );
        }

        // Get the public URL of the uploaded cropped video
        const { data: { publicUrl } } = supabase.storage
            .from("broll")
            .getPublicUrl(fileName);

        if (!publicUrl) {
            throw new Error("Error getting public URL for cropped B-roll");
        }

        return publicUrl;
    } catch (error) {
        console.error("Error in cropAndUploadBRoll:", error);
        throw error;
    }
}

function combineFinalTimestamps(
    adjustedTimestamps: AdjustedTimestamp[],
    filteredBRollSegments: (Video | null)[],
): AdjustedTimestamp[] {
    const finalTimestamps: AdjustedTimestamp[] = [];
    for (let i = 0; i < adjustedTimestamps.length; i++) {
        const current = adjustedTimestamps[i];
        const next = adjustedTimestamps[i + 1];

        if (next) {
            const currentBRoll = filteredBRollSegments[i];
            const nextBRoll = filteredBRollSegments[i + 1];

            if (!currentBRoll && !nextBRoll) {
                // Both are non-B-roll, combine them
                finalTimestamps.push({
                    start: current.start,
                    end: next.end,
                    is_b_roll: false,
                    b_roll_link: null,
                });
                i++; // Skip the next iteration
            } else if (!currentBRoll && nextBRoll) {
                // Current is non-B-roll, next is B-roll
                finalTimestamps.push({
                    start: current.start,
                    end: next.start,
                    is_b_roll: false,
                    b_roll_link: null,
                });
            } else if (currentBRoll && !nextBRoll) {
                // Current is B-roll, next is non-B-roll
                finalTimestamps.push(current);
                if (i + 1 < adjustedTimestamps.length - 1) {
                    next.start = current.end; // Adjust start time of next segment
                }
            } else {
                // Both are B-roll
                finalTimestamps.push(current);
            }
        } else {
            // Last segment
            finalTimestamps.push(current);
        }
    }
    return finalTimestamps;
}

async function trim_audio_to_segments_upload_and_choose_clip(
    wavFile: string,
    timestamps: AdjustedTimestamp[],
): Promise<(string | null)[]> {
    const processTimestamp = async (
        timestamp: AdjustedTimestamp,
    ): Promise<string | null> => {
        console.log("Trimming audio to segment", timestamp);
        if (timestamp.is_b_roll) {
            return null;
        }

        const { start, end } = timestamp;
        const fileName = `${wavFile}_trimmed_${start}_${end}.wav`;
        const ffmpegCommand =
            `ffmpeg -i "${wavFile}" -ss ${start} -to ${end} -c copy "${fileName}"`;

        console.log("ffmpegCommand", ffmpegCommand);
        await safeExecPromise(ffmpegCommand);

        const fileBuffer = await fs.readFile(fileName);
        const { error } = await supabase.storage
            .from("audio-files")
            .upload(fileName, fileBuffer, { contentType: "audio/wav" });

        console.log("Uploaded audio to Supabase");
        if (error) {
            console.error(`Error uploading file to Supabase: ${error.message}`);
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from("audio-files")
            .getPublicUrl(fileName);

        console.log("Got public URL", publicUrl);
        if (!publicUrl) {
            console.error(`Error getting public URL`);
            throw new Error("Error getting public URL");
        }

        console.log("Cleaned up local trimmed file");
        return publicUrl;
    };

    return Promise.all(timestamps.map(processTimestamp));
}

async function choose_and_upload_face_clips(
    timestamps: AdjustedTimestamp[],
    videoFile: string,
): Promise<(string | null)[]> {
    const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "video-processing-"),
    );
    const localVideoPath = path.join(tempDir, "input_video.mp4");

    try {
        const { data, error } = await supabase.storage
            .from("video-files")
            .download(videoFile);

        if (error) {
            throw new Error(`Error downloading video file: ${error.message}`);
        }

        if (!data) {
            throw new Error("No data received when downloading video file");
        }

        await fs.writeFile(
            localVideoPath,
            Buffer.from(await data.arrayBuffer()),
        );
        console.log(`Video file downloaded to: ${localVideoPath}`);

        // Verify the file exists and has content
        const stats = await fs.stat(localVideoPath);
        if (stats.size === 0) {
            throw new Error("Downloaded video file is empty");
        }

        const durationCommand =
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${localVideoPath}"`;
        const durationOutput = await safeExecPromise(durationCommand);
        const videoDuration = parseFloat(durationOutput.trim());
        console.log(`Video duration: ${videoDuration}`);

        return Promise.all(timestamps.map(async (timestamp) => {
            if (timestamp.is_b_roll) {
                return null; // Skip b-roll segments
            }

            const { start, end } = timestamp;
            const clipDuration = end - start;

            if (clipDuration > videoDuration) {
                console.error(
                    `Clip duration (${clipDuration}s) is longer than video duration (${videoDuration}s)`,
                );
                return null;
            }

            const maxStartTime = videoDuration - clipDuration;
            const randomStartTime = Math.random() * maxStartTime;
            const uniqueId = uuidv4();
            const videoFileClip = path.join(tempDir, `clip_${uniqueId}.mp4`);

            const ffmpegCommand =
                `ffmpeg -ss ${randomStartTime} -i "${localVideoPath}" -t ${clipDuration} -c copy "${videoFileClip}"`;
            await safeExecPromise(ffmpegCommand);

            // Verify the clip file exists and has content
            const clipStats = await fs.stat(videoFileClip);
            if (clipStats.size === 0) {
                throw new Error(
                    `Generated clip file is empty: ${videoFileClip}`,
                );
            }

            const fileBuffer = await fs.readFile(videoFileClip);
            const { error: uploadError } = await supabase.storage
                .from("video-files/kamala-segments")
                .upload(`clip_${uniqueId}.mp4`, fileBuffer, {
                    contentType: "video/mp4",
                });

            if (uploadError) {
                console.error(
                    `Error uploading clip to Supabase: ${uploadError.message}`,
                );
                return null;
            }

            const { data: { publicUrl } } = supabase.storage
                .from("video-files/kamala-segments")
                .getPublicUrl(`clip_${uniqueId}.mp4`);

            return publicUrl || null;
        }));
    } catch (error) {
        console.error("Error in choose_and_upload_face_clips:", error);
        return timestamps.map(() => null);
    }
}

async function stitch_clips(
    clipUrls: string[],
    audioFilePath: string,
): Promise<string> {
    const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "video-stitching-"),
    );
    const outputFile = path.join(tempDir, `output_${uuidv4()}.mp4`);
    const concatFile = path.join(tempDir, "concat.txt");
    let videoFiles: string[] = [];

    try {
        // Download video clips
        const downloadPromises = clipUrls.map(async (url, index) => {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const filePath = path.join(tempDir, `clip_${index}.mp4`);
            await fs.writeFile(filePath, buffer);
            return filePath;
        });
        videoFiles = await Promise.all(downloadPromises);

        // Create concat file
        const concatContent = videoFiles.map((file) => `file '${file}'`).join(
            "\n",
        );
        await fs.writeFile(concatFile, concatContent);

        // Stitch videos and add audio
        const ffmpegCommand =
            `ffmpeg -f concat -safe 0 -i "${concatFile}" -i "${audioFilePath}" -c:v libx264 -c:a aac -map 0:v -map 1:a -shortest -af "aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono" "${outputFile}"`;
        await safeExecPromise(ffmpegCommand);

        // Upload the stitched video to Supabase
        const fileBuffer = await fs.readFile(outputFile);
        const { error } = await supabase.storage
            .from("kamala-segments")
            .upload(`stitched_${uuidv4()}.mp4`, fileBuffer, {
                contentType: "video/mp4",
            });

        if (error) {
            console.error(
                `Error uploading stitched video to Supabase: ${error.message}`,
            );
            throw error;
        }

        // Get the public URL of the uploaded stitched video
        const { data: { publicUrl } } = supabase.storage
            .from("kamala-segments")
            .getPublicUrl(`stitched_${uuidv4()}.mp4`);

        if (!publicUrl) {
            console.error(`Error getting public URL for stitched video`);
            throw new Error("Error getting public URL");
        }

        return publicUrl;
    } catch (error) {
        console.error("Error in stitch_clips:", error);
        throw error;
    }
}
async function crop_audio_to_video(
    audio_url: string,
    duration: number,
): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "audio-cropping-"));
    const outputFile = path.join(tempDir, `cropped_audio_${uuidv4()}.mp3`);

    const ffmpegCommand =
        `ffmpeg -i "${audio_url}" -t ${duration} -c copy "${outputFile}"`;
    await execPromise(ffmpegCommand);

    const fileBuffer = await fs.readFile(outputFile);
    const fileName = `cropped_audio_${uuidv4()}.mp3`;

    const { error } = await supabase.storage
        .from("audio-files")
        .upload(fileName, fileBuffer, { contentType: "audio/mpeg" });

    if (error) {
        console.error(
            `Error uploading cropped audio to Supabase: ${error.message}`,
        );
        throw error;
    }

    const { data } = supabase.storage
        .from("audio-files")
        .getPublicUrl(fileName);

    if (!data || !data.publicUrl) {
        throw new Error("Failed to get public URL for uploaded audio");
    }

    // Clean up temporary files
    await fs.unlink(outputFile);
    await fs.rmdir(tempDir);

    return data.publicUrl;
}
