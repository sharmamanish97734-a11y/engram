from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Topic, Card, MCQ, User
from schemas import TopicOut, CardOut, MCQOut, SyllabusGenerateRequest, BulkDeleteRequest, SyllabusSuggestRequest, SubtopicExtendRequest
import uuid
import json

from services.auth import get_current_user
from services.adaptive import get_adaptive_mcq
from services.sm2 import get_due_cards

router = APIRouter(tags=["content"])


@router.get("/topics", response_model=List[TopicOut])
def list_topics(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from sqlalchemy import func
    from models import UserPerformance, AnswerLog
    from datetime import datetime
    
    topics = db.query(Topic).order_by(Topic.order).all()
    result = []
    
    for t in topics:
        # Get all performance records for this topic and user
        perfs = (
            db.query(UserPerformance)
            .join(Card, Card.id == UserPerformance.card_id, isouter=True)
            .join(MCQ, MCQ.id == UserPerformance.mcq_id, isouter=True)
            .filter(UserPerformance.user_id == user.id)
            .filter((Card.topic_id == t.id) | (MCQ.topic_id == t.id))
            .all()
        )
        
        learned_count = sum(1 for p in perfs if p.repetitions > 0)
        
        # Mastery: Average of (easiness_factor - 1.3) / (2.5 - 1.3) normalized to interval
        # A card is "mastered" if interval > 30 days
        mastery_sum = 0
        for p in perfs:
            # interval based mastery (30 days = 100%)
            m = min(100, (p.interval / 30.0) * 100)
            mastery_sum += m
        
        total_items = len(t.cards) + len(t.mcqs)
        mastery_percent = int(mastery_sum / total_items) if total_items > 0 else 0
        
        # Last studied
        last_studied = None
        if perfs:
            last_studied = max((p.last_answered_at for p in perfs if p.last_answered_at), default=None)
            
        due_cards = get_due_cards(db, user_id=user.id, topic_db_id=t.id)
        due_count = len(due_cards)
        
        out = TopicOut(
            id=t.id,
            topic_id=t.topic_id,
            name=t.name,
            category=t.category,
            parent_id=t.parent_id,
            order=t.order,
            estimated_minutes=t.estimated_minutes,
            card_count=len(t.cards),
            mcq_count=len(t.mcqs),
            due_count=due_count,
            learned_count=learned_count,
            mastery_percent=mastery_percent,
            last_studied=last_studied,
            next_session_minutes=int(due_count * 0.5) # approx 30s per due card
        )
        result.append(out)
    return result


@router.get("/topics/{topic_id}/cards", response_model=List[CardOut])
def get_cards(topic_id: str, all: bool = False, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    topic = db.query(Topic).filter(Topic.topic_id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
        
    if all:
        return db.query(Card).filter(Card.topic_id == topic.id).all()
        
    return get_due_cards(db, user_id=user.id, topic_db_id=topic.id)


@router.get("/topics/{topic_id}/mcqs", response_model=List[MCQOut])
def get_topic_mcqs(topic_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    topic = db.query(Topic).filter(Topic.topic_id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    return get_adaptive_mcq(db, user_id=user.id, topic_id=topic.id, limit=10)


@router.get("/mcq/random", response_model=List[MCQOut])
def get_random_mcqs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_adaptive_mcq(db, user_id=user.id, topic_id=None, limit=10)



@router.post("/topics/{topic_id}/reset")
def reset_progress(topic_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from models import UserPerformance, AnswerLog
    topic = db.query(Topic).filter(Topic.topic_id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Delete UserPerformance joined with Card/MCQ in this topic
    perfs = (
        db.query(UserPerformance)
        .join(Card, Card.id == UserPerformance.card_id, isouter=True)
        .join(MCQ, MCQ.id == UserPerformance.mcq_id, isouter=True)
        .filter(UserPerformance.user_id == user.id)
        .filter((Card.topic_id == topic.id) | (MCQ.topic_id == topic.id))
    )
    for p in perfs:
        db.delete(p)
        
    # Delete AnswerLog
    db.query(AnswerLog).filter(AnswerLog.user_id == user.id, AnswerLog.topic_id == topic.id).delete()
    
    db.commit()
    return {"status": "success", "message": f"Progress for {topic.name} has been reset."}


@router.post("/syllabus/generate")
def generate_syllabus(data: SyllabusGenerateRequest, db: Session = Depends(get_db)):
    from services.groq_generator import groq_generator
    
    try:
        syllabus_data = groq_generator.generate_syllabus(
            data.subject,
            num_subtopics=data.num_subtopics,
            cards_per_topic=data.cards_per_topic,
            mcqs_per_topic=data.mcqs_per_topic
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Generation failed: {str(e)}")
    
    parent_topic = Topic(
        topic_id=str(uuid.uuid4())[:8],
        name=syllabus_data["name"],
        description=syllabus_data.get("description", ""),
        order=0
    )
    db.add(parent_topic)
    db.flush()
    
    _create_subtopics_from_data(db, parent_topic.id, syllabus_data.get("subtopics", []))
    db.commit()
    return {"created_parent_id": parent_topic.id}

@router.post("/syllabus/suggest")
def suggest_topics(data: SyllabusSuggestRequest, db: Session = Depends(get_db)):
    from services.groq_generator import groq_generator
    suggestions = groq_generator.suggest_related_topics(data.subject, data.existing_topics)
    return {"suggestions": suggestions}

@router.post("/syllabus/extend")
def extend_syllabus(data: SubtopicExtendRequest, db: Session = Depends(get_db)):
    from services.groq_generator import groq_generator
    
    try:
        subtopics_data = groq_generator.generate_subtopics(
            data.subject,
            data.topics,
            cards_per_topic=data.cards_per_topic,
            mcqs_per_topic=data.mcqs_per_topic
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extension failed: {str(e)}")
    
    _create_subtopics_from_data(db, data.parent_id, subtopics_data)
    db.commit()
    return {"status": "success"}

def _create_subtopics_from_data(db: Session, parent_id: int, subtopics_list: list):
    for idx, sub in enumerate(subtopics_list):
        st = Topic(
            topic_id=str(uuid.uuid4())[:8],
            name=sub["name"],
            description=sub.get("description", ""),
            parent_id=parent_id,
            order=idx + 100 # Offset for extensions
        )
        db.add(st)
        db.flush()
        
        for card in sub.get("cards", []):
            new_card = Card(
                card_id=str(uuid.uuid4())[:8],
                topic_id=st.id,
                title=card["front"][:255],
                content=card["back"],
                type="basics",
                source="ai"
            )
            db.add(new_card)
        
        for mcq in sub.get("mcqs", []):
            new_mcq = MCQ(
                mcq_id=str(uuid.uuid4())[:8],
                topic_id=st.id,
                question=mcq["question"],
                options=json.dumps(mcq["options"]),
                correct_index=mcq["answer_index"],
                explanation=mcq.get("explanation", ""),
                source="ai"
            )
            db.add(new_mcq)


@router.delete("/topics/{topic_id}")
def delete_topic(topic_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    topic = db.query(Topic).filter(Topic.topic_id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Check if user has permission (in single user mode this is implied, but good practice)
    # Recursively delete children if any (cascade="all, delete-orphan" handles this if logic is right)
    db.delete(topic)
    db.commit()
    return {"status": "success", "message": f"Topic {topic.name} deleted successfully."}


@router.post("/topics/delete-bulk")
def delete_topics_bulk(data: BulkDeleteRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    topics = db.query(Topic).filter(Topic.topic_id.in_(data.topic_ids)).all()
    
    count = 0
    for t in topics:
        if t in db:
            db.delete(t)
            count += 1
        
    db.commit()
    return {"status": "success", "message": f"Deleted {count} topics successfully."}

