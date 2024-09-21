import { Database } from "@/lib/types/schema";
import { generateScript } from "../../script/generate/services";
import { Video, VideoFile } from "../../broll/route";

type VoterRecord = Database["public"]["Tables"]["voter_records"]["Row"];
type AdjustedTimestamp = {
    start: number;
    end: number;
    is_b_roll: boolean;
    b_roll_link: string | null;
};

export async function generateAd(voter: VoterRecord) {
    // Get script segments
    const script_segments = (await generateScript(voter)).segments;

    // Audio generation & B-roll option generation
    const full_transcript = script_segments.map((segment) =>
        segment.spoken_transcript
    ).join(" ");
    const audio_promise = async () => {
        console.log("Generating audio");
        const audio_response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/voice/generate`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ transcript: full_transcript }),
            },
        );

        if (!audio_response.ok) {
            throw new Error("Failed to generate audio");
        }

        const { audio, wordTimings } = await audio_response.json();
        console.log("Audio generated");
        return { audio, wordTimings };
    };

    const b_roll_promise = async (): Promise<(Video[] | null)[]> => {
        // TODO: Implement b-roll option generation
        // Will return a list of b-roll options if slot is b-roll, otherwise empty item
        const getBRollOptions = async (
            query: string,
        ): Promise<Video[] | null> => {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/broll`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ query }),
                },
            );

            if (!response.ok) {
                console.error("Failed to generate b-roll options");
                return [];
            }

            const data: { videos: Video[] } = await response.json();
            return data.videos;
        };

        return Promise.all(script_segments.map(async (segment) => {
            if (segment.is_b_roll && segment.b_roll_search_query) {
                return getBRollOptions(segment.b_roll_search_query);
            } else {
                return Promise.resolve(null);
            }
        }));
    };

    const [audio_response, b_roll_response] = await Promise.all([
        audio_promise(),
        b_roll_promise(),
    ]);

    // Construct timestamp'd script_segments
    const segmentTimestamps: [number, number][] = [];
    let segmentIndex = 0;
    let wordIndex = 0;
    let currentSegmentWords: string[] = [];

    console.log(
        "Script segments:",
        script_segments.map((segment) => segment.spoken_transcript),
    );
    console.log("Word timings:", audio_response.wordTimings);
    let segmentStartTime = 0;
    let segmentEndTime = 0;

    for (const [word, start, end] of audio_response.wordTimings) {
        if (segmentIndex === script_segments.length) {
            throw new Error("Generated audio is longer than the script");
        }

        if (wordIndex === 0) {
            currentSegmentWords = script_segments[segmentIndex]
                .spoken_transcript
                .split(" ")
                .map((w) => w.replace(/[^\w]/g, "").toLowerCase());
            segmentStartTime = start;
        }

        const cleanedWord = word.replace(/[^\w]/g, "").toLowerCase();
        if (currentSegmentWords[wordIndex] === cleanedWord) {
            wordIndex++;
            segmentEndTime = end;

            if (wordIndex === currentSegmentWords.length) {
                segmentTimestamps.push([segmentStartTime, segmentEndTime]);
                console.log(
                    `Segment ${segmentIndex} timestamps: [${segmentStartTime}, ${segmentEndTime}]`,
                );
                segmentIndex++;
                wordIndex = 0;
            }
        } else {
            throw new Error(
                `Word mismatch: Expected "${
                    currentSegmentWords[wordIndex]
                }", got "${word}"`,
            );
        }
    }

    if (segmentIndex < script_segments.length) {
        throw new Error("Generated audio is shorter than the script");
    }

    // Test current implementation
    // return {
    //     wordTimings: segmentTimestamps.map((interval, index) => {
    //         const [start, end] = interval;
    //         const startMatch = audio_response.wordTimings.findIndex(
    //             ([_, s, _e]) => s === start,
    //         );
    //         const endMatch = audio_response.wordTimings.findIndex(
    //             ([_, _s, e]) => e === end,
    //         );

    //         console.log(`Segment ${index}:`);
    //         if (startMatch !== -1) {
    //             console.log(
    //                 `  Start match: ${
    //                     JSON.stringify(audio_response.wordTimings[startMatch])
    //                 } at index ${startMatch}`,
    //             );
    //         }
    //         if (endMatch !== -1) {
    //             console.log(
    //                 `  End match: ${
    //                     JSON.stringify(audio_response.wordTimings[endMatch])
    //                 } at index ${endMatch}`,
    //             );
    //         }

    //         return interval;
    //     }),
    //     script_segments: script_segments,
    // };

    // For each B-roll option, find the B-roll video that fits in the timestamp
    const filteredBRollSegments: (Video | null)[] = b_roll_response.map(
        (broll: Video[] | null, index: number) => {
            const [start, end] = segmentTimestamps[index];
            if (!broll) {
                return null;
            }
            for (const video of broll) {
                const length = end - start;
                if (
                    video.duration >= length - 2 && video.video_files.length > 0
                ) {
                    return video;
                }
            }
            return null;
        },
    );

    // Adjust the timestamps now that some B-roll options are shorter than expected. If the B-roll is shorter than expected, decrease the end time of the B-roll segment and create a new segment from the end of the B-roll to the end of the original segment that is not B-roll.
    const adjustedTimestamps: AdjustedTimestamp[] = [];
    for (let i = 0; i < segmentTimestamps.length; i++) {
        const [start, end] = segmentTimestamps[i];
        const bRoll = filteredBRollSegments[i];
        if (bRoll) {
            if (end - start > bRoll.duration) {
                adjustedTimestamps.push({
                    start,
                    end: start + bRoll.duration,
                    is_b_roll: true,
                    b_roll_link: bRoll.video_files[0].link,
                });
                adjustedTimestamps.push({
                    start: start + bRoll.duration,
                    end,
                    is_b_roll: false,
                    b_roll_link: null,
                });
            } else {
                adjustedTimestamps.push({
                    start,
                    end,
                    is_b_roll: true,
                    b_roll_link: bRoll.video_files[0].link,
                });
            }
        } else {
            adjustedTimestamps.push({
                start,
                end,
                is_b_roll: false,
                b_roll_link: null,
            });
        }
    }

    // Combine consecutive non-B-roll segments and adjust B-roll boundaries
    const finalTimestamps: AdjustedTimestamp[] = [];
    for (let i = 0; i < adjustedTimestamps.length; i++) {
        const current = adjustedTimestamps[i];
        const next = adjustedTimestamps[i + 1];

        if (next) {
            const currentBRoll = filteredBRollSegments[i];
            const nextBRoll = filteredBRollSegments[i + 1];

            if (!currentBRoll && !nextBRoll) {
                // Both are non-B-roll, combine them
                finalTimestamps.push({
                    start: current.start,
                    end: next.end,
                    is_b_roll: false,
                    b_roll_link: null,
                });
                i++; // Skip the next iteration
            } else if (!currentBRoll && nextBRoll) {
                // Current is non-B-roll, next is B-roll
                finalTimestamps.push({
                    start: current.start,
                    end: next.start,
                    is_b_roll: false,
                    b_roll_link: null,
                });
            } else if (currentBRoll && !nextBRoll) {
                // Current is B-roll, next is non-B-roll
                finalTimestamps.push(current);
                if (i + 1 < adjustedTimestamps.length - 1) {
                    next.start = current.end; // Adjust start time of next segment
                }
            } else {
                // Both are B-roll
                finalTimestamps.push(current);
            }
        } else {
            // Last segment
            finalTimestamps.push(current);
        }
    }

    // TODO: Change this. Right now it's just for testing
    return {
        originalTimestamps: segmentTimestamps,
        adjustedTimestamps: adjustedTimestamps,
        finalTimestamps: finalTimestamps,
        script_segments: script_segments,
        bRollSegments: filteredBRollSegments,
    };
}

function calculateLipsyncIntervals(
    duration: number,
    brollIntervals: Float32Array[],
): Float32Array[] {
    // Initialize an array to store the lipsync intervals
    const lipsyncIntervals: Float32Array[] = [];

    // Start with 0 as the initial timestamp
    let previousEnd = 0;

    // Iterate through the broll intervals
    for (let i = 0; i < brollIntervals.length; i++) {
        const brollStart = brollIntervals[i][0];
        const brollEnd = brollIntervals[i][1];

        // If there's a gap between previous end and current broll start, add it as a lipsync interval
        if (brollStart > previousEnd) {
            lipsyncIntervals.push(new Float32Array([previousEnd, brollStart]));
        }

        // Update the previous end to the end of this broll interval
        previousEnd = brollEnd;
    }

    // If there's remaining time after the last broll interval, add it as a final lipsync interval
    if (previousEnd < duration) {
        lipsyncIntervals.push(new Float32Array([previousEnd, duration]));
    }

    return lipsyncIntervals;
}
