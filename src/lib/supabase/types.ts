// Database types — keep in sync with supabase/schema.sql

export type UserTier = "free" | "plus" | "max";
export type WritingMode = "free" | "task1" | "task2" | "letter" | "guided";
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type MasteryStatus = "new" | "learning" | "mastered";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  preferred_lang: string;
  tier: UserTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackData {
  assessment: {
    bandScore: number;
    taskAchievement: number;
    coherence: number;
    lexical: number;
    grammar: number;
    level: string;
    summary: string;
  };
  corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
    category: "grammar" | "vocabulary" | "coherence" | "style";
  }>;
  rewrite: {
    text: string;
    improvements: string[];
  };
  vocabulary: Array<{
    word: string;
    definition: string;
    example: string;
    cefrLevel: CefrLevel;
    category: string;
  }>;
  reflectionPrompt?: string;
}

export interface Entry {
  id: string;
  user_id: string;
  mode: WritingMode;
  title: string | null;
  content: string;
  word_count: number;
  feedback: FeedbackData | null;
  band_score: number | null;
  primary_emotion: string | null;
  emotion_intensity: number | null;
  themes: string[] | null;
  reflection_prompt: string | null;
  created_at: string;
  updated_at: string;
}

export interface VocabularyItem {
  id: string;
  user_id: string;
  entry_id: string | null;
  word: string;
  definition: string;
  example: string | null;
  cefr_level: CefrLevel | null;
  category: string | null;
  mastery_status: MasteryStatus;
  review_count: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  created_at: string;
}
