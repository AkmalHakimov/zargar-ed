"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { ChatMessage, StudentLearningState } from "@/lib/types";

export function ChatClient({
  courseId,
  studentId,
  initialMessages,
  initialState
}: {
  courseId: string;
  studentId: string;
  initialMessages: ChatMessage[];
  initialState: StudentLearningState | null;
}) {
  const [messages, setMessages]           = useState(initialMessages);
  const [learningState, setLearningState] = useState(initialState);
  const [loading, setLoading]             = useState(false);
  const formRef                           = useRef<HTMLFormElement>(null);
  const messagesEndRef                    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const form = new FormData(event.currentTarget);
    const message = String(form.get("message") ?? "").trim();
    if (!message) return;
    setLoading(true);
    setMessages((cur) => [
      ...cur,
      {
        id: `optimistic_${Date.now()}`,
        course_id: courseId,
        student_id: studentId,
        role: "student",
        content: message,
        platform: "web",
        created_at: new Date().toISOString()
      }
    ]);
    formRef.current?.reset();
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, studentId, message, platform: "web" })
      });
      if (!response.ok) throw new Error("Chat request failed");
      const data = await response.json();
      setMessages((cur) => [...cur, data.tutorMessage]);
      setLearningState(data.learningState);
    } catch {
      setMessages((cur) => [
        ...cur,
        {
          id: `error_${Date.now()}`,
          course_id: courseId,
          student_id: studentId,
          role: "tutor",
          content: "I could not reach the study backend. Try sending that again.",
          platform: "web",
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  const status = learningState?.status ?? "on_track";

  return (
    <div className="chat-layout">
      {/* Chat panel */}
      <div className="chat-panel">
        <div className="chat-panel-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--brand-dark)" }}>
              AI Study Chat
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="messages">
          {messages.length === 0 && (
            <div
              style={{
                margin: "auto",
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--muted)",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 16,
                maxWidth: "36ch"
              }}
            >
              Ask anything about the course material. Your questions help track your learning.
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`bubble ${msg.role}`}>
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="bubble tutor" style={{ color: "var(--muted)", fontStyle: "italic" }}>
              Thinking through the course material&#8230;
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <form ref={formRef} onSubmit={onSubmit}>
            <div className="chat-input-row">
              <textarea
                className="input textarea"
                name="message"
                required
                placeholder="Ask about a concept, request an explanation, or test your understanding…"
                style={{ minHeight: 48, maxHeight: 120, resize: "none", flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button className="button" disabled={loading} style={{ alignSelf: "flex-end", minHeight: 48, padding: "0 20px" }}>
                Send
              </button>
            </div>
            <p className="chat-notice">
              Zargar uses course resources and learning history to personalize explanations.
              Press Enter to send, Shift+Enter for a new line.
            </p>
          </form>
        </div>
      </div>

      {/* Sidebar */}
      <div className="chat-sidebar">
        {/* Learning status */}
        <div className="sidebar-card">
          <h3>Learning memory</h3>
          <div style={{ marginBottom: 12 }}>
            <span className={`pill ${status}`} style={{ fontSize: 12 }}>{status.replace("_", " ")}</span>
          </div>
          <div className="sidebar-row">
            <span className="key">Last update</span>
            <span style={{ fontSize: 12.5 }}>
              {learningState?.last_activity
                ? new Date(learningState.last_activity).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "—"}
            </span>
          </div>
          {learningState?.growth_summary && (
            <p style={{ marginTop: 10, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, fontStyle: "italic" }}>
              &ldquo;{learningState.growth_summary}&rdquo;
            </p>
          )}
        </div>

        {/* Weak topics */}
        <div className="sidebar-card">
          <h3>Weak topics</h3>
          {learningState?.weak_topics?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {learningState.weak_topics.map((t) => (
                <span key={t} className="pill tag" style={{ alignSelf: "flex-start" }}>{t}</span>
              ))}
            </div>
          ) : (
            <p className="empty">No weak topics detected yet</p>
          )}

          {learningState?.misconceptions?.length ? (
            <>
              <div style={{ marginTop: 14, marginBottom: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)" }}>
                Misconceptions
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {learningState.misconceptions.map((m) => (
                  <div key={m} style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5, padding: "6px 8px", background: "var(--accent-light)", borderRadius: "var(--radius-sm)", border: "1px solid #f5c4b0" }}>
                    {m}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Course context */}
        <div className="sidebar-card">
          <h3>Session context</h3>
          <div className="sidebar-row">
            <span className="key">Course</span>
          </div>
          <div className="sidebar-row" style={{ paddingTop: 4 }}>
            <span style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.4 }}>
              All responses are grounded in your professor&apos;s uploaded materials.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
