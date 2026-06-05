import Link from "next/link";
import { NewCourseForm } from "./NewCourseForm";

export default function NewCoursePage() {
  return (
    <div className="setup-split">
      <div className="setup-panel-dark">
        <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#5ecfaa", marginBottom: 20 }}>
          Step 1 of 2
        </p>
        <h1 style={{ color: "white", fontSize: "clamp(26px, 4vw, 38px)", marginBottom: 16 }}>
          Set up your course.
        </h1>
        <p style={{ color: "rgba(255,255,255,.7)", fontSize: 15, lineHeight: 1.75, maxWidth: "42ch" }}>
          Paste your course materials — notes, readings, study guides — and Zargar will
          use them as the source of truth for every student conversation.
        </p>
        <div className="setup-step-list">
          {[
            { num: "01", text: "Paste or upload your course content" },
            { num: "02", text: "Get a shareable join link instantly" },
            { num: "03", text: "Students start learning through chat" }
          ].map((step) => (
            <div className="setup-step" key={step.num}>
              <span className="setup-step-num">{step.num}</span>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,.7)", lineHeight: 1.5 }}>{step.text}</span>
            </div>
          ))}
        </div>
        <div className="setup-back">
          <Link href="/dashboard">Back to dashboard</Link>
        </div>
      </div>

      <div className="setup-panel-light">
        <h2 style={{ marginBottom: 6 }}>Course details</h2>
        <p className="muted" style={{ fontSize: 14, marginBottom: 28 }}>
          These details are shown to students on the join page.
        </p>
        <NewCourseForm />
      </div>
    </div>
  );
}
