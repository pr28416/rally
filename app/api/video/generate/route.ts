import { generateVideo } from "./services";
import { GenerateVideoRequest } from "./types";

export async function POST(req: Request) {
  const { videoRequests }: { videoRequests: GenerateVideoRequest[] } = await req
    .json();

  console.log(videoRequests.length);

  const results = await Promise.all(
    videoRequests.map((request) => generateVideo(request)),
  );

  return Response.json(results);
}
