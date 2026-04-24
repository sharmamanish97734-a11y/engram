import hashlib
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from openai import OpenAI
from sqlalchemy.orm import Session

from config import settings
from models import AICache

class AIService:
    def __init__(self):
        self._client = None
        self.fast_model = "llama-3.1-8b-instant"
        self.versatile_model = "llama-3.3-70b-versatile"
        self.cache_ttl_days = 7

    @property
    def client(self):
        if self._client is None:
            self._client = OpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url=settings.GROQ_BASE_URL
            )
        return self._client

    def _generate_cache_key(self, func_name: str, params: Dict[str, Any]) -> str:
        # Create a stable string representation of params
        param_str = json.dumps(params, sort_keys=True)
        key_str = f"{func_name}:{param_str}"
        return hashlib.sha256(key_str.encode()).hexdigest()

    def _get_from_cache(self, db: Session, cache_key: str) -> Optional[str]:
        cache_entry = db.query(AICache).filter(AICache.cache_key == cache_key).first()
        if cache_entry:
            # Check if cache is still valid (less than 7 days old)
            now = datetime.utcnow()
            # Ensure created_at is naive for comparison if necessary, or use aware
            created_at = cache_entry.created_at.replace(tzinfo=None) if cache_entry.created_at.tzinfo else cache_entry.created_at
            if now - created_at < timedelta(days=self.cache_ttl_days):
                return cache_entry.response
            else:
                # Stale cache: remove it
                db.delete(cache_entry)
                db.commit()
        return None

    def _save_to_cache(self, db: Session, cache_key: str, response: str):
        # Using merge to handle potential duplicates/updates
        cache_entry = AICache(cache_key=cache_key, response=response)
        db.merge(cache_entry)
        db.commit()

    def _call_groq(self, model: str, messages: List[Dict[str, str]], json_mode: bool = False) -> str:
        # Note: Groq's JSON mode requires the word 'JSON' in the user prompt
        response_format = {"type": "json_object"} if json_mode else None
        
        completion = self.client.chat.completions.create(
            model=model,
            messages=messages,
            response_format=response_format,
            temperature=0.1 # Low temperature for more consistent JSON
        )
        return completion.choices[0].message.content

    def explain_answer(self, db: Session, question: str, correct_option: str, user_choice: str, topic: str) -> str:
        params = {"question": question, "correct_option": correct_option, "user_choice": user_choice, "topic": topic}
        cache_key = self._generate_cache_key("explain_answer", params)
        
        cached = self._get_from_cache(db, cache_key)
        if cached:
            return cached

        messages = [
            {"role": "system", "content": f"You are a friendly, enthusiastic tutor for {topic}. Explain why the correct answer is right and gently clarify the user's mistake. Use a warm, conversational tone — mostly English but with a little Hinglish (like 'bilkul sahi', 'dekho', 'samajh gaye?') to feel approachable and fun. Keep it encouraging!"},
            {"role": "user", "content": f"Question: {question}\nCorrect Answer: {correct_option}\nUser Choice: {user_choice}"}
        ]
        
        response = self._call_groq(self.fast_model, messages)
        self._save_to_cache(db, cache_key, response)
        return response

    def get_hint(self, db: Session, question: str, options: List[str]) -> str:
        params = {"question": question, "options": options}
        cache_key = self._generate_cache_key("get_hint", params)
        
        cached = self._get_from_cache(db, cache_key)
        if cached:
            return cached

        messages = [
            {"role": "system", "content": "Provide a brief (1-sentence) hint for the given question in English. Do not reveal the answer directly."},
            {"role": "user", "content": f"Question: {question}\nOptions: {options}"}
        ]
        
        response = self._call_groq(self.fast_model, messages)
        self._save_to_cache(db, cache_key, response)
        return response

    def deep_dive(self, db: Session, title: str, content: str) -> str:
        params = {"title": title, "content": content}
        cache_key = self._generate_cache_key("deep_dive", params)
        
        cached = self._get_from_cache(db, cache_key)
        if cached:
            return cached

        messages = [
            {"role": "system", "content": "You are an enthusiastic, friendly tutor. Give a detailed, engaging 'Deep Dive' explanation of the concept in a warm conversational style — mostly English but sprinkle in a little Hinglish (like 'yaar', 'suno', 'samjhe?', 'ekdum clear') to make it feel fun and relatable. Use analogies, real-world examples, and break things down step by step. Make the student feel excited to learn!"},
            {"role": "user", "content": f"Concept: {title}\nCurrent summary: {content}\n\nPlease explain this in extreme depth."}
        ]
        
        response = self._call_groq(self.versatile_model, messages)
        self._save_to_cache(db, cache_key, response)
        return response


    def generate_cards(self, db: Session, topic: str, count: int = 10) -> List[Dict[str, Any]]:
        params = {"topic": topic, "count": count}
        cache_key = self._generate_cache_key("generate_cards", params)
        
        cached = self._get_from_cache(db, cache_key)
        if cached:
            return json.loads(cached)

        # Prompt modified to fit JSON mode requirements (must be object)
        messages = [
            {"role": "system", "content": "You are a learning content generator. Respond with a JSON object containing a key 'cards' which is an array of objects. Each object must have 'title' (in English) and 'content' (in English)."},
            {"role": "user", "content": f"Generate {count} learning cards for the topic: {topic} in JSON format."}
        ]
        
        response_str = self._call_groq(self.versatile_model, messages, json_mode=True)
        # Extract array to satisfy original method return type
        data = json.loads(response_str)
        cards = data.get("cards", [])
        
        # We cache the full JSON for consistency
        self._save_to_cache(db, cache_key, json.dumps(cards))
        return cards

    def generate_mcq(self, db: Session, topic: str, difficulty: str, count: int = 5) -> List[Dict[str, Any]]:
        params = {"topic": topic, "difficulty": difficulty, "count": count}
        cache_key = self._generate_cache_key("generate_mcq", params)
        
        cached = self._get_from_cache(db, cache_key)
        if cached:
            return json.loads(cached)

        messages = [
            {"role": "system", "content": "You are a quiz builder. Respond with a JSON object containing a key 'mcqs' which is an array. Each MCQ must have 'question' (in English), 'options' (array of 4 in English), 'correct_index' (0-3), and 'explanation' (in English). All content must be in English only."},
            {"role": "user", "content": f"Generate {count} {difficulty} MCQs for {topic} in JSON format."}
        ]
        
        response_str = self._call_groq(self.versatile_model, messages, json_mode=True)
        data = json.loads(response_str)
        mcqs = data.get("mcqs", [])
        
        self._save_to_cache(db, cache_key, json.dumps(mcqs))
        return mcqs

    def analyze_weak_areas(self, db: Session, wrong_answers: List[str], topic_accuracies: Dict[str, float]) -> Dict[str, Any]:
        params = {"wrong_answers": wrong_answers, "topic_accuracies": topic_accuracies}
        cache_key = self._generate_cache_key("analyze_weak_areas", params)
        
        cached = self._get_from_cache(db, cache_key)
        if cached:
            return json.loads(cached)

        messages = [
            {"role": "system", "content": "You are a study analyst. Respond with a JSON object analyzing student performance in English."},
            {"role": "user", "content": f"Analyze these wrong answers: {wrong_answers} and accuracies: {topic_accuracies} and summarize in JSON."}
        ]
        
        response_str = self._call_groq(self.versatile_model, messages, json_mode=True)
        self._save_to_cache(db, cache_key, response_str)
        return json.loads(response_str)

ai_service = AIService()
