from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, content, answer, wallet, ai
from config import settings
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Engram API",
    description="Personal learning app with spaced repetition and quizzes",
    version="1.0.0",
)

allowed_origins = {
    settings.FRONTEND_URL,
    "https://your-app.netlify.app",
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
    "http://0.0.0.0:5173",
    "http://0.0.0.0:4173",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(content.router)
app.include_router(answer.router)
app.include_router(wallet.router)
app.include_router(ai.router, prefix="/ai")


from fastapi.responses import RedirectResponse

@app.get("/")
def read_root():
    return RedirectResponse(url="/docs")

@app.get("/health")
def health():
    return {"status": "ok", "app": "Engram API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
