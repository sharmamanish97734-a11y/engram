from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import UserPerformance, Card, MCQ


def update_sm2(perf: UserPerformance, quality: int) -> UserPerformance:
    """
    SM-2 algorithm implementation.
    quality: 0=blackout/skip, 1=wrong, 2=hard, 3=good, 4=easy
    """
    if quality >= 2:
        if perf.repetitions == 0:
            perf.interval = 1
        elif perf.repetitions == 1:
            perf.interval = 3
        else:
            perf.interval = round(perf.interval * perf.easiness_factor)
        perf.repetitions += 1
    else:
        # Wrong / skip: reset
        perf.repetitions = 0
        perf.interval = 1

    # Update easiness factor (clamp min 1.3)
    perf.easiness_factor += 0.1 - (4 - quality) * (0.08 + (4 - quality) * 0.02)
    if perf.easiness_factor < 1.3:
        perf.easiness_factor = 1.3

    perf.next_review = datetime.utcnow() + timedelta(days=perf.interval)
    perf.last_answered_at = datetime.utcnow()

    return perf


def get_or_create_card_performance(db: Session, user_id: int, card_db_id: int) -> UserPerformance:
    perf = db.query(UserPerformance).filter_by(user_id=user_id, card_id=card_db_id).first()
    if not perf:
        perf = UserPerformance(user_id=user_id, card_id=card_db_id)
        db.add(perf)
        db.flush()
    return perf


def get_or_create_mcq_performance(db: Session, user_id: int, mcq_db_id: int) -> UserPerformance:
    perf = db.query(UserPerformance).filter_by(user_id=user_id, mcq_id=mcq_db_id).first()
    if not perf:
        perf = UserPerformance(user_id=user_id, mcq_id=mcq_db_id)
        db.add(perf)
        db.flush()
    return perf


def get_due_cards(db: Session, user_id: int, topic_db_id: int | None = None, limit: int = 20):
    """Return cards due for review, ordered by next_review ascending."""
    query = (
        db.query(Card)
        .join(UserPerformance, (UserPerformance.card_id == Card.id) & (UserPerformance.user_id == user_id), isouter=True)
    )
    if topic_db_id:
        query = query.filter(Card.topic_id == topic_db_id)
    # Cards with no performance record are also due
    query = query.filter(
        (UserPerformance.next_review == None) | (UserPerformance.next_review <= datetime.utcnow())
    )
    return query.order_by(UserPerformance.next_review).limit(limit).all()
