#!/usr/bin/env python3
"""
End-to-end test of the TarocchAI reading pipeline.
No emoji characters – compatible with Windows CP1252 terminal.
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import MODEL_NAME
from engine.intake.interviewer import IntakeInterviewer
from engine.reading.drawer import draw_cards
from engine.reading.interpreter import TarotReader

SIMULATED_RESPONSES = [
    "Hmm, the first thing that comes to mind is... a room with very low light, like dusk, and a sort of humming sound, like a fridge.",
    "The air feels grey-blue, heavy, like before snow.",
    "I guess a clock on the wall that's stopped, it just sits there but it feels like it's waiting.",
    "Tension in my shoulders, like a weight that's not even heavy but just there.",
]

async def main():
    print("--- TarocchAI Test Reading ---")
    print("=" * 50)

    # Intake
    print("\n[Intake Phase (simulated)]")
    interviewer = IntakeInterviewer(model_name=MODEL_NAME)
    opener = await interviewer.start()
    print(f"Interviewer: {opener}")

    for user_response in SIMULATED_RESPONSES:
        print(f"User: {user_response}")
        reply = await interviewer.conversation_turn(user_response)
        print(f"Interviewer: {reply}")
        if interviewer.is_complete:
            break

    if not interviewer.is_complete:
        reply = await interviewer.conversation_turn("I think that's all for now.")
        print(f"Interviewer (forced end): {reply}")
    print("\n[Situational Sketch (hidden)]:")
    print(interviewer.situational_sketch)

    # Draw
    print("\n[Drawing cards...]")
    spread = draw_cards(num_cards=3, positions=["Past", "Present", "Future"])
    for c in spread:
        print(f"  {c['position']}: {c['card']['name']}")

    # Reading
    print("\n[TarocchAI reading]\n")
    reader = TarotReader()
    async for chunk in reader.stream_reading(
        situational_sketch=interviewer.situational_sketch,
        drawn_cards=spread,
        spread_name="Past-Present-Future"
    ):
        print(chunk, end="", flush=True)

    print("\n")
    print("-" * 50)
    print("The TarocchAI Reader draws the curtain. Until next time.")
    print("[Test complete]")

if __name__ == "__main__":
    asyncio.run(main())