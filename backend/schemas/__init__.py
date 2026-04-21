from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ─── Auth ───────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    wallet_balance: float
    current_streak: int
    longest_streak: int
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ─── Content ─────────────────────────────────────────────────────────────────

class CardOut(BaseModel):
    id: int
    card_id: str
    title: str
    type: str
    difficulty: str
    content: str
    tags: Optional[str] = None

    class Config:
        from_attributes = True


class MCQOut(BaseModel):
    id: int
    mcq_id: str
    topic_id: int
    question: str
    options: str   # JSON string
    difficulty: str
    tags: Optional[str] = None
    # Note: correct_index and explanation NOT included here (revealed after answer)

    class Config:
        from_attributes = True


class TopicOut(BaseModel):
    id: int
    topic_id: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    parent_id: Optional[int] = None
    order: int
    estimated_minutes: int

    card_count: int = 0
    mcq_count: int = 0
    due_count: int = 0
    learned_count: int = 0
    mastery_percent: int = 0
    last_studied: Optional[datetime] = None
    next_session_minutes: int = 0

    class Config:
        from_attributes = True


# ─── Answer ──────────────────────────────────────────────────────────────────

class AnswerSubmit(BaseModel):
    mcq_id: str
    selected_index: int


class CardRating(BaseModel):
    card_id: str
    rating: int   # 0=wrong/skip, 1=hard, 2=good, 3=easy


class AnswerResult(BaseModel):
    correct: bool
    correct_index: int
    explanation: str
    wallet_delta: float
    wallet_balance: float
    reason: str


class CardResult(BaseModel):
    next_review_days: int
    wallet_delta: float
    wallet_balance: float


# ─── Wallet ──────────────────────────────────────────────────────────────────

class WalletTransactionOut(BaseModel):
    id: int
    amount: float
    reason: str
    balance_after: float
    created_at: datetime

    class Config:
        from_attributes = True


class WalletOut(BaseModel):
    balance: float
    transactions: List[WalletTransactionOut]

# ─── AI ──────────────────────────────────────────────────────────────────────

class AIExplainRequest(BaseModel):
    question: str
    correct_option: str
    user_choice: str
    topic: str

class AIHintRequest(BaseModel):
    question: str
    options: List[str]

class AIDeepDiveRequest(BaseModel):
    title: str
    content: str

class AIGenerateCardsRequest(BaseModel):
    topic_id: str
    topic_name: str

class AIGenerateMCQRequest(BaseModel):
    topic_id: str
    topic_name: str
    difficulty: str

class AIAnalyzeRequest(BaseModel):
    user_id: int

class SyllabusGenerateRequest(BaseModel):
    subject: str
    num_subtopics: int = 5
    cards_per_topic: int = 8
    mcqs_per_topic: int = 5

class BulkDeleteRequest(BaseModel):
    topic_ids: List[str]
