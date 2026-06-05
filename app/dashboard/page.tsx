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
      <div className="header-row">
        <div>
          <p className="section-eyebrow" style={{ marginBottom: 8 }}>Professor dashboard</p>
          <h1>Learning overview</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 15 }}>
            Course-level intelligence extracted from student conversations.
          </p>
        </div>
        <Link className="button" href="/courses/new">+ New course</Link>
      </div>

      {/* Top stats */}
      <div className="grid grid-4" style={{ marginBottom: 36 }}>
        <div className="stat-card">
          <span className="stat-label">Total students</span>
          <span className="stat-value">{totalStudents}</span>
          <span className="stat-sub">across all courses</span>
        </div>
        <div className="stat-card stat-behind">
          <span className="stat-label">Behind</span>
          <span className="stat-value">{totalBehind}</span>
          <span className="stat-sub">need attention now</span>
        </div>
        <div className="stat-card stat-improving">
          <span className="stat-label">Improving</span>
          <span className="stat-value">{totalImproving}</span>
          <span className="stat-sub">positive trajectory</span>
        </div>
        <div className="stat-card stat-ahead">
          <span className="stat-label">Ahead</span>
          <span className="stat-value">{totalAhead}</span>
          <span className="stat-sub">exceeding pace</span>
        </div>
      </div>

      {/* Course cards */}
      {analytics.map((item) => {
        const behind    = item.students.filter(s => s.learning_state?.status === "behind").length;
        const improving = item.students.filter(s => s.learning_state?.status === "improving").length;
        const ahead     = item.students.filter(s => s.learning_state?.status === "ahead").length;

        return (
          <div className="course-card" key={item.course.id}>
            <div className="course-card-header">
              <div style={{ flex: 1 }}>
                <h2 style={{ marginBottom: 4 }}>{item.course.title}</h2>
                <p className="muted" style={{ fontSize: 14 }}>{item.course.description}</p>
              </div>
              <div style={{ display: "flex", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
                <MiniStat label="students" value={item.studentCount} />
                {behind > 0 && <MiniStat label="behind" value={behind} color="var(--status-behind)" bg="var(--status-behind-bg)" border="var(--status-behind-border)" />}
                {improving > 0 && <MiniStat label="improving" value={improving} color="var(--status-improving)" bg="var(--status-improving-bg)" border="var(--status-improving-border)" />}
                {ahead > 0 && <MiniStat label="ahead" value={ahead} color="var(--status-ahead)" bg="var(--status-ahead-bg)" border="var(--status-ahead-border)" />}
              </div>
            </div>

            <div className="course-card-body">
              <div className="grid grid-2" style={{ marginBottom: 24 }}>
                <div>
                  <div className="section-label">Top weak topics</div>
                  <BulletList items={item.topWeakTopics.slice(0, 4)} empty="No weak topics detected yet" />
                </div>
                <div>
                  <div className="section-label">Active misconceptions</div>
                  <BulletList items={item.topMisconceptions.slice(0, 4)} empty="No misconceptions detected yet" accent />
                </div>
              </div>
              <div className="section-label">Class learning health</div>
              <StatusDistribution
                total={Math.max(item.studentCount, 1)}
                counts={{
                  behind,
                  improving,
                  ahead,
                  on_track: item.students.filter(s => (s.learning_state?.status ?? "on_track") === "on_track").length,
                  inactive: item.students.filter(s => s.learning_state?.status === "inactive").length
                }}
              />
            </div>

            <div style={{ padding: "14px 28px 0", borderTop: "1px solid var(--line)" }}>
              <div className="section-label">Student roster</div>
            </div>
            <div className="table-wrap" style={{ padding: "0 28px 24px" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Weak topics</th>
                    <th>Last activity</th>
                    <th>Growth summary</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {item.students.map((student) => {
                    const status = student.learning_state?.status ?? "on_track";
                    return (
                      <tr key={student.id}>
                        <td>
                          <div className="student-name">{student.name}</div>
                          <div className="student-email">{student.email}</div>
                        </td>
                        <td>
                          <span className={`pill ${status}`}>{status.replace("_", " ")}</span>
                        </td>
                        <td style={{ maxWidth: 180 }}>
                          {student.learning_state?.weak_topics.length
                            ? student.learning_state.weak_topics.slice(0, 2).map((t) => (
                                <span key={t} className="pill tag" style={{ marginRight: 4, marginBottom: 4 }}>{t}</span>
                              ))
                            : <span style={{ fontSize: 13, color: "var(--muted-light)" }}>None yet</span>
                          }
                        </td>
                        <td style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>
                          {student.learning_state?.last_activity
                            ? new Date(student.learning_state.last_activity).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "—"}
                        </td>
                        <td style={{ maxWidth: 240, fontSize: 13, color: "var(--ink-soft)" }}>
                          {student.learning_state?.growth_summary
                            ?? <span style={{ color: "var(--muted-light)", fontStyle: "italic" }}>No history yet</span>}
                        </td>
                        <td>
                          <Link href={`/dashboard/student/${student.id}`} className="button button-sm button-secondary">
                            View details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding: "11px 28px", background: "var(--bg)", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
              <span>Last activity: {new Date(item.lastActivity).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
              <span style={{ display: "flex", gap: 12 }}>
                <Link href={`/join/${item.course.id}`} style={{ color: "var(--brand)", fontWeight: 600 }}>Open invite page</Link>
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

function MiniStat({
  label, value, color = "var(--ink)", bg = "var(--bg)", border = "var(--line)"
}: { label: string; value: number; color?: string; bg?: string; border?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "8px 14px", background: bg, borderRadius: "var(--radius-sm)", border: `1px solid ${border}`, minWidth: 56 }}>
      <div style={{ fontSize: 20, fontFamily: "var(--font-serif)", fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", marginTop: 3, opacity: .85 }}>{label}</div>
    </div>
  );
}

function BulletList({ items, empty, accent = false }: { items: string[]; empty: string; accent?: boolean }) {
  if (!items.length) return <p className="empty">{empty}</p>;
  return (
    <ul className="list" style={{ gap: 4 }}>
      {items.map((item) => (
        <li key={item} className="list-item">
          <span className="list-dot" style={accent ? { background: "var(--accent)" } : {}} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function StatusDistribution({
  total,
  counts
}: {
  total: number;
  counts: { behind: number; improving: number; ahead: number; on_track: number; inactive: number };
}) {
  const rows = [
    ["behind", "Behind", counts.behind],
    ["improving", "Improving", counts.improving],
    ["ahead", "Ahead", counts.ahead],
    ["on_track", "On track", counts.on_track],
    ["inactive", "Inactive", counts.inactive]
  ] as const;

  return (
    <div className="status-distribution">
      {rows.map(([key, label, value]) => (
        <div className="status-bar-row" key={key}>
          <span className="status-bar-label">{label}</span>
          <span className="status-track" aria-label={`${label}: ${value}`}>
            <span className={`status-fill ${key}`} style={{ width: `${Math.max(0, (value / total) * 100)}%` }} />
          </span>
          <span className="status-bar-count">{value}</span>
        </div>
      ))}
    </div>
  );
}
