"""
Card drawing logic using secrets module for hardware entropy.
"""

import json
import os
import secrets

CARDS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "knowledge_base", "cards.json")

FALLBACK_CARDS = []
for i in range(22):
    FALLBACK_CARDS.append({"id": f"major_{i}", "name": f"Major Arcana {i}", "suit": "major"})
for suit in ["wands", "cups", "swords", "pentacles"]:
    for rank in range(1, 15):
        FALLBACK_CARDS.append({"id": f"{suit}_{rank}", "name": f"{rank} of {suit.title()}", "suit": suit})


def load_cards():
    if os.path.exists(CARDS_PATH):
        try:
            with open(CARDS_PATH, "r") as f:
                cards = json.load(f)
                if isinstance(cards, list) and len(cards) == 78:
                    return cards
        except Exception:
            pass
    return FALLBACK_CARDS


def draw_cards(num_cards: int = 3, positions: list = None, with_replacement: bool = False) -> list:
    cards = load_cards()
    if positions is None:
        positions = [f"Position {i+1}" for i in range(num_cards)]
    if len(positions) != num_cards:
        raise ValueError("Length of positions must equal num_cards")
    if num_cards > len(cards) and not with_replacement:
        raise ValueError("Cannot draw more than 78 cards without replacement")

    drawn = []
    deck = cards.copy()
    for pos in positions:
        idx = secrets.randbelow(len(deck))
        card = deck[idx]
        drawn.append({"position": pos, "card": card})
        if not with_replacement:
            deck.pop(idx)
    return drawn