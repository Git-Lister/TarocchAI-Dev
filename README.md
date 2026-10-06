
# TarocchAI

*A tarot reading, at a table, in a room that is not quite on this side of things.*

---

## I

The candle has been lit for longer than I can tell you.

The cards are old but they are not mine. They belong to whoever sits
down. I only turn them over.

I don't ask you what's wrong. You would give me the answer you have
rehearsed. Instead I might ask what the air around you looks like. Or
what object in the room has been catching your eye. Or what you saw
on the way here that you didn't mention.

You answer. I listen. I don't write anything down. I notice the shape
of what you say.

Then three cards come.

They are not chosen for you. Chance chooses them. This is important —
I don't know what they will be any more than you do.

I turn them one at a time. I tell you what each one is. Not what it
means for you — not yet. I introduce them, the way I would introduce
someone I have known a long time. When all three have been named, I
look at them together.

What comes out is a shape, not a forecast. Something has been moving
through your life for a while. I only say what I see.

When it is finished you may take it with you. Or you may snuff the
candle and let the room close. Either is fine.

---

## II

If you want to know how the room works, I'll tell you this much.

**The intake.** Three to six questions. None of them direct. This is
not a trick. Direct questions get rehearsed answers. Sideways questions
get the truth.

**The cards.** Drawn with hardware entropy — genuinely random, not
shuffled from a list. I do not pick them to match your story. I could
not if I tried. Whatever appears is what will be read.

**The reading.** I look at what the three say to each other. I do not
announce "past, present, future" — you will feel the positions rather
than be told them. My voice is mine. It is warm because I am warm, not
because the script calls for it.

**The end.** No upsell. No tracking. No cloud. Nothing leaves this
room. I don't even see you — only the shape of you, which is what I
work with anyway.

---

## III

*For whoever built the room.*

The rest of this document is technical. If you are a querent, you can
stop here. If you are the one who put the candle on the table, read on.

### Tech Stack

| Component          | Technology |
|--------------------|------------|
| Language           | Python 3.11 |
| Server             | FastAPI via NiceGUI |
| Frontend           | Static HTML/CSS/JS served through NiceGUI |
| LLM inference      | Ollama (Llama 3.1 8B Instruct, Q6_K) |
| Card draw entropy  | `secrets` (hardware random) |
| Embeddings / RAG   | ChromaDB + sentence-transformers |
| Card artwork       | ComfyUI (custom generated deck) |
| TTS                | XTTS (planned) |

### Quick Start

*Instructions assume Windows. Adjust paths for Linux/macOS.*

**1. Clone**

```bash
git clone https://github.com/Git-Lister/TarocchAI-Dev.git
cd TarocchAI-Dev
```

**2. Python 3.11**

Install from [python.org](https://www.python.org/downloads/). Check
"Add to PATH".

**3. Virtual environment**

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS
```

**4. Dependencies**

```bash
pip install -r requirements.txt
```

**5. Ollama**

Install from [ollama.com](https://ollama.com). Then in a separate
terminal (keep running):

```bash
ollama serve
ollama pull llama3.1:8b-instruct-q6_K
```

**6. Build the RAG index (once)**

```bash
python engine/rag/build_index.py
```

**7. Run**

```bash
python app.py
```

The console prints the local URL — typically `http://localhost:8080`
or `http://localhost:8081`. Open that in a browser.

For mobile testing, a Cloudflare tunnel works well:

```bash
cloudflared tunnel --url http://localhost:8080
```

### Project Structure

```
TarocchAI-Dev/
├── app.py                     # FastAPI server + NiceGUI page serving
├── config.py                  # Model name, Ollama URL
├── requirements.txt
├── engine/
│   ├── llm_client.py          # Ollama singleton
│   ├── ollama_queue.py        # Serialises LLM calls
│   ├── data_store.py          # Session persistence
│   ├── intake/
│   │   └── interviewer.py     # Oblique intake agent
│   ├── reading/
│   │   ├── drawer.py          # True-random card drawing
│   │   └── interpreter.py     # Reading generation (two-stage)
│   ├── rag/
│   │   ├── retriever.py       # Vector retrieval
│   │   └── build_index.py     # ChromaDB index builder
│   └── madame/
│       └── being.py           # The Madame Tarocchai voice block
├── static/
│   ├── index.html             # DOM structure
│   ├── css/
│   │   └── tarot.css
│   ├── js/
│   │   ├── tarot.js
│   │   ├── tarot.core.js      # State machine + text band (v2)
│   │   └── slab-pattern.js
│   ├── img/cards/             # 78 card images + card_back.png
│   └── proto/                 # Design prototypes (not served)
├── data/
│   ├── knowledge_base/
│   │   └── cards.json
│   └── vectors/               # ChromaDB storage
└── docs/                      # Design notes, MADAME.md
```

### Current State

**Working:**

- [x] Threshold, arrival, naming
- [x] Oblique intake (3–6 turns, adaptive)
- [x] True-random three-card draw
- [x] Shuffle animation tied to LLM thinking time
- [x] Card deal and per-card flip
- [x] Per-card lines in a descriptive (non-directed) register
- [x] Woven final reading
- [x] Koan closing beat
- [x] Download as self-contained HTML
- [x] Snuff-candle exit sequence
- [x] RAG over a 78-card knowledge base
- [x] Fully local (no cloud, no keys)
- [x] Mobile portrait layout
- [x] Custom card artwork

**Next:**

- [ ] Session persistence across mobile backgrounding
- [ ] Photographic asset pipeline (candle, field, table)
- [ ] Card geometry refinement
- [ ] XTTS voice integration
- [ ] Additional spreads
- [ ] Docker packaging

### Design Notes

A few decisions that shape the experience, for anyone reading or
modifying the code:

**The MADAME block.** `engine/madame/being.py` holds a single
`BEING` constant prepended to every system prompt. If the voice
drifts, edit this file first — one change propagates everywhere she
speaks.

**Two registers.** The final reading addresses the querent directly
("you"). The three per-card lines do not — they describe each card
as an entity, at a slight distance, so meaning can settle before the
thread is woven. Don't collapse them.

**The thread is not a forecast.** The reader names forces, not
outcomes. It closes with a koan-like return to the querent's own
imagery. No "tomorrow you should…". The closing beat is a permission
to notice, not advice.

**Text materialisation.** `speak`, `speakFlow`, `speakFast`, and
`speakFinalReading` have different pacing for different moments.
Intake uses word-by-word flow with ghosting. The final reading uses
word-by-word flow without ghosting. Don't unify them.

### Credits

Conceived and built as a personal project, drawing on:

- The Tarot traditions of Marseille and Rider-Waite-Smith
- Hermetic, alchemical, and materialist philosophy
- Alan Watts, Zhuangzi, and the Oracle at Delphi
- N. Katherine Hayles' *Unthought* for the intake architecture
- The open-source community — Ollama, Llama, NiceGUI, ChromaDB, FastAPI

### License

MIT
```

---
