import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getQuotaStatus, TIER_MONTHLY_QUOTA } from "@/lib/quota";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface FeedbackRequest {
  text: string;
  mode: string;
  lang: string;
}

interface Assessment {
  bandScore: number;
  taskAchievement: number;
  coherence: number;
  lexical: number;
  grammar: number;
  level: string;
  summary: string;
}

interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  category: "grammar" | "vocabulary" | "coherence" | "style";
}

interface Rewrite {
  text: string;
  improvements: string[];
}

interface VocabItem {
  word: string;
  definition: string;
  example: string;
  cefrLevel: "B1" | "B2" | "C1" | "C2";
  category: "academic" | "descriptive" | "idiomatic" | "literary" | "conversational";
}

interface FeedbackResponse {
  assessment: Assessment;
  corrections: Correction[];
  rewrite: Rewrite;
  vocabulary: VocabItem[];
  reflectionPrompt: string;
}

/* -------------------------------------------------------------------------- */
/*  System Prompt                                                              */
/* -------------------------------------------------------------------------- */

function buildSystemPrompt(mode: string, lang: string): string {
  const modeDescriptions: Record<string, string> = {
    free: "a free-form writing piece (diary entry, personal reflection, or creative writing)",
    task1: "an IELTS Academic Writing Task 1 response (data description, process, map, or diagram)",
    task2: "an IELTS Academic Writing Task 2 essay (opinion, discussion, problem-solution, or advantages-disadvantages)",
    letter: "a formal or informal letter/email",
    guided: "a guided writing prompt response",
  };

  const modeContext = modeDescriptions[mode] || modeDescriptions.free;

  return `You are an experienced IELTS examiner and English language coach with 15+ years of experience assessing and teaching academic English. You also have training in journaling therapy and personal development.

Your task is to provide detailed, constructive feedback on ${modeContext} written by a student whose primary language is ${lang}.

## Scoring Guidelines

Use the official IELTS Band Descriptors to evaluate the writing across four criteria:

1. **Task Achievement / Task Response** (for Task 1 / Task 2 respectively):
   - Band 9: Fully satisfies all requirements; well-developed position with relevant, extended ideas
   - Band 7: Addresses all parts of the task; clear position with extended and supported ideas
   - Band 5: Addresses the task only partially; limited development of ideas
   - For free writing / diary: Evaluate clarity of expression, depth of reflection, and communicative effectiveness

2. **Coherence and Cohesion**:
   - Evaluate paragraphing, logical sequencing, use of cohesive devices
   - Note over-reliance on connectors or under-use of referencing

3. **Lexical Resource**:
   - Range and accuracy of vocabulary, use of less common items, awareness of collocations
   - Note any word choice errors, spelling issues, or awkward phrasing

4. **Grammatical Range and Accuracy**:
   - Variety of sentence structures, accuracy, frequency of errors
   - Note tense consistency, article usage, subject-verb agreement, complex structures

Score each criterion independently on the 0-9 IELTS scale (use .5 increments). Calculate the overall band as the rounded average.

Map the overall band to a CEFR level:
- Band 4.0-5.0 = "Intermediate (B1)"
- Band 5.5-6.5 = "Upper Intermediate (B2)"
- Band 7.0-7.5 = "Advanced (C1)"
- Band 8.0-9.0 = "Proficient (C2)"

## Error Correction

Identify ALL errors and areas for improvement. Categorize each as:
- **grammar**: tense errors, articles, prepositions, subject-verb agreement, sentence fragments, run-ons
- **vocabulary**: word choice, collocation errors, register mismatch, spelling
- **coherence**: unclear references, poor paragraph transitions, logical gaps
- **style**: tone inconsistency, wordiness, repetition, awkward phrasing

For each error, provide:
- The original text (exact quote)
- The corrected version
- A brief, clear explanation of why the change improves the writing

## Advanced Rewrite

Produce a rewrite that is approximately one band level higher than the student's current level. The rewrite should:
- Maintain the student's original meaning, voice, and personal content
- Demonstrate more sophisticated vocabulary and grammar
- Improve coherence and flow
- Be a realistic next-step (not a perfect Band 9 if the student is Band 5)
- List 3-5 specific improvements made in bullet points

## Vocabulary Extraction

From YOUR rewrite (not the original), extract 4-8 useful vocabulary items the student can learn. For each:
- The word or phrase
- A clear definition
- An example sentence showing usage (can be from the rewrite or a new one)
- CEFR level: B1 (common academic), B2 (upper-intermediate academic), C1 (advanced/sophisticated), C2 (rare/literary)
- Category: "academic", "descriptive", "idiomatic", "literary", or "conversational"

Prioritize words that are:
- Useful for IELTS writing across multiple topics
- At or slightly above the student's current level
- High-frequency in academic/professional English

## Personal Growth Reflection

If the writing contains personal content (diary entries, reflections, emotional expression), generate a thoughtful reflection prompt that:
- Acknowledges the emotions or themes expressed
- Encourages deeper self-exploration
- Is warm, non-judgmental, and psychologically safe
- Connects language learning to personal growth
- Is 1-3 sentences long

If the writing is purely academic (IELTS Task 1/2 practice), generate a prompt that encourages the student to connect the topic to their personal experience or values.

## Response Format

You MUST respond with valid JSON only. No markdown, no explanation outside the JSON. Use this exact structure:

{
  "assessment": {
    "bandScore": <number>,
    "taskAchievement": <number>,
    "coherence": <number>,
    "lexical": <number>,
    "grammar": <number>,
    "level": "<string>",
    "summary": "<string: 2-3 sentence overall assessment>"
  },
  "corrections": [
    {
      "original": "<exact quote from text>",
      "corrected": "<improved version>",
      "explanation": "<brief explanation>",
      "category": "<grammar|vocabulary|coherence|style>"
    }
  ],
  "rewrite": {
    "text": "<full rewritten text>",
    "improvements": ["<improvement 1>", "<improvement 2>", "..."]
  },
  "vocabulary": [
    {
      "word": "<word or phrase>",
      "definition": "<clear definition>",
      "example": "<example sentence>",
      "cefrLevel": "<B1|B2|C1|C2>",
      "category": "<academic|descriptive|idiomatic|literary|conversational>"
    }
  ],
  "reflectionPrompt": "<reflection question or prompt>"
}`;
}

/* -------------------------------------------------------------------------- */
/*  Route Handler                                                              */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FeedbackRequest;
    const { text, mode, lang } = body;

    // Validate input
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    if (!mode || typeof mode !== "string") {
      return NextResponse.json(
        { error: "Mode is required (e.g. 'free', 'task1', 'task2', 'letter', 'guided')." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set in environment variables.");
      return NextResponse.json(
        { error: "AI service is not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Enforce minimum word count (matches UI hint)
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 30) {
      return NextResponse.json(
        {
          error: `Please write at least 30 words for meaningful feedback. You wrote ${wordCount}.`,
        },
        { status: 400 }
      );
    }

    // Enforce monthly quota based on user tier.
    // Only runs if Supabase is configured AND user is authenticated.
    let quotaExceeded = false;
    let quotaTier: "free" | "plus" | "max" = "free";
    let quotaRemaining = TIER_MONTHLY_QUOTA.free;
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const status = await getQuotaStatus(supabase, user.id);
          quotaTier = status.tier;
          quotaRemaining = status.remaining;
          quotaExceeded = status.exceeded;
        }
      } catch (err) {
        console.error("Quota lookup failed (continuing):", err);
      }
    }

    if (quotaExceeded) {
      return NextResponse.json(
        {
          error: "monthly_quota_exceeded",
          tier: quotaTier,
          limit: TIER_MONTHLY_QUOTA[quotaTier],
        },
        { status: 429 }
      );
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: buildSystemPrompt(mode, lang || "en"),
      messages: [
        {
          role: "user",
          content: `Please analyze the following writing (${wordCount} words, mode: ${mode}):\n\n---\n${text}\n---`,
        },
      ],
    });

    // Extract text response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON response
    let feedback: FeedbackResponse;
    try {
      // Handle cases where the model might wrap JSON in markdown code fences
      const cleaned = responseText
        .replace(/^```(?:json)?\s*/m, "")
        .replace(/\s*```\s*$/m, "")
        .trim();
      feedback = JSON.parse(cleaned) as FeedbackResponse;
    } catch {
      console.error("Failed to parse AI response as JSON:", responseText);
      return NextResponse.json(
        {
          error: "Failed to parse AI feedback. Please try again.",
          rawResponse: responseText,
        },
        { status: 502 }
      );
    }

    // Validate essential fields exist
    if (!feedback.assessment || !feedback.corrections || !feedback.rewrite) {
      return NextResponse.json(
        {
          error: "Incomplete AI response. Please try again.",
          rawResponse: responseText,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(feedback);
  } catch (error) {
    console.error("Feedback API error:", error);

    if (error instanceof Anthropic.APIError) {
      const status = error.status || 500;
      const message =
        status === 429
          ? "Rate limit reached. Please wait a moment and try again."
          : status === 401
            ? "AI service authentication failed. Please check configuration."
            : "AI service error. Please try again later.";

      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
