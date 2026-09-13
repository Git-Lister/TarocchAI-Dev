# Batch 1 Execution Report

**Date**: 2026-09-12  
**Branch**: main  
**Base Commit**: ca01d99 ("read me AI images checked off")  
**Head Commit**: 7256bff ("docs: record Batch 1 decisions and changelog")

---

## Files Modified

| File | Change Type | Lines Added | Lines Removed | Net Change |
|------|-------------|-------------|---------------|------------|
| `engine/reading/drawer.py` | Edit | 5 | 3 | +2 |
| `static/js/tarot.js` | Delete | 0 | 28 | -28 |
| `static/css/tarot.css` | Edit | 2 | 1 | +1 |
| `docs/DECISIONS.md` | Create | 102 | 0 | +102 |
| `CHANGELOG.md` | Create | 27 | 0 | +27 |
| **Total** | | **136** | **32** | **+104** |

---

## Validation Results

### 1. `git grep -c "function expandTextBox" static/js/tarot.js`
```
static/js/tarot.js:1
```
✅ **PASS** — Exactly 1 definition remains (the first/original at line 65)

### 2. `git grep -c "function contractTextBox" static/js/tarot.js`
```
static/js/tarot.js:1
```
✅ **PASS** — Exactly 1 definition remains (the first/original at line 84)

### 3. `python -c "from engine.reading.drawer import draw_cards; print(len(draw_cards(3, ['Past','Present','Future'])))"`
```
3
```
✅ **PASS** — `draw_cards()` returns 3 cards without error; type hint and exception handling work

---

## Confirmation: Groups B, C, F Untouched

The following files were **NOT modified** in this batch (verified via `git diff ca01d99..HEAD --name-only`):

- `engine/intake/interviewer.py` — Group B (no change needed per ADR-002)
- `engine/reading/interpreter.py` — Group C (no change needed per ADR-002)
- `static/index.html` — Group F (no change needed per PLAN)

The diff shows only our 5 intended files changed:
```
CHANGELOG.md
docs/DECISIONS.md
engine/reading/drawer.py
static/css/tarot.css
static/js/tarot.js
```

---

## Deviations from Plan

**None.** All steps executed exactly as specified in `docs/PLAN_batch1.md` §4.

---

## Remaining Uncertainties (Require Manual Testing)

The following claims from the plan remain **UNCERTAIN** and require human verification via `python app.py` at `http://localhost:8080`:

| Claim | Description | Test Criteria |
|-------|-------------|---------------|
| **#4** | Intake may parrot user words | Complete intake session; observe if Madame reflects metaphorically vs. repeating verbatim |
| **#9** | Candle/card overlap at certain viewports | Test at desktop (1920px), tablet (768px), mobile (375px); verify candle sits below cards |
| **#11** | Initial 78-card spread shows custom card back | Enter room; verify all 78 cards display `/static/img/card_back.png` (not default gradient) |

Additionally, these **Definition of Done** items require manual verification:

- [ ] Madame's text (italic, left gold border) vs user's text (right-aligned, right gold border) are visually distinct
- [ ] Reading weaves cards into single narrative — no "Past: X. Present: Y. Future: Z." announcements
- [ ] Breathing presence pulse speeds up during speech, slows after
- [ ] Candle sits below cards, no overlap at all tested viewports

---

## Recommended Next Step

**Run manual end-to-end test:**
```bash
cd C:\Users\DaveH\TarocchAI-Dev
python app.py
```
Then visit `http://localhost:8080` and complete a full session (threshold → name gate → intake → candle click → reading). Document results against the uncertain claims and Definition of Done checklist above.

If any issues found:
- Claim 4 (parroting): Adjust dynamic prompt at `engine/intake/interviewer.py:113`
- Claim 9 (overlap): Adjust `.cards-section`/`candle-section` flex/min-height in `tarot.css`
- Claim 11 (card back): Add inline style in `createCards()` at `tarot.js:373`

Then proceed to **Batch 2** (deferred items: `splitReadingIntoSections`/`showReadingSections` refactor, any fixes from manual test).