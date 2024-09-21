import { Database } from "@/lib/types/schema";
import { generateScript } from "../../script/generate/services";

type VoterRecord = Database["public"]["Tables"]["voter_records"]["Row"];

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

    const b_roll_promise = async () => {
        // TODO: Implement b-roll option generation
        // Will return a list of b-roll options if slot is b-roll, otherwise empty item
        const getBRollOptions = async (query: string) => {
            // This function will be implemented later
            // For now, it's a placeholder
            return null;
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
    return {
        wordTimings: segmentTimestamps.map((interval, index) => {
            const [start, end] = interval;
            const startMatch = audio_response.wordTimings.findIndex(
                ([_, s, _e]) => s === start,
            );
            const endMatch = audio_response.wordTimings.findIndex(
                ([_, _s, e]) => e === end,
            );

            console.log(`Segment ${index}:`);
            if (startMatch !== -1) {
                console.log(
                    `  Start match: ${
                        JSON.stringify(audio_response.wordTimings[startMatch])
                    } at index ${startMatch}`,
                );
            }
            if (endMatch !== -1) {
                console.log(
                    `  End match: ${
                        JSON.stringify(audio_response.wordTimings[endMatch])
                    } at index ${endMatch}`,
                );
            }

            return interval;
        }),
        script_segments: script_segments,
    };
}
