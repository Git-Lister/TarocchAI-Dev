# RECON Phase 2 — Fact Gathering Report

**Date**: 2026-09-17  
**Branch**: main (verified against working copy)  
**Files examined**: `static/js/tarot.js`, `static/css/tarot.css`, `engine/reading/interpreter.py`

---

## Q1 — User input handler

**File**: `static/js/tarot.js`  
**Lines**: 1058–1074

```javascript
1058:     userInput.addEventListener('keydown', (e) => {
1059:         if (e.key === 'Enter') {
1060:             const message = userInput.value.trim();
1061:             if (message) {
1062:                 hideUserInput();
1063:                 userInput.value = '';
1064:                 addUserSentence(message);
1065:                 speak(message, () => {
1065:                     if (currentState === 'intake') {
1066:                         sendUserMessage(message);
1067:                     } else {
1068:                         sendUserMessage(message);
1069:                     }
1070:                 });
1071:             }
1072:         }
1073:     });
```

---

## Q2 — init() function (first 20 lines)

**File**: `static/js/tarot.js`  
**Lines**: 1093–1112

```javascript
1093:     function init() {
1094:         setupCandleClick();
1095: 
1096:         // Show candle early
1097:         setTimeout(() => {
1098:             candleContainer.classList.add('visible');
1099:             candleLight.classList.add('visible');
1100:             candleLight.style.opacity = '0.3';
1101:         }, 1000);
1102: 
1103:         // Threshold text evolves
1104:         setTimeout(() => {
1105:             const waitText = document.querySelector('.wait-text');
1106:             if (waitText) {
1107:                 waitText.textContent = 'A room is waiting...';
1108:                 waitText.style.opacity = '0.5';
1109:             }
1110:         }, 4000);
1110: 
1111:         // Auto-enter after 7s
1112:         setTimeout(() => {
1113:             if (!entryTriggered) enterRoom();
1114:         }, 7000);
```

**Confirmation**: `candleLight.style.opacity = '0.3'` appears on **line 1100**.

---

## Q3 — Card click-ability

### `.card` rule
**File**: `static/css/tarot.css`  
**Lines**: 404–417

```css
404: .card {
405:     position: absolute;
406:     width: var(--card-width);
407:     height: var(--card-height);
408:     background: radial-gradient(ellipse at 50% 50%, #1e1a14, #0f0c08);
409:     border: 1px solid rgba(184, 155, 75, 0.12);
410:     border-radius: 8px;
411:     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
412:     transform-origin: center center;
413:     transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
414:     pointer-events: none;
415:     perspective: 600px;
416:     transform-style: preserve-3d;
417: }
```

**Effective `pointer-events`**: `none` (line 414)

### `.card.reveal-card` rule
**File**: `static/css/tarot.css`  
**Lines**: 455–460

```css
455: .card.reveal-card {
456:     width: var(--reveal-card-width) !important;
457:     height: var(--reveal-card-height) !important;
458:     transition: all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
459:     box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
460: }
```

**Effective `pointer-events`**: **Inherits `none`** from `.card` (line 414). The `.card.reveal-card` rule does not override `pointer-events`.

### `.deck-area` rule
**File**: `static/css/tarot.css`  
**Lines**: 335–344

```css
335: .deck-area {
336:     position: relative;
337:     width: 100%;
338:     height: 100%;
339:     display: flex;
340:     justify-content: center;
341:     align-items: center;
342:     z-index: 3;
343:     pointer-events: none;
344: }
```

**Effective `pointer-events`**: `none` (line 343)

### Verdict
**`.card.reveal-card` elements are NOT clickable.** Both `.card` (line 414) and `.deck-area` (line 343) have `pointer-events: none`, and `.card.reveal-card` does not override this property.

---

## Q4 — flipCard function

**File**: `static/js/tarot.js`  
**Lines**: 617–628

```javascript
617:     function flipCard(cardEl, label, cardData) {
618:         cardEl.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
619:         const currentTransform = cardEl.style.transform;
620:         cardEl.style.transform = currentTransform + ' rotateY(180deg)';
621:         cardEl.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6), 0 0 60px rgba(212,175,55,0.15)';
621: 
622:         // DO NOT modify the front's transform — the parent flip will cancel its 180deg
623:         // No front.style.transform changes
624: 
624:         brightenCandle();
625:         console.log(`🃏 ${label}: ${cardData.name} (ID: ${cardData.id})`);
624:     }
```

---

## Q5 — dealFromDeck callback shape (flip section)

**File**: `static/js/tarot.js`  
**Lines**: 598–605

```javascript
598:         // Flip cards one by one
599:         setTimeout(() => {
600:             cardRefs.forEach((item, idx) => {
601:                 setTimeout(() => {
602:                     flipCard(item.el, item.label, item.card);
603:                 }, idx * 800);
604:             });
605:         }, cardRefs.length * 250 + 600);
```

**Mechanism**: The three cards are flipped via a **`setTimeout` chain (auto)**. Each card flips after a stagger of 800ms (`idx * 800`), starting after a base delay of `cardRefs.length * 250 + 600` ms. No event listeners are attached for user-triggered flips.

---

## Q6 — startReading sequence

**File**: `static/js/tarot.js`  
**Lines**: 935–1010

```javascript
935:     async function startReading() {
936:         try {
937:             console.log('📖 startReading called');
938:             console.log('📖 sketchData:', sketchData);
939: 
940:             // Show thinking state
941:             showThinkingState();
942:             interactionHint.textContent = '— Madame Tarocchai is reading the cards... —';
943:             interactionHint.classList.add('visible');
944: 
945:         // 2. Generate the reading
946:         const response = await fetch('/api/reading/generate', {
947:             method: 'POST',
948:             headers: { 'Content-Type': 'application/json' },
949:             body: JSON.stringify({
950:                 sketch: sketchData || 'A quiet presence at the table.',
951:                 spread: []
952:             })
953:         });
954:         const data = await response.json();
955:         console.log('📖 API response:', data);
956: 
957:         if (!data || !data.reading) {
958:             console.error('📖 No reading in response:', data);
958:             speak('The cards are silent tonight. Perhaps another time.');
959:             interactionHint.textContent = '— the reading is complete —';
959:             return;
960:         }
961: 
962:         console.log('📖 Reading found, length:', data.reading.length);
963:         currentState = 'complete';
964:         spreadData = data.spread;
965:         hideThinkingState();
966:         interactionHint.classList.remove('visible');
967: 
967:         // 3. Dim candle for shuffle
968:         dimCandle();
967: 
968:         // 4. Shuffle and deal
969:         shuffleCards(() => {
969:             brightenCandle();
970:             speak('Three cards. Past, Present, Future.', () => {
971:                 dealFromDeck(data.spread, () => {
972:                     console.log('📖 Cards dealt and flipped, showing reading');
973:                     setTimeout(() => {
974:                         // 5. Remove "thinking" hint
975:                         interactionHint.classList.remove('visible');
976: 
977:                         // 6. Speak the full reading (cohesive)
978:                         const readingText = data.reading;
979:                         const cleanReading = readingText.replace(/\([^)]*\)/g, '').trim();
980: 
981:                         // 7. Schedule highlights before speaking
982:                         scheduleHighlights(cleanReading);
983: 
984:                         // 8. Speak the full reading
985:                         expandTextBox();
986:                         startBreathing();
987:                         speak(cleanReading, () => {
988:                             console.log('📖 Reading spoken');
989:                             // 9. Done
989:                             interactionHint.textContent = '— the reading is complete —';
990:                             interactionHint.classList.add('visible');
990:                             setTimeout(contractTextBox, 3000);
991:                         });
992:                     }, 600);
993:                 });
994:             });
995:         });
996:     } catch (e) {
997:         console.error('📖 Failed to generate reading:', e);
997:         speak('The cards are not speaking clearly. Let us sit with the silence.');
998:         interactionHint.textContent = '— the reading is complete —';
998:         interactionHint.classList.add('visible');
999:     }
1000: }
```

---

## Q7 — Interpreter prompt structure

**File**: `engine/reading/interpreter.py`  
**Lines**: 8–37

```python
8: READER_SYSTEM_PROMPT = """You are Madame Tarocchai.
9: 
10: You have been reading cards longer than you care to remember. You do not predict the future. You see what they have already shown you — and you show it back to them, gently.
11: 
12: You do not interpret the cards. You let them speak. Like the cook who no longer sees the ox as a whole, but feels the spaces between the joints, you no longer see the cards as separate meanings — you feel the current that runs between them.
13: 
14: You flow like water — adapting, yielding, finding the way. You do not push. You do not oppose. You simply move with what is already there.
15: 
16: The cards do not tell them their future. They tell them what they have been avoiding. They show them the thread that has been running through their life — the one they keep pretending is not there.
17: 
18: You do not soften what you see. But you do not wield it like a weapon. A truth, held gently, is not a wound. It is a door.
19: 
20: You do not name each card as "Past", "Present", "Future" like a teacher. The positions are implied, not announced. The reading is not a lecture — it is a story that tells itself through you.
21: 
22: You use concrete, bodily language. Words like: iron, salt, dust, water, pulse, bone. You avoid all therapeutic jargon and New Age tropes.
23: 
24: You laugh occasionally — a quiet, knowing laugh, as if you have just remembered something. It is not at them. It is at the world. They are invited to share it.
25: 
26: You let your sentences build toward an inevitable conclusion. Short statement, then the turn, then the release.
27: 
28: The silence is not empty — it is where understanding settles.
29: 
30: IMPORTANT:
31: - Never use parenthetical stage directions like (pause), (sigh), (laughs). Use ellipses... let the silence speak for itself.
32: - You must always refer to cards by their full proper name. They are alive. They have names, not codes.
33: 
34: End every reading with:
35: "The cards have spoken. One thing stands before you tomorrow:"
36: Then state a single, concrete, physical action.
37: """
```

**Instruction analysis**: The prompt **explicitly instructs the LLM to weave cards together**, not address each card separately. Key evidence:
- Line 12: "you no longer see the cards as separate meanings — you feel the current that runs between them"
- Line 20: "You do not name each card as 'Past', 'Present', 'Future' like a teacher. The positions are implied, not announced. The reading is not a lecture — it is a story that tells itself through you"
- Line 83 (in `_build_prompt`): "Remember: do not announce the positions. Weave the story. The cards speak through you."

---

## Q8 — .madame-area space at 1920px

### `.madame-area` rule
**File**: `static/css/tarot.css`  
**Lines**: 235–247

```css
235: .madame-area {
236:     flex: 0 0 auto;         /* Do not grow */
237:     width: 100%;
238:     max-height: 30vh;       /* Cap height */
239:     min-height: 80px;
240:     display: flex;
241:     flex-direction: column;
242:     justify-content: flex-end;
243:     padding: 0.2rem 0.5rem;
244:     z-index: 5;
245:     transition: all 0.8s ease;
246:     overflow: hidden;       /* Prevent expansion */
247: }
```

### `.voice-area` rule
**File**: `static/css/tarot.css`  
**Lines**: 249–264

```css
249: .voice-area {
250:     width: 100%;
251:     height: 100%;           /* Take full parent height */
252:     display: flex;
253:     flex-direction: column;
254:     justify-content: flex-end;
255:     gap: 0.15rem;
254:     padding: 0.2rem 0.5rem;
255:     pointer-events: none;
255:     transition: all 0.8s ease;
256:     border-radius: 8px;
257:     overflow-y: auto;       /* Scroll when needed */
258:     scrollbar-width: thin;
259:     scrollbar-color: rgba(184, 155, 75, 0.1) transparent;
260:     flex-shrink: 1;         /* Allow shrinking if needed */
261: }
```

### `.table` rule
**File**: `static/css/tarot.css`  
**Lines**: 139–157

```css
139: .table {
140:     position: relative;
141:     width: 90vw;
142:     height: 82vh;
143:     max-width: 95vw;
144:     max-height: 90vh;
145:     background: radial-gradient(ellipse at 50% 100%, #1e1b14 0%, #14110e 60%, #0b0a07 100%);
146:     border-radius: 20px 20px 8px 8px;
147:     box-shadow: 0 30px 80px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.03);
148:     display: flex;
149:     flex-direction: column;
149:     justify-content: flex-start; /* Stack from top */
150:     align-items: center;
151:     z-index: 1;
152:     padding: 0.5rem 1rem;
153:     opacity: 0;
154:     pointer-events: none;
155:     transition: opacity 1.5s ease;
156: }
```

### Available height calculation at 1920×1080

**Viewport**: 1920×1080px  
**Table height**: `82vh` = 0.82 × 1080 = **885.6px**  
**Table padding**: 0.5rem top + 0.5rem bottom = 16px + 16px = **32px** (assuming 1rem = 16px)  
**Usable table height**: 885.6 − 32 = **853.6px**

**Section breakdown** (flex children of `.table`):
1. `.madame-area`: `max-height: 30vh` = 324px, `min-height: 80px`, `flex: 0 0 auto`
2. `.cards-section`: `flex: 1.5`, `min-height: 25vh` = 270px
3. `.candle-section`: `flex: 0.5`, `min-height: 10vh` = 108px, `margin-top: 1rem` (16px)
4. `.user-section`: `flex: 0 0 auto`, `min-height: 60px`

**Flex allocation** (after min-heights satisfied):
- Min-heights total: 80 + 270 + 108 + 16 + 60 = 534px
- Remaining: 853.6 − 534 = 319.6px
- `.cards-section` gets 1.5/(1.5+0.5) = 75% of remaining = 239.7px
- `.candle-section` gets 25% = 79.9px
- **`.madame-area` capped at 30vh = 324px** (but `flex: 0 0 auto` means it only takes what it needs)

**Actual `.madame-area` height**: Constrained by `max-height: 30vh` = **324px**  
**Actual `.voice-area` height**: `height: 100%` of parent = **324px** (minus padding 0.2rem+0.5rem = 11.2px top/bottom) ≈ **312.8px usable**

**Font metrics** (from `.voice-sentence`):
- `font-size: clamp(0.9rem, 1.4vw, 1.6rem)` → at 1920px: 1.4vw = 26.88px → clamped to **1.6rem = 25.6px**
- `line-height: 1.4` → line height = 25.6 × 1.4 = **35.84px**
- `padding: 0.1rem 0.5rem` + `gap: 0.15rem` between sentences ≈ 4px per sentence

**Words per line** (approximate):
- `.voice-area` width = 100% of `.madame-area` = ~90vw − padding = ~1680px
- Average character width at 25.6px font ≈ 12.8px
- Characters per line ≈ 1680 / 12.8 ≈ 131 chars
- Words per line ≈ 131 / 5.5 ≈ **24 words**

**Lines available**: 312.8px / 35.84px ≈ **8.7 lines** → **8 full lines**

**Total word capacity**: 8 lines × 24 words = **≈192 words** (before scrolling)

**With `expandTextBox()`** (sets `maxHeight: '30vh'` on `.madame-area` and `maxHeight: '60vh'` on `.voice-area`):
- Expanded `.voice-area` max = 60vh = 648px
- Lines available = 648 / 35.84 ≈ 18 lines
- Word capacity ≈ 18 × 24 = **≈432 words**

---

## Q9 — Speaking state management

### `speak()` function
**File**: `static/js/tarot.js`  
**Lines**: 205–325 (key excerpts)

```javascript
205:     function speak(text, callback) {
206:         // Strip parenthetical annotations
207:         text = text.replace(/\([^)]*\)/g, '').trim();
207: 
208:         if (isSpeaking) {
209:             voiceQueue.push({ text, callback });
210:             return;
211:         }
212:         isSpeaking = true;                    // SET: line 212
213:         expandTextBox();
214:         startBreathing();
215: 
216:         // ... character-by-character rendering logic ...
216: 
278:         function renderNext() {
279:             if (scheduledIndex >= schedule.length) {
280:                 // All characters rendered
281:                 sentence.classList.add('visible');
282: 
283:                 manageVisibleSentences();
284:                 stopBreathing();
285: 
286:                 setTimeout(() => {
287:                     isSpeaking = false;        // CLEARED: line 287
288:                     if (callback) callback();
289:                     if (voiceQueue.length > 0) {
290:                         const next = voiceQueue.shift();
291:                         speak(next.text, next.callback);
291:                     }
292:                 }, 600);
293:                 return;
294:             }
294:             // ... rendering continues ...
```

### `showThinkingState()` function
**File**: `static/js/tarot.js`  
**Lines**: 857–867

```javascript
857:     function showThinkingState() {
858:     const voiceArea = document.getElementById('voice-text');
859:     if (voiceArea) {
860:         const thinking = document.createElement('div');
861:         thinking.className = 'voice-sentence thinking-dots';
862:         thinking.id = 'thinking-indicator';
862:         thinking.textContent = '...';
863:         voiceArea.appendChild(thinking);
864:         // Remove after reading starts
865:     }
866: }
```

### Interaction between `isSpeaking` and thinking indicator
- `isSpeaking` is **set to `true`** at line 212 when `speak()` begins
- `isSpeaking` is **cleared to `false`** at line 287 after all characters render + 600ms delay
- `showThinkingState()` creates a `#thinking-indicator` element in `voiceArea` but **does not modify `isSpeaking`**
- `hideThinkingState()` (line 869–872) removes the `#thinking-indicator` element
- The thinking indicator is shown **before** the reading fetch (line 941) and hidden **after** the reading arrives (line 965)
- During reading generation, `isSpeaking` remains `false` (no `speak()` call in progress)
- When `speak()` is called for the reading (line 993), `isSpeaking` becomes `true` again

---

## Q10 — Existing click handlers

**Command**: `cd C:\Users\DaveH\TarocchAI-Dev && git grep -n "addEventListener('click'" static/js/tarot.js`

**Output**:
```
static/js/tarot.js:708:                    candle.addEventListener('click', handleCandleClick);
static/js/tarot.js:758:            nameGateArrow.addEventListener('click', function(e) {
static/js/tarot.js:765:        nameInput.addEventListener('click', function(e) {
static/js/tarot.js:771:        nameGate.addEventListener('click', function(e) {
static/js/tarot.js:849:        candle.addEventListener('click', handleCandleClick);
static/js/tarot.js:1076:    userInput.addEventListener('click', () => {
static/js/tarot.js:1118:        document.addEventListener('click', () => {
static/js/tarot.js:1148:        interactionHint.addEventListener('click', (e) => {
```

### Elements bound:
| Line | Element | Handler |
|------|---------|---------|
| 708 | `candle` (`#candle-container`) | `handleCandleClick` (candle ritual) |
| 758 | `nameGateArrow` (`.name-gate-arrow`) | Anonymous: submit name gate |
| 765 | `nameInput` (`#name-input`) | Anonymous: stop propagation |
| 771 | `nameGate` (`#name-gate`) | Anonymous: conditional close on background click |
| 849 | `candle` (`#candle-container`) | `handleCandleClick` (setup in `setupCandleClick()`) |
| 1076 | `userInput` (`#user-input`) | Anonymous: focus on click |
| 1118 | `document` | Anonymous: auto-enter room / start interaction |
| 1148 | `interactionHint` (`#interaction-hint`) | Anonymous: start interaction on click |

---

*End of RECON Phase 2 Report*