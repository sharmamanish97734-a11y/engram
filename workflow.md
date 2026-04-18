# Engram Workflow

This document describes the current working flow of Engram after simplifying it for personal learning use.

## Purpose

Engram is now a personal study app centered around:

- topic-based study
- flashcard review
- adaptive quiz practice
- spaced repetition
- simple streak and wallet-style motivation

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
   - `Topics` for topic-based learning
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
- `/topics` -> topic list
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

This is the main personal dashboard.

### Topics Screen

The topics page fetches:

- `GET /topics`

It displays:

- topic name
- category
- estimated time
- due card count

Each topic offers:

- `Study Cards`
- `Take Quiz`

## Learn Flow

Main component:

- `Learn` in [frontend/app.js](/home/manish-sharma/Desktop/Engram2/Engram/frontend/app.js)

### Step-by-step

1. Frontend opens `/learn/{topic_id}`.
2. It requests:
   - `GET /topics/{topic_id}/cards`
3. Backend returns due cards for that topic.
4. User flips a flashcard.
5. User rates the card:
   - `Skip`
   - `Hard`
   - `Good`
   - `Easy`
6. Frontend submits:
   - `POST /card/rate`
7. Backend updates:
   - card performance record
   - SM-2 interval
   - next review date
   - streak
   - wallet balance when applicable
8. Frontend refreshes current user data and moves to the next card.

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
8. Frontend shows feedback, then moves to the next question.

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

Main routers:

- `auth`
- `content`
- `answer`
- `wallet`

Important note:

The database path is normalized in config so the app always uses the backend-local SQLite file consistently.

## Data Flow Summary

### Topic List

- frontend -> `GET /topics`
- backend -> topics + due counts

### Learn Session

- frontend -> `GET /topics/{id}/cards`
- frontend -> `POST /card/rate`
- backend -> updates card review state, streak, wallet

### Quiz Session

- frontend -> `GET /mcq/random` or `GET /topics/{id}/mcqs`
- frontend -> `POST /answer`
- backend -> updates MCQ performance, streak, wallet

### Wallet View

- frontend -> `GET /wallet`
- backend -> current balance + recent transactions

## Local Run Flow

### Backend

```bash
cd backend
source venv/bin/activate
python seeds/seed_dl.py
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

If you want to simplify further for single-user personal use, the next logical steps are:

- remove signup/login and auto-use one personal account
- rename `Wallet` to `Progress`
- reduce motivational balance mechanics if they feel distracting
- add a proper progress dashboard per topic
