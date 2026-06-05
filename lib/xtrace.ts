import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { nowIso } from "./ids";
import type { CourseResource, LearningFact, StudentMemory } from "./types";

const memoryPath = path.join(process.cwd(), ".data", "xtrace-memory.json");

type MemoryDb = Record<string, StudentMemory>;

export function studentNamespace(courseId: string, studentId: string) {
  return `course:${courseId}:student:${studentId}`;
}

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

// TODO(XTrace): Replace local JSON reads/writes with XTrace durable memory APIs.
// The namespace format must remain course:{courseId}:student:{studentId}.
export async function readStudentMemory(courseId: string, studentId: string): Promise<StudentMemory> {
  const db = await readMemoryDb();
  const namespace = studentNamespace(courseId, studentId);
  return (
    db[namespace] ?? {
      namespace,
      facts: [],
      summary: "No durable learning memory yet.",
      updated_at: nowIso()
    }
  );
}

export async function writeLearningMemory(courseId: string, studentId: string, facts: LearningFact[]) {
  const db = await readMemoryDb();
  const namespace = studentNamespace(courseId, studentId);
  const previous = db[namespace]?.facts ?? [];
  const merged = dedupeFacts([...previous, ...facts]).slice(-40);
  db[namespace] = {
    namespace,
    facts: merged,
    summary: buildSummary(merged),
    updated_at: nowIso()
  };
  await writeMemoryDb(db);
  return db[namespace];
}

export async function extractLearningSignals(
  message: string,
  tutorResponse: string,
  courseContext: CourseResource[],
  previousMemory: StudentMemory
): Promise<LearningFact[]> {
  // TODO(XTrace): Replace heuristic extraction with XTrace extraction over message, tutor response,
  // course context, and previous durable memory.
  const text = `${message} ${tutorResponse}`.toLowerCase();
  const topics = detectTopics(text, courseContext);
  const facts: LearningFact[] = [];
  const topic = topics[0] ?? "course material";

  if (/\b(confused|lost|don't understand|do not understand|stuck|why|how)\b/i.test(message)) {
    facts.push({ type: "confusion", topic, description: `Student appears confused about ${topic}.`, confidence: 0.78 });
  }
  if (/\b(i thought|is that right|means the same|always|just memor)/i.test(message)) {
    facts.push({
      type: "misconception",
      topic,
      description: `Potential misconception surfaced around ${topic}: "${message.slice(0, 140)}"`,
      confidence: 0.72
    });
  }
  if (/\b(now i get|that makes sense|so it means|i understand|improving)\b/i.test(message)) {
    facts.push({ type: "improvement", topic, description: `Student shows progress on ${topic}.`, confidence: 0.76 });
  }
  if (/\b(explain more|compare|failure mode|bias|prove|derive|advanced|tradeoff)\b/i.test(message)) {
    facts.push({
      type: "advanced_question",
      topic,
      description: `Student asked an advanced or connecting question about ${topic}.`,
      confidence: 0.7
    });
  }
  if (previousMemory.facts.some((fact) => fact.type === "confusion" && fact.topic === topic) && facts.length === 0) {
    facts.push({ type: "mastery", topic, description: `Student is continuing work on ${topic} without obvious confusion.`, confidence: 0.55 });
  }

  return facts.length ? facts : [{ type: "mastery", topic, description: `Student engaged with ${topic}.`, confidence: 0.5 }];
}

export async function summarizeGrowth(courseId: string, studentId: string) {
  const memory = await readStudentMemory(courseId, studentId);
  return buildSummary(memory.facts);
}

function detectTopics(text: string, resources: CourseResource[]) {
  const candidates = new Set<string>();
  const known = [
    "overfitting",
    "generalization",
    "regularization",
    "validation",
    "supervised learning",
    "neural networks",
    "responsible AI",
    "bias",
    "privacy",
    "transparency"
  ];
  for (const topic of known) {
    if (text.includes(topic.toLowerCase())) candidates.add(topic);
  }
  for (const resource of resources) {
    for (const word of resource.content.match(/\b[A-Za-z][A-Za-z -]{5,30}\b/g) ?? []) {
      const normalized = word.toLowerCase();
      if (text.includes(normalized) && normalized.split(" ").length <= 3) candidates.add(word);
    }
  }
  return [...candidates].slice(0, 3);
}

function dedupeFacts(facts: LearningFact[]) {
  const seen = new Set<string>();
  return facts.filter((fact) => {
    const key = `${fact.type}:${fact.topic}:${fact.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSummary(facts: LearningFact[]) {
  if (!facts.length) return "No durable learning memory yet.";
  const weak = facts.filter((fact) => fact.type === "confusion" || fact.type === "misconception").map((fact) => fact.topic);
  const strong = facts.filter((fact) => fact.type === "mastery" || fact.type === "advanced_question").map((fact) => fact.topic);
  const improving = facts.filter((fact) => fact.type === "improvement").map((fact) => fact.topic);
  return [
    weak.length ? `Needs support with ${unique(weak).join(", ")}.` : "",
    strong.length ? `Shows strength or advanced curiosity in ${unique(strong).join(", ")}.` : "",
    improving.length ? `Recent improvement in ${unique(improving).join(", ")}.` : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function unique(values: string[]) {
  return [...new Set(values)].slice(0, 5);
}

