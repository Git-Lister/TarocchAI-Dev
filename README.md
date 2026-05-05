Here is the complete, updated `README.md` — ready to paste into your project. It includes the full setup guide for a fresh clone, the “How It Works” explanation, and a clear map of everything the project contains.

```markdown
# TarocchAI

**A local, offline Tarot reader that sees spirit in the material.**
Built with NiceGUI, Ollama, and a deep respect for the querent's lived reality.

---

## Philosophy

TarocchAI speaks to one querent at a time. The reading is a co‑creation
between your own imagery and the cards, guided by an earthy, grounded
intelligence. We believe every card points to something real — a
relationship, a decision, a weight you’re carrying — and that insight
is always paired with a small, concrete step forward.

---

## How It Works (For the Curious)

A good tarot reader rarely starts by asking, “So, what’s your problem?”  
Instead, they might notice how you hold your shoulders, or ask about a
dream you had, or hand you a card and say, “What do you see in this?”

TarocchAI begins in the same sideways way. It asks gentle, slightly
poetic questions — about the colour of the air around you, the texture
of your week, an object in the room that feels alive. These aren’t
random. They’re designed to help you speak from a less guarded place,
bypassing the part of the mind that wants to give a tidy answer.

Whatever you say — a clock that’s stopped, a heavy grey‑blue sky —
becomes the raw material the reading is built from.

**The Mirror Card**  
Before the official spread, the app shows you a single card image
and asks, “What catches your eye first?” Your answer isn’t judged;
it’s simply another thread the reader will weave in later.

**The Cards**  
Three cards are drawn genuinely at random (Past, Present, Future).  
TarocchAI doesn’t pick cards to match your story — chance does that.  
But once they’re on the table, the app draws on a deep well of
traditional meanings, symbolism, and the unique imagery you’ve already
shared, and finds the story that wants to be told.

**The Reading**  
The reading itself is created by an AI that has been carefully
instructed in a particular philosophy:

- Every card points to something real: a relationship, a decision, a weight you’re carrying.
- Insight without a small, practical next step is incomplete.
- You’re not a passive passenger in your own life; the cards light up the floor, and you decide where to step.

The voice is warm, earthy, and never preachy. It won’t predict the
future. It will name the forces at play, the tensions, the hidden gifts,
and then offer one gentle, concrete thing you might actually do tomorrow.

**And Then the Curtain Closes**  
After the reading, the app draws the curtain and returns to stillness.  
There is no upsell, no tracking, no cloud. Everything runs on your own
computer, in private. The whole experience is meant to feel like a
single, uninterrupted conversation — the kind you might have had in a
reader’s candlelit room, once, long ago.

---

## Current State (MVP)

- [x] Oblique intake interview (projective, side‑door questions)
- [x] True‑random card drawing (3‑card Past‑Present‑Future spread)
- [x] AI‑generated reading in a consistent, warm voice
- [x] Rich knowledge base (78 card meanings, esoteric / historical / materialist)
- [x] Retrieval‑Augmented Generation (RAG) for deep card interpretation
- [x] NiceGUI frontend with dark tarot‑inspired styling
- [x] Fully local (no cloud, no API keys)
- [ ] Card artwork generation (grindhouse‑medieval house style)
- [ ] Text‑to‑speech (XTTS) for spoken readings
- [ ] Additional spreads and reading modes

---

## Tech Stack

| Component          | Technology |
|--------------------|------------|
| Language           | Python 3.11 |
| UI framework       | NiceGUI |
| LLM inference      | Ollama (Llama 3.1 8B Instruct) |
| Card draw entropy  | `secrets` (hardware random) |
| Embeddings / RAG   | ChromaDB + sentence-transformers |
| Art generation     | Stable Diffusion + LoRA (planned) |
| TTS                | XTTS (planned) |
| Packaging          | Docker (planned) |

---

## First‑Time Setup (Local)

*These instructions assume a Windows machine, but they work on Linux/macOS with
slight path adjustments.*

### 1. Clone the repository
```bash
git clone https://github.com/your-username/TarocchAI.git
cd TarocchAI
```

### 2. Install Python 3.11
- Download the **Windows 64‑bit installer** from [python.org](https://www.python.org/downloads/release/python-3119/).
- During installation, check **“Add Python to PATH”**.
- Verify in a terminal:
  ```bash
  python --version
  ```
  You should see `Python 3.11.x`.

### 3. Create and activate a virtual environment
```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS
```

### 4. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 5. Install Ollama
- Download from [ollama.com](https://ollama.com) and install.
- Start the Ollama server in a separate terminal (keep it running):
  ```bash
  ollama serve
  ```

### 6. Pull the required model
In your main terminal (with the venv activated):
```bash
ollama pull llama3.1:8b-instruct-q6_K
```
*(The app expects this model by default; if you change models, edit `config.py`.)*

### 7. Build the knowledge base index
The app uses a vector database to retrieve detailed card meanings.  
You only need to do this once:
```bash
python engine/rag/build_index.py
```
You should see `Indexed 78 cards into .../data/vectors`.

### 8. Run the app
```bash
python app.py
```
Open your browser and go to **http://localhost:8080**.

---

## Usage

- Click **Enter** to begin.
- The intake interviewer will ask a few oblique questions. Answer freely — there’s no wrong response.
- When prompted, describe what catches your eye in the mirror card.
- Three cards will be revealed (Past, Present, Future).
- Press **Reveal Reading** — the TarocchAI Reader will stream your reading.
- The curtain closes. If you want another session, click **Read again?**.

---

## Project Structure

```
TarocchAI/
├── app.py                     # NiceGUI frontend
├── config.py                  # Model name, Ollama URL
├── setup.py                   # Project tree generator
├── requirements.txt
├── Dockerfile / docker-compose.yml
├── engine/
│   ├── intake/                # Oblique intake agent
│   ├── reading/               # Card drawing & LLM interpreter
│   ├── rag/                   # Vector retrieval & index builder
│   ├── tts/                   # Voice synthesis (placeholder)
│   └── art/                   # Card image generation (placeholder)
├── data/
│   ├── knowledge_base/        # 78‑card structured meanings (cards.json)
│   ├── vectors/               # ChromaDB storage
│   └── voices/                # XTTS voice files (future)
├── ui/                        # CSS, fonts, static assets
├── tests/                     # Test scripts
└── research/                  # Art history, archetypes, Hayles notes
```

---

## Roadmap

- [ ] Populate `data/knowledge_base/` with detailed card meanings from public‑domain sources  
- [x] Implement RAG retrieval (ChromaDB + sentence‑transformers)  
- [ ] Train LoRA for house style card art, integrate into app  
- [ ] Add TTS option using XTTS  
- [ ] Build additional spreads (Celtic Cross, single card, etc.)  
- [ ] Docker container for easy distribution  
- [ ] In‑app documentation / philosophy page  

---

## Credits

TarocchAI was conceived and built as a personal project, drawing on:
- The Tarot traditions of Marseille and Rider‑Waite‑Smith
- Hermetic, alchemical, and materialist philosophy
- The open‑source AI community (Ollama, Llama, NiceGUI, ChromaDB)
- N. Katherine Hayles’ *Unthought* for the cognitive architecture of the intake

```

Update the GitHub link `https://github.com/your-username/TarocchAI.git` to match your actual repository. Once pasted, the README will guide anyone from a fresh clone to a full, working TarocchAI session.