import { notFound } from "next/navigation";
import { butterbase } from "@/lib/butterbase";
import { ChatClient } from "./ChatClient";

export default async function ChatPage({ params }: { params: Promise<{ courseId: string; studentId: string }> }) {
  const { courseId, studentId } = await params;
  const [course, student, messages, learningState] = await Promise.all([
    butterbase.getCourse(courseId),
    butterbase.getStudent(studentId),
    butterbase.listRecentMessages(courseId, studentId, 30),
    butterbase.getLearningState(courseId, studentId)
  ]);
  if (!course || !student || student.course_id !== courseId) notFound();

  return (
    <main className="page">
      {/* Page header */}
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--brand)", marginBottom: 6 }}>
            Study chat
          </p>
          <h1 style={{ marginBottom: 4 }}>{course.title}</h1>
          <p className="muted" style={{ fontSize: 14 }}>
            Studying as <strong style={{ color: "var(--ink-soft)" }}>{student.name}</strong>
            &nbsp;&middot;&nbsp;Responses are grounded in your course materials
          </p>
        </div>
        {learningState && (
          <span className={`pill ${learningState.status}`} style={{ fontSize: 13, padding: "5px 14px", flexShrink: 0 }}>
            {learningState.status.replace("_", " ")}
          </span>
        )}
      </div>

      <ChatClient
        courseId={courseId}
        studentId={studentId}
        initialMessages={messages}
        initialState={learningState}
      />
    </main>
  );
}
