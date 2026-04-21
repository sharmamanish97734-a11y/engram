# 🚀 Deployment Guide: Engram v2

This guide walks you through deploying the **Engram** full-stack mastery platform using **Render** for the backend and **Netlify** for the frontend.

---

## 🏗️ Deployment Overview

| Component | Platform | Primary Technology |
|---|---|---|
| **Backend API** | [Render](https://render.com) | FastAPI + Python 3.12 |
| **Database** | Render PostgreSQL | Persistence for study data |
| **Frontend** | [Netlify](https://netlify.com) | Vanilla React (Static) |
| **AI Layer** | [Groq Cloud](https://groq.com) | Llama 3 Infrastructure |

---

## 1️⃣ Backend Setup (Render)

### Step A: Connect Repository
1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository: `manishsharma29841/Engram`.
4. Render will detect the `render.yaml` file automatically.

### Step B: Configure Environment
In the Blueprint configuration, ensure the following variables are set:

| Variable | Recommended Value | Note |
|---|---|---|
| `GROQ_API_KEY` | *[Your API Key]* | Get this from [Groq Console](https://console.groq.com/keys) |
| `DATABASE_URL` | *Auto-generated* | If using Render PostgreSQL, this is filled for you |
| `FRONTEND_URL` | `https://your-app.netlify.app` | Update this **after** completing the Netlify step |

### Step C: Database Persistence (Crucial)
> [!IMPORTANT]
> By default, Engram uses SQLite. On Render, SQLite data is lost when the service restarts.
> To keep your progress forever, create a **Free PostgreSQL Instance** on Render and copy its **Internal Database URL** into the `DATABASE_URL` environment variable of your web service.

---

## 2️⃣ Frontend Setup (Netlify)

### Step A: Deploy Website
1. Log in to [Netlify](https://app.netlify.com/).
2. Click **Add new site** > **Import an existing project**.
3. Select your GitHub repository.
4. **Site settings:**
   - **Branch:** `engramv2`
   - **Base directory:** (Leave blank)
   - **Build command:** (Leave blank)
   - **Publish directory:** `frontend`
5. Click **Deploy site**.

### Step B: Get your URL
Once deployed, you will get a URL like `https://creative-engram-123.netlify.app`. 

---

## 3️⃣ Linking the Architecture

For the app to work, the frontend must know where the API is, and the API must allow the frontend to talk to it (CORS).

### A. Point Frontend to Backend
1. Open `frontend/app.js` in your code.
2. Locate the `API_BASE` constant (usually around line 46):
   ```javascript
   const API_BASE = window.location.hostname === 'localhost' ...
     ? "http://localhost:8000"
     : "https://engram-backend.onrender.com"; // <-- REPLACE WITH YOUR RENDER URL
   ```
3. Commit and push this change to GitHub. Netlify will auto-update.

### B. Whitelist Frontend in Backend
1. Go to your **Render Service Dashboard**.
2. Go to **Environment**.
3. Update `FRONTEND_URL` to match your actual Netlify URL (e.g., `https://creative-engram-123.netlify.app`).

---

## 🛠️ Post-Deployment Verification

### 1. Check API Health
Visit `https://your-backend-url.onrender.com/health`. You should see `{"status": "ok"}`.

### 2. Verify Database
The `render.yaml` will automatically run `alembic upgrade head` on every deploy to ensure your tables are created.

### 3. Login
Use the default test credentials to verify the frontend-backend connection:
- **Email:** `test@example.com`
- **Password:** `password123`

---

## 🆘 Troubleshooting

> [!WARNING]
> **CORS Errors?** Ensure the `FRONTEND_URL` in Render matches your Netlify URL **exactly**, including `https://` and no trailing slash.

> [!TIP]
> **Performance:** Groq is extremely fast, but Render's free tier services "spin down" after 15 minutes of inactivity. The first request after a break might take ~30 seconds to wake up.
