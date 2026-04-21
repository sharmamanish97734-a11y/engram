# 🚀 Deployment Guide: Engram v2

This guide walks you through deploying the **Engram** full-stack mastery platform using **Render** for the backend and **Netlify** for the frontend.

---

## 🏗️ Deployment Overview

| Component | Platform Options | Primary Technology |
|---|---|---|
| **Backend API** | [Render](https://render.com) (Standard) or Local (Tunnel) | FastAPI + Python 3.12 |
| **Database** | Render PostgreSQL | Persistence for study data |
| **Frontend** | [Netlify](https://netlify.com) or **[Cloudflare Pages](https://pages.cloudflare.com)** | Vanilla React (Static) |
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
| `FRONTEND_URL` | `https://your-app.pages.dev` | Update this **after** completing the Cloudflare/Netlify step |

### Step C: Database Persistence (Crucial)
> [!IMPORTANT]
> By default, Engram uses SQLite. On Render, SQLite data is lost when the service restarts.
> To keep your progress forever, create a **Free PostgreSQL Instance** on Render and copy its **Internal Database URL** into the `DATABASE_URL` environment variable of your web service.

---

## 2️⃣ Frontend Setup (Option A: Cloudflare Pages) 🌟 Recommended

### Step A: Create Project
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository: `manishsharma29841/Engram`.

### Step B: Build Settings
- **Project Name:** `engram`
- **Production Branch:** `engramv2`
- **Framework Preset:** None
- **Build command:** (Leave blank)
- **Build output directory:** `frontend`

### Step C: Get your URL
Cloudflare will give you a URL like `https://engram.pages.dev`.

---

## 3️⃣ Frontend Setup (Option B: Netlify)

1. Log in to [Netlify](https://app.netlify.com/).
2. Click **Add new site** > **Import an existing project**.
3. Select your GitHub repository.
4. **Site settings:**
   - **Branch:** `engramv2`
   - **Publish directory:** `frontend`
5. Click **Deploy site**.

---

## 4️⃣ Advanced: Cloudflare Tunnel (Local Hosting)

If you want to host the **Backend** on your own computer but make it safely accessible via the internet:
1. Install `cloudflared` on your machine.
2. Login: `cloudflared tunnel login`
3. Create tunnel: `cloudflared tunnel create engram-api`
4. Route traffic: `cloudflared tunnel route dns engram-api api.yourdomain.com`
5. Run it: `cloudflared tunnel run --url http://localhost:8000 engram-api`

---

## 5️⃣ Linking the Architecture

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
3. Update `FRONTEND_URL` to match your actual Cloudflare/Netlify URL (e.g., `https://engram.pages.dev`).

---

---

## 6️⃣ Setting up the CI/CD Pipeline (Flag Bypass) 🛠️

Since your GitHub account is flagged, you can't use the standard "Connect to GitHub" button. Instead, we use **GitHub Actions** with **Secrets** to push updates.

### Step A: Get your Netlify Secrets
1. **Token:** Go to [Netlify User Settings](https://app.netlify.app/user/settings/applications#personal-access-tokens) → **New Personal Access Token**. Copy it.
2. **Site ID:** Go to your **Site Settings** → **Site details** → **Site ID** (e.g., `a1eb-23...`).

### Step B: Get your Render Deploy Hook
1. Go to your **Render Service Dashboard**.
2. Go to **Settings**.
3. Scroll to **Deploy Hook**.
4. Copy the URL (it looks like `https://api.render.com/deploy/srv-...`).

### Step C: Add Secrets to GitHub
1. In your GitHub repository, go to **Settings** → **Secrets and variables** → **Actions**.
2. Add the following **New repository secrets**:
   - `NETLIFY_AUTH_TOKEN`: (The token from Step A1)
   - `NETLIFY_SITE_ID`: (The ID from Step A2)
   - `RENDER_DEPLOY_HOOK`: (The URL from Step B)
   - `GROQ_API_KEY`: (Your Groq key for testing)

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
