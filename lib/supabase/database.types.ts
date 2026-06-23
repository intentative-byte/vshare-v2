export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          headline: string | null;
          avatar_url: string | null;
          interests: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          headline?: string | null;
          avatar_url?: string | null;
          interests?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          full_name?: string | null;
          headline?: string | null;
          avatar_url?: string | null;
          interests?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          summary: string;
          url: string | null;
          content_type: "article" | "video" | "course" | "podcast" | "thread";
          topics: string[];
          difficulty: "beginner" | "intermediate" | "advanced";
          estimated_minutes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          summary: string;
          url?: string | null;
          content_type?: "article" | "video" | "course" | "podcast" | "thread";
          topics?: string[];
          difficulty?: "beginner" | "intermediate" | "advanced";
          estimated_minutes?: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          summary?: string;
          url?: string | null;
          content_type?: "article" | "video" | "course" | "podcast" | "thread";
          topics?: string[];
          difficulty?: "beginner" | "intermediate" | "advanced";
          estimated_minutes?: number;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      preferences: {
        Row: {
          id: string;
          user_id: string;
          topics: string[];
          goals: string[];
          daily_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topics?: string[];
          goals?: string[];
          daily_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          topics?: string[];
          goals?: string[];
          daily_minutes?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_posts: {
        Row: {
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
