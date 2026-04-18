# Engram 🧠
*A personal learning app for focused study with spaced repetition, AI-powered insights, and quizzes.*

Engram is a modern, lightweight study application built for high-impact learning. It combines scientific spaced-repetition (SM-2), adaptive quizzes, and AI-driven tutoring to help you master complex topics with a sleek, futuristic interface.

---

## 🚀 Deployment

Fully configured for **one-click deployment** on the free tier:

- **Backend:** [Render](https://render.com/) (FastAPI + SQLite/PostgreSQL)
- **Frontend:** [Netlify](https://www.netlify.com/) (Static React)

Refer to [DEPLOY.md](DEPLOY.md) for the exact step-by-step setup guide.

---

## 🏗️ Architecture Stack

Designed for maximum performance with **zero infrastructure costs**.

*   **Frontend:** Vanilla React 18 (CDN-based) + Tailwind CSS + Glassmorphic UI Design
*   **Backend:** FastAPI (Python 3.12)
*   **AI Engine:** Groq Cloud (Llama 3) for near-instant tutoring & analysis
*   **Database:** SQLite (Default) / PostgreSQL compatible
*   **Deployment:** blueprint-based (`render.yaml`, `netlify.toml`)

---

## ✨ Key Features

### 1. 🤖 AI Learning Assistant
*   **AI Study Analysis:** One-tap analysis of your performance to identify weak topics and suggest a personalized action plan.
*   **Deep Dive Explanations:** Get instant, context-aware AI explanations for every quiz question, whether you get it right or wrong.
*   **Contextual Hints:** Stale on a flashcard? Get a subtle AI hint to nudge your memory without giving away the answer.

### 2. 💸 Loss-Aversion Wallet Mechanics
*   **Rewards:** +₹1 for correct answers, +₹2 for perfect (first-try) answers, +₹5 for streaks.
*   **Penalties:** -₹2 for wrong answers, -₹2 for skips.

### 3. 🧠 SM-2 Spaced Repetition Algorithm
Native integration of exponential interval calculation based on card difficulty:
*   **Ratings:** Easy, Good, Hard, Skip
*   **Outcome:** Optimizes your review schedule so you only study what you're about to forget.

### 4. 📊 Adaptive Difficulty System
Automatically shifts content based on your mastery level:
*   High accuracy (>80%) triggers challenging "Hard" questions.
*   Low accuracy (<50%) prioritizes "Easy" foundational material.

---

## 🛠️ Local Development Setup

### 1. Backend API (`/backend`)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set your Groq API Key
export GROQ_API_KEY="your_key_here"

# Seed the database
python seeds/seed_dl.py

# Start FastAPI server
uvicorn main:app --reload --port 8000
```
*API: `http://localhost:8000` | Docs: `http://localhost:8000/docs`*

### 2. Frontend App (`/frontend`)
```bash
cd frontend
python3 -m http.server 5173
```
*App: `http://localhost:5173`*

---

## 📂 Project Structure
```text
engram/
├── backend/
│   ├── main.py            # API Entry Point & CORS Setup
│   ├── routers/           # Auth, Content, AI, Wallet Controllers
│   ├── services/          # SM-2 Algorithm & AI Prompt Engineering
│   ├── models/            # SQLAlchemy DB Models
│   └── seeds/             # Syllabus Data Seeders
├── frontend/
│   ├── app.js             # Core React App (Zustand-style state, custom routing)
│   ├── index.html         # Shell with Tailwind/Babel/CDN imports
│   └── _redirects         # Netlify SPA routing
├── render.yaml            # Render Infrastructure-as-Code
└── netlify.toml           # Netlify Build Configuration
```

---

## 🧪 Test Credentials
```text
Email: test@example.com
Password: password123
Initial Wallet: ₹100
```
