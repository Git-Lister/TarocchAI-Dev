# Architecture Decision Records (ADRs)

## ADR-001: Keep First `expandTextBox`/`contractTextBox` Definitions in `tarot.js`

**Date**: 2026-09-12  
**Status**: Accepted

### Context
`static/js/tarot.js` contained two definitions each of `expandTextBox()` and `contractTextBox()`. The second definitions (lines ~1149, ~1161) overwrote the first due to JavaScript function hoisting. The second definitions were simpler but lacked critical functionality:
- Did not touch `#madame-area` (losing the 30vh hard cap)
- Did not call `startBreathing()`/`stopBreathing()` (decoupling breathing presence from speech)

All six call sites in the file were already using the second (active) definitions.

### Decision
Delete the second definitions (lines 1145–1171) and keep the first definitions (lines 65–99). The first definitions are a strict superset — they handle both `#voice-text` and `#madame-area`, and integrate with the breathing presence animation.

### Consequences
- Madame's text area regains its 30vh max-height cap
- Breathing presence animation re-couples to speech (speeds up during `speak()`, slows after)
- All existing call sites continue to work unchanged (they now invoke the more complete implementation)
- Slightly larger `voiceArea.maxHeight` during expansion (30vh vs 60vh) — this is the intended design per the original implementation

### Alternatives Considered
- Merge the two: keep second def but add missing calls — rejected because first def already expresses the complete intended behavior
- Keep second def and add missing logic — rejected as more error-prone than simply removing dead code

---

## ADR-002: No Changes to Interviewer/Interpreter Prompts

**Date**: 2026-09-12  
**Status**: Accepted

### Context
The Batch 1 plan listed four claims about prompt issues in `engine/intake/interviewer.py` and `engine/reading/interpreter.py`:
- Claim 3: Intake prompt says "exactly four turns" but MAX_INTAKE_TURNS=6
- Claim 4: Intake prompt may cause parroting
- Claim 5: Reader prompt contains formulaic "name each card" instruction
- Claim 6: Reader prompt lacks Laozi/Zhuangzi voice

### Decision
After verification against the actual working copy:
- Claim 3 is **false**: The prompt states "After 3-6 turns" which matches MIN=3, MAX=6
- Claim 5 is **false**: The prompt explicitly says "You do not name each card as 'Past', 'Present', 'Future' like a teacher. The positions are implied, not announced."
- Claim 6 is **false**: The prompt already contains Zhuangzi voice elements ("flow like water", "truth held gently is a door", "concrete bodily language: iron, salt, dust", "quiet knowing laugh", "silence is not empty")
- Claim 4 is **uncertain**: The dynamic prompt in `conversation_turn()` includes "Do not parrot their words back verbatim. Mutters are fine." — this may be sufficient but requires manual testing to confirm

**No code changes** are made to either file in this batch. Claim 4 will be evaluated during manual end-to-end testing. If parroting is observed, the dynamic prompt at line 113 of `interviewer.py` can be adjusted in a future batch.

### Consequences
- Avoids unnecessary prompt engineering that could destabilize working behavior
- Defers uncertain claim (4) to empirical validation
- Keeps this batch focused on confirmed bugs only

---

## ADR-003: Defensive CSS Spacing for Card/Candle Layout

**Date**: 2026-09-12  
**Status**: Accepted

### Context
Claim 9: "The candle and the cards may overlap; the candle should sit below the cards." The HTML uses a flex column layout with `.cards-section` (flex: 1.5) above `.candle-section` (flex: 0.5). This should stack correctly, but visual verification at multiple viewport sizes was not possible during planning.

### Decision
Apply minimal defensive CSS changes to create a safety buffer:
1. Increase `.cards-section` `min-height` from `20vh` to `25vh`
2. Add `margin-top: 1rem` to `.candle-section`

These changes are purely defensive — they add breathing room without altering the fundamental flex layout. If manual testing reveals no overlap at any viewport, these changes are harmless. If overlap exists, they provide a fix without requiring layout restructuring.

### Consequences
- Slightly more vertical space allocated to cards area
- 1rem guaranteed gap between cards and candle sections
- No risk of breaking existing layout (additive changes only)
- Can be reverted or adjusted after manual testing if excessive

### Alternatives Considered
- Restructure to grid layout — rejected as over-engineering for a potential issue
- Use `gap` on the flex container — rejected because the table uses nested flex sections with different alignments
- Wait for manual test confirmation before applying — rejected because the changes are low-risk and additive; better to have them in place for the test