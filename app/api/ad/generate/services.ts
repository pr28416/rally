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

const execPromise = util.promisify(exec);

type VoterRecord = Database["public"]["Tables"]["voter_records"]["Row"];

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
    // const disclaimerPath = path.join(
    //     process.cwd(),
    //     "public",
    //     "images",
    //     "disclaimer.png",
    // );
    // const intermediateOutputPath = path.join(
    //     tempDir,
    //     `intermediate_output.mp4`,
    // );

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

    // Execute the ffmpeg command for B-roll overlay
    console.log("ffmpegCommand", ffmpegCommand);
    await execPromise(ffmpegCommand);

    // 15. Upload the final video to Supabase
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

    // 16. Get the public URL of the uploaded video
    const { data: { publicUrl } } = supabase.storage
        .from("video-files")
        .getPublicUrl(finalVideoName);

    if (!publicUrl) {
        throw new Error("Failed to get public URL for final video");
    }

    // 17. Clean up temporary files
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.unlink(aiVideoTempPath);

    // 18. Return the public URL of the final video
    return { finalVideoUrl: publicUrl };
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
