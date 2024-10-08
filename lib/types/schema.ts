export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      campaign_firecrawl_descriptions: {
        Row: {
          markdown: string
          url: string
        }
        Insert: {
          markdown: string
          url: string
        }
        Update: {
          markdown?: string
          url?: string
        }
        Relationships: []
      }
      campaign_policies: {
        Row: {
          campaign_subtopic: string
          campaign_topic: string
          detailed_campaign_policy: string
          id: string
        }
        Insert: {
          campaign_subtopic: string
          campaign_topic: string
          detailed_campaign_policy: string
          id?: string
        }
        Update: {
          campaign_subtopic?: string
          campaign_topic?: string
          detailed_campaign_policy?: string
          id?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          average_income: string | null
          birth_rates: string | null
          causing_issues: string[] | null
          county_name: string | null
          created_at: string | null
          economic_growth: string | null
          general_vote_history: string | null
          id: string
          key_issues: string[] | null
          local_government_actions: string[] | null
          mayor: string | null
          party_leanings: string | null
          relevant_companies: string[] | null
          relevant_figures: string[] | null
          significant_political_events: string[] | null
          state: string
          state_governor: string | null
          things_people_like: string[] | null
          topics: Database["public"]["Enums"]["topic_enum"][] | null
          town: string | null
        }
        Insert: {
          average_income?: string | null
          birth_rates?: string | null
          causing_issues?: string[] | null
          county_name?: string | null
          created_at?: string | null
          economic_growth?: string | null
          general_vote_history?: string | null
          id?: string
          key_issues?: string[] | null
          local_government_actions?: string[] | null
          mayor?: string | null
          party_leanings?: string | null
          relevant_companies?: string[] | null
          relevant_figures?: string[] | null
          significant_political_events?: string[] | null
          state: string
          state_governor?: string | null
          things_people_like?: string[] | null
          topics?: Database["public"]["Enums"]["topic_enum"][] | null
          town?: string | null
        }
        Update: {
          average_income?: string | null
          birth_rates?: string | null
          causing_issues?: string[] | null
          county_name?: string | null
          created_at?: string | null
          economic_growth?: string | null
          general_vote_history?: string | null
          id?: string
          key_issues?: string[] | null
          local_government_actions?: string[] | null
          mayor?: string | null
          party_leanings?: string | null
          relevant_companies?: string[] | null
          relevant_figures?: string[] | null
          significant_political_events?: string[] | null
          state?: string
          state_governor?: string | null
          things_people_like?: string[] | null
          topics?: Database["public"]["Enums"]["topic_enum"][] | null
          town?: string | null
        }
        Relationships: []
      }
      clip_lengths: {
        Row: {
          clip_name: string
          length: number
        }
        Insert: {
          clip_name: string
          length: number
        }
        Update: {
          clip_name?: string
          length?: number
        }
        Relationships: []
      }
      video_map: {
        Row: {
          city_id: string | null
          created_at: string
          id: string
          script: Json | null
          video_url: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          id?: string
          script?: Json | null
          video_url: string
        }
        Update: {
          city_id?: string | null
          created_at?: string
          id?: string
          script?: Json | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_map_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      voter_records: {
        Row: {
          age: number | null
          campaigns_donated_to: string[] | null
          city: string | null
          first_name: string
          id: string
          last_name: string
          nonprofits_donated_to: string[] | null
          party_affiliation: string | null
          state: string | null
        }
        Insert: {
          age?: number | null
          campaigns_donated_to?: string[] | null
          city?: string | null
          first_name: string
          id?: string
          last_name: string
          nonprofits_donated_to?: string[] | null
          party_affiliation?: string | null
          state?: string | null
        }
        Update: {
          age?: number | null
          campaigns_donated_to?: string[] | null
          city?: string | null
          first_name?: string
          id?: string
          last_name?: string
          nonprofits_donated_to?: string[] | null
          party_affiliation?: string | null
          state?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_unique_voter_records: {
        Args: Record<PropertyKey, never>
        Returns: {
          age: number | null
          campaigns_donated_to: string[] | null
          city: string | null
          first_name: string
          id: string
          last_name: string
          nonprofits_donated_to: string[] | null
          party_affiliation: string | null
          state: string | null
        }[]
      }
    }
    Enums: {
      topic_enum:
        | "Immigration"
        | "Gun Rights"
        | "Healthcare"
        | "Climate Change"
        | "Economy"
        | "Education"
        | "National Security"
        | "Tax Policy"
        | "Social Security"
        | "Abortion"
        | "Civil Rights"
        | "Criminal Justice Reform"
        | "Foreign Policy"
        | "Voting Rights"
        | "Labor Rights"
        | "LGBTQ+ Rights"
        | "Drug Policy"
        | "Infrastructure"
        | "Trade Policy"
        | "Government Spending"
        | "Other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
