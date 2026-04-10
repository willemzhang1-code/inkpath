import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CefrLevel } from "@/lib/supabase/types";

interface SaveVocabBody {
  word: string;
  definition: string;
  example?: string;
  cefr_level?: CefrLevel | string;
  category?: string;
  entry_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SaveVocabBody;
    const { word, definition, example, cefr_level, category, entry_id } = body;

    if (!word || !definition) {
      return NextResponse.json({ error: "Word and definition are required." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { data: item, error } = await supabase
      .from("vocabulary")
      .insert({
        user_id: user.id,
        entry_id: entry_id ?? null,
        word: word.toLowerCase().trim(),
        definition,
        example: example ?? null,
        cefr_level: cefr_level ?? null,
        category: category ?? null,
      })
      .select()
      .single();

    if (error) {
      // Ignore unique-violation duplicates
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      console.error("Insert vocab error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface UpdateVocabBody {
  id: string;
  mastery_status?: "new" | "learning" | "mastered";
  review_count?: number;
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateVocabBody;
    const { id, mastery_status, review_count } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const update: Record<string, unknown> = {};
    if (mastery_status) update.mastery_status = mastery_status;
    if (typeof review_count === "number") update.review_count = review_count;
    update.last_reviewed_at = new Date().toISOString();

    const { error } = await supabase
      .from("vocabulary")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { error } = await supabase
      .from("vocabulary")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
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

    const { data: items, error } = await supabase
      .from("vocabulary")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
