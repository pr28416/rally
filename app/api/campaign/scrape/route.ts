// Route to scrape websites for campaign data

import { supabase } from "@/lib/supabase/client";
import { getCampaignIssues } from "./services";

export async function POST(req: Request) {
    const { urls }: { urls: string[] } = await req.json();
    const campaignPolicies = await getCampaignIssues(urls);
    const batchSize = 1000;
    for (let i = 0; i < campaignPolicies.length; i += batchSize) {
        const batch = campaignPolicies.slice(i, i + batchSize);
        const { error } = await supabase.from("campaign_policies").insert(
            batch,
        );
        if (error) {
            console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        }
    }
    return Response.json({ success: true, issues: campaignPolicies });
}
