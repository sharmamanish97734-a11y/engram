import os
import sys
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User
from services import wallet_engine

def check_inactivity():
    db = SessionLocal()
    now = datetime.utcnow()
    
    users = db.query(User).filter(User.is_active == True).all()
    
    for user in users:
        if not user.last_activity_at:
            continue
            
        diff_minutes = (now - user.last_activity_at).total_seconds() / 60
        
        # We apply the largest penalty that fits
        penalty_event = None
        if diff_minutes >= 180: # 3 hours
            penalty_event = "inactivity_3hr"
        elif diff_minutes >= 60: # 1 hour
            penalty_event = "inactivity_1hr"
        elif diff_minutes >= 30: # 30 min
            penalty_event = "inactivity_30min"
            
        if penalty_event:
            delta, label = wallet_engine.penalize(db, user, penalty_event)
            # Update last_activity_at to 'now' so they aren't penalized again 
            # until another 30 mins of inactivity passes.
            user.last_activity_at = now
            print(f"Applied {penalty_event} to {user.username}: {label}")
            
    db.commit()
    db.close()

if __name__ == "__main__":
    check_inactivity()
