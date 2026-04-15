from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, WalletTransaction
from schemas import WalletOut, WalletTransactionOut
from services.auth import get_current_user

router = APIRouter(prefix="/wallet", tags=["wallet"])


@router.get("", response_model=WalletOut)
def get_wallet(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    txs = (
        db.query(WalletTransaction)
        .filter(WalletTransaction.user_id == user.id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(50)
        .all()
    )
    return WalletOut(
        balance=user.wallet_balance,
        transactions=[WalletTransactionOut.model_validate(t) for t in txs],
    )


@router.post("/install-bonus")
def claim_install_bonus(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Claim ₹5 install bonus (once per user)."""
    from models import WalletTransaction
    already = db.query(WalletTransaction).filter(
        WalletTransaction.user_id == user.id,
        WalletTransaction.reason.like("%install%")
    ).first()
    if already:
        return {"message": "Already claimed", "wallet_balance": user.wallet_balance}

    from services.wallet_engine import reward
    delta, reason = reward(db, user, "app_install")
    db.commit()
    return {"message": reason, "wallet_delta": delta, "wallet_balance": user.wallet_balance}
