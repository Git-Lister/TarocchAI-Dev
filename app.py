"""TarocchAI — Backend API Server (serving static HTML frontend)"""

import secrets

from fastapi import Request
from nicegui import app, ui

from config import MODEL_NAME
from engine.data_store import save_session
from engine.intake.interviewer import IntakeInterviewer
from engine.ollama_queue import ollama_queue
from engine.reading.drawer import draw_cards
from engine.reading.interpreter import TarotReader


@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/"):
        response.headers["Cache-Control"] = (
            "no-store, no-cache, must-revalidate, max-age=0"
        )
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


# ------------------------------------------------------------
# Serve static files
# ------------------------------------------------------------
app.add_static_files("/static", "static")


# ------------------------------------------------------------
# Serve the static HTML at the root
# ------------------------------------------------------------
@ui.page("/")
def main():
    # Load CSS and JS via NiceGUI's methods (not inside index.html)
    ui.add_head_html('<link rel="stylesheet" href="/static/css/tarot.css">')
    ui.add_body_html('<script src="/static/js/tarot.js?v=9"></script>')

    # Load the HTML structure (no script/style tags inside)
    with open("static/index.html", "r", encoding="utf-8") as f:
        ui.html(f.read())


# ------------------------------------------------------------
# API Endpoints
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
    return {"reply": reply, "is_complete": is_complete, "sketch": sketch}


@app.post("/api/reading/generate")
async def generate_reading(data: dict):
    """Generate a reading from the sketch."""
    sketch = data.get("sketch", "")
    spread = data.get("spread", [])
    if not spread:
        spread = draw_cards(3, ["Past", "Present", "Future"])

    for entry in spread:
        card = entry["card"]
        filename = card["name"].lower().replace(" ", "_").replace("-", "_") + ".png"
        entry["image_path"] = f"/static/img/cards/{filename}"
        print(f"🔍 Card: {card['name']} → {entry['image_path']}")

    reader = TarotReader()

    # Stage 1: woven thread (streamed, concatenated)
    thread = ""
    async for chunk in reader.stream_reading(sketch, spread):
        thread += chunk

    # Stage 2: pithy card lines
    card_lines = await reader.generate_card_lines(thread, spread)

    save_session(sketch, spread, thread, data.get("mirror_response", ""))

    return {
        "thread": thread,
        "card_lines": card_lines,
        "spread": spread,
    }


# ------------------------------------------------------------
# Launch
# ------------------------------------------------------------
STORAGE_SECRET = secrets.token_hex(32)
ui.run(
    title="TarocchAI",
    host="0.0.0.0",
    port=8080,
    dark=True,
    storage_secret=STORAGE_SECRET,
)