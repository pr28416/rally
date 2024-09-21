export type GenerateVideoRequest = {
    videoUrl: string;
    audioUrl: string;
    synergize?: boolean;
    model?: string;
};

export interface GenerateVideoResponse {
    jobId?: string;
    status?: string;
    resultUrl: string;
    elapsedTime: number;
    error?: string;
}
