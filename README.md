# TarocchAI

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
