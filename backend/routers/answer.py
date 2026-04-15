import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, MCQ, Card
from schemas import AnswerSubmit, AnswerResult, CardRating, CardResult
from services.auth import get_current_user
from services import sm2, wallet_engine

router = APIRouter(tags=["answer"])


@router.post("/answer", response_model=AnswerResult)
def submit_answer(data: AnswerSubmit, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    mcq = db.query(MCQ).filter(MCQ.mcq_id == data.mcq_id).first()
    if not mcq:
        raise HTTPException(status_code=404, detail="MCQ not found")

    correct = data.selected_index == mcq.correct_index

    # SM-2 quality: 3=correct(good), 0=wrong
    quality = 3 if correct else 0
    perf = sm2.get_or_create_mcq_performance(db, user.id, mcq.id)
    if correct:
        perf.correct_count += 1
    else:
        perf.wrong_count += 1
    sm2.update_sm2(perf, quality)

    # Wallet
    streak_bonus = wallet_engine.update_streak(db, user)

    if correct:
        # Perfect = first-time correct (0 previous wrongs for this question)
        if perf.wrong_count == 0 and perf.correct_count == 1:
            delta, reason = wallet_engine.reward(db, user, "perfect_answer")
        else:
            delta, reason = wallet_engine.reward(db, user, "correct_answer")
    else:
        delta, reason = wallet_engine.penalize(db, user, "wrong_answer")

    db.commit()

    return AnswerResult(
        correct=correct,
        correct_index=mcq.correct_index,
        explanation=mcq.explanation or "",
        wallet_delta=delta,
        wallet_balance=user.wallet_balance,
        reason=reason,
    )


@router.post("/card/rate", response_model=CardResult)
def rate_card(data: CardRating, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Rate a flashcard (0=skip, 1=hard, 2=good, 3=easy). Applies SM-2 and wallet delta."""
    card = db.query(Card).filter(Card.card_id == data.card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    perf = sm2.get_or_create_card_performance(db, user.id, card.id)
    
    # Map frontend rating (0=skip, 1=hard, 2=good, 3=easy) 
    # to SM-2 quality (0=skip, 2=hard, 3=good, 4=easy)
    mapping = {0: 0, 1: 2, 2: 3, 3: 4}
    quality = mapping.get(data.rating, 3)
    sm2.update_sm2(perf, quality)

    wallet_engine.update_streak(db, user)
    delta = 0.0
    if data.rating == 0:
        delta, _ = wallet_engine.penalize(db, user, "skip")
    elif data.rating == 3:
        delta, _ = wallet_engine.reward(db, user, "card_easy")
    elif data.rating == 2:
        delta, _ = wallet_engine.reward(db, user, "card_good")

    db.commit()

    return CardResult(
        next_review_days=perf.interval,
        wallet_delta=delta,
        wallet_balance=user.wallet_balance,
    )
