#!/usr/bin/env python3
"""
setup.py - TarocchAI: Final Project Tree
Python 3.11 recommended. Run this to create the full structure.
Supports both venv and Docker-based development.
"""

import os

FOLDERS = [
    "engine/intake",
    "engine/reading",
    "engine/rag",
    "engine/tts",
    "engine/art",
    "data/knowledge_base",
    "data/vectors",
    "data/voices",
    "data/readings",
    "data/bibliography",
    "ui/static/css",
    "ui/static/img",
    "ui/static/fonts",
    "ui/components",
    "ui/templates",  # <-- previously missing
    "tests",
    "research/art_history",
    "research/archetypes",
    "research/unthought",
    "research/landscape",
]

FILES = {
    "app.py": '''"""TarocchAI - MVP Entry Point"""
import nicegui as ng

def main():
    ng.run(title="TarocchAI", port=8080, reload=False)

if __name__ in {"__main__", "__mp_main__"}:
    main()
''',
    "engine/__init__.py": "",
    "engine/intake/__init__.py": "",
    "engine/intake/interviewer.py": '"""Oblique intake agent for TarocchAI."""\n',
    "engine/reading/__init__.py": "",
    "engine/reading/drawer.py": '"""Card drawing with true random entropy source."""\n',
    "engine/reading/interpreter.py": '"""Core synthesis and LLM streaming for TarocchAI."""\n',
    "engine/rag/__init__.py": "",
    "engine/rag/retriever.py": '"""Vector + graph retrieval, adapted from OER_Phoenix."""\n',
    "engine/tts/__init__.py": "",
    "engine/tts/synthesizer.py": '"""XTTS voice synthesis wrapper."""\n',
    "engine/art/__init__.py": "",
    "engine/art/generator.py": '"""Stable Diffusion card image generation (LoRA-based)."""\n',
    "data/knowledge_base/cards.json": "{}",
    "data/knowledge_base/pairings.json": "{}",
    "data/knowledge_base/spreads.json": "{}",
    "data/bibliography/sources.md": "# Ancient & Esoteric Sources\n\n...",
    "ui/static/css/tarot.css": "/* TarocchAI house style */\n",
    "ui/templates/index.html": "<!-- Fallback -->",
    "requirements.txt": """# Python 3.11 – core dependencies
nicegui>=1.3.0,<2.0
chromadb>=0.4.0
sentence-transformers>=2.2.0
ollama>=0.1.0
pydantic>=2.0
fastapi>=0.100.0
# optional: xtts (stub for now)
""",
    "config.py": """import os

MODEL_NAME = os.getenv("TAROT_MODEL", "llama3.1:8b-instruct-q6_K")
DEFAULT_SPREAD = "past_present_future"
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
# for Docker: set OLLAMA_URL=http://host.docker.internal:11434
""",
    "Dockerfile": """FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080
CMD ["python", "app.py"]
""",
    "docker-compose.yml": """version: '3.8'
services:
  tarocchai-app:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
      - ./engine:/app/engine
      - ./app.py:/app/app.py
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    environment:
      - OLLAMA_URL=http://host.docker.internal:11434
""",
    "README.md": r"""# TarocchAI

A Tarot reader that sees spirit in the material.

## Philosophy
TarocchAI speaks to one querent at a time. Each conversation is unique and not recorded unless saved. The reading is a co-creation between your own unthought and the cards, guided by an earthy, grounded intelligence.

## Setup (choose one)

### 1. Local venv

python3.11 -m venv venv
source venv/bin/activate # or venv\Scripts\activate
pip install -r requirements.txt
ollama pull llama3:70b-instruct-q4_K_M
python app.py

### 2. Docker (requires nvidia-docker2)

docker compose up --build


Open http://localhost:8080
""",
    "research/unthought/hayles_mapping.md": "# Hayles' Unthought and TarocchAI\n\nMapping of cognitive layers...",
    "research/landscape/competitor_analysis.md": "# AI Tarot Landscape\n\nBrief analysis...",
}


def plant():
    for folder in FOLDERS:
        os.makedirs(folder, exist_ok=True)
        print(f"📁 {folder}")
    for path, content in FILES.items():
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"📄 {path}")
    print("\n🌱 TarocchAI tree planted. See README.md for next steps.")


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    plant()
