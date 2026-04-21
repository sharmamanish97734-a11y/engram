from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User
from config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_or_create_default_user(db: Session) -> User:
    # First attempt to get user with ID 1
    user = db.query(User).filter(User.id == 1).first()
    if user:
        return user
    
    # If not found, get any user
    user = db.query(User).order_by(User.id.asc()).first()
    if user:
        return user

    # If no users exist, create the default one
    default_user = User(
        id=1,
        username="User",
        email="user@engram.local",
        hashed_password=hash_password("default"),
        wallet_balance=0.0,
        is_active=True,
    )
    db.add(default_user)
    db.commit()
    db.refresh(default_user)
    return default_user


def get_current_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    # Always return the default user, ignoring the token
    return get_or_create_default_user(db)
