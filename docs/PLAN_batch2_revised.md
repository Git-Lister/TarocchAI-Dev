# TarocchAI Batch 2 Upgrades — Revised Execution Plan

> **Status**: PLAN ONLY — Do not execute until reviewed  
> **Date**: 2026-09-13  
> **Branch**: main (verified against working copy, post-Batch-1)  
> **Supersedes**: `docs/PLAN_batch2.md`

---

## 1. Verification of Current State (Re-confirmed)

| Claim | Verdict | Evidence |
|-------|---------|----------|
| **A** Card lifecycle incoherent: `spreadAndReveal` clears `deckArea` and creates fresh cards | **CONFIRMED** | Line 467: `deckArea.innerHTML = ''` — destroys 78 fanned cards |
| **B** Fan overlaps `.madame-area` and `.candle-section` at 1920×1080 | **CONFIRMED** | Math: 78 cards ÷ 8 cols = 10 rows × 18px spacing = 180px from center. Card height at clamp(80,12vw,150) × 1.55 × 0.85 scale ≈ 171px. Total ≈ 351px > 25vh (270px at 1080p) |
| **C** Intake skips reflection on 1-word reply ("bread") | **UNCERTAIN** | Root cause unknown. `_generate_reflection()` only called on final turn (line 82-83). Early turns rely on LLM to embed reflection in reply. **Diagnostic needed first.** |
| **D** Parroting risk in system prompt | **FALSE** | `git grep` — no "echo" in `interviewer.py`. Dynamic prompt (line 113) correctly says "Do not parrot." |
| **E** Dead code: `splitReadingIntoSections` / `showReadingSections` never called | **CONFIRMED** | `git grep` — only definitions at lines 1001, 1042. Zero call sites. |

---

## 2. Revised Proposed Changes

### Group E — Dead code removal (`static/js/tarot.js`) — **Do FIRST**
**File**: `static/js/tarot.js`  
**Lines to delete**: 1001–1110 (`splitReadingIntoSections` + `showReadingSections`)  
**Effect**: Removes ~110 lines of abandoned section-based reading logic.

---

### Group C — Intake reflection: Diagnostic FIRST, then fix
**File**: `static/js/tarot.js` (diagnostic) → `engine/intake/interviewer.py` (fix)  

**Problem**: We don't know why reflection was skipped. Two hypotheses:
1. Backend returned empty/missing `reply` field
2. Backend returned reply but it contained no discernible reflection

**Step C1 — Diagnostic (execute first, before any fix)**  
Add two console logs to `sendUserMessage` in `tarot.js`:

```javascript
// Line 887-888: before fetch
async function sendUserMessage(message) {
    console.log('📨 Sending user message:', message);  // NEW
    try {
        const response = await fetch('/api/intake/turn', {
            // ... existing code ...
        });
        const data = await response.json();
        console.log('📨 Raw reply from backend:', data);  // NEW
        // ... rest unchanged ...
```

**Step C2 — Manual re-test**  
Run `python app.py`, complete intake with 1-word replies. Check console for:
- `data.reply` content
- Whether `data.is_complete` is false on early turns
- Whether `data.reply` contains reflection-like text

**Step C3 — Fix (after diagnostic confirms root cause)**

**Option A (current plan — two LLM calls per turn, guaranteed reflection):**
```python
# In conversation_turn, lines 75-118:
async def conversation_turn(self, user_message: str) -> str:
    if self.is_complete:
        return "I've already heard enough. Let's look at the cards."

    self.history.append({"role": "user", "content": user_message})
    self.turn_count += 1

    # ALWAYS generate a reflection first
    reflection = await self._generate_reflection(user_message)
    self.history.append({"role": "assistant", "content": reflection})

    if self.turn_count >= self.max_turns:
        conclusion_prompt = (
            "Conclude the intake. Say: 'I've heard enough. Let's look at the cards.' "
            "Then write the situational sketch after the delimiter '---SITUATIONAL SKETCH---'."
        )
        self.history.append({"role": "user", "content": conclusion_prompt})
        response = await self._get_response()

        match = re.split(
            r"---\s*SITUATIONAL\s*SKETCH\s*---",
            response, maxsplit=1, flags=re.IGNORECASE,
        )
        if len(match) == 2:
            closing_words = match[0].strip()
            self.situational_sketch = match[1].strip()
        else:
            closing_words = "I've heard enough. Let's look at the cards."
            self.situational_sketch = response.strip()

        self.history.append({"role": "assistant", "content": closing_words})
        self.is_complete = True
        # FIX double-ellipsis: trim trailing ... from reflection
        reflection_clean = reflection.rstrip('.').rstrip()
        return f"{reflection_clean}. {closing_words}"
    else:
        # Single combined prompt: reflection + question in ONE call
        self.history.append(
            {
                "role": "user",
                "content": (
                    "Reflect briefly on what they just said — one sentence, "
                    "in your own voice, insightful but not rude. "
                    "Then ask a simple question that invites them to go deeper. "
                    "Keep it warm and unhurried. Let the silence do its work. "
                    "Do not parrot their words. Mutters are fine."
                ),
            }
        )
        response = await self._get_response()
        self.history.append({"role": "assistant", "content": response})
        # Combine: reflection (already spoken) + response
        reflection_clean = reflection.rstrip('.').rstrip()
        return f"{reflection_clean}. {response}"
```

**Option B (single LLM call — lower latency, relies on prompt):**
```python
# In conversation_turn, lines 75-118:
async def conversation_turn(self, user_message: str) -> str:
    if self.is_complete:
        return "I've already heard enough. Let's look at the cards."

    self.history.append({"role": "user", "content": user_message})
    self.turn_count += 1

    if self.turn_count >= self.max_turns:
        # Final turn: reflection + conclusion (two calls as before)
        reflection = await self._generate_reflection(user_message)
        self.history.append({"role": "assistant", "content": reflection})
        # ... conclusion logic unchanged ...
        return f"{reflection.rstrip('.')}. {closing_words}"
    else:
        # Non-final turn: single call with combined prompt
        self.history.append(
            {
                "role": "user",
                "content": (
                    "The querent just said: " + user_message + "\n\n"
                    "Respond in two parts:\n"
                    "1. A brief reflection — one sentence, in your voice, "
                    "insightful but not rude. If their message was very short, "
                    "just acknowledge it. Keep it under 15 words. End with a period.\n"
                    "2. Then, a simple question that invites them to go deeper. "
                    "Warm, unhurried, no parroting. Mutters are fine.\n\n"
                    "Format: [reflection] [question]"
                ),
            }
        )
        response = await self._get_response()
        self.history.append({"role": "assistant", "content": response})
        return response
```

**Tradeoff**: Option A = guaranteed reflection (separate call), ~2× latency on non-final turns. Option B = single call, but reflection quality depends on prompt adherence.  
**Recommendation**: Start with **Option B** (simpler, lower latency). If manual test shows weak reflections, fall back to Option A in a follow-up.

---

### Group B — Layout containment (`static/css/tarot.css` + `static/js/tarot.js`)

**Math for proper fit at 1920×1080 (25vh = 270px available):**

| Parameter | Current | Proposed | Effect |
|-----------|---------|----------|--------|
| Columns | 8 | **12** | 78 ÷ 12 = 7 rows (was 10) |
| `spacingY` | 18px | **10px** | Vertical spread = 6 × 10 = 60px from center = 120px total |
| `--card-width` | clamp(80,12vw,150) | **clamp(60,8vw,100)** | Card height = 100 × 1.55 = 155px × 0.85 = 132px |
| `.cards-section` min-height | 25vh | **25vh** (unchanged) | 270px available |
| **Total vertical** | ~351px | **~252px** | **Fits in 270px** |

**CSS diffs (exact line numbers from current file):**

```css
/* Line 15-18: :root variables */
:root {
    --card-width: clamp(60px, 8vw, 100px);        /* was 80/12vw/150 */
    --card-height: calc(var(--card-width) * 1.55);
    --reveal-card-width: clamp(120px, 18vw, 220px);
    --reveal-card-height: calc(var(--reveal-card-width) * 1.55);
    --card-back-image: url('/static/img/card_back.png');
}

/* Line 335-344: .deck-area — add overflow clipping */
.deck-area {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3;
    pointer-events: none;
    overflow: hidden;  /* NEW */
}

/* Line 235-247: .madame-area — raise z-index */
.madame-area {
    flex: 0 0 auto;
    width: 100%;
    max-height: 30vh;
    min-height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 0.2rem 0.5rem;
    z-index: 10;  /* was 5 */
    transition: all 0.8s ease;
    overflow: hidden;
}

/* Line 485-494: .candle-section — raise z-index */
.candle-section {
    flex: 0.5;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 10vh;
    margin-top: 1rem;
    position: relative;
    z-index: 10;  /* NEW */
}
```

**JS diff — `fanCards()` (lines 382-404):**

```javascript
function fanCards() {
    const total = cards.length;
    const columns = 12;           // was 8
    const rows = Math.ceil(total / columns);
    const spacingX = 14;
    const spacingY = 10;          // was 18
    const startX = -(columns - 1) * spacingX / 2;
    const startY = -(rows - 1) * spacingY / 2;

    cards.forEach((card, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = startX + col * spacingX;
        const y = startY + row * spacingY;
        const rot = (col - columns / 2) * 0.6 + (row - rows / 2) * 0.2;  // reduced rotation
        const delay = i * 8;      // was 10
        setTimeout(() => {
            card.style.transform =
                `translate(${x}px, ${y}px) rotate(${rot}deg) scale(0.85)`;
            card.style.opacity = '0.6';
        }, delay);
    });
}
```

**Responsive overrides (lines 637-659) — update to match:**

```css
@media (max-width: 768px) {
    :root {
        --card-width: clamp(45px, 15vw, 80px);      /* was 50/18vw/100 */
        --reveal-card-width: clamp(80px, 20vw, 150px);
    }
    /* ... rest unchanged ... */
}
@media (max-width: 480px) {
    :root {
        --card-width: clamp(35px, 18vw, 60px);      /* was 40/22vw/70 */
        --reveal-card-width: clamp(60px, 25vw, 120px);
    }
    /* ... rest unchanged ... */
}
```

---

### Group A — Card lifecycle restructure (`static/js/tarot.js`)

**File structure after Group E deletion:**  
Lines 1–1000 contain all active code. `spreadAndReveal` ends at line 603. `flipCard` starts at line 605.

**Insertion point for `dealFromDeck`:**  
After `shuffleCards` (ends ~line 456), before `spreadAndReveal` (starts ~line 461). After deleting `spreadAndReveal` (lines 461–603), `dealFromDeck` goes in its place (~line 461).

**1. Replace `shuffleCards()` (lines 409–456) → new version that forms a single stack:**

```javascript
// --------------------------------------------------------------
// Shuffle Animation — Converge to Single Stack
// --------------------------------------------------------------
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
                card.style.transform =
                    `translate(${centerX}px, ${centerY}px) rotate(${Math.random() * 2 - 1}deg) scale(0.7)`;
                card.style.opacity = '0.8';
                card.style.zIndex = i;
            }, delay);
        });

        // Phase 3: Callback when stack formed
        setTimeout(() => {
            if (callback) callback();
        }, total * 2 + 500);
    }, duration + 300);
}
```

**2. Delete `spreadAndReveal()` entirely (lines 461–603)**

**3. Insert `dealFromDeck()` in its place (at ~line 461):**

```javascript
// --------------------------------------------------------------
// Deal From Deck — Replaces spreadAndReveal
// --------------------------------------------------------------
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
    const dealtCards = cards.slice(-3);      // Top 3 from stack
    const remainingCards = cards.slice(0, -3);

    // Fade out remaining 75 cards
    remainingCards.forEach((card, i) => {
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.3)';
        }, i * 5);
    });

    // Update the 3 dealt cards in place — NO innerHTML rebuild
    dealtCards.forEach((cardEl, index) => {
        const card = spreadData[index].card;
        const pos = positions[index];
        const imagePath = spreadData[index].image_path || `/static/img/cards/default.png`;

        // Convert existing .card to .reveal-card
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

        // UPDATE front image only — keep .card-back (CSS var handles it)
        const front = cardEl.querySelector('.card-front');
        const img = front ? front.querySelector('img') : null;
        if (img) {
            img.src = imagePath;
            img.alt = card.name;
            img.style.display = 'block';
            // Remove any fallback text
            const fallback = front.querySelector('div');
            if (fallback) fallback.remove();
        } else if (front) {
            // Create img if missing (shouldn't happen but safe)
            const newImg = document.createElement('img');
            newImg.src = imagePath;
            newImg.alt = card.name;
            newImg.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: block;';
            newImg.onerror = function() {
                this.style.display = 'none';
                const fb = document.createElement('div');
                fb.textContent = card.name;
                fb.style.cssText = 'width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; font-family: Cinzel, serif; font-size: 0.8rem; color: #d4af37; text-align: center; padding: 0.5rem;';
                front.appendChild(fb);
            };
            front.appendChild(newImg);
        }

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

**4. Update `startReading()` (lines 962–991) to call new sequence:**

```javascript
// Line ~962: after dimCandle() and before shuffleCards
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

---

## 3. Additional Issues Noticed on Second Reading

| Issue | Location | Severity |
|-------|----------|----------|
| `fanCards` rotation formula uses `columns/2` and `rows/2` — with 12 cols/7 rows, rotation range increases slightly | `tarot.js:396` | Low — reduced rotation multiplier in revised diff |
| `shuffleCards` old version hid 75 cards before callback; new version keeps all visible until `dealFromDeck` | Logic change | Intentional — fixes the "story" |
| `dealFromDeck` assumes `cards` array order = stack order (last 3 = top) | `tarot.js:299` | Correct — `shuffleCards` sets `zIndex = i` so last cards are on top |
| `highlightCard` uses `.card.reveal-card` selector — `dealFromDeck` sets `className = 'card reveal-card'` | Compatible | Verified |

---

## 4. Updated Execution Order

1. **Group E** — Delete `splitReadingIntoSections` + `showReadingSections` (lines 1001–1110)
2. **Group C — Step C1** — Add diagnostic logs to `sendUserMessage` in `tarot.js`
3. **Manual diagnostic test** — Run `python app.py`, test 1-word replies, check console
4. **Group C — Step C3** — Apply Option B fix to `interviewer.py` (single-call combined prompt)
5. **Group B** — CSS containment + `fanCards` parameter changes
6. **Group A** — Card lifecycle: replace `shuffleCards`, delete `spreadAndReveal`, insert `dealFromDeck`, update `startReading`
7. **Manual end-to-end test** — Full session at 1920, 1366, 768, 375px

---

## 5. Updated Definition of Done

### Automated
- [ ] `git grep -c "function spreadAndReveal" static/js/tarot.js` returns `0`
- [ ] `git grep -c "splitReadingIntoSections" static/js/tarot.js` returns `0`
- [ ] `git grep -c "showReadingSections" static/js/tarot.js` returns `0`
- [ ] `python -c "from engine.intake.interviewer import IntakeInterviewer; print('import ok')"`

### Diagnostic (Step C1+C2)
- [ ] Console shows `📨 Sending user message: <text>` on each turn
- [ ] Console shows `📨 Raw reply from backend: {reply: "...", is_complete: false, ...}`
- [ ] On 1-word reply: `data.reply` contains non-empty text

### Manual (full session)
- [ ] All 78 cards visible fanned on room entry (1920, 1366, 768, 375px)
- [ ] Fan fits in `.cards-section` — no overlap with Madame/candle
- [ ] Cards shuffle → single centered stack
- [ ] 3 cards deal off top to Past/Present/Future
- [ ] Remaining 75 fade away
- [ ] 3 dealt cards flip one by one
- [ ] Every intake turn produces audible reflection (not verbatim parrot)
- [ ] Reading weaves cards into single narrative (no position announcements)

---

## 6. Revised Summary Table

| File | Group | Change Type | Approx. Lines |
|------|-------|-------------|---------------|
| `static/js/tarot.js` | E | Delete dead code | -110 |
| `static/js/tarot.js` | C1 | Add 2 console logs | +2 |
| `engine/intake/interviewer.py` | C3 | Rewrite `conversation_turn` (Option B) | ~30 |
| `static/css/tarot.css` | B | 4 targeted edits | ~15 |
| `static/js/tarot.js` | B | `fanCards` params + responsive | ~10 |
| `static/js/tarot.js` | A | Replace `shuffleCards` | ~30 |
| `static/js/tarot.js` | A | Delete `spreadAndReveal` | -143 |
| `static/js/tarot.js` | A | Insert `dealFromDeck` | +120 |
| `static/js/tarot.js` | A | Update `startReading` | ~10 |
| `docs/DECISIONS.md` | — | 3 ADRs (diagnostic, reflection, layout) | ~60 |
| `CHANGELOG.md` | — | Batch 2 entry | ~15 |
| **Total** | | **3 source + 2 docs** | **Net ~0 JS, +15 CSS, +30 Python** |

---

## 7. ADR Placeholders for `docs/DECISIONS.md`

**ADR-004**: Diagnostic-first approach for intake reflection — added logging before fix to confirm root cause.  
**ADR-005**: Single-call combined prompt (Option B) for non-final intake turns — lower latency, relies on prompt adherence.  
**ADR-006**: Fan layout math — 12 columns × 10px spacingY × clamp(60,8vw,100) cards fits 25vh at 1080p.  
**ADR-007**: Card lifecycle coherence — `dealFromDeck` reuses existing DOM elements, updates front image only.

---

*End of revised plan. Ready for review.*