# Zargar

Zargar is a one-day hackathon MVP for AI-guided self-study. Professors create a course, paste course resources, share one invite link, and students learn through chat. Each student conversation updates durable learning memory so professors can see growth, misconceptions, weak topics, and learning direction over time.

Quiz functionality is intentionally not implemented.

## Stack

- Next.js App Router
- TypeScript
- Butterbase-ready backend adapter with local file mode for development
- API routes under `app/api`

## Hackathon integrations

### Butterbase

`lib/butterbase.ts` is the backend/database/storage/auth/model gateway abstraction. For local development it stores JSON in `.data/zargar.json`. For the Launch subscription, create a Butterbase project and mirror the schema in `docs/butterbase-schema.sql`, then replace the adapter internals with Butterbase API calls using the same function signatures.

Stored entities:

- `courses`
- `course_resources`
- `students`
- `chat_messages`
- `student_learning_state`
- `learning_events`

### RocketRide

`lib/rocketride.ts` models the student message workflow:

incoming student message -> detect course topic -> retrieve relevant course context -> read XTrace student memory -> generate grounded tutor response -> extract learning signals -> update XTrace memory -> update Butterbase progress records.

The current implementation is API-compatible and includes TODOs where RocketRide SDK nodes should be connected.

### XTrace

`lib/xtrace.ts` stores persistent learning memory per student namespace:

`course:{courseId}:student:{studentId}`

It exposes:

- `readStudentMemory(courseId, studentId)`
- `writeLearningMemory(courseId, studentId, facts)`
- `extractLearningSignals(message, tutorResponse, courseContext, previousMemory)`
- `summarizeGrowth(courseId, studentId)`

The local version uses heuristics and `.data/xtrace-memory.json`; replace those reads and writes with XTrace APIs for production.

### Photon / Spectrum

`lib/photon.ts` provides Photon payload parsing and message sending. The webhook endpoint is:

`POST /api/photon/webhook`

It parses the incoming student message, runs `processStudentMessage()`, and returns a Photon delivery response. Without `PHOTON_API_KEY`, delivery stays in local development mode.

## Core backend flow

`lib/agent.ts` implements `processStudentMessage()`:

1. Save student message to Butterbase.
2. Load course resources.
3. Load recent chat history.
4. Read XTrace student memory.
5. Run RocketRide tutor pipeline.
6. Generate a grounded tutor response.
7. Extract learning signals.
8. Write facts to XTrace.
9. Update `student_learning_state`.
10. Save learning events.
11. Save tutor response.
12. Return response.

## Routes

- `/dashboard` professor dashboard
- `/courses/new` course setup and invite link generation
- `/join/[courseId]` student join page
- `/chat/[courseId]/[studentId]` local demo chat
- `/dashboard/student/[studentId]` student learning detail
- `/api/photon/webhook` Photon webhook

## Local setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill credentials when connecting real services.

The app includes starter seed data for one course, two students, and sample messages. Open:

- `http://localhost:3000/dashboard`
- `http://localhost:3000/chat/course_ai101/student_maya`

## Butterbase Launch project setup

1. Create a new Butterbase project in your Launch subscription. Name it `zargar` or `zargar-prod`.
2. Create the database tables from `docs/butterbase-schema.sql`.
3. Add the project credentials to `.env`:

```bash
BUTTERBASE_MODE=remote
BUTTERBASE_API_URL=...
BUTTERBASE_API_KEY=...
BUTTERBASE_PROJECT_ID=...
BUTTERBASE_STORAGE_BUCKET=course-resources
```

4. Replace the file-backed internals in `lib/butterbase.ts` with Butterbase calls. Keep the exported `butterbase` methods unchanged so pages, API routes, and `processStudentMessage()` continue to work.
