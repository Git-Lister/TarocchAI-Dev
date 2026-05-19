#!/usr/bin/env python3
"""Generate the TarocchAI card back using ComfyUI."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine.art.generator import (
    COMFY_URL,
    build_workflow,
    get_image_bytes,
    queue_prompt,
)

# --- Card back prompt ---
CARD_BACK_PROMPT = (
    "tarot card back, ornate geometric emblem, ouroboros, dark parchment, "
    "medieval woodcut, gold halftone lines, distressed, Albrecht Dürer style, "
    "no text, no signature"
)

# --- Build the workflow using any card template ---
workflow = build_workflow("The Fool")
workflow["4"]["inputs"]["text"] = CARD_BACK_PROMPT
# Optionally change the filename prefix so it doesn't clash with face cards
workflow["9"]["inputs"]["filename_prefix"] = "card_back"

print("Sending card back prompt to ComfyUI …")
prompt_id = queue_prompt(workflow)

print("Waiting for image …")
image_data = get_image_bytes(prompt_id)

# --- Save to static/img ---
os.makedirs("static/img", exist_ok=True)
dest = os.path.join("static", "img", "card_back.png")
with open(dest, "wb") as f:
    f.write(image_data)

print(f"✅ Card back saved to {dest}")
