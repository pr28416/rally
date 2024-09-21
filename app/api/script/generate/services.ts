import { Database } from "@/lib/types/schema";
import { supabase } from "@/lib/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.mjs";

type VoterRecord = Database["public"]["Tables"]["voter_records"]["Row"];
type CityData = Database["public"]["Tables"]["cities"]["Row"];
type CampaignPolicy = Database["public"]["Tables"]["campaign_policies"]["Row"];

const AdSegmentSchema = z.object({
    spoken_transcript: z.string(),
    is_b_roll: z.boolean(),
    b_roll_search_query: z.string().optional(),
});

const AdSegmentArraySchema = z.object({
    segments: z.array(AdSegmentSchema),
});

const generateScript = async (
    voter: VoterRecord,
): Promise<z.infer<typeof AdSegmentArraySchema>> => {
    // Find city data for the city the voter lives in
    if (!voter.city || !voter.state) {
        throw new Error("Voter city or state is null");
    }
    const { data: cityData, error: cityError }: {
        data: CityData | null;
        error: PostgrestError | null;
    } = await supabase
        .from("cities")
        .select("*")
        .eq("town", voter.city)
        .eq("state", voter.state)
        .order("created_at", { ascending: false })
        .returns<CityData>()
        .maybeSingle();

    if (cityError) {
        throw new Error("Error getting city data");
    }

    if (!cityData) {
        throw new Error("City data not found");
    }

    // Get all the campaign issues that fall in the voter's topic list
    const { data: campaignIssues, error: campaignIssuesError }: {
        data: CampaignPolicy[] | null;
        error: PostgrestError | null;
    } = await supabase
        .from("campaign_policies")
        .select("*")
        .in("campaign_topic", cityData.topics || [])
        .returns<CampaignPolicy[]>();

    if (campaignIssuesError) {
        throw new Error("Error getting campaign issues");
    }

    // Use GPT to get the top campaign policies that relate to the voter's campaign issues
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content:
                    "Given information about a city a list of potentially relevant campaign policies, return a bulleted list of the campaign policies/promises that most relate to the city's background and currently faced issues.",
            },
            {
                role: "user",
                content: `Context about city: ${
                    JSON.stringify(
                        cityData,
                    )
                }\n\nCampaign issues: \n${
                    campaignIssues?.slice(0, 5).map(
                        (issue) => "- " + issue.detailed_campaign_policy,
                    ).join("\n")
                }`,
            },
        ],
    });

    const relevantCampaignPolicies = response.choices[0].message.content;

    if (!relevantCampaignPolicies) {
        throw new Error("Error generating relevant campaign policies");
    }

    const overallScriptSystemPrompt =
        `Create a political campaign ad script for Kamala Harris. Use the provided voter background, city information, and relevant campaign policies. Structure the script as a JSON object with segments, each containing:
        1. Spoken voiceover content - The content that Kamala Harris would speak in her vocabulary and style of speech, whether it's over B-roll or not
        2. Shot type (candidate or B-roll)
        3. B-roll search query (if applicable)

        Guidelines:
        - Focus on the most relevant campaign policies. Pick one or two to focus on
        - Maintain a balance between candidate shots and B-roll
        - Whether or not a clip is B-roll, Kamala Harris will be speaking, so spoken_transcript should be what she says.
        - Keep the overall length to 45 seconds or less`;

    const overallScriptUserPrompt = [
        `Voter background: ${
            JSON.stringify({
                ...voter,
                first_name: undefined,
                last_name: undefined,
            })
        }`,
        `City information: ${JSON.stringify(cityData)}`,
        `Campaign policies: ${JSON.stringify(relevantCampaignPolicies)}`,
    ].join("\n");

    const overallScriptResponse = await openai.beta.chat.completions.parse({
        model: "gpt-4o-2024-08-06",
        messages: [
            {
                role: "system",
                content: overallScriptSystemPrompt,
            },
            {
                role: "user",
                content: overallScriptUserPrompt,
            },
        ],
        response_format: zodResponseFormat(
            AdSegmentArraySchema,
            "AdSegmentArray",
        ),
    });

    const script: z.infer<typeof AdSegmentArraySchema> =
        overallScriptResponse.choices[0].message.parsed ?? {
            segments: [],
        };

    return script;
};

export { generateScript };
