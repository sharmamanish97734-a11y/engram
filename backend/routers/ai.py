import uuid
import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from models import Topic, Card, MCQ, UserPerformance, AnswerLog
from schemas import (
    AIExplainRequest, AIHintRequest, AIGenerateCardsRequest, 
    AIGenerateMCQRequest, AIAnalyzeRequest, CardOut, MCQOut
)
from services.ai_service import ai_service
from services.auth import get_current_user

router = APIRouter(tags=["ai"])

@router.post("/explain")
def explain(data: AIExplainRequest, db: Session = Depends(get_db)):
    """Get an AI explanation for a specific answer choice."""
    explanation = ai_service.explain_answer(
        db, data.question, data.correct_option, data.user_choice, data.topic
    )
    return {"explanation": explanation}

@router.post("/hint")
def hint(data: AIHintRequest, db: Session = Depends(get_db)):
    """Get a subtle hint for a question."""
    hint_text = ai_service.get_hint(db, data.question, data.options)
    return {"hint": hint_text}

@router.post("/generate-cards", response_model=List[CardOut])
def generate_cards(data: AIGenerateCardsRequest, db: Session = Depends(get_db)):
    """Generate 10 new cards for a topic and save them to the database."""
    # Get or create topic automatically
    topic = db.query(Topic).filter(Topic.topic_id == data.topic_id).first()
    if not topic:
        topic = Topic(topic_id=data.topic_id, name=data.topic_name)
        db.add(topic)
        db.flush()
    
    generated_cards = ai_service.generate_cards(db, data.topic_name, count=10)
    
    db_cards = []
    for c in generated_cards:
        new_card = Card(
            card_id=str(uuid.uuid4())[:8],
            topic_id=topic.id,
            title=c["title"],
            content=c["content"],
            type="basics",
            source="ai"
        )
        db.add(new_card)
        db_cards.append(new_card)
    
    db.commit()
    # Ensure attributes are refreshed for response model
    for c in db_cards: db.refresh(c)
    return db_cards

@router.post("/generate-mcq", response_model=List[MCQOut])
def generate_mcq(data: AIGenerateMCQRequest, db: Session = Depends(get_db)):
    """Generate 5 new MCQs for a topic and save them to the database."""
    topic = db.query(Topic).filter(Topic.topic_id == data.topic_id).first()
    if not topic:
        topic = Topic(topic_id=data.topic_id, name=data.topic_name)
        db.add(topic)
        db.flush()
    
    generated_mcqs = ai_service.generate_mcq(db, data.topic_name, data.difficulty, count=5)
    
    db_mcqs = []
    for m in generated_mcqs:
        new_mcq = MCQ(
            mcq_id=str(uuid.uuid4())[:8],
            topic_id=topic.id,
            question=m["question"],
            options=json.dumps(m["options"]),
            correct_index=m["correct_index"],
            explanation=m.get("explanation", ""),
            difficulty=data.difficulty,
            source="ai"
        )
        db.add(new_mcq)
        db_mcqs.append(new_mcq)
    
    db.commit()
    for m in db_mcqs: db.refresh(m)
    return db_mcqs

@router.post("/analyze")
def analyze(data: AIAnalyzeRequest, db: Session = Depends(get_db)):
    """Analyze the user's last 50 wrong answers and overall topic accuracy."""
    # 1. Fetch last 50 wrong answers from AnswerLog
    wrong_logs = db.query(AnswerLog).filter(
        AnswerLog.user_id == data.user_id,
        AnswerLog.is_correct == False
    ).order_by(desc(AnswerLog.created_at)).limit(50).all()
    
    wrong_content = []
    for log in wrong_logs:
        if log.mcq_id:
            mcq = db.get(MCQ, log.mcq_id)
            if mcq: wrong_content.append(f"MCQ: {mcq.question}")
        elif log.card_id:
            card = db.get(Card, log.card_id)
            if card: wrong_content.append(f"Card: {card.title}")
            
    # 2. Calculate topic accuracies based on cumulative performance
    performances = db.query(UserPerformance).filter(UserPerformance.user_id == data.user_id).all()
    topic_stats = {} # {topic_id: {correct: int, total: int}}
    
    for p in performances:
        tid = None
        if p.mcq_id:
            tid = p.mcq.topic_id if p.mcq else None
        elif p.card_id:
            tid = p.card.topic_id if p.card else None
        
        if tid:
            if tid not in topic_stats:
                topic_stats[tid] = {"correct": 0, "total": 0}
            topic_stats[tid]["correct"] += p.correct_count
            topic_stats[tid]["total"] += (p.correct_count + p.wrong_count)
    
    topic_accuracies = {}
    for tid, stats in topic_stats.items():
        topic = db.get(Topic, tid)
        if topic:
            accuracy = (stats["correct"] / stats["total"]) if stats["total"] > 0 else 0
            topic_accuracies[topic.name] = round(accuracy, 2)
            
    analysis = ai_service.analyze_weak_areas(db, wrong_content, topic_accuracies)
    return analysis
