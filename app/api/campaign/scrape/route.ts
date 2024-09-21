// Route to scrape websites for campaign data

import { getCampaignIssues } from "./services";

export async function POST(req: Request) {
    const { urls }: { urls: string[] } = await req.json();
    // const response = await scrapeWebsites(urls);
    const campaignPolicies = await getCampaignIssues(urls);
    return Response.json({ policies: campaignPolicies });
}
