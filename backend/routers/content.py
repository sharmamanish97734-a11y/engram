from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Topic, Card, MCQ, User
from schemas import TopicOut, CardOut, MCQOut
from services.auth import get_current_user
from services.adaptive import get_adaptive_mcq
from services.sm2 import get_due_cards

router = APIRouter(tags=["content"])


@router.get("/topics", response_model=List[TopicOut])
def list_topics(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    topics = db.query(Topic).order_by(Topic.order).all()
    result = []
    for t in topics:
        due_cards = get_due_cards(db, user_id=user.id, topic_db_id=t.id)
        out = TopicOut(
            id=t.id,
            topic_id=t.topic_id,
            name=t.name,
            category=t.category,
            order=t.order,
            estimated_minutes=t.estimated_minutes,
            card_count=len(t.cards),
            mcq_count=len(t.mcqs),
            due_count=len(due_cards),
        )
        result.append(out)
    return result


@router.get("/topics/{topic_id}/cards", response_model=List[CardOut])
def get_cards(topic_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    topic = db.query(Topic).filter(Topic.topic_id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return get_due_cards(db, user_id=user.id, topic_db_id=topic.id)


@router.get("/topics/{topic_id}/mcqs", response_model=List[MCQOut])
def get_mcqs(topic_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    topic = db.query(Topic).filter(Topic.topic_id == topic_id).first()
    if not topic:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Topic not found")
    mcqs = get_adaptive_mcq(db, user.id, topic.id)
    return mcqs


@router.get("/mcq/random", response_model=List[MCQOut])
def random_mcq(
    topic_id: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    topic_db_id = None
    if topic_id:
        topic = db.query(Topic).filter(Topic.topic_id == topic_id).first()
        topic_db_id = topic.id if topic else None
    return get_adaptive_mcq(db, user.id, topic_db_id, limit)
