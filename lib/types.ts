export type Platform = "web" | "photon" | "slack" | "telegram";
export type ChatRole = "student" | "tutor";
export type LearningStatus = "behind" | "on_track" | "ahead" | "improving" | "inactive";
export type LearningEventType =
  | "confusion"
  | "improvement"
  | "misconception"
  | "mastery"
  | "advanced_question"
  | "inactivity";

export interface Course {
  id: string;
  professor_id: string;
  title: string;
  description: string;
  created_at: string;
}

export interface CourseResource {
  id: string;
  course_id: string;
  title: string;
  content: string;
  resource_type: string;
  created_at: string;
}

export interface Student {
  id: string;
  course_id: string;
  name: string;
  email: string;
  join_token: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  course_id: string;
  student_id: string;
  role: ChatRole;
  content: string;
  platform: Platform;
  created_at: string;
}

export interface StudentLearningState {
  id: string;
  course_id: string;
  student_id: string;
  status: LearningStatus;
  weak_topics: string[];
  strong_topics: string[];
  misconceptions: string[];
  growth_summary: string;
  last_activity: string;
  updated_at: string;
}

export interface LearningEvent {
  id: string;
  course_id: string;
  student_id: string;
  event_type: LearningEventType;
  topic: string;
  description: string;
  evidence_message_id: string;
  created_at: string;
}

export interface LearningFact {
  type: LearningEventType;
  topic: string;
  description: string;
  confidence: number;
}

export interface StudentMemory {
  namespace: string;
  facts: LearningFact[];
  summary: string;
  updated_at: string;
}

export interface CourseAnalytics {
  course: Course;
  studentCount: number;
  students: Array<Student & { learning_state?: StudentLearningState }>;
  topWeakTopics: string[];
  topMisconceptions: string[];
  lastActivity: string;
}

