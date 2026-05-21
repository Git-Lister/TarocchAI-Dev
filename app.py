"""TarocchAI – Console Oracle (v9 – silent question, name gate, reset)"""

import asyncio
import os
import secrets

from nicegui import app, ui

from config import MODEL_NAME
from engine.art.generator import sanitize_filename
from engine.data_store import save_session
from engine.intake.interviewer import IntakeInterviewer
from engine.ollama_queue import ollama_queue
from engine.reading.drawer import draw_cards
from engine.reading.interpreter import TarotReader

# ------------------------------------------------------------
# In‑memory objects
# ------------------------------------------------------------
interviewers = {}

# ------------------------------------------------------------
# STYLES – head only (candle + panel + all UI)
# ------------------------------------------------------------
ui.add_head_html("""
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
  body {
    margin: 0; overflow: hidden;
    background: radial-gradient(ellipse at 50% 80%, #2a1a06 0%, #0b0a07 60%);
    font-family: 'Crimson Text', 'Georgia', serif;
  }
  .candle-container {
    position: fixed; bottom: 12vh; left: 50%; transform: translate(-50%,0);
    z-index: 1100; display: none; flex-direction: column; align-items: center;
    pointer-events: none;
  }
  .candle-flame {
    width: 24px; height: 48px;
    background: radial-gradient(ellipse at 50% 30%, #f4d03f, #e67e22 60%, transparent 80%);
    border-radius: 50% 50% 40% 40%; position: relative;
    box-shadow: 0 0 40px rgba(255,180,50,0.6), 0 0 80px rgba(255,120,20,0.3);
  }
  .candle-wick { width:3px; height:18px; background:#333; margin-bottom:-4px; border-radius:2px; }
  .candle-body {
    width:28px; height:60px; background:linear-gradient(to bottom, #f5deb3, #d4a76a);
    border-radius:4px 4px 10px 10px; margin-top:-2px; box-shadow:0 4px 8px rgba(0,0,0,0.4);
  }
  @keyframes flicker {
    0% { transform:scaleY(1) scaleX(1); opacity:0.9; }
    100% { transform:scaleY(1.15) scaleX(0.95); opacity:1; }
  }
  @keyframes flicker-fast {
    0% { transform:scaleY(1.1) scaleX(0.9); opacity:0.7; }
    100% { transform:scaleY(1.35) scaleX(0.8); opacity:1; }
  }
  @keyframes brighten {
    0% { box-shadow:0 0 40px rgba(255,180,50,0.6),0 0 80px rgba(255,120,20,0.3); }
    100% { box-shadow:0 0 120px rgba(255,220,80,1),0 0 200px rgba(255,160,40,0.8); }
  }
  @keyframes snuff {
    0% { opacity:1; transform:scale(1); }
    100% { opacity:0; transform:scale(0.1); box-shadow:none; }
  }
  .console-panel {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
    width: 90%; max-width: 650px; max-height: 75vh; overflow-y: auto;
    background: rgba(16,14,10,0.92); border: 1px solid #b89b4b; border-radius: 12px;
    padding: 2rem; box-shadow: 0 0 30px rgba(184,155,75,0.2); color: #d9d0c1; z-index: 900;
  }
  .gold-text { color:#d4af37; font-family:'Cinzel',serif; letter-spacing:0.05em; }
  .body-text { color:#d9d0c1; font-family:'Crimson Text',serif; }
  .input-field { width:100%; background:transparent; border:none; border-bottom:1px solid rgba(184,155,75,0.3); color:#d9d0c1; padding:0.5rem; margin:1rem 0; }
  .btn-gold { background:rgba(184,155,75,0.1); border:1px solid #b89b4b; color:#d4af37; padding:0.5rem 2rem; font-family:'Cinzel',serif; cursor:pointer; border-radius:6px; }
  .btn-gold:hover { background:rgba(184,155,75,0.3); }
  .chat-msg { padding:0.5rem 1rem; margin:0.5rem 0; border-radius:8px; max-width:85%; }
  .chat-ai { background:rgba(184,155,75,0.08); border:1px solid rgba(184,155,75,0.2); align-self:flex-start; }
  .chat-user { background:rgba(255,255,255,0.06); align-self:flex-end; text-align:right; }
  .card-img { width:100%; border-radius:8px; }
  .faint-link { color: rgba(184,155,75,0.5); font-size:0.8rem; cursor:pointer; text-align:center; margin-top:1rem; }
  .faint-link:hover { color: #b89b4b; }
</style>
""")

# ------------------------------------------------------------
# CANDLE HTML (body only)
# ------------------------------------------------------------
ui.add_body_html("""
<div class="candle-container" id="candle">
  <div class="candle-flame" id="flame"></div>
  <div class="candle-wick"></div>
  <div class="candle-body"></div>
</div>
""")

# ------------------------------------------------------------
# Password / Name Gate
# ------------------------------------------------------------
PASSWORD = os.getenv("TAROCCHAI_PASSWORD", "")


# ------------------------------------------------------------
# State init
# ------------------------------------------------------------
@app.get("/")
def init_session():
    app.storage.user.clear()
    app.storage.user.update(
        {
            "scene": "threshold",
            "spread_data": [],
            "mirror_response": "",
            "full_reading": "",
            "authenticated": False,
            "chat_messages": [],
            "client_id": "",
            "querent_name": "",
            "_ui_version": 0,
        }
    )


@app.post("/")
def bump_ui():
    app.storage.user["_ui_version"] = app.storage.user.get("_ui_version", 0) + 1


# ------------------------------------------------------------
# UI page
# ------------------------------------------------------------
@ui.page("/")
async def main_page():
    client = ui.context.client
    client_id = client.id
    app.storage.user["client_id"] = client_id

    # Inject candle functions (small chunks, fire‑and‑forget)
    client.run_javascript("window.audioCtx = null;")
    client.run_javascript(
        "window.unlockAudio = function() { if (!window.audioCtx) { window.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (window.audioCtx.state === 'suspended') window.audioCtx.resume(); } };"
    )
    client.run_javascript(
        "window.snap_sound = function() { if (!window.audioCtx) return; const buffer = window.audioCtx.createBuffer(1, 1024, 44100); const data = buffer.getChannelData(0); for (let i = 0; i < 1024; i++) { data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 200); } const src = window.audioCtx.createBufferSource(); src.buffer = buffer; src.connect(window.audioCtx.destination); src.start(0); };"
    )
    client.run_javascript(
        "window.candle_ignite = function() { const candle = document.getElementById('candle'); const flame = document.getElementById('flame'); if (!candle || !flame) return; candle.style.display = 'flex'; flame.style.animation = 'flicker 0.15s infinite alternate'; flame.style.boxShadow = '0 0 40px rgba(255,180,50,0.6), 0 0 80px rgba(255,120,20,0.3)'; };"
    )
    client.run_javascript(
        "window.candle_flicker = function() { const flame = document.getElementById('flame'); if (!flame) return; flame.style.animation = 'flicker-fast 0.08s infinite alternate'; setTimeout(function() { if (flame) flame.style.animation = 'flicker 0.15s infinite alternate'; }, 1200); };"
    )
    client.run_javascript(
        "window.candle_brighten = function() { const flame = document.getElementById('flame'); if (!flame) return; flame.style.animation = 'brighten 1.5s ease-out forwards'; setTimeout(function() { if (flame) flame.style.animation = 'flicker 0.15s infinite alternate'; }, 1500); };"
    )
    client.run_javascript(
        "window.candle_snuff = function() { const candle = document.getElementById('candle'); const flame = document.getElementById('flame'); if (!candle || !flame) return; flame.style.animation = 'snuff 0.8s ease-in forwards'; setTimeout(function() { if (candle) candle.style.display = 'none'; }, 800); };"
    )

    panel = (
        ui.element("div")
        .classes("console-panel")
        .style(
            "position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); "
            "width: 90%; max-width: 650px; max-height: 75vh; overflow-y: auto; "
            "padding: 2rem 2rem 3rem 2rem; z-index: 1000;"
        )
    )
    last_version = -1

    def restart_session():
        """Reset the session and return to threshold."""
        app.storage.user.clear()
        init_session()
        app.storage.user["_ui_version"] = app.storage.user.get("_ui_version", 0) + 1

    def render():
        import os as _os

        nonlocal last_version
        state = app.storage.user
        ver = state.get("_ui_version", 0)
        if ver == last_version:
            return
        last_version = ver
        panel.clear()
        current = state.get("scene", "threshold")
        cid = state.get("client_id", "")

        # --- Threshold (click to advance) ---
        if current == "threshold":
            with panel:
                ui.markdown("# ✦").style(
                    "text-align:center; color:#d4af37; font-size:3rem;"
                )
                ui.label("The room is quiet.").classes("body-text").style(
                    "text-align:center; font-size:1.2rem;"
                )
                ui.label("When you are ready, step forward.").classes(
                    "body-text"
                ).style("text-align:center;")

                async def step():
                    client.run_javascript(
                        "unlockAudio(); snap_sound(); candle_ignite();"
                    )
                    state["scene"] = "arrival"
                    state["_ui_version"] = state.get("_ui_version", 0) + 1

                ui.button(
                    "Step forward.", on_click=lambda: asyncio.create_task(step())
                ).classes("btn-gold").style("display:block; margin:1rem auto 0;")

        # --- Arrival (name gate) ---
        elif current == "arrival":
            with panel:
                ui.label("TAROCCHAI").classes("gold-text").style(
                    "font-size:2.5rem; text-align:center;"
                )
                ui.label(
                    "The mud settles. The water clears. What brought you here—keep it behind your eyes."
                ).classes("body-text").style("text-align:center; font-style:italic;")
                name_input = ui.input(
                    "What do they call you?", placeholder="Your name, or any name…"
                ).classes("input-field")
                pwd_label = ui.label("").style("color:#8b3a3a; text-align:center;")

                async def enter():
                    name = name_input.value.strip()
                    if not name:
                        pwd_label.text = "Even a stranger has a name."
                        return
                    # If a password is set, enforce it
                    if PASSWORD and name_input.value != PASSWORD:
                        pwd_label.text = "That is not the name I was given."
                        return
                    state["querent_name"] = name
                    state["authenticated"] = True
                    state["scene"] = "waiting" if ollama_queue.is_busy else "intake"
                    if state["scene"] == "intake":
                        interviewers[cid] = IntakeInterviewer(model_name=MODEL_NAME)
                        opener = await interviewers[cid].start()
                        state["chat_messages"] = [("assistant", opener)]
                    state["_ui_version"] = state.get("_ui_version", 0) + 1

                ui.button(
                    "Sit with me.", on_click=lambda: asyncio.create_task(enter())
                ).classes("btn-gold").style("display:block; margin:1rem auto 0;")

        # --- Waiting ---
        elif current == "waiting":
            with panel:
                ui.spinner("dots").style("color:#b89b4b;")
                ui.label("The Oracle is with another.").classes("body-text").style(
                    "text-align:center;"
                )
                ui.label("Wait in the quiet. You will be seen.").classes(
                    "body-text"
                ).style("text-align:center;")

                async def wait():
                    while ollama_queue.is_busy:
                        await asyncio.sleep(1)
                    if cid not in interviewers:
                        interviewers[cid] = IntakeInterviewer(model_name=MODEL_NAME)
                    state["scene"] = "intake"
                    opener = await interviewers[cid].start()
                    state["chat_messages"] = [("assistant", opener)]
                    state["_ui_version"] = state.get("_ui_version", 0) + 1

                asyncio.create_task(wait())

        # --- Intake ---
        elif current == "intake":
            msgs = state.get("chat_messages", [])
            name = state.get("querent_name", "friend")
            with panel:
                ui.label(f"{name}.").classes("gold-text").style("font-size:1.5rem;")
                ui.label("The Listening").classes("gold-text").style(
                    "font-size:1.2rem; margin-bottom:1rem;"
                )
                chat_box = ui.column()
                for sender, text in msgs:
                    cls = "chat-ai" if sender == "assistant" else "chat-user"
                    lbl = "Reader" if sender == "assistant" else "You"
                    with chat_box:
                        ui.label(f"{lbl}: {text}").classes(f"chat-msg {cls}").style(
                            "white-space:pre-wrap;"
                        )
                inp = ui.input(placeholder="...").classes("input-field")

                async def send():
                    if cid not in interviewers:
                        return
                    t = inp.value.strip()
                    if not t:
                        return
                    msgs.append(("user", t))
                    inp.value = ""
                    state["_ui_version"] = state.get("_ui_version", 0) + 1
                    client.run_javascript("candle_flicker();")
                    reply = await ollama_queue.submit(
                        interviewers[cid].conversation_turn(t)
                    )
                    msgs.append(("assistant", reply))
                    if interviewers[cid].is_complete:
                        state["sketch"] = interviewers[cid].situational_sketch
                        state["scene"] = "mirror"
                    state["_ui_version"] = state.get("_ui_version", 0) + 1

                ui.button("→", on_click=lambda: asyncio.create_task(send())).classes(
                    "btn-gold"
                ).style("display:block; margin:1rem auto 0;")

        # --- Mirror ---
        elif current == "mirror":
            with panel:
                card_back = _os.path.join(
                    _os.path.dirname(__file__), "static", "img", "card_back.png"
                )
                if _os.path.exists(card_back):
                    ui.image("static/img/card_back.png").style(
                        "width: 60%; max-width: 300px; height: auto; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 0 15px rgba(184,155,75,0.3);"
                    )
                else:
                    ui.element("div").style(
                        "width: 60%; max-width: 300px; height: 0; padding-bottom: 90%; background: #1e1b14; border: 2px solid #b89b4b; margin: 0 auto; border-radius: 8px; position: relative;"
                    )
                ui.label("What does your eye touch first?").classes("body-text").style(
                    "text-align:center; margin-top:1rem;"
                )
                mir_inp = ui.input(placeholder="...").classes("input-field")

                async def mir_send():
                    v = mir_inp.value.strip()
                    if not v:
                        return
                    state["mirror_response"] = v
                    state["spread_data"] = draw_cards(3, ["Past", "Present", "Future"])
                    state["scene"] = "spread"
                    client.run_javascript("candle_brighten();")
                    state["_ui_version"] = state.get("_ui_version", 0) + 1

                ui.button(
                    "→", on_click=lambda: asyncio.create_task(mir_send())
                ).classes("btn-gold").style("display:block; margin:1rem auto 0;")

        # --- Spread ---
        elif current == "spread":
            spread = state.get("spread_data", [])
            with panel:
                ui.label("The Fall").classes("gold-text").style(
                    "font-size:1.5rem; margin-bottom:1rem;"
                )
                row = ui.row().style("justify-content:center; gap:1rem;")
                for entry in spread:
                    with row:
                        with ui.card().style(
                            "background:#1e1b14; border:1px solid #b89b4b; padding:1rem; text-align:center; width:200px;"
                        ):
                            ui.label(entry["position"]).style(
                                "color:#d4af37; font-size:0.8rem; letter-spacing:0.1em; text-align: center; width: 100%; display: block;"
                            )
                            fname = sanitize_filename(entry["card"]["name"])
                            img_path = _os.path.join("static", "img", "cards", fname)
                            if _os.path.exists(img_path):
                                ui.image(img_path).classes("card-img")
                            else:
                                ui.label(entry["card"]["name"]).style(
                                    "color:#e8ddc4; font-size:1.2rem;"
                                )

                async def reveal():
                    state["scene"] = "reading"
                    state["_ui_version"] = state.get("_ui_version", 0) + 1
                    reader = TarotReader()
                    sketch = state.get("sketch", "")
                    full = ""
                    async for chunk in reader.stream_reading(sketch, spread):
                        full += chunk
                    state["full_reading"] = full
                    state["scene"] = "curtain"
                    save_session(sketch, spread, full, state.get("mirror_response", ""))
                    state["_ui_version"] = state.get("_ui_version", 0) + 1

                ui.button(
                    "Tell me what's there.",
                    on_click=lambda: asyncio.create_task(reveal()),
                ).classes("btn-gold").style("display:block; margin:1rem auto 0;")

        # --- Reading + Curtain ---
        elif current in ("reading", "curtain"):
            reading = state.get("full_reading", "")
            with panel:
                spread = state.get("spread_data", [])
                if spread:
                    mini_row = ui.row().style(
                        "justify-content:center; gap:1rem; margin-bottom:1rem;"
                    )
                    for entry in spread:
                        with mini_row:
                            with ui.card().style(
                                "background:#1e1b14; border:1px solid #b89b4b; padding:0.8rem; text-align:center; width: 28%; max-width: 180px;"
                            ):
                                ui.label(entry["position"]).style(
                                    "color:#d4af37; font-size:0.7rem; letter-spacing:0.1em; text-align: center; width: 100%; display: block;"
                                )
                                fname = sanitize_filename(entry["card"]["name"])
                                img_path = _os.path.join(
                                    "static", "img", "cards", fname
                                )
                                if _os.path.exists(img_path):
                                    ui.image(img_path).style(
                                        "width:100%; height:auto; border-radius:6px;"
                                    )
                                else:
                                    ui.label(entry["card"]["name"]).style(
                                        "color:#e8ddc4; font-size:0.9rem;"
                                    )
                ui.label("The Telling").classes("gold-text").style("font-size:1.5rem;")
                if reading:
                    ui.markdown(reading).style(
                        "color:#d9d0c1; max-height:50vh; overflow-y:auto; padding:1rem; background:rgba(30,27,20,0.8); border-radius:8px;"
                    )
                else:
                    ui.spinner("dots").style("color:#b89b4b;")
                if current == "curtain":
                    if not state.get("_snuffed"):
                        client.run_javascript("snap_sound(); candle_snuff();")
                        state["_snuffed"] = True
                    ui.label("---").style("color:#b89b4b; text-align:center;")
                    ui.label(
                        "The cards are silent now. You may return, when you need to."
                    ).style("color:#d9d0c1; font-style:italic; text-align:center;")

        # --- Common reset link (all scenes except threshold) ---
        if current != "threshold":
            with panel:
                ui.separator().style("margin-top:1rem;")
                ui.button("Start anew", on_click=lambda: restart_session()).classes(
                    "btn-gold"
                ).style(
                    "font-size:0.8rem; opacity:0.5; display:block; margin:0.5rem auto 0;"
                )

    ui.timer(0.2, render)


# ------------------------------------------------------------
# Launch
# ------------------------------------------------------------
STORAGE_SECRET = os.getenv("TAROCCHAI_STORAGE_SECRET", secrets.token_hex(32))
ui.run(title="TarocchAI", dark=True, storage_secret=STORAGE_SECRET)
