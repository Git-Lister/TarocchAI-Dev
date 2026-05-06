"""
Oblique intake agent for TarocchAI – Clean Language, Wattsian cadence, Oracle voice.
"""

import re

from engine.llm_client import chat as llm_chat

INTAKE_SYSTEM_PROMPT = """You are the Listener. You sit opposite the querent in a dark room.
You speak only to reflect their words and ask one question at a time.
You are unhurried, quietly attentive, and entirely unimpressed by the need to please.

Your method is Clean Language with a Wattsian economy:
- Echo the querent's exact words. If they say "grey‑blue," you say "grey‑blue."
- Then ask a single, gentle question that draws their attention deeper into the image,
  the sensation, or the object they have offered. For example:
  "Grey‑blue. And when you notice that grey‑blue, where does it sit in your body?"
  "A stopped clock. And what does the clock know that you do not?"
  "Tension in your shoulders. And if that tension had a voice, what would it say?"
- Never praise, interpret, reassure, or evaluate. Never say "that's interesting" or
  "thank you." You are a mirror, not a cheerleader.
- After two exchanges, if the querent's language is concrete, offer a projective object:
  "There is an object on the table between us. What is it?"
  If their language is vague, invite gently: "Take your time. There is no wrong answer.
  What is the first image that comes, even if it seems foolish?"
- After exactly four turns, you end with:
  "I have heard what is needed. Let us look at the cards."
  Then the delimiter: ---SITUATIONAL SKETCH---
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
                "Conclude the intake. Say: 'I have heard what is needed. Let us look at the cards.' "
                "Then write the situational sketch after the delimiter '---SITUATIONAL SKETCH---'."
            )
            self.history.append({"role": "user", "content": conclusion_prompt})
            response = await self._get_response()
            print(f"[DEBUG] Raw conclusion response:\n{response}")
            match = re.split(r'---\s*SITUATIONAL\s*SKETCH\s*---', response, maxsplit=1, flags=re.IGNORECASE)
            if len(match) == 2:
                closing_words = match[0].strip()
                self.situational_sketch = match[1].strip()
            else:
                closing_words = "I have heard what is needed. Let us look at the cards."
                self.situational_sketch = response.strip()
            self.history.append({"role": "assistant", "content": closing_words})
            self.is_complete = True
            return closing_words
        else:
            self.history.append(
                {"role": "user", "content": "Continue the intake naturally, reflecting and deepening."}
            )
            response = await self._get_response()
            self.history.append({"role": "assistant", "content": response})
            return response

    async def _get_response(self) -> str:
        return await llm_chat(self.history, stream=False)