import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { getQueryLocation } from '@/lib/cityUtils';

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
  topics: z.array(z.enum([
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
  ])),
  state_governor: z.string(),
});

export async function POST(request: Request) {
  try {
    const { town, state } = await request.json();

    if (!state) {
      return NextResponse.json({ error: 'State is required' }, { status: 400 });
    }

    const { queryLocation, queryType } = getQueryLocation(town, state);

    let supabaseQuery = supabase
      .from('cities')
      .select('*')
      .eq('state', state);
  
    if (queryType === 'town') {
      supabaseQuery = supabaseQuery.eq('town', town);
    } else {
      supabaseQuery = supabaseQuery.is('town', null);
    }
    
    const { data: existingData, error: fetchError } = await supabaseQuery.single();
  
    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`Error fetching data from Supabase: ${fetchError.message}`);
    }

    if (existingData) {
      const formattedData = CitySchema.parse(existingData);
      return NextResponse.json(formattedData, { status: 200 });
    }

    const query = `Provide a detailed summary of recent political issues and context in ${queryLocation}. Include the following information:
    ${queryType === 'town' ? '- The current mayor: Provide the full name and a brief background.' : ''}
    - Local government actions: List and describe recent actions taken by the ${queryType} government.
    - Significant political events: Detail recent and upcoming political events.
    - Key statistics: Include average income, economic growth, birth rates, party leanings, general vote history${queryType === 'town' ? ', and the county name' : ''}.
    - Key issues: Identify and describe key issues that people in the ${queryType} are angry about.
    - Causing issues: Describe things that are causing issues in the ${queryType}.
    - Things people like: List and describe things that people in the ${queryType} appreciate.
    - Relevant figures: Identify and provide details about important figures in the ${queryType}.
    - Relevant companies: Identify and provide details about significant companies in the ${queryType}.
    - The state governor: Provide the full name and a brief background.
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
            content: `Based on the provided information, generate a detailed and structured output of the key political issues, information, and other relevant content about ${queryLocation}. Ensure the output includes:
            ${queryType === 'town' ? '- The current mayor: Provide the full name and a brief background.' : ''}
            - Local government actions: List and describe recent actions taken by the ${queryType} government.
            - Significant political events: Detail recent and upcoming political events.
            - Key statistics: Include average income, economic growth, birth rates, party leanings, general vote history${queryType === 'town' ? ', and the county name' : ''}.
            - Key issues: Identify and describe key issues that people in the ${queryType} are angry about.
            - Causing issues: Describe things that are causing issues in the ${queryType}.
            - Things people like: List and describe things that people in the ${queryType} appreciate.
            - Relevant figures: Identify and provide details about important figures in the ${queryType}.
            - Relevant companies: Identify and provide details about significant companies in the ${queryType}.
            - Topics: Identify and provide details about important topics in the ${queryType}. Generate a maximum of 5 topics. 
            - State governor: Identify and provide details about the current governor of the state.
            Format the response in a structured JSON format with the following fields:
            {
              ${queryType === 'town' ? '"mayor": "string",' : ''}
              ${queryType === 'town' ? '"county_name": "string",' : ''}
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
              "state_governor": "string",
              "topics":[ "Immigration" | "Gun Rights" | "Healthcare" | "Climate Change" | "Economy" | "Education" | "National Security" | "Tax Policy" | "Social Security" | "Abortion" | "Civil Rights" | "Criminal Justice Reform" | "Foreign Policy" | "Voting Rights" | "Labor Rights" | "LGBTQ+ Rights" | "Drug Policy" | "Infrastructure" | "Trade Policy" | "Government Spending" | "Other" ]
            }`
          }
        ],
        response_format: zodResponseFormat(CitySchema, 'City')
      });
  

    if (!openaiResponse.choices[0].message) {
      throw new Error('OpenAI API did not return a valid response');
    }

    const openaiData = openaiResponse.choices[0].message.parsed;

    if (openaiData?.topics) {
        openaiData.topics = openaiData.topics.slice(0, 5);
    }
    const { error: upsertError } = await supabase
      .from('cities')
      .upsert({
        town: queryType === 'town' ? town : null,
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