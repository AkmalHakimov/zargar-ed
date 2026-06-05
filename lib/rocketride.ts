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

// TODO(RocketRide): Replace this mock workflow with RocketRide SDK nodes:
// incoming message -> topic detection -> context retrieval -> XTrace memory read
// -> grounded tutor generation -> learning signal extraction -> XTrace write
// -> Butterbase progress update.
export async function runStudentTutorPipeline(input: TutorPipelineInput): Promise<TutorPipelineOutput> {
  const topic = detectCourseTopic(input.message, input.courseContext);
  const groundedContext = retrieveRelevantCourseContext(topic, input.courseContext);
  const tutorResponse = generateGroundedTutorResponse(input.message, topic, groundedContext, input.studentMemory, input.recentHistory);
  return { topic, groundedContext, tutorResponse, facts: [] };
}

export function detectCourseTopic(message: string, resources: CourseResource[]) {
  const lower = message.toLowerCase();
  const topicScores = new Map<string, number>();
  for (const resource of resources) {
    const terms = resource.content.toLowerCase().match(/\b[a-z][a-z-]{4,}\b/g) ?? [];
    for (const term of terms) {
      if (lower.includes(term)) topicScores.set(term, (topicScores.get(term) ?? 0) + 1);
    }
  }
  return [...topicScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "course material";
}

export function retrieveRelevantCourseContext(topic: string, resources: CourseResource[]) {
  const matching = resources.filter((resource) => resource.content.toLowerCase().includes(topic.toLowerCase()));
  const selected = matching.length ? matching : resources.slice(0, 2);
  return selected.map((resource) => `${resource.title}: ${resource.content}`).join("\n\n").slice(0, 2500);
}

function generateGroundedTutorResponse(
  message: string,
  topic: string,
  context: string,
  memory: StudentMemory,
  history: ChatMessage[]
) {
  const lower = message.toLowerCase();
  const homeworkRisk = /\b(answer|solve|write my|do my|copy|submission|homework)\b/.test(lower);
  const outsideContext = context.length < 20;
  const confusion = /\b(confused|lost|stuck|don't understand|do not understand|why)\b/.test(lower);
  const prior = memory.summary !== "No durable learning memory yet." ? `Based on your recent learning pattern: ${memory.summary} ` : "";
  const recentStudentTurn = history.filter((item) => item.role === "student").at(-1)?.content;

  if (homeworkRisk) {
    return `${prior}I can help you reason through this, but I will not directly complete an assignment for you. For ${topic}, start by naming the concept from the course notes, then explain which part of the problem maps to that concept. What have you tried so far?`;
  }

  if (outsideContext) {
    return `${prior}That question is a little outside the provided course material, so here is the short version: connect it back to the course by asking how it affects ${topic}. In this class, the useful move is to tie the idea to the evidence and definitions from the resources.`;
  }

  const anchor = context.split(/[.!?]/).find((sentence) => sentence.toLowerCase().includes(topic.toLowerCase()))?.trim();
  const explanation = anchor
    ? `The course material says: ${anchor}.`
    : `The most relevant course material points to ${topic} as the concept to focus on.`;
  const nudge = confusion
    ? "A good way to separate the ideas is to ask what changes between training examples and new examples."
    : "Try restating the idea in your own words, then test it against one concrete example from the notes.";
  const continuity = recentStudentTurn && recentStudentTurn !== message ? `Last time you were working from: "${recentStudentTurn.slice(0, 90)}". ` : "";

  return `${prior}${continuity}${explanation} ${nudge} What part of ${topic} feels least clear right now?`;
}

