from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from database import Base
import enum


class DifficultyEnum(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class CardTypeEnum(str, enum.Enum):
    basics = "basics"
    formula = "formula"
    must_know = "must_know"
    interview_question = "interview_question"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Streak tracking
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_activity_at = Column(DateTime(timezone=True), nullable=True)

    # Wallet
    wallet_balance = Column(Float, default=0.0)

    # Relationships
    performances = relationship("UserPerformance", back_populates="user")
    wallet_transactions = relationship("WalletTransaction", back_populates="user")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(String(50), unique=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100))
    order = Column(Integer, default=0)
    estimated_minutes = Column(Integer, default=30)
    parent_id = Column(Integer, ForeignKey("topics.id"), nullable=True)

    # Relationships
    cards = relationship("Card", back_populates="topic")
    mcqs = relationship("MCQ", back_populates="topic")
    subtopics = relationship("Topic", backref=backref("parent", remote_side=[id]))


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(String(50), unique=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    title = Column(String(255), nullable=False)
    type = Column(String(50))
    difficulty = Column(String(20), default="medium")
    content = Column(Text, nullable=False)
    tags = Column(Text)  # JSON array stored as string
    source = Column(String(50), default='manual')

    topic = relationship("Topic", back_populates="cards")
    performances = relationship("UserPerformance", back_populates="card")


class MCQ(Base):
    __tablename__ = "mcqs"

    id = Column(Integer, primary_key=True, index=True)
    mcq_id = Column(String(50), unique=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    question = Column(Text, nullable=False)
    options = Column(Text, nullable=False)   # JSON array
    correct_index = Column(Integer, nullable=False)
    explanation = Column(Text)
    difficulty = Column(String(20), default="medium")
    tags = Column(Text)  # JSON array
    source = Column(String(50), default='manual')

    topic = relationship("Topic", back_populates="mcqs")
    performances = relationship("UserPerformance", back_populates="mcq")


class UserPerformance(Base):
    __tablename__ = "user_performance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=True)
    mcq_id = Column(Integer, ForeignKey("mcqs.id"), nullable=True)

    # SM-2 fields
    easiness_factor = Column(Float, default=2.5)
    interval = Column(Integer, default=1)       # days until next review
    repetitions = Column(Integer, default=0)
    next_review = Column(DateTime(timezone=True), server_default=func.now())

    # Stats
    correct_count = Column(Integer, default=0)
    wrong_count = Column(Integer, default=0)
    last_answered_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="performances")
    card = relationship("Card", back_populates="performances")
    mcq = relationship("MCQ", back_populates="performances")


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)          # positive = credit, negative = debit
    reason = Column(String(255), nullable=False)
    balance_after = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="wallet_transactions")

class AICache(Base):
    __tablename__ = "ai_cache"

    cache_key = Column(String(64), primary_key=True, index=True)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AnswerLog(Base):
    __tablename__ = "answer_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=True)
    mcq_id = Column(Integer, ForeignKey("mcqs.id"), nullable=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    is_correct = Column(Boolean, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

