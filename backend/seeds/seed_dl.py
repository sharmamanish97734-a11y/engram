import json
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
from models import Topic, Card, MCQ

SYLLABUS_PATH = os.path.join(os.path.dirname(__file__), "dl_syllabus.json")


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    with open(SYLLABUS_PATH, "r") as f:
        data = json.load(f)

    for t in data["topics"]:
        existing = db.query(Topic).filter(Topic.topic_id == t["topic_id"]).first()
        if existing:
            print(f"  [SKIP] Topic already exists: {t['name']}")
            continue

        topic = Topic(
            topic_id=t["topic_id"],
            name=t["name"],
            category=t.get("category"),
            order=t.get("order", 0),
            estimated_minutes=t.get("estimated_minutes", 30),
        )
        db.add(topic)
        db.flush()

        for c in t.get("cards", []):
            card = Card(
                card_id=c["card_id"],
                topic_id=topic.id,
                title=c["title"],
                type=c.get("type", "basics"),
                difficulty=c.get("difficulty", "medium"),
                content=c["content"],
                tags=json.dumps(c.get("tags", [])),
            )
            db.add(card)

        for m in t.get("mcqs", []):
            mcq = MCQ(
                mcq_id=m["mcq_id"],
                topic_id=topic.id,
                question=m["question"],
                options=json.dumps(m["options"]),
                correct_index=m["correct_index"],
                explanation=m.get("explanation", ""),
                difficulty=m.get("difficulty", "medium"),
                tags=json.dumps(m.get("tags", [])),
            )
            db.add(mcq)

        print(f"  [OK] Seeded topic: {t['name']} ({len(t.get('cards',[]))} cards, {len(t.get('mcqs',[]))} MCQs)")

    db.commit()
    db.close()
    print("\n✅ Seeding complete!")


if __name__ == "__main__":
    seed()
