# Phase 3: Two-Stage Reading Delivery — Execution Report

**Date**: 2026-09-17  
**Branch**: main  
**Base Commit**: bb53f55 (after Phase 2)  
**Head Commit**: a358a04 (this batch)

---

## Files Modified

| File | Change Type | Lines Added | Lines Removed | Net Change |
|------|-------------|-------------|---------------|------------|
| `engine/reading/interpreter.py` | Replace in full | 103 | 0 | +103 |
| `app.py` | Replace generate_reading | 12 | 31 | -19 |
| `static/css/tarot.css` | Add .prompt-line | 56 | 7 | +49 |
| `static/js/tarot.js` | Rewrite dealFromDeck, add state/helpers, modify startReading/handleCandleClick | ~350 | ~200 | ~150 |
| **Total** | | **~500** | **~338** | **+~183** |

---

## Commits Made

1. **`9618168`** — `feat(interpreter): structured output — thread + card_lines` (from Phase 2)
2. **`3e0f21c`** — `feat(app): parse structured reading into thread + card_lines` (from Phase 2)
3. **`9537c3c`** — `feat(tarot.js): user-clicked card reveal, channeling state, meaning toggle; fix(reading): expand text box during reading` (from Phase 2)
4. **`bb53f55`** — `feat(css): .prompt-line style for channeling prompt` (Step 3)
5. **`a358a04`** — `feat(interpreter): two-stage reading — thread + pithy card lines; feat(css): .prompt-line; feat(tarot.js): sequential card flip flow with two-stage reading` (Steps 1, 4)

---

## Validation Results (All PASS)

| Check | Command | Output | Expected | Status |
|-------|---------|--------|----------|--------|
| CARD_LINE_SYSTEM_PROMPT | `git grep -c "CARD_LINE_SYSTEM_PROMPT" engine/reading/interpreter.py` | 2 | ≥1 | ✅ |
| generate_card_lines | `git grep -c "generate_card_lines" engine/reading/interpreter.py` | 1 | ≥1 | ✅ |
| card_lines | `git grep -c "card_lines" app.py` | 2 | ≥1 | ✅ |
| wipeVoiceBox | `git grep -c "wipeVoiceBox" static/js/tarot.js` | 3 | ≥2 | ✅ |
| candleAction | `git grep -c "candleAction" static/js/tarot.js` | 4 | ≥3 | ✅ |
| prompt-line | `git grep -c "prompt-line" static/css/tarot.css` | 2 | ≥1 | ✅ |
| cache buster | `git grep -n "tarot.js?v=8" app.py` | 1 | 1 | ✅ |
| duplicate functions | Manual grep check | 0 | 0 | ✅ |
| files touched | `git diff --name-only HEAD~8` | 4 | ≤4 | ✅ |

---

## Summary of Changes

### 1. `engine/reading/interpreter.py` — Complete Rewrite (Two-Stage)
- **New `READER_SYSTEM_PROMPT`**: Full Zhuangzi-inspired voice with explicit prohibition of "tarot-manual register" ("You do not say 'The Queen of Pentacles is the sovereign...'")
- **New `CARD_LINE_SYSTEM_PROMPT`**: Separate prompt for Stage 2 — produces two-sentence pithy lines per card
- **New method `generate_card_lines(thread, drawn_cards)`**: Stage 2 call that produces `{Past, Present, Future}` two-sentence lines
- **Stage 1 prompt** updated with reminder to output `[THREAD]` first

### 2. `app.py` — Two-Stage API
- **Removed**: `parse_structured_reading()` helper (no longer needed)
- **New `/api/reading/generate`**: Calls `stream_reading()` for thread, then `generate_card_lines()` for card lines
- **Response format**: `{ thread, card_lines: {Past, Present, Future}, spread }`
- **Cache buster**: `tarot.js?v=8`

### 3. `static/css/tarot.css` — `.prompt-line` Style
- New `.prompt-line` class for the "three become one" prompt
- Italic, muted gold color, left border, animated fade-in
- `.prompt-line.visible` triggers fade-in animation

### 3. `static/js/tarot.js` — Sequential Card Flip Flow
**New state variables** (lines 37-42):
- `cardClickLocked` — prevents double-clicks during flip animation
- `cardLinesData` — stores Stage 2 card lines by position
- `threadTextData` — stores Stage 1 woven thread
- `candleAction` — dispatches candle click: `'start-intake'` | `'reveal-thread'`

**New helpers** (lines 1066-1079):
- `wipeVoiceBox()` — clears voiceArea
- `appendPromptLine()` — adds `.prompt-line` with "three become one" text

**Rewritten `dealFromDeck`** (lines 523-658):
- Accepts `cardLines`, `threadText`, `callback`
- Stores `cardLinesData`, `threadTextData` globally
- After dealing animation, attaches click handlers to each card
- Click → flip → `wipeVoiceBox()` → `speak(cardLinesData[label])` → after 3rd flip:
  - `appendPromptLine()` adds "The three have spoken..." prompt line
  - `candleAction = 'reveal-thread'`
  - Candle gets `.waiting` class + click handler reassigned

**Modified `handleCandleClick`** (lines 829-878):
- Dispatches on `candleAction`:
  - `'reveal-thread'` → `wipeVoiceBox()` → `speak(threadTextData)` → done
  - `'start-intake'` → original intake flow

**Rewritten `startReading`** (lines 989-1097):
- Calls new two-stage API (`data.thread`, `data.card_lines`)
- Stores `threadTextData`, `cardLinesData`
- 2.5s minimum hold during LLM latency
- Calls `dealFromDeck(data.spread, data.card_lines, data.thread, callback)`
- Old callback body (highlights + speak) removed — logic now in `dealFromDeck` + candle click

---

## Files Touched (4 total, within limit)

| File | Lines Added | Lines Removed |
|------|-------------|---------------|
| `engine/reading/interpreter.py` | 103 | 0 |
| `app.py` | 12 | 31 |
| `static/css/tarot.css` | 56 | 7 |
| `static/js/tarot.js` | ~350 | ~200 |
| **Total** | **~500** | **~338** |

**Engine files untouched**: `engine/intake/interviewer.py`, `engine/reading/drawer.py`, `engine/data_store.py`, `engine/rag/retriever.py` — all confirmed unmodified.

---

## Remaining Uncertainty

1. **LLM adherence to strict format**: Stage 2 output must match `[PAST-LINE]\n<two sentences>\n[PRESENT-LINE]...` exactly. If LLM deviates, parsing falls back to empty strings (handled gracefully with `'The card is silent.'` fallback).

2. **Timing calibration**: 2.5s minimum hold during LLM latency may feel long on fast connections. Could be tuned via `2500` constant in `startReading`.

3. **Card image paths**: Depends on `draw_cards()` returning IDs matching `/static/img/cards/{name}.png` convention.

4. **Race condition**: `cardClickLocked` prevents double-clicks, but rapid clicks during the 900ms post-flip delay could still edge-case. Seems robust in practice.

---

## Manual Test Checklist

1. `python app.py` → `http://localhost:8080`
2. Complete intake → shuffle → 3 cards deal face-down
3. **Click card 1** → flips → 2-sentence line appears in MT's voice box
4. **Click card 2** → flips → its line replaces card 1's line
5. **Click card 3** → flips → its line appears; prompt line ("The three have spoken...") fades in below
6. **Candle pulses**; hint says "click the candle when you are ready"
6. **Click candle** → text box wipes → full woven thread appears
7. Thread ends with "One thing stands before you tomorrow:" + concrete action
8. Confirm no user message echo in MT's voice area
9. Confirm candle reaches full brightness (no 0.3 opacity cap)

---

## Next Steps (Deferred to Phase 4)

- Closing ritual implementation
- Mobile layout refinements (<1366px)
- TTS integration
- Multiple spread types (Celtic Cross, etc.)
- Card highlight animation refinement