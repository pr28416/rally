import billsData from '@/lib/json/bills.json';

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Valid message history is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemMessage = {
      role: "system",
      content: `You are an AI compliance expert for political advertising. Use the following information about state legislation to inform your answers:
      ${JSON.stringify(billsData.states)}
      
      Provide clear and concise explanations, referencing specific bills when relevant. If no specific legislation exists for the state in question, mention that fact.`
    };

    const allMessages = [systemMessage, ...messages];

    const stream = await fetch("https://proxy.tune.app/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": process.env.TUNE_API_KEY ?? '',
      },
      body: JSON.stringify({
        temperature: 0.7,
        messages: allMessages,
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