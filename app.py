"""TarocchAI – Theatrical Tarot Experience"""

import asyncio
import os

from nicegui import ui

from config import MODEL_NAME
from engine.intake.interviewer import IntakeInterviewer
from engine.reading.drawer import draw_cards
from engine.reading.interpreter import TarotReader

# ------------------------------------------------------------
# CSS (embedded directly – no static file serving needed)
# ------------------------------------------------------------
CSS_PATH = os.path.join(os.path.dirname(__file__), "static", "css", "tarot.css")
with open(CSS_PATH, "r", encoding="utf-8") as f:
    TAROT_CSS = f.read()
ui.add_head_html(f"<style>{TAROT_CSS}</style>")


# ------------------------------------------------------------
# Shared state
# ------------------------------------------------------------
interviewer = None
spread_data = []
chat_input_ref = None          # set later in intake scene
mirror_input_ref = None        # set later in mirror scene
messages_box = None
reading_output = None
reader_spinner = None
spread_cards = None

# ------------------------------------------------------------
# Helper functions
# ------------------------------------------------------------
all_scenes = []                 # populated after all scenes are built

def show_scene(target):
    for scene in all_scenes:
        scene.classes(remove="active")
    target.classes(add="active")
    ui.update()

def add_chat_message(sender: str, text: str):
    css_class = "chat-ai" if sender == "assistant" else "chat-user"
    label = "Reader" if sender == "assistant" else "You"
    with messages_box:
        ui.markdown(f"**{label}:** {text}").classes(f"chat-message {css_class}")

async def start_intake():
    global interviewer
    interviewer = IntakeInterviewer(model_name=MODEL_NAME)
    show_scene(intake_scene)
    opener = await interviewer.start()
    add_chat_message("assistant", opener)

async def handle_intake_input():
    text = chat_input_ref.value.strip()
    if not text:
        return
    add_chat_message("user", text)
    chat_input_ref.value = ""
    chat_input_ref.update()

    if interviewer is None:
        return
    reply = await interviewer.conversation_turn(text)
    add_chat_message("assistant", reply)

    if interviewer.is_complete:
        await asyncio.sleep(0.5)
        show_scene(mirror_scene)

async def handle_mirror_response():
    value = mirror_input_ref.value.strip()
    if not value:
        return
    mirror_input_ref.value = ""
    mirror_input_ref.update()
    show_spread()

def show_spread():
    global spread_data
    spread_data = draw_cards(num_cards=3, positions=["Past", "Present", "Future"])
    spread_cards.clear()
    with spread_cards:
        for i, entry in enumerate(spread_data):
            position = entry["position"]
            name = entry["card"]["name"]
            card = ui.card().classes("spread-card")
            card.style(f"animation-delay: {i * 0.15}s")
            with card:
                ui.markdown(f"**{position}**").classes("card-label")
                ui.markdown(f"### {name}").classes("card-name")
    show_scene(spread_scene)

async def start_reading():
    show_scene(reading_scene)
    reader_spinner.visible = True
    reading_output.set_content("")

    reader = TarotReader(model_name=MODEL_NAME)
    sketch = interviewer.situational_sketch if interviewer else ""
    content = ""
    async for chunk in reader.stream_reading(
        situational_sketch=sketch,
        drawn_cards=spread_data,
        spread_name="Past-Present-Future",
    ):
        content += chunk
        reading_output.set_content(content)
        await asyncio.sleep(0)

    reader_spinner.visible = False
    # curtain inside reading scene
    with reading_scene:
        ui.markdown("---")
        ui.markdown("🎭 The cards are silent now. You may return, when you need to.").classes("curtain-message")
        ui.button("Begin again", on_click=lambda _: asyncio.create_task(restart_app())).classes("primary")

async def restart_app():
    ui.run_javascript("window.location.reload()")

# ------------------------------------------------------------
# Scenes (built sequentially – no redefinitions)
# ------------------------------------------------------------

# Threshold
with ui.element("div").classes("scene active threshold-scene") as threshold_scene:
    ui.element("div").classes("hexagram")
    ui.markdown("The room is quiet. When you are ready, step forward.").classes("threshold-text")
    ui.timer(3.0, lambda: show_scene(arrival_scene), once=True)

all_scenes.append(threshold_scene)

# Arrival
with ui.element("div").classes("scene arrival-scene") as arrival_scene:
    ui.markdown("# TAROCCHAI").classes("title-gold")
    ui.markdown("A reading that moves from your hands into the world.").classes("subtitle")
    ui.button("Sit with me.", on_click=lambda _: asyncio.create_task(start_intake())).classes("primary")

all_scenes.append(arrival_scene)

# Intake
with ui.element("div").classes("scene intake-scene") as intake_scene:
    ui.markdown("## The Listening").classes("section-heading")
    messages_box = ui.column().classes("chat-messages")
    with ui.row().classes("chat-input-row"):
        chat_input_ref = ui.input(placeholder="...").classes("chat-input")
        ui.button("→", on_click=lambda _: asyncio.create_task(handle_intake_input())).classes("send-btn")

all_scenes.append(intake_scene)

# Mirror
with ui.element("div").classes("scene mirror-scene") as mirror_scene:
    ui.element("div").classes("mirror-card-back")
    ui.markdown("Look at the card. What does your eye touch first? Don't think. Just the first thing.").classes("mirror-prompt")
    mirror_input_ref = ui.input(placeholder="...").classes("chat-input")
    ui.button("→", on_click=lambda _: asyncio.create_task(handle_mirror_response())).classes("send-btn")

all_scenes.append(mirror_scene)

# Spread
with ui.element("div").classes("scene spread-scene") as spread_scene:
    ui.markdown("## The Fall").classes("section-heading")
    spread_cards = ui.row().classes("spread-row")
    ui.button("Tell me what's there.", on_click=lambda _: asyncio.create_task(start_reading())).classes("primary")

all_scenes.append(spread_scene)

# Reading
with ui.element("div").classes("scene reading-scene") as reading_scene:
    ui.markdown("## The Telling").classes("section-heading")
    reading_output = ui.markdown("").classes("reading-card")
    reader_spinner = ui.spinner("dots")
    reader_spinner.visible = False

all_scenes.append(reading_scene)

# ------------------------------------------------------------
# Launch (serve static files from ui/static)
# ------------------------------------------------------------
ui.run(title="TarocchAI", dark=True)