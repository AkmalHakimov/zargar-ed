"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", padding: "60px 32px" }}>
        <h2>Something went wrong</h2>
        <p style={{ color: "#6b7570", marginBottom: 24 }}>
          {error.message || "An unexpected error occurred."}
        </p>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
