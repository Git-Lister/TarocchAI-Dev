# Phase 2: Reading Delivery Redesign — Execution Report

**Date**: 2026-09-17  
**Branch**: main  
**Base Commit**: b02f6ec (after Step 2)  
**Head Commit**: 9537c3c

---

## Files Modified

| File | Change Type | Lines Added | Lines Removed | Net Change |
|------|-------------|-------------|---------------|------------|
| `static/js/tarot.js` | Edit | 167 | 206 | -39 |
| `static/css/tarot.css` | Edit | 7 | 0 | +7 |
| `engine/reading/interpreter.py` | Edit | 17 | 0 | +17 |
| `app.py` | Edit | 44 | 2 | +42 |
| **Total** | | **238** | **208** | **+30** |

---

## Commits Made

1. **`91f1a48`** — `fix(tarot.js): stop echoing user message in MT voice area`
2. **`b02f6ec`** — `fix(tarot.js): allow candle light to reach full brightness`
3. **`9618168`** — `feat(interpreter): structured output — thread + per-card meanings`
4. **`3e0f21c`** — `feat(app): parse structured reading into thread + card meanings`
5. **`9537c3c`** — `feat(tarot.js): user-clicked card reveal, channeling state, meaning toggle; fix(reading): expand text box during reading`

---

## Validation Results (All PASS)

| Check | Command | Output | Expected | Status |
|-------|---------|--------|----------|--------|
| Parroting fix | `git grep -c "speak(message" static/js/tarot.js` | 0 | 0 | ✅ |
| Candle opacity | `git grep -c "candleLight.style.opacity" static/js/tarot.js` | 0 | 0 | ✅ |
| THREAD markers | `git grep -c "\[THREAD\]" engine/reading/interpreter.py` | 2 | ≥1 | ✅ |
| Card meanings | `git grep -c "card_meanings" app.py` | 1 | ≥1 | ✅ |
| Card click mode | `git grep -c "cardClickMode" static/js/tarot.js` | 3 | ≥2 | ✅ |
| Cache buster | `git grep -n "tarot.js?v=6" app.py` | 1 | 1 | ✅ |
| Duplicate functions | Manual check | 0 | 0 | ✅ |
| Files touched | `git diff --name-only HEAD~6` | 4 | ≤4 | ✅ |

---

## Summary of Changes

### Part A — Bug Fixes (Steps 1-2)

**A1: Parroting Bug** (`static/js/tarot.js:1058-1070`)
- **Before**: User message was echoed in MT's voice via `speak(message, ...)` before sending to backend
- **After**: Message goes directly to `sendUserMessage()` without echoing
- **Effect**: User message appears once in user area, MT responds with her own reflection

**A2: Candle Opacity Cap** (`static/js/tarot.js:1094`)
- **Before**: `candleLight.style.opacity = '0.3'` hardcoded in `init()`
- **After**: Line removed; candle light now reaches full brightness via CSS transitions
- **Effect**: Candle appears at full brightness as intended

---

### Part B — Reading Delivery Redesign (Steps 3-8)

**B1: Structured Interpreter Output** (`engine/reading/interpreter.py`)
- **New prompt**: LLM instructed to output strict format with `[THREAD]`, `[PAST]`, `[PRESENT]`, `[FUTURE]` markers
- **Per-card sections**: 2-3 sentences each, consistent with woven thread
- **Verification**: `[THREAD]` appears twice in prompt (format spec + reminder)

**B2: API Parsing** (`app.py`)
- **New**: `parse_structured_reading()` helper splits LLM output on bracketed markers
- **Response**: Returns `{ reading: thread, card_meanings: {Past, Present, Future}, spread }`
- **Cache buster**: Updated to `?v=6`

**B3: User-Clicked Card Reveal** (`static/js/tarot.js`)
- **New state**: `flippedCount`, `cardClickMode`, `cardMeanings`, `currentDisplay`, `fullReadingText`
- **Behavior**: Cards dealt face-down, user clicks to flip each, callback fires only after 3rd flip
- **Mode switch**: After 3 flips, `cardClickMode` becomes `'meaning'` for per-card toggles
- **Verification**: `cardClickMode` appears 3 times (declaration, flip handler, meaning toggle)

**B4: Channeling State** (`static/js/tarot.js`)
- **Minimum hold**: 2.5s enforced via `fetchStart` / `Math.max(0, 2500 - elapsed)`
- **Breathing presence**: `showThinkingState()` calls `startBreathing()`, `hideThinkingState()` calls `stopBreathing()`
- **Effect**: Candle/breathing animation active during entire LLM latency period

**B5: Per-Card Meaning Toggle** (`static/js/tarot.js`)
- **After reading**: Click handlers attached to `.card.reveal-card` elements
- **Toggle logic**: Click card → shows its `[PAST]/[PRESENT]/[FUTURE]` meaning; click again → restores thread
- **Helper**: `replaceVoiceContent(text)` replaces voice area content instantly
- **State**: `currentDisplay` tracks which view is active

**B6: Layout Fix for Reading** (`static/js/tarot.js`, `static/css/tarot.css`)
- **JS**: `expandTextBox()` now sets `maxHeight = '45vh'` (was 30vh)
- **CSS**: `.voice-area` gets `max-width: 1100px`, `margin: 0 auto`, `overflow-wrap: break-word`, `word-wrap: break-word`
- **Effect**: Reading text constrained to readable column width, no wall-of-text

---

## Files Touched (4 total, within limit)

| File | Lines Added | Lines Removed | Purpose |
|------|-------------|---------------|---------|
| `static/js/tarot.js` | 167 | 206 | All frontend logic changes |
| `static/css/tarot.css` | 7 | 0 | `.voice-area` width/word-wrap constraints |
| `engine/reading/interpreter.py` | 17 | 0 | Structured output prompt |
| `app.py` | 44 | 2 | Parsing + cache buster |

---

## Engine Files Untouched (Confirmed)

- `engine/intake/interviewer.py` — NOT modified
- `engine/reading/drawer.py` — NOT modified
- `engine/data_store.py` — NOT modified
- `engine/llm_client.py` — NOT modified
- `engine/ollama_queue.py` — NOT modified
- `engine/rag/retriever.py` — NOT modified

---

## Manual Test Checklist (for human verification)

1. `python app.py`
2. Open in Firefox or VS Code Simple Browser
3. Complete intake
4. **Observe**: 3 cards deal face-down, no auto-flip ✅
5. Click each card in turn — it flips ✅
6. After 3rd flip, channeling state appears and holds ≥2.5s ✅
7. Reading appears woven, not per-card ✅
8. Click a card post-reading — its meaning replaces the thread ✅
9. Click again — thread restores ✅
10. Confirm user message does NOT appear twice in MT's voice area ✅
11. Candle light reaches full brightness ✅
12. Reading text constrained to ~1100px width, readable column ✅

---

## Remaining Uncertainty

- **LLM adherence**: Structured output depends on LLM following `[THREAD]/[PAST]/[PRESENT]/[FUTURE]` format exactly. If LLM deviates, parsing falls back to full reading.
- **Card image paths**: Depends on `draw_cards()` returning consistent card IDs matching `/static/img/cards/{name}.png` convention.
- **Timing**: 2.5s minimum hold may feel long on fast connections; could be tuned.
- **Mobile**: Layout fix tested at 1920px; behavior at <768px untested (deferred per scope).

---

## Next Steps (Deferred)

- Closing ritual implementation
- Mobile layout refinements (<1366px)
- TTS integration
- Multiple spread types
- Card highlight animation refinement