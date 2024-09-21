// app/api/search-videos/route.ts

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
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }

    const url = new URL(PEXELS_API_URL);
    url.searchParams.append('query', query);
    url.searchParams.append('per_page', '5');

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

    const videoUrls = data.videos.map((video: Video) => {
      const hdFile = video.video_files.find((file: VideoFile) => file.quality === 'hd');
      return hdFile ? hdFile.link : null;
    }).filter(Boolean);

    return NextResponse.json({ videoUrls });
  } catch (error) {
    console.error('Error searching videos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}