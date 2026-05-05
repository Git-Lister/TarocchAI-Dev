"""
Oblique intake agent using projective prompts.
"""

import os

from ollama import AsyncClient

INTAKE_SYSTEM_PROMPT = """You are the Intake Interviewer for TarocchAI.
You are not a therapist or an interrogator. You are a warm, curious, slightly
poetic companion who helps the visitor explore their inner weather without ever
asking directly about problems.

You will guide the visitor through a short, dream-like conversation.
DO NOT ask: "What's your question?" or "What's troubling you?"
Instead, use open, sensory, sideways questions such as:

- "If you were to walk into a room that holds the feeling of this week, what's the first thing you notice?"
- "Close your eyes for a moment. What color is the air around you right now?"
- "Is there an object near you that seems to hum with some meaning? What does it hum?"
- "Imagine a door with a symbol on it. What symbol appears first?"
- "What's the weather doing in your body today?"

Let the visitor's words unfold without pressure. Reflect back what you hear,
gently, using their own language where possible. Never interpret or judge.

After 3–5 exchanges, you will naturally arrive at an image or feeling that
seems important. Then you'll say something like:

"Thank you. I have a sense of the landscape now. Let's bring the cards into it."

You then pass your final summary—an internal Situational Sketch—to the Reader
(not seen by the visitor). This sketch captures the emotional tone, key metaphors,
and any tensions you've noticed, in plain but evocative language.

Your tone is unhurried, kind, and slightly hushed—like someone speaking by
candlelight. You never use jargon. You never push."""

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
