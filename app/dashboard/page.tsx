import Link from "next/link";
import { butterbase } from "@/lib/butterbase";

export default async function DashboardPage() {
  const analytics = await butterbase.getDashboardAnalytics();

  const totalStudents  = analytics.reduce((s, a) => s + a.studentCount, 0);
  const totalBehind    = analytics.reduce((s, a) => s + a.students.filter(st => st.learning_state?.status === "behind").length, 0);
  const totalImproving = analytics.reduce((s, a) => s + a.students.filter(st => st.learning_state?.status === "improving").length, 0);
  const totalAhead     = analytics.reduce((s, a) => s + a.students.filter(st => st.learning_state?.status === "ahead").length, 0);

  return (
    <main className="page">

      {/* ── Page header ── */}
      <div style={{ marginBottom: 32 }}>
        {/* Brand bar */}
        <div style={{
          background: "var(--brand)",
          borderRadius: "var(--radius) var(--radius) 0 0",
          padding: "11px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Pulsing live dot */}
            <span style={{
              display: "inline-block", width: 7, height: 7, borderRadius: "50%",
              background: "#7edbb5",
              boxShadow: "0 0 0 3px rgba(126,219,181,0.25)",
            }} />
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11.5, fontWeight: 600, letterSpacing: ".09em", textTransform: "uppercase" }}>
              Zargar · Professor view
            </span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11.5 }}>
            {analytics.length} course{analytics.length !== 1 ? "s" : ""} · AI-powered
          </span>
        </div>

        {/* Title row */}
        <div style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderTop: "none",
          borderRadius: "0 0 var(--radius) var(--radius)",
          padding: "22px 24px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}>
          <div>
            <h1 style={{ fontSize: "clamp(22px,3vw,32px)", fontFamily: "var(--font-serif)", marginBottom: 5, lineHeight: 1.15 }}>
              Class signals
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <span><strong style={{ color: "var(--ink)", fontWeight: 600 }}>{totalStudents}</strong> students enrolled</span>
              {totalBehind > 0 && (
                <span style={{ color: "var(--status-behind)", fontWeight: 600 }}>⚠ {totalBehind} need attention</span>
              )}
              <span style={{ color: "var(--status-improving)" }}>{totalImproving} improving</span>
              <span style={{ color: "var(--status-ahead)" }}>{totalAhead} ahead</span>
            </p>
          </div>
          <Link className="button" href="/courses/new" style={{ flexShrink: 0 }}>+ New course</Link>
        </div>
      </div>


      {/* ── Per-course sections ── */}
      {analytics.map((item) => {
        const behind    = item.students.filter(s => s.learning_state?.status === "behind").length;
        const improving = item.students.filter(s => s.learning_state?.status === "improving").length;
        const ahead     = item.students.filter(s => s.learning_state?.status === "ahead").length;
        const onTrack   = item.students.filter(s => (s.learning_state?.status ?? "on_track") === "on_track").length;

        return (
          <div
            key={item.course.id}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              marginBottom: 24,
            }}
          >
            {/* Course header */}
            <div
              style={{
                padding: "20px 28px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 24,
              }}
            >
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 3 }}>{item.course.title}</h2>
                {item.course.description && (
                  <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{item.course.description}</p>
                )}
              </div>

              {/* Inline stats */}
              <div style={{ display: "flex", gap: 24, flexShrink: 0, alignItems: "center" }}>
                {[
                  { n: item.studentCount, label: "students",  color: "var(--ink)"              },
                  { n: ahead,             label: "ahead",     color: "var(--status-ahead)"      },
                  { n: improving,         label: "improving", color: "var(--status-improving)"  },
                  { n: behind,            label: "behind",    color: "var(--status-behind)"     },
                  { n: onTrack,           label: "on track",  color: "var(--muted)"             },
                ].map(({ n, label, color }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-serif)", color, lineHeight: 1 }}>{n}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color, opacity: .75, letterSpacing: ".04em", textTransform: "uppercase", marginTop: 2 }}>{label}</div>
                  </div>
                ))}
                <Link
                  href={`/join/${item.course.id}`}
                  style={{ fontSize: 13, color: "var(--brand)", fontWeight: 600, textDecoration: "none", marginLeft: 8 }}
                >
                  Invite link ↗
                </Link>
              </div>
            </div>

            {/* Weak topics + misconceptions summary bar */}
            {(item.topWeakTopics.length > 0 || item.topMisconceptions.length > 0) && (
              <div
                style={{
                  padding: "10px 28px",
                  borderBottom: "1px solid var(--line-soft)",
                  background: "var(--bg)",
                  display: "flex",
                  gap: 32,
                  flexWrap: "wrap",
                  alignItems: "baseline",
                }}
              >
                {item.topWeakTopics.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>
                      Class struggles with
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {item.topWeakTopics.slice(0, 4).map(t => (
                        <span key={t} className="pill tag" style={{ fontSize: 11 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {item.topMisconceptions.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>
                      Misconceptions
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {item.topMisconceptions.slice(0, 2).map(m => (
                        <span key={m} style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500 }}>
                          {m.length > 50 ? m.slice(0, 48) + "…" : m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Student table */}
            {item.students.length === 0 ? (
              <div style={{ padding: "40px 28px", textAlign: "center" }}>
                <p style={{ color: "var(--muted)", fontSize: 14, fontStyle: "italic" }}>
                  No students have joined yet.{" "}
                  <Link href={`/join/${item.course.id}`} style={{ color: "var(--brand)", fontWeight: 600 }}>Share the invite link</Link>
                </p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line-soft)", background: "var(--bg)" }}>
                    {["Student", "Status", "Last active", "Weak topics", "Growth signal", ""].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "9px 16px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: ".07em",
                          textTransform: "uppercase",
                          color: "var(--muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {item.students.map((student, idx) => {
                    const status    = student.learning_state?.status ?? "on_track";
                    const isBehind  = status === "behind";
                    const isAhead   = status === "ahead";
                    const lastDate  = student.learning_state?.last_activity;
                    const growth    = student.learning_state?.growth_summary ?? "";

                    return (
                      <tr
                        key={student.id}
                        style={{
                          borderBottom: idx < item.students.length - 1 ? "1px solid var(--line-soft)" : "none",
                          borderLeft: isBehind
                            ? "3px solid var(--status-behind)"
                            : isAhead
                            ? "3px solid var(--status-ahead)"
                            : "3px solid transparent",
                          background: isBehind ? "var(--status-behind-bg)" : "var(--panel)",
                        }}
                      >
                        {/* Name */}
                        <td style={{ padding: "12px 16px", minWidth: 160 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{student.name}</div>
                          {student.email && (
                            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{student.email}</div>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          <span className={`pill ${status}`} style={{ fontSize: 12 }}>
                            {status.replace("_", " ")}
                          </span>
                        </td>

                        {/* Last active */}
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>
                          {lastDate
                            ? new Date(lastDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : <span style={{ color: "var(--muted-light)" }}>Never</span>}
                        </td>

                        {/* Weak topics */}
                        <td style={{ padding: "12px 16px", maxWidth: 200 }}>
                          {student.learning_state?.weak_topics.length ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {student.learning_state.weak_topics.slice(0, 2).map(t => (
                                <span key={t} className="pill tag" style={{ fontSize: 11 }}>{t}</span>
                              ))}
                              {student.learning_state.weak_topics.length > 2 && (
                                <span style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center" }}>
                                  +{student.learning_state.weak_topics.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--muted-light)" }}>—</span>
                          )}
                        </td>

                        {/* Growth signal */}
                        <td style={{ padding: "12px 16px", maxWidth: 260 }}>
                          {growth ? (
                            <span style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.45, display: "block" }}>
                              {growth.length > 90 ? growth.slice(0, 88) + "…" : growth}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--muted-light)", fontStyle: "italic" }}>No data yet</span>
                          )}
                        </td>

                        {/* Action */}
                        <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <Link href={`/dashboard/student/${student.id}`} className="button button-sm button-secondary">
                            Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Footer */}
            <div
              style={{
                padding: "10px 28px",
                background: "var(--bg)",
                borderTop: "1px solid var(--line-soft)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                Last activity:{" "}
                {new Date(item.lastActivity).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              </span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {item.studentCount} student{item.studentCount !== 1 ? "s" : ""} enrolled
              </span>
            </div>
          </div>
        );
      })}

      {analytics.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 24px" }}>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--muted)", marginBottom: 20 }}>
            No courses yet.
          </p>
          <Link className="button" href="/courses/new">Create your first course</Link>
        </div>
      )}
    </main>
  );
}
