import { butterbase } from "./butterbase";
import { runStudentTutorPipeline } from "./rocketride";
import {
  extractLearningSignals,
  ingestConversationTurn,
  readStudentMemory,
  summarizeGrowth,
  writeLearningMemory
} from "./xtrace";
import type { Platform } from "./types";

export async function processStudentMessage(input: {
  courseId: string;
  studentId: string;
  message: string;
  platform: Platform;
}) {
  // 1. Persist the student message immediately
  const studentMessage = await butterbase.saveMessage({
    course_id: input.courseId,
    student_id: input.studentId,
    role: "student",
    content: input.message,
    platform: input.platform
  });

  // 2. Fetch everything needed for the tutor pipeline in parallel
  const [courseResources, recentHistory, previousMemory] = await Promise.all([
    butterbase.listCourseResources(input.courseId),
    butterbase.listRecentMessages(input.courseId, input.studentId),
    // XTrace recall: returns accumulated learning context for this student
    readStudentMemory(input.courseId, input.studentId)
  ]);

  // 3. Run the tutor pipeline (Claude generates a grounded response using
  //    course materials + XTrace memory)
  const pipeline = await runStudentTutorPipeline({
    courseId: input.courseId,
    studentId: input.studentId,
    message: input.message,
    courseContext: courseResources,
    recentHistory,
    studentMemory: previousMemory
  });

  // 4. Save the tutor response so the UI can display it immediately
  const tutorMessage = await butterbase.saveMessage({
    course_id: input.courseId,
    student_id: input.studentId,
    role: "tutor",
    content: pipeline.tutorResponse,
    platform: input.platform
  });

  // 5. Ingest the completed turn into XTrace (fire-and-forget).
  //    XTrace extracts semantic facts (misconceptions, breakthroughs, confusion)
  //    server-side. These will be available on the NEXT turn's recall.
  ingestConversationTurn(
    input.courseId,
    input.studentId,
    input.message,
    pipeline.tutorResponse
  ).catch((err: Error) => console.warn("[XTrace] background ingest error:", err.message));

  // 6. Extract learning signals for immediate dashboard update.
  //    Uses XTrace vector search when available, heuristics as fallback.
  const facts = await extractLearningSignals(
    input.message,
    pipeline.tutorResponse,
    courseResources,
    previousMemory,
    input.courseId,   // passed so XTrace search is scoped correctly
    input.studentId
  );

  // 7. Update the local learning memory cache and Butterbase state
  await writeLearningMemory(input.courseId, input.studentId, facts);
  const growthSummary  = await summarizeGrowth(input.courseId, input.studentId);
  const learningState  = await butterbase.upsertLearningState(input.courseId, input.studentId, facts, growthSummary);
  await butterbase.saveLearningEvents(input.courseId, input.studentId, facts, studentMessage.id);

  return {
    response: pipeline.tutorResponse,
    studentMessage,
    tutorMessage,
    facts,
    learningState
  };
}
