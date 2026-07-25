"""TarocchAI — Backend API Server (serving static HTML frontend)"""

import asyncio
import os
import secrets

from nicegui import app, ui

from config import MODEL_NAME
from engine.intake.interviewer import IntakeInterviewer
from engine.ollama_queue import ollama_queue
from engine.reading.drawer import draw_cards
from engine.reading.interpreter import TarotReader
from engine.data_store import save_session

# ------------------------------------------------------------
# Serve the static HTML at the root
# ------------------------------------------------------------
@ui.page("/")
def main():
    ui.add_head_html('<link rel="stylesheet" href="/static/css/tarot.css">')
    with open("static/index.html", "r", encoding="utf-8") as f:
        ui.html(f.read())
    # Optional: make NiceGUI serve static files from /static
    # It does this automatically if the folder exists.

# ------------------------------------------------------------
# API Endpoints (for the frontend to call)
# ------------------------------------------------------------

# Storage for interviewers per session
interviewers = {}

@app.post("/api/intake/start")
async def start_intake(data: dict):
    """Start a new intake interview."""
    session_id = data.get("session_id", "default")
    interviewer = IntakeInterviewer(model_name=MODEL_NAME)
    interviewers[session_id] = interviewer
    opener = await interviewer.start()
    return {"opener": opener, "turn": 0}

@app.post("/api/intake/turn")
async def intake_turn(data: dict):
    """Process one turn of the intake."""
    session_id = data.get("session_id", "default")
    user_message = data.get("message", "")
    interviewer = interviewers.get(session_id)
    if not interviewer:
        return {"error": "No active interview found"}
    reply = await ollama_queue.submit(interviewer.conversation_turn(user_message))
    is_complete = interviewer.is_complete
    sketch = interviewer.situational_sketch if is_complete else ""
    return {
        "reply": reply,
        "is_complete": is_complete,
        "sketch": sketch
    }

@app.post("/api/reading/generate")
async def generate_reading(data: dict):
    """Generate a reading from the sketch."""
    sketch = data.get("sketch", "")
    spread = data.get("spread", [])
    if not spread:
        spread = draw_cards(3, ["Past", "Present", "Future"])
    
    reader = TarotReader()
    full_reading = ""
    async for chunk in reader.stream_reading(sketch, spread):
        full_reading += chunk
    
    # Save to history
    save_session(sketch, spread, full_reading, data.get("mirror_response", ""))
    
    return {
        "reading": full_reading,
        "spread": spread
    }

# ------------------------------------------------------------
# Launch
# ------------------------------------------------------------
STORAGE_SECRET = os.getenv("TAROCCHAI_STORAGE_SECRET", secrets.token_hex(32))
ui.run(
    title="TarocchAI",
    host="0.0.0.0",
    port=8080,
    dark=True,
    storage_secret=STORAGE_SECRET
)