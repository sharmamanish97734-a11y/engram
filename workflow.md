# Engram Workflow

This document describes the current working flow of Engram after simplifying it for personal learning use.

## Purpose

Engram is now a personal study app centered around:

- topic-based study with AI-generated hierarchical syllabi
- flashcard review
- adaptive quiz practice
- spaced repetition
- simple streak and wallet-style motivation
- AI tutoring (hints, explanations, weak area analysis)

Removed from the main flow:

- leaderboard
- install bonus
- manual settle-up expense flow
- inactivity penalties

## High-Level User Flow

1. Open the frontend.
2. Enter the app from the splash screen.
3. Log in or use your saved session.
4. Land on the home screen.
5. Choose one of the main study paths:
   - `Topics` for topic-based learning or to generate a new syllabus with AI
   - `Quiz` for a random quiz session
   - `Wallet` to view progress-style reward history
6. Study cards or answer quiz questions.
7. The backend updates:
   - spaced repetition data
   - streak data
   - wallet balance
   - transaction history

## Frontend Flow

Main frontend file:

- [frontend/app.js](/home/manish-sharma/Desktop/Engram2/Engram/frontend/app.js)

### App Start

The app starts in `App` and reads the current hash route.

Important routes:

- `/` -> splash if logged out, home if logged in
- `/login` -> login/register page
- `/home` -> home dashboard
- `/topics` -> topic list + AI generation button
- `/learn/:topic_id` -> flashcard study
- `/quiz/:topic_id` -> topic quiz
- `/quiz/random` -> mixed quiz
- `/wallet` -> wallet and transaction history

### Auth Sync

The frontend calls `/auth/me` through `syncCurrentUser()` to restore the current user and wallet balance.

This happens:

- on app load
- inside layout mounts
- after card rating
- after quiz answer submission

### Home Screen

The home page shows:

- username
- current streak
- quick actions for `Learn` and `Quiz`
- AI Insight Analysis button — runs weak area analysis via Groq

### Topics Screen

The topics page fetches:

- `GET /topics`

It displays only **parent topics** (filtered by `parent_id == null`), showing:

- topic name and category
- mastery percentage
- learned vs. total card count
- due card count
- last studied and next session estimate

Each topic offers:

- `Study Due` — study cards due for review
- `Quiz` — MCQ quiz for this topic
- `Regenerate` (🪄) — opens the AI generation modal pre-filled with this topic name
- `Review All` — study all cards regardless of due date
- `Reset Progress` — clears all SM-2 data for this topic

**AI Syllabus Generator button** at the top of the Topics screen:

- Opens a modal with a subject input field plus optional counts (subtopics, cards/topic, MCQs/topic)
- On submit, calls `POST /syllabus/generate`
- Shows a Groq AI loading animation (~8–15 seconds)
- On success, refreshes the topic list

## Syllabus Generation Flow

New flow using Groq AI:

1. User opens the AI Syllabus Generator modal.
2. User enters a subject (e.g. "Computer Vision") and optional counts.
3. Frontend submits: `POST /syllabus/generate`
4. Backend calls `groq_generator.generate_syllabus()`:
   - Uses `llama-3.3-70b-versatile` on Groq
   - Returns JSON with: name, description, subtopics, cards (front/back), MCQs
5. Backend saves:
   - A parent `Topic` row (the subject)
   - One `Topic` row per subtopic with `parent_id` pointing to the parent
   - `Card` rows for each subtopic (front = title, back = content)
   - `MCQ` rows for each subtopic
6. Backend returns: `{ "created_topic_ids": [...] }`
7. Frontend refreshes the topic list.

Relevant files:

- [backend/services/groq_generator.py](/home/manish-sharma/Desktop/Engram2/Engram/backend/services/groq_generator.py)
- [backend/routers/content.py](/home/manish-sharma/Desktop/Engram2/Engram/backend/routers/content.py)

## Learn Flow

Main component:

- `Learn` in [frontend/app.js](/home/manish-sharma/Desktop/Engram2/Engram/frontend/app.js)

### Step-by-step

1. Frontend opens `/learn/{topic_id}`.
2. It requests:
   - `GET /topics/{topic_id}/cards`
3. Backend returns due cards for that topic.
4. User flips a flashcard.
5. User can request an AI hint: `POST /ai/hint`
6. User rates the card:
   - `Skip`
   - `Hard`
   - `Good`
   - `Easy`
7. Frontend submits:
   - `POST /card/rate`
8. Backend updates:
   - card performance record
   - SM-2 interval
   - next review date
   - streak
   - wallet balance when applicable
9. Frontend refreshes current user data and moves to the next card.

### Learn Backend Logic

Relevant files:

- [backend/routers/content.py](/home/manish-sharma/Desktop/Engram2/Engram/backend/routers/content.py)
- [backend/routers/answer.py](/home/manish-sharma/Desktop/Engram2/Engram/backend/routers/answer.py)
- [backend/services/sm2.py](/home/manish-sharma/Desktop/Engram2/Engram/backend/services/sm2.py)

Rules:

- new cards are treated as due
- due cards are selected by `next_review <= now`
- rating updates SM-2 quality and review interval
- `Good` and `Easy` can reward the wallet
- `Skip` penalizes the wallet

## Quiz Flow

Main component:

- `Quiz` in [frontend/app.js](/home/manish-sharma/Desktop/Engram2/Engram/frontend/app.js)

### Step-by-step

1. User opens either:
   - `/quiz/random`
   - `/quiz/{topic_id}`
2. Frontend requests:
   - `GET /mcq/random`
   - or `GET /topics/{topic_id}/mcqs`
3. Backend selects questions through adaptive difficulty logic.
4. User chooses an option.
5. Frontend submits:
   - `POST /answer`
6. Backend checks correctness and updates:
   - MCQ performance
   - SM-2 values
   - streak
   - wallet balance
7. Backend returns:
   - correct/incorrect result
   - correct option index
   - explanation
   - wallet delta
   - updated balance
8. AI deep-dive explanation triggers automatically: `POST /ai/explain`
9. Frontend shows feedback, then moves to the next question.

### Quiz Backend Logic

Relevant files:

- [backend/services/adaptive.py](/home/manish-sharma/Desktop/Engram2/Engram/backend/services/adaptive.py)
- [backend/routers/answer.py](/home/manish-sharma/Desktop/Engram2/Engram/backend/routers/answer.py)

Adaptive rule:

- accuracy above `80%` -> prefer hard questions
- accuracy below `50%` -> prefer easy questions
- otherwise -> mixed questions

Reward rule:

- first-time correct answer -> `perfect_answer`
- later correct answer -> `correct_answer`
- wrong answer -> `wrong_answer` penalty

## AI Services Flow

All AI features use Groq Cloud via the `openai` Python SDK configured with the Groq base URL.

### AI Router

- [backend/routers/ai.py](/home/manish-sharma/Desktop/Engram2/Engram/backend/routers/ai.py)

Endpoints:

- `POST /ai/explain` — explains why an answer is correct/incorrect after a quiz question
- `POST /ai/hint` — gives a subtle hint for the current flashcard
- `POST /ai/generate-cards` — generates 10 new cards for a topic
- `POST /ai/generate-mcq` — generates 5 new MCQs for a topic
- `POST /ai/analyze` — analyzes wrong answers and topic accuracies, returns weak areas and action plan

### AI Services

- [backend/services/ai_service.py](/home/manish-sharma/Desktop/Engram2/Engram/backend/services/ai_service.py) — tutoring, hints, analysis with 7-day caching
- [backend/services/groq_generator.py](/home/manish-sharma/Desktop/Engram2/Engram/backend/services/groq_generator.py) — full syllabus generation

Models used:

- `llama-3.1-8b-instant` — fast model for hints and explanations
- `llama-3.3-70b-versatile` — powerful model for analysis and syllabus generation

## Wallet Flow

Main screen:

- `/wallet`

Backend route:

- `GET /wallet`

The wallet is now a lightweight motivation tracker, not a finance tool.

It stores:

- current balance
- transaction history from learning actions

Sources of balance changes:

- correct quiz answers
- perfect quiz answers
- card rated `Good`
- card rated `Easy`
- wrong answers
- skipped cards
- streak bonuses at 7 and 30 days

Relevant file:

- [backend/services/wallet_engine.py](/home/manish-sharma/Desktop/Engram2/Engram/backend/services/wallet_engine.py)

## Streak Flow

Streak updates happen inside learning actions, not from a separate user action.

Triggered when:

- answering a quiz question
- rating a card

Current streak logic:

- first activity creates streak `1`
- activity within 48 hours keeps the streak alive
- a new day increments the streak
- long inactivity resets streak to `1`

Bonus milestones:

- 7 days
- 30 days

## Backend Structure

Main backend files:

- [backend/main.py](/home/manish-sharma/Desktop/Engram2/Engram/backend/main.py)
- [backend/database.py](/home/manish-sharma/Desktop/Engram2/Engram/backend/database.py)
- [backend/models/__init__.py](/home/manish-sharma/Desktop/Engram2/Engram/backend/models/__init__.py)
- [backend/schemas/__init__.py](/home/manish-sharma/Desktop/Engram2/Engram/backend/schemas/__init__.py)
- [backend/alembic.ini](/home/manish-sharma/Desktop/Engram2/Engram/backend/alembic.ini)

Main routers:

- `auth`
- `content` (topics, cards, MCQs, syllabus generation)
- `answer` (card rating, MCQ submission)
- `ai` (hints, explanations, analysis, generation)
- `wallet`

Important notes:

- The database path is normalized in config so the app always uses the backend-local SQLite file consistently.
- Alembic is initialized in `backend/` with SQLite batch mode enabled.
- `Topic` now supports a `parent_id` for subject → subtopic hierarchy.

## Data Flow Summary

### Topic List

- frontend -> `GET /topics`
- backend -> parent topics only + mastery/due counts

### AI Syllabus Generation

- frontend -> `POST /syllabus/generate` with subject name + counts
- backend -> calls Groq, saves parent topic + subtopics + cards + MCQs
- backend -> returns `{ created_topic_ids: [...] }`

### Learn Session

- frontend -> `GET /topics/{id}/cards`
- frontend -> `POST /ai/hint` (optional)
- frontend -> `POST /card/rate`
- backend -> updates card review state, streak, wallet

### Quiz Session

- frontend -> `GET /mcq/random` or `GET /topics/{id}/mcqs`
- frontend -> `POST /answer`
- frontend -> `POST /ai/explain` (auto-triggered)
- backend -> updates MCQ performance, streak, wallet

### Wallet View

- frontend -> `GET /wallet`
- backend -> current balance + recent transactions

### AI Analysis

- frontend -> `POST /ai/analyze` with user_id
- backend -> returns weak topics, focus area, action plan

## Local Run Flow

### Backend

```bash
cd backend
source venv/bin/activate
alembic upgrade head        # apply any pending schema migrations
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
python3 -m http.server 5173
```

Recommended URL:

- frontend: `http://localhost:5173`
- backend: `http://localhost:8000`

## What To Change Next

Possible next steps:

- remove signup/login and auto-use one personal account
- rename `Wallet` to `Progress`
- add subtopic drill-down view (click a parent topic to see its subtopics)
- add a topic search/filter bar on the Topics screen
- add export to Anki or CSV


