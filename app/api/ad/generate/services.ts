import { Database } from "@/lib/types/schema";
import { generateScript } from "../../script/generate/services";
import { Video } from "../../broll/route";
import { supabase } from "@/lib/supabase/client";
import { exec } from "child_process";
import util from "util";
import path from "path";
import os from "os";
import { promises as fs } from "fs";
import { v4 as uuidv4 } from "uuid";

const execPromise = util.promisify(exec);

type VoterRecord = Database["public"]["Tables"]["voter_records"]["Row"];
type AdjustedTimestamp = {
    start: number;
    end: number;
    is_b_roll: boolean;
    b_roll_link: string | null;
};

async function stitch_clips(
    clipUrls: string[],
    audioBase64: string,
): Promise<string> {
    const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "video-stitching-"),
    );
    const outputFile = path.join(tempDir, `output_${uuidv4()}.mp4`);
    const audioFile = path.join(tempDir, "audio.wav");
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

        // Save audio file
        const audioBuffer = Buffer.from(audioBase64, "base64");
        await fs.writeFile(audioFile, audioBuffer);

        // Stitch videos and add audio
        const ffmpegCommand =
            `ffmpeg -f concat -safe 0 -i "${concatFile}" -i "${audioFile}" -c:v libx264 -c:a aac -map 0:v -map 1:a -shortest "${outputFile}"`;
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

export async function generateAd(voter: VoterRecord) {
    // Get script segments
    const script_segments = (await generateScript(voter)).segments;

    // Audio generation & B-roll option generation
    const full_transcript = script_segments.map((segment) =>
        segment.spoken_transcript
    ).join(" ");
    const audio_promise = async () => {
        console.log("Generating audio");
        const audio_response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/voice/generate`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ transcript: full_transcript }),
            },
        );

        if (!audio_response.ok) {
            throw new Error("Failed to generate audio");
        }

        const { audio, wordTimings } = await audio_response.json();
        console.log("Audio generated");
        return { audio, wordTimings };
    };

    const b_roll_promise = async (): Promise<(Video[] | null)[]> => {
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
    };

    const [audio_response, b_roll_response] = await Promise.all([
        audio_promise(),
        b_roll_promise(),
    ]);

    const convert_save_temp_audio_promise = async (): Promise<
        { wavFile: string }
    > => {
        // Decode base64 audio string
        const audioBuffer = Buffer.from(audio_response.audio, "base64");

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
    };

    // Construct timestamp'd script_segments
    const segmentTimestamps: [number, number][] = [];
    let segmentIndex = 0;
    let wordIndex = 0;
    let currentSegmentWords: string[] = [];

    console.log(
        "Script segments:",
        script_segments.map((segment) => segment.spoken_transcript),
    );
    console.log("Word timings:", audio_response.wordTimings);
    let segmentStartTime = 0;
    let segmentEndTime = 0;

    for (const [word, start, end] of audio_response.wordTimings) {
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

    // For each B-roll option, find the B-roll video that fits in the timestamp
    const filteredBRollSegments: (Video | null)[] = b_roll_response.map(
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

    // Adjust the timestamps now that some B-roll options are shorter than expected. If the B-roll is shorter than expected, decrease the end time of the B-roll segment and create a new segment from the end of the B-roll to the end of the original segment that is not B-roll.
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

    // Combine consecutive non-B-roll segments and adjust B-roll boundaries
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

    // Start the audio conversion process
    console.log("Starting audio conversion process");
    const { wavFile } = await convert_save_temp_audio_promise();
    console.log("Audio conversion process completed");

    // Trim audio to segments and upload to Supabase. Each element will be a public URL to the audio clip if the clip is not a B-roll, otherwise it's null. Thus, this will be an array of length finalTimestamps.length.
    const audioClipPublicUrls: (string | null)[] =
        await trim_audio_to_segments_upload_and_choose_clip(
            wavFile,
            finalTimestamps,
        );

    // TODO: Change this. Right now it's just for testing
    return {
        audioClipPublicUrls: audioClipPublicUrls,
        originalTimestamps: segmentTimestamps,
        adjustedTimestamps: adjustedTimestamps,
        finalTimestamps: finalTimestamps,
        script_segments: script_segments,
        bRollSegments: filteredBRollSegments,
    };
}

function calculateLipsyncIntervals(
    duration: number,
    brollIntervals: Float32Array[],
): Float32Array[] {
    // Initialize an array to store the lipsync intervals
    const lipsyncIntervals: Float32Array[] = [];

    // Start with 0 as the initial timestamp
    let previousEnd = 0;

    // Iterate through the broll intervals
    for (let i = 0; i < brollIntervals.length; i++) {
        const brollStart = brollIntervals[i][0];
        const brollEnd = brollIntervals[i][1];

        // If there's a gap between previous end and current broll start, add it as a lipsync interval
        if (brollStart > previousEnd) {
            lipsyncIntervals.push(new Float32Array([previousEnd, brollStart]));
        }

        // Update the previous end to the end of this broll interval
        previousEnd = brollEnd;
    }

    // If there's remaining time after the last broll interval, add it as a final lipsync interval
    if (previousEnd < duration) {
        lipsyncIntervals.push(new Float32Array([previousEnd, duration]));
    }

    return lipsyncIntervals;
}

async function trim_audio_to_segments_upload_and_choose_clip(
    wavFile: string,
    timestamps: AdjustedTimestamp[],
): Promise<(string | null)[]> {
    return Promise.all(
        timestamps.map(
            async (timestamp) => {
                console.log("Trimming audio to segment", timestamp);
                // If B-roll, we're not running SyncLab on it, so we don't need an audio clip url.
                if (timestamp.is_b_roll) {
                    return null;
                }
                const { start, end } = timestamp;
                const fileName = `${wavFile}_trimmed_${start}_${end}.wav`;
                const ffmpegCommand =
                    `ffmpeg -i "${wavFile}" -ss ${start} -to ${end} -c copy "${fileName}"`;
                console.log("ffmpegCommand", ffmpegCommand);
                await execPromise(ffmpegCommand);
                // Upload the trimmed audio file to Supabase
                const fileBuffer = await fs.readFile(fileName);
                const { error } = await supabase.storage
                    .from("audio-files")
                    .upload(fileName, fileBuffer, {
                        contentType: "audio/wav",
                    });
                console.log("Uploaded audio to Supabase");
                if (error) {
                    console.error(
                        `Error uploading file to Supabase: ${error.message}`,
                    );
                    throw error;
                }

                // Get the public URL of the uploaded file
                const { data: { publicUrl } } = supabase
                    .storage
                    .from("audio-files")
                    .getPublicUrl(fileName);
                console.log("Got public URL", publicUrl);
                if (!publicUrl) {
                    console.error(
                        `Error getting public URL`,
                    );
                    throw new Error("Error getting public URL");
                }

                // Clean up the local trimmed file
                await fs.unlink(fileName);
                console.log("Cleaned up local trimmed file");
                return publicUrl;
            },
        ),
    );
}

async function choose_and_upload_face_clips(
    timestamps: AdjustedTimestamp[],
    videoFile: string,
): Promise<string[]> {
    return Promise.all(timestamps.map(async (timestamp) => {
        const { start, end } = timestamp;
        const videoFileClip = `${videoFile}_clip_${start}_${end}.mp4`;
        // Get video duration
        const durationCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoFile}"`;
        const durationOutput = await execPromise(durationCommand);
        const videoDuration = parseFloat(durationOutput.stdout.trim());

        const clipDuration = end - start;

        if (clipDuration > videoDuration) {
            throw new Error(`Clip duration (${clipDuration}s) is longer than video duration (${videoDuration}s)`);
        }

        // Choose a random start time for the clip
        const maxStartTime = videoDuration - clipDuration;
        const randomStartTime = Math.random() * maxStartTime;

        // Extract the clip
        const ffmpegCommand = `ffmpeg -ss ${randomStartTime} -i "${videoFile}" -t ${clipDuration} -c copy "${videoFileClip}"`;
        await execPromise(ffmpegCommand);

        // Upload the clip to Supabase
        const fileBuffer = await fs.readFile(videoFileClip);
        const { data, error } = await supabase.storage
            .from('kamala-clips/kamala-segments')
            .upload(videoFileClip, fileBuffer, {
                contentType: 'video/mp4',
            });

        if (error) {
            console.error(`Error uploading clip to Supabase: ${error.message}`);
            throw error;
        }

        // Get the public URL of the uploaded clip
        const { data: { publicUrl }, error: urlError } = supabase.storage
            .from('kamala-clips/kamala-segments')
            .getPublicUrl(videoFileClip);

        if (urlError) {
            console.error(`Error getting public URL for clip: ${urlError.message}`);
            throw urlError;
        }

        // Clean up the local clip file
        await fs.unlink(videoFileClip);

        return publicUrl;
    }));
}
