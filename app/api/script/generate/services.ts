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

const promptStyle2 = async (
    voter: VoterRecord,
    cityData: CityData,
    campaignIssues: CampaignPolicy[],
): Promise<z.infer<typeof AdSegmentArraySchema>> => {
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

    // First create a generic non-structured script

    const overallScriptSystemPrompt =
        `Create a political campaign ad script for Kamala Harris that she will speak. Use the provided voter background, city information, and relevant campaign policies. There may be multiple policies discussed, but keep it concise and focus on one of the main critical issues and how Kamala Harris has currently addressed it or would address it, in the broader scope of America, while also discussing its impact on the voter given their background.. The output should be spoken voiceover content - The content that Kamala Harris would speak in her vocabulary and style of speech.

Guidelines:
- Keep the overall length to 30 seconds or less
- Keep it really concise.
- Be willing to be forceful and passionate.
- Feel free to mention anything you know about the voter other than their location if it helps shape the speech well. But don't go overboard.`;

    const overallScriptUserPrompt = [
        `Voter background: ${
            JSON.stringify({
                age: voter.age,
                city: voter.city,
                state: voter.state,
                party_affiliation: voter.party_affiliation,
                campaigns_donated_to: voter.campaigns_donated_to,
                nonprofits_donated_to: voter.nonprofits_donated_to,
            })
        }`,
        `City information: ${JSON.stringify(cityData)}`,
        `Campaign policies: ${JSON.stringify(relevantCampaignPolicies)}`,
        `Instructions: ${overallScriptSystemPrompt}`,
        `Example 1 of how Kamala Harris speaks: As a nation, we must recognize that access to healthcare is not a privilege, it is a right. Every person, no matter who they are, no matter where they live, deserves the ability to see a doctor, to get the care they need. And we cannot, and we will not, back down in the fight for women's rights — for the right to make decisions about our own bodies. We are strong, we are resilient, and we will continue to push for a future where healthcare is affordable, where women's rights are respected, and where justice is truly served for all.`,
        `Example 2 of how Kamala Harris speaks: Climate change is an existential threat, and time is not on our side. The science is clear, and the consequences are real. From wildfires in California to hurricanes in the Gulf, we are already seeing the effects of climate change in our daily lives. But I am hopeful, because I know that when we come together, when we commit to bold action, we can meet this moment. We can protect our planet, create millions of green jobs, and ensure a sustainable future for generations to come.`,
        `Example 3 of how Kamala Harris speaks: We are at a pivotal moment in our country's history. A moment where we must confront the injustices that have been allowed to persist for far too long. Racism, inequality, and discrimination have no place in America, and it is on all of us to build a country where everyone — no matter the color of their skin, their gender, or where they come from — has the opportunity to succeed. We are better than this, and together, we can turn pain into progress. We can turn anger into action.`,
    ].join("\n");

    const overallScriptResponse = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: [
            {
                role: "user",
                content: overallScriptUserPrompt,
            },
        ],
        temperature: 1,
    });

    const nonstructuredScript =
        overallScriptResponse.choices[0].message.content;

    if (!nonstructuredScript) {
        throw new Error("Error generating nonstructured script");
    }

    // Now structure the script

    const structuredScript = await openai.beta.chat.completions.parse({
        model: "gpt-4o-2024-08-06",
        messages: [
            {
                role: "user",
                content:
                    `Structure the given script into segments for a political ad. Follow these guidelines:

1. Break the script into short segments of 3-5 words each. These breaks should be based on natural pauses in speech, not necessarily complete sentences.
2. Most segments (about 70-80%) should be non-B-roll (candidate speaking directly to camera).
3. B-roll segments should be limited to at most 3 seconds of content each.
4. For each segment, provide:
   - spoken_transcript: The exact words Kamala Harris would say (3-5 words)
   - is_b_roll: Boolean indicating if it's B-roll footage
   - b_roll_search_query: Only for B-roll segments, provide 2-3 relevant keywords

Example structure:
{
  "segments": [
    {
      "spoken_transcript": "Friends, our nation faces challenges like never before. We see it in our communities every day",
      "is_b_roll": false
    },
    {
      "spoken_transcript": "Families struggling to make ends meet",
      "is_b_roll": true,
      "b_roll_search_query": "families, financial stress, urban setting"
    },
    {
      "spoken_transcript": "But together, we can make a difference. We have the power to shape our future. It's time to stand united and work towards a better America. With your support, we can overcome any obstacle and build a country that truly represents all of us.",
      "is_b_roll": false
    }
  ]
}

Ensure the structured output maintains the original message and Kamala Harris's speaking style.\n\nScript: ${nonstructuredScript}`,
            },
        ],
        response_format: zodResponseFormat(
            AdSegmentArraySchema,
            "AdSegmentArray",
        ),
        temperature: 1,
    });

    const script: z.infer<typeof AdSegmentArraySchema> =
        structuredScript.choices[0].message.parsed ?? {
            segments: [],
        };

    // Combine consecutive segments with the same is_b_roll value
    const combinedSegments = script.segments.reduce((acc, segment, index) => {
        if (
            index === 0 ||
            segment.is_b_roll !== script.segments[index - 1].is_b_roll
        ) {
            acc.push(segment);
        } else {
            const lastSegment = acc[acc.length - 1];
            lastSegment.spoken_transcript += " " + segment.spoken_transcript;
            if (segment.b_roll_search_query) {
                lastSegment.b_roll_search_query =
                    (lastSegment.b_roll_search_query || "") +
                    (lastSegment.b_roll_search_query ? ", " : "") +
                    segment.b_roll_search_query;
            }
        }
        return acc;
    }, [] as z.infer<typeof AdSegmentArraySchema>["segments"]);

    // Merge short non-b-roll segments with following b-roll segments
    const mergedSegments = combinedSegments.reduce((acc, segment, index) => {
        if (
            index > 0 &&
            !acc[acc.length - 1].is_b_roll &&
            segment.is_b_roll &&
            acc[acc.length - 1].spoken_transcript.split(" ").length < 6
        ) {
            const lastSegment = acc[acc.length - 1];
            lastSegment.spoken_transcript += " " + segment.spoken_transcript;
            lastSegment.is_b_roll = false;
            if (segment.b_roll_search_query) {
                lastSegment.b_roll_search_query = segment.b_roll_search_query;
            }
        } else {
            acc.push(segment);
        }
        return acc;
    }, [] as z.infer<typeof AdSegmentArraySchema>["segments"]);

    // Ensure the last segment is not b-roll
    if (
        mergedSegments.length > 0 &&
        mergedSegments[mergedSegments.length - 1].is_b_roll
    ) {
        mergedSegments[mergedSegments.length - 1].is_b_roll = false;
        mergedSegments[mergedSegments.length - 1].b_roll_search_query = "";
    }

    script.segments = mergedSegments;

    return script;
};

const promptStyle1 = async (
    voter: VoterRecord,
    cityData: CityData,
    campaignIssues: CampaignPolicy[],
): Promise<z.infer<typeof AdSegmentArraySchema>> => {
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

    return script;
};

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

    return promptStyle2(voter, cityData, campaignIssues || []);
};

export { generateScript };
