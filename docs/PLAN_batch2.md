# TarocchAI Batch 2 Upgrades — Execution Plan

> **Status**: PLAN ONLY — Do not execute until reviewed  
> **Date**: 2026-09-13  
> **Branch**: main (verified against working copy, post-Batch-1)

---

## 1. Verification of Current State

| Claim | Verdict | Evidence |
|-------|---------|----------|
| **A** Card lifecycle incoherent: `createCards` → `fanCards` → `shuffleCards` → `spreadAndReveal` clears deckArea and creates fresh cards | **CONFIRMED** | `spreadAndReveal` line 467: `deckArea.innerHTML = ''` — destroys all 78 fanned cards and creates 3 new `.reveal-card` elements from scratch |
| **B** Fan overlaps `.madame-area` and `.candle-section` at 1920px | **CONFIRMED** | `.cards-section` has `min-height: 25vh` but `.card` elements are absolutely positioned (line 405) with no overflow containment; `fanCards` calculates positions up to ~10 rows × 18px spacing = 180px from center, exceeding 25vh at large viewports |
| **C** Intake skips reflection on 1-word reply ("bread") | **CONFIRMED (root cause identified)** | In `interviewer.py`, `_generate_reflection()` is ONLY called when `turn_count >= max_turns` (line 82-83). On turns 1..max_turns-1, the dynamic prompt (line 113) asks the LLM to "reflect... then ask a question" but the LLM may produce minimal/no reflection for very short inputs. The reflection is not guaranteed. |
| **D** Parroting risk: system prompt says "You echo their words back to them" | **FALSE** | `git grep` returns **no matches** for "You echo their words" or "echo" in `interviewer.py`. The system prompt (lines 8-35) has NO such phrase. Only the dynamic prompt (line 113) says "Do not parrot their words back verbatim." — this is correct guidance, not a contradiction. |
| **E** Dead code: `splitReadingIntoSections` / `showReadingSections` defined but never called | **CONFIRMED** | `git grep` returns only the two function definitions (lines 1001, 1042). Zero call sites anywhere in the codebase. Safe to remove. |

### Key grep outputs
```bash
# Card lifecycle functions
git grep -n "function createCards" static/js/tarot.js
# static/js/tarot.js:365

git grep -n "function fanCards" static/js/tarot.js
# static/js/tarot.js:382

git grep -n "function shuffleCards" static/js/tarot.js
# static/js/tarot.js:409

git grep -n "function spreadAndReveal" static/js/tarot.js
# static/js/tarot.js:461

# Dead code
git grep -n "splitReadingIntoSections" static/js/tarot.js
# static/js/tarot.js:1001:function splitReadingIntoSections(text) {

git grep -n "showReadingSections" static/js/tarot.js
# static/js/tarot.js:1042:function showReadingSections(sections) {

git grep -n "splitReadingIntoSections\|showReadingSections" static/js/tarot.js
# Only the two definitions above — NO call sites

# Parroting check
git grep -n "You echo their words" engine/intake/interviewer.py
# (no output)

git grep -n "Do not parrot" engine/intake/interviewer.py
# engine/intake/interviewer.py:113: "Do not parrot their words back verbatim. Mutters are fine..."

git grep -n "echo" engine/intake/interviewer.py
# (no output)
```

### Root cause for Claim C (short-reply reflection failure)
The `conversation_turn` method in `interviewer.py`:
- **Turns 1 to max_turns-1** (line 109-118): Adds a dynamic prompt asking LLM to "reflect... then ask a question" → LLM response becomes Madame's reply. **No separate reflection step.**
- **Turn max_turns** (line 82-108): Calls `_generate_reflection()` explicitly, then concludes.

For a 1-word reply on turn 1 (with max_turns ≥ 3), the LLM receives the dynamic prompt but may output only a question with negligible reflection. The user perceives this as "no reflection — straight to cards" because the next turn might immediately hit max_turns (if max_turns=3 and user replies again) or the LLM's response is too minimal.

---

## 2. Proposed Changes

### Group E — Dead code removal (`static/js/tarot.js`) — **Do FIRST**
**File**: `static/js/tarot.js`  
**Lines to delete**: 1001–1110 (`splitReadingIntoSections` + `showReadingSections`)  
**Verification**: `git grep` confirms zero callers.  
**Effect**: Removes ~110 lines of abandoned section-based reading logic.

---

### Group D — Not needed (claim false)
**Action**: No change. The parroting instruction does not exist in the system prompt. The dynamic prompt correctly says "Do not parrot."

---

### Group C — Intake reflection guarantee (`engine/intake/interviewer.py`)
**File**: `engine/intake/interviewer.py`  
**Problem**: Reflection only guaranteed on final turn. Short replies on early turns get minimal reflection.

**Proposed fix**: Ensure a reflection is **always** generated before Madame's reply, on every turn. Minimal change:

```python
# In conversation_turn, after appending user message (line 79-80):
self.history.append({"role": "user", "content": user_message})
self.turn_count += 1

# NEW: Always generate a brief reflection first
reflection = await self._generate_reflection(user_message)
self.history.append({"role": "assistant", "content": reflection})

# Then decide: conclude or continue
if self.turn_count >= self.max_turns:
    # ... existing conclusion logic (but skip duplicate reflection)
else:
    # ... existing continue logic (but skip duplicate reflection generation)
```

**More precise diff** (preserving turn count logic):
```python
async def conversation_turn(self, user_message: str) -> str:
    if self.is_complete:
        return "I've already heard enough. Let's look at the cards."

    self.history.append({"role": "user", "content": user_message})
    self.turn_count += 1

    # ALWAYS generate a reflection on the user's message
    reflection = await self._generate_reflection(user_message)
    self.history.append({"role": "assistant", "content": reflection})

    if self.turn_count >= self.max_turns:
        # Final turn: conclude after reflection
        conclusion_prompt = (
            "Conclude the intake. Say: 'I've heard enough. Let's look at the cards.' "
            "Then write the situational sketch after the delimiter '---SITUATIONAL SKETCH---'."
        )
        self.history.append({"role": "user", "content": conclusion_prompt})
        response = await self._get_response()

        match = re.split(
            r"---\s*SITUATIONAL\s*SKETCH\s*---",
            response,
            maxsplit=1,
            flags=re.IGNORECASE,
        )
        if len(match) == 2:
            closing_words = match[0].strip()
            self.situational_sketch = match[1].strip()
        else:
            closing_words = "I've heard enough. Let's look at the cards."
            self.situational_sketch = response.strip()

        self.history.append({"role": "assistant", "content": closing_words})
        self.is_complete = True
        return f"{reflection}... {closing_words}"
    else:
        # Continue: ask a follow-up question
        self.history.append(
            {
                "role": "user",
                "content": "Continue the intake naturally. Ask a simple question that invites them to go deeper. Keep it warm and unhurried. Let the silence do its work.",
            }
        )
        response = await self._get_response()
        self.history.append({"role": "assistant", "content": response})
        return f"{reflection}... {response}"
```

**Effect**: Every user message gets a guaranteed reflection (via `_generate_reflection`), then either a closing or a follow-up question. The reflection is spoken first, then the question/closing.

---

### Group B — Layout containment (`static/css/tarot.css`)
**File**: `static/css/tarot.css`  
**Problem**: Absolutely positioned `.card` elements in `.deck-area` escape `.cards-section` bounds.

**Proposed changes**:
1. Add `overflow: hidden` to `.deck-area` (line 335-344) to clip cards to the section
2. Add `z-index` layering to ensure `.madame-area` (z-index: 5) and `.candle-section` sit above cards
3. Reduce `--card-width` slightly and/or adjust `fanCards` spacing to fit 8 columns within 25vh

**Exact diffs**:
```css
/* Line 335-344: .deck-area */
.deck-area {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3;
    pointer-events: none;
    overflow: hidden;  /* NEW: clip cards to section bounds */
}

/* Line 235-247: .madame-area — ensure it's above cards */
.madame-area {
    flex: 0 0 auto;
    width: 100%;
    max-height: 30vh;
    min-height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 0.2rem 0.5rem;
    z-index: 10;  /* CHANGED from 5 to 10 */
    transition: all 0.8s ease;
    overflow: hidden;
}

/* Line 485-494: .candle-section — ensure above cards */
.candle-section {
    flex: 0.5;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 10vh;
    margin-top: 1rem;
    position: relative;
    z-index: 10;  /* NEW: above cards */
}

/* Line 15-18: Reduce card size slightly for better fit */
:root {
    --card-width: clamp(70px, 10vw, 130px);  /* was 80px/12vw/150px */
    --card-height: calc(var(--card-width) * 1.55);
    --reveal-card-width: clamp(120px, 18vw, 220px);
    --reveal-card-height: calc(var(--reveal-card-width) * 1.55);
    --card-back-image: url('/static/img/card_back.png');
}
```

**Effect**: Cards visually contained within `.cards-section`; text and candle never overlapped.

---

### Group A — Card lifecycle restructure (`static/js/tarot.js`)
**File**: `static/js/tarot.js`  
**Goal**: Coherent narrative: 78 cards fan → shuffle to single stack → deal 3 off top → remaining deck fades → 3 dealt cards flip.

**Strategy**: 
- Keep `createCards()` and `fanCards()` as-is (initial state)
- Rewrite `shuffleCards()` to animate all 78 cards into a **single centered stack** (not hide 75)
- Replace `spreadAndReveal()` with `dealFromDeck(spreadData, callback)` that:
  - Takes the top 3 cards from the `cards` array
  - Animates them to Past/Present/Future positions
  - Fades out the remaining 75 cards
  - Flips the 3 dealt cards in sequence
- Update `startReading()` to call the new sequence

**Detailed diffs**:

#### 1. Rewrite `shuffleCards()` (lines 409-456)
```javascript
function shuffleCards(callback) {
    const total = cards.length;
    const steps = 30;
    const duration = 2500;
    const centerX = 0;
    const centerY = 0;

    // Phase 1: Scatter shuffle
    for (let step = 0; step < steps; step++) {
        setTimeout(() => {
            cards.forEach((card, i) => {
                if (Math.random() > 0.6) {
                    const x = (Math.random() - 0.5) * 300;
                    const y = (Math.random() - 0.5) * 200;
                    const rot = (Math.random() - 0.5) * 60;
                    card.style.transform =
                        `translate(${x}px, ${y}px) rotate(${rot}deg) scale(0.5)`;
                    card.style.opacity = '0.4';
                }
            });
        }, step * 35);
    }

    // Phase 2: Converge to single stack at center
    setTimeout(() => {
        cards.forEach((card, i) => {
            const delay = i * 2;
            setTimeout(() => {
                const stackOffset = i * 0.5;
                card.style.transform =
                    `translate(${centerX}px, ${centerY}px) rotate(${Math.random() * 2 - 1}deg) scale(0.7)`;
                card.style.opacity = '0.8';
                card.style.zIndex = i; // Ensure proper stacking order
            }, delay);
        });

        // Phase 3: Callback when stack formed
        setTimeout(() => {
            if (callback) callback();
        }, total * 2 + 500);
    }, duration + 300);
}
```

#### 2. New `dealFromDeck()` function (replaces `spreadAndReveal`)
```javascript
function dealFromDeck(spreadData, callback) {
    if (!spreadData || spreadData.length === 0) {
        console.error('No spread data provided');
        return;
    }

    const positions = [
        { label: 'Past', offsetX: -180, offsetY: 0, rot: -4 },
        { label: 'Present', offsetX: 0, offsetY: 0, rot: 0 },
        { label: 'Future', offsetX: 180, offsetY: 0, rot: 4 }
    ];

    const cardRefs = [];
    const dealtCards = cards.slice(-3); // Top 3 cards from the stack
    const remainingCards = cards.slice(0, -3);

    // Fade out remaining 75 cards
    remainingCards.forEach((card, i) => {
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.3)';
        }, i * 5);
    });

    // Deal the 3 cards to positions
    dealtCards.forEach((cardEl, index) => {
        const card = spreadData[index].card;
        const pos = positions[index];
        const imagePath = spreadData[index].image_path || `/static/img/cards/default.png`;

        // Update the existing card element to reveal-card style
        cardEl.className = 'card reveal-card';
        cardEl.dataset.cardName = card.name;
        cardEl.style.cssText = `
            position: absolute;
            width: var(--reveal-card-width);
            height: var(--reveal-card-height);
            transform: translate(0, 0) rotate(0deg) scale(0.7);
            opacity: 0.8;
            transition: all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            perspective: 600px;
            transform-style: preserve-3d;
            cursor: default;
            z-index: ${100 + index};
        `;

        // Replace back with reveal-card back (has card-back-image)
        cardEl.innerHTML = '';
        const back = document.createElement('div');
        back.className = 'card-back';
        back.style.cssText = `
            position: absolute; top: 0; left: 0;
            width: 100%; height: 100%;
            backface-visibility: hidden;
            border-radius: 8px;
            display: flex; justify-content: center; align-items: center;
            background-image: var(--card-back-image), repeating-linear-gradient(45deg, transparent 0px, transparent 6px, rgba(184, 155, 75, 0.02) 6px, rgba(184, 155, 75, 0.02) 7px);
            background-size: cover, auto;
            background-blend-mode: overlay;
            background-position: center, auto;
            border: 1px solid rgba(184, 155, 75, 0.15);
        `;

        const front = document.createElement('div');
        front.className = 'card-front';
        front.style.cssText = `
            position: absolute; top: 0; left: 0;
            width: 100%; height: 100%;
            backface-visibility: hidden;
            transform: rotateY(180deg);
            border-radius: 8px;
            overflow: hidden;
            background: #1a1410;
            border: 1px solid rgba(184, 155, 75, 0.1);
            display: flex; justify-content: center; align-items: center;
        `;

        const img = document.createElement('img');
        img.src = imagePath;
        img.alt = card.name;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: block;';
        img.onerror = function() {
            this.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.textContent = card.name;
            fallback.style.cssText = 'width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; font-family: Cinzel, serif; font-size: 0.8rem; color: #d4af37; text-align: center; padding: 0.5rem;';
            front.appendChild(fallback);
        };
        front.appendChild(img);

        cardEl.appendChild(back);
        cardEl.appendChild(front);

        cardRefs.push({
            el: cardEl,
            pos: pos,
            label: pos.label,
            card: card
        });
    });

    // Animate deal: move 3 cards to positions
    setTimeout(() => {
        cardRefs.forEach((item, idx) => {
            setTimeout(() => {
                item.el.style.opacity = '1';
                item.el.style.transform = `translate(${item.pos.offsetX}px, ${item.pos.offsetY}px) rotate(${item.pos.rot}deg) scale(1)`;
                item.el.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6), 0 0 40px rgba(212,175,55,0.1)';
            }, idx * 250);
        });

        // Flip cards one by one
        setTimeout(() => {
            cardRefs.forEach((item, idx) => {
                setTimeout(() => {
                    flipCard(item.el, item.label, item.card);
                }, idx * 800);
            });
        }, cardRefs.length * 250 + 600);

        const totalTime = cardRefs.length * 800 + 2000;
        setTimeout(() => {
            if (callback) callback();
        }, totalTime);
    }, 300);
}
```

#### 3. Delete `spreadAndReveal()` entirely (lines 461-603)
Remove the entire function block.

#### 4. Update `startReading()` (lines 962-991) to call new sequence
```javascript
// 4. Shuffle and deal
shuffleCards(() => {
    brightenCandle();
    speak('Three cards. Past, Present, Future.', () => {
        dealFromDeck(data.spread, () => {
            console.log('📖 Cards dealt and flipped, showing reading');
            setTimeout(() => {
                interactionHint.classList.remove('visible');
                const readingText = data.reading;
                const cleanReading = readingText.replace(/\([^)]*\)/g, '').trim();
                scheduleHighlights(cleanReading);
                expandTextBox();
                startBreathing();
                speak(cleanReading, () => {
                    console.log('📖 Reading spoken');
                    interactionHint.textContent = '— the reading is complete —';
                    interactionHint.classList.add('visible');
                    setTimeout(contractTextBox, 3000);
                });
            }, 600);
        });
    });
});
```

**Effect**: Single coherent card lifecycle. The 78 cards the user sees fanned are the SAME cards that shuffle, stack, and deal. No DOM destruction/recreation.

---

## 3. Risks and Uncertainties

| Risk | Description | Mitigation |
|------|-------------|------------|
| `dealFromDeck` reuses `.card` elements but `highlightCard` expects `.card.reveal-card` with `dataset.cardName` | `dealFromDeck` sets `className = 'card reveal-card'` and `dataset.cardName` — compatible | Verify `highlightCard` selector (line 625: `.card.reveal-card`) matches |
| `shuffleCards` new stack animation timing may feel too fast/slow | Tunable via `steps`, `duration`, `delay` constants | Manual test; adjust in follow-up |
| Reducing `--card-width` (Group B) affects mobile breakpoints | Media queries at 768px/480px override root vars | Test at 1920, 1366, 768, 375px |
| Reflection change (Group C) adds an LLM call per turn | One extra `_generate_reflection` call per turn (already exists on final turn) | Acceptable latency; uses same model |
| `dealFromDeck` modifies `cards` array (slices dealt cards) | Future code referencing `cards` may break | No other code uses `cards` after `startReading` |
| Removing `splitReadingIntoSections` might be called via eval/string | `git grep` shows no references; not in event handlers | Safe |

---

## 4. Execution Order

1. **Group E** — Delete `splitReadingIntoSections` + `showReadingSections` (lines 1001–1110)
2. **Group C** — Modify `conversation_turn` in `interviewer.py` to always generate reflection
3. **Group B** — CSS containment: `overflow: hidden`, z-index fixes, card size reduction
4. **Group A** — Card lifecycle: rewrite `shuffleCards`, add `dealFromDeck`, delete `spreadAndReveal`, update `startReading`
5. **Manual end-to-end test** via `python app.py`

---

## 5. Definition of Done

### Automated
- [ ] `git grep -c "function spreadAndReveal" static/js/tarot.js` returns `0`
- [ ] `git grep -c "splitReadingIntoSections" static/js/tarot.js` returns `0`
- [ ] `git grep -c "showReadingSections" static/js/tarot.js` returns `0`
- [ ] `python -c "from engine.intake.interviewer import IntakeInterviewer; print('import ok')"`

### Manual (run `python app.py`, visit `http://localhost:8080`, complete full session)
- [ ] All 78 cards visible fanned across table on room entry (1920px, 1366px, 768px, 375px)
- [ ] Fan fits entirely inside `.cards-section` — no overlap with Madame's text or candle
- [ ] Cards shuffle into single visible stack at center
- [ ] 3 cards deal off top to Past/Present/Future positions
- [ ] Remaining 75 cards fade away
- [ ] 3 dealt cards flip one by one
- [ ] Every intake turn (including 1-word replies) produces a visible/audible reflection before Madame's question/closing
- [ ] Reflection does NOT repeat user's exact words verbatim
- [ ] Reading weaves cards into single narrative (no position announcements)

---

## Appendix: Files to Modify

| File | Change Type | Approx. Lines |
|------|-------------|---------------|
| `static/js/tarot.js` | Delete (Group E) + Rewrite (Group A) | -110 (del) + ~120 (new) = ~10 net |
| `engine/intake/interviewer.py` | Edit (Group C) | ~30 lines changed |
| `static/css/tarot.css` | Edit (Group B) | ~10 lines changed |
| `docs/DECISIONS.md` | Append (2 ADRs) | ~50 lines |
| `CHANGELOG.md` | Append | ~15 lines |

**Total**: 3 source files + 2 docs files. No new dependencies.