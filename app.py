"""TarocchAI - MVP NiceGUI Frontend"""

import asyncio

from nicegui import ui

from config import MODEL_NAME
from engine.intake.interviewer import IntakeInterviewer
from engine.reading.drawer import draw_cards
from engine.reading.interpreter import TarotReader

# ------------------------------------------------------------
# Custom CSS
# ------------------------------------------------------------
ui.add_head_html("""
<style>
body {
    background: #0f0f0f;
    color: #efe8db;
    font-family: 'Georgia', 'Times New Roman', serif;
}
#tarot-app {
    min-height: 100vh;
    padding: 2rem 1rem 3rem;
}
.tarot-card {
    background: rgba(12, 12, 12, 0.9);
    border: 1px solid rgba(255, 215, 0, 0.18);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
    border-radius: 18px;
}
.chat-message {
    padding: 1rem 1.25rem;
    border-radius: 18px;
    max-width: 100%;
    white-space: pre-wrap;
}
.chat-user {
    background: rgba(255, 255, 255, 0.08);
    color: #f8f2e7;
    text-align: right;
    align-self: flex-end;
}
.chat-ai {
    background: rgba(255, 215, 0, 0.08);
    color: #efe8db;
    text-align: left;
}
.card-label {
    font-variant: small-caps;
    letter-spacing: 0.08em;
}
</style>
""")

# ------------------------------------------------------------
# Shared state
# ------------------------------------------------------------
interviewer = None
spread_data = []

# ------------------------------------------------------------
# Element references (assigned when sections are built)
# ------------------------------------------------------------
welcome_section = None
intake_section = None
messages_box = None
chat_input_ref = None
mirror_section = None
mirror_input_ref = None
spread_section = None
spread_cards = None
reading_section = None
reading_output = None
reader_spinner = None
end_section = None

all_sections = []

def show_section(target):
    for sec in all_sections:
        sec.style("display: none;")
    target.style("display: block;")
    ui.update()

def add_chat_message(sender: str, text: str):
    css_class = "chat-ai tarot-card" if sender == "assistant" else "chat-user tarot-card"
    label = "TarocchAI" if sender == "assistant" else "You"
    with messages_box:
        ui.markdown(f"**{label}:** {text}").classes(css_class)
    # Note: auto-scroll has been removed for now – the chat area is scrollable manually

async def start_intake():
    global interviewer
    interviewer = IntakeInterviewer(model_name=MODEL_NAME)
    show_section(intake_section)
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
        await asyncio.sleep(0.3)
        show_section(mirror_section)

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
    spread_cards.set_visibility(True)
    spread_cards.clear()
    with spread_cards:
        for entry in spread_data:
            position = entry["position"]
            name = entry["card"]["name"]
            with ui.card().classes("tarot-card p-4 min-w-[200px] flex-1"):
                ui.markdown(f"**{position}**").classes("card-label")
                ui.markdown(f"### {name}")
    show_section(spread_section)

async def restart_app():
    ui.run_javascript("window.location.reload()")

async def start_reading():
    show_section(reading_section)
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
    # Keep the reading visible and add the curtain message below it
    with reading_section:
        ui.markdown("---")
        ui.markdown("🎭 The TarocchAI Reader draws the curtain. Until next time.").classes("text-lg")
        ui.button("Read again?", on_click=lambda _: asyncio.create_task(restart_app())).classes("primary")

# ------------------------------------------------------------
# Build all sections
# ------------------------------------------------------------
with ui.column().classes("items-center justify-center").style("min-height: 100vh; padding: 2rem;") as welcome_section:
    ui.markdown("# TarocchAI").classes("text-5xl").style("color: #efe8db;")
    ui.markdown(
        "Local, offline Tarot reading with a grounded, poetic voice. "
        "Enter the intake circle and let the cards speak through your imagery."
    ).classes("text-lg max-w-2xl")
    ui.button("Enter", on_click=lambda _: asyncio.create_task(start_intake())).classes("primary text-base")

with ui.column().classes("max-w-4xl mx-auto gap-4").style("display: none; padding: 2rem 0;") as intake_section:
    ui.markdown("## Intake Chat").classes("text-3xl")
    messages_box = ui.column().props("id=messages").style("max-height: 55vh; overflow-y: auto; gap: 1rem; padding-right: 0.5rem;")
    with ui.row().classes("gap-2 items-end"):
        chat_input_ref = ui.input(placeholder="Share the first image or sensation that comes to mind...").classes("w-full")
        ui.button("Send", on_click=lambda _: asyncio.create_task(handle_intake_input())).classes("primary")

with ui.column().classes("max-w-4xl mx-auto gap-4").style("display: none; padding: 2rem 0;") as mirror_section:
    ui.markdown("## Mirror Card").classes("text-3xl")
    ui.markdown(
        "A dark card back appears. Take a moment and notice what comes to mind. "
        "Then name the first detail that catches your eye."
    ).classes("text-lg")
    mirror_input_ref = ui.input(placeholder="What catches your eye first?").classes("w-full")
    ui.button("Share", on_click=lambda _: asyncio.create_task(handle_mirror_response())).classes("primary")

with ui.column().classes("max-w-5xl mx-auto gap-4").style("display: none; padding: 2rem 0;") as spread_section:
    ui.markdown("## Spread Reveal").classes("text-3xl")
    spread_cards = ui.row().classes("gap-4 flex-wrap")
    ui.button("Reveal Reading", on_click=lambda _: asyncio.create_task(start_reading())).classes("primary")

with ui.column().classes("max-w-5xl mx-auto gap-4").style("display: none; padding: 2rem 0;") as reading_section:
    ui.markdown("## TarocchAI Reading").classes("text-3xl")
    reading_output = ui.markdown("").classes("tarot-card")
    reader_spinner = ui.spinner("dots")
    reader_spinner.visible = False

with ui.column().classes("max-w-4xl mx-auto gap-4 items-center").style("display: none; padding: 2rem 0;") as end_section:
    ui.markdown("## Curtain Close").classes("text-3xl")
    ui.markdown("The TarocchAI Reader draws the curtain. Until next time.").classes("text-lg")
    ui.button("Read again?", on_click=lambda _: asyncio.create_task(restart_app())).classes("primary")

all_sections = [welcome_section, intake_section, mirror_section, spread_section, reading_section, end_section]

# ------------------------------------------------------------
# Launch
# ------------------------------------------------------------
ui.run(title="TarocchAI", dark=True)