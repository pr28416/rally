import { Database } from "@/lib/types/schema";
import FirecrawlApp, {
    CrawlStatusResponse,
    ErrorResponse,
    ScrapeResponse,
} from "@mendable/firecrawl-js";

const scrapeWebsites = async (urls: string[]) => {
    const firecrawl = new FirecrawlApp({
        apiKey: process.env.FIRECRAWL_API_KEY,
    });

    const crawlResponses: Promise<ScrapeResponse | ErrorResponse>[] = [];

    for (const url of urls) {
        crawlResponses.push(firecrawl.scrapeUrl(url, {
            formats: ["markdown"],
        }));
    }

    const results = await Promise.all(crawlResponses);

    return results;
};

function splitByH1(markdown: string) {
    const sections = markdown.split(/^# (.+)$/gm);
    return sections.filter((section) => section.trim() !== "");
}

type CampaignPolicy = Database["public"]["Tables"]["campaign_policies"]["Row"];

const getCampaignIssues = async (urls: string[]) => {
    const data: (ScrapeResponse | ErrorResponse)[] = await scrapeWebsites(urls);
    const issues: CampaignPolicy[] = [];
    for (const item of data) {
        if (item.error) {
            console.log(item.error);
        } else {
            const response_data = item as ScrapeResponse;
            const sections = splitByH1(response_data.markdown || "");
        }
    }
};

export { scrapeWebsites };
