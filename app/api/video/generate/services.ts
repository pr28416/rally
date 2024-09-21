import { GenerateVideoRequest, GenerateVideoResponse } from "./types";

async function generateVideo(
    request: GenerateVideoRequest,
    timeout: number = 5 * 60 * 1000, // Default timeout of 5 minutes
): Promise<GenerateVideoResponse> {
    return new Promise(async (resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error("Video generation timed out"));
        }, timeout);

        const startTime = Date.now();

        try {
            console.log("Generating video for: ", request);
            const response = await fetch("https://api.synclabs.so/lipsync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": process.env.SYNC_LABS_API_KEY || "",
                },
                body: JSON.stringify({
                    videoUrl: request.videoUrl,
                    audioUrl: request.audioUrl,
                    synergize: request.synergize || true,
                    model: request.model || "sync-1.7.1-beta",
                }),
            });
            const data = await response.json();
            const { id: job_id, message, statusCode, error, status: jobStatus }:
                {
                    id?: string;
                    message?: string[];
                    statusCode?: number;
                    error?: string;
                    status?: string;
                } = data;

            if (error || (statusCode && statusCode !== 200)) {
                throw new Error(
                    statusCode + " " + error + " " + message?.toString(),
                );
            } else if (!job_id) {
                throw new Error("No job ID found: " + JSON.stringify(data));
            }

            let status = jobStatus;
            let resultUrl = "";

            while (status === "PENDING" || status === "PROCESSING") {
                if (Date.now() - startTime > timeout) {
                    throw new Error("Video generation timed out");
                }

                await new Promise((resolve) => setTimeout(resolve, 10 * 1000)); // Wait for 10 sec before checking the status again

                const statusResponse = await fetch(
                    `https://api.synclabs.so/lipsync/${job_id}`,
                    {
                        headers: {
                            "x-api-key": process.env.SYNC_LABS_API_KEY || "",
                        },
                    },
                );
                const statusData = await statusResponse.json();
                status = statusData.status;

                if (status === "COMPLETED") {
                    if (statusData.videoUrl) {
                        resultUrl = statusData.videoUrl;
                        clearTimeout(timeoutId);
                        const elapsedTime = Date.now() - startTime;
                        resolve({
                            jobId: job_id,
                            status,
                            resultUrl,
                            elapsedTime,
                        });
                        return;
                    } else {
                        throw new Error("No result URL found");
                    }
                } else if (status !== "PENDING" && status !== "PROCESSING") {
                    clearTimeout(timeoutId);
                    const elapsedTime = Date.now() - startTime;
                    reject({
                        jobId: job_id,
                        status,
                        resultUrl,
                        error: statusData.error || "Unknown error",
                        elapsedTime,
                    });
                    return;
                }
            }

            clearTimeout(timeoutId);
            const elapsedTime = Date.now() - startTime;
            resolve({
                jobId: job_id,
                status,
                resultUrl,
                elapsedTime,
            });
        } catch (error) {
            console.error(error);
            clearTimeout(timeoutId);
            reject({
                jobId: null,
                status: "ERROR",
                resultUrl: "",
                error: error instanceof Error ? error.message : "Unknown error",
                elapsedTime: Date.now() - startTime,
            });
        }
    });
}

export { generateVideo };
