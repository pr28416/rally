import billsData from '@/lib/json/bills.json';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are an AI compliance expert for political advertising. Answer the following query about AI political ad compliance rules in a specific state:

    ${query}
    
    Use the following information about state legislation to inform your answer:
    ${JSON.stringify(billsData.states)}
    
    Provide a clear and concise explanation, referencing specific bills when relevant. If no specific legislation exists for the state in question, mention that fact.`;
    
    const messages = [
      {
        role: "system",
        content: "You are an AI compliance expert for political advertising."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const stream = await fetch("https://proxy.tune.app/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "sk-tune-Tuhx06Pc4oNHnQv4gapLlxhmEl0Z3oudjXw",
      },
      body: JSON.stringify({
        temperature: 0.7,
        messages: messages,
        model: "dineshtv/dineshtv-llama3-1",
        stream: true,
        frequency_penalty: 0.2,
        max_tokens: 500
      })
    });

    if (!stream.ok) {
      throw new Error(`HTTP error! status: ${stream.status}`);
    }

    return new Response(
      new ReadableStream({
        async start(controller) {
          const reader = stream.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.close();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices[0]?.delta?.content || '';
                  if (content) {
                    controller.enqueue(content);
                  }
                } catch (e) {
                  console.error('Error parsing JSON:', e);
                }
              }
            }
          }
          controller.close();
        },
      }),
      {
        headers: {
          'Content-Type': 'text/plain',
          'Transfer-Encoding': 'chunked',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response('Failed to process the request. Please try again later.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}