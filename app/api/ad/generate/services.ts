import { Database } from "@/lib/types/schema";
import { generateScript } from "../../script/generate/services";

type VoterRecord = Database["public"]["Tables"]["voter_records"]["Row"];

export async function generateAd(voter: VoterRecord) {
    const script_segments = (await generateScript(voter)).segments;
}
