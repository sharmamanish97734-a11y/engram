from pathlib import Path

from pydantic_settings import BaseSettings


BASE_DIR = Path(__file__).resolve().parent


def _normalize_database_url(database_url: str) -> str:
    sqlite_prefix = "sqlite:///"
    if database_url.startswith(sqlite_prefix):
        raw_path = database_url[len(sqlite_prefix):]
        db_path = Path(raw_path)
        if not db_path.is_absolute():
            db_path = (BASE_DIR / db_path).resolve()
        return f"{sqlite_prefix}{db_path}"
    return database_url


class Settings(BaseSettings):
    DATABASE_URL: str = _normalize_database_url("sqlite:///./engram.db")
    SECRET_KEY: str = "engram-super-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    FRONTEND_URL: str = "http://localhost:5173"
    GROQ_API_KEY: str = ""
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"

    def __init__(self, **values):
        super().__init__(**values)
        self.DATABASE_URL = _normalize_database_url(self.DATABASE_URL)

    class Config:
        env_file = BASE_DIR / ".env"


settings = Settings()
