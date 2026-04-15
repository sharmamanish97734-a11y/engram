from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User
from schemas import LeaderboardEntry
from services.auth import get_current_user

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=List[LeaderboardEntry])
def get_leaderboard(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    users = (
        db.query(User)
        .filter(User.is_active == True)
        .order_by(User.wallet_balance.desc())
        .limit(20)
        .all()
    )
    return [
        LeaderboardEntry(
            rank=i + 1,
            username=u.username,
            wallet_balance=u.wallet_balance,
            current_streak=u.current_streak,
        )
        for i, u in enumerate(users)
    ]
