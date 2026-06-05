import Link from "next/link";
import { notFound } from "next/navigation";
import { butterbase } from "@/lib/butterbase";

export default async function StudentDashboardPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const detail = await butterbase.getStudentDetail(studentId);
  if (!detail) notFound();

  const state = detail.learning_state;
  const status = state?.status ?? "on_track";
  const initials = detail.student.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="page page-wide">
      <div className="student-home-header">
        <div className="detail-avatar">{initials}</div>
        <div>
          <p className="section-eyebrow" style={{ marginBottom: 6 }}>Student dashboard</p>
          <h1>{detail.course?.title ?? "Your course"}</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Studying as <strong style={{ color: "var(--ink-soft)" }}>{detail.student.name}</strong>
          </p>
        </div>
        <Link className="button button-lg" href={`/chat/${detail.student.course_id}/${detail.student.id}`}>
          Continue study chat
        </Link>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="section-label">Current status</div>
          <span className={`pill ${status}`} style={{ fontSize: 13, padding: "5px 14px" }}>{status.replace("_", " ")}</span>
          <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
            {state?.last_activity
              ? `Last updated ${new Date(state.last_activity).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`
              : "Start chatting to build your learning profile."}
          </p>
        </div>

        <div className="card">
          <div className="section-label">Focus topics</div>
          {state?.weak_topics.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {state.weak_topics.map((topic) => <span key={topic} className="pill tag">{topic}</span>)}
            </div>
          ) : (
            <p className="empty">No focus topics yet</p>
          )}
        </div>

        <div className="card">
          <div className="section-label">Strengths</div>
          {state?.strong_topics.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {state.strong_topics.map((topic) => <span key={topic} className="pill ahead">{topic}</span>)}
            </div>
          ) : (
            <p className="empty">No strengths recorded yet</p>
          )}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card card-padded">
          <div className="section-label">Learning summary</div>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: "var(--ink-soft)", fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
            &ldquo;{state?.growth_summary ?? "Your study history will appear here after you start asking questions."}&rdquo;
          </p>
          <div className="student-next-step">
            <span className="action-card-label">Next step</span>
            <p>{studentNextStep(status, state?.weak_topics ?? [])}</p>
          </div>
        </div>

        <div className="card card-padded">
          <div className="section-label">Recent study activity</div>
          {detail.recent_messages.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {detail.recent_messages.slice(0, 6).map((message) => (
                <div key={message.id} className={`student-activity ${message.role}`}>
                  <span>{message.role === "student" ? "You" : "Tutor"}</span>
                  {message.content}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">No messages yet</p>
          )}
        </div>
      </div>
    </main>
  );
}

function studentNextStep(status: string, weakTopics: string[]) {
  if (status === "ahead") return "Try asking for a harder example or a challenge problem from this course.";
  if (status === "behind") return `Ask the tutor to walk through ${weakTopics[0] ?? "the current topic"} slowly with one example.`;
  if (status === "improving") return `Keep going. Ask one follow-up that tests your understanding of ${weakTopics[0] ?? "the latest topic"}.`;
  return "Ask a question from your notes or paste a concept you want explained.";
}
