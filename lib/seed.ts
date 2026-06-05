import type { ChatMessage, Course, CourseResource, LearningEvent, Student, StudentLearningState } from "./types";

const created = "2026-06-05T09:00:00.000Z";

export const seedCourses: Course[] = [
  {
    id: "course_ai101",
    professor_id: "prof_demo",
    title: "AI Foundations",
    description: "Core ideas behind machine learning, neural networks, and responsible AI.",
    created_at: created
  }
];

export const seedResources: CourseResource[] = [
  {
    id: "res_ai101_notes",
    course_id: "course_ai101",
    title: "Week 1 Notes",
    content:
      "Machine learning systems learn patterns from data. Supervised learning uses labeled examples. Overfitting happens when a model memorizes training data and fails to generalize. Regularization, validation sets, and simpler models can reduce overfitting. Neural networks use layers of weighted transformations and activation functions.",
    resource_type: "pasted_text",
    created_at: created
  },
  {
    id: "res_ai101_ethics",
    course_id: "course_ai101",
    title: "Responsible AI Brief",
    content:
      "Responsible AI requires checking data quality, bias, privacy, transparency, and human impact. Evaluation should include accuracy and failure modes across different groups. Students should connect technical choices to social consequences.",
    resource_type: "pasted_text",
    created_at: created
  }
];

export const seedStudents: Student[] = [
  {
    id: "student_maya",
    course_id: "course_ai101",
    name: "Maya Chen",
    email: "maya@example.edu",
    join_token: "join_maya",
    created_at: created
  },
  {
    id: "student_noah",
    course_id: "course_ai101",
    name: "Noah Smith",
    email: "noah@example.edu",
    join_token: "join_noah",
    created_at: created
  }
];

export const seedMessages: ChatMessage[] = [
  {
    id: "msg_seed_1",
    course_id: "course_ai101",
    student_id: "student_maya",
    role: "student",
    content: "I think overfitting means the model is too accurate. Is that right?",
    platform: "web",
    created_at: "2026-06-05T09:20:00.000Z"
  },
  {
    id: "msg_seed_2",
    course_id: "course_ai101",
    student_id: "student_maya",
    role: "tutor",
    content:
      "Close, but the key issue is generalization. An overfit model may be very accurate on training data while performing poorly on new examples.",
    platform: "web",
    created_at: "2026-06-05T09:21:00.000Z"
  },
  {
    id: "msg_seed_3",
    course_id: "course_ai101",
    student_id: "student_noah",
    role: "student",
    content: "How do validation sets help detect failure modes across groups?",
    platform: "web",
    created_at: "2026-06-05T10:00:00.000Z"
  }
];

export const seedLearningStates: StudentLearningState[] = [
  {
    id: "state_maya",
    course_id: "course_ai101",
    student_id: "student_maya",
    status: "improving",
    weak_topics: ["overfitting", "generalization"],
    strong_topics: ["supervised learning"],
    misconceptions: ["Overfitting means a model is simply too accurate."],
    growth_summary: "Maya is correcting a misconception about overfitting and beginning to separate training accuracy from generalization.",
    last_activity: "2026-06-05T09:21:00.000Z",
    updated_at: "2026-06-05T09:21:00.000Z"
  },
  {
    id: "state_noah",
    course_id: "course_ai101",
    student_id: "student_noah",
    status: "ahead",
    weak_topics: [],
    strong_topics: ["evaluation", "responsible AI"],
    misconceptions: [],
    growth_summary: "Noah asks cross-cutting questions that connect model evaluation with responsible AI.",
    last_activity: "2026-06-05T10:00:00.000Z",
    updated_at: "2026-06-05T10:00:00.000Z"
  }
];

export const seedLearningEvents: LearningEvent[] = [
  {
    id: "event_maya_1",
    course_id: "course_ai101",
    student_id: "student_maya",
    event_type: "misconception",
    topic: "overfitting",
    description: "Confused overfitting with high accuracy instead of poor generalization.",
    evidence_message_id: "msg_seed_1",
    created_at: "2026-06-05T09:20:00.000Z"
  },
  {
    id: "event_noah_1",
    course_id: "course_ai101",
    student_id: "student_noah",
    event_type: "advanced_question",
    topic: "responsible AI evaluation",
    description: "Asked how validation sets expose group-specific failure modes.",
    evidence_message_id: "msg_seed_3",
    created_at: "2026-06-05T10:00:00.000Z"
  }
];

