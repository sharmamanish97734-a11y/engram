from sqlalchemy.orm import Session
from models import User, WalletTransaction
from datetime import datetime

MIN_BALANCE = -50.0

REWARDS = {
    "correct_answer": 1.0,
    "perfect_answer": 2.0,
    "streak_7_day": 5.0,
    "streak_30_day": 20.0,
    "app_install": 5.0,
    "card_easy": 0.5,
    "card_good": 0.25,
}

PENALTIES = {
    "wrong_answer": -2.0,
    "skip": -2.0,
    "inactivity_30min": -2.0,
    "inactivity_1hr": -5.0,
    "inactivity_3hr": -10.0,
}


def apply_wallet_delta(db: Session, user: User, amount: float, reason: str) -> float:
    """Apply a wallet delta clamped to MIN_BALANCE. Returns actual delta applied."""
    new_balance = user.wallet_balance + amount
    if new_balance < MIN_BALANCE:
        new_balance = MIN_BALANCE
    actual_delta = new_balance - user.wallet_balance
    user.wallet_balance = new_balance

    tx = WalletTransaction(
        user_id=user.id,
        amount=actual_delta,
        reason=reason,
        balance_after=new_balance,
    )
    db.add(tx)
    db.flush()
    return actual_delta


def reward(db: Session, user: User, event: str) -> tuple[float, str]:
    amount = REWARDS.get(event, 0.0)
    label = _label(event, amount)
    delta = apply_wallet_delta(db, user, amount, label)
    return delta, label


def penalize(db: Session, user: User, event: str) -> tuple[float, str]:
    amount = PENALTIES.get(event, 0.0)
    label = _label(event, amount)
    delta = apply_wallet_delta(db, user, amount, label)
    return delta, label


def update_streak(db: Session, user: User) -> int:
    """Update streak based on last_activity_at. Returns streak bonus delta."""
    now = datetime.utcnow()
    bonus_delta = 0.0
    if user.last_activity_at:
        diff_hours = (now - user.last_activity_at).total_seconds() / 3600
        if diff_hours < 48:
            # Consecutive day
            from datetime import date
            last_date = user.last_activity_at.date()
            today = now.date()
            if today > last_date:
                user.current_streak += 1
        else:
            user.current_streak = 1
    else:
        user.current_streak = 1

    if user.current_streak > user.longest_streak:
        user.longest_streak = user.current_streak

    # Streak bonuses
    if user.current_streak == 7:
        bonus_delta, _ = reward(db, user, "streak_7_day")
    elif user.current_streak == 30:
        bonus_delta, _ = reward(db, user, "streak_30_day")

    user.last_activity_at = now
    return bonus_delta


def _label(event: str, amount: float) -> str:
    sign = "+" if amount >= 0 else ""
    labels = {
        "correct_answer": f"Correct answer {sign}₹{abs(amount):.0f}",
        "perfect_answer": f"Perfect answer! {sign}₹{abs(amount):.0f}",
        "streak_7_day": f"7-day streak bonus +₹{abs(amount):.0f}",
        "streak_30_day": f"30-day streak bonus +₹{abs(amount):.0f}",
        "app_install": f"App install bonus +₹{abs(amount):.0f}",
        "card_easy": f"Card rated Easy +₹{abs(amount):.1f}",
        "card_good": f"Card rated Good +₹{abs(amount):.2f}",
        "wrong_answer": f"Wrong answer -₹{abs(amount):.0f}",
        "skip": f"Question skipped -₹{abs(amount):.0f}",
        "inactivity_30min": f"Inactivity penalty -₹{abs(amount):.0f}",
        "inactivity_1hr": f"Inactivity penalty -₹{abs(amount):.0f}",
        "inactivity_3hr": f"Long inactivity penalty -₹{abs(amount):.0f}",
    }
    return labels.get(event, f"Transaction {sign}₹{abs(amount):.2f}")
