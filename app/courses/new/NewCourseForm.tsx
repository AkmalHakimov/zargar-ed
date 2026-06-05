"use client";

import { FormEvent, useState } from "react";

export function NewCourseForm() {
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading]       = useState(false);
  const [copied, setCopied]         = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        material: form.get("material")
      })
    });
    const data = await response.json();
    setInviteLink(`${window.location.origin}${data.inviteLink}`);
    setLoading(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label className="field">
        <span className="field-label">Course title</span>
        <input
          className="input"
          name="title"
          required
          placeholder="e.g. Intro to Machine Learning"
        />
      </label>

      <label className="field">
        <span className="field-label">Description</span>
        <span className="field-hint">Shown to students on the join page.</span>
        <input
          className="input"
          name="description"
          placeholder="What students will learn in this course"
        />
      </label>

      <label className="field">
        <span className="field-label">Course material</span>
        <span className="field-hint">
          Paste notes, readings, rubrics, or a study guide. This becomes the source of truth for all AI responses.
        </span>
        <textarea
          className="textarea"
          name="material"
          required
          style={{ minHeight: 200 }}
          placeholder={"Example:\n\nLogistic regression predicts probability using the sigmoid function. Unlike linear regression, it is used for classification tasks. The output is always between 0 and 1."}
        />
      </label>

      <div className="source-card">
        <div className="source-card-title">Source material storage</div>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
          The pasted material is saved as a course resource and used by the tutor pipeline for grounded responses.
        </div>
      </div>

      <button className="button button-lg" disabled={loading} style={{ marginTop: 4 }}>
        {loading ? "Creating course…" : "Create course & get invite link"}
      </button>

      {inviteLink && (
        <div className="invite-card" style={{ marginTop: 8 }}>
          <div>
            <div className="invite-card-label">Class invite link — ready to share</div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
              Share this with your students. Anyone with the link can join and begin studying.
            </p>
          </div>
          <div className="copy-row">
            <div className="invite-url">{inviteLink}</div>
            <button type="button" className="button button-secondary button-sm" onClick={copyLink}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
