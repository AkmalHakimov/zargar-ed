# Zargar — Claude Code Project Instructions

## What this is

**Zargar** is a hackathon MVP: an AI-guided study platform for university professors. Professors create courses with uploaded materials; students join via invite link and chat with an AI tutor grounded in those materials. The professor dashboard shows per-student learning signals extracted from conversations.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router, TypeScript |
| Styling | Custom CSS only — no Tailwind, no CSS-in-JS |
| Fonts | Lora (headings, serif) + DM Sans (body) via Google Fonts `@import` |
| Database | Butterbase (remote REST API) or local JSON (`.data/zargar.json`) |
| AI tutor | Anthropic Claude (`claude-haiku-4-5-20251001`) via direct HTTP (undici) |
| Memory | XTrace (`@xtraceai/memory`) — semantic per-student learning memory |
| Pipeline | RocketRide (`rocketride` SDK) — optional AI pipeline layer |
| PDF parsing | `pdf-parse` v2 — must be in `serverExternalPackages` (Next.js config) |

---

## Running the project

```bash
npm install
npm run dev        # starts on http://localhost:3000
npm run build      # verify no TS/build errors before demo
```

**Always kill port 3000 before restarting:** `lsof -ti :3000 | xargs kill -9`

---

## Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `BUTTERBASE_MODE` | `remote` (uses Butterbase API) or anything else (local JSON) |
| `BUTTERBASE_API_KEY` | Butterbase REST API key |
| `BUTTERBASE_PROJECT_ID` | Butterbase app ID |
| `ANTHROPIC_API_KEY` | Claude API key — must be valid or chat uses fallback responses |
| `ROCKETRIDE_ANTHROPIC_KEY` | Same key, passed to RocketRide pipeline |
| `XTRACE_API_KEY` + `XTRACE_ORG_ID` | XTrace memory — omit to use local JSON fallback |

If `ANTHROPIC_API_KEY` is invalid, the chat works but uses template fallback responses (not Claude). Check server logs for `[Claude] API error: invalid x-api-key`.

---

## Key file map

```
app/
  page.tsx                          Landing page
  layout.tsx                        Nav bar (sticky dark, Zargar brand)
  dashboard/
    page.tsx                        Professor dashboard — KPI strip + per-course student tables
    student/[studentId]/
      page.tsx                      Student detail — header, stats, memory graph, events
      MemoryGraph.tsx               XTrace memory visualization (SVG, dark, client component)
  courses/new/
    page.tsx                        Split-panel course creation layout
    NewCourseForm.tsx               Form — multipart upload, file pills, invite link on success
  join/[courseId]/page.tsx          Student join page
  chat/[courseId]/[studentId]/
    page.tsx                        Chat page (server — loads data)
    ChatClient.tsx                  Chat UI (client — messages, input, sidebar)
  api/
    courses/route.ts                POST: create course + extract file text + save resources
    chat/route.ts                   POST: process student message through AI pipeline
    students/route.ts               POST: enroll student in course

lib/
  butterbase.ts                     All DB access — local JSON and remote Butterbase
  agent.ts                          Main pipeline orchestrator (processStudentMessage)
  rocketride.ts                     Claude calls, topic detection, context retrieval
  xtrace.ts                         XTrace memory read/write/ingest
  types.ts                          Shared TypeScript types
  seed.ts                           Seed data for local dev

.data/
  zargar.json                       Local DB (used when BUTTERBASE_MODE != remote)
  xtrace-memory.json                Local XTrace memory fallback
```

---

## Architecture patterns

### File upload
Files are sent as `multipart/form-data`. The form **explicitly appends** files from React state into FormData before fetch (do not rely solely on `new FormData(form)` for hidden file inputs). The route checks `content-type` header to detect multipart vs JSON.

### PDF parsing
Uses `pdf-parse` v2 class API — `PDFParse` is a named export (no default export in v2):
```ts
const { PDFParse } = await import("pdf-parse");
const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
const { text } = await parser.getText();
```
`pdf-parse` must be in `next.config.ts` → `serverExternalPackages` to avoid webpack bundling conflicts with pdfjs-dist.

### Student message pipeline (see `lib/agent.ts`)
1. Save student message to DB
2. Fetch course resources + recent messages + XTrace memory (parallel)
3. Run tutor pipeline → Claude generates grounded response
4. Save tutor response to DB
5. Ingest turn into XTrace (background, fire-and-forget)
6. Extract learning signals (XTrace search or heuristic fallback)
7. Update learning state + save events

### XTrace memory scoping
`user_id` format: `"${courseId}__${studentId}"` — scopes memories per student per course so memory doesn't bleed between courses.

### Butterbase query format
Filtering uses PostgREST-style operators: `{ course_id: "eq.course_abc123" }` → `?course_id=eq.course_abc123`.

---

## CSS conventions

All styles live in `app/globals.css`. No component-level CSS files. Key classes:

- `.card`, `.stat-card`, `.course-card` — panel containers
- `.pill {status}` — status badges (`behind`, `ahead`, `improving`, `on_track`, `inactive`, `tag`)
- `.button`, `.button-lg`, `.button-sm`, `.button-secondary`, `.button-ghost`, `.button-accent`
- `.section-label` — uppercase label with right-side rule
- `.table`, `.table-wrap` — data tables
- CSS variables: `--bg`, `--panel`, `--brand`, `--accent`, `--muted`, `--line`, `--font-serif`, `--font-sans`

Do not add Tailwind. Do not add component libraries. Edit `globals.css` for new styles.

---

## Common pitfalls

- **Never use `(await import("pdf-parse")).default`** — v2 has no default export. Use `{ PDFParse }`.
- **`pdf-parse` must be in `serverExternalPackages`** in `next.config.ts` or it crashes with `Object.defineProperty called on non-object`.
- **File inputs in nested labels** — always explicitly append files from React state: `form.delete("files"); files.forEach(f => form.append("files", f))`.
- **Next.js 15 patches global `fetch`** — it strips auth headers. Use `undici` for Anthropic API calls (already done in `lib/rocketride.ts`).
- **`ANTHROPIC_API_KEY` must be valid** — if expired, chat silently falls back to template responses. Check logs for `[Claude] API error`.
- **`XTrace Memory.text`** — not `.content`. The field is `.text`.
- **Butterbase `createRow`** may return `null` body on some responses — don't depend on the return value beyond confirming no error was thrown.
