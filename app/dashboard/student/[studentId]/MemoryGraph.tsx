"use client";

import { useEffect, useState } from "react";

export interface GraphNode {
  id: string;
  label: string;
  type: "strong" | "weak" | "misconception" | "improving";
  count: number;
}

const COLOR: Record<GraphNode["type"], string> = {
  strong:        "#4ade80",
  weak:          "#f87171",
  misconception: "#fb923c",
  improving:     "#60a5fa",
};

const GLOW: Record<GraphNode["type"], string> = {
  strong:        "rgba(74,222,128,0.35)",
  weak:          "rgba(248,113,113,0.35)",
  misconception: "rgba(251,146,60,0.35)",
  improving:     "rgba(96,165,250,0.35)",
};

const LEGEND: { type: GraphNode["type"]; label: string }[] = [
  { type: "strong",        label: "Mastered" },
  { type: "improving",     label: "Improving" },
  { type: "weak",          label: "Needs work" },
  { type: "misconception", label: "Misconception" },
];

function deterministicAngle(label: string, index: number, total: number): number {
  // Spread evenly but nudge each node slightly with a label hash for organic feel
  const base = (index / total) * 2 * Math.PI - Math.PI / 2;
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) & 0xffffff;
  const nudge = ((hash % 40) - 20) * (Math.PI / 180); // ±20° nudge
  return base + nudge;
}

function deterministicRadius(label: string, baseRadius: number): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 17 + label.charCodeAt(i)) & 0xffffff;
  return baseRadius + (hash % 40) - 20; // ±20px variation
}

export function MemoryGraph({
  nodes,
  studentName,
  totalMessages,
}: {
  nodes: GraphNode[];
  studentName: string;
  totalMessages: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 80); }, []);

  const W = 640;
  const H = 380;
  const cx = W / 2;
  const cy = H / 2;
  const BASE_R = 148;

  const initials = studentName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const positioned = nodes.map((node, i) => {
    const angle = deterministicAngle(node.label, i, nodes.length);
    const r = deterministicRadius(node.label, BASE_R);
    return { ...node, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const isEmpty = nodes.length === 0;

  return (
    <div
      style={{
        background: "#0b1120",
        borderRadius: 14,
        padding: "20px 24px 16px",
        border: "1px solid rgba(94,234,212,0.15)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#5eead4",
              boxShadow: "0 0 8px #5eead4",
              animation: "xt-pulse 2.4s ease-in-out infinite",
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5eead4" }}>
            XTrace Memory Graph
          </span>
        </div>
        <span style={{ fontSize: 11, color: "#4b5563", fontWeight: 500 }}>
          {nodes.length} node{nodes.length !== 1 ? "s" : ""} · {totalMessages} message{totalMessages !== 1 ? "s" : ""}
        </span>
      </div>

      {/* SVG graph */}
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "none" : "scale(0.97)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block", margin: "0 -4px" }}
        >
          <defs>
            {/* Center glow filter */}
            <filter id="xt-glow-center" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="10" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Node glow filter */}
            <filter id="xt-glow-node" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Radial grid */}
            <radialGradient id="xt-grid-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="rgba(94,234,212,0.06)" />
              <stop offset="100%" stopColor="rgba(94,234,212,0)" />
            </radialGradient>
          </defs>

          {/* Background radial gradient */}
          <ellipse cx={cx} cy={cy} rx={200} ry={170} fill="url(#xt-grid-grad)" />

          {/* Grid rings */}
          {[70, 120, 170].map((r) => (
            <circle key={r} cx={cx} cy={cy} r={r}
              fill="none" stroke="rgba(94,234,212,0.06)" strokeWidth={1} strokeDasharray="3 6" />
          ))}

          {isEmpty ? (
            <text x={cx} y={cy + 60} textAnchor="middle" fill="#374151" fontSize={12} fontFamily="'DM Sans', sans-serif">
              Memory graph will appear after the first chat session
            </text>
          ) : (
            <>
              {/* Connection lines */}
              {positioned.map((node) => (
                <line
                  key={`line-${node.id}`}
                  x1={cx} y1={cy}
                  x2={node.x} y2={node.y}
                  stroke={COLOR[node.type]}
                  strokeOpacity={0.22}
                  strokeWidth={1.2}
                />
              ))}

              {/* Topic nodes */}
              {positioned.map((node) => {
                const truncated = node.label.length > 18 ? node.label.slice(0, 16) + "…" : node.label;
                // Decide label placement (avoid overlap with center)
                const textAnchor = node.x < cx - 20 ? "end" : node.x > cx + 20 ? "start" : "middle";
                const labelDx = node.x < cx - 20 ? -14 : node.x > cx + 20 ? 14 : 0;
                const labelDy = node.y < cy ? -13 : 16;
                return (
                  <g key={node.id} filter="url(#xt-glow-node)">
                    {/* Outer glow ring */}
                    <circle cx={node.x} cy={node.y} r={node.count > 1 ? 13 : 10}
                      fill={GLOW[node.type]} />
                    {/* Main dot */}
                    <circle cx={node.x} cy={node.y} r={6}
                      fill={COLOR[node.type]} />
                    {/* Count badge */}
                    {node.count > 1 && (
                      <text x={node.x} y={node.y + 4} textAnchor="middle"
                        fill="#0b1120" fontSize={8} fontWeight="700" fontFamily="'DM Sans', sans-serif">
                        {node.count}
                      </text>
                    )}
                    {/* Label */}
                    <text
                      x={node.x + labelDx}
                      y={node.y + labelDy}
                      textAnchor={textAnchor}
                      fill="#d1d5db"
                      fontSize={10.5}
                      fontFamily="'DM Sans', sans-serif"
                      fontWeight="500"
                    >
                      {truncated}
                    </text>
                  </g>
                );
              })}
            </>
          )}

          {/* Center node */}
          <g filter="url(#xt-glow-center)">
            <circle cx={cx} cy={cy} r={42} fill="rgba(94,234,212,0.06)" />
            <circle cx={cx} cy={cy} r={28} fill="rgba(94,234,212,0.12)" />
            <circle cx={cx} cy={cy} r={18} fill="#5eead4" />
          </g>
          <text x={cx} y={cy + 5} textAnchor="middle"
            fill="#0b1120" fontSize={12} fontWeight="700" fontFamily="'DM Sans', sans-serif">
            {initials}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {LEGEND.map(({ type, label }) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: COLOR[type], boxShadow: `0 0 6px ${COLOR[type]}` }} />
            <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#374151", fontFamily: "'DM Sans', sans-serif" }}>
          powered by XTrace
        </div>
      </div>

      <style>{`
        @keyframes xt-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #5eead4; }
          50%       { opacity: 0.5; box-shadow: 0 0 3px #5eead4; }
        }
      `}</style>
    </div>
  );
}
