"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: "60px clamp(18px,5vw,60px)", maxWidth: 480 }}>
      <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
      <p className="muted" style={{ marginBottom: 24, fontSize: 14 }}>
        {error.message || "An unexpected error occurred."}
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
