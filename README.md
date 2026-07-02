# AI-Assisted Job Application Tracker

A MERN + JavaScript job application tracker with JWT auth, a Kanban board, AI-assisted job description parsing, and tailored resume bullet suggestions.

## What’s Included

- Register and login with persistent JWT sessions
- Protected frontend and backend routes
- Kanban board with five stages: Applied, Phone Screen, Interview, Offer, Rejected
- Drag-and-drop status updates
- Create, edit, view, and delete applications
- AI parsing for company, role, skills, seniority, location, and salary range
- AI-generated role-specific resume bullet suggestions with copy actions
- Streamed AI resume suggestion drafting in the application modal
- Resume analyzer with ATS score, missing skills, weak sections, and suggestions
- Resume-to-job match scoring with missing skills and recommendations
- Resume optimization suggestions for summary, projects, skills, and achievements
- Cover letter generation in professional, startup, corporate, and friendly styles
- Interview question generation and answer evaluation
- AI chat assistant with conversation history, copy, regenerate, and clear actions
- Search and status filters on the board
- Overdue follow-up reminders for stale active applications
- Dashboard summary stats
- CSV export for the current filtered board view
- Light and dark theme toggle
- Loading, error, and empty states across the core flow

## Tech Stack

- Frontend: React, JavaScript, React Query, Vite
- Backend: Node.js, Express, JavaScript
- Database: MongoDB + Mongoose
- Auth: JWT + bcryptjs
- AI: OpenAI API with structured parsing via the service layer

## Environment Variables

Copy `.env.example` into the places you use for local env loading and fill in real values.

Backend values:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_TIMEOUT_MS`
- `OPENAI_MAX_RETRIES`
- `OPENAI_INPUT_COST_PER_1M`
- `OPENAI_OUTPUT_COST_PER_1M`
- `AI_RATE_LIMIT_PER_MINUTE`
- `CLIENT_ORIGIN`

Frontend values:

- `VITE_API_BASE_URL`

## How To Run

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend default URL: `http://localhost:5173`

Backend default URL: `http://localhost:5000`

## Deployment Notes

Render backend:

- Root directory: `backend`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- The backend build also creates `dist/server.js` as a compatibility entry for older Render services that still point to `node dist/server.js`.

Vercel frontend:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_BASE_URL` to your Render backend API URL.

## Core API Notes

- AI logic lives in `backend/src/services/ai.service.js`
- AI prompts live in `backend/src/services/ai.prompts.js`
- AI usage and estimated cost tracking lives in `backend/src/services/aiUsage.service.js`
- Resume and career AI tools live in `backend/src/services/aiCareer.service.js`
- AI chat history lives in `backend/src/services/aiChat.service.js`
- Auth restore endpoint: `GET /api/auth/me`
- Applications support full CRUD plus `PATCH /api/applications/:id/status`
- AI endpoints are protected and expect a logged-in user, including `GET /api/ai/usage`

## Decisions Made

- The backend validates auth, application payloads, and AI inputs with `zod` to keep route handlers thin and resilient to bad input.
- The AI service uses structured parsing when an OpenAI key is available and falls back to safe heuristic extraction instead of hardcoded fake company data.
- The frontend uses React Query for application data and optimistic drag-and-drop updates so the board feels responsive.
- Resume suggestions are generated after parsing and can be refreshed manually from the application modal.
- Streaming suggestions use a backend streamed endpoint so the frontend can render AI output progressively while the final bullet list is still being assembled.

## Verification

Completed locally in this workspace:

- `cd backend && npm run build`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
