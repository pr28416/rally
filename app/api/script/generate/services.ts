import { Database } from "@/lib/types/schema";
import { supabase } from "@/lib/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { getQueryLocation } from "@/lib/cityUtils";

type VoterRecord = Database["public"]["Tables"]["voter_records"]["Row"];
type CityData = Database["public"]["Tables"]["cities"]["Row"];
type CampaignPolicy = Database["public"]["Tables"]["campaign_policies"]["Row"];

export const AdSegmentSchema = z.object({
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
    if (!voter.city || !voter.state) {
        throw new Error("Voter city or state is null");
    }

    const { queryType } = getQueryLocation(voter.city, voter.state);

    let query = supabase
        .from("cities")
        .select("*")
        .eq("state", voter.state)
        .order("created_at", { ascending: false });

    if (queryType === "town") {
        query = query.eq("town", voter.city);
    } else {
        query = query.is("town", null).is("county_name", null);
    }

    const { data: cityData, error: cityError }: {
        data: CityData | null;
        error: PostgrestError | null;
    } = await query.returns<CityData>().maybeSingle();

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
        `Create a political campaign ad script for Kamala Harris that she will speak. Use the provided voter background, city information, and relevant campaign policies. There may be multiple policies discussed, but keep it concise and stick to one of the main critical issues + how Kamala Harris would address it. Structure the script as a JSON object with segments, each containing:
        1. Spoken voiceover content - The content that Kamala Harris would speak in her vocabulary and style of speech, whether it's over B-roll or not
        2. Shot type (candidate or B-roll)
        3. B-roll search query (if applicable)

        Guidelines:
        - Maintain a balance between candidate shots and B-roll
        - Whether or not a clip is B-roll, Kamala Harris will be speaking, so spoken_transcript should be what she says.
        - Keep the overall length to 30 seconds or less
        - For B-roll segments, provide the b_roll_search_query as a list of 3-5 keywords, separated by commas
        - Keep it really really short. Every scene is at most 5 words.`;

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
        `Instructions: ${overallScriptSystemPrompt}`,
        `Example 1 of how Kamala Harris speaks: As a nation, we must recognize that access to healthcare is not a privilege, it is a right. Every person, no matter who they are, no matter where they live, deserves the ability to see a doctor, to get the care they need. And we cannot, and we will not, back down in the fight for women's rights — for the right to make decisions about our own bodies. We are strong, we are resilient, and we will continue to push for a future where healthcare is affordable, where women's rights are respected, and where justice is truly served for all.`,
        `Example 2 of how Kamala Harris speaks: Climate change is an existential threat, and time is not on our side. The science is clear, and the consequences are real. From wildfires in California to hurricanes in the Gulf, we are already seeing the effects of climate change in our daily lives. But I am hopeful, because I know that when we come together, when we commit to bold action, we can meet this moment. We can protect our planet, create millions of green jobs, and ensure a sustainable future for generations to come.`,
        `Example 3 of how Kamala Harris speaks: We are at a pivotal moment in our country's history. A moment where we must confront the injustices that have been allowed to persist for far too long. Racism, inequality, and discrimination have no place in America, and it is on all of us to build a country where everyone — no matter the color of their skin, their gender, or where they come from — has the opportunity to succeed. We are better than this, and together, we can turn pain into progress. We can turn anger into action.`,
    ].join("\n");

    const overallScriptResponse = await openai.beta.chat.completions.parse({
        model: "gpt-4o-2024-08-06",
        messages: [
            {
                role: "user",
                content: overallScriptUserPrompt,
            },
        ],
        response_format: zodResponseFormat(
            AdSegmentArraySchema,
            "AdSegmentArray",
        ),
        temperature: 1,
    });

    const script: z.infer<typeof AdSegmentArraySchema> =
        overallScriptResponse.choices[0].message.parsed ?? {
            segments: [],
        };

    // Reduce all into one segment
    // script.segments = [
    //     {
    //         spoken_transcript: script.segments.map(
    //             (segment) => segment.spoken_transcript,
    //         ).join(" "),
    //         is_b_roll: false,
    //     },
    // ];

    // // For debugging, change all the b-roll segments to candidate shots
    // script.segments = script.segments.map((segment) => ({
    //     ...segment,
    //     is_b_roll: false,
    // }));

    return script;
};

export { generateScript };
