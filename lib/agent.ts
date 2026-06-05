import { butterbase } from "./butterbase";
import { runStudentTutorPipeline } from "./rocketride";
import { extractLearningSignals, readStudentMemory, summarizeGrowth, writeLearningMemory } from "./xtrace";
import type { Platform } from "./types";

export async function processStudentMessage(input: {
  courseId: string;
  studentId: string;
  message: string;
  platform: Platform;
}) {
  const studentMessage = await butterbase.saveMessage({
    course_id: input.courseId,
    student_id: input.studentId,
    role: "student",
    content: input.message,
    platform: input.platform
  });

  const [courseResources, recentHistory, previousMemory] = await Promise.all([
    butterbase.listCourseResources(input.courseId),
    butterbase.listRecentMessages(input.courseId, input.studentId),
    readStudentMemory(input.courseId, input.studentId)
  ]);

  const pipeline = await runStudentTutorPipeline({
    courseId: input.courseId,
    studentId: input.studentId,
    message: input.message,
    courseContext: courseResources,
    recentHistory,
    studentMemory: previousMemory
  });

  const facts = await extractLearningSignals(input.message, pipeline.tutorResponse, courseResources, previousMemory);
  await writeLearningMemory(input.courseId, input.studentId, facts);
  const growthSummary = await summarizeGrowth(input.courseId, input.studentId);
  const learningState = await butterbase.upsertLearningState(input.courseId, input.studentId, facts, growthSummary);
  await butterbase.saveLearningEvents(input.courseId, input.studentId, facts, studentMessage.id);

  const tutorMessage = await butterbase.saveMessage({
    course_id: input.courseId,
    student_id: input.studentId,
    role: "tutor",
    content: pipeline.tutorResponse,
    platform: input.platform
  });

  return {
    response: pipeline.tutorResponse,
    studentMessage,
    tutorMessage,
    facts,
    learningState
  };
}

