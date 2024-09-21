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
          things_people_like: string[] | null
          town: string
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
          things_people_like?: string[] | null
          town: string
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
          things_people_like?: string[] | null
          town?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
