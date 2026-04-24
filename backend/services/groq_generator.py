import json
import os
from typing import Dict, Any, List
from openai import OpenAI
from dotenv import load_dotenv
from config import settings

# Load environment variables (as requested)
load_dotenv()

class GroqGenerator:
    def __init__(self):
        # Prefer settings but fallback to env if needed for strict adherence
        api_key = os.getenv("GROQ_API_KEY") or settings.GROQ_API_KEY
        base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
        
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url
        )
        self.model = "llama-3.3-70b-versatile"

    def generate_syllabus(self, subject: str, num_subtopics=5, cards_per_topic=12, mcqs_per_topic=10) -> Dict[str, Any]:
        """
        Generates a syllabus using Groq LLM.
        Returns a dict following the exact JSON structure required.
        """
        system_prompt = f"""You are an educational content creator.
Generate a comprehensive syllabus for '{subject}'.
The response MUST be a JSON object with this exact structure:
{{
  "name": "{subject}",
  "description": "Detailed overview of the subject",
  "subtopics": [
    {{
      "name": "Subtopic Title",
      "description": "Subtopic detail",
      "cards": [ {{"front": "...", "back": "..."}} ],
      "mcqs": [ {{"question": "...", "options": ["...", "...", "...", "..."], "answer_index": 0, "explanation": "..."}} ]
    }}
  ]
}}

Constraints:
1. Generate {num_subtopics} subtopics.
2. Each subtopic must have {cards_per_topic} flashcards.
3. Each subtopic must have {mcqs_per_topic} MCQs.
4. Language: English.
5. Ensure the JSON is valid and follows the structure perfectly.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Create a syllabus for {subject}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            print(f"Error generating syllabus: {e}")
            raise e

    def suggest_related_topics(self, subject: str, existing_topics: List[str]) -> List[Dict[str, str]]:
        """
        Suggests 5 related topics for a given subject, avoiding duplicates with existing_topics.
        """
        system_prompt = f"""You are an educational consultant. 
Identify 5 advanced or related subtopics for the subject '{subject}'.
Exclude these existing topics: {", ".join(existing_topics)}.
The response MUST be a JSON object with this structure:
{{
  "suggestions": [
    {{ "name": "Topic Name", "description": "Short 1-sentence teaser" }},
    ...
  ]
}}
Language: English (natural and professional).
"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Suggest more for {subject}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.7
            )
            data = json.loads(response.choices[0].message.content)
            return data.get("suggestions", [])
        except Exception as e:
            print(f"Error suggesting topics: {e}")
            return []

    def generate_subtopics(self, subject: str, topic_names: List[str], cards_per_topic=8, mcqs_per_topic=5) -> List[Dict[str, Any]]:
        """
        Generates full content for specific subtopic names within a subject context.
        """
        system_prompt = f"""You are an educational content creator.
For the subject '{subject}', create detailed learning modules for these specific topics: {", ".join(topic_names)}.
The response MUST be a JSON object with this structure:
{{
  "subtopics": [
    {{
      "name": "Topic Name",
      "description": "Short detail",
      "cards": [ {{"front": "...", "back": "..."}} ],
      "mcqs": [ {{"question": "...", "options": ["...", "..."], "answer_index": 0, "explanation": "..."}} ]
    }}
  ]
}}
Constraints:
- {cards_per_topic} flashcards and {mcqs_per_topic} MCQs per subtopic.
- Content must be in English only. All questions, answers, and explanations in English.
"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Create content for {topic_names}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.3
            )
            data = json.loads(response.choices[0].message.content)
            return data.get("subtopics", [])
        except Exception as e:
            print(f"Error generating subtopics: {e}")
            raise e

groq_generator = GroqGenerator()
