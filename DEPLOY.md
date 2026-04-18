# Deployment Guide for Engram

This guide explains how to deploy the Engram application using **Render** (for the backend) and **Netlify** (for the frontend).

## 1. Backend Deployment (Render)

The backend is a FastAPI application. We use a `render.yaml` file to simplify the deployment.

### Steps:
1. **GitHub Setup**: Ensure your code is pushed to a GitHub repository.
2. **Connect to Render**:
   - Log in to [Render](https://render.com/).
   - Click **New +** and select **Blueprint**.
   - Connect your GitHub repository.
   - Render will automatically detect the `render.yaml` file.
3. **Configure Secrets**:
   - During the blueprint setup, Render might ask for environment variables.
   - **GROQ_API_KEY**: Provide your actual Groq API key.
   - **DATABASE_URL**: Defaults to `sqlite:///./engram.db`. You can change this to a PostgreSQL URL if you prefer a persistent database.
   - **FRONTEND_URL**: Once you have your Netlify URL, update this to `https://your-site.netlify.app`.
4. **Deploy**: Click **Apply** to start the deployment.

> [!IMPORTANT]
> Since we use SQLite by default, any data added to the app will be lost whenever the Render instance restarts (which happens at least once a day). For production persistent data, consider connecting a **Render PostgreSQL** database and updating the `DATABASE_URL` in the Render dashboard.

---

## 2. Frontend Deployment (Netlify)

The frontend is a static site (HTML/JS).

### Steps:
1. **Connect to Netlify**:
   - Log in to [Netlify](https://www.netlify.com/).
   - Click **Add new site** > **Import an existing project**.
   - Connect your GitHub repository.
2. **Site Configuration**:
   - **Base directory**: (Leave empty or set to root)
   - **Build command**: (Leave empty)
   - **Publish directory**: `frontend`
3. **Deploy Site**: Click **Deploy site**.
4. **Custom Domain / URL**:
   - Once deployed, Netlify will give you a URL like `https://funny-unicorn-12345.netlify.app`.
   - Copy this URL.

---

## 3. Final Step: Linking the Two

After deploying both, you need to update the placeholders with your actual URLs:

1. **Update Frontend API URL**:
   - In `frontend/app.js`, update `https://your-app.onrender.com` with your actual Render URL.
   - Push this change to GitHub; Netlify will auto-redeploy.
2. **Update Backend CORS**:
   - In `backend/main.py`, update `https://your-app.netlify.app` with your actual Netlify URL.
   - Push this change to GitHub; Render will auto-redeploy.
3. **Update Backend Env Var**:
   - Go to your Render Dashboard.
   - Select your service > **Environment**.
   - Update `FRONTEND_URL` to your actual Netlify URL.
