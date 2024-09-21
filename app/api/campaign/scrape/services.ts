import FirecrawlApp, {
    ErrorResponse,
    ScrapeResponse,
} from "@mendable/firecrawl-js";
import { z } from "zod";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { APIPromise } from "openai/core.mjs";
import { ParsedChatCompletion } from "openai/resources/beta/chat/completions.mjs";

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

const CampaignPolicySchema = z.object({
    campaign_policy: z.string(),
    campaign_subtopic: z.string(),
    campaign_topic: z.string(),
});

const ListCampaignPolicySchema = z.object({
    policies: z.array(CampaignPolicySchema),
});

const getCampaignIssues = async (urls: string[]) => {
    const data: (ScrapeResponse | ErrorResponse)[] = await scrapeWebsites(urls);
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const responses: APIPromise<
        ParsedChatCompletion<z.infer<typeof ListCampaignPolicySchema>>
    >[] = [];
    const policies: z.infer<typeof CampaignPolicySchema>[] = [];
    for (const item of data) {
        if (item.error) {
            console.log(item.error);
        } else {
            const response_data = item as ScrapeResponse;
            const sections = splitByH1(response_data.markdown || "");
            for (const section of sections) {
                responses.push(openai.beta.chat.completions.parse(
                    {
                        model: "gpt-4o-mini",
                        messages: [
                            {
                                role: "system",
                                content:
                                    "Given a description about a political candidate and their campaign, extract a list of the campaign's key policy positions.",
                            },
                            {
                                role: "user",
                                content: section,
                            },
                        ],
                        response_format: zodResponseFormat(
                            ListCampaignPolicySchema,
                            "List of Campaign Policies",
                        ),
                    },
                ));
            }
            console.log(responses.length, "responses to parse");
            const parsed = await Promise.all(responses);
            console.log(parsed.length, "parsed");
            for (const policyList of parsed) {
                if (policyList.choices[0].message.parsed) {
                    policies.push(
                        ...(policyList.choices[0].message.parsed as z.infer<
                            typeof ListCampaignPolicySchema
                        >).policies,
                    );
                }
            }
        }
    }
    return policies;
};

export { getCampaignIssues, scrapeWebsites };
