import Link from "next/link";

export default function LandingPage() {
  return (
    <main>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5ecfaa", display: "inline-block" }} />
            AI-powered study &middot; persistent memory &middot; professor visibility
          </div>
          <h1>
            AI-guided self-study<br />
            professors can <em>actually see.</em>
          </h1>
          <p className="hero-sub">
            Zargar turns course materials into personalized study chats
            and gives instructors real-time visibility into each student&apos;s learning path.
          </p>
          <div className="hero-actions">
            <Link className="button button-lg button-accent" href="/courses/new">
              Create a course
            </Link>
            <Link
              className="button button-lg"
              href="/dashboard"
              style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", color: "white" }}
            >
              View dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="landing-section" style={{ background: "white", borderBottom: "1px solid var(--line)" }}>
        <div className="landing-inner">
          <p className="section-eyebrow">The problem</p>
          <h2 style={{ maxWidth: "18ch" }}>Self-study is invisible until exams.</h2>
          <p className="lead">
            Students may spend hours misunderstanding a concept, over-relying on AI,
            or quietly falling behind &mdash; and professors only find out when it&apos;s too late.
            Office hours reward those who already know they&apos;re confused.
          </p>
          <div className="grid grid-3" style={{ gap: 12 }}>
            {[
              {
                icon: "◎",
                title: "Silent confusion",
                body: "Students struggle alone with no mechanism to surface misconceptions before the exam."
              },
              {
                icon: "◈",
                title: "AI dependence",
                body: "Generic chatbots give answers without connecting them to course-specific context or verifying understanding."
              },
              {
                icon: "◉",
                title: "No early signal",
                body: "By the time a professor notices a student is behind, weeks of compounding confusion have already set in."
              }
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  padding: "22px 20px",
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-xs)"
                }}
              >
                <div style={{ fontSize: 22, color: "var(--brand)", marginBottom: 10 }}>{item.icon}</div>
                <h3 style={{ marginBottom: 8, fontSize: 15 }}>{item.title}</h3>
                <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.65 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="landing-section">
        <div className="landing-inner">
          <p className="section-eyebrow">How it works</p>
          <h2>From materials to memory in five steps.</h2>
          <p className="lead">
            A simple workflow that connects professor content, student learning,
            and persistent memory &mdash; without adding complexity for either side.
          </p>
          <div className="how-grid">
            {[
              { n: "01", title: "Upload materials", body: "Professor pastes notes, readings, or rubrics. Zargar uses them as the source of truth." },
              { n: "02", title: "Share one link",   body: "Students join with a single class invite URL. No accounts, no friction." },
              { n: "03", title: "Learn through chat", body: "Students ask questions in natural language. Responses stay grounded in course content." },
              { n: "04", title: "Memory tracks growth", body: "XTrace remembers every interaction — misconceptions, breakthroughs, and weak topics." },
              { n: "05", title: "Professor sees all", body: "A live analytics dashboard surfaces who is behind, improving, or ready for more." }
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

      {/* ── Tech stack ── */}
      <section className="landing-section" style={{ background: "white", borderTop: "1px solid var(--line)" }}>
        <div className="landing-inner">
          <p className="section-eyebrow">Technology</p>
          <h2>Built on purpose-built infrastructure.</h2>
          <p className="lead" style={{ marginBottom: 28 }}>
            Each layer of the stack handles a specific part of the learning experience.
          </p>
          <div className="tech-grid">
            {[
              { name: "RocketRide",  role: "Orchestrates the full learning workflow &mdash; routing messages, triggering memory updates, and coordinating agent responses." },
              { name: "Butterbase",  role: "Stores course data, student profiles, chat history, and real-time learning state in a structured backend." },
              { name: "XTrace",      role: "Maintains persistent per-student memory across sessions &mdash; tracking misconceptions, growth, and topic mastery over time." },
              { name: "Photon",      role: "Handles message delivery so students can interact through web, email, or other channels without leaving their workflow." }
            ].map((tech) => (
              <div className="tech-card" key={tech.name}>
                <div className="tech-card-name">{tech.name}</div>
                <div className="tech-card-role" dangerouslySetInnerHTML={{ __html: tech.role }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="landing-section"
        style={{ background: "var(--brand-dark)", color: "white", textAlign: "center" }}
      >
        <div className="landing-inner" style={{ maxWidth: 600 }}>
          <h2 style={{ color: "white", marginBottom: 14, fontSize: "clamp(26px, 4vw, 36px)" }}>
            Ready to see inside your classroom?
          </h2>
          <p style={{ color: "rgba(255,255,255,.65)", fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
            Create a course in under two minutes. Share one link.
            Watch learning happen &mdash; and catch problems before they compound.
          </p>
          <div className="hero-actions">
            <Link className="button button-lg button-accent" href="/courses/new">
              Create your first course
            </Link>
            <Link
              href="/dashboard"
              style={{ color: "rgba(255,255,255,.7)", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}
            >
              Explore the dashboard &rarr;
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
