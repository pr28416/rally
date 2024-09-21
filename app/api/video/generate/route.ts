export async function POST(req: Request) {
  try {
    const { audioUrl, videoUrl, webhookUrl } = await req.json();

    // Validate input
    if (!audioUrl || !videoUrl || !webhookUrl) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.synclabs.so/lipsync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SYNC_LABS_API_KEY}`,
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        video_url: videoUrl,
        webhook_url: webhookUrl,
        synergize: true, // Set to false for faster processing if needed
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(JSON.stringify(errorData), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in lipsync generation:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
