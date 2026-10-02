import io, sys

path = 'static/js/tarot.js'

with io.open(path, 'r', encoding='utf-8') as f:
    src = f.read()

# --- Patch A: add SHUFFLE_ADJECTIVES constant ---
anchor_const = "    const CARD_COUNT = 78;"
if anchor_const not in src:
    print("PATCH A FAILED: CARD_COUNT anchor not found")
    sys.exit(1)

const_block = '''    const CARD_COUNT = 78;
    const SHUFFLE_ADJECTIVES = [
        'slowly',
        'quietly',
        'eagerly',
        'softly',
        'patiently',
        'reluctantly',
        'swiftly',
        'sleepily',
        'deliberately',
        'curiously',
        'insistently',
        'gently',
        'as if remembering',
        'as if they have waited'
    ];'''
src = src.replace(anchor_const, const_block, 1)
print("Patch A: SHUFFLE_ADJECTIVES added")

# --- Patch B: insert pourDown + wander functions before fanCards ---
anchor_fan = "function fanCards() {"
if anchor_fan not in src:
    print("PATCH B FAILED: fanCards anchor not found")
    sys.exit(1)

new_functions = '''function pourDown(callback) {
    if (!cards || cards.length === 0) {
        if (callback) callback();
        return;
    }

    // Reset all cards above the void
    cards.forEach((card, i) => {
        card.classList.remove('pouring');
        card.style.zIndex = i;
        card.style.opacity = '0';
        card.style.transform = 'translate(0, -80vh) scale(0.35)';
        card.style.setProperty('--pour-start-rot', ((Math.random() * 16 - 8)).toFixed(2) + 'deg');
        card.style.setProperty('--pour-end-rot', ((Math.random() * 6 - 3)).toFixed(2) + 'deg');
    });

    // Stagger the pour: each card starts 10ms after the previous
    const stagger = 10;
    const fallDuration = 700;

    cards.forEach((card, i) => {
        setTimeout(() => {
            card.classList.add('pouring');
        }, i * stagger);
    });

    const totalTime = cards.length * stagger + fallDuration;

    setTimeout(() => {
        // Clean up animation classes
        cards.forEach(card => {
            card.classList.remove('pouring');
            card.style.opacity = '0.6';
            card.style.transform = 'translate(0, 0) rotate(0deg) scale(0.7)';
        });
        // Short hold, then fan out
        setTimeout(() => {
            fanCards();
            if (callback) callback();
        }, 400);
    }, totalTime);
}

function startShuffleWander() {
    const state = { active: true, cards: [] };

    cards.forEach((card, i) => {
        const angle0 = (i / cards.length) * Math.PI * 2 + Math.random() * 0.6;
        const radius = 30 + Math.random() * 60;
        const speed = 0.3 + Math.random() * 0.5;
        const phase = Math.random() * Math.PI * 2;

        card.style.transition = 'none';
        card.style.zIndex = 100 + i;

        state.cards.push({ el: card, angle0, radius, speed, phase });
    });

    const startTime = performance.now();

    function tick() {
        if (!state.active) return;
        const t = (performance.now() - startTime) / 1000;

        state.cards.forEach(c => {
            const angle = c.angle0 + t * c.speed;
            const x = Math.cos(angle) * c.radius;
            const y = Math.sin(angle) * c.radius * 0.4;
            const rot = Math.sin(t * c.speed * 2 + c.phase) * 12;
            c.el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(0.6)`;
            c.el.style.opacity = '0.75';
        });

        requestAnimationFrame(tick);
    }

    tick();

    return {
        stop: () => { state.active = false; }
    };
}

function endShuffleWander(controller) {
    return new Promise(resolve => {
        if (controller) controller.stop();

        const gatherDuration = 900;

        cards.forEach((card, i) => {
            card.style.transition = `transform ${gatherDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease`;
            card.style.transform = `translate(0, 0) rotate(${Math.random() * 2 - 1}deg) scale(0.7)`;
            card.style.opacity = '0.9';
            card.style.zIndex = i;
        });

        setTimeout(() => {
            cards.forEach(c => c.classList.add('stack-pulse'));
            setTimeout(() => {
                cards.forEach(c => c.classList.remove('stack-pulse'));
                resolve();
            }, 800);
        }, gatherDuration);
    });
}

'''
src = src.replace(anchor_fan, new_functions + anchor_fan, 1)
print("Patch B: pourDown, startShuffleWander, endShuffleWander inserted")

# --- Patch C: replace fanCards() call with pourDown() in proceedToIntake ---
old_proceed = """    function proceedToIntake() {
        fanCards();
        brightenCandle();"""
new_proceed = """    function proceedToIntake() {
        pourDown();
        brightenCandle();"""
if old_proceed not in src:
    print("PATCH C FAILED: proceedToIntake fanCards call not found")
    sys.exit(1)
src = src.replace(old_proceed, new_proceed, 1)
print("Patch C: proceedToIntake now calls pourDown")

# --- Patch D: rewrite startReading to run shuffle during LLM wait ---
old_start_reading = """            // Show thinking state
            showThinkingState();
            interactionHint.textContent = '— Madame Tarocchai is reading the cards... —';
            interactionHint.classList.add('visible');

            // 2. Generate the reading
            const fetchStart = Date.now();
            const response = await fetch('/api/reading/generate', {"""

new_start_reading = """            // Show shuffle message and start wander
            const shuffleAdj = SHUFFLE_ADJECTIVES[Math.floor(Math.random() * SHUFFLE_ADJECTIVES.length)];
            interactionHint.textContent = '— the cards shuffle, ' + shuffleAdj + ' —';
            interactionHint.classList.add('visible');
            const wanderController = startShuffleWander();

            // 2. Generate the reading
            const fetchStart = Date.now();
            const response = await fetch('/api/reading/generate', {"""

if old_start_reading not in src:
    print("PATCH D FAILED: startReading thinking-state block not found")
    sys.exit(1)
src = src.replace(old_start_reading, new_start_reading, 1)
print("Patch D: startReading now starts wander before fetch")

# --- Patch E: after fetch returns, end wander and remove old shuffle call ---
old_post_fetch = """            // Channeling state: minimum 2.5s hold during LLM latency
            const elapsed = Date.now() - fetchStart;
            const remaining = Math.max(0, 2500 - elapsed);
            if (remaining > 0) {
                await new Promise(resolve => setTimeout(resolve, remaining));
            }

            hideThinkingState();
            interactionHint.classList.remove('visible');

            // 3. Dim candle for shuffle
            dimCandle();

            // 4. Shuffle and deal
            shuffleCards(() => {
                brightenCandle();
                speak('Three cards. Past, Present, Future.', () => {
                    dealFromDeck(data.spread, data.card_lines, data.thread, () => {
                        // Called after the thread has been spoken on candle click
                        console.log('📖 Reading sequence complete');
                    });
                });
            });"""

new_post_fetch = """            // LLM has returned — end the wander and converge
            await endShuffleWander(wanderController);

            hideThinkingState();
            interactionHint.classList.remove('visible');

            // Dim candle briefly
            dimCandle();

            // Cards are already stacked from the shuffle — deal from here
            brightenCandle();
            speak('Three cards. Past, Present, Future.', () => {
                dealFromDeck(data.spread, data.card_lines, data.thread, () => {
                    console.log('📖 Reading sequence complete');
                });
            });"""

if old_post_fetch not in src:
    print("PATCH E FAILED: post-fetch block not found")
    sys.exit(1)
src = src.replace(old_post_fetch, new_post_fetch, 1)
print("Patch E: post-fetch block replaced with endShuffleWander")

with io.open(path, 'w', encoding='utf-8') as f:
    f.write(src)

print("Patched:", path)