import Link from "next/link";
import { notFound } from "next/navigation";
import { butterbase } from "@/lib/butterbase";

export default async function StudentDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const detail = await butterbase.getStudentDetail(studentId);
  if (!detail) notFound();

  const state   = detail.learning_state;
  const status  = state?.status ?? "on_track";
  const initials = detail.student.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <main className="page">
      {/* ── Student header ── */}
      <div className="detail-header">
        <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
          <div className="detail-avatar">{initials}</div>
          <div>
            <div className="detail-title-group">
              <h1 style={{ fontSize: "clamp(22px, 3vw, 32px)" }}>{detail.student.name}</h1>
              <span className={`pill ${status}`}>{status.replace("_", " ")}</span>
            </div>
            <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 2 }}>
              {detail.course?.title}
              {detail.student.email && (
                <span> &middot; <span style={{ fontFamily: "monospace", fontSize: 13 }}>{detail.student.email}</span></span>
              )}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <Link href={`/chat/${detail.student.course_id}/${detail.student.id}`} className="button button-secondary">
            Open chat
          </Link>
          <Link href="/dashboard" className="button button-ghost">
            &larr; Dashboard
          </Link>
        </div>
      </div>

      {/* ── Top row ── */}
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="section-label" style={{ marginBottom: 10 }}>Learning status</div>
          <span className={`pill ${status}`} style={{ fontSize: 13, padding: "4px 12px" }}>{status.replace("_", " ")}</span>
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>
            Last activity:{" "}
            {state
              ? new Date(state.last_activity).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
              : "No activity yet"}
          </p>
        </div>

        <div className="card">
          <div className="section-label" style={{ marginBottom: 10 }}>Weak topics</div>
          {state?.weak_topics.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {state.weak_topics.map((t: string) => (
                <span key={t} className="pill tag">{t}</span>
              ))}
            </div>
          ) : (
            <p className="empty">No weak topics detected</p>
          )}
          {state?.strong_topics?.length ? (
            <>
              <div className="section-label" style={{ marginTop: 14, marginBottom: 8 }}>Strong topics</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {state.strong_topics.map((t: string) => (
                  <span key={t} className="pill ahead">{t}</span>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="card">
          <div className="section-label" style={{ marginBottom: 10 }}>Active misconceptions</div>
          {state?.misconceptions.length ? (
            <ul className="list" style={{ gap: 5 }}>
              {state.misconceptions.map((m: string) => (
                <li key={m} className="list-item">
                  <span className="list-dot" style={{ background: "var(--accent)" }} />
                  <span style={{ fontSize: 13 }}>{m}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">No active misconceptions</p>
          )}
        </div>
      </div>

      {/* ── Growth + action ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-label" style={{ marginBottom: 12 }}>Growth summary</div>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
          &ldquo;{state?.growth_summary ?? "No learning history recorded yet. Encourage the student to begin using the study chat."}&rdquo;
        </p>
        <div className="action-card">
          <span className="action-card-label">Recommended action</span>
          <p>{recommendAction(state?.status, state?.weak_topics ?? [], state?.misconceptions ?? [])}</p>
        </div>
      </div>

      {/* ── Evidence ── */}
      <div className="grid grid-2">
        <div className="card">
          <div className="section-label" style={{ marginBottom: 12 }}>Learning events</div>
          {detail.learning_events.length ? (
            <div>
              {detail.learning_events.map((event) => (
                <div key={event.id} className={`event-item event-type-${event.event_type}`}>
                  <span className="event-dot" />
                  <div className="event-body">
                    <strong>{event.event_type.replace("_", " ")}</strong>
                    <span style={{ fontWeight: 600, color: "var(--ink-soft)" }}>{event.topic}</span>
                    {event.description && (
                      <span style={{ color: "var(--muted)", fontSize: 12.5 }}> — {event.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">No learning events yet</p>
          )}
        </div>

        <div className="card">
          <div className="section-label" style={{ marginBottom: 12 }}>Recent chat evidence</div>
          {detail.recent_messages.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {detail.recent_messages.slice(0, 6).map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: msg.role === "student" ? "var(--brand-pale)" : "var(--bg)",
                    border: "1px solid var(--line-soft)",
                    fontSize: 13.5,
                    lineHeight: 1.5
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      color: msg.role === "student" ? "var(--brand)" : "var(--muted)",
                      marginBottom: 4
                    }}
                  >
                    {msg.role}
                  </span>
                  {msg.content}
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

function recommendAction(status: string | undefined, weakTopics: string[], misconceptions: string[]) {
  if (status === "behind")
    return `Send extra explanation on ${weakTopics[0] ?? "the current unit"} — consider a short one-on-one check-in to surface what is blocking progress.`;
  if (status === "ahead")
    return "Student is asking advanced questions. Offer optional challenge materials or connect them with a more complex variant of the current topic.";
  if (status === "improving")
    return `Student is improving — continue normal pace. Reinforce recent progress and give one targeted example around ${weakTopics[0] ?? "the latest topic"}.`;
  if (misconceptions.length)
    return "Address the active misconception directly in office hours or a brief async note. Targeted correction now prevents compounding confusion.";
  return "Keep monitoring chat evidence and encourage the student to ask for clarification whenever they feel uncertain.";
}
