# Zargar — Agent & AI Pipeline Architecture

## Overview

Every student message triggers a multi-step AI pipeline. The pipeline combines **XTrace** (semantic long-term memory), **Butterbase** (structured storage), and **Claude** (language model) to produce grounded, personalized tutor responses and update the professor's analytics dashboard.

```
Student message
      │
      ▼
 Save to DB ──────────────────────────────────┐
      │                                        │
      ▼                                        │
 Parallel fetch:                               │
   • Course resources (Butterbase)             │
   • Recent messages (Butterbase)              │
   • Student memory (XTrace recall)            │
      │                                        │
      ▼                                        │
 Tutor pipeline (Claude)                       │
   • Topic detection                           │
   • Context retrieval (from resources)        │
   • Generate grounded response                │
      │                                        │
      ▼                                        │
 Save tutor response to DB ◄───────────────────┘
      │
      ├──► XTrace ingest (background, async)
      │       Extracts semantic facts from the turn
      │
      ├──► Extract learning signals
      │       XTrace vector search → or heuristic fallback
      │
      └──► Update learning state + events (Butterbase)
              Dashboard reflects immediately
```

---

## Components

### 1. `lib/agent.ts` — Pipeline orchestrator

Entry point: `processStudentMessage({ courseId, studentId, message, platform })`

Coordinates all steps in sequence. The only file that touches both XTrace and Butterbase in the same call. Returns `{ response, studentMessage, tutorMessage, facts, learningState }`.

---

### 2. `lib/rocketride.ts` — Tutor response generation

**Primary path — Claude (Anthropic API):**
- Model: `claude-haiku-4-5-20251001`, max_tokens: 512
- Uses `undici` fetch directly (Next.js 15 patches global `fetch` and strips auth headers)
- System prompt injects course materials + student memory
- Returns `null` on error → fallback activates

**Fallback path — Template responses:**
- Triggers when `ANTHROPIC_API_KEY` is missing or Claude returns an error
- Uses regex heuristics on the message to detect confusion/homework risk/outside-context
- Finds an "anchor" quote from course materials via `.split(/[.!?]/)` matching
- Always returns something useful — never a blank response

**Topic detection (`detectCourseTopic`):**
- Scans resource content for 5+ character words
- Scores them by how many appear in the student's message
- Returns top-matching term as the "topic" for context retrieval

**Context retrieval (`retrieveRelevantCourseContext`):**
- Filters resources whose content contains the detected topic
- Falls back to first 2 resources if nothing matches
- Formats as `## {title}\n{content}`, sliced to 3000 chars

---

### 3. `lib/xtrace.ts` — Long-term semantic memory

XTrace stores and recalls per-student learning memories across sessions. Each memory is a semantic fact extracted from conversation turns by XTrace's LLM.

**Scoping:** `user_id = "${courseId}__${studentId}"` — memories are siloed per student per course.

#### `readStudentMemory(courseId, studentId)`
- Calls `client.memories.recall({ query: "learning history...", pools: [{ user_id }] })`
- Returns `result.prompt` — a pre-formatted markdown context block ready to inject into the Claude system prompt
- Falls back to local JSON if XTrace credentials are missing

#### `ingestConversationTurn(courseId, studentId, studentMessage, tutorResponse)`
- Calls `client.memories.ingest({ messages, user_id, conv_id })`
- XTrace's LLM automatically extracts facts (misconceptions, breakthroughs, confusion signals)
- Fire-and-forget — polls in background, doesn't block the student response
- `conv_id` format: `zargar_${courseId}_${studentId}`

#### `extractLearningSignals(message, tutorResponse, courseContext, previousMemory, courseId, studentId)`
- With XTrace: runs 4 parallel vector searches scoped to the student:
  - Confusion signals
  - Progress/mastery signals
  - Misconception signals
  - Advanced question signals
- Returns `LearningFact[]` typed by signal: `"confusion" | "mastery" | "improvement" | "misconception" | "advanced_question"`
- Falls back to regex heuristics (`heuristicExtract`) if XTrace returns nothing (common on first 1-2 messages while ingestion is pending)

#### Local fallback
When `XTRACE_API_KEY` / `XTRACE_ORG_ID` are not set, all operations use `.data/xtrace-memory.json`. Facts are stored in a `MemoryDb` keyed by namespace `course:{courseId}:student:{studentId}`.

---

### 4. `lib/butterbase.ts` — Structured storage

Dual-mode: remote Butterbase API or local JSON (`.data/zargar.json`).

Controlled by `BUTTERBASE_MODE=remote` env var.

**Remote mode** uses a PostgREST-style REST API. Filter format: `{ field: "eq.value" }`.

Key methods used by the pipeline:

| Method | Purpose |
|---|---|
| `listCourseResources(courseId)` | Fetches all uploaded course material for context |
| `listRecentMessages(courseId, studentId, limit)` | Last N messages for conversation history |
| `saveMessage({ course_id, student_id, role, content, platform })` | Persists student + tutor messages |
| `upsertLearningState(courseId, studentId, facts, summary)` | Updates per-student status + topics |
| `saveLearningEvents(courseId, studentId, facts, evidenceMessageId)` | Appends timestamped learning events |
| `getDashboardAnalytics()` | Aggregated per-course stats for professor dashboard |

---

### 5. `app/api/courses/route.ts` — Course + resource ingestion

Handles `POST /api/courses` as `multipart/form-data`.

**File processing pipeline:**
1. `request.formData()` — parses multipart body
2. `form.getAll("files")` — gets all uploaded File objects (filtered by `size > 0`)
3. `isReadableTextFile(file)` — validates MIME type + extension (PDF, text, md, csv, json, html, yaml, code)
4. `extractFileText(file)` — PDF → `PDFParse.getText()`, everything else → `file.text()`
5. Content sliced to 200,000 chars before storage
6. Saved as `CourseResource` rows linked to the course

**PDF parsing (pdf-parse v2):**
```ts
const { PDFParse } = await import("pdf-parse");
const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
const { text } = await parser.getText();
await parser.destroy();
```
Must be in `serverExternalPackages` in `next.config.ts`.

---

### 6. `app/dashboard/student/[studentId]/MemoryGraph.tsx` — Visual memory graph

Client component. Renders an SVG knowledge graph on the student detail page.

**Data sources:**
- `state.strong_topics` → green nodes (mastered)
- `state.weak_topics` → red nodes (needs work)
- `state.misconceptions` → orange nodes (first 3 words as label)
- `detail.learning_events` → blue nodes for `improvement` events, stacks count badges

**Positioning:** Deterministic radial layout. Angle = even distribution + ±20° hash nudge from label string. Radius = 148px ± 20px hash variation. Produces an organic, non-uniform constellation appearance.

---

## Data types

```ts
interface LearningFact {
  type: "confusion" | "mastery" | "improvement" | "misconception" | "advanced_question";
  topic: string;
  description: string;
  confidence: number; // 0–1
}

interface StudentMemory {
  namespace: string;       // "course:{courseId}:student:{studentId}"
  facts: LearningFact[];   // local fallback only; XTrace mode returns []
  summary: string;         // ready-to-inject context string (from XTrace recall)
  updated_at: string;
}

interface CourseResource {
  id: string;
  course_id: string;
  title: string;           // filename or "{course} pasted material"
  content: string;         // extracted text, max 200k chars
  resource_type: string;   // "uploaded_pdf", "uploaded_txt", "pasted_text", etc.
  created_at: string;
}

interface LearningEvent {
  id: string;
  course_id: string;
  student_id: string;
  event_type: LearningFact["type"];
  topic: string;
  description: string;
  evidence_message_id: string;
  created_at: string;
}
```

---

## XTrace memory lifecycle

```
Turn 1: Student asks about logistic regression
  → ingest() called in background
  → XTrace LLM processes the turn
  → facts stored in XTrace vector store

Turn 2: Student asks follow-up
  → recall() returns accumulated context block
  → extractLearningSignals() vector-searches for confusion/mastery signals
  → Claude receives: system prompt + course materials + XTrace memory block
  → Response is more personalized than Turn 1

Turn N: Professor checks dashboard
  → learning_state shows XTrace-extracted weak/strong topics
  → MemoryGraph renders topic constellation
  → Growth summary reflects XTrace signal history
```

---

## Fallback hierarchy

| Component | Primary | Fallback |
|---|---|---|
| Tutor response | Claude API | Template response (heuristics) |
| Memory recall | XTrace API | Local JSON (`.data/xtrace-memory.json`) |
| Learning signals | XTrace vector search | Regex heuristics on message text |
| Storage | Butterbase remote API | Local JSON (`.data/zargar.json`) |
| PDF parsing | `PDFParse` class (pdf-parse v2) | Throws → error returned to user |
