#!/usr/bin/env python3
"""Generate all 78 Tarot cards using ComfyUI API."""

import json
import os
import sys
import time

# Add project root to path so we can import from engine
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine.art.generator import generate_card

CARDS_PATH = os.path.join("data", "knowledge_base", "cards.json")
PROGRESS_FILE = os.path.join("data", "generation_progress.txt")


def load_cards():
    with open(CARDS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r") as f:
            return set(line.strip() for line in f)
    return set()


def save_progress(card_id):
    with open(PROGRESS_FILE, "a") as f:
        f.write(card_id + "\n")


def main():
    cards = load_cards()
    done = load_progress()
    total = len(cards)
    print(f"Found {total} cards. {len(done)} already generated.")

    for i, card in enumerate(cards):
        card_id = card["id"]
        card_name = card["name"]

        if card_id in done:
            print(f"[{i + 1}/{total}] {card_name} – already done, skipping")
            continue

        print(f"[{i + 1}/{total}] Generating {card_name} …", end=" ", flush=True)
        try:
            path = generate_card(card_name)
            print(f"OK → {path}")
            save_progress(card_id)
        except Exception as e:
            print(f"FAILED: {e}")
            print("Retrying once after 30 seconds…")
            time.sleep(30)
            try:
                path = generate_card(card_name)
                print(f"OK on retry → {path}")
                save_progress(card_id)
            except Exception as e2:
                print(f"FAILED again: {e2}. Skipping.")
                continue

    print(
        f"\nDone. Images saved in static/img/cards/ — check {PROGRESS_FILE} for any missing."
    )


if __name__ == "__main__":
    main()
