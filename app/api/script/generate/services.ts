import { Database } from "@/lib/types/schema";
import { supabase } from "@/lib/supabase/client";
type VoterRecord = Database["public"]["Tables"]["voter_records"]["Row"];
type CityData = Database["public"]["Tables"]["cities"]["Row"];

const generateScript = async (voter: VoterRecord) => {
    // Find city data for the city the voter lives in
    if (!voter.city || !voter.state) {
        throw new Error("Voter city or state is null");
    }
    const { data: cityData, error: cityError } = await supabase
        .from("cities")
        .select("*")
        .eq("town", voter.city)
        .eq("state", voter.state)
        .returns<CityData>()
        .maybeSingle();

    if (cityError) {
        throw new Error("Error getting city data");
    }

    if (!cityData) {
        throw new Error("City data not found");
    }
};
