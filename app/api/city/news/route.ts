import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { supabase } from '@/lib/supabase/client';

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
      const formattedData = {
        mayor: existingData.mayor,
        county_name: existingData.county_name,
        local_government_actions: existingData.local_government_actions,
        significant_political_events: existingData.significant_political_events,
        average_income: existingData.average_income,
        economic_growth: existingData.economic_growth,
        birth_rates: existingData.birth_rates,
        party_leanings: existingData.party_leanings,
        general_vote_history: existingData.general_vote_history,
        key_issues: existingData.key_issues,
        causing_issues: existingData.causing_issues,
        things_people_like: existingData.things_people_like,
        relevant_figures: existingData.relevant_figures,
        relevant_companies: existingData.relevant_companies
      };
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
            "relevant_companies": ["string"]
          }`
        }
      ],
      functions: [
        {
          name: "structured_output",
          description: "Return the output in a structured JSON format",
          parameters: {
            type: "object",
            properties: {
              mayor: { type: "string" },
              county_name: { type: "string" },
              local_government_actions: { type: "array", items: { type: "string" } },
              significant_political_events: { type: "array", items: { type: "string" } },
              average_income: { type: "string" },
              economic_growth: { type: "string" },
              birth_rates: { type: "string" },
              party_leanings: { type: "string" },
              general_vote_history: { type: "string" },
              key_issues: { type: "array", items: { type: "string" } },
              causing_issues: { type: "array", items: { type: "string" } },
              things_people_like: { type: "array", items: { type: "string" } },
              relevant_figures: { type: "array", items: { type: "string" } },
              relevant_companies: { type: "array", items: { type: "string" } }
            },
            required: ["mayor", "local_government_actions", "significant_political_events", "average_income", "economic_growth", "birth_rates", "party_leanings", "general_vote_history", "county_name", "key_issues", "causing_issues", "things_people_like", "relevant_figures", "relevant_companies"]
          }
        }
      ]
    });

    if (!openaiResponse.choices[0].message) {
      throw new Error('OpenAI API did not return a valid response');
    }

    const openaiData = JSON.parse(openaiResponse.choices[0].message.function_call?.arguments || '{}');

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