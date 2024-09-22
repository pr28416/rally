import { generateAd, adEventEmitter } from "./services";
import { Database } from "@/lib/types/schema";

type VoterRecord = Database["public"]["Tables"]["voter_records"]["Row"];

export async function POST(req: Request) {
    const { voterRecord }: { voterRecord: VoterRecord } = await req.json();

    const eventStream = new ReadableStream({
        start(controller) {
            const sendEvent = (message: string) => {
                controller.enqueue(`data: ${message}\n\n`);
            };

            adEventEmitter.on('status', sendEvent);

            generateAd(voterRecord).then((ad) => {
                sendEvent('Ad generation completed');
                controller.close();
            }).catch((error) => {
                sendEvent(`Error: ${error.message}`);
                controller.close();
            });
        },
        cancel() {
            adEventEmitter.removeAllListeners('status');
        }
    });

    return new Response(eventStream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    });
}
