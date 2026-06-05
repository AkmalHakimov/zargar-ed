import Link from "next/link";

export default function LandingPage() {
  return (
    <main>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-eyebrow">
            For professors who actually want to know
          </div>
          <h1>
            Right now, one of<br />
            your students is <em>lost.</em>
          </h1>
          <p className="hero-sub">
            They misunderstood something three weeks ago and have been building
            on top of that mistake ever since. They won&apos;t ask. You won&apos;t find out
            until the exam.
          </p>
          <div className="hero-actions">
            <Link className="button button-lg button-accent" href="/courses/new">
              Create a course — it&apos;s free
            </Link>
            <Link
              className="button button-lg"
              href="/dashboard"
              style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", color: "rgba(255,255,255,.85)" }}
            >
              See the dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── The honest section ── */}
      <section className="landing-section" style={{ background: "white", borderBottom: "1px solid var(--line)" }}>
        <div className="landing-inner" style={{ maxWidth: 820 }}>
          <span className="section-eyebrow">The problem with self-study</span>
          <h2 style={{ maxWidth: "22ch", marginBottom: 28 }}>
            Office hours reward students who already know they&apos;re confused.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px 64px" }}>
            <div>
              <p style={{ fontSize: 16, lineHeight: 1.78, color: "var(--ink-soft)" }}>
                The students who most need help are also the least likely to ask for it.
                They don&apos;t go to office hours. They don&apos;t post on forums.
                They quietly struggle — and the only signal you get is a disappointing grade.
              </p>
            </div>
            <div>
              <p style={{ fontSize: 16, lineHeight: 1.78, color: "var(--ink-soft)" }}>
                Generic AI tools make it worse: they give students answers without building
                understanding, they don&apos;t know your course materials, and they leave
                no trace for the instructor to follow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What Zargar actually is ── */}
      <section className="landing-section">
        <div className="landing-inner">
          <span className="section-eyebrow">What Zargar does</span>
          <h2 style={{ marginBottom: 16 }}>A tutor that knows your course.<br />A window you&apos;ve never had before.</h2>
          <p className="lead">
            Students get a patient, grounded AI tutor — one that only ever answers from
            your uploaded materials. You get a live dashboard showing exactly who is
            struggling, what they&apos;re confused about, and who is ready for more.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* For students */}
            <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--line)", background: "var(--brand-pale)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--brand)", marginBottom: 6 }}>For students</div>
                <h3 style={{ fontSize: 18 }}>Ask anything, at 2am if needed.</h3>
              </div>
              <div style={{ padding: "24px 28px", display: "grid", gap: 14 }}>
                {[
                  ["Grounded answers", "Every explanation comes from your professor\u2019s actual materials\u2014not the internet."],
                  ["Builds real understanding", "Zargar asks follow-up questions. It won\u2019t just hand you the answer."],
                  ["Remembers your journey", "Your learning history persists across sessions. It knows where you left off."],
                  ["No account needed", "Join with a link. Start studying immediately."]
                ].map(([title, body]) => (
                  <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand)", flexShrink: 0, marginTop: 7 }} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>{title}</div>
                      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* For professors */}
            <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--line)", background: "var(--gold-light)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 6 }}>For professors</div>
                <h3 style={{ fontSize: 18 }}>See inside the learning, not just the exam.</h3>
              </div>
              <div style={{ padding: "24px 28px", display: "grid", gap: 14 }}>
                {[
                  ["Who is behind — now", "Not after the midterm. Zargar surfaces confusion and misconceptions as they happen."],
                  ["What they\u2019re stuck on", "See the specific topics and concepts causing problems, ranked by frequency."],
                  ["Who is ready for more", "Identify your most advanced students so you can challenge them appropriately."],
                  ["Works on any platform", "Students can chat via web, WhatsApp, iMessage, or wherever they already are."]
                ].map(([title, body]) => (
                  <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", flexShrink: 0, marginTop: 7 }} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>{title}</div>
                      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it actually works ── */}
      <section className="landing-section" style={{ background: "white", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div className="landing-inner">
          <span className="section-eyebrow">The workflow</span>
          <h2 style={{ marginBottom: 14 }}>From your notes to a live learning signal in minutes.</h2>
          <p className="lead">No integration, no IT ticket, no student account creation.</p>
          <div className="how-grid">
            {[
              { n: "01", title: "Paste your materials", body: "Drop in lecture notes, readings, or a rubric. Zargar uses only what you give it." },
              { n: "02", title: "Share one link",        body: "Students join your course with a URL. Name and email — that\u2019s it." },
              { n: "03", title: "They study, it listens", body: "Every question a student asks reveals something. Zargar tracks it all." },
              { n: "04", title: "Memory accumulates",    body: "XTrace builds a persistent profile of each student\u2019s misconceptions and growth." },
              { n: "05", title: "You act early",         body: "Your dashboard shows who needs attention today — before the exam tells you." }
            ].map((step) => (
              <div className="how-step" key={step.n}>
                <div className="how-step-num">Step {step.n}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Try it now ── */}
      <section className="landing-section" style={{ background: "var(--brand-dark)", color: "white" }}>
        <div className="landing-inner" style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 48 }}>
          <div>
            <span style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 16 }}>
              Ready when you are
            </span>
            <h2 style={{ color: "white", fontSize: "clamp(24px, 3.5vw, 38px)", marginBottom: 14 }}>
              Two minutes to set up.<br />
              <em style={{ color: "#8FD4B0" }}>A semester&apos;s worth of insight.</em>
            </h2>
            <p style={{ color: "rgba(255,255,255,.58)", fontSize: 16, lineHeight: 1.72, maxWidth: "52ch" }}>
              Create a course, upload your materials, share the link with students.
              The dashboard starts filling up the moment they begin asking questions.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>
            <Link className="button button-lg button-accent" href="/courses/new">
              Create a course →
            </Link>
            <Link
              href="/chat/course_ai101/student_maya"
              style={{ fontSize: 13.5, color: "rgba(255,255,255,.5)", textAlign: "center", display: "block", padding: "6px 0" }}
            >
              or try the live demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer note ── */}
      <div style={{ background: "#FAF8F2", borderTop: "1px solid var(--line)", padding: "20px clamp(24px,6vw,80px)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
          Zargar · Built with RocketRide, XTrace, Butterbase & Photon
        </span>
        <div style={{ display: "flex", gap: 24 }}>
          <Link href="/dashboard" style={{ fontSize: 12.5, color: "var(--muted)" }}>Professor dashboard</Link>
          <Link href="/courses/new" style={{ fontSize: 12.5, color: "var(--muted)" }}>Create course</Link>
          <Link href="/chat/course_ai101/student_maya" style={{ fontSize: 12.5, color: "var(--muted)" }}>Live demo</Link>
        </div>
      </div>

    </main>
  );
}
