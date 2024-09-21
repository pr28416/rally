// Route to scrape websites for campaign data

import { scrapeWebsites } from "./services";

export async function POST(req: Request) {
    const { urls }: { urls: string[] } = await req.json();
    const response = await scrapeWebsites(urls);
    return Response.json({ response });
}
