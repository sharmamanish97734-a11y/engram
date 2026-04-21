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

groq_generator = GroqGenerator()
