# Zargar

Zargar is an AI-guided study platform for university courses. Professors create a course, upload materials, and share a single invite link. Students learn through a grounded AI tutor that only answers from the uploaded materials. Every conversation updates persistent learning memory so professors can see growth, misconceptions, weak topics, and engagement over time — before the exam.

## Stack

- Next.js 15 App Router
- TypeScript
- Butterbase (remote database, storage, and API)
- XTrace (persistent per-student learning memory)
- RocketRide (AI pipeline orchestration)
- Anthropic Claude (grounded tutoring responses)

## Integrations

### Butterbase

`lib/butterbase.ts` is the database and storage abstraction. Supports both local file mode (`.data/zargar.json`) for development and remote Butterbase API for production.

Stored entities:

- `courses`
- `course_resources`
- `students`
- `chat_messages`
- `student_learning_state`
- `learning_events`

### RocketRide

`lib/rocketride.ts` runs the student message pipeline:

incoming message → topic detection → context retrieval → XTrace memory read → grounded response generation → learning signal extraction → XTrace memory update → Butterbase state update.

When RocketRide credentials are configured, the pipeline runs through `tutor.pipe` via the RocketRide TypeScript SDK. Without credentials, the same flow falls back to direct Claude + heuristics.

### XTrace

`lib/xtrace.ts` stores persistent learning memory per student, scoped per course:

`course:{courseId}:student:{studentId}`

Exposes:

- `readStudentMemory(courseId, studentId)`
- `writeLearningMemory(courseId, studentId, facts)`
- `extractLearningSignals(message, tutorResponse, courseContext, previousMemory)`
- `summarizeGrowth(courseId, studentId)`

Falls back to `.data/xtrace-memory.json` when credentials are not configured.

### Photon / Spectrum

Multi-platform messaging layer. Students can interact with the tutor via web, iMessage, or WhatsApp using the same pipeline.

```bash
npm run spectrum:terminal    # local development
npm run spectrum:imessage    # iMessage
npm run spectrum:whatsapp    # WhatsApp
```

The webhook endpoint `POST /api/photon/webhook` handles signed Spectrum webhook deliveries and runs the same learning workflow.

## Core backend flow

`lib/agent.ts` — `processStudentMessage()`:

1. Save student message to Butterbase
2. Load course resources
3. Load recent chat history
4. Read XTrace student memory
5. Run tutor pipeline (RocketRide → Claude fallback)
6. Extract learning signals
7. Write facts to XTrace
8. Update student learning state in Butterbase
9. Save learning events
10. Return response and updated state

## Routes

- `/` — landing page
- `/dashboard` — professor analytics dashboard
- `/courses/new` — course setup and invite link generation
- `/join/[courseId]` — student join page
- `/student/[studentId]` — student learning dashboard
- `/chat/[courseId]/[studentId]` — AI study chat
- `/api/photon/webhook` — Photon/Spectrum webhook

## Local setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in credentials. The app ships with seed data for one course and two students:

- `http://localhost:3000/dashboard`
- `http://localhost:3000/chat/course_ai101/student_maya`

## Butterbase setup

1. Create a Butterbase project
2. Set credentials in `.env`:

```
BUTTERBASE_MODE=remote
BUTTERBASE_API_URL=...
BUTTERBASE_API_KEY=...
BUTTERBASE_PROJECT_ID=...
BUTTERBASE_STORAGE_BUCKET=course-resources
```
