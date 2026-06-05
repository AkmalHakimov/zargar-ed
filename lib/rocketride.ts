import { Question, RocketRideClient } from "rocketride";
import type { ChatMessage, CourseResource, LearningFact, StudentMemory } from "./types";

export interface TutorPipelineInput {
  courseId: string;
  studentId: string;
  message: string;
  courseContext: CourseResource[];
  recentHistory: ChatMessage[];
  studentMemory: StudentMemory;
}

export interface TutorPipelineOutput {
  topic: string;
  groundedContext: string;
  tutorResponse: string;
  facts: LearningFact[];
}

const ROCKETRIDE_PIPELINE_PATH = "tutor.pipe";

// ─── Anthropic direct fetch ────────────────────────────────────────────────────

async function callClaude(messages: Array<{ role: "user" | "assistant"; content: string }>, system: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    // Use undici fetch directly — Next.js 15's patched global fetch strips auth headers.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetch: undici } = require("undici") as { fetch: typeof fetch };
    const res = await undici("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system,
        messages,
      }),
    });
    const data = await res.json() as { content?: Array<{ type: string; text: string }>; error?: { message: string } };
    if (!res.ok) {
      console.error("[Claude] API error:", data.error?.message);
      return null;
    }
    return data.content?.find(c => c.type === "text")?.text ?? null;
  } catch (err) {
    console.error("[Claude] fetch error:", (err as Error).message);
    return null;
  }
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

/**
 * RocketRide-style pipeline:
 * message → topic detection → context retrieval → (XTrace) memory read
 *   → Claude grounded generation → return response + empty facts
 *
 * Facts are extracted by xtrace.extractLearningSignals() in agent.ts,
 * which uses XTrace vector search over the ingested turns.
 */
export async function runStudentTutorPipeline(input: TutorPipelineInput): Promise<TutorPipelineOutput> {
  const topic          = detectCourseTopic(input.message, input.courseContext);
  const groundedContext = retrieveRelevantCourseContext(topic, input.courseContext);
  const rocketRideResponse = await runRocketRideTutorPipeline(input, topic, groundedContext);
  if (rocketRideResponse) {
    return { topic, groundedContext, tutorResponse: rocketRideResponse, facts: [] };
  }

  const tutorResponse  = await generateGroundedTutorResponse(
    input.message,
    topic,
    groundedContext,
    input.studentMemory,
    input.recentHistory
  );
  return { topic, groundedContext, tutorResponse, facts: [] };
}

// ─── RocketRide SDK execution ─────────────────────────────────────────────────

function getRocketRideConfig(): { auth?: string; uri?: string; env: Record<string, string> } | null {
  const apiKey = process.env.ROCKETRIDE_APIKEY?.trim() || process.env.ROCKETRIDE_API_KEY?.trim();
  const uri = process.env.ROCKETRIDE_URI?.trim() || process.env.ROCKETRIDE_API_URL?.trim();
  const useLocal = process.env.ROCKETRIDE_USE_LOCAL === "true";

  if (!apiKey && !uri && !useLocal) return null;

  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string")
    )
  };

  if (apiKey) {
    env.ROCKETRIDE_APIKEY = apiKey;
    env.ROCKETRIDE_API_KEY = apiKey;
  }
  if (uri) {
    env.ROCKETRIDE_URI = uri;
    env.ROCKETRIDE_API_URL = uri;
  }
  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    env.ROCKETRIDE_ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY.trim();
  }

  return { auth: apiKey, uri: uri || undefined, env };
}

async function runRocketRideTutorPipeline(
  input: TutorPipelineInput,
  topic: string,
  groundedContext: string
): Promise<string | null> {
  const config = getRocketRideConfig();
  if (!config) return null;

  const client = new RocketRideClient({
    auth: config.auth,
    uri: config.uri,
    env: config.env,
    requestTimeout: 30000,
    clientName: "Zargar Tutor"
  });

  try {
    await client.connect();
    const { token } = await client.use({
      filepath: ROCKETRIDE_PIPELINE_PATH,
      name: `Zargar tutor ${input.courseId}/${input.studentId}`,
      ttl: 60
    });

    const response = await client.chat({
      token,
      question: buildTutorQuestion(input, topic, groundedContext)
    });

    await client.terminate(token).catch(() => undefined);
    return extractRocketRideText(response);
  } catch (err) {
    console.warn("[RocketRide] pipeline unavailable; using local tutor fallback:", (err as Error).message);
    return null;
  } finally {
    await client.disconnect().catch(() => undefined);
  }
}

function buildTutorQuestion(input: TutorPipelineInput, topic: string, groundedContext: string): Question {
  const question = new Question();
  const hasMemory = input.studentMemory.summary
    && input.studentMemory.summary !== "No durable learning memory yet."
    && input.studentMemory.summary !== "No learning history yet — first session.";

  question.addInstruction(
    "Tutor behavior",
    [
      "You are a study tutor for a university course. Help students build genuine understanding, not complete assignments.",
      "Ground every explanation in the provided course materials.",
      "If a student asks outside the materials, briefly acknowledge it and redirect to covered material.",
      "If you detect a misconception, correct it gently using the materials.",
      "Keep responses concise: 2-4 short paragraphs. End with one guiding question."
    ].join(" ")
  );
  question.addContext({
    topic,
    courseMaterials: groundedContext || "No course materials have been uploaded yet.",
    studentLearningHistory: hasMemory ? input.studentMemory.summary : "First session - no prior durable learning history yet."
  });

  for (const message of input.recentHistory.slice(-8)) {
    question.addHistory({
      role: message.role === "student" ? "user" : "assistant",
      content: message.content
    });
  }

  question.addQuestion(input.message);
  return question;
}

function extractRocketRideText(response: Record<string, unknown>): string | null {
  const resultTypes = response.result_types && typeof response.result_types === "object"
    ? response.result_types as Record<string, unknown>
    : {};
  const typedAnswerKey = Object.entries(resultTypes).find(([, type]) => type === "answers" || type === "text")?.[0];
  const candidates = [typedAnswerKey, "answers", "text", "output", "result", "content"].filter(Boolean) as string[];

  for (const key of candidates) {
    const value = response[key];
    const text = Array.isArray(value) ? value.find(item => typeof item === "string") : value;
    if (typeof text === "string" && text.trim()) return text.trim();
  }

  return null;
}

// ─── Topic detection ──────────────────────────────────────────────────────────

export function detectCourseTopic(message: string, resources: CourseResource[]): string {
  const lower      = message.toLowerCase();
  const topicScores = new Map<string, number>();
  for (const resource of resources) {
    const terms = resource.content.toLowerCase().match(/\b[a-z][a-z-]{4,}\b/g) ?? [];
    for (const term of terms) {
      if (lower.includes(term)) topicScores.set(term, (topicScores.get(term) ?? 0) + 1);
    }
  }
  return [...topicScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "course material";
}

// ─── Context retrieval ────────────────────────────────────────────────────────

export function retrieveRelevantCourseContext(topic: string, resources: CourseResource[]): string {
  const matching = resources.filter(r => r.content.toLowerCase().includes(topic.toLowerCase()));
  const selected = matching.length ? matching : resources.slice(0, 2);
  return selected.map(r => `## ${r.title}\n${r.content}`).join("\n\n").slice(0, 3000);
}

// ─── Grounded tutor response ──────────────────────────────────────────────────

async function generateGroundedTutorResponse(
  message: string,
  topic: string,
  context: string,
  memory: StudentMemory,
  history: ChatMessage[]
): Promise<string> {
  const hasMemory = memory.summary && memory.summary !== "No durable learning memory yet." && memory.summary !== "No learning history yet — first session.";

  const systemPrompt = `You are a study tutor for a university course. Your role is to help students build genuine understanding — not to complete assignments for them.

## Course Materials (your source of truth)
${context || "No course materials have been uploaded yet. Ask the student to have their professor add materials."}

## This Student's Learning History
${hasMemory ? memory.summary : "First session — no prior history yet."}

## Instructions
- Ground every explanation in the course materials above. Quote or reference them directly.
- If a student asks about something not in the materials, briefly acknowledge it and redirect to what IS covered.
- Never complete assignments, solve exam questions, or write code submissions for them.
- If you detect a misconception, correct it gently and explain why it's incorrect using the materials.
- Build on the student's existing knowledge shown in their learning history.
- Keep responses concise (2–4 short paragraphs max). End with one guiding question to check understanding.
- Vary your phrasing — avoid repeating the same sentence structures.`;

  // Build message history (last 8 turns)
  const msgs: Array<{ role: "user" | "assistant"; content: string }> = history
    .slice(-8)
    .map(m => ({ role: m.role === "student" ? "user" : "assistant" as const, content: m.content }));

  msgs.push({ role: "user", content: message });

  // Dedupe consecutive same-role messages
  const deduped = msgs.reduce<Array<{ role: "user" | "assistant"; content: string }>>(
    (acc, msg) => {
      const last = acc.at(-1);
      if (last && last.role === msg.role) { last.content += `\n\n${msg.content}`; }
      else acc.push({ ...msg });
      return acc;
    }, []
  );
  if (deduped[0]?.role !== "user") deduped.unshift({ role: "user", content: "(starting conversation)" });

  const text = await callClaude(deduped, systemPrompt);
  return text ?? fallbackResponse(message, topic, context, memory, history);
}

// ─── Fallback (no API key / error) ───────────────────────────────────────────

function fallbackResponse(
  message: string,
  topic: string,
  context: string,
  memory: StudentMemory,
  history: ChatMessage[]
): string {
  const lower       = message.toLowerCase();
  const homeworkRisk = /\b(answer|solve|write my|do my|copy|submission|homework)\b/.test(lower);
  const confusion    = /\b(confused|lost|stuck|don't understand|why)\b/.test(lower);
  const outsideCtx  = context.length < 20;
  const prior       = memory.summary !== "No durable learning memory yet." ? `Based on your learning so far: ${memory.summary} ` : "";
  const recentTurn  = history.filter(m => m.role === "student").at(-1)?.content;

  if (homeworkRisk) {
    return `${prior}I can help you reason through this, but I won't complete assignments directly. For ${topic}, start by identifying the relevant concept from the course notes, then explain how it applies to your problem. What have you tried so far?`;
  }
  if (outsideCtx) {
    return `${prior}That's a little outside the course materials. The most useful move here is to connect it back to ${topic} as covered in the resources. What part of the course content feels most relevant?`;
  }

  const anchor = context.split(/[.!?]/).find(s => s.toLowerCase().includes(topic))?.trim();
  const explanation = anchor
    ? `The course materials say: "${anchor}."`
    : `The materials point to ${topic} as the key concept here.`;
  const nudge = confusion
    ? "A helpful approach: separate what changes between examples and what stays fixed."
    : "Try restating this in your own words, then test it against one concrete example from the notes.";
  const continuity = recentTurn && recentTurn !== message
    ? `You were working from: "${recentTurn.slice(0, 80)}". `
    : "";

  return `${prior}${continuity}${explanation} ${nudge} What part of ${topic} feels least clear right now?`;
}
