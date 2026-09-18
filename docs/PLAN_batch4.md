# TarocchAI Batch 4 — Layout Rebuild (Execution Plan)

> **Status**: PLAN ONLY — Do not execute until reviewed  
> **Date**: 2026-09-15  
> **Branch**: main (verified against working copy)

---

## 1. Verification of Current State

| Claim | Verdict | Evidence |
|-------|---------|----------|
| `fanCards()` uses `columns = 12` | **CONFIRMED** | `git grep -n "columns = " static/js/tarot.js` → line 388: `const columns = 12;` |
| Layout uses flexbox on `.table` | **CONFIRMED** | `.table` has `display: flex; flex-direction: column; justify-content: flex-start` (lines 148-150) |
| `.madame-area` has fixed `max-height: 30vh` | **CONFIRMED** | Line 238: `max-height: 30vh`; responsive overrides at 768px (30vh), 480px (25vh) |
| `.voice-area` has `overflow-y: auto` | **CONFIRMED** | Line 260: `overflow-y: auto` (causes scrollbar wobble) |
| `.deck-area` has `overflow: hidden` | **CONFIRMED** | Line 344: `overflow: hidden` (but cards are absolutely positioned) |
| `.candle-section` uses `flex: 0 0 auto` | **CONFIRMED** | Line 487: `flex: 0 0 auto; min-height: 12vh` |
| `.user-section` uses `flex: 0 0 auto` | **CONFIRMED** | Line 582: `flex: 0 0 auto; min-height: 60px` |
| User + Madame messages share `#voice-text` | **CONFIRMED** | `addUserSentence()` appends to `voiceArea` (line 349); `speak()` uses same `voiceArea` |
| HTML structure: madame → cards → candle → user | **CONFIRMED** | `index.html` lines 38-79: `.madame-area` → `.cards-section` → `.candle-section` → `.user-section` |
| Fan renders ~5 cols × 15 rows (not 12 cols) | **UNCERTAIN — likely CSS layout issue** | Code says 12 cols, but absolute positioning + flex container may not constrain; `overflow: hidden` on `.deck-area` may not clip because `.cards-section` is flex: 1.5 with `min-height: 25vh` but cards positioned relative to `deck-area` |

### Critical discrepancy analysis (fan columns)

The code at `tarot.js:388` explicitly sets `const columns = 12`. However, the manual test shows a tall narrow fan (~5 columns × 15 rows). 

**Root cause hypothesis**: The `.cards-section` is a flex item with `flex: 1.5` and `min-height: 25vh`. The `.deck-area` inside it has `overflow: hidden` but `height: 100%`. When cards are absolutely positioned with `translate(x, y)`, they can escape the visual bounds if the flex item's height is larger than the viewport allows, or if the flex container doesn't enforce the height. The flex container `.table` uses `justify-content: flex-start` which stacks from top, but `flex: 1.5` on `.cards-section` means it takes remaining space — potentially pushing the fan down and making it render taller than intended.

**Additional factor**: The `.voice-area` has `height: 100%` of `.madame-area` and `overflow-y: auto`. The scrollbar appears/disappears on each sentence, causing visual wobble.

---

## 2. Proposed Changes

### Group A — HTML Restructuring (`static/index.html`)

**Goal**: Separate user messages from Madame's messages into distinct containers.

**Current structure** (lines 24-80):
```html
<div class="table" id="table">
    <div class="name-gate" id="name-gate">...</div>
    <div class="madame-area" id="madame-area">
        <div class="voice-area" id="voice-text"></div>
    </div>
    <div class="cards-section">
        <div class="breathing-presence" id="breathing-presence"></div>
        <div class="deck-area" id="deck-area"></div>
    </div>
    <div class="candle-section">
        <div class="candle-container" id="candle-container">...</div>
    </div>
    <div class="user-section">
        <div class="input-bar" id="user-input-area">...</div>
        <div class="interaction-hint" id="interaction-hint">...</div>
    </div>
</div>
```

**Proposed structure** (only the `<body>` content shown):
```html
<body>
    <div id="scene">
        <div id="candle-light"></div>

        <!-- Threshold (unchanged) -->
        <div id="threshold">
            <div class="sigil">✦</div>
            <div class="wait-text">Silence gathers...</div>
        </div>

        <!-- Room (unchanged) -->
        <div id="room">
            <div class="table" id="table">
                <!-- Name Gate (unchanged) -->
                <div class="name-gate" id="name-gate">
                    <div class="name-gate-text">"By what name shall I know you?"</div>
                    <div class="name-gate-input-area">
                        <input type="text" id="name-input" placeholder="..." />
                        <span class="name-gate-arrow">↵</span>
                    </div>
                </div>

                <!-- TOP: Madame's text only -->
                <div class="madame-area" id="madame-area">
                    <div class="voice-area" id="voice-text">
                        <!-- Madame's sentences injected by JS -->
                    </div>
                </div>

                <!-- MIDDLE: Cards + Breathing Presence -->
                <div class="cards-section">
                    <div class="breathing-presence" id="breathing-presence"></div>
                    <div class="deck-area" id="deck-area"></div>
                </div>

                <!-- CANDLE (below cards) -->
                <div class="candle-section">
                    <div class="candle-container" id="candle-container">
                        <div class="candle-flame" id="flame"></div>
                        <div class="candle-wick"></div>
                        <div class="candle-body"></div>
                    </div>
                </div>

                <!-- BOTTOM: User messages + Input -->
                <div class="user-area">
                    <div class="user-messages" id="user-messages">
                        <!-- User sentences injected by JS -->
                    </div>
                    <div class="user-input-wrapper">
                        <div class="input-bar" id="user-input-area">
                            <input type="text" id="user-input" placeholder="..." />
                            <span class="input-arrow">↵</span>
                        </div>
                        <div class="interaction-hint" id="interaction-hint">
                            — speak when you are ready —
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
```

**Key changes**:
1. `.user-section` → `.user-area` (contains two children)
2. New `.user-messages` (#user-messages) — separate container for user sentences
3. `.user-input-wrapper` groups input bar + hint
4. All existing IDs preserved for JS compatibility

---

### Group B — Layout CSS Rebuild (`static/css/tarot.css`)

**Goal**: Replace flexbox with CSS Grid on `.table` for deterministic, non-overlapping sections.

**Current `.table` (lines 139-157)**:
```css
.table {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    height: 82vh;
    width: 90vw;
    padding: 0.5rem 1rem;
}
```

**Proposed `.table`**:
```css
.table {
    display: grid;
    grid-template-rows: 
        minmax(80px, 28vh)    /* Row 1: madame-area (content-sized, capped) */
        minmax(0, 1fr)        /* Row 2: cards-section (fills remaining) */
        auto                  /* Row 3: candle-section (content-sized) */
        auto;                 /* Row 4: user-area (content-sized) */
    height: 82vh;
    width: 90vw;
    max-width: 95vw;
    max-height: 90vh;
    gap: 0;
    overflow: hidden;         /* Nothing escapes the table */
    align-items: start;       /* Align items to top of each grid cell */
    justify-items: center;    /* Center horizontally */
    padding: 0.5rem 1rem;
    box-sizing: border-box;
}
```

**Section styles** (replace existing):

```css
/* ---------- Madame's Area (Top) ---------- */
.madame-area {
    width: 100%;
    max-height: 28vh;        /* Cap at 28vh */
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 0.2rem 0.5rem;
    z-index: 10;
    transition: all 0.8s ease;
    overflow: hidden;
    box-sizing: border-box;
}

.voice-area {
    width: 100%;
    /* Height auto — sized by content, constrained by .madame-area */
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 0.15rem;
    padding: 0.2rem 0.5rem;
    pointer-events: none;
    transition: all 0.8s ease;
    border-radius: 8px;
    overflow-y: auto;
    scrollbar-gutter: stable;  /* Prevents scrollbar wobble */
    scrollbar-width: thin;
    scrollbar-color: rgba(184, 155, 75, 0.1) transparent;
    flex-shrink: 1;
    box-sizing: border-box;
}

/* ---------- Cards Section (Middle) ---------- */
.cards-section {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;        /* Clip cards at section boundary */
    box-sizing: border-box;
}

.deck-area {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3;
    pointer-events: none;
    overflow: hidden;
    box-sizing: border-box;
}

/* ---------- Candle Section (Below Cards) ---------- */
.candle-section {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    min-height: 12vh;
    position: relative;
    z-index: 10;
    padding-bottom: 0.5rem;
    box-sizing: border-box;
}

/* ---------- User Area (Bottom) ---------- */
.user-area {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 1rem 0.5rem;
    box-sizing: border-box;
}

.user-messages {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-end;  /* Right-align user messages */
    gap: 0.15rem;
    padding: 0.2rem 0.5rem;
    max-height: 10vh;
    overflow-y: auto;
    scrollbar-gutter: stable;
    scrollbar-width: thin;
    scrollbar-color: rgba(184, 155, 75, 0.1) transparent;
    box-sizing: border-box;
}

.user-input-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    box-sizing: border-box;
}

/* Move existing .input-bar, .interaction-hint, .user-sentence styles 
   to work with .user-messages instead of .voice-area */

/* ---------- Responsive overrides ---------- */
@media (max-width: 768px) {
    :root {
        --card-width: clamp(45px, 15vw, 80px);
        --reveal-card-width: clamp(80px, 20vw, 150px);
    }
    .table { padding: 0.5rem; }
    .madame-area { max-height: 30vh; }
    .voice-area { font-size: clamp(0.8rem, 2vw, 1.2rem); }
    .user-messages { font-size: clamp(0.8rem, 2vw, 1.2rem); }
    .input-bar { width: 90%; }
    .name-gate { padding: 1.5rem 2rem; }
    .name-gate-text { font-size: clamp(1rem, 2vw, 1.4rem); }
}
@media (max-width: 480px) {
    :root {
        --card-width: clamp(35px, 18vw, 60px);
        --reveal-card-width: clamp(60px, 25vw, 120px);
    }
    .madame-area { max-height: 25vh; }
    .voice-area { font-size: clamp(0.7rem, 2.5vw, 1rem); }
    .user-messages { font-size: clamp(0.7rem, 2.5vw, 1rem); }
    .input-bar #user-input { font-size: clamp(0.8rem, 2vw, 1rem); }
    .candle-container { transform: scale(0.7); }
}
```

**Remove old rules**: `.user-section` (lines 581-591), old `.madame-area` flex properties, old flex-based row sizing.

---

### Group C — Fan Shape Rewrite (`static/js/tarot.js`)

**Goal**: Wide hand-of-cards spread (16 cols × 5 rows) that fits inside `.cards-section`.

**Maths for 1920×1080**:
- `.cards-section` grid cell: ~1400px wide × ~200px tall (after grid layout)
- Card width at 1920px: `clamp(60px, 8vw, 100px)` = 100px
- Card height: 100 × 1.55 = 155px × 0.85 scale = 132px
- 16 columns × 14px spacing = 210px horizontal spread from center = 420px total
- 5 rows × 6px spacing = 12px vertical spread from center = 24px total
- Total fan: ~420px wide × 156px tall — fits in 1400×200 cell with room to spare

**Extract `layOutFan()` as reusable function**:
```javascript
// --------------------------------------------------------------
// LAYOUT ENGINE — Reusable fan/grid layout
// --------------------------------------------------------------
function layOutFan(cardElements, options = {}) {
    const {
        columns = 16,
        spacingX = 14,
        spacingY = 6,
        scale = 0.85,
        rotationX = 0.6,
        rotationY = 0.2,
        delayMultiplier = 8,
        opacity = 0.6
    } = options;

    const total = cardElements.length;
    const rows = Math.ceil(total / columns);
    const startX = -(columns - 1) * spacingX / 2;
    const startY = -(rows - 1) * spacingY / 2;

    cardElements.forEach((card, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = startX + col * spacingX;
        const y = startY + row * spacingY;
        const rot = (col - columns / 2) * rotationX + (row - rows / 2) * rotationY;
        const delay = i * delayMultiplier;
        setTimeout(() => {
            card.style.transform =
                `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
            card.style.opacity = opacity.toString();
        }, delay);
    });
}
```

**Rewrite `fanCards()` as thin wrapper**:
```javascript
function fanCards() {
    layOutFan(cards, {
        columns: 16,
        spacingX: 14,
        spacingY: 6,
        scale: 0.85,
        rotationX: 0.6,
        rotationY: 0.2,
        delayMultiplier: 8,
        opacity: 0.6
    });
}
```

**Future spreads** can call `layOutFan()` with different parameters (e.g., Celtic Cross: `columns: 1`, `spacingY: 20`).

---

### Group D — Visible Shuffle Transition (`static/js/tarot.js`)

**Goal**: Hold the compact stack visibly for ~800ms before dealing.

**Current `shuffleCards()`** (lines 413-453): Converges to stack then immediate callback.

**Proposed rewrite** (replace `shuffleCards`):
```javascript
// --------------------------------------------------------------
// Shuffle Animation — Converge to Single Stack, Hold, Callback
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

        // Phase 3: HOLD the stack visibly for 800ms with subtle idle animation
        const stackFormedTime = duration + 300 + total * 2;
        setTimeout(() => {
            // Subtle breathing animation on the stack
            let pulseDirection = 1;
            const pulseInterval = setInterval(() => {
                const pulseScale = 0.7 + pulseDirection * 0.02;
                cards.forEach((card, i) => {
                    if (card.style.opacity !== '0') {
                        const currentRot = card.style.transform.match(/rotate\(([^)]+)deg\)/);
                        const rot = currentRot ? currentRot[1] : (Math.random() * 2 - 1);
                        card.style.transform =
                            `translate(${centerX}px, ${centerY}px) rotate(${rot}deg) scale(${pulseScale})`;
                    }
                });
                pulseDirection *= -1;
            }, 400);

            // After 800ms, stop pulse and callback
            setTimeout(() => {
                clearInterval(pulseInterval);
                // Snap to clean scale
                cards.forEach((card, i) => {
                    if (card.style.opacity !== '0') {
                        const currentRot = card.style.transform.match(/rotate\(([^)]+)deg\)/);
                        const rot = currentRot ? currentRot[1] : (Math.random() * 2 - 1);
                        card.style.transform =
                            `translate(${centerX}px, ${centerY}px) rotate(${rot}deg) scale(0.7)`;
                    }
                });
                if (callback) callback();
            }, 800);
        }, stackFormedTime);
    }, duration + 300);
}
```

---

### Group E — User Message Separation (`static/js/tarot.js`)

**Goal**: `addUserSentence()` appends to new `#user-messages` instead of `#voice-text`.

**Current `addUserSentence()`** (lines 345-360):
```javascript
function addUserSentence(text) {
    const sentence = document.createElement('div');
    sentence.className = 'user-sentence';
    sentence.textContent = text;
    voiceArea.appendChild(sentence);  // ← WRONG CONTAINER

    requestAnimationFrame(() => {
        sentence.classList.add('visible');
    });

    setTimeout(() => {
        manageVisibleSentences();
    }, 100);
}
```

**Proposed diff**:
```javascript
function addUserSentence(text) {
    const sentence = document.createElement('div');
    sentence.className = 'user-sentence';
    sentence.textContent = text;
    
    // NEW: Append to user-messages container
    const userMessages = document.getElementById('user-messages');
    if (userMessages) {
        userMessages.appendChild(sentence);
    } else {
        // Fallback to voiceArea for backward compatibility
        voiceArea.appendChild(sentence);
    }

    requestAnimationFrame(() => {
        sentence.classList.add('visible');
    });

    // Manage visibility in user-messages (max 3)
    const userSentences = userMessages?.querySelectorAll('.user-sentence');
    if (userSentences && userSentences.length > 3) {
        const toRemove = userSentences.length - 3;
        for (let i = 0; i < toRemove; i++) {
            const s = userSentences[i];
            s.classList.add('fading');
            setTimeout(() => {
                if (s.parentNode) s.parentNode.removeChild(s);
            }, 800);
        }
    }
}
```

**Also update `manageVisibleSentences()`** to only manage `.voice-sentence` in `#voice-text` (Madame's messages):
```javascript
function manageVisibleSentences() {
    const sentences = voiceArea.querySelectorAll('.voice-sentence');
    const maxVisible = 3;
    const total = sentences.length;

    sentences.forEach((s, index) => {
        if (index < total - maxVisible) {
            s.classList.add('fading');
            setTimeout(() => {
                if (s.parentNode) s.parentNode.removeChild(s);
            }, 800);
        }
    });
}
```

---

## 3. Risks and Uncertainties

| Risk | Description | Mitigation |
|------|-------------|------------|
| Grid rebuild breaks 768px/480px | Grid template rows may not adapt well to small viewports | Test at all breakpoints; use `minmax()` with viewport units |
| Fan shape subjective | "Hand of cards" look needs tuning of columns/spacing | Start with 16×5; adjust after visual test |
| `manageVisibleSentences` broken by split | Currently queries all `.voice-sentence` in shared area | Updated to only query `voiceArea` (Madame's area) |
| `scheduleHighlights` queries `.card.reveal-card` in `deckArea` | Grid rebuild doesn't move `deckArea` — stays in `.cards-section` | Verified: `deckArea` ID unchanged, still inside `.cards-section` |
| Candle glow animation conflicts with grid | `filter: drop-shadow` on `.candle-container` may be clipped by `overflow: hidden` on parent | `.candle-section` has `overflow: visible` (default); grid cell `overflow: hidden` is on `.cards-section` not `.candle-section` |
| Browser cache serving old JS | NiceGUI may serve cached `tarot.js` | Add cache-busting query string or version param to script tag |

---

## 4. Execution Order

1. **Group A** — HTML restructure (`static/index.html`)
2. **Group B** — CSS Grid rebuild (`static/css/tarot.css`) — must follow A
3. **Group E** — User message separation (`static/js/tarot.js`) — must follow A
4. **Group C** — Fan shape rewrite + `layOutFan()` extraction (`static/js/tarot.js`)
5. **Group D** — Visible shuffle transition (`static/js/tarot.js`)
6. **Manual end-to-end test** at 1920px, 768px, 375px

---

## 5. Definition of Done

### Automated
```bash
git grep -c "class=\"user-messages\"" static/index.html     # expect 1
git grep -c "layOutFan" static/js/tarot.js                  # expect 2 (def + call)
git grep -c "columns = 16" static/js/tarot.js               # expect 1
git grep -n "scrollbar-gutter" static/css/tarot.css         # expect 1
```

### Manual (run `python app.py`, visit `http://localhost:8080`)
- [ ] All 78 cards fan out **wide** (hand-of-cards, ~16 cols × 5 rows, not tall column)
- [ ] Fan fully contained inside `.cards-section` — no overlap with text box above or candle below at 1920 / 768 / 375px
- [ ] Fan shuffles to a **visible compact stack** in centre, held for ~800ms
- [ ] 3 cards deal from stack to Past / Present / Future positions
- [ ] Remaining 75 cards fade away
- [ ] 3 dealt cards flip one by one and show their images
- [ ] Candle sits below cards, prominent, with visible upward glow
- [ ] Text box heights size to content (no 70% dead space)
- [ ] User messages appear in distinct bottom area (`.user-messages`), not stacked with Madame's text
- [ ] Scrollbar does not wobble when text is short
- [ ] Reading text flows cleanly

---

## Appendix: Files to Modify (Summary)

| File | Groups | Change Type | Approx. Lines |
|------|--------|-------------|---------------|
| `static/index.html` | A | Restructure body | ~15 lines changed |
| `static/css/tarot.css` | B | Full grid rebuild | ~120 lines changed |
| `static/js/tarot.js` | C, D, E | Fan rewrite, shuffle hold, user msg split | ~100 lines changed |
| **Total** | | **3 source files** | **~235 lines** |

No backend changes. No new dependencies.