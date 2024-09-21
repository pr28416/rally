export async function POST(req: Request) {
  const { prompt } = await req.json();
  console.log(prompt);
  return Response.json({ message: "Response from my route" });
}
