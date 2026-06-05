import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createId, nowIso } from "./ids";
import { seedCourses, seedLearningEvents, seedLearningStates, seedMessages, seedResources, seedStudents } from "./seed";
import type {
  ChatMessage,
  Course,
  CourseAnalytics,
  CourseResource,
  LearningEvent,
  LearningFact,
  LearningStatus,
  Platform,
  Student,
  StudentLearningState
} from "./types";

interface Db {
  courses: Course[];
  course_resources: CourseResource[];
  students: Student[];
  chat_messages: ChatMessage[];
  student_learning_state: StudentLearningState[];
  learning_events: LearningEvent[];
}

export interface CourseResourceInput {
  title: string;
  content: string;
  resource_type: string;
}

const dbPath = path.join(process.cwd(), ".data", "zargar.json");

const initialDb: Db = {
  courses: seedCourses,
  course_resources: seedResources,
  students: seedStudents,
  chat_messages: seedMessages,
  student_learning_state: seedLearningStates,
  learning_events: seedLearningEvents
};

async function readDb(): Promise<Db> {
  try {
    return JSON.parse(await readFile(dbPath, "utf8")) as Db;
  } catch {
    await mkdir(path.dirname(dbPath), { recursive: true });
    await writeFile(dbPath, JSON.stringify(initialDb, null, 2));
    return structuredClone(initialDb);
  }
}

async function writeDb(db: Db) {
  await mkdir(path.dirname(dbPath), { recursive: true });
  await writeFile(dbPath, JSON.stringify(db, null, 2));
}

const tableNames = [
  "courses",
  "course_resources",
  "students",
  "chat_messages",
  "student_learning_state",
  "learning_events"
] as const;

type TableName = (typeof tableNames)[number];

function useRemoteButterbase() {
  return process.env.BUTTERBASE_MODE === "remote";
}

function butterbaseApiBase() {
  const configuredUrl = process.env.BUTTERBASE_API_URL?.trim().replace(/\/$/, "");
  if (configuredUrl) return configuredUrl;

  const appId = process.env.BUTTERBASE_PROJECT_ID?.trim();
  if (appId) return `https://api.butterbase.ai/v1/${appId}`;

  throw new Error("BUTTERBASE_MODE=remote requires BUTTERBASE_API_URL or BUTTERBASE_PROJECT_ID.");
}

function butterbaseApiKey() {
  const key = process.env.BUTTERBASE_API_KEY?.trim();
  if (!key) throw new Error("BUTTERBASE_MODE=remote requires BUTTERBASE_API_KEY.");
  return key;
}

function tableUrl(table: TableName, id?: string, query?: Record<string, string | number | undefined>) {
  const url = new URL(`${butterbaseApiBase()}/${table}${id ? `/${encodeURIComponent(id)}` : ""}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}

async function requestButterbase<T>(table: TableName, init?: RequestInit & { id?: string; query?: Record<string, string | number | undefined> }) {
  const response = await fetch(tableUrl(table, init?.id, init?.query), {
    ...init,
    headers: {
      Authorization: `Bearer ${butterbaseApiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const detail = typeof data?.message === "string" ? data.message : text;
    throw new Error(`Butterbase ${response.status} ${response.statusText}: ${detail}`);
  }
  return data as T;
}

async function listRows<T>(table: TableName, query?: Record<string, string | number | undefined>) {
  return requestButterbase<T[]>(table, { method: "GET", query });
}

async function getRow<T>(table: TableName, id: string) {
  const rows = await listRows<T>(table, { id: `eq.${id}`, limit: 1 });
  return rows[0] ?? null;
}

async function createRow<T>(table: TableName, row: T) {
  return requestButterbase<T>(table, { method: "POST", body: JSON.stringify(row) });
}

const localButterbase = {
  async listCourses() {
    return (await readDb()).courses;
  },

  async getCourse(courseId: string) {
    return (await readDb()).courses.find((course) => course.id === courseId) ?? null;
  },

  async createCourse(input: { title: string; description: string; professor_id?: string; material?: string; resources?: CourseResourceInput[] }) {
    const db = await readDb();
    const course: Course = {
      id: createId("course"),
      professor_id: input.professor_id ?? "prof_demo",
      title: input.title,
      description: input.description,
      created_at: nowIso()
    };
    db.courses.push(course);
    const resources = buildCourseResources(course, input);
    if (resources.length) {
      db.course_resources.push(...resources);
    }
    await writeDb(db);
    return course;
  },

  async listCourseResources(courseId: string) {
    return (await readDb()).course_resources.filter((resource) => resource.course_id === courseId);
  },

  async createStudent(input: { course_id: string; name: string; email: string }) {
    const db = await readDb();
    const student: Student = {
      id: createId("student"),
      course_id: input.course_id,
      name: input.name,
      email: input.email,
      join_token: createId("join"),
      created_at: nowIso()
    };
    db.students.push(student);
    db.student_learning_state.push({
      id: createId("state"),
      course_id: input.course_id,
      student_id: student.id,
      status: "on_track",
      weak_topics: [],
      strong_topics: [],
      misconceptions: [],
      growth_summary: "No learning history yet.",
      last_activity: nowIso(),
      updated_at: nowIso()
    });
    await writeDb(db);
    return student;
  },

  async getStudent(studentId: string) {
    return (await readDb()).students.find((student) => student.id === studentId) ?? null;
  },

  async listStudents(courseId?: string) {
    const students = (await readDb()).students;
    return courseId ? students.filter((student) => student.course_id === courseId) : students;
  },

  async saveMessage(input: {
    course_id: string;
    student_id: string;
    role: "student" | "tutor";
    content: string;
    platform: Platform;
  }) {
    const db = await readDb();
    const message: ChatMessage = { id: createId("msg"), created_at: nowIso(), ...input };
    db.chat_messages.push(message);
    await writeDb(db);
    return message;
  },

  async listRecentMessages(courseId: string, studentId: string, limit = 12) {
    const messages = (await readDb()).chat_messages
      .filter((message) => message.course_id === courseId && message.student_id === studentId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return messages.slice(-limit);
  },

  async getLearningState(courseId: string, studentId: string) {
    return (
      (await readDb()).student_learning_state.find(
        (state) => state.course_id === courseId && state.student_id === studentId
      ) ?? null
    );
  },

  async upsertLearningState(courseId: string, studentId: string, facts: LearningFact[], summary: string) {
    const db = await readDb();
    const existing = db.student_learning_state.find(
      (state) => state.course_id === courseId && state.student_id === studentId
    );
    const weak = facts.filter((fact) => fact.type === "confusion").map((fact) => fact.topic);
    const strong = facts.filter((fact) => fact.type === "mastery" || fact.type === "advanced_question").map((fact) => fact.topic);
    const misconceptions = facts.filter((fact) => fact.type === "misconception").map((fact) => fact.description);
    const status = inferStatus(facts, existing?.status);
    const next: StudentLearningState = {
      id: existing?.id ?? createId("state"),
      course_id: courseId,
      student_id: studentId,
      status,
      weak_topics: mergeUnique(existing?.weak_topics ?? [], weak).slice(-8),
      strong_topics: mergeUnique(existing?.strong_topics ?? [], strong).slice(-8),
      misconceptions: mergeUnique(existing?.misconceptions ?? [], misconceptions).slice(-8),
      growth_summary: summary,
      last_activity: nowIso(),
      updated_at: nowIso()
    };
    if (existing) Object.assign(existing, next);
    else db.student_learning_state.push(next);
    await writeDb(db);
    return next;
  },

  async saveLearningEvents(courseId: string, studentId: string, facts: LearningFact[], evidenceMessageId: string) {
    const db = await readDb();
    const events: LearningEvent[] = facts.map((fact) => ({
      id: createId("event"),
      course_id: courseId,
      student_id: studentId,
      event_type: fact.type,
      topic: fact.topic,
      description: fact.description,
      evidence_message_id: evidenceMessageId,
      created_at: nowIso()
    }));
    db.learning_events.push(...events);
    await writeDb(db);
    return events;
  },

  async getStudentDetail(studentId: string) {
    const db = await readDb();
    const student = db.students.find((item) => item.id === studentId) ?? null;
    if (!student) return null;
    return {
      student,
      course: db.courses.find((course) => course.id === student.course_id) ?? null,
      learning_state:
        db.student_learning_state.find((state) => state.course_id === student.course_id && state.student_id === student.id) ??
        null,
      recent_messages: db.chat_messages
        .filter((message) => message.student_id === studentId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 8),
      learning_events: db.learning_events
        .filter((event) => event.student_id === studentId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 12)
    };
  },

  async getDashboardAnalytics(): Promise<CourseAnalytics[]> {
    const db = await readDb();
    return db.courses.map((course) => {
      const students = db.students
        .filter((student) => student.course_id === course.id)
        .map((student) => ({
          ...student,
          learning_state: db.student_learning_state.find((state) => state.student_id === student.id)
        }));
      const states = students.flatMap((student) => (student.learning_state ? [student.learning_state] : []));
      return {
        course,
        studentCount: students.length,
        students,
        topWeakTopics: rank(states.flatMap((state) => state.weak_topics)),
        topMisconceptions: rank(states.flatMap((state) => state.misconceptions)),
        lastActivity: states.map((state) => state.last_activity).sort().at(-1) ?? course.created_at
      };
    });
  }
};

const remoteButterbase = {
  async listCourses() {
    return listRows<Course>("courses", { order: "created_at.asc" });
  },

  async getCourse(courseId: string) {
    return getRow<Course>("courses", courseId);
  },

  async createCourse(input: { title: string; description: string; professor_id?: string; material?: string; resources?: CourseResourceInput[] }) {
    const course: Course = {
      id: createId("course"),
      professor_id: input.professor_id ?? "prof_demo",
      title: input.title,
      description: input.description,
      created_at: nowIso()
    };
    const created = await createRow<Course>("courses", course);
    const resources = buildCourseResources(created, input);
    await Promise.all(resources.map((resource) => createRow<CourseResource>("course_resources", resource)));
    return created;
  },

  async listCourseResources(courseId: string) {
    return listRows<CourseResource>("course_resources", { course_id: `eq.${courseId}`, order: "created_at.asc" });
  },

  async createStudent(input: { course_id: string; name: string; email: string }) {
    const student: Student = {
      id: createId("student"),
      course_id: input.course_id,
      name: input.name,
      email: input.email,
      join_token: createId("join"),
      created_at: nowIso()
    };
    const created = await createRow<Student>("students", student);
    await createRow<StudentLearningState>("student_learning_state", {
      id: createId("state"),
      course_id: input.course_id,
      student_id: created.id,
      status: "on_track",
      weak_topics: [],
      strong_topics: [],
      misconceptions: [],
      growth_summary: "No learning history yet.",
      last_activity: nowIso(),
      updated_at: nowIso()
    });
    return created;
  },

  async getStudent(studentId: string) {
    return getRow<Student>("students", studentId);
  },

  async listStudents(courseId?: string) {
    return listRows<Student>("students", courseId ? { course_id: `eq.${courseId}`, order: "created_at.asc" } : { order: "created_at.asc" });
  },

  async saveMessage(input: {
    course_id: string;
    student_id: string;
    role: "student" | "tutor";
    content: string;
    platform: Platform;
  }) {
    return createRow<ChatMessage>("chat_messages", { id: createId("msg"), created_at: nowIso(), ...input });
  },

  async listRecentMessages(courseId: string, studentId: string, limit = 12) {
    const messages = await listRows<ChatMessage>("chat_messages", {
      course_id: `eq.${courseId}`,
      student_id: `eq.${studentId}`,
      order: "created_at.desc",
      limit
    });
    return messages.reverse();
  },

  async getLearningState(courseId: string, studentId: string) {
    const states = await listRows<StudentLearningState>("student_learning_state", {
      course_id: `eq.${courseId}`,
      student_id: `eq.${studentId}`,
      order: "updated_at.desc",
      limit: 1
    });
    return states[0] ?? null;
  },

  async upsertLearningState(courseId: string, studentId: string, facts: LearningFact[], summary: string) {
    const existing = await this.getLearningState(courseId, studentId);
    const weak = facts.filter((fact) => fact.type === "confusion").map((fact) => fact.topic);
    const strong = facts.filter((fact) => fact.type === "mastery" || fact.type === "advanced_question").map((fact) => fact.topic);
    const misconceptions = facts.filter((fact) => fact.type === "misconception").map((fact) => fact.description);
    const next: StudentLearningState = {
      id: createId("state"),
      course_id: courseId,
      student_id: studentId,
      status: inferStatus(facts, existing?.status),
      weak_topics: mergeUnique(existing?.weak_topics ?? [], weak).slice(-8),
      strong_topics: mergeUnique(existing?.strong_topics ?? [], strong).slice(-8),
      misconceptions: mergeUnique(existing?.misconceptions ?? [], misconceptions).slice(-8),
      growth_summary: summary,
      last_activity: nowIso(),
      updated_at: nowIso()
    };
    return createRow<StudentLearningState>("student_learning_state", next);
  },

  async saveLearningEvents(courseId: string, studentId: string, facts: LearningFact[], evidenceMessageId: string) {
    const events: LearningEvent[] = facts.map((fact) => ({
      id: createId("event"),
      course_id: courseId,
      student_id: studentId,
      event_type: fact.type,
      topic: fact.topic,
      description: fact.description,
      evidence_message_id: evidenceMessageId,
      created_at: nowIso()
    }));
    return Promise.all(events.map((event) => createRow<LearningEvent>("learning_events", event)));
  },

  async getStudentDetail(studentId: string) {
    const student = await this.getStudent(studentId);
    if (!student) return null;
    const [course, learningState, recentMessages, learningEvents] = await Promise.all([
      this.getCourse(student.course_id),
      this.getLearningState(student.course_id, student.id),
      listRows<ChatMessage>("chat_messages", { student_id: `eq.${studentId}`, order: "created_at.desc", limit: 8 }),
      listRows<LearningEvent>("learning_events", { student_id: `eq.${studentId}`, order: "created_at.desc", limit: 12 })
    ]);
    return {
      student,
      course,
      learning_state: learningState,
      recent_messages: recentMessages,
      learning_events: learningEvents
    };
  },

  async getDashboardAnalytics(): Promise<CourseAnalytics[]> {
    const [courses, students, states] = await Promise.all([
      listRows<Course>("courses", { order: "created_at.asc" }),
      listRows<Student>("students", { order: "created_at.asc" }),
      listRows<StudentLearningState>("student_learning_state", { order: "updated_at.desc" })
    ]);
    return courses.map((course) => {
      const courseStudents = students
        .filter((student) => student.course_id === course.id)
        .map((student) => ({
          ...student,
          learning_state: states.find((state) => state.student_id === student.id)
        }));
      const courseStates = courseStudents.flatMap((student) => (student.learning_state ? [student.learning_state] : []));
      return {
        course,
        studentCount: courseStudents.length,
        students: courseStudents,
        topWeakTopics: rank(courseStates.flatMap((state) => state.weak_topics)),
        topMisconceptions: rank(courseStates.flatMap((state) => state.misconceptions)),
        lastActivity: courseStates.map((state) => state.last_activity).sort().at(-1) ?? course.created_at
      };
    });
  }
};

function buildCourseResources(
  course: Course,
  input: { material?: string; resources?: CourseResourceInput[] }
): CourseResource[] {
  const createdAt = nowIso();
  const resources: CourseResource[] = [];

  if (input.material?.trim()) {
    resources.push({
      id: createId("res"),
      course_id: course.id,
      title: `${course.title} pasted material`,
      content: input.material.trim(),
      resource_type: "pasted_text",
      created_at: createdAt
    });
  }

  for (const resource of input.resources ?? []) {
    if (!resource.content.trim()) continue;
    resources.push({
      id: createId("res"),
      course_id: course.id,
      title: resource.title,
      content: resource.content.trim(),
      resource_type: resource.resource_type,
      created_at: createdAt
    });
  }

  return resources;
}

// Keep these function signatures stable so app routes and the agent flow do not change.
export const butterbase = {
  async listCourses() {
    return useRemoteButterbase() ? remoteButterbase.listCourses() : localButterbase.listCourses();
  },

  async getCourse(courseId: string) {
    return useRemoteButterbase() ? remoteButterbase.getCourse(courseId) : localButterbase.getCourse(courseId);
  },

  async createCourse(input: { title: string; description: string; professor_id?: string; material?: string; resources?: CourseResourceInput[] }) {
    return useRemoteButterbase() ? remoteButterbase.createCourse(input) : localButterbase.createCourse(input);
  },

  async listCourseResources(courseId: string) {
    return useRemoteButterbase() ? remoteButterbase.listCourseResources(courseId) : localButterbase.listCourseResources(courseId);
  },

  async createStudent(input: { course_id: string; name: string; email: string }) {
    return useRemoteButterbase() ? remoteButterbase.createStudent(input) : localButterbase.createStudent(input);
  },

  async getStudent(studentId: string) {
    return useRemoteButterbase() ? remoteButterbase.getStudent(studentId) : localButterbase.getStudent(studentId);
  },

  async listStudents(courseId?: string) {
    return useRemoteButterbase() ? remoteButterbase.listStudents(courseId) : localButterbase.listStudents(courseId);
  },

  async saveMessage(input: {
    course_id: string;
    student_id: string;
    role: "student" | "tutor";
    content: string;
    platform: Platform;
  }) {
    return useRemoteButterbase() ? remoteButterbase.saveMessage(input) : localButterbase.saveMessage(input);
  },

  async listRecentMessages(courseId: string, studentId: string, limit = 12) {
    return useRemoteButterbase()
      ? remoteButterbase.listRecentMessages(courseId, studentId, limit)
      : localButterbase.listRecentMessages(courseId, studentId, limit);
  },

  async getLearningState(courseId: string, studentId: string) {
    return useRemoteButterbase()
      ? remoteButterbase.getLearningState(courseId, studentId)
      : localButterbase.getLearningState(courseId, studentId);
  },

  async upsertLearningState(courseId: string, studentId: string, facts: LearningFact[], summary: string) {
    return useRemoteButterbase()
      ? remoteButterbase.upsertLearningState(courseId, studentId, facts, summary)
      : localButterbase.upsertLearningState(courseId, studentId, facts, summary);
  },

  async saveLearningEvents(courseId: string, studentId: string, facts: LearningFact[], evidenceMessageId: string) {
    return useRemoteButterbase()
      ? remoteButterbase.saveLearningEvents(courseId, studentId, facts, evidenceMessageId)
      : localButterbase.saveLearningEvents(courseId, studentId, facts, evidenceMessageId);
  },

  async getStudentDetail(studentId: string) {
    return useRemoteButterbase() ? remoteButterbase.getStudentDetail(studentId) : localButterbase.getStudentDetail(studentId);
  },

  async getDashboardAnalytics(): Promise<CourseAnalytics[]> {
    return useRemoteButterbase() ? remoteButterbase.getDashboardAnalytics() : localButterbase.getDashboardAnalytics();
  }
};

function mergeUnique(a: string[], b: string[]) {
  return Array.from(new Set([...a, ...b].filter(Boolean)));
}

function inferStatus(facts: LearningFact[], previous: LearningStatus = "on_track"): LearningStatus {
  if (facts.some((fact) => fact.type === "advanced_question")) return "ahead";
  if (facts.some((fact) => fact.type === "improvement" || fact.type === "mastery")) return "improving";
  if (facts.filter((fact) => fact.type === "confusion" || fact.type === "misconception").length >= 2) return "behind";
  return previous === "inactive" ? "on_track" : previous;
}

function rank(items: string[]) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([item]) => item)
    .slice(0, 5);
}
