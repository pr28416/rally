import FirecrawlApp, {
    ErrorResponse,
    ScrapeResponse,
} from "@mendable/firecrawl-js";
import { z } from "zod";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { APIPromise } from "openai/core.mjs";
import { ParsedChatCompletion } from "openai/resources/beta/chat/completions.mjs";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/lib/types/schema";
import { PostgrestError } from "@supabase/supabase-js";

type CampaignFirecrawlDescription =
    Database["public"]["Tables"]["campaign_firecrawl_descriptions"]["Row"];

const scrapeWebsites = async (urls: string[]) => {
    const firecrawl = new FirecrawlApp({
        apiKey: process.env.FIRECRAWL_API_KEY,
    });

    const crawlResponses: Promise<
        ScrapeResponse | ErrorResponse | {
            success: true;
            markdown: string;
            url: string;
            error?: ErrorResponse;
        }
    >[] = [];
    for (const url of urls) {
        const { data, error }: {
            data: CampaignFirecrawlDescription | null;
            error: PostgrestError | null;
        } = await supabase
            .from("campaign_firecrawl_descriptions")
            .select("*")
            .eq("url", url)
            .returns<CampaignFirecrawlDescription>()
            .maybeSingle();

        if (error) {
            console.log("Error getting firecrawl description for", url, error);
            crawlResponses.push(
                firecrawl.scrapeUrl(url, { formats: ["markdown"] })
                    .then(async (response) => {
                        if (response.success && response.markdown) {
                            const { error } = await supabase
                                .from("campaign_firecrawl_descriptions")
                                .insert({
                                    url: url,
                                    markdown: response.markdown,
                                });

                            if (error) {
                                console.error(
                                    "Error inserting into Supabase:",
                                    error,
                                );
                            }
                        }
                        return response;
                    }),
            );
        } else if (!data) {
            crawlResponses.push(
                firecrawl.scrapeUrl(url, { formats: ["markdown"] })
                    .then(async (response) => {
                        if (response.success && response.markdown) {
                            const { error } = await supabase
                                .from("campaign_firecrawl_descriptions")
                                .insert({
                                    url: url,
                                    markdown: response.markdown,
                                });

                            if (error) {
                                console.error(
                                    "Error inserting into Supabase:",
                                    error,
                                );
                            }
                        }
                        return response;
                    }),
            );
        } else {
            // If data exists, we don't need to scrape
            crawlResponses.push(Promise.resolve({
                success: true,
                markdown: data.markdown,
                url: data.url,
            }));
        }
    }

    const results = await Promise.all(crawlResponses);

    return results;
};

function splitByH1(markdown: string): string[] {
    const sections = markdown.split(/^#{1,2} (.+)$/gm);
    return sections.filter((section) => section.trim() !== "");
}

const CampaignPolicySchema = z.object({
    detailed_campaign_policy: z.string(),
    campaign_subtopic: z.string(),
    campaign_topic: z.enum([
        "Immigration",
        "Gun Rights",
        "Healthcare",
        "Climate Change",
        "Economy",
        "Education",
        "National Security",
        "Tax Policy",
        "Social Security",
        "Abortion",
        "Civil Rights",
        "Criminal Justice Reform",
        "Foreign Policy",
        "Voting Rights",
        "Labor Rights",
        "LGBTQ+ Rights",
        "Drug Policy",
        "Infrastructure",
        "Trade Policy",
        "Government Spending",
        "Other",
    ]),
});

const ListCampaignPolicySchema = z.object({
    policies: z.array(CampaignPolicySchema),
});

const getCampaignIssues = async (urls: string[]) => {
    const data: (ScrapeResponse | ErrorResponse | {
        success: true;
        markdown: string;
        url: string;
        error?: ErrorResponse;
    })[] = await scrapeWebsites(urls);
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
                                    "Given a description about a political candidate and their campaign, analyze and extract a comprehensive list of the campaign's key policy positions. For each policy, provide the following information:\n" +
                                    "1. campaign_topic: Categorize the policy under the most appropriate topic from the predefined list. If it doesn't fit neatly, use 'Other'.\n" +
                                    "2. campaign_subtopic: If 'Other' is used for campaign_topic, specify a suitable subcategory here. Otherwise, provide a brief (1-3 words) subtitle for the policy.\n" +
                                    "3. detailed_campaign_policy: Provide a detailed explanation of the policy in 1-2 sentences. Include:\n" +
                                    "   - The specific policy stance or proposal\n" +
                                    "   - Any concrete plans or measures mentioned\n" +
                                    "   - Quantitative goals or timelines, if available\n" +
                                    "Ensure that each extracted policy is distinct and substantive, avoiding repetition or overly vague statements.\n" +
                                    "Example output:\n" +
                                    "{\n" +
                                    "  campaign_topic: 'Tax Policy',\n" +
                                    "  campaign_subtopic: 'Progressive Taxation',\n" +
                                    "  detailed_campaign_policy: 'Harris supports a Billionaire Minimum Income Tax and increasing the tax on stock buybacks to 4%. She also proposes a ten-fold tax reduction for small businesses, offering relief ranging from $5,000 to $50,000. These measures aim to ensure fair taxation of the wealthy while providing support for small enterprises.'\n" +
                                    "}",
                            },
                            {
                                role: "user",
                                content: section,
                            },
                        ],
                        response_format: zodResponseFormat(
                            ListCampaignPolicySchema,
                            "ListCampaignPolicySchema",
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
