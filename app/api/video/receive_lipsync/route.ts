export async function POST(req: Request) {
  try {
    const webhookData = await req.json();

    // Process the webhook data
    console.log('Received lipsync webhook:', webhookData);

    // Here you can add logic to update your database or perform any other actions
    // based on the received webhook data

    return new Response(JSON.stringify({ message: 'Webhook received successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing lipsync webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}