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
      ad_creations: {
        Row: {
          ad_content: Json
          budget: number
          created_at: string | null
          description: string | null
          duration: number
          end_date: string
          flow: Database["public"]["Enums"]["ad_flow"]
          id: string
          image_urls: string[] | null
          key_components: string[]
          objective: Database["public"]["Enums"]["campaign_objective"]
          platforms: Database["public"]["Enums"]["ad_platform"][]
          political_leaning: Database["public"]["Enums"]["political_leaning"]
          start_date: string
          status: Database["public"]["Enums"]["ad_status"] | null
          target_audience: Json
          title: string
          updated_at: string | null
          version_data: Json | null
        }
        Insert: {
          ad_content: Json
          budget: number
          created_at?: string | null
          description?: string | null
          duration: number
          end_date: string
          flow?: Database["public"]["Enums"]["ad_flow"]
          id?: string
          image_urls?: string[] | null
          key_components: string[]
          objective: Database["public"]["Enums"]["campaign_objective"]
          platforms: Database["public"]["Enums"]["ad_platform"][]
          political_leaning: Database["public"]["Enums"]["political_leaning"]
          start_date: string
          status?: Database["public"]["Enums"]["ad_status"] | null
          target_audience: Json
          title: string
          updated_at?: string | null
          version_data?: Json | null
        }
        Update: {
          ad_content?: Json
          budget?: number
          created_at?: string | null
          description?: string | null
          duration?: number
          end_date?: string
          flow?: Database["public"]["Enums"]["ad_flow"]
          id?: string
          image_urls?: string[] | null
          key_components?: string[]
          objective?: Database["public"]["Enums"]["campaign_objective"]
          platforms?: Database["public"]["Enums"]["ad_platform"][]
          political_leaning?: Database["public"]["Enums"]["political_leaning"]
          start_date?: string
          status?: Database["public"]["Enums"]["ad_status"] | null
          target_audience?: Json
          title?: string
          updated_at?: string | null
          version_data?: Json | null
        }
        Relationships: []
      }
      ad_deployments: {
        Row: {
          adset_budget: number | null
          adset_id: string | null
          adset_name: string | null
          audience: string
          bid_strategy: string
          budget: number
          campaign_info: Json | null
          caption: string
          content_insights: Json | null
          created_at: string | null
          duration: number
          experiment_id: string | null
          id: string
          image_url: string | null
          link: string
          performance_data: Json | null
          placement: string
          platform: string
          status: Database["public"]["Enums"]["deployment_status"]
          type: Database["public"]["Enums"]["deployment_type"]
          updated_at: string | null
          version_id: string
          video_url: string | null
        }
        Insert: {
          adset_budget?: number | null
          adset_id?: string | null
          adset_name?: string | null
          audience: string
          bid_strategy: string
          budget: number
          campaign_info?: Json | null
          caption: string
          content_insights?: Json | null
          created_at?: string | null
          duration: number
          experiment_id?: string | null
          id?: string
          image_url?: string | null
          link: string
          performance_data?: Json | null
          placement: string
          platform: string
          status?: Database["public"]["Enums"]["deployment_status"]
          type?: Database["public"]["Enums"]["deployment_type"]
          updated_at?: string | null
          version_id: string
          video_url?: string | null
        }
        Update: {
          adset_budget?: number | null
          adset_id?: string | null
          adset_name?: string | null
          audience?: string
          bid_strategy?: string
          budget?: number
          campaign_info?: Json | null
          caption?: string
          content_insights?: Json | null
          created_at?: string | null
          duration?: number
          experiment_id?: string | null
          id?: string
          image_url?: string | null
          link?: string
          performance_data?: Json | null
          placement?: string
          platform?: string
          status?: Database["public"]["Enums"]["deployment_status"]
          type?: Database["public"]["Enums"]["deployment_type"]
          updated_at?: string | null
          version_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_tests_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ad_creations"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_taglines: {
        Row: {
          ad_description: string | null
          ad_id: string | null
          created_at: string
          id: string
          image_url: string | null
          platform: Database["public"]["Enums"]["platformType"][] | null
          post_hashtags: string[] | null
          post_text: string | null
          status: Database["public"]["Enums"]["taglines_post_type"]
          tagline: string | null
          title: string | null
        }
        Insert: {
          ad_description?: string | null
          ad_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          platform?: Database["public"]["Enums"]["platformType"][] | null
          post_hashtags?: string[] | null
          post_text?: string | null
          status?: Database["public"]["Enums"]["taglines_post_type"]
          tagline?: string | null
          title?: string | null
        }
        Update: {
          ad_description?: string | null
          ad_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          platform?: Database["public"]["Enums"]["platformType"][] | null
          post_hashtags?: string[] | null
          post_text?: string | null
          status?: Database["public"]["Enums"]["taglines_post_type"]
          tagline?: string | null
          title?: string | null
        }
        Relationships: []
      }
      ai_ads_data: {
        Row: {
          ad_formats: Json | null
          age_targeting: Json | null
          created_at: string | null
          date_range_analysis: Json | null
          gender_targeting: Json | null
          geo_targeting: Json | null
          id: string
          keyword_analysis: Json | null
          political_leanings: Json | null
          recent_ads: Json | null
          tone_analysis: Json | null
          top_advertisers: Json | null
        }
        Insert: {
          ad_formats?: Json | null
          age_targeting?: Json | null
          created_at?: string | null
          date_range_analysis?: Json | null
          gender_targeting?: Json | null
          geo_targeting?: Json | null
          id?: string
          keyword_analysis?: Json | null
          political_leanings?: Json | null
          recent_ads?: Json | null
          tone_analysis?: Json | null
          top_advertisers?: Json | null
        }
        Update: {
          ad_formats?: Json | null
          age_targeting?: Json | null
          created_at?: string | null
          date_range_analysis?: Json | null
          gender_targeting?: Json | null
          geo_targeting?: Json | null
          id?: string
          keyword_analysis?: Json | null
          political_leanings?: Json | null
          recent_ads?: Json | null
          tone_analysis?: Json | null
          top_advertisers?: Json | null
        }
        Relationships: []
      }
      ai_conversations_data: {
        Row: {
          content_themes: Json | null
          created_at: string | null
          hot_issues: Json | null
          id: string
          influential_figures: Json | null
          news_articles: Json | null
          trending_topics: Json | null
        }
        Insert: {
          content_themes?: Json | null
          created_at?: string | null
          hot_issues?: Json | null
          id?: string
          influential_figures?: Json | null
          news_articles?: Json | null
          trending_topics?: Json | null
        }
        Update: {
          content_themes?: Json | null
          created_at?: string | null
          hot_issues?: Json | null
          id?: string
          influential_figures?: Json | null
          news_articles?: Json | null
          trending_topics?: Json | null
        }
        Relationships: []
      }
      ai_query_suggestions: {
        Row: {
          created_at: string
          id: string
          suggestions: Json
        }
        Insert: {
          created_at?: string
          id?: string
          suggestions: Json
        }
        Update: {
          created_at?: string
          id?: string
          suggestions?: Json
        }
        Relationships: []
      }
      ai_suggestions_data: {
        Row: {
          created_at: string | null
          id: string
          suggestions: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          suggestions?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          suggestions?: Json | null
        }
        Relationships: []
      }
      compliance_docs: {
        Row: {
          created_at: string | null
          embeddings: Json | null
          id: string
          text: string | null
          title: string | null
          type: Database["public"]["Enums"]["govtType"] | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          embeddings?: Json | null
          id?: string
          text?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["govtType"] | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          embeddings?: Json | null
          id?: string
          text?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["govtType"] | null
          url?: string | null
        }
        Relationships: []
      }
      frames_records: {
        Row: {
          created_at: string
          embedding: string | null
          frame_number: string | null
          id: string
          storage_path: string | null
          timestamp: string | null
          video_id: string | null
          video_uuid: string | null
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          frame_number?: string | null
          id?: string
          storage_path?: string | null
          timestamp?: string | null
          video_id?: string | null
          video_uuid?: string | null
        }
        Update: {
          created_at?: string
          embedding?: string | null
          frame_number?: string | null
          id?: string
          storage_path?: string | null
          timestamp?: string | null
          video_id?: string | null
          video_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frames_video_uuid_fkey"
            columns: ["video_uuid"]
            isOneToOne: false
            referencedRelation: "youtube"
            referencedColumns: ["id"]
          },
        ]
      }
      grouped_video_embeddings: {
        Row: {
          created_at: string
          duration: string
          embedding: string | null
          id: string
          soundbytes: string[]
          text: string | null
          timestamp: string
          updated_at: string
          video_uuid: string
        }
        Insert: {
          created_at?: string
          duration?: string
          embedding?: string | null
          id?: string
          soundbytes?: string[]
          text?: string | null
          timestamp: string
          updated_at?: string
          video_uuid?: string
        }
        Update: {
          created_at?: string
          duration?: string
          embedding?: string | null
          id?: string
          soundbytes?: string[]
          text?: string | null
          timestamp?: string
          updated_at?: string
          video_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "grouped_video_embeddings_video_uuid_fkey"
            columns: ["video_uuid"]
            isOneToOne: false
            referencedRelation: "youtube"
            referencedColumns: ["id"]
          },
        ]
      }
      int_ads__google_ads_embeddings: {
        Row: {
          advertiser_name_embedding: string | null
          keywords: string[]
          political_leaning: string | null
          summary: string
          summary_embeddings: string | null
          tone: string[] | null
          versioned_ad_id: string
        }
        Insert: {
          advertiser_name_embedding?: string | null
          keywords: string[]
          political_leaning?: string | null
          summary: string
          summary_embeddings?: string | null
          tone?: string[] | null
          versioned_ad_id: string
        }
        Update: {
          advertiser_name_embedding?: string | null
          keywords?: string[]
          political_leaning?: string | null
          summary?: string
          summary_embeddings?: string | null
          tone?: string[] | null
          versioned_ad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_versioned_ad_id"
            columns: ["versioned_ad_id"]
            isOneToOne: true
            referencedRelation: "int_ads__google_ads_versioned"
            referencedColumns: ["id"]
          },
        ]
      }
      int_ads__google_ads_enhanced: {
        Row: {
          advertisement_url: string
          advertiser_name: string | null
          advertiser_name_embedding: string | null
          advertiser_url: string | null
          content: string | null
          days_ran_for: number | null
          first_shown: string | null
          format: string | null
          gender_targeting: Json | null
          geo_targeting: Json | null
          id: string
          keywords: string[] | null
          last_shown: string | null
          max_impressions: number | null
          max_spend: number | null
          min_impressions: number | null
          min_spend: number | null
          political_leaning: string | null
          summary: string | null
          summary_embeddings: string | null
          targeted_ages: string[] | null
          tone: string[] | null
          version: number | null
        }
        Insert: {
          advertisement_url: string
          advertiser_name?: string | null
          advertiser_name_embedding?: string | null
          advertiser_url?: string | null
          content?: string | null
          days_ran_for?: number | null
          first_shown?: string | null
          format?: string | null
          gender_targeting?: Json | null
          geo_targeting?: Json | null
          id: string
          keywords?: string[] | null
          last_shown?: string | null
          max_impressions?: number | null
          max_spend?: number | null
          min_impressions?: number | null
          min_spend?: number | null
          political_leaning?: string | null
          summary?: string | null
          summary_embeddings?: string | null
          targeted_ages?: string[] | null
          tone?: string[] | null
          version?: number | null
        }
        Update: {
          advertisement_url?: string
          advertiser_name?: string | null
          advertiser_name_embedding?: string | null
          advertiser_url?: string | null
          content?: string | null
          days_ran_for?: number | null
          first_shown?: string | null
          format?: string | null
          gender_targeting?: Json | null
          geo_targeting?: Json | null
          id?: string
          keywords?: string[] | null
          last_shown?: string | null
          max_impressions?: number | null
          max_spend?: number | null
          min_impressions?: number | null
          min_spend?: number | null
          political_leaning?: string | null
          summary?: string | null
          summary_embeddings?: string | null
          targeted_ages?: string[] | null
          tone?: string[] | null
          version?: number | null
        }
        Relationships: []
      }
      int_ads__google_ads_versioned: {
        Row: {
          advertisement_url: string
          advertiser_name: string | null
          advertiser_url: string | null
          content: string | null
          days_ran_for: number | null
          first_shown: string | null
          format: string | null
          gender_targeting: Json | null
          geo_targeting: Json | null
          id: string
          last_shown: string | null
          targeted_ages: string[] | null
          version: number | null
        }
        Insert: {
          advertisement_url: string
          advertiser_name?: string | null
          advertiser_url?: string | null
          content?: string | null
          days_ran_for?: number | null
          first_shown?: string | null
          format?: string | null
          gender_targeting?: Json | null
          geo_targeting?: Json | null
          id: string
          last_shown?: string | null
          targeted_ages?: string[] | null
          version?: number | null
        }
        Update: {
          advertisement_url?: string
          advertiser_name?: string | null
          advertiser_url?: string | null
          content?: string | null
          days_ran_for?: number | null
          first_shown?: string | null
          format?: string | null
          gender_targeting?: Json | null
          geo_targeting?: Json | null
          id?: string
          last_shown?: string | null
          targeted_ages?: string[] | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_advertisement_url"
            columns: ["advertisement_url"]
            isOneToOne: false
            referencedRelation: "stg_ads__google_ads"
            referencedColumns: ["advertisement_url"]
          },
        ]
      }
      int_ads__google_advertisers: {
        Row: {
          advertiser_id: string
          advertiser_name: string
          advertiser_url: string
        }
        Insert: {
          advertiser_id: string
          advertiser_name: string
          advertiser_url: string
        }
        Update: {
          advertiser_id?: string
          advertiser_name?: string
          advertiser_url?: string
        }
        Relationships: []
      }
      int_news: {
        Row: {
          ai_summary: string
          authors: string[]
          created_at: string
          id: string
          issues: string[]
          political_keywords: string[]
          political_leaning: string
          political_tones: string[]
          publish_date: string
          source_url: string
          summary_embedding: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          ai_summary: string
          authors: string[]
          created_at?: string
          id?: string
          issues: string[]
          political_keywords: string[]
          political_leaning: string
          political_tones: string[]
          publish_date: string
          source_url: string
          summary_embedding: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          ai_summary?: string
          authors?: string[]
          created_at?: string
          id?: string
          issues?: string[]
          political_keywords?: string[]
          political_leaning?: string
          political_tones?: string[]
          publish_date?: string
          source_url?: string
          summary_embedding?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      int_threads: {
        Row: {
          ai_summary: string | null
          created_at: string | null
          hashtags: string[] | null
          id: string
          issues: string[] | null
          likes: number | null
          political_keywords: string[] | null
          political_leaning: string | null
          political_tones: string[] | null
          raw_text_embedding: string | null
          replies: number | null
          reposts: number | null
          row_created_at: string | null
          row_updated_at: string | null
          summary_embedding: string | null
          text: string
          thread_id: string
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          issues?: string[] | null
          likes?: number | null
          political_keywords?: string[] | null
          political_leaning?: string | null
          political_tones?: string[] | null
          raw_text_embedding?: string | null
          replies?: number | null
          reposts?: number | null
          row_created_at?: string | null
          row_updated_at?: string | null
          summary_embedding?: string | null
          text: string
          thread_id: string
        }
        Update: {
          ai_summary?: string | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          issues?: string[] | null
          likes?: number | null
          political_keywords?: string[] | null
          political_leaning?: string | null
          political_tones?: string[] | null
          raw_text_embedding?: string | null
          replies?: number | null
          reposts?: number | null
          row_created_at?: string | null
          row_updated_at?: string | null
          summary_embedding?: string | null
          text?: string
          thread_id?: string
        }
        Relationships: []
      }
      meta_ads: {
        Row: {
          ad_id: string
          ad_text: string | null
          ad_url: string
          advertiser: string | null
          created_at: string | null
          id: number
          impressions: string | null
          spend: string | null
          updated_at: string | null
        }
        Insert: {
          ad_id: string
          ad_text?: string | null
          ad_url: string
          advertiser?: string | null
          created_at?: string | null
          id?: number
          impressions?: string | null
          spend?: string | null
          updated_at?: string | null
        }
        Update: {
          ad_id?: string
          ad_text?: string | null
          ad_url?: string
          advertiser?: string | null
          created_at?: string | null
          id?: number
          impressions?: string | null
          spend?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      meta_ads_demographics: {
        Row: {
          ad_id: string
          age: string | null
          created_at: string | null
          gender: string | null
          id: number
          percentage: string | null
          updated_at: string | null
        }
        Insert: {
          ad_id: string
          age?: string | null
          created_at?: string | null
          gender?: string | null
          id?: number
          percentage?: string | null
          updated_at?: string | null
        }
        Update: {
          ad_id?: string
          age?: string | null
          created_at?: string | null
          gender?: string | null
          id?: number
          percentage?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_demographics_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "meta_ads"
            referencedColumns: ["ad_id"]
          },
        ]
      }
      meta_ads_regions: {
        Row: {
          ad_id: string
          created_at: string | null
          id: number
          percentage: string | null
          region: string | null
          updated_at: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string | null
          id?: number
          percentage?: string | null
          region?: string | null
          updated_at?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string | null
          id?: number
          percentage?: string | null
          region?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_regions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "meta_ads"
            referencedColumns: ["ad_id"]
          },
        ]
      }
      outline: {
        Row: {
          compliance_doc: string | null
          compliance_report: Json | null
          created_at: string
          description: string | null
          full_script: Json | null
          id: string
          script_generation_progress: number | null
          status: Database["public"]["Enums"]["outlineStatus"] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          compliance_doc?: string | null
          compliance_report?: Json | null
          created_at?: string
          description?: string | null
          full_script?: Json | null
          id?: string
          script_generation_progress?: number | null
          status?: Database["public"]["Enums"]["outlineStatus"] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          compliance_doc?: string | null
          compliance_report?: Json | null
          created_at?: string
          description?: string | null
          full_script?: Json | null
          id?: string
          script_generation_progress?: number | null
          status?: Database["public"]["Enums"]["outlineStatus"] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outline_compliance_doc_fkey"
            columns: ["compliance_doc"]
            isOneToOne: false
            referencedRelation: "compliance_docs"
            referencedColumns: ["id"]
          },
        ]
      }
      outline_elements: {
        Row: {
          created_at: string
          description: string | null
          id: string
          instructions: string | null
          outline_id: string | null
          position_end_time: string | null
          position_start_time: string | null
          script: Json | null
          sources: string | null
          type: Database["public"]["Enums"]["outlineElementType"] | null
          updated_at: string | null
          video_embeddings: string[] | null
          video_end_time: string | null
          video_id: string | null
          video_start_time: string | null
          video_uuid: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          outline_id?: string | null
          position_end_time?: string | null
          position_start_time?: string | null
          script?: Json | null
          sources?: string | null
          type?: Database["public"]["Enums"]["outlineElementType"] | null
          updated_at?: string | null
          video_embeddings?: string[] | null
          video_end_time?: string | null
          video_id?: string | null
          video_start_time?: string | null
          video_uuid?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          outline_id?: string | null
          position_end_time?: string | null
          position_start_time?: string | null
          script?: Json | null
          sources?: string | null
          type?: Database["public"]["Enums"]["outlineElementType"] | null
          updated_at?: string | null
          video_embeddings?: string[] | null
          video_end_time?: string | null
          video_id?: string | null
          video_start_time?: string | null
          video_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outline_elements_outline_id_fkey"
            columns: ["outline_id"]
            isOneToOne: false
            referencedRelation: "outline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outline_elements_video_uuid_fkey"
            columns: ["video_uuid"]
            isOneToOne: false
            referencedRelation: "youtube"
            referencedColumns: ["id"]
          },
        ]
      }
      stg_ads__google_ads: {
        Row: {
          advertisement_url: string
          advertiser_name: string | null
          advertiser_url: string | null
          age_targeting: Json | null
          created_at: string
          gender_targeting: Json | null
          geo_targeting: Json | null
          impressions: string | null
          media_links: string[] | null
          properties: Json | null
          spend: string | null
          updated_at: string
        }
        Insert: {
          advertisement_url: string
          advertiser_name?: string | null
          advertiser_url?: string | null
          age_targeting?: Json | null
          created_at?: string
          gender_targeting?: Json | null
          geo_targeting?: Json | null
          impressions?: string | null
          media_links?: string[] | null
          properties?: Json | null
          spend?: string | null
          updated_at?: string
        }
        Update: {
          advertisement_url?: string
          advertiser_name?: string | null
          advertiser_url?: string | null
          age_targeting?: Json | null
          created_at?: string
          gender_targeting?: Json | null
          geo_targeting?: Json | null
          impressions?: string | null
          media_links?: string[] | null
          properties?: Json | null
          spend?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stg_ads__google_ads_links: {
        Row: {
          advertisement_url: string
          created_at: string
          updated_at: string
        }
        Insert: {
          advertisement_url: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          advertisement_url?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      stg_news: {
        Row: {
          article_html: string | null
          authors: string[] | null
          created_at: string
          html: string | null
          id: string
          keywords: string[] | null
          meta_keywords: string[] | null
          movies: string[] | null
          publish_date: string | null
          source_url: string | null
          summary: string | null
          tags: string[] | null
          text: string | null
          title: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          article_html?: string | null
          authors?: string[] | null
          created_at?: string
          html?: string | null
          id?: string
          keywords?: string[] | null
          meta_keywords?: string[] | null
          movies?: string[] | null
          publish_date?: string | null
          source_url?: string | null
          summary?: string | null
          tags?: string[] | null
          text?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          article_html?: string | null
          authors?: string[] | null
          created_at?: string
          html?: string | null
          id?: string
          keywords?: string[] | null
          meta_keywords?: string[] | null
          movies?: string[] | null
          publish_date?: string | null
          source_url?: string | null
          summary?: string | null
          tags?: string[] | null
          text?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      threads: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          embedding: string | null
          hashtag: string | null
          id: string
          image_urls: string[] | null
          is_verified: boolean | null
          likes: number | null
          replies: number | null
          reposts: number | null
          text: string | null
          thread_id: string
          url: string | null
          user_id: string | null
          user_pk: string | null
          user_profile_pic_url: string | null
          username: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          embedding?: string | null
          hashtag?: string | null
          id?: string
          image_urls?: string[] | null
          is_verified?: boolean | null
          likes?: number | null
          replies?: number | null
          reposts?: number | null
          text?: string | null
          thread_id: string
          url?: string | null
          user_id?: string | null
          user_pk?: string | null
          user_profile_pic_url?: string | null
          username?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          embedding?: string | null
          hashtag?: string | null
          id?: string
          image_urls?: string[] | null
          is_verified?: boolean | null
          likes?: number | null
          replies?: number | null
          reposts?: number | null
          text?: string | null
          thread_id?: string
          url?: string | null
          user_id?: string | null
          user_pk?: string | null
          user_profile_pic_url?: string | null
          username?: string | null
        }
        Relationships: []
      }
      tiktok_comments: {
        Row: {
          author: string
          comment_id: string
          created_at: string | null
          embedding: string | null
          id: string
          likes: number | null
          text: string | null
          video_id: string
        }
        Insert: {
          author: string
          comment_id: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          likes?: number | null
          text?: string | null
          video_id: string
        }
        Update: {
          author?: string
          comment_id?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          likes?: number | null
          text?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "tiktok_videos"
            referencedColumns: ["video_id"]
          },
        ]
      }
      tiktok_embeddings: {
        Row: {
          author: string | null
          caption: string | null
          caption_embedding: string | null
          comments: Json | null
          created_at: string | null
          hashtags: string[] | null
          id: string
          keywords: string[] | null
          political_leaning: string | null
          summary: string | null
          summary_embedding: string | null
          tone: string[] | null
          topic: string | null
          video_id: string | null
          views: number | null
        }
        Insert: {
          author?: string | null
          caption?: string | null
          caption_embedding?: string | null
          comments?: Json | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          keywords?: string[] | null
          political_leaning?: string | null
          summary?: string | null
          summary_embedding?: string | null
          tone?: string[] | null
          topic?: string | null
          video_id?: string | null
          views?: number | null
        }
        Update: {
          author?: string | null
          caption?: string | null
          caption_embedding?: string | null
          comments?: Json | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          keywords?: string[] | null
          political_leaning?: string | null
          summary?: string | null
          summary_embedding?: string | null
          tone?: string[] | null
          topic?: string | null
          video_id?: string | null
          views?: number | null
        }
        Relationships: []
      }
      tiktok_videos: {
        Row: {
          author: string
          comments_count: number | null
          created_at: string | null
          embedding: string | null
          hashtag: string | null
          id: string
          is_trending: boolean | null
          likes: number | null
          shares: number | null
          text: string | null
          video_id: string
          views: number | null
        }
        Insert: {
          author: string
          comments_count?: number | null
          created_at?: string | null
          embedding?: string | null
          hashtag?: string | null
          id?: string
          is_trending?: boolean | null
          likes?: number | null
          shares?: number | null
          text?: string | null
          video_id: string
          views?: number | null
        }
        Update: {
          author?: string
          comments_count?: number | null
          created_at?: string | null
          embedding?: string | null
          hashtag?: string | null
          id?: string
          is_trending?: boolean | null
          likes?: number | null
          shares?: number | null
          text?: string | null
          video_id?: string
          views?: number | null
        }
        Relationships: []
      }
      todos: {
        Row: {
          created_at: string
          id: string
          status: Database["public"]["Enums"]["todoStatusType"]
          text: string
          user: Database["public"]["Enums"]["simpleUserType"]
        }
        Insert: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["todoStatusType"]
          text: string
          user: Database["public"]["Enums"]["simpleUserType"]
        }
        Update: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["todoStatusType"]
          text?: string
          user?: Database["public"]["Enums"]["simpleUserType"]
        }
        Relationships: []
      }
      video_embeddings: {
        Row: {
          duration: string
          embedding: string | null
          id: string
          text: string | null
          timestamp: string | null
          video_id: string
          video_uuid: string | null
        }
        Insert: {
          duration?: string
          embedding?: string | null
          id?: string
          text?: string | null
          timestamp?: string | null
          video_id: string
          video_uuid?: string | null
        }
        Update: {
          duration?: string
          embedding?: string | null
          id?: string
          text?: string | null
          timestamp?: string | null
          video_id?: string
          video_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_embeddings_video_uuid_fkey"
            columns: ["video_uuid"]
            isOneToOne: false
            referencedRelation: "youtube"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube: {
        Row: {
          created_at: string
          description: string | null
          id: string
          published_at: string | null
          title: string | null
          transcript: Json | null
          video_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          published_at?: string | null
          title?: string | null
          transcript?: Json | null
          video_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          published_at?: string | null
          title?: string | null
          transcript?: Json | null
          video_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize:
        | {
            Args: {
              "": string
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      fetch_random_clips: {
        Args: Record<PropertyKey, never>
        Returns: {
          video_uuid: string
          video_id: string
          title: string
          description: string
          start_timestamp: string
          end_timestamp: string
          text: string
        }[]
      }
      fetch_random_clips_grouped_ve: {
        Args: Record<PropertyKey, never>
        Returns: {
          video_uuid: string
          video_id: string
          title: string
          description: string
          start_timestamp: string
          end_timestamp: string
          text: string
        }[]
      }
      fetch_youtube_videos_with_embeddings_records: {
        Args: Record<PropertyKey, never>
        Returns: {
          video_id: string
        }[]
      }
      get_grouped_video_embeddings: {
        Args: Record<PropertyKey, never>
        Returns: {
          video_uuid: string
          soundbytes: Json[]
        }[]
      }
      get_latest_unique_youtube_videos: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          description: string | null
          id: string
          published_at: string | null
          title: string | null
          transcript: Json | null
          video_id: string | null
        }[]
      }
      get_tiktok_video_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          video_id: string
          author: string
          created_at: string
          caption: string
          hashtags: string[]
          topic: string
          views: number
          comments: Json
        }[]
      }
      halfvec_avg: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      halfvec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      hnsw_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnswhandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflathandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      json_matches_schema: {
        Args: {
          schema: Json
          instance: Json
        }
        Returns: boolean
      }
      jsonb_matches_schema: {
        Args: {
          schema: Json
          instance: Json
        }
        Returns: boolean
      }
      jsonschema_is_valid: {
        Args: {
          schema: Json
        }
        Returns: boolean
      }
      jsonschema_validation_errors: {
        Args: {
          schema: Json
          instance: Json
        }
        Returns: string[]
      }
      l2_norm:
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      l2_normalize:
        | {
            Args: {
              "": string
            }
            Returns: string
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      match_documents: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
          video_uuid_specific: string
        }
        Returns: {
          video_uuid: string
          timestamp: string
          text: string
          similarity: number
        }[]
      }
      match_documents_grouped: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          video_uuid: string
          video_id: string
          title: string
          description: string
          published_at: string
          start_timestamp: string
          end_timestamp: string
          text: string
          similarity: number
        }[]
      }
      search_ads_advanced:
        | {
            Args: {
              _keywords: string[]
              _embedding: string
              _leaning: string[]
              _tones: string[]
              _advertiser_name_embedding: string
              _alpha?: number
              _beta?: number
              _gamma?: number
              _delta?: number
              _epsilon?: number
              _zeta?: number
            }
            Returns: {
              id: string
              advertisement_url: string
              advertiser_name: string
              advertiser_url: string
              first_shown: string
              last_shown: string
              days_ran_for: number
              format: string
              content: string
              version: number
              targeted_ages: string[]
              gender_targeting: Json
              geo_targeting: Json
              keywords: string[]
              summary: string
              political_leaning: string
              tone: string[]
              keyword_score: number
              leaning_score: number
              tones_score: number
              embedding_score: number
              date_score: number
              advertiser_name_score: number
              final_score: number
            }[]
          }
        | {
            Args: {
              _keywords: string[]
              _embedding: string
              _leaning: string[]
              _tones: string[]
              _advertiser_name_embedding: string
              _min_spend?: number
              _max_spend?: number
              _min_impressions?: number
              _max_impressions?: number
              _keyword_weight?: number
              _leaning_weight?: number
              _tones_weight?: number
              _embedding_weight?: number
              _date_weight?: number
              _advertiser_name_weight?: number
              _spend_weight?: number
              _impressions_weight?: number
            }
            Returns: {
              id: string
              advertisement_url: string
              advertiser_name: string
              advertiser_url: string
              first_shown: string
              last_shown: string
              days_ran_for: number
              format: string
              content: string
              version: number
              targeted_ages: string[]
              gender_targeting: Json
              geo_targeting: Json
              keywords: string[]
              summary: string
              political_leaning: string
              tone: string[]
              keyword_score: number
              leaning_score: number
              tones_score: number
              embedding_score: number
              date_score: number
              advertiser_name_score: number
              spend_score: number
              impressions_score: number
              final_score: number
            }[]
          }
        | {
            Args: {
              _keywords: string[]
              _embedding: string
              _leaning: string[]
              _tones: string[]
              _advertiser_name_embedding: string
              _weight_keyword?: number
              _weight_leaning?: number
              _weight_tones?: number
              _weight_embedding?: number
              _weight_recency?: number
              _weight_advertiser_name?: number
              _weight_spend?: number
              _weight_impressions?: number
            }
            Returns: {
              id: string
              advertisement_url: string
              advertiser_name: string
              advertiser_url: string
              first_shown: string
              last_shown: string
              days_ran_for: number
              format: string
              content: string
              version: number
              targeted_ages: string[]
              gender_targeting: Json
              geo_targeting: Json
              keywords: string[]
              summary: string
              political_leaning: string
              tone: string[]
              min_spend: number
              max_spend: number
              min_impressions: number
              max_impressions: number
              keyword_score: number
              leaning_score: number
              tones_score: number
              embedding_score: number
              date_score: number
              advertiser_name_score: number
              spend_score: number
              impressions_score: number
              final_score: number
            }[]
          }
        | {
            Args: {
              _keywords: string[]
              _embedding: string
              _leaning: string[]
              _tones: string[]
              _alpha?: number
              _beta?: number
              _gamma?: number
              _delta?: number
              _epsilon?: number
            }
            Returns: {
              id: string
              advertisement_url: string
              advertiser_name: string
              advertiser_url: string
              first_shown: string
              last_shown: string
              days_ran_for: number
              format: string
              content: string
              version: number
              targeted_ages: string[]
              gender_targeting: Json
              geo_targeting: Json
              keywords: string[]
              summary: string
              political_leaning: string
              tone: string[]
              keyword_score: number
              leaning_score: number
              tones_score: number
              embedding_score: number
              date_score: number
              final_score: number
            }[]
          }
      search_news_advanced: {
        Args: {
          _keywords: string[]
          _embedding: string
          _leaning: string[]
          _tones: string[]
          _alpha?: number
          _beta?: number
          _gamma?: number
          _delta?: number
          _epsilon?: number
        }
        Returns: {
          id: string
          source_url: string
          url: string
          title: string
          authors: string[]
          publish_date: string
          ai_summary: string
          political_keywords: string[]
          political_leaning: string
          political_tones: string[]
          issues: string[]
          keyword_score: number
          leaning_score: number
          tones_score: number
          embedding_score: number
          date_score: number
          final_score: number
        }[]
      }
      search_tiktok_advanced: {
        Args: {
          _keywords: string[]
          _embedding: string
          _leaning: string[]
          _tones: string[]
          _min_views?: number
          _max_views?: number
          _keyword_weight?: number
          _leaning_weight?: number
          _tones_weight?: number
          _embedding_weight?: number
          _date_weight?: number
          _views_weight?: number
        }
        Returns: {
          id: string
          video_id: string
          author: string
          caption: string
          hashtags: string[]
          topic: string
          views: number
          created_at: string
          summary: string
          keywords: string[]
          political_leaning: string
          tone: string[]
          keyword_score: number
          leaning_score: number
          tones_score: number
          embedding_score: number
          date_score: number
          views_score: number
          final_score: number
        }[]
      }
      sparsevec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      sparsevec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      vector_avg: {
        Args: {
          "": number[]
        }
        Returns: string
      }
      vector_dims:
        | {
            Args: {
              "": string
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      vector_norm: {
        Args: {
          "": string
        }
        Returns: number
      }
      vector_out: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      vector_send: {
        Args: {
          "": string
        }
        Returns: string
      }
      vector_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
    }
    Enums: {
      ad_flow: "Ideation" | "Generation" | "Testing" | "Deployment"
      ad_platform:
        | "Facebook"
        | "Instagram Post"
        | "Twitter"
        | "LinkedIn"
        | "TikTok"
        | "YouTube"
        | "Instagram Reel"
        | "Instagram Story"
        | "Threads"
      ad_status: "Draft" | "In Review" | "Configured" | "Generated"
      campaign_objective: "awareness" | "consideration" | "conversion"
      deployment_status:
        | "Created"
        | "Deployed"
        | "Running"
        | "Paused"
        | "Complete"
      deployment_type: "Test" | "Standard"
      govtType: "FEDERAL" | "STATE" | "LOCAL"
      outlineElementType: "VIDEO" | "TRANSITION"
      outlineStatus:
        | "INITIALIZED"
        | "EDITING"
        | "GENERATING"
        | "SCRIPT_FINALIZED"
        | "COMPLIANCE_CHECK"
        | "PERSONALIZATION"
      platformType: "INSTAGRAM" | "SNAPCHAT" | "FACEBOOK" | "TIKTOK"
      political_leaning:
        | "left"
        | "center-left"
        | "center"
        | "center-right"
        | "right"
      simpleUserType: "PRANAV" | "DINESH"
      taglines_post_type: "Draft" | "Live" | "Archive"
      todoStatusType: "TODO" | "IN_PROGRESS" | "DONE"
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
