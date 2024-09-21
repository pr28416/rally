import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';
import { zodResponseFormat } from "openai/helpers/zod.mjs";

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!PERPLEXITY_API_KEY) {
  throw new Error('PERPLEXITY_API_KEY is not set in environment variables');
}

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const CitySchema = z.object({
  mayor: z.string(),
  county_name: z.string(),
  local_government_actions: z.array(z.string()),
  significant_political_events: z.array(z.string()),
  average_income: z.string(),
  economic_growth: z.string(),
  birth_rates: z.string(),
  party_leanings: z.string(),
  general_vote_history: z.string(),
  key_issues: z.array(z.string()),
  causing_issues: z.array(z.string()),
  things_people_like: z.array(z.string()),
  relevant_figures: z.array(z.string()),
  relevant_companies: z.array(z.string()), 
  topic: z.enum([
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
])
});

export async function POST(request: Request) {
  try {
    const { town, state } = await request.json();

    if (!town || !state) {
      return NextResponse.json({ error: 'Town and state are required' }, { status: 400 });
    }

    const { data: existingData, error: fetchError } = await supabase
      .from('cities')
      .select('*')
      .eq('town', town)
      .eq('state', state)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`Error fetching data from Supabase: ${fetchError.message}`);
    }

    if (existingData) {
      const formattedData = CitySchema.parse(existingData);
      return NextResponse.json(formattedData, { status: 200 });
    }

    const query = `Provide a detailed summary of recent political issues and context in ${town}, ${state}. Include the following information:
    - The current mayor: Provide the full name and a brief background.
    - Local government actions: List and describe recent actions taken by the local government.
    - Significant political events: Detail recent and upcoming political events.
    - Key statistics: Include average income, economic growth, birth rates, party leanings, general vote history, and the county name.
    - Key issues: Identify and describe key issues that people in the town are angry about.
    - Causing issues: Describe things that are causing issues in the town.
    - Things people like: List and describe things that people in the town appreciate.
    - Relevant figures: Identify and provide details about important figures in the town.
    - Relevant companies: Identify and provide details about significant companies in the town.
    Search the news to provide this information. Format the response nicely and be very detailed in describing issues, government actions, and other relevant information.`;

    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: query }],
        max_tokens: 1024
      })
    });

    if (!perplexityResponse.ok) {
      throw new Error(`Perplexity API request failed with status ${perplexityResponse.status}`);
    }

    const perplexityData = await perplexityResponse.json();
    const perplexityContent = perplexityData.choices[0].message.content;

    const openaiResponse = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: perplexityContent },
        {
          role: 'system',
          content: `Based on the provided information, generate a detailed and structured output of the key political issues, information, and other relevant content about ${town}, ${state}. Ensure the output includes:
          - The current mayor: Provide the full name and a brief background.
          - Local government actions: List and describe recent actions taken by the local government.
          - Significant political events: Detail recent and upcoming political events.
          - Key statistics: Include average income, economic growth, birth rates, party leanings, general vote history, and the county name.
          - Key issues: Identify and describe key issues that people in the town are angry about.
          - Causing issues: Describe things that are causing issues in the town.
          - Things people like: List and describe things that people in the town appreciate.
          - Relevant figures: Identify and provide details about important figures in the town.
          - Relevant companies: Identify and provide details about significant companies in the town.
          Format the response in a structured JSON format with the following fields:
          {
            "mayor": "string",
            "county_name": "string",
            "local_government_actions": ["string"],
            "significant_political_events": ["string"],
            "average_income": "string",
            "economic_growth": "string",
            "birth_rates": "string",
            "party_leanings": "string",
            "general_vote_history": "string",
            "key_issues": ["string"],
            "causing_issues": ["string"],
            "things_people_like": ["string"],
            "relevant_figures": ["string"],
            "relevant_companies": ["string"], 
            "topic": "Immigration" | "Gun Rights" | "Healthcare" | "Climate Change" | "Economy" | "Education" | "National Security" | "Tax Policy" | "Social Security" | "Abortion" | "Civil Rights" | "Criminal Justice Reform" | "Foreign Policy" | "Voting Rights" | "Labor Rights" | "LGBTQ+ Rights" | "Drug Policy" | "Infrastructure" | "Trade Policy" | "Government Spending" | "Other"
          }`
        }
      ],
      response_format: zodResponseFormat(CitySchema, 'City')
    });

    if (!openaiResponse.choices[0].message) {
      throw new Error('OpenAI API did not return a valid response');
    }

    const openaiData = openaiResponse.choices[0].message.parsed;

    const { error: upsertError } = await supabase
      .from('cities')
      .upsert({
        town,
        state,
        ...openaiData
    });

    if (upsertError) {
      throw new Error(`Error upserting data into Supabase: ${upsertError.message}`);
    }

    return NextResponse.json(openaiData, { status: 200 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}