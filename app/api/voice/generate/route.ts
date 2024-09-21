import { Cartesia } from '@cartesia/cartesia-js';

export async function POST(req: Request) {
  const { transcript } = await req.json();
  
  const cartesia = new Cartesia({
    apiKey: process.env.CARTEISIA_API_KEY,
  });

  const websocket = await cartesia.tts.websocket({
    container: "raw",
    encoding: "pcm_f32le",
    sampleRate: 44100
  });

  try {
    await websocket.connect();
  } catch (error) {
    console.error(`Failed to connect to Cartesia: ${error}`);
  }

  const response = await websocket.send({
    model_id: "sonic-english",
    voice: {
      mode: "id",
      id: "PUT ID HERE",
    },
    transcript: transcript,
    add_timestamps: true
  });

  let base64Audio = '';
  const wordTimings: [string, number, number][] = [];

  for await (const message of response.events(["message", "timestamps"])) {
    if (typeof message === 'string') {
      base64Audio += message;
    } else if ('words' in message && 'start' in message && 'end' in message) {
      const { words, start, end } = message;
      for (let i = 0; i < words.length; i++) {
        wordTimings.push([words[i], start[i], end[i]]);
      }
    }
  }

  // Disconnect the WebSocket after processing
  websocket.disconnect();

  // Return the base64 audio string and word timings
  return new Response(JSON.stringify({
    audio: base64Audio,
    wordTimings: wordTimings
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });

}
