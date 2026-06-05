import { notFound } from "next/navigation";
import { butterbase } from "@/lib/butterbase";
import { JoinForm } from "./JoinForm";

export default async function JoinPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = await butterbase.getCourse(courseId);
  if (!course) notFound();

  return (
    <div className="join-wrapper">
      {/* Left — course info */}
      <div className="join-left">
        <p className="join-course-label">You have been invited to join</p>
        <h1>{course.title}</h1>
        {course.description && (
          <p style={{ marginBottom: 20 }}>{course.description}</p>
        )}
        <p>
          Study at your own pace through guided AI chat. Every question you ask
          helps build a personal learning profile your professor can see.
        </p>

        <div className="join-trust-note">
          &#128274; Your learning progress is tracked to help your professor support you better —
          not to grade you on participation.
        </div>

        <div style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.7 }}>
            Powered by Zargar &middot; XTrace persistent memory &middot; Butterbase
          </p>
        </div>
      </div>

      {/* Right — join form */}
      <div className="join-right">
        <div style={{ maxWidth: 400, width: "100%" }}>
          <h2 style={{ marginBottom: 6 }}>Enter your details</h2>
          <p className="muted" style={{ fontSize: 14, marginBottom: 28 }}>
            No account required. You will be taken directly to the study chat.
          </p>
          <JoinForm courseId={courseId} />
        </div>
      </div>
    </div>
  );
}
