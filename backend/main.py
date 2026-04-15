from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, content, answer, wallet, leaderboard
from config import settings

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Engram API",
    description="Adaptive learning PWA with loss-aversion wallet mechanics",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(content.router)
app.include_router(answer.router)
app.include_router(wallet.router)
app.include_router(leaderboard.router)


from fastapi.responses import RedirectResponse

@app.get("/")
def read_root():
    return RedirectResponse(url="/docs")

@app.get("/health")
def health():
    return {"status": "ok", "app": "Engram API"}
