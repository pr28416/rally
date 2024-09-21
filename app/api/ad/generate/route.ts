import { generateAd } from "./services";
import { Database } from "@/lib/types/schema";

type VoterRecord = Database["public"]["Tables"]["voter_records"]["Row"];

export async function POST(req: Request) {
    const { voter }: { voter: VoterRecord } = await req.json();
    const ad = await generateAd(voter);
    return Response.json({ ad });
}
