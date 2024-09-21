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

const execPromise = util.promisify(exec);

type VoterRecord = Database["public"]["Tables"]["voter_records"]["Row"];
type AdjustedTimestamp = {
    start: number;
    end: number;
    is_b_roll: boolean;
    b_roll_link: string | null;
};

// Main function to generate an ad for a given voter
export async function generateAd(voter: VoterRecord) {
    // Generate script segments based on voter information
    const script_segments = await getScriptSegments(voter);
    // Combine all script segments into a full transcript
    const full_transcript = getFullTranscript(script_segments);

    // Concurrently generate audio and B-roll options
    const [audio_response, b_roll_response] = await Promise.all([
        generateAudio(full_transcript),
        generateBRollOptions(script_segments),
    ]);

    // Convert and save the generated audio to a temporary file
    const { wavFile } = await convertAndSaveTempAudio(audio_response.audio);

    // Construct timestamps for each segment of the script
    const segmentTimestamps = constructSegmentTimestamps(
        script_segments,
        audio_response.wordTimings,
    );
    // Filter B-roll segments based on the script segments
    const filteredBRollSegments = filterBRollSegments(
        b_roll_response,
        segmentTimestamps,
    );
    // Adjust timestamps to accommodate B-roll segments
    const adjustedTimestamps = adjustTimestamps(
        segmentTimestamps,
        filteredBRollSegments,
    );
    // Combine adjusted timestamps with B-roll segments for final timeline
    const finalTimestamps = combineFinalTimestamps(
        adjustedTimestamps,
        filteredBRollSegments,
    );

    // Trim audio to segments, upload, and get public URLs for each clip
    const audioClipPublicUrls =
        await trim_audio_to_segments_upload_and_choose_clip(
            wavFile,
            finalTimestamps,
        );

    // console.log(
    //     "audioClipPublicUrls",
    //     audioClipPublicUrls,
    //     "\nfinalTimestamps",
    //     finalTimestamps,
    //     "\nadjustedTimestamps",
    //     adjustedTimestamps,
    //     "\nsegmentTimestamps",
    //     segmentTimestamps,
    //     "\nfilteredBRollSegments",
    //     filteredBRollSegments,
    //     "\nscript_segments",
    //     script_segments,
    // );

    // TODO: Change this. Right now it's just for testing
    // Return an object with all generated data for further processing or testing
    return {
        audioClipPublicUrls: audioClipPublicUrls,
        originalTimestamps: segmentTimestamps,
        adjustedTimestamps: adjustedTimestamps,
        finalTimestamps: finalTimestamps,
        script_segments: script_segments,
        bRollSegments: filteredBRollSegments,
    };
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
): Promise<(Video[] | null)[]> {
    // TODO: Implement b-roll option generation
    // Will return a list of b-roll options if slot is b-roll, otherwise empty item
    const getBRollOptions = async (
        query: string,
    ): Promise<Video[] | null> => {
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

    return Promise.all(script_segments.map(async (segment) => {
        if (segment.is_b_roll && segment.b_roll_search_query) {
            return getBRollOptions(segment.b_roll_search_query);
        } else {
            return Promise.resolve(null);
        }
    }));
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
    await execPromise(ffmpegCommand);

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
            throw new Error("Generated audio is longer than the script");
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

function adjustTimestamps(
    segmentTimestamps: [number, number][],
    filteredBRollSegments: (Video | null)[],
): AdjustedTimestamp[] {
    const adjustedTimestamps: AdjustedTimestamp[] = [];
    for (let i = 0; i < segmentTimestamps.length; i++) {
        const [start, end] = segmentTimestamps[i];
        const bRoll = filteredBRollSegments[i];
        if (bRoll) {
            if (end - start > bRoll.duration) {
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
                adjustedTimestamps.push({
                    start,
                    end,
                    is_b_roll: true,
                    b_roll_link: bRoll.video_files[0].link,
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
    return adjustedTimestamps;
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
        await execPromise(ffmpegCommand);

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

        await fs.unlink(fileName);
        console.log("Cleaned up local trimmed file");
        return publicUrl;
    };

    return Promise.all(timestamps.map(processTimestamp));
}

async function choose_and_upload_face_clips(
    timestamps: AdjustedTimestamp[],
    videoFile: string,
): Promise<string[]> {
    // Download video file to local tmp directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-processing-'));
    const localVideoPath = path.join(tempDir, 'input_video.mp4');
    
    try {
        const { data, error } = await supabase.storage
            .from('kamala-clips')
            .download(videoFile);

        if (error) {
            throw new Error(`Error downloading video file: ${error.message}`);
        }

        const arrayBuffer = await data.arrayBuffer();
        await fs.writeFile(localVideoPath, Buffer.from(arrayBuffer));
        console.log(`Video file downloaded to: ${localVideoPath}`);

        // Update videoFile variable to use the local path
        videoFile = localVideoPath;
    } catch (error) {
        console.error('Error in downloading video file:', error);
        throw error;
    }
    
    return Promise.all(timestamps.map(async (timestamp) => {
        const { start, end } = timestamp;
        const videoFileClip = `${videoFile}_clip_${start}_${end}.mp4`;
        // Get video duration
        const durationCommand =
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoFile}"`;
        const durationOutput = await execPromise(durationCommand);
        const videoDuration = parseFloat(durationOutput.stdout.trim());

        const clipDuration = end - start;

        if (clipDuration > videoDuration) {
            throw new Error(
                `Clip duration (${clipDuration}s) is longer than video duration (${videoDuration}s)`,
            );
        }

        // Choose a random start time for the clip
        const maxStartTime = videoDuration - clipDuration;
        const randomStartTime = Math.random() * maxStartTime;

        // Extract the clip
        const ffmpegCommand =
            `ffmpeg -ss ${randomStartTime} -i "${videoFile}" -t ${clipDuration} -c copy "${videoFileClip}"`;
        await execPromise(ffmpegCommand);

        // Upload the clip to Supabase
        const fileBuffer = await fs.readFile(videoFileClip);
        const { error } = await supabase.storage
            .from("kamala-clips/kamala-segments")
            .upload(videoFileClip, fileBuffer, {
                contentType: "video/mp4",
            });

        if (error) {
            console.error(`Error uploading clip to Supabase: ${error.message}`);
            throw error;
        }

        // Get the public URL of the uploaded clip
        const { data: { publicUrl } } = supabase.storage
            .from("kamala-clips/kamala-segments")
            .getPublicUrl(videoFileClip);

        if (!publicUrl) {
            console.error(`Error getting public URL for clip`);
            throw new Error("Error getting public URL");
        }

        // Clean up the local clip file
        await fs.unlink(videoFileClip);

        return publicUrl;
    }));
}

async function stitch_clips(
    clipUrls: string[],
    audioFile: string,
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
            `ffmpeg -f concat -safe 0 -i "${concatFile}" -i "${audioFile}" -c:v libx264 -c:a aac -map 0:v -map 1:a -shortest -af "aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono" "${outputFile}"`;
        await execPromise(ffmpegCommand);

        // Return the path to the output file
        return outputFile;
    } catch (error) {
        console.error("Error in stitch_clips:", error);
        throw error;
    } finally {
        // Clean up temporary files (except the output file)
        const filesToDelete = [audioFile, concatFile, ...videoFiles];
        await Promise.all(
            filesToDelete.map((file) => fs.unlink(file).catch(() => {})),
        );
    }
}
