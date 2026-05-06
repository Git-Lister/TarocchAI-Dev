"""
Append every completed reading to a local JSON Lines file for later review.
Stored in data/readings/sessions.jsonl
"""

import json
import os
from datetime import datetime

READINGS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "readings")
READINGS_FILE = os.path.join(READINGS_DIR, "sessions.jsonl")

def save_session(sketch: str, spread: list, reading: str, mirror: str = ""):
    os.makedirs(READINGS_DIR, exist_ok=True)
    record = {
        "timestamp": datetime.utcnow().isoformat(),
        "situational_sketch": sketch,
        "mirror_response": mirror,
        "spread": [{"position": c["position"], "card": c["card"]["name"]} for c in spread],
        "reading": reading,
    }
    with open(READINGS_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")