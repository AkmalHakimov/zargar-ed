"use client";

import { FormEvent, useState } from "react";

export function NewCourseForm() {
  const [inviteLink, setInviteLink]       = useState("");
  const [loading, setLoading]             = useState(false);
  const [copied, setCopied]               = useState(false);
  const [files, setFiles]                 = useState<File[]>([]);
  const [savedFileCount, setSavedFileCount] = useState(0);
  const [hasSavedMaterial, setHasSavedMaterial] = useState(false);
  const [error, setError]                 = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const material = String(form.get("material") ?? "").trim();
    if (!material && files.length === 0) {
      setError("Add at least one material file or paste course material.");
      setLoading(false);
      return;
    }

    const pendingFileCount = files.length;
    const pendingMaterial = !!material;

    // Explicitly append files from React state so they're always included,
    // regardless of browser/DOM quirks with sr-only file inputs inside nested labels.
    form.delete("files");
    for (const file of files) {
      form.append("files", file);
    }

    const response = await fetch("/api/courses", {
      method: "POST",
      body: form
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not create the course.");
      setLoading(false);
      return;
    }
    setSavedFileCount(pendingFileCount);
    setHasSavedMaterial(pendingMaterial);
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
          Upload files, paste notes, or do both. These resources become the source of truth for student AI chat.
        </span>
        <label className="upload-card material-upload-card">
          <input
            className="sr-only"
            name="files"
            type="file"
            multiple
            accept=".pdf,.txt,.md,.mdx,.csv,.json,.html,.xml,.yaml,.yml,.js,.jsx,.ts,.tsx,.py,application/pdf,text/*,application/json,application/xml"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          <div className="upload-icon">+</div>
          <div className="upload-title">Upload material files</div>
          <div className="upload-copy">PDF, text, Markdown, CSV, JSON, HTML, XML, YAML, and code files are supported.</div>
        </label>
        {files.length > 0 && (
          <div className="file-list">
            {files.map((file) => (
              <div className="file-pill" key={`${file.name}-${file.size}`}>
                <span>{file.name}</span>
                <span>{formatBytes(file.size)}</span>
              </div>
            ))}
          </div>
        )}
        <textarea
          className="textarea"
          name="material"
          style={{ minHeight: 200 }}
          placeholder={"Optional pasted material:\n\nLogistic regression predicts probability using the sigmoid function. Unlike linear regression, it is used for classification tasks. The output is always between 0 and 1."}
        />
      </label>

      <div className="source-card">
        <div className="source-card-title">Source material storage</div>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
          Each uploaded file is saved as a course resource and used by the tutor pipeline for grounded responses.
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <button className="button button-lg" disabled={loading} style={{ marginTop: 4 }}>
        {loading ? "Creating course…" : "Create course & get invite link"}
      </button>

      {inviteLink && (
        <div className="invite-card" style={{ marginTop: 8 }}>
          <div>
            <div className="invite-card-label">Course created — invite link ready</div>
            {(savedFileCount > 0 || hasSavedMaterial) && (
              <p style={{ fontSize: 13, color: "var(--brand)", marginTop: 4, marginBottom: 2, fontWeight: 600 }}>
                ✓{savedFileCount > 0 ? ` ${savedFileCount} file${savedFileCount !== 1 ? "s" : ""} uploaded` : ""}
                {savedFileCount > 0 && hasSavedMaterial ? " + " : ""}
                {hasSavedMaterial ? "pasted material saved" : ""}
                {" "}as course resources
              </p>
            )}
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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
