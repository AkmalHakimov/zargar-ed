import { MemoryClient } from "@xtraceai/memory";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { nowIso } from "./ids";
import type { CourseResource, LearningFact, StudentMemory } from "./types";

// ─── XTrace client ───────────────────────────────────────────────────────────

function getClient(): MemoryClient | null {
  const apiKey = process.env.XTRACE_API_KEY?.trim();
  const orgId  = process.env.XTRACE_ORG_ID?.trim();
  if (!apiKey || !orgId) return null;
  return new MemoryClient({ apiKey, orgId });
}

// user_id encodes both course and student so memories are scoped per-course-per-student
function xtraceUserId(courseId: string, studentId: string) {
  return `${courseId}__${studentId}`;
}

export function studentNamespace(courseId: string, studentId: string) {
  return `course:${courseId}:student:${studentId}`;
}

// ─── Local JSON fallback ─────────────────────────────────────────────────────

const memoryPath = path.join(process.cwd(), ".data", "xtrace-memory.json");
type MemoryDb = Record<string, StudentMemory>;

async function readMemoryDb(): Promise<MemoryDb> {
  try {
    return JSON.parse(await readFile(memoryPath, "utf8")) as MemoryDb;
  } catch {
    await mkdir(path.dirname(memoryPath), { recursive: true });
    await writeFile(memoryPath, JSON.stringify({}, null, 2));
    return {};
  }
}

async function writeMemoryDb(db: MemoryDb) {
  await mkdir(path.dirname(memoryPath), { recursive: true });
  await writeFile(memoryPath, JSON.stringify(db, null, 2));
}

async function localRead(courseId: string, studentId: string): Promise<StudentMemory> {
  const db = await readMemoryDb();
  const namespace = studentNamespace(courseId, studentId);
  return db[namespace] ?? { namespace, facts: [], summary: "No durable learning memory yet.", updated_at: nowIso() };
}

async function localWrite(courseId: string, studentId: string, facts: LearningFact[]): Promise<StudentMemory> {
  const db = await readMemoryDb();
  const namespace = studentNamespace(courseId, studentId);
  const previous  = db[namespace]?.facts ?? [];
  const merged    = dedupeFacts([...previous, ...facts]).slice(-40);
  db[namespace]   = { namespace, facts: merged, summary: buildSummaryFromFacts(merged), updated_at: nowIso() };
  await writeMemoryDb(db);
  return db[namespace];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Read the student's accumulated learning memory.
 * With XTrace: returns a recall context block formatted for injection into the AI prompt.
 * Without XTrace: reads from local JSON.
 */
export async function readStudentMemory(courseId: string, studentId: string): Promise<StudentMemory> {
  const namespace = studentNamespace(courseId, studentId);
  const client    = getClient();

  if (!client) return localRead(courseId, studentId);

  try {
    const userId = xtraceUserId(courseId, studentId);
    // recall returns an injection-ready prompt block scoped to this student
    const result = await client.memories.recall({
      query: "student learning history, understanding, progress, confusion, misconceptions",
      pools: [{ user_id: userId }]
    });
    // result.prompt is the ready-to-inject markdown context block
    const context = result.prompt ?? "";

    return {
      namespace,
      facts: [],
      summary: context.trim() || "No learning history yet — first session.",
      updated_at: nowIso()
    };
  } catch (err) {
    console.warn("[XTrace] recall failed, falling back to local:", (err as Error).message);
    return localRead(courseId, studentId);
  }
}

/**
 * Ingest a completed conversation turn into XTrace.
 * XTrace extracts semantic facts (misconceptions, breakthroughs, confusion signals)
 * automatically via LLM — no regex needed.
 * Called after the tutor response is generated.
 */
export async function ingestConversationTurn(
  courseId: string,
  studentId: string,
  studentMessage: string,
  tutorResponse: string
): Promise<void> {
  const client = getClient();

  if (!client) return; // no-op without credentials

  const userId = xtraceUserId(courseId, studentId);
  try {
    const job = await client.memories.ingest({
      messages: [
        { role: "user",      content: studentMessage },
        { role: "assistant", content: tutorResponse  }
      ],
      user_id: userId,
      conv_id: `zargar_${courseId}_${studentId}`,
    });

    // Poll in background — don't block the response to the student
    if (job?.id) {
      client.memories.jobs.pollUntilDone(job.id).catch((err: Error) =>
        console.warn("[XTrace] poll failed:", err.message)
      );
    }
  } catch (err) {
    console.warn("[XTrace] ingest failed:", (err as Error).message);
  }
}

/**
 * Extract learning signals from a student↔tutor exchange.
 * With XTrace configured: after ingestion, search for recent facts to classify signals.
 * Without XTrace: fall back to lightweight heuristics (still useful for demo).
 */
export async function extractLearningSignals(
  message: string,
  tutorResponse: string,
  courseContext: CourseResource[],
  previousMemory: StudentMemory,
  courseId?: string,
  studentId?: string
): Promise<LearningFact[]> {
  const client = getClient();

  if (client && courseId && studentId) {
    try {
      const userId = xtraceUserId(courseId, studentId);
      const topics  = detectTopics(`${message} ${tutorResponse}`, courseContext);
      const topic   = topics[0] ?? "course material";

      // Search XTrace vector index for recently extracted facts per signal type.
      // Memory.text is the extracted semantic fact string.
      const [confusionRes, progressRes, misconceptionRes, advancedRes] = await Promise.all([
        client.memories.search({ query: "student confused doesn't understand stuck unclear", user_id: userId, limit: 3 }),
        client.memories.search({ query: "student understands progress improvement mastery",  user_id: userId, limit: 3 }),
        client.memories.search({ query: "student wrong misconception incorrect assumption",   user_id: userId, limit: 3 }),
        client.memories.search({ query: "student asks advanced deeper tradeoff compare",     user_id: userId, limit: 3 }),
      ]);

      const firstText = (res: { data?: Array<{ text: string }> }) => res.data?.[0]?.text ?? "";

      const facts: LearningFact[] = [];

      if (firstText(confusionRes))      facts.push({ type: "confusion",        topic, description: `XTrace: ${firstText(confusionRes).slice(0, 160)}`,      confidence: 0.85 });
      if (firstText(progressRes))       facts.push({ type: "improvement",      topic, description: `XTrace: ${firstText(progressRes).slice(0, 160)}`,       confidence: 0.85 });
      if (firstText(misconceptionRes))  facts.push({ type: "misconception",    topic, description: `XTrace: ${firstText(misconceptionRes).slice(0, 160)}`,   confidence: 0.82 });
      if (firstText(advancedRes))       facts.push({ type: "advanced_question",topic, description: `XTrace: ${firstText(advancedRes).slice(0, 160)}`,        confidence: 0.80 });

      if (facts.length) return facts;
      // XTrace extraction is async — first few messages may return nothing yet.
      // Fall through to heuristics so dashboard updates immediately.
    } catch (err) {
      console.warn("[XTrace] search failed, using heuristics:", (err as Error).message);
    }
  }

  // ── Heuristic fallback ────────────────────────────────────────────────────
  return heuristicExtract(message, courseContext, previousMemory);
}

/**
 * Write facts to local memory (used when XTrace is not configured or as a cache).
 * When XTrace is active, the canonical store is XTrace — this keeps local JSON in sync.
 */
export async function writeLearningMemory(courseId: string, studentId: string, facts: LearningFact[]) {
  return localWrite(courseId, studentId, facts);
}

export async function summarizeGrowth(courseId: string, studentId: string) {
  const memory = await localRead(courseId, studentId);
  return buildSummaryFromFacts(memory.facts);
}

// ─── Heuristic helpers ────────────────────────────────────────────────────────

function heuristicExtract(message: string, courseContext: CourseResource[], previousMemory: StudentMemory): LearningFact[] {
  const text   = message.toLowerCase();
  const topics = detectTopics(text, courseContext);
  const topic  = topics[0] ?? "course material";
  const facts: LearningFact[] = [];

  if (/\b(confused|lost|don't understand|do not understand|stuck|why|how does|what is)\b/i.test(message)) {
    facts.push({ type: "confusion",    topic, description: `Student appears confused about ${topic}.`,             confidence: 0.78 });
  }
  if (/\b(i thought|is that right|means the same|always|just memor|doesn't that mean)\b/i.test(message)) {
    facts.push({ type: "misconception", topic, description: `Potential misconception about ${topic}: "${message.slice(0, 140)}"`, confidence: 0.72 });
  }
  if (/\b(now i (get|see)|that makes sense|so it means|i understand|got it|makes more sense)\b/i.test(message)) {
    facts.push({ type: "improvement", topic, description: `Student shows progress on ${topic}.`,                  confidence: 0.76 });
  }
  if (/\b(explain more|compare|failure mode|bias|prove|derive|advanced|tradeoff|what about|how does .* relate)\b/i.test(message)) {
    facts.push({ type: "advanced_question", topic, description: `Advanced question about ${topic}.`,              confidence: 0.70 });
  }
  if (!facts.length && previousMemory.facts.some(f => f.type === "confusion" && f.topic === topic)) {
    facts.push({ type: "mastery", topic, description: `Student continued work on ${topic} without confusion.`,    confidence: 0.55 });
  }

  return facts.length
    ? facts
    : [{ type: "mastery", topic, description: `Student engaged with ${topic}.`, confidence: 0.5 }];
}

function detectTopics(text: string, resources: CourseResource[]): string[] {
  const lower      = text.toLowerCase();
  const candidates = new Set<string>();
  const known = [
    "logistic regression", "linear regression", "overfitting", "generalization",
    "regularization", "validation", "supervised learning", "neural networks",
    "decision boundary", "sigmoid", "gradient descent", "bias", "variance",
    "classification", "probability", "model calibration", "cross-validation"
  ];
  for (const topic of known) {
    if (lower.includes(topic)) candidates.add(topic);
  }
  for (const resource of resources) {
    for (const word of resource.content.match(/\b[A-Za-z][A-Za-z -]{5,30}\b/g) ?? []) {
      const normalized = word.toLowerCase();
      if (lower.includes(normalized) && normalized.split(" ").length <= 3) candidates.add(word);
    }
  }
  return [...candidates].slice(0, 3);
}

function dedupeFacts(facts: LearningFact[]): LearningFact[] {
  const seen = new Set<string>();
  return facts.filter(f => {
    const key = `${f.type}:${f.topic}:${f.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSummaryFromFacts(facts: LearningFact[]): string {
  if (!facts.length) return "No durable learning memory yet.";
  const weak      = unique(facts.filter(f => f.type === "confusion"    || f.type === "misconception").map(f => f.topic));
  const strong    = unique(facts.filter(f => f.type === "mastery"      || f.type === "advanced_question").map(f => f.topic));
  const improving = unique(facts.filter(f => f.type === "improvement").map(f => f.topic));
  return [
    weak.length      ? `Needs support with ${weak.join(", ")}.`                      : "",
    strong.length    ? `Shows strength or advanced curiosity in ${strong.join(", ")}.` : "",
    improving.length ? `Recent improvement in ${improving.join(", ")}.`              : ""
  ].filter(Boolean).join(" ");
}

function unique(values: string[]): string[] {
  return [...new Set(values)].slice(0, 5);
}
