"""
Build ChromaDB index from cards.json.

Usage:
    python engine/rag/build_index.py
"""

import json
import os

import chromadb
from chromadb.utils import embedding_functions

# Paths
CARDS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "knowledge_base", "cards.json")
VECTORS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "vectors")

def main():
    with open(CARDS_PATH, "r", encoding="utf-8") as f:
        cards = json.load(f)

    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )

    client = chromadb.PersistentClient(path=VECTORS_PATH)
    collection = client.get_or_create_collection(
        name="tarot_knowledge",
        embedding_function=ef,
    )

    for card in cards:
        card_id = card["id"]
        # Build text parts without nested f‑string quoting issues
        symbols_text = "; ".join(
            [f"{s['symbol']} - {s['meaning']}" for s in card.get("symbols", [])]
        )
        text_parts = [
            f"Name: {card['name']}",
            f"Suit: {card['suit']}",
            f"Number: {card['number']}",
            f"Element: {card.get('element', '')}",
            f"Planet: {card.get('planet', '')}",
            f"Alchemy: {card.get('alchemy', '')}",
            f"Keywords upright: {', '.join(card.get('keywords_upright', []))}",
            f"Keywords reversed: {', '.join(card.get('keywords_reversed', []))}",
            f"Symbols: {symbols_text}",
            f"Upright interpretation: {card.get('interp_upright', '')}",
            f"Reversed interpretation: {card.get('interp_reversed', '')}",
            f"Material grounding: {card.get('material_grounding', '')}",
            f"Historical note: {card.get('historical_note', '')}",
        ]
        document = "\n".join(text_parts)

        collection.upsert(
            ids=[card_id],
            documents=[document],
            metadatas=[{"name": card["name"], "suit": card["suit"], "number": card["number"]}],
        )

    print(f"Indexed {collection.count()} cards into {VECTORS_PATH}")

if __name__ == "__main__":
    main()