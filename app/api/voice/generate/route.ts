import { Cartesia, WordTimestamps } from "@cartesia/cartesia-js";

export async function POST(req: Request) {
  const { transcript } = await req.json();

  const cartesia = new Cartesia({
    apiKey: process.env.CARTESIA_API_KEY,
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
      id: "41534e16-2966-4c6b-9670-111411def906",
    },
    transcript: transcript,
    add_timestamps: true,
  });

  let base64Audio = "";
  const wordTimings: [string, number, number][] = [];

  console.log("Response received from Cartesia");

  try {
    console.log("hello there");
    for await (const message of response.events(["message", "timestamps"])) {
      console.log("Received message:", message); // Log the raw message for debugging
      if (typeof message === "string") {
        try {
          const messageObj = JSON.parse(message);
          if (messageObj.error) {
            throw new Error(messageObj.error);
          }

          if (messageObj.done === true) {
            break;
          }

          if (messageObj.type === "chunk") {
            base64Audio += messageObj.data;
          }
        } catch (parseError) {
          console.warn(
            `Failed to parse message as JSON: ${parseError}. Message: ${message}`,
          );
          // Skip this message and continue with the next one
          continue;
        }
      } else if (typeof message === "object") {
        const messageObj = message as WordTimestamps;
        for (let i = 0; i < messageObj.words.length; i++) {
          wordTimings.push([
            messageObj.words[i],
            messageObj.start[i],
            messageObj.end[i],
          ]);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing Cartesia response: ${error}`);
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
