import { Cartesia } from "@cartesia/cartesia-js";

export async function POST(req: Request) {
  const { transcript } = await req.json();

  const cartesia = new Cartesia({
    apiKey: process.env.CARTEISIA_API_KEY,
  });

  const websocket = await cartesia.tts.websocket({
    container: "raw",
    encoding: "pcm_f32le",
    sampleRate: 44100,
  });

  try {
    await websocket.connect();
  } catch (error) {
    console.error(`Failed to connect to Cartesia: ${error}`);
  }

  console.log("Connected to Cartesia");

  const response = await websocket.send({
    model_id: "sonic-english",
    voice: {
      mode: "id",
      id: "40104aff-a015-4da1-9912-af950fbec99e",
    },
    transcript: transcript,
    add_timestamps: true,
  });

  let base64Audio = "";
  const wordTimings: [string, number, number][] = [];

  console.log("Response received from Cartesia");

  for await (const message of response.events(["message", "timestamps"])) {
    if (typeof message === "string") {
      // console.log("Processing message:", message.slice(0, 300), typeof message);
      // if (message.includes("error")) {
      //   throw new Error("Error generating audio: " + message);
      // } else {
      //   base64Audio += message;
      // }
      const obj = JSON.parse(message);
      console.log(Object.keys(obj));
    } else if (typeof message === "object") {
      console.log(message);
      if ("error" in message) {
        throw new Error("Error generating audio: " + message.error);
      } else if ("words" in message && "start" in message && "end" in message) {
        const { words, start, end } = message;
        for (let i = 0; i < words.length; i++) {
          console.log("Word:", words[i], "Start:", start[i], "End:", end[i]);
          wordTimings.push([words[i], start[i], end[i]]);
        }
      }
    }
  }

  console.log("Disconnecting from Cartesia");

  // Disconnect the WebSocket after processing
  websocket.disconnect();

  // Return the base64 audio string and word timings
  return new Response(
    JSON.stringify({
      audio: base64Audio,
      wordTimings: wordTimings,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
