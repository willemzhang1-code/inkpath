import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { FeedbackData, WritingMode } from "@/lib/supabase/types";

interface CreateEntryBody {
  text: string;
  mode: WritingMode;
  feedback: FeedbackData;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateEntryBody;
    const { text, mode, feedback } = body;

    if (!text || !mode || !feedback) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    const { data: entry, error } = await supabase
      .from("entries")
      .insert({
        user_id: user.id,
        mode,
        content: text,
        word_count: wordCount,
        feedback,
        band_score: feedback.assessment.bandScore,
        reflection_prompt: feedback.reflectionPrompt ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert entry error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log usage for free-tier weekly limit
    await supabase.from("usage_log").insert({ user_id: user.id, action: "entry_created" });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Entries API error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { data: entries, error } = await supabase
      .from("entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
