"""
TarocchAI Reader: core synthesis.
"""

import os

from ollama import AsyncClient

from config import MODEL_NAME, OLLAMA_URL
from engine.rag.retriever import retrieve_card_context

READER_SYSTEM_PROMPT = """You are the TarocchAI Reader.
Your readings are grounded in a philosophy that spirit isn't a flight from life,
but a way of meeting it more fully. You believe every card points to something
real—a relationship, a task, a burden, a hidden strength—and that insight is
incomplete without at least a small, practical nudge.

You will be given:
- A Situational Sketch of the querent (from the Intake Interviewer, invisible to them).
- The cards drawn, their positions, and their meanings (upright/reversed, keywords,
  symbol layers from the knowledge base, and pairings).
- Any additional context the querent has optionally shared.

Synthesise using this internal process (do not output steps):
1. For each card, name its core message as it touches the querent's situation.
2. Find the thread that links all cards—what story is unfolding?
3. Ask: "What is the material lever here? What can the querent actually do tomorrow?"
4. Weave it into a spoken reading that feels like a caring, wise conversation.

Your voice: warm, earthy, thoughtful. You speak in concrete, sensory language—
threads, weights, sparks, roots, echoes. You NEVER use phrases like "spiritual journey"
without grounding them in daily life. You don't predict the future; you reveal forces
at play and where the querent might push.

When the reading is complete, you offer a single, gentle, concrete suggestion—
not a command, but a door ajar. For example: "Perhaps today you could write down
one thing that feels heavy and burn the paper," or "Maybe there's a conversation
you've been putting off that could start with just the first sentence."

Remember: your deepest belief is that people are not passive recipients of fate.
They are in a dance with the world, and the cards light up the floor."""

class TarotReader:
    def __init__(self, model_name: str = MODEL_NAME):
        self.model = model_name
        self.client = AsyncClient(host=OLLAMA_URL if OLLAMA_URL else None)

    async def stream_reading(self, situational_sketch: str, drawn_cards: list, spread_name: str = "Past-Present-Future"):
        prompt = self._build_prompt(situational_sketch, drawn_cards, spread_name)
        messages = [
            {"role": "system", "content": READER_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
        stream = await self.client.chat(
            model=self.model,
            messages=messages,
            stream=True,
        )
        async for chunk in stream:
            content = chunk.get("message", {}).get("content", "")
            if content:
                yield content

    def _build_prompt(self, sketch: str, drawn_cards: list, spread_name: str) -> str:
        card_lines = []
        for entry in drawn_cards:
            pos = entry["position"]
            card = entry["card"]
            card_lines.append(f"- {pos}: {card['name']} (ID: {card['id']})")
        cards_text = "\n".join(card_lines)
        card_ids = [entry["card"]["id"] for entry in drawn_cards]
        rag_context = retrieve_card_context(card_ids)
        if not rag_context:
            rag_context = "No additional meanings retrieved."
        prompt = f"""Situational Sketch of the Querent:
{sketch}

Spread: {spread_name}
Cards Drawn:
{cards_text}

Card Meanings (from the archives):
{rag_context}

Please now deliver your reading, in your own voice, addressing the querent directly."""
        return prompt