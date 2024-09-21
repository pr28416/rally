export async function POST(req: Request) {
  const { prompt } = await req.json();
  console.log(prompt);
  return new Response(JSON.stringify({ message: "Response from my route" }), {
    headers: { 'Content-Type': 'application/json' },
  });
}