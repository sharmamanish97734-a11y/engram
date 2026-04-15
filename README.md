# Engram 🧠💰
*A Progressive Web App that exploits behavioral economics to enforce consistent learning.*

Engram exploits **loss aversion** – the psychological principle that people feel the pain of losing ₹2 twice as strongly as the pleasure of gaining ₹1. By combining wallet-based rewards and spaced repetition algorithms, it builds stronger learning habits than traditional applications that simply reward correct answers.

---

## Architecture Stack

Fully designed around a **$0/month free-tier architecture**.

* **Frontend:** Vanilla React 18 & Babel via CDN + Tailwind CSS + React-Router + Zustand + React Query
* **Backend:** FastAPI (Python 3.12)
* **Database:** SQLite (local dev), easily deployable to PostgreSQL via Neon.tech
* **ORM:** SQLAlchemy + Pydantic

## Key Features

1. **💸 Loss-Aversion Wallet Mechanics:**
    * **Rewards:** +₹1 for correct answers, +₹2 for perfect (first-try) answers, +₹5 for streaks
    * **Penalties:** -₹2 for wrong answers, -₹2 for skips, inactivity penalties.
2. **🧠 SM-2 Spaced Repetition Algorithm:**
    * Native integration of exponential interval calculation based on card difficulty ("Easy", "Good", "Hard", "Skip").
3. **📊 Adaptive Difficulty System:**
    * User accuracy metrics automatically prioritize questions. (e.g. users > 80% accuracy are served hard questions, users < 50% get easy first).
4. **🏆 Global Leaderboard:** Look at peer progress in real time via the unified leaderboard.

---

## Local Development Setup

### 1. Backend API (`/backend`)
Handles business logic, auth, and ORM mapping.
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Seed the Deep Learning Syllabus database
python seeds/seed_dl.py

# Start FastAPI server
uvicorn main:app --reload --port 8000
```
*API is accessible at `http://localhost:8000`. Swagger specs available at `http://localhost:8000/docs`.*

### 2. Frontend App (`/frontend`)
Uses absolute vanilla CDN configuration (bypassing npm).
```bash
cd frontend
python -m http.server 5173
```
*App is accessible at `http://localhost:5173`.*

---

## Project Structure
```text
engram/
├── backend/
│   ├── main.py            # API Entry Point
│   ├── models/            # SQLAlchemy Database Models
│   ├── schemas/           # Pydantic Schemas
│   ├── routers/           # Endpoint controllers
│   ├── services/          # Business logic (SM-2, wallet engine, adaptive)
│   ├── seeds/             # JSON payload and python seeder script
│   └── database.py        # Connectors & Session setup 
└── frontend/
    ├── app.js             # Core React application logic (Components, Navigation, JSX)
    └── index.html         # Shell wrapping CDN libraries (Tailwind, Babel, HTTP Client)
```

---

## Contribution & Open Source
This architecture originally maps 5 independent layers (Client, API, Source DB, Cache, Jobs). Currently implemented locally as a complete end-to-end Minimum Viable Platform (MVP).
