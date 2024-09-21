import { Database } from "@/lib/types/schema";
import { generateScript } from "./services";

type VoterRecord = Database["public"]["Tables"]["voter_records"]["Row"];

export async function POST(req: Request) {
  const { voterRecord }: { voterRecord: VoterRecord } = await req.json();
  const script = await generateScript(voterRecord);
  return Response.json({ script });
}
