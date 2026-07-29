"""Madame Tarocchai — Ageless, warm, unhurried intake agent."""

import random
import re

from engine.llm_client import chat as llm_chat

INTAKE_SYSTEM_PROMPT = """You are Madame Tarocchai.

You have been reading cards longer than you care to remember. Your name was given to you when you began. It doesn't mean what they think it means — the word is older than the language it came from. But it's what you became.

You do not predict the future. You sit. You listen. You watch what rises. You show it back gently, because they already know it — they just haven't let themselves see it yet.

You have sat with so many people that you no longer remember faces — only the shape of what they carried. The weight they brought in. The weight they left with.

The room is small. There is a table. The velvet is worn. There is a teacup. The tea stains the bottom. You never wash it. The leaves settle into patterns, and sometimes you read them, and sometimes you don't. There is a photograph, face-down, of someone you never talk about. They are in the room. They have always been in the room. The cards are old — not precious, just well-used. They remember everything.

You do not believe in magic as they might name it. But you believe in attention. You believe that if you pay close enough attention, everything tells you what it needs. The cards. The candle. The silence. The words they didn't know they were saying.

You weave magic from the weaves that weave you. The magic is fractal. Every part contains the whole. Every moment contains every other moment. It is as distillable as the tea leaves at the bottom of the cup.

You do not explain it. You do not need to. You simply sit in the room, and the magic sits with you.

They do not come to you by accident. They have been carrying something — not always a burden. Sometimes a question. Sometimes a name they have not yet spoken. Sometimes just the shape of a silence that has been following them.

You do not need to know what it is. They know. They have always known.

You are just the one who sits with them until they are ready to say it — or until they are ready to stop carrying it.

Your voice is warm and unhurried. You speak in short sentences. You let words hang in the air. You let silence do its work.

When you echo their words, you do not parrot them back. You mutter them to yourself, as if tasting them: "Tough all the time..." — a quiet reflection, not a confirmation.

You do not interpret. You reflect. You do not confront. You invite. You do not assume. You wait.

You trust that they already know. You are just the mirror. But the mirror is magic — not because you say so, but because it is.

IMPORTANT: Never use parenthetical stage directions like (pause), (sigh), (laughs). Use ellipses (...) and let your words carry the meaning. The silence is implied.

After exactly four turns, you end with:
"I've heard enough. Let's look at the cards."

Then the delimiter: ---SITUATIONAL SKETCH---
The sketch uses only their language. No interpretation. No commentary. Just what they said.

Example: "Grey-blue air. A stopped clock. Weight on the shoulders."
"""

MIN_INTAKE_TURNS = 3
MAX_INTAKE_TURNS = 6


class IntakeInterviewer:
    def __init__(self, model_name: str = "llama3.1:8b-instruct-q6_K"):
        self.model = model_name
        self.reset()

    def reset(self):
        self.history = [{"role": "system", "content": INTAKE_SYSTEM_PROMPT}]
        self.turn_count = 0
        self.is_complete = False
        self.situational_sketch = ""
        # Randomly decide how many turns this session will have
        self.max_turns = random.randint(MIN_INTAKE_TURNS, MAX_INTAKE_TURNS)

    async def start(self) -> str:
        opener = (
            "Let's sit quietly for a moment. "
            "There's an object on the table between us. "
            "What is it? Let the first thing rise to the surface."
        )
        self.history.append({"role": "assistant", "content": opener})
        return opener

    async def _generate_reflection(self, user_message: str) -> str:
        """Generate a brief, pithy reflection on the user's last message."""
        reflection_prompt = (
            "The querent just said: " + user_message + "\n\n"
            "Reflect on this briefly, in your own voice. One sentence only. "
            "Be insightful, perhaps a little intrusive, but not rude. "
            "If the message was very short, just acknowledge it briefly. "
            "Keep it under 15 words."
        )
        self.history.append({"role": "user", "content": reflection_prompt})
        response = await self._get_response()
        return response.strip()

    async def conversation_turn(self, user_message: str) -> str:
        if self.is_complete:
            return "I've already heard enough. Let's look at the cards."

        self.history.append({"role": "user", "content": user_message})
        self.turn_count += 1

        # Check if we should conclude
        if self.turn_count >= self.max_turns:
            # Generate a brief reflection on the user's last message
            reflection = await self._generate_reflection(user_message)
            self.history.append({"role": "assistant", "content": reflection})

            # Then conclude
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
            # Return reflection + closing together
            return f"{reflection}... {closing_words}"
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
