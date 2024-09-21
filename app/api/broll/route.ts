import { NextResponse } from 'next/server';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_API_URL = 'https://api.pexels.com/videos/search';

interface VideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  fps: number;
  link: string;
}

interface Video {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  full_res: string | null;
  tags: string[];
  duration: number;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: VideoFile[];
  video_pictures: {
    id: number;
    picture: string;
    nr: number;
  }[];
}

export async function POST(request: Request) {
  try {
    const { query, duration } = await request.json();

    if (!query || typeof query !== 'string' || !duration || typeof duration !== 'number') {
      return NextResponse.json({ error: 'Invalid query or duration' }, { status: 400 });
    }

    const url = new URL(PEXELS_API_URL);
    url.searchParams.append('query', query);
    url.searchParams.append('per_page', '10');
    url.searchParams.append('orientation', 'landscape');
    url.searchParams.append('size', 'medium');
    url.searchParams.append('locale', 'en-US');

    const headers: HeadersInit = {};
    if (PEXELS_API_KEY) {
        headers.Authorization = PEXELS_API_KEY;
    }

    const response = await fetch(url, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Pexels API responded with status: ${response.status}`);
    }

    const data = await response.json();

    const selectedVideo = data.videos.reverse().find((video: Video) => {
      const videoDuration = video.duration;
      return Math.abs(videoDuration - duration) <= 3;
    });

    if (!selectedVideo) {
      return NextResponse.json({ error: 'No suitable video found' }, { status: 404 });
    }

    const hdFile = selectedVideo.video_files.find((file: VideoFile) => file.quality === 'hd');
    const videoUrl = hdFile ? hdFile.link : null;

    if (!videoUrl) {
      return NextResponse.json({ error: 'No HD video file found' }, { status: 404 });
    }

    return NextResponse.json({ videoUrl });
  } catch (error) {
    console.error('Error searching videos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}