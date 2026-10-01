import io

with io.open("static/index.html", "r", encoding="utf-8") as f:
    src = f.read()

required = [
    "threshold",
    "room",
    "candle-light",
    "candle-container",
    "deck-area",
    "voice-text",
    "interaction-hint",
    "user-input-area",
    "user-input",
    "name-gate",
    "name-input",
    "user-messages",
    "slab-pattern",
]

for rid in required:
    if 'id="' + rid + '"' in src or "id='" + rid + "'" in src:
        print("OK    " + rid)
    else:
        print("MISS  " + rid)
