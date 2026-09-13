# TarocchAI Batch 1 Upgrades — Execution Plan

> **Status**: PLAN ONLY — Do not execute until reviewed  
> **Date**: 2026-09-12  
> **Branch**: main (verified against working copy)

---

## 1. Verification of Current State

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | `drawer.py:31` uses `positions: list = None` (violates PEP 484) | **CONFIRMED** | `def draw_cards(num_cards: int = 3, positions: list = None, ...)` — missing `Optional` |
| 2 | `drawer.py:26-27` uses bare `except Exception: pass` | **CONFIRMED** | `except Exception:\n            pass` — swallows all errors |
| 3 | `INTAKE_SYSTEM_PROMPT` says "After exactly four turns" but `MAX_INTAKE_TURNS = 6` | **FALSE** | Prompt line 28: `"After 3-6 turns, you end with:"` — matches `MIN=3`, `MAX=6` |
| 4 | Intake prompt may still cause parroting ("mutter" language) | **UNCERTAIN** | System prompt (lines 8–35) has strong Zhuangzi voice. Line 113 in `conversation_turn`: `"Do not parrot their words back verbatim. Mutters are fine."` — intentional, but effect untested |
| 5 | `READER_SYSTEM_PROMPT` contains "You name each card and its relation to their material life" | **FALSE** | Prompt line 20: `"You do not name each card as 'Past', 'Present', 'Future' like a teacher. The positions are implied, not announced."` |
| 6 | Laozi/Zhuangzi voice NOT applied to reader prompt | **FALSE** | Prompt already contains: "flow like water" (13), "truth held gently is a door" (18), "concrete bodily language: iron, salt, dust" (22), "quiet knowing laugh" (24), "silence is not empty" (28) |
| 7 | Two `expandTextBox()` definitions in `tarot.js` | **CONFIRMED** | `git grep` returns 2: lines 65 and 1149 |
| 8 | Two `contractTextBox()` definitions in `tarot.js` | **CONFIRMED** | `git grep` returns 2: lines 84 and 1161 |
| 9 | Candle and cards may overlap (candle should sit below cards) | **UNCERTAIN** | HTML uses flex column: `.cards-section` (flex:1.5) → `.candle-section` (flex:0.5). Should stack, but visual verification needed at various viewports |
| 10 | Breathing presence may not be tied to speech correctly | **PARTIALLY CONFIRMED** | `.breathing-presence.speaking` CSS exists (lines 375–388). JS toggles via `startBreathing()`/`stopBreathing()`. **But**: second `expandTextBox()` (line 1149) doesn't call `startBreathing()`, breaking the link |
| 11 | Initial 78-card spread may not show custom card back (`--card-back-image`) | **UNCERTAIN** | `createCards()` creates `.card-back` elements relying on CSS `.card-back { background-image: var(--card-back-image) }` (line 418). Reveal cards set it inline (tarot.js:511). CSS variable defined at line 19. Should work, but dynamic element creation could have timing issues |

### Key grep outputs
```bash
# Duplicate functions
git grep -n "function expandTextBox" static/js/tarot.js
# static/js/tarot.js:65
# static/js/tarot.js:1149

git grep -n "function contractTextBox" static/js/tarot.js
# static/js/tarot.js:84
# static/js/tarot.js:1161

# Call sites (all use the SECOND definition due to hoisting/overwrite)
git grep -n "expandTextBox\|contractTextBox" static/js/tarot.js
# Lines: 214, 980, 987, 1050, 1061, 1070 (all calls)
# Lines: 65, 84 (first defs), 1149, 1161 (second defs)
```

### Critical finding on duplicate functions
The **second** definitions (lines 1149, 1161) overwrite the first and are the ones actually called. Differences:

| Aspect | First def (lines 65/84) | Second def (lines 1149/1161) — **ACTIVE** |
|--------|------------------------|-------------------------------------------|
| Touches `#madame-area` | Yes (sets `maxHeight: 30vh`) | **No** — hard cap lost |
| Calls `startBreathing()`/`stopBreathing()` | Yes | **No** — breathing presence decoupled |
| `voiceArea.maxHeight` | `30vh` | `60vh` (different cap) |

---

## 2. Proposed Changes (Minimal, One Touch Per File)

### Group A: `engine/reading/drawer.py` — Type hints & exception handling
**File**: `engine/reading/drawer.py`

**Changes**:
1. Line 31: Change `positions: list = None` → `positions: Optional[list] = None`
   - Add `from typing import Optional` at top
2. Lines 26–27: Replace bare `except Exception: pass` with specific exceptions + logging
   - Catch `FileNotFoundError`, `json.JSONDecodeError`, `OSError`
   - Log warning via `logging.warning` (std lib, no new deps)

**Proposed code**:
```python
# Top of file
import logging
from typing import Optional

# Line 19-28
def load_cards():
    if os.path.exists(CARDS_PATH):
        try:
            with open(CARDS_PATH, "r") as f:
                cards = json.load(f)
                if isinstance(cards, list) and len(cards) == 78:
                    return cards
        except (FileNotFoundError, json.JSONDecodeError, OSError) as e:
            logging.warning(f"Failed to load cards from {CARDS_PATH}: {e}")
    return FALLBACK_CARDS

# Line 31
def draw_cards(num_cards: int = 3, positions: Optional[list] = None, with_replacement: bool = False) -> list:
```

**Effect**: Type-safe; errors visible in logs; fallback still works.

---

### Group B: `engine/intake/interviewer.py` — Turn-count contradiction
**Verdict**: Claim 3 is **false** — already consistent ("3-6 turns" matches MIN/MAX).  
**Claim 4**: Uncertain — the "mutter" instruction is in the dynamic `conversation_turn` prompt (line 113), not the system prompt. This may be intentional.

**Action**: **No code change required** for claim 3. For claim 4, defer to manual test (Definition of Done). If parroting observed, adjust line 113 in a later batch.

---

### Group C: `engine/reading/interpreter.py` — Formulaic structure & voice
**Verdict**: Claims 5 & 6 are **false** — prompt already forbids position announcements and has Zhuangzi voice.

**Action**: **No code change required**. Verify in manual test that reading weaves cards without "Past: X" labels.

---

### Group D: `static/js/tarot.js` — Remove duplicate functions
**File**: `static/js/tarot.js`

**Problem**: Second definitions (lines 1149, 1161) overwrite first, losing:
- `#madame-area` max-height cap (30vh)
- `startBreathing()` / `stopBreathing()` integration

**Solution**: Keep the **first** definitions (lines 65–99) — they're more complete. Delete the second definitions (lines 1149–1171).

**Proposed edit**: Remove lines 1149–1171 entirely.

**Call sites** (all remain unchanged, will now use the first def):
- Line 214: `expandTextBox()` in `speak()`
- Line 980: `expandTextBox()` in `startReading()`
- Line 987: `setTimeout(contractTextBox, 3000)`
- Line 1050: `setTimeout(contractTextBox, 3000)` in `showReadingSections`
- Line 1061: `expandTextBox()` in `showReadingSections`
- Line 1070: `setTimeout(contractTextBox, 3000)`

**Effect**: Restores 30vh cap on madame-area; re-couples breathing presence to speech.

---

### Group E: `static/css/tarot.css` — Layout fixes
**File**: `static/css/tarot.css`

**Issue 9 (candle/card overlap)**: Uncertain. Flex column should stack `.cards-section` above `.candle-section`. If overlap occurs at small viewports, adjust `min-height` or `flex` values.

**Proposed defensive change** (only if needed after visual test):
- Ensure `.cards-section` has `min-height: 25vh` (was 20vh) for breathing room
- Ensure `.candle-section` has `margin-top: 1rem` as safety buffer

**Issue 10 (breathing presence)**: Fixed by Group D (restores `startBreathing()` call). No CSS change needed.

**Issue 11 (card back on initial spread)**: The `.card-back` CSS (line 418) uses `var(--card-back-image)`. Dynamic elements should inherit. If manual test shows missing back image, add inline style in `createCards()`:
```javascript
back.style.backgroundImage = "var(--card-back-image)";
```
But prefer **not** to touch JS for this — CSS should suffice. Defer to manual test.

**Proposed CSS changes (minimal, defensive)**:
```css
/* Line 332: increase min-height slightly */
.cards-section {
    flex: 1.5;
    min-height: 25vh;  /* was 20vh */
}

/* Line 491: add top margin buffer */
.candle-section {
    flex: 0.5;
    min-height: 10vh;
    margin-top: 1rem;  /* NEW */
}
```

---

### Group F: `static/index.html` — Structural changes
**Verdict**: **No changes needed**. HTML structure correctly orders sections: madame-area → cards-section → candle-section → user-section. CSS flex column handles layout. All issues resolvable in CSS/JS.

---

## 3. Risks and Uncertainties

| Risk | Description | Mitigation |
|------|-------------|------------|
| Visual overlap (candle/cards) | Cannot verify without running app at multiple viewport sizes | Manual test at desktop, tablet, mobile widths |
| Breathing presence timing | `startBreathing()` called in `speak()` but `stopBreathing()` in async callback — race conditions possible | Manual test: watch for breathing animation during speech |
| Card back image on initial spread | Dynamic `.card-back` elements created before CSS var resolved? Unlikely but possible | Manual test: verify 78 cards show custom back |
| Parroting in intake | Claim 4 uncertain — "mutter" instruction may not prevent parroting in practice | Manual test: run intake, observe if Madame repeats user words |
| Reading announces positions | Claims 5/6 false in code, but LLM may still output "Past: X" despite prompt | Manual test: check reading output for position labels |
| Duplicate function removal breaks callers | All 6 call sites already use second def (hoisting). First def has **superset** of behavior (touches madame-area, calls breathing). Safe. | Verify all call sites still work after removal |

---

## 4. Execution Order (Atomic, Commit-Worthy Steps)

1. **`drawer.py` fixes** (Group A) — isolated, low risk, type safety + logging
2. **`tarot.js` duplicate removal** (Group D) — restores breathing coupling & madame-area cap
3. **`tarot.css` defensive layout** (Group E) — minor flex adjustments
4. **Manual end-to-end test** via `python app.py` — verify all Definition of Done criteria
5. **Update docs** — `docs/DECISIONS.md` (ADRs for any judgment calls), `CHANGELOG.md`

> **Note**: Groups B & C require no code changes (claims false). Group F requires no changes.

---

## 5. Definition of Done

### Automated checks
- [ ] `git grep -c "function expandTextBox" static/js/tarot.js` returns `1`
- [ ] `git grep -c "function contractTextBox" static/js/tarot.js` returns `1`
- [ ] `python -c "from engine.reading.drawer import draw_cards; print(draw_cards(3, ['Past','Present','Future']))"` runs without error

### Manual test (run `python app.py`, visit `http://localhost:8080`, complete full session)
- [ ] Madame's text (italic, left border) and user's text (right-aligned, right border) are visually distinct
- [ ] Candle sits below cards, no overlap at desktop/tablet/mobile widths
- [ ] All 78 cards in initial spread show custom card back (`/static/img/card_back.png`)
- [ ] Reading weaves cards into single narrative — **no** "Past: X. Present: Y. Future: Z." announcements
- [ ] Intake reflects user's words (metaphor, inquiry) rather than parroting verbatim
- [ ] Breathing presence pulse speeds up during speech, slows after

### Documentation
- [ ] `docs/DECISIONS.md` updated with ADRs for:
  - Keeping first `expandTextBox`/`contractTextBox` definitions (ADR-001)
  - No change to interviewer/interpreter prompts (ADR-002)
  - Defensive CSS min-height adjustments (ADR-003)
- [ ] `CHANGELOG.md` updated with Batch 1 changes

---

## Appendix: Files to Modify (Summary)

| File | Change Type | Lines |
|------|-------------|-------|
| `engine/reading/drawer.py` | Edit (type hint, exception handling) | ~5 lines |
| `static/js/tarot.js` | Delete (remove duplicate functions) | ~23 lines (1149–1171) |
| `static/css/tarot.css` | Edit (defensive min-height/margin) | ~3 lines |
| `docs/DECISIONS.md` | Append (3 ADRs) | ~30 lines |
| `CHANGELOG.md` | Append (Batch 1 entry) | ~10 lines |

**Total**: 3 source files + 2 docs files. No new dependencies. No structural refactors.