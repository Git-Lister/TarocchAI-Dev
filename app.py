"""TarocchAI – Multi‑User Theatrical Oracle"""

import asyncio
import os
import secrets

from nicegui import app, ui

from config import MODEL_NAME
from engine.data_store import save_session
from engine.intake.interviewer import IntakeInterviewer
from engine.ollama_queue import ollama_queue
from engine.reading.drawer import draw_cards
from engine.reading.interpreter import TarotReader

# ------------------------------------------------------------
# In‑memory store for non‑serializable objects (keyed by client ID)
# ------------------------------------------------------------
interviewers = {}

# ------------------------------------------------------------
# CSS (embedded)
# ------------------------------------------------------------
CSS_PATH = os.path.join(os.path.dirname(__file__), "static", "css", "tarot.css")
with open(CSS_PATH, "r", encoding="utf-8") as f:
    TAROT_CSS = f.read()
ui.add_head_html(f"<style>{TAROT_CSS}</style>")

# ------------------------------------------------------------
# Password (set env TAROCCHAI_PASSWORD, or empty = no gate)
# ------------------------------------------------------------
PASSWORD = os.getenv("TAROCCHAI_PASSWORD", "")

# ------------------------------------------------------------
# Per‑session state initialisation
# ------------------------------------------------------------
@app.get("/")
def init_session():
    app.storage.user.clear()
    app.storage.user.update({
        "scene": "threshold",
        "spread_data": [],
        "mirror_response": "",
        "full_reading": "",
        "authenticated": False,
        "chat_messages": [],
        "client_id": "",
        "_ui_version": 0,             # incremented whenever the UI should rebuild
    })

@app.post("/")
def bump_ui():
    """Force a UI refresh by bumping the version."""
    app.storage.user["_ui_version"] = app.storage.user.get("_ui_version", 0) + 1

# ------------------------------------------------------------
# Main UI page
# ------------------------------------------------------------
@ui.page("/")
async def main_page():
    client_id = ui.context.client.id
    app.storage.user["client_id"] = client_id

    container = ui.element("div")
    last_version = -1

    def render():
        nonlocal last_version
        state = app.storage.user
        ver = state.get("_ui_version", 0)
        if ver == last_version:
            return                      # nothing changed, don't rebuild
        last_version = ver
        container.clear()
        current = state.get("scene", "threshold")
        cid = state.get("client_id", "")

        # ---- Threshold ----
        if current == "threshold":
            with container:
                with ui.element("div").classes("scene active threshold-scene"):
                    ui.element("div").classes("hexagram")
                    ui.markdown("The room is quiet. When you are ready, step forward.").classes("threshold-text")
                    async def advance():
                        await asyncio.sleep(2)
                        state["scene"] = "arrival"
                        state["_ui_version"] = ver + 1
                    asyncio.create_task(advance())

        # ---- Arrival ----
        elif current == "arrival":
            with container:
                with ui.element("div").classes("scene active arrival-scene"):
                    ui.markdown("# TAROCCHAI").classes("title-gold")
                    ui.markdown("A reading that moves from your hands into the world.").classes("subtitle")
                    pwd_input = ui.input(
                        "The word to enter",
                        placeholder="Whisper the password…",
                        password=True,
                        password_toggle_button=True
                    ).classes("w-64")
                    pwd_label = ui.markdown("").classes("text-sm text-red-400")

                    async def try_enter():
                        if PASSWORD and pwd_input.value != PASSWORD:
                            pwd_label.set_content("The room is not ready for you.")
                            return
                        state["authenticated"] = True
                        if ollama_queue.is_busy:
                            state["scene"] = "waiting"
                        else:
                            interviewers[cid] = IntakeInterviewer(model_name=MODEL_NAME)
                            state["scene"] = "intake"
                        if state["scene"] == "intake":
                            opener = await interviewers[cid].start()
                            state["chat_messages"] = [("assistant", opener)]
                        state["_ui_version"] = state.get("_ui_version", 0) + 1

                    ui.button("Sit with me.", on_click=lambda _: asyncio.create_task(try_enter())).classes("primary")

        # ---- Waiting Room ----
        elif current == "waiting":
            with container:
                with ui.element("div").classes("scene active waiting-scene"):
                    ui.element("div").classes("hexagram pulsating")
                    ui.markdown("The Oracle is with another. Wait in the quiet. You will be seen.").classes("threshold-text")
                    ui.spinner("dots").classes("mt-4")

                    async def wait_loop():
                        while ollama_queue.is_busy:
                            await asyncio.sleep(1)
                        if cid not in interviewers:
                            interviewers[cid] = IntakeInterviewer(model_name=MODEL_NAME)
                        state["scene"] = "intake"
                        opener = await interviewers[cid].start()
                        state["chat_messages"] = [("assistant", opener)]
                        state["_ui_version"] = state.get("_ui_version", 0) + 1

                    asyncio.create_task(wait_loop())

        # ---- Intake ----
        elif current == "intake":
            messages = state.get("chat_messages", [])
            with container:
                with ui.element("div").classes("scene active intake-scene"):
                    ui.markdown("## The Listening").classes("section-heading")
                    messages_box = ui.column().classes("chat-messages")
                    for sender, text in messages:
                        css_class = "chat-ai" if sender == "assistant" else "chat-user"
                        label = "Reader" if sender == "assistant" else "You"
                        with messages_box:
                            ui.markdown(f"**{label}:** {text}").classes(f"chat-message {css_class}")

                    with ui.row().classes("chat-input-row"):
                        chat_input = ui.input(placeholder="...").classes("chat-input")

                        async def send_intake():
                            if cid not in interviewers:
                                return
                            text = chat_input.value.strip()
                            if not text:
                                return
                            messages.append(("user", text))
                            chat_input.value = ""
                            state["_ui_version"] = state.get("_ui_version", 0) + 1

                            async def call():
                                return await interviewers[cid].conversation_turn(text)
                            reply = await ollama_queue.submit(call())
                            messages.append(("assistant", reply))
                            state["_ui_version"] = state.get("_ui_version", 0) + 1
                            if interviewers[cid].is_complete:
                                state["sketch"] = interviewers[cid].situational_sketch
                                state["scene"] = "mirror"
                            state["_ui_version"] = state.get("_ui_version", 0) + 1

                        ui.button("→", on_click=lambda _: asyncio.create_task(send_intake())).classes("send-btn")

        # ---- Mirror ----
        elif current == "mirror":
            with container:
                with ui.element("div").classes("scene active mirror-scene"):
                    ui.element("div").classes("mirror-card-back")
                    ui.markdown("Look at the card. What does your eye touch first? Don't think. Just the first thing.").classes("mirror-prompt")
                    mirror_input = ui.input(placeholder="...").classes("chat-input")

                    async def send_mirror():
                        value = mirror_input.value.strip()
                        if not value:
                            return
                        state["mirror_response"] = value
                        state["spread_data"] = draw_cards(num_cards=3, positions=["Past", "Present", "Future"])
                        state["scene"] = "spread"
                        state["_ui_version"] = state.get("_ui_version", 0) + 1

                    ui.button("→", on_click=lambda _: asyncio.create_task(send_mirror())).classes("send-btn")

        # ---- Spread ----
        elif current == "spread":
            spread = state.get("spread_data", [])
            with container:
                with ui.element("div").classes("scene active spread-scene"):
                    ui.markdown("## The Fall").classes("section-heading")
                    spread_row = ui.row().classes("spread-row")
                    for i, entry in enumerate(spread):
                        with spread_row:
                            card = ui.card().classes("spread-card")
                            card.style(f"animation-delay: {i * 0.15}s")
                            with card:
                                ui.markdown(f"**{entry['position']}**").classes("card-label")
                                ui.markdown(f"### {entry['card']['name']}").classes("card-name")

                    async def reveal():
                        state["scene"] = "reading"
                        state["_ui_version"] = state.get("_ui_version", 0) + 1
                        reader = TarotReader()
                        sketch = state.get("sketch", "")

                        async def stream():
                            full = ""
                            async for chunk in reader.stream_reading(
                                situational_sketch=sketch,
                                drawn_cards=spread,
                                spread_name="Past-Present-Future",
                            ):
                                full += chunk
                            return full
                        state["full_reading"] = await ollama_queue.submit(stream())
                        state["scene"] = "curtain"
                        state["_ui_version"] = state.get("_ui_version", 0) + 1
                        save_session(
                            sketch=sketch,
                            spread=spread,
                            reading=state["full_reading"],
                            mirror=state.get("mirror_response", "")
                        )

                    ui.button("Tell me what's there.", on_click=lambda _: asyncio.create_task(reveal())).classes("primary")

        # ---- Reading + Curtain ----
        elif current in ("reading", "curtain"):
            reading_text = state.get("full_reading", "")
            with container:
                with ui.element("div").classes("scene active reading-scene"):
                    ui.markdown("## The Telling").classes("section-heading")
                    if reading_text:
                        ui.markdown(reading_text).classes("reading-card")
                    else:
                        ui.spinner("dots")
                    if current == "curtain":
                        ui.markdown("---")
                        ui.markdown("🎭 The cards are silent now. You may return, when you need to.").classes("curtain-message")

                        def restart():
                            app.storage.user.clear()
                            init_session()
                            app.storage.user["_ui_version"] = app.storage.user.get("_ui_version", 0) + 1

                        ui.button("Begin again", on_click=lambda _: restart()).classes("primary")

    # Timer runs continuously but only rebuilds when version changes
    ui.timer(0.2, render)

# ------------------------------------------------------------
# Launch
# ------------------------------------------------------------
STORAGE_SECRET = os.getenv("TAROCCHAI_STORAGE_SECRET", secrets.token_hex(32))
ui.run(title="TarocchAI", dark=True, storage_secret=STORAGE_SECRET)