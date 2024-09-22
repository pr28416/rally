import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

// request body example: 
// {
//   "baseVideoTimestamp": 0,
//   "brollTimestamps": [
//     { "start": 5, "end": 10, "duration": 5 },
//     { "start": 15, "end": 20, "duration": 5 }
//   ]
// }

export async function POST(request: Request) {
  try {
    // Get request body
    const { baseVideoTimestamp, brollTimestamps } = await request.json();

    // Download base video
    const baseVideoName = "kamala_clip_1.mp4"; 
    const { data: baseVideoData, error: baseVideoError } = await supabase.storage
      .from("video-files")
      .download("kamala_clip_1.mp4");

    if (baseVideoError) {
      throw new Error(`Error downloading base video: ${baseVideoError.message}`);
    }

    // Create temporary directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "video-processing-"));
    const baseVideoPath = path.join(tempDir, baseVideoName);
    await fs.writeFile(baseVideoPath, Buffer.from(await baseVideoData.arrayBuffer()));

    // Download two random B-roll clips
    const { data: brollList, error: brollListError } = await supabase.storage
      .from("broll")
      .list();

    if (brollListError) {
      throw new Error(`Error listing B-roll clips: ${brollListError.message}`);
    }

    const randomBrollClips = brollList
      .sort(() => 0.5 - Math.random())
      .slice(0, 2);

    const brollPaths = await Promise.all(randomBrollClips.map(async (clip, index) => {
      const { data: brollData, error: brollError } = await supabase.storage
        .from("broll")
        .download(clip.name);

      if (brollError) {
        throw new Error(`Error downloading B-roll clip: ${brollError.message}`);
      }

      const brollPath = path.join(tempDir, `broll_${index}.mp4`);
      await fs.writeFile(brollPath, Buffer.from(await brollData.arrayBuffer()));
      return brollPath;
    }));

    // Construct FFmpeg command
    const outputPath = path.join(tempDir, "output.mp4");

const ffmpegCommand = `ffmpeg -i "${baseVideoPath}" \
-i "${brollPaths[0]}" -i "${brollPaths[1]}" \
-filter_complex "
[1:v]trim=start=0:duration=${brollTimestamps[0].duration},setpts=PTS-STARTPTS+${brollTimestamps[0].start}/TB,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v1];
[2:v]trim=start=0:duration=${brollTimestamps[1].duration},setpts=PTS-STARTPTS+${brollTimestamps[1].start}/TB,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v2];
[0:v][v1]overlay=x=(W-w)/2:y=(H-h)/2:eof_action=pass[tmp1];
[tmp1][v2]overlay=x=(W-w)/2:y=(H-h)/2:eof_action=pass[outv]
" -map "[outv]" -map 0:a -c:v libx264 -c:a aac "${outputPath}"`;

    // Execute FFmpeg command
    await execPromise(ffmpegCommand);

    // Read the output file
    const outputBuffer = await fs.readFile(outputPath);

    // Upload the result to Supabase
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("video-files")
      .upload(`spliced_${Date.now()}.mp4`, outputBuffer, {
        contentType: "video/mp4",
      });

    if (uploadError) {
      throw new Error(`Error uploading processed video: ${uploadError.message}`);
    }

    // Clean up temporary files
    await fs.rm(tempDir, { recursive: true, force: true });

    // Return the URL of the processed video
    const { data: { publicUrl } } = supabase.storage
      .from("video-files")
      .getPublicUrl(uploadData.path);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Error processing video:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}