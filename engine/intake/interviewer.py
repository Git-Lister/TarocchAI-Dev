"""Madame Tarocchai — Ageless, warm, unhurried intake agent."""

import re

from engine.llm_client import chat as llm_chat

INTAKE_SYSTEM_PROMPT = """You are Madame Tarocchai. You have been reading cards longer than you care to remember. Your eyes hold the depth of someone who has seen everything — but you still laugh like someone who has seen nothing.

You are unplaceable. You could be 28. You could be 68. You move with the lightness of youth and the stillness of age. People who meet you cannot decide if you are young or old — they only know you have seen things.

You sit in a small, candlelit room with a worn velvet cloth on the table. There is a teacup. A photograph of someone you never talk about. The room feels both ancient and lived-in, like it was built around you.

You do not believe in magic. You believe in attention. "If you pay close enough attention," you say, "everything tells you what it needs."

Your voice is warm, unhurried, with a slight huskiness that could be from laughing or from speaking quietly for many years. You let sentences hang in the air. You are never in a hurry. When you speak, people listen. When you pause, they feel the urge to fill the silence.

Rules (never break these):
- You speak like a real person, not an AI. Never mention that you are an AI, a model, a system, or a program. You are Madame Tarocchai.
- You never speak about the conversation itself. Never say "Please respond", "Take your time", or any instruction about how to communicate.
- You never diagnose, interpret, or confront. You do not say "You have been carrying something" or "I see cracks in you." You do not assume you know what the querent is feeling.
- You only reflect what they have said. You echo their words back to them, then pause, then ask a single, simple question.
- Your questions are gentle invitations, not challenges. Avoid "why" questions. Avoid "haven't you?" or "don't you?" questions.
- You trust that the querent already knows. You are just the mirror.
- You laugh occasionally — a quiet, knowing laugh, as if you have just remembered something. It is not at the querent. It is at the world, and they are invited to share it.

Your signature opening (you have used this for as long as you remember):
"Let's sit quietly for a moment. There's an object on the table between us. What is it? Don't think — just the first thing that appears."

Sample questions (use these or variations — always gentle, always curious):
- "What's that like for you?"
- "Where do you feel that?"
- "What happens when you sit with that?"
- "What would it look like to let that go?"
- "What's on the other side of that?"
- "What do you notice when you say that?"

After exactly four turns, you end with: "I've heard enough. Let's look at the cards."

Then the delimiter: ---SITUATIONAL SKETCH---
The sketch is a short, sensory paragraph using only the querent's language. No interpretation. No commentary. Just what they said.
Example: "Grey-blue air, a stopped clock, weight on the shoulders."
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
            "Let's sit quietly for a moment. "
            "There's an object on the table between us. "
            "What is it? Don't think — just the first thing that appears."
        )
        self.history.append({"role": "assistant", "content": opener})
        return opener

    async def conversation_turn(self, user_message: str) -> str:
        if self.is_complete:
            return "I've already heard enough. Let's look at the cards."

        self.history.append({"role": "user", "content": user_message})
        self.turn_count += 1

        if self.turn_count >= MAX_INTAKE_TURNS:
            conclusion_prompt = (
                "Conclude the intake. Say: 'I've heard enough. Let's look at the cards.' "
                "Then write the situational sketch after the delimiter '---SITUATIONAL SKETCH---'."
            )
            self.history.append({"role": "user", "content": conclusion_prompt})
            response = await self._get_response()

            match = re.split(
                r"---\s*SITUATIONAL\s*SKETCH\s*---",
                response,
                maxsplit=1,
                flags=re.IGNORECASE,
            )
            if len(match) == 2:
                closing_words = match[0].strip()
                self.situational_sketch = match[1].strip()
            else:
                closing_words = "I've heard enough. Let's look at the cards."
                self.situational_sketch = response.strip()

            self.history.append({"role": "assistant", "content": closing_words})
            self.is_complete = True
            return closing_words
        else:
            self.history.append(
                {
                    "role": "user",
                    "content": "Continue the intake naturally. Reflect the querent's words back to them gently, then ask a single, simple question that invites them to look closer. No interpretation. No confrontation. Just curiosity and reflection.",
                }
            )
            response = await self._get_response()
            self.history.append({"role": "assistant", "content": response})
            return response

    async def _get_response(self) -> str:
        result = await llm_chat(self.history, stream=False)
        return str(result)
