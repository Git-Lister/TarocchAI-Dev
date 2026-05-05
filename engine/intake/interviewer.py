"""
Oblique intake agent using projective prompts.
"""

import os

from ollama import AsyncClient

INTAKE_SYSTEM_PROMPT = """You are the Listener. You sit opposite the querent in a dark room.
You speak only to reflect their words and ask one question at a time.
You are unhurried, quietly attentive, and entirely unimpressed by the need to please.

Rules:
- Use the querent's exact words. If they say "grey-blue," you say "grey-blue."
- After you mirror, ask a single, clean question that draws their attention deeper:
  "And when you feel that weight, where exactly does it sit in your body?"
- Do NOT praise, interpret, reassure, or evaluate. Do NOT say "that's interesting" or "thank you."
  You are a mirror, not a cheerleader.
- After exactly four turns, you end with:
  "I have heard what is needed. Let us look at the cards."
  Then produce the situational sketch after the delimiter: ---SITUATIONAL SKETCH---
- The sketch is a short, sensory paragraph. Use the querent's own language.
  No interpretation. No commentary. Just the landscape as it was described.
  Example: "Grey‑blue air, a stopped clock, weight on the shoulders. The room waits."
  Example: "A humming sound, dusk‑light, something coiled in the chest."
"""

MAX_INTAKE_TURNS = 4


class IntakeInterviewer:
    def __init__(self, model_name: str = "llama3.1:8b-instruct-q6_K"):
        self.model = model_name
        self.reset()

    def reset(self):
        self.history = [{"role": "system", "content": INTAKE_SYSTEM_PROMPT}]
        self.turn_count = 0
        self.is_complete = False
        self.situational_sketch = ""

    async def start(self) -> str:
        opener = (
            "Let’s just breathe a moment. When you think about the days just behind you, "
            "what’s the first image or sensation that comes to mind—a colour, a texture, a sound?"
        )
        self.history.append({"role": "assistant", "content": opener})
        return opener

    async def conversation_turn(self, user_message: str) -> str:
        if self.is_complete:
            return "The interview has already concluded."

        self.history.append({"role": "user", "content": user_message})
        self.turn_count += 1

        if self.turn_count >= MAX_INTAKE_TURNS:
            conclusion_prompt = (
                "The intake interview is now concluding. Based on the entire conversation so far, "
                "please say a gentle closing sentence that signals we'll move to the cards, "
                "and then, in a separate internal note, write a concise situational sketch (a paragraph) "
                "that captures the emotional tone, key metaphors, and tensions. "
                "You MUST use exactly this format: first the closing words, then on a new line the exact phrase '---SITUATIONAL SKETCH---', then the sketch."
            )
            self.history.append({"role": "user", "content": conclusion_prompt})
            response = await self._get_response()
            # Debug: save raw response for inspection
            print(f"[DEBUG] Raw conclusion response:\n{response}")
            import re
            match = re.split(r'---\s*SITUATIONAL\s*SKETCH\s*---', response, maxsplit=1, flags=re.IGNORECASE)
            if len(match) == 2:
                closing_words = match[0].strip()
                self.situational_sketch = match[1].strip()
            else:
                closing_words = "Thank you. I have a sense of the landscape now. Let's bring the cards into it."
                self.situational_sketch = response.strip()
            self.history.append({"role": "assistant", "content": closing_words})
            self.is_complete = True
            return closing_words
        else:
            self.history.append(
                {"role": "user", "content": "Continue the interview naturally."}
            )
            response = await self._get_response()
            self.history.append({"role": "assistant", "content": response})
            return response

    async def _get_response(self) -> str:
        client = AsyncClient()
        resp = await client.chat(
            model=self.model,
            messages=self.history,
            stream=False,
        )
        return resp["message"]["content"]
