import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdSegmentSchema } from '../script/generate/services';
import { supabase } from '@/lib/supabase/client';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST(request: Request) {
  try {
    const { voterRecord } = await request.json();

    const scriptResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/script/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ voterRecord }),
    });

    if (!scriptResponse.ok) {
      throw new Error('Failed to generate script');
    }

    const { script } = await scriptResponse.json();

    const bRollSegments = script.segments.filter((segment: z.infer<typeof AdSegmentSchema>) => segment.is_b_roll && segment.b_roll_search_query);

    console.log(bRollSegments.map((segment: z.infer<typeof AdSegmentSchema>) => segment.b_roll_search_query));

    const fetchBRollVideo = async (segment: z.infer<typeof AdSegmentSchema>, retryCount = 0): Promise<string | null> => {
      if (retryCount >= 3) return null; // Limit retries to prevent infinite loops

      try {
        const videoResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/broll`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            query: segment.b_roll_search_query, 
            duration: 10 //todo: replace with actual duration, this is a dummy value for now 
          }),
        });

        if (!videoResponse.ok) {
          throw new Error('Failed to fetch video URL');
        }

        const { videoUrl } = await videoResponse.json();
        return videoUrl;
      } catch (error) {
        console.error(`Error fetching video for query "${segment.b_roll_search_query}": ${error}. Retrying...`);
        return fetchBRollVideo(segment, retryCount + 1);
      }
    };

    const videoUrls = await Promise.all(
      bRollSegments.map(async (segment: z.infer<typeof AdSegmentSchema>) => {
        const videoUrl = await fetchBRollVideo(segment);
        if (!videoUrl) {
          console.error(`Failed to fetch video for query "${segment.b_roll_search_query}" after multiple attempts.`);
        }
        return videoUrl;
      })
    );

    const validVideoUrls = videoUrls.filter(Boolean) as string[];

    console.log(validVideoUrls);

    // Create a temporary directory to store video files
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-processing-'));

    // Download and save video files
    const videoFiles = await Promise.all(validVideoUrls.map(async (url, index) => {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const filePath = path.join(tempDir, `input${index}.mp4`);
      await fs.writeFile(filePath, Buffer.from(buffer));
      return filePath;
    }));

    console.log(videoFiles);

    console.log('Video files to combine:', videoFiles);

    const fileListPath = path.join(tempDir, 'file_list.txt');
    const fileListContent = videoFiles.map(file => `file '${file}'`).join('\n');
    await fs.writeFile(fileListPath, fileListContent);

    console.log('File list content:', fileListContent);

    const outputFileName = path.join(tempDir, 'output.mp4');
    // const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${fileListPath}" -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k "${outputFileName}"`;
    const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${fileListPath}" -c:v libx264 -crf 23 -preset medium -an "${outputFileName}"`;    console.log('FFmpeg command:', ffmpegCommand);

    await execPromise(ffmpegCommand);

    const outputFileStats = await fs.stat(outputFileName);
    console.log('Output file size:', outputFileStats.size);

    const compressedVideoData = await fs.readFile(outputFileName);

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from('candidatevideos')
      .upload(`videos/combined_broll_videos_${Date.now()}.mp4`, compressedVideoData, {
        contentType: 'video/mp4',
      });

    if (error) {
      throw new Error(`Failed to upload video: ${error.message}`);
    }

    // Clean up temporary files
    await Promise.all(videoFiles.map(file => fs.unlink(file)));
    await fs.unlink(outputFileName);
    await fs.unlink(fileListPath);
    await fs.rmdir(tempDir);

    console.log('Video processing completed successfully');

    return NextResponse.json({ message: 'Video uploaded successfully', data });
  } catch (error) {
    console.error('Error assembling videos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}