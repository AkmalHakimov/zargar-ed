"use client";

import { FormEvent, useState } from "react";

export function JoinForm({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        name: form.get("name"),
        email: form.get("email")
      })
    });
    const data = await response.json();
    window.location.href = data.chatUrl;
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label className="field">
        <span className="field-label">Your name</span>
        <input
          className="input"
          name="name"
          required
          autoComplete="name"
          placeholder="Ada Lovelace"
        />
      </label>

      <label className="field">
        <span className="field-label">Your email</span>
        <span className="field-hint">Used to identify your progress — nothing else.</span>
        <input
          className="input"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="ada@university.edu"
        />
      </label>

      <button className="button button-lg" disabled={loading} style={{ marginTop: 4 }}>
        {loading ? "Joining\u2026" : "Open student dashboard \u2192"}
      </button>
    </form>
  );
}
