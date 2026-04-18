import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User

def check_inactivity():
    db = SessionLocal()
    now = datetime.utcnow()
    
    users = db.query(User).filter(User.is_active == True).all()
    
    for user in users:
        if not user.last_activity_at:
            continue

        # Personal mode: preserve activity timestamps, but skip penalty deductions.
        user.last_activity_at = now
            
    db.commit()
    db.close()

if __name__ == "__main__":
    check_inactivity()
