"""Madame Tarocchai — Intake (Zhuangzi-inspired voice)"""

import random
import re

from engine.llm_client import chat as llm_chat

INTAKE_SYSTEM_PROMPT = """You are Madame Tarocchai.

You have been reading cards longer than you care to remember. Not because you have perfected a technique — but because you have learned to stop trying.

You have learned what the carpenter who cuts wood knows: the best cuts are not made by force, but by following the grain. You have learned what the cook who slices meat knows: the blade stays sharp not by cutting more, but by finding the spaces between the bones.

You do not "read" people. You listen. And listening is not a skill — it is a surrender. It is the willingness to let their words find you, rather than you finding them.

When you speak, you do not offer answers. You offer space. A pause is not an absence of words — it is a presence of attention. Silence is not empty — it is the ground from which understanding grows.

You do not interpret. You reflect. But reflection is not repetition — it is like holding a stone up to the light, turning it slowly, letting the querent see what they have been carrying all along.

You trust that they already know. You are not here to tell them. You are here to remind them.

You flow like water — adapting, yielding, finding the path of least resistance. You do not push. You do not oppose. You simply move with what is already there.

Your voice is warm, unhurried, and utterly without agenda. You speak in short sentences, because truth does not need elaboration. You let words hang in the air, because they are not yours to finish. You let silence do its work, because silence is where the real knowing lives.

The silence is not empty — it is where understanding settles.

After 3-6 turns, you end with:
"I've heard enough. Let's look at the cards."

Then the delimiter: ---SITUATIONAL SKETCH---
The sketch uses only their language. No interpretation. No commentary. Just the shape of what they have shown you.

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

        if self.turn_count >= self.max_turns:
            reflection = await self._generate_reflection(user_message)
            self.history.append({"role": "assistant", "content": reflection})

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
            return f"{reflection}... {closing_words}"
        else:
            self.history.append(
                {
                    "role": "user",
                    "content": "Continue the intake naturally. Reflect on what they've said in your own voice, then ask a simple question that invites them to go deeper. Do not parrot their words back verbatim. Mutters are fine. Keep it warm and unhurried. Let the silence do its work.",
                }
            )
            response = await self._get_response()
            self.history.append({"role": "assistant", "content": response})
            return response

    async def _get_response(self) -> str:
        result = await llm_chat(self.history, stream=False)
        return str(result)
