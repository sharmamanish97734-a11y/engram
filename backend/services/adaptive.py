from sqlalchemy.orm import Session
from models import MCQ, Card


def get_adaptive_mcq(db: Session, user_id: int, topic_id: int | None = None, limit: int = 10):
    """
    Return MCQs adaptive to user accuracy:
    >80% accuracy → hard, 50-80% → mixed, <50% → easy first
    Falls back to random if no performance data yet.
    """
    from models import UserPerformance
    from sqlalchemy import func

    # Calculate overall accuracy
    perfs = db.query(UserPerformance).filter_by(user_id=user_id).all()
    total_correct = sum(p.correct_count for p in perfs)
    total_wrong = sum(p.wrong_count for p in perfs)
    total = total_correct + total_wrong

    if total == 0:
        accuracy = 0.5  # default: mixed
    else:
        accuracy = total_correct / total

    query = db.query(MCQ)
    if topic_id:
        query = query.filter(MCQ.topic_id == topic_id)

    if accuracy > 0.8:
        preferred = query.filter(MCQ.difficulty == "hard")
    elif accuracy < 0.5:
        preferred = query.filter(MCQ.difficulty == "easy")
    else:
        preferred = query

    results = preferred.order_by(func.random()).limit(limit).all()
    if len(results) < limit:
        fallback = query.order_by(func.random()).limit(limit - len(results)).all()
        seen_ids = {m.id for m in results}
        results += [m for m in fallback if m.id not in seen_ids]

    return results[:limit]
