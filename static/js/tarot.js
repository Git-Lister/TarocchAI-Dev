// ============================================================
// TAROCCHAI — Liminal Room (v4) — DOM-ready wrapper
// ============================================================

document.addEventListener('DOMContentLoaded', function() {

    // DOM refs
    const threshold = document.getElementById('threshold');
    const room = document.getElementById('room');
    const candleLight = document.getElementById('candle-light');
    const candleContainer = document.getElementById('candle-container');
    const deckArea = document.getElementById('deck-area');
    const voiceArea = document.getElementById('voice-text');
    const interactionHint = document.getElementById('interaction-hint');
    const userInputArea = document.getElementById('user-input-area');
    const userInput = document.getElementById('user-input');
    const nameGate = document.getElementById('name-gate');
    const nameInput = document.getElementById('name-input');

    // Guard against missing elements
    if (!threshold || !room || !candleLight || !candleContainer || !deckArea || !voiceArea || !interactionHint || !userInputArea || !userInput || !nameGate || !nameInput) {
        console.error('❌ Missing DOM elements! Check IDs in index.html.');
        return;
    }

    // Cycle 2A: activate threshold on load
    threshold.classList.add('active');

    // State
    let scene = 'threshold';
    let voiceQueue = [];
    let isSpeaking = false;
    let entryTriggered = false;
    let isReadyForInteraction = false;
    let cards = [];
    let querentName = null;
    let currentState = 'intake';
    let sketchData = null;
    let spreadData = null;
    let flippedCount = 0;
    let cardClickMode = 'flip';
    let cardMeanings = {};
    let currentDisplay = 'thread';  // 'thread' | 'past' | 'present' | 'future'
    let fullReadingText = '';  // Store full reading for toggle
    let cardClickLocked = false;
    let cardLinesData = {};
    let threadTextData = '';
    let candleAction = 'start-intake';  // 'start-intake' | 'reveal-thread'

    const CARD_COUNT = 78;
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
    ];
    const SESSION_ID = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);



        // ============================================================
    // BREATHING PRESENCE — Tied to Speech
    // ============================================================

    const breathingPresence = document.getElementById('breathing-presence');

    function startBreathing() {
        if (breathingPresence) {
            breathingPresence.classList.add('speaking');
        }
    }

    function stopBreathing() {
        if (breathingPresence) {
            breathingPresence.classList.remove('speaking');
        }
    }

    // ============================================================
    // DYNAMIC TEXT BOX — Expansion & Contraction
    // ============================================================

    function expandTextBox() {
        const madameArea = document.getElementById('madame-area');
        const voiceArea = document.getElementById('voice-text');
        if (madameArea) {
            madameArea.style.transition = 'all 0.8s ease';
            madameArea.style.height = '40vh';
            madameArea.style.overflow = 'hidden';
        }
        if (voiceArea) {
            voiceArea.style.transition = 'all 0.8s ease';
            voiceArea.style.padding = '0.5rem 1rem';
            voiceArea.style.border = '2px solid rgba(212, 175, 55, 0.15)';
            voiceArea.style.boxShadow = '0 0 60px rgba(212, 175, 55, 0.08)';
            voiceArea.style.borderRadius = '8px';
            voiceArea.style.overflowY = 'auto';
        }
        startBreathing();
    }

    function contractTextBox() {
        const madameArea = document.getElementById('madame-area');
        const voiceArea = document.getElementById('voice-text');
        if (madameArea) {
            madameArea.style.height = '';
            madameArea.style.padding = '';
        }
        if (voiceArea) {
            voiceArea.style.transition = 'all 1s ease';
            voiceArea.style.padding = '';
            voiceArea.style.border = '';
            voiceArea.style.boxShadow = '';
            voiceArea.style.borderRadius = '';
        }
        stopBreathing();
    }

    // ============================================================
    // MADAME TAROCCHAI'S GREETINGS (Randomized)
    // ============================================================

    const GREETINGS = [
        "The room has been waiting for you.",
        "I was just looking at the cards when you arrived.",
        "The candle knows you're here.",
        "You arrived exactly when the cards began to stir.",
        "I felt you before I saw you.",
        "The velvet is warm tonight. It remembers you.",
        "You've been here before, haven't you?",
        "I was beginning to wonder when you'd arrive.",
        "The cards have been restless all evening.",
    ];

    const TIME_GREETINGS = {
        morning: "The morning light is thin here. The cards see through it differently.",
        afternoon: "The afternoon has a way of making things seem more urgent. The cards know.",
        evening: "The shadows are long tonight. The cards like this time.",
        night: "The candle is the only light here. That's how the cards prefer it."
    };

    function getTimeBasedGreeting() {
        const hour = new Date().getHours();
        let time = 'night';
        if (hour >= 6 && hour < 12) time = 'morning';
        else if (hour >= 12 && hour < 17) time = 'afternoon';
        else if (hour >= 17 && hour < 21) time = 'evening';
        return TIME_GREETINGS[time] || TIME_GREETINGS.night;
    }

    function getRandomGreeting() {
        // 70% random, 30% time-based
        if (Math.random() < 0.3) {
            return getTimeBasedGreeting();
        }
        return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    }

    // ============================================================
    // CANDLE RITUAL — Colours & Click Handler
    // ============================================================

    const CANDLE_COLOURS = [
        { name: 'Copper', shadow: 'rgba(100, 200, 255, 0.6)', glow: 'rgba(100, 200, 255, 0.3)' },
        { name: 'Strontium', shadow: 'rgba(255, 100, 100, 0.6)', glow: 'rgba(255, 100, 100, 0.3)' },
        { name: 'Sodium', shadow: 'rgba(255, 220, 100, 0.8)', glow: 'rgba(255, 220, 100, 0.4)' },
        { name: 'Potassium', shadow: 'rgba(200, 100, 255, 0.6)', glow: 'rgba(200, 100, 255, 0.3)' },
        { name: 'Boron', shadow: 'rgba(100, 255, 150, 0.6)', glow: 'rgba(100, 255, 150, 0.3)' },
        { name: 'Lithium', shadow: 'rgba(255, 150, 200, 0.6)', glow: 'rgba(255, 150, 200, 0.3)' }
    ];

    let isAwaitingCandleClick = false;
    let candleClickTriggered = false;

    // ============================================================
    // READY QUESTIONS (Candle-focused)
    // ============================================================

    const READY_QUESTIONS = [
        "Embrace the flame when you are ready to begin.",
        "Touch the candle's light to begin our journey.",
        "When you are ready, let the candle know.",
        "Reach for the flame when the question is clear.",
        "The candle waits for your hand to begin.",
        "Place your intention in the flame when you are ready.",
        "Let the candle's light guide you forward — touch it when you are ready.",
        "The flame is waiting. When you are ready, let it know.",
        "I am here. The candle is here. When you are ready, touch the light.",
        "Let us begin when you feel the warmth of the candle."
    ];

    // --------------------------------------------------------------
    // Candle
    // --------------------------------------------------------------
    function showCandle() {
        candleContainer.classList.add('visible');
        candleLight.classList.add('visible');
        setTimeout(() => {
            candleContainer.classList.add('bright');
            candleLight.classList.add('bright');
        }, 500);
    }

    function brightenCandle() {
        candleContainer.classList.remove('dim');
        candleContainer.classList.add('bright');
        candleLight.classList.remove('dim');
        candleLight.classList.add('bright');
    }

    function dimCandle() {
        candleContainer.classList.remove('bright');
        candleContainer.classList.add('dim');
        candleLight.classList.remove('bright');
        candleLight.classList.add('dim');
    }

    // ============================================================
    // SPEAK — Slow Materializing Text with Annotation Strip
    // ============================================================

    function processQueue() {
        if (isSpeaking) return;
        if (voiceQueue.length > 0) {
            const next = voiceQueue.shift();
            if (next.flow) {
                speakFlow(next.text, next.callback);
            } else if (next.finalReading) {
                speakFinalReading(next.text, next.callback);
            } else if (next.lineByLine) {
                speakLineByLine(next.text, next.callback);
            } else if (next.fast) {
                speakFast(next.text, next.callback);
            } else {
                speak(next.text, next.callback);
            }
        }
    }

    function speak(text, callback) {
        // Strip parenthetical annotations
        text = text.replace(/\([^)]*\)/g, '').trim();

        if (isSpeaking) {
            voiceQueue.push({ text, callback, fast: false, lineByLine: false });
            return;
        }
        isSpeaking = true;
        expandTextBox();
        startBreathing();

        // Create a sentence element
        const sentence = document.createElement('div');
        sentence.className = 'voice-sentence';
        const container = document.createElement('span');
        sentence.appendChild(container);

        // Add to voice area
        voiceArea.appendChild(sentence);
        if (voiceArea.scrollHeight - voiceArea.scrollTop - voiceArea.clientHeight < 60) voiceArea.scrollTop = voiceArea.scrollHeight;

        // Pre-create character spans wrapped in word containers
        container.innerHTML = '';
        const charSpans = [];
        const words = text.split(/(\s+)/);
        words.forEach(word => {
            if (/^\s+$/.test(word) || word === '') {
                for (const ch of word) {
                    const span = document.createElement('span');
                    span.className = 'materializing-char';
                    span.innerHTML = '&nbsp;';
                    container.appendChild(span);
                    charSpans.push(span);
                }
            } else {
                const wordEl = document.createElement('span');
                wordEl.className = 'word';
                for (const ch of word) {
                    const span = document.createElement('span');
                    span.className = 'materializing-char';
                    span.textContent = ch;
                    wordEl.appendChild(span);
                    charSpans.push(span);
                }
                container.appendChild(wordEl);
            }
        });

        // Build schedule (character timing)
        const chars = text.split('');
        const schedule = [];
        let time = 0;
        let i = 0;

        while (i < chars.length) {
            const char = chars[i];
            let delay = 80 + Math.random() * 70;

            if (char === '.' || char === ',' || char === '!' || char === '?') {
                delay = 300 + Math.random() * 150;
            } else if (char === ' ') {
                delay = 40 + Math.random() * 30;
            } else if (char === '—' || char === ';' || char === ':') {
                delay = 250 + Math.random() * 100;
            }

            let burstSize = 1;
            if (Math.random() < 0.12) {
                burstSize = 2 + Math.floor(Math.random() * 4);
            }

            const burstChars = [];
            for (let b = 0; b < burstSize && i < chars.length; b++) {
                burstChars.push(chars[i]);
                i++;
            }

            burstChars.forEach((c, idx) => {
                const offset = idx * 30 + Math.random() * 25;
                schedule.push({ char: c, time: time + offset });
            });

            const lastChar = burstChars[burstChars.length - 1];
            if (lastChar === '.' || lastChar === ',' || lastChar === '!' || lastChar === '?') {
                time += delay + 200 + Math.random() * 150;
            } else {
                time += delay;
            }
        }

        let scheduledIndex = 0;
        const startTime = Date.now();

        function renderNext() {
            if (scheduledIndex >= schedule.length) {
                sentence.classList.add('visible');
                manageVisibleSentences();
                stopBreathing();

                setTimeout(() => {
                    isSpeaking = false;
                    if (callback) callback();
                    processQueue();
                }, 600);
                return;
            }

            const now = Date.now() - startTime;
            const next = schedule[scheduledIndex];

            if (now >= next.time) {
                const span = charSpans[scheduledIndex];
                if (span) {
                    setTimeout(() => span.classList.add('revealed'), Math.random() * 80);
                }
                scheduledIndex++;
                renderNext();
            } else {
                setTimeout(renderNext, 10);
            }
        }

        setTimeout(renderNext, 300);
    }

    // ============================================================
    // SPEAK FAST — Word-group bursts for long-form content
    // ============================================================

    // ============================================================
    // SPEAK FLOW — word-by-word, ghost-aware (for MT's intake replies)
    // ============================================================

    function speakFlow(text, callback) {
        text = text.replace(/\([^)]*\)/g, '').trim();

        if (isSpeaking) {
            voiceQueue.push({ text, callback, flow: true });
            return;
        }
        isSpeaking = true;
        expandTextBox();
        startBreathing();

        const sentence = document.createElement('div');
        sentence.className = 'voice-sentence';
        const container = document.createElement('span');
        sentence.appendChild(container);
        voiceArea.appendChild(sentence);
        if (voiceArea.scrollHeight - voiceArea.scrollTop - voiceArea.clientHeight < 60) voiceArea.scrollTop = voiceArea.scrollHeight;

        const tokens = text.split(/(\s+)/);
        let tokenIndex = 0;

        function processNextToken() {
            if (tokenIndex >= tokens.length) {
                sentence.classList.add('visible');
                manageVisibleSentences();
                stopBreathing();
                setTimeout(() => {
                    isSpeaking = false;
                    if (callback) callback();
                    if (voiceQueue.length > 0) {
                        const next = voiceQueue.shift();
                        if (next.flow) speakFlow(next.text, next.callback);
                        else if (next.fast) speakFast(next.text, next.callback);
                        else if (next.finalReading) speakFinalReading(next.text, next.callback);
                        else speak(next.text, next.callback);
                    }
                }, 500);
                return;
            }

            const token = tokens[tokenIndex];
            tokenIndex++;

            if (/^\s+$/.test(token) || token === '') {
                container.appendChild(document.createTextNode(token));
                processNextToken();
                return;
            }

            const wordEl = document.createElement('span');
            wordEl.className = 'word';
            for (const ch of token) {
                const span = document.createElement('span');
                span.className = 'materializing-char';
                span.textContent = ch;
                wordEl.appendChild(span);
            }
            container.appendChild(wordEl);
            if (voiceArea.scrollHeight - voiceArea.scrollTop - voiceArea.clientHeight < 60) voiceArea.scrollTop = voiceArea.scrollHeight;

            const charSpans = wordEl.querySelectorAll('.materializing-char');
            charSpans.forEach((span, idx) => {
                setTimeout(() => span.classList.add('revealed'), idx * 22 + Math.random() * 12);
            });

            let delay = 70 + Math.random() * 45;
            const lastChar = token[token.length - 1];
            if (lastChar === '.' || lastChar === '!' || lastChar === '?') {
                delay = 380 + Math.random() * 180;
            } else if (lastChar === ',' || lastChar === ';' || lastChar === ':') {
                delay = 220 + Math.random() * 100;
            } else if (lastChar === '\u2014') {
                delay = 300;
            }

            setTimeout(processNextToken, delay);
        }

        processNextToken();
    }

    function speakFast(text, callback) {
        text = text.replace(/\([^)]*\)/g, '').trim();

        if (isSpeaking) {
            voiceQueue.push({ text, callback, fast: true, lineByLine: false });
            return;
        }
        isSpeaking = true;
        expandTextBox();
        startBreathing();

        const sentence = document.createElement('div');
        sentence.className = 'voice-sentence';
        const container = document.createElement('span');
        sentence.appendChild(container);
        voiceArea.appendChild(sentence);
        if (voiceArea.scrollHeight - voiceArea.scrollTop - voiceArea.clientHeight < 60) voiceArea.scrollTop = voiceArea.scrollHeight;

        // Split text into 2-4 word groups
        const tokens = text.split(/(\s+)/);
        const groups = [];
        let current = '';
        for (const token of tokens) {
            current += token;
            if (/\s/.test(token)) {
                const wordCount = current.split(/\s+/).filter(Boolean).length;
                if (wordCount >= 2 + Math.floor(Math.random() * 3)) {
                    groups.push(current);
                    current = '';
                }
            }
        }
        if (current) groups.push(current);

        let idx = 0;

        function renderNext() {
            if (idx >= groups.length) {
                sentence.classList.add('visible');
                manageVisibleSentences();
                stopBreathing();

                setTimeout(() => {
                    isSpeaking = false;
                    if (callback) callback();
                    processQueue();
                }, 400);
                return;
            }

            const span = document.createElement('span');
            span.className = 'materializing-char';
            span.textContent = groups[idx];
            container.appendChild(span);
            requestAnimationFrame(() => span.classList.add('revealed'));

            idx++;
            setTimeout(renderNext, 30 + Math.random() * 50);
        }

        setTimeout(renderNext, 200);
    }

    // ============================================================
    // SPEAK LINE BY LINE — Natural pacing for final readings
    // ============================================================

    function speakLineByLine(text, callback) {
        text = text.replace(/\([^)]*\)/g, '').trim();

        if (isSpeaking) {
            voiceQueue.push({ text, callback, fast: false, lineByLine: true });
            return;
        }
        isSpeaking = true;
        expandTextBox();
        startBreathing();

        // Split text into sentences or lines
        const lines = text.match(/[^.!?\n]+[.!?]*/g) || [text];
        const cleanLines = lines.map(l => l.trim()).filter(l => l.length > 0);

        let lineIndex = 0;

        function processNextLine() {
            if (lineIndex >= cleanLines.length) {
                // All lines done
                stopBreathing();
                setTimeout(() => {
                    isSpeaking = false;
                    if (callback) callback();
                    processQueue();
                }, 800);
                return;
            }

            const lineText = cleanLines[lineIndex];
            lineIndex++;

            // Create a new sentence element for this line
            const sentence = document.createElement('div');
            sentence.className = 'voice-sentence';
            const container = document.createElement('span');
            sentence.appendChild(container);

            voiceArea.appendChild(sentence);
            if (voiceArea.scrollHeight - voiceArea.scrollTop - voiceArea.clientHeight < 60) voiceArea.scrollTop = voiceArea.scrollHeight;

            // Pre-create character spans
            container.innerHTML = '';
            const charSpans = [];
            const words = lineText.split(/(\s+)/);
            words.forEach(word => {
                if (/^\s+$/.test(word) || word === '') {
                    for (const ch of word) {
                        const span = document.createElement('span');
                        span.className = 'materializing-char';
                        span.innerHTML = '&nbsp;';
                        container.appendChild(span);
                        charSpans.push(span);
                    }
                } else {
                    const wordEl = document.createElement('span');
                    wordEl.className = 'word';
                    for (const ch of word) {
                        const span = document.createElement('span');
                        span.className = 'materializing-char';
                        span.textContent = ch;
                        wordEl.appendChild(span);
                        charSpans.push(span);
                    }
                    container.appendChild(wordEl);
                }
            });

            // Build schedule (slightly faster than default speak for readability)
            const chars = lineText.split('');
            const schedule = [];
            let time = 0;
            let i = 0;

            const baseDelay = 40 + Math.random() * 30;
            const punctuationDelay = 200 + Math.random() * 100;
            const spaceDelay = 20 + Math.random() * 15;

            while (i < chars.length) {
                const char = chars[i];
                let delay = baseDelay;

                if (char === '.' || char === ',' || char === '!' || char === '?') {
                    delay = punctuationDelay;
                } else if (char === ' ') {
                    delay = spaceDelay;
                } else if (char === '—' || char === ';' || char === ':') {
                    delay = punctuationDelay * 0.8;
                }

                let burstSize = 1;
                if (Math.random() < 0.15) {
                    burstSize = 2 + Math.floor(Math.random() * 3);
                }

                const burstChars = [];
                for (let b = 0; b < burstSize && i < chars.length; b++) {
                    burstChars.push(chars[i]);
                    i++;
                }

                burstChars.forEach((c, idx) => {
                    const offset = idx * 20 + Math.random() * 15;
                    schedule.push({ char: c, time: time + offset });
                });

                const lastChar = burstChars[burstChars.length - 1];
                if (lastChar === '.' || lastChar === ',' || lastChar === '!' || lastChar === '?') {
                    time += delay + 150 + Math.random() * 100;
                } else {
                    time += delay;
                }
            }

            let scheduledIndex = 0;
            const startTime = Date.now();

            function renderNextChar() {
                if (scheduledIndex >= schedule.length) {
                    sentence.classList.add('visible');
                    manageVisibleSentences();

                    // Pause before starting the next line
                    setTimeout(processNextLine, 800 + Math.random() * 400);
                    return;
                }

                const now = Date.now() - startTime;
                const next = schedule[scheduledIndex];

                if (now >= next.time) {
                    const span = charSpans[scheduledIndex];
                    if (span) {
                        setTimeout(() => span.classList.add('revealed'), Math.random() * 40);
                    }
                    scheduledIndex++;
                    renderNextChar();
                } else {
                    setTimeout(renderNextChar, 10);
                }
            }

            setTimeout(renderNextChar, 200);
        }

        processNextLine();
    }
    // ============================================================
    // SPEAK FINAL READING — Flowing word-by-word, persistent text
    // ============================================================

    function speakFinalReading(text, callback) {
        text = text.replace(/\([^)]*\)/g, '').trim();

        if (isSpeaking) {
            voiceQueue.push({ text, callback, fast: false, lineByLine: false, finalReading: true });
            return;
        }
        isSpeaking = true;
        expandTextBox();
        startBreathing();

        // ONE single container for the whole final reading
        const sentence = document.createElement('div');
        sentence.className = 'voice-sentence final-reading-sentence';
        sentence.classList.add('visible'); // Instantly visible so it doesn't fade in/out
        
        const container = document.createElement('span');
        sentence.appendChild(container);
        voiceArea.appendChild(sentence);
        if (voiceArea.scrollHeight - voiceArea.scrollTop - voiceArea.clientHeight < 60) voiceArea.scrollTop = voiceArea.scrollHeight;

        // Tokenize by words and whitespace (preserves line breaks and spaces)
        const tokens = text.split(/(\s+)/);
        let tokenIndex = 0;

        function processNextToken() {
            if (tokenIndex >= tokens.length) {
                // All done
                stopBreathing();
                setTimeout(() => {
                    isSpeaking = false;
                    if (callback) callback();
                    processQueue();
                }, 1000);
                return;
            }

            const token = tokens[tokenIndex];
            tokenIndex++;

            // Handle pure whitespace (spaces, newlines)
            if (/^\s+$/.test(token) || token === '') {
                container.appendChild(document.createTextNode(token));
                // Quick transition for spaces, no delay
                processNextToken();
                return;
            }

            // It's a word — create the span
            const wordEl = document.createElement('span');
            wordEl.className = 'word';
            for (const ch of token) {
                const span = document.createElement('span');
                span.className = 'materializing-char';
                span.textContent = ch;
                wordEl.appendChild(span);
            }
            container.appendChild(wordEl);
            if (voiceArea.scrollHeight - voiceArea.scrollTop - voiceArea.clientHeight < 60) voiceArea.scrollTop = voiceArea.scrollHeight;

            // Reveal characters in this word
            const charSpans = wordEl.querySelectorAll('.materializing-char');
            charSpans.forEach((span, idx) => {
                setTimeout(() => {
                    span.classList.add('revealed');
                }, idx * 25 + Math.random() * 15);
            });

            // Determine pause after this word based on punctuation
            let delay = 90 + Math.random() * 60; // Natural word pace
            const lastChar = token[token.length - 1];
            
            if (lastChar === '.' || lastChar === '!' || lastChar === '?') {
                delay = 600 + Math.random() * 300; // Long pause for sentences
            } else if (lastChar === ',' || lastChar === ';' || lastChar === ':') {
                delay = 350 + Math.random() * 150; // Medium pause for clauses
            } else if (lastChar === '—') {
                delay = 450;
            }

            setTimeout(processNextToken, delay);
        }

        processNextToken();
    }
    // ============================================================
    // MANAGE VISIBLE SENTENCES — keep max 3 in the voice area
    // ============================================================

    function manageVisibleSentences() {
        const sentences = voiceArea.querySelectorAll('.voice-sentence');
        const maxVisible = 3;
        const total = sentences.length;

        // Fade older lines instead of removing them — allows the user to scroll back
        sentences.forEach((s, index) => {
            if (index < total - maxVisible) {
                s.classList.add('fading');
            } else {
                s.classList.remove('fading');
            }
        });
    }
    
// --------------------------------------------------------------
// User Sentences
// --------------------------------------------------------------
function addUserSentence(text) {
    const sentence = document.createElement('div');
    sentence.className = 'user-sentence';
    sentence.textContent = text;

    const userMessages = document.getElementById('user-messages');
    const target = userMessages || voiceArea;
    target.appendChild(sentence);

    requestAnimationFrame(() => {
        sentence.classList.add('visible');
    });

    // Manage max-3 visible within the target container
    const siblings = target.querySelectorAll('.user-sentence');
    if (siblings.length > 3) {
        const toRemove = siblings.length - 3;
        for (let i = 0; i < toRemove; i++) {
            const s = siblings[i];
            s.classList.add('fading');
            setTimeout(() => {
                if (s.parentNode) s.parentNode.removeChild(s);
            }, 800);
        }
    }
}

    // --------------------------------------------------------------
    // Cards — Create and manage
    // --------------------------------------------------------------
    function createCards() {
        deckArea.innerHTML = '';
        cards = [];
        for (let i = 0; i < CARD_COUNT; i++) {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.index = i;
            const back = document.createElement('div');
            back.className = 'card-back';
            card.appendChild(back);
            const front = document.createElement('div');
            front.className = 'card-front';
            front.style.transform = 'rotateY(180deg)';
            card.appendChild(front);
            card.style.opacity = '0';
            card.style.transform = 'scale(0.5)';
            deckArea.appendChild(card);
            cards.push(card);
        }
    }



// --------------------------------------------------------------
// LAYOUT ENGINE — Reusable fan/grid layout
// --------------------------------------------------------------
function layOutFan(cardElements, options = {}) {
    const {
        columns = 20,
        spacingX = 18,
        spacingY = 4,
        scale = 0.85,
        arc = true,
        arcAmount = 2.5,
        rotationX = 0.6,
        rotationY = 0.2,
        delayMultiplier = 6,
        opacity = 0.6
    } = options;

    const total = cardElements.length;
    const rows = Math.ceil(total / columns);
    const startX = -(columns - 1) * spacingX / 2;
    const startY = -(rows - 1) * spacingY / 2;
    const centerCol = (columns - 1) / 2;

    cardElements.forEach((card, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = startX + col * spacingX;
        const y = startY + row * spacingY;
        const arcRot = arc
            ? ((col - centerCol) / centerCol) * arcAmount
            : (col - columns / 2) * rotationX;
        const rot = arcRot + (row - rows / 2) * rotationY;
        const delay = i * delayMultiplier;
        setTimeout(() => {
            card.style.transform =
                `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
            card.style.opacity = opacity.toString();
        }, delay);
    });
}

function pourDown(callback) {
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

function fanCards() {
    layOutFan(cards, {
        columns: 20,
        spacingX: 18,
        spacingY: 4,
        scale: 0.85,
        arc: true,
        arcAmount: 2.5,
        delayMultiplier: 6,
        opacity: 0.6
    });
}

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

        // Phase 3: Hold the stack visibly for 800ms with CSS pulse animation
        const stackFormedTime = duration + 300 + total * 2;
        setTimeout(() => {
            cards.forEach((card) => {
                card.style.setProperty('--stack-rot', `${Math.random() * 2 - 1}deg`);
                card.classList.add('stack-pulse');
            });
            setTimeout(() => {
                cards.forEach(card => card.classList.remove('stack-pulse'));
                if (callback) callback();
            }, 800);
        }, stackFormedTime);
    }, duration + 300);
}

// --------------------------------------------------------------
// Deal From Deck — Replaces spreadAndReveal
// --------------------------------------------------------------
function dealFromDeck(spreadData, cardLines, threadText, callback) {
    if (!spreadData || spreadData.length === 0) {
        console.error('No spread data provided');
        return;
    }

    cardLinesData = cardLines || {};
    threadTextData = threadText || '';

    const positions = [
        { label: 'Past', offsetX: -180, offsetY: 0, rot: -4 },
        { label: 'Present', offsetX: 0, offsetY: 0, rot: 0 },
        { label: 'Future', offsetX: 180, offsetY: 0, rot: 4 }
    ];

    const cardRefs = [];
    const dealtCards = cards.slice(-3);
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
            cursor: pointer;
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
            card: card,
            base_line: spreadData[index].base_line || ''
        });
    });

    let flippedLocal = 0;

    // Animate deal: move 3 cards to positions
    setTimeout(() => {
        cardRefs.forEach((item, idx) => {
            setTimeout(() => {
                item.el.style.opacity = '1';
                item.el.style.transform = `translate(${item.pos.offsetX}px, ${item.pos.offsetY}px) rotate(${item.pos.rot}deg) scale(1)`;
                item.el.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6), 0 0 40px rgba(212,175,55,0.1)';
                item.el.style.pointerEvents = 'auto';
                item.el.style.cursor = 'pointer';

                item.el.addEventListener('click', () => {
                    if (item.el.dataset.flipped === 'true') return;
                    if (cardClickLocked) return;

                    item.el.dataset.flipped = 'true';
                    cardClickLocked = true;

                    flipCard(item.el, item.label, item.card);

                    // Instant base line — snaps in on click
                    wipeVoiceBox();
                    appendBaseLine(item.card.name, item.base_line || '');

                    // MT's interpretation streams in immediately after
                    const line = cardLinesData[item.label] || 'The card is silent.';
                    speakFast(line, () => {
                        flippedLocal += 1;
                        cardClickLocked = false;

                        if (flippedLocal === 3) {
                            appendPromptLine();
                            candleAction = 'reveal-thread';
                            const candle = document.getElementById('candle-container');
                            if (candle) {
                                candle.classList.add('waiting');
                                candle.style.cursor = 'pointer';
                                candle.style.pointerEvents = 'auto';
                                candle.removeEventListener('click', handleCandleClick);
                                isAwaitingCandleClick = true;
                                candleClickTriggered = false;
                                candle.addEventListener('click', handleCandleClick);
                            }
                            interactionHint.textContent = '— click the candle when you are ready —';
                            interactionHint.classList.add('visible', 'clickable');
                        }
                    });
                });
            }, idx * 250);
        });
    }, 300);
}

    // --------------------------------------------------------------
    // Flip Card
    // --------------------------------------------------------------
    function flipCard(cardEl, label, cardData) {
        cardEl.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
        const currentTransform = cardEl.style.transform;
        cardEl.style.transform = currentTransform + ' rotateY(180deg)';
        cardEl.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6), 0 0 60px rgba(212,175,55,0.15)';

        // DO NOT modify the front's transform — the parent flip will cancel its 180deg
        // No front.style.transform changes

        brightenCandle();
        console.log(`🃏 ${label}: ${cardData.name} (ID: ${cardData.id})`);
    }

    // --------------------------------------------------------------
    // Card Highlighting — Triggered by reading text
    // --------------------------------------------------------------
    function highlightCard(cardName) {
        const cards = deckArea.querySelectorAll('.card.reveal-card');
        let found = false;
        cards.forEach(card => {
            const name = card.dataset.cardName;
            if (name && name.toLowerCase() === cardName.toLowerCase()) {
                card.classList.add('highlight');
                found = true;
                setTimeout(() => {
                    card.classList.remove('highlight');
                }, 1600);
            }
        });
        if (!found) {
            // Try partial match
            cards.forEach(card => {
                const name = card.dataset.cardName;
                if (name && name.toLowerCase().includes(cardName.toLowerCase())) {
                    card.classList.add('highlight');
                    setTimeout(() => {
                        card.classList.remove('highlight');
                    }, 1600);
                }
            });
        }
    }

    // --------------------------------------------------------------
    // Name Gate
    // --------------------------------------------------------------
    function showNameGate() {
        nameGate.classList.add('active');
        nameInput.focus();
    }

    function hideNameGate() {
        nameGate.classList.remove('active');
    }

    function handleNameSubmit() {
        const name = nameInput.value.trim();
        querentName = name || null;
        hideNameGate();

        // Continue with greeting
        const greeting = getRandomGreeting();
        if (querentName) {
            speak(`Ah, ${querentName}. ${greeting}`, () => {
                proceedToIntake();
            });
        } else {
            speak(`A name is a story you are not ready to tell. The room knows you anyway. ${greeting}`, () => {
                proceedToIntake();
            });
        }
    }

    function proceedToIntake() {
        pourDown();
        brightenCandle();
        setTimeout(() => {
            interactionHint.classList.add('visible');
            interactionHint.textContent = '— touch the flame when you are ready —';

            isAwaitingCandleClick = true;
            candleClickTriggered = false;

            const readyQuestion = READY_QUESTIONS[Math.floor(Math.random() * READY_QUESTIONS.length)];
            speak(readyQuestion, () => {
                const candle = document.getElementById('candle-container');
                if (candle) {
                    candle.style.cursor = 'pointer';
                    candle.style.pointerEvents = 'auto';
                    candle.classList.add('waiting');
                    candle.removeEventListener('click', handleCandleClick);
                    candle.addEventListener('click', handleCandleClick);
                    console.log('🕯️ Candle click enabled');
                }
            });
        }, 600);
    }

    // --------------------------------------------------------------
    // Entry — With Name Gate & Debug Logs
    // --------------------------------------------------------------
    function transitionToRoom() {
        if (entryTriggered) return;
        entryTriggered = true;

        console.log('🔄 transitionToRoom started');

        threshold.classList.remove('active');
        showCandle();

        // Make sure room element exists
        if (!room) {
            console.error('❌ Room element not found!');
            return;
        }

        setTimeout(() => {
            room.classList.add('visible');
            console.log('✅ Room class "visible" added. Current classes:', room.classList);
            // Also force display if needed
            room.style.opacity = '1';
            room.style.pointerEvents = 'auto';
        }, 400);

        createCards();
        console.log('🃏 Cards created');

        setTimeout(() => {
            console.log('📛 Showing name gate');
            showNameGate();

        // Handle name input on Enter
        nameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                handleNameSubmit();
            }
        });

        // Handle click on the submit arrow only — NOT the whole gate
        const nameGateArrow = nameGate.querySelector('.name-gate-arrow');
        if (nameGateArrow) {
            nameGateArrow.addEventListener('click', function(e) {
                e.stopPropagation();
                handleNameSubmit();
            });
        }

        // Allow clicking on the input field to focus it
        nameInput.addEventListener('click', function(e) {
            e.stopPropagation();
            // Input will naturally focus
        });

        // Prevent the name gate from closing on click
        nameGate.addEventListener('click', function(e) {
            // Only close if clicking on the background, not on the input
            if (e.target === nameGate || e.target === nameGate.querySelector('.name-gate-text')) {
                return;
            }
        });
        }, 800);
    }

    function enterRoom() {
        console.log('🚪 enterRoom called');
        transitionToRoom();
    }
    // --------------------------------------------------------------
    // CANDLE CLICK HANDLER
    // --------------------------------------------------------------
    function handleCandleClick(e) {
        e.stopPropagation();
        console.log('🕯️ Candle clicked', { isAwaitingCandleClick, candleClickTriggered });

        if (!isAwaitingCandleClick || candleClickTriggered) {
            console.log('⚠️ Click ignored - not waiting or already triggered');
            return;
        }

        candleClickTriggered = true;
        console.log('🔥 Candle ritual triggered!');

        const colour = CANDLE_COLOURS[Math.floor(Math.random() * CANDLE_COLOURS.length)];
        const flame = document.getElementById('flame');
        if (flame) {
            const originalShadow = flame.style.boxShadow;
            flame.style.boxShadow = `0 0 80px ${colour.shadow}, 0 0 160px ${colour.glow}`;
            flame.style.filter = `hue-rotate(${Math.random() * 60 - 30}deg)`;
            setTimeout(() => {
                flame.style.boxShadow = originalShadow || '0 0 80px rgba(255,180,50,0.6), 0 0 160px rgba(255,120,20,0.3)';
                flame.style.filter = 'none';
            }, 800);
        }

        brightenCandle();

        const candle = document.getElementById('candle-container');
        if (candle) {
            candle.classList.remove('waiting');
            candle.style.cursor = 'default';
            candle.style.pointerEvents = 'none';
            candle.removeEventListener('click', handleCandleClick);
        }

        isAwaitingCandleClick = false;

        const acknowledgements = [
            "I see. Let us begin.",
            "Good. The cards are waiting.",
            "Ah. Now we can truly begin.",
            "Excellent. Let's see what the cards have to say.",
            "The candle knows. Let's look at the cards.",
            "I feel it too. Let's begin."
        ];
        const ack = acknowledgements[Math.floor(Math.random() * acknowledgements.length)];

        if (candleAction === 'reveal-thread') {
            candleAction = 'start-intake';
            wipeVoiceBox();
            // Speak the thread, then enter the closing state
            speakFinalReading(threadTextData, () => {
                interactionHint.classList.remove('visible');
                enterClosingState();
            });
            return;
        }

        speak(ack, () => {
            currentState = 'intake';
            startIntake();
        });
    }

    // --------------------------------------------------------------
    // CANDLE SETUP
    // --------------------------------------------------------------
    function setupCandleClick() {
        const candle = document.getElementById('candle-container');
        if (!candle) {
            console.warn('⚠️ Candle not found for setup');
            return;
        }
        candle.removeEventListener('click', handleCandleClick);
        candle.addEventListener('click', handleCandleClick);
        console.log('🕯️ Candle click setup complete');
    }

    // --------------------------------------------------------------
    // BACKEND INTEGRATION
    // --------------------------------------------------------------

    function showThinkingState() {
    const voiceArea = document.getElementById('voice-text');
    if (voiceArea) {
        const thinking = document.createElement('div');
        thinking.className = 'voice-sentence thinking-dots';
        thinking.id = 'thinking-indicator';
        thinking.textContent = '...';
        voiceArea.appendChild(thinking);
        startBreathing();
    }
}

function hideThinkingState() {
    const thinking = document.getElementById('thinking-indicator');
    if (thinking) thinking.remove();
    stopBreathing();
}


    async function startIntake() {
        try {
            const response = await fetch('/api/intake/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: SESSION_ID })
            });
            const data = await response.json();
            if (data.opener) {
                speakFlow(data.opener, () => {
                    showUserInput();
                });
            }
        } catch (e) {
            console.error('Failed to start intake:', e);
            speak('There is an object on the table between us. What is it?', () => {
                showUserInput();
            });
        }
    }

    async function sendUserMessage(message) {
        console.log('📨 Sending user message:', message);
        showThinkingState();
        try {
            const response = await fetch('/api/intake/turn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: SESSION_ID,
                    message: message
                })
            });
            const data = await response.json();
            console.log('📨 Raw reply from backend:', data);
            hideThinkingState();

            if (data.error) {
                console.error('Intake error:', data.error);
                speak('I am sorry, I did not catch that. Could you say it again?');
                showUserInput();
                return;
            }

            if (data.is_complete) {
                sketchData = data.sketch || '';
                currentState = 'reading';
                speak('I have heard enough. Let us look at the cards.', () => {
                    startReading();
                });
            } else {
                speakFlow(data.reply, () => {
                    showUserInput();
                });
            }
        } catch (e) {
            console.error('Failed to send message:', e);
            hideThinkingState();
            speak('I am sorry, something has stirred the air. Let us try again.');
            showUserInput();
        }
    }

    async function startReading() {
        try {
            console.log('📖 startReading called');
            console.log('📖 sketchData:', sketchData);

            // Show shuffle message and start wander
            const shuffleAdj = SHUFFLE_ADJECTIVES[Math.floor(Math.random() * SHUFFLE_ADJECTIVES.length)];
            interactionHint.textContent = '— the cards shuffle, ' + shuffleAdj + ' —';
            interactionHint.classList.add('visible');
            const wanderController = startShuffleWander();

            // 2. Generate the reading
            const fetchStart = Date.now();
            const response = await fetch('/api/reading/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sketch: sketchData || 'A quiet presence at the table.',
                    spread: []
                })
            });
            const data = await response.json();
            console.log('📖 API response:', data);

            if (!data || !data.thread) {
                console.error('📖 No thread in response:', data);
                speak('The cards are silent tonight. Perhaps another time.');
                interactionHint.textContent = '— the reading is complete —';
                return;
            }

            console.log('📖 Reading found, length:', data.thread.length);
            currentState = 'complete';
            spreadData = data.spread;

            // Store card lines and thread for later use
            cardLinesData = data.card_lines || {};
            threadTextData = data.thread;

            // LLM has returned — end the wander and converge
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
            });
        } catch (e) {
            console.error('📖 Failed to generate reading:', e);
            speak('The cards are not speaking clearly. Let us sit with the silence.');
            interactionHint.textContent = '— the reading is complete —';
            interactionHint.classList.add('visible');
        }
    }

    // --------------------------------------------------------------
    // Closing state — appears after thread ends
    // --------------------------------------------------------------
    function enterClosingState() {
        const closing = document.getElementById('closing-options');
        if (closing) {
            closing.classList.add('active');
        }

        const btnTake = document.getElementById('btn-take');
        const btnSnuff = document.getElementById('btn-snuff');

        if (btnTake && !btnTake.dataset.wired) {
            btnTake.dataset.wired = '1';
            btnTake.addEventListener('click', handleTakeReading);
        }
        if (btnSnuff && !btnSnuff.dataset.wired) {
            btnSnuff.dataset.wired = '1';
            btnSnuff.addEventListener('click', handleSnuff);
        }
    }

    // --------------------------------------------------------------
    // Download generator — self-contained HTML artifact
    // --------------------------------------------------------------
    async function imageToDataURL(url) {
        try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.warn('Could not embed image:', url, e);
            return '';
        }
    }

    function escapeHTML(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async function handleTakeReading() {
        const btnTake = document.getElementById('btn-take');
        if (btnTake) {
            btnTake.disabled = true;
            btnTake.textContent = '[ gathering… ]';
        }

        try {
            const now = new Date();
            const stamp = now.toISOString().slice(0, 10);
            const readableDate = now.toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            const name = querentName ? escapeHTML(querentName) : 'a visitor';
            const sketch = escapeHTML(sketchData || '');
            const thread = escapeHTML(threadTextData || '');

            const cardsHTML = [];
            if (spreadData && spreadData.length) {
                for (let i = 0; i < spreadData.length; i++) {
                    const entry = spreadData[i];
                    const card = entry.card;
                    const imgPath = entry.image_path || '';
                    const dataURL = await imageToDataURL(imgPath);
                    const baseLine = escapeHTML(entry.base_line || '');
                    const imgTag = dataURL
                        ? '<img src="' + dataURL + '" alt="' + escapeHTML(card.name) + '">'
                        : '<div class="no-img">' + escapeHTML(card.name) + '</div>';
                    cardsHTML.push(
                        '<figure class="card">' +
                            imgTag +
                            '<figcaption>' +
                                '<div class="card-name">' + escapeHTML(card.name) + '</div>' +
                                (baseLine ? '<div class="card-line">' + baseLine + '</div>' : '') +
                            '</figcaption>' +
                        '</figure>'
                    );
                }
            }

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TarocchAI — a reading for ${name}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0a0604;
    color: #d9d0c1;
    font-family: 'IBM Plex Mono', 'Courier New', monospace;
    padding: 6vh 8vw;
    line-height: 1.7;
  }
  .header { text-align: center; margin-bottom: 5vh; }
  .header h1 {
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    font-style: italic;
    font-weight: 300;
    font-size: 1.5rem;
    color: #d4af37;
    letter-spacing: 0.1em;
  }
  .header .sub { font-size: 0.85rem; color: #a89880; margin-top: 1rem; }
  .sketch {
    font-style: italic;
    color: #a89880;
    border-left: 2px solid rgba(184,155,75,0.4);
    padding-left: 1.2rem;
    margin-bottom: 6vh;
    font-size: 0.95rem;
  }
  .cards { display: flex; gap: 2rem; justify-content: center; flex-wrap: wrap; margin-bottom: 6vh; }
  .card { flex: 0 0 auto; width: 180px; text-align: center; }
  .card img { width: 100%; height: auto; border-radius: 4px; border: 1px solid rgba(184,155,75,0.4); }
  .card .no-img { padding: 2rem; border: 1px solid rgba(184,155,75,0.3); border-radius: 4px; }
  .card-name { font-size: 0.8rem; color: #d4af37; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0.8rem; }
  .card-line { font-size: 0.75rem; color: #a89880; margin-top: 0.4rem; font-style: italic; }
  .thread { font-size: 1rem; white-space: pre-wrap; }
  .thread p { margin-bottom: 1.4rem; }
  .footer { margin-top: 8vh; text-align: center; font-size: 0.75rem; color: #6a5a45; letter-spacing: 0.15em; }
</style>
</head>
<body>
  <header class="header">
    <h1>A reading for ${name}</h1>
    <div class="sub">${escapeHTML(readableDate)}</div>
  </header>
  <p class="sketch">${sketch}</p>
  <div class="cards">${cardsHTML.join('')}</div>
  <div class="thread">${thread.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>
  <div class="footer">TarocchAI</div>
</body>
</html>`;

            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tarocchai-reading-' + stamp + '.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);

            if (btnTake) {
                btnTake.disabled = false;
                btnTake.textContent = '[ taken ]';
                setTimeout(() => { btnTake.textContent = '[ take it with you ]'; }, 3000);
            }
        } catch (e) {
            console.error('Download failed:', e);
            if (btnTake) {
                btnTake.disabled = false;
                btnTake.textContent = '[ could not gather ]';
                setTimeout(() => { btnTake.textContent = '[ take it with you ]'; }, 3000);
            }
        }
    }

    // --------------------------------------------------------------
    // Snuff — exit sequence
    // --------------------------------------------------------------
    function handleSnuff() {
        const candle = document.getElementById('candle-container');
        const overlay = document.getElementById('exit-overlay');

        // 1. Flicker the flame
        if (candle) candle.classList.add('snuff-flicker');

        // 2. At 200ms, snuff and spawn smoke
        setTimeout(() => {
            if (candle) {
                candle.classList.remove('snuff-flicker');
                candle.classList.add('snuffed');

                const puff = document.createElement('div');
                puff.className = 'flame-smoke';
                candle.appendChild(puff);
                requestAnimationFrame(() => puff.classList.add('rising'));
            }
        }, 200);

        // 3. At 500ms, fade to black
        setTimeout(() => {
            if (overlay) overlay.classList.add('active');
        }, 500);

        // 4. At 2400ms, reload to Threshold
        setTimeout(() => {
            window.location.reload();
        }, 2400);
    }

    function replaceVoiceContent(text) {
        voiceArea.innerHTML = '';
        const sentence = document.createElement('div');
        sentence.className = 'voice-sentence visible';
        sentence.textContent = text;
        voiceArea.appendChild(sentence);
    }

    function wipeVoiceBox() {
        voiceArea.innerHTML = '';
    }

    function appendPromptLine() {
        const prompt = document.createElement('div');
        prompt.className = 'prompt-line';
        prompt.textContent = "The three have spoken. Now they rest together, and their voices become one. When you are ready to hear them as a single breath, let the flame know.";
        voiceArea.appendChild(prompt);
        requestAnimationFrame(() => prompt.classList.add('visible'));
    }

    function appendBaseLine(cardName, baseLine) {
    const el = document.createElement('div');
    el.className = 'base-line';
    el.textContent = `${cardName} — ${baseLine}`;
    voiceArea.appendChild(el);
    }

    // --------------------------------------------------------------
    // CARD HIGHLIGHTING
    // --------------------------------------------------------------
    function scheduleHighlights(readingText, callback) {
        // Parse the reading for card names
        const cardNames = [];
        const cardNamePattern = /(?:The\s+)?(\w+)\s+of\s+(\w+)|(The\s+(?:Fool|Magician|High\s+Priestess|Empress|Emperor|Hierophant|Lovers|Chariot|Strength|Hermit|Wheel\s+of\s+Fortune|Justice|Hanged\s+Man|Death|Temperance|Devil|Tower|Star|Moon|Sun|Judgement|World))/gi;
        let match;
        while ((match = cardNamePattern.exec(readingText)) !== null) {
            let name = match[0];
            if (name.startsWith('The ')) {
                name = name.substring(4);
            }
            cardNames.push({
                name: name,
                position: match.index,
                text: match[0]
            });
        }

        // Schedule highlights based on position
        const totalLength = readingText.length;
        const totalTime = readingText.length * 120; // Approximate speech time

        cardNames.forEach((card, index) => {
            const delay = (card.position / totalLength) * totalTime;
            setTimeout(() => {
                console.log('🃏 Highlighting card:', card.name);
                highlightCard(card.name);
            }, delay);
        });
    }

    // --------------------------------------------------------------
    // User Input
    // --------------------------------------------------------------
    function showUserInput() {
        userInputArea.classList.add('active');
        userInput.focus();
        interactionHint.classList.remove('visible');
    }

    function hideUserInput() {
        userInputArea.classList.remove('active');
    }

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const message = userInput.value.trim();
            if (message) {
                hideUserInput();
                userInput.value = '';
                addUserSentence(message);
                // If a speak is in flight, wait one frame for isSpeaking to clear
                const dispatch = () => {
                    if (isSpeaking) {
                        setTimeout(dispatch, 50);
                    } else {
                        sendUserMessage(message);
                    }
                };
                dispatch();
            }
        }
    });

    userInput.addEventListener('click', () => {
        userInput.focus();
    });

    // Override the interaction flow
    function startInteraction() {
        if (!isReadyForInteraction) return;
        isReadyForInteraction = false;
        interactionHint.classList.remove('clickable');
        interactionHint.textContent = '— the cards are listening —';
        currentState = 'intake';
        startIntake();
    }

    // --------------------------------------------------------------
    // Init
    // --------------------------------------------------------------
    function init() {
        setupCandleClick();

        // Show candle early
        setTimeout(() => {
            candleContainer.classList.add('visible');
            candleLight.classList.add('visible');
        }, 1000);

        // Threshold text evolves
        setTimeout(() => {
            const waitText = document.querySelector('.wait-text');
            if (waitText) {
                waitText.textContent = 'A room is waiting...';
                waitText.style.opacity = '0.5';
            }
        }, 4000);

        // Auto-enter after 7s
        setTimeout(() => {
            if (!entryTriggered) enterRoom();
        }, 7000);

        // Click to enter
        document.addEventListener('click', () => {
            if (!entryTriggered && scene === 'threshold') {
                scene = 'entering';
                enterRoom();
            }
            if (isReadyForInteraction) {
                startInteraction();
            }
        });

        // Mouse move
        let mouseMoved = false;
        document.addEventListener('mousemove', () => {
            if (!mouseMoved && !entryTriggered && scene === 'threshold') {
                mouseMoved = true;
                const waitText = document.querySelector('.wait-text');
                if (waitText) {
                    waitText.textContent = 'You are sensed...';
                    waitText.style.opacity = '0.7';
                }
                setTimeout(() => {
                    if (!entryTriggered && scene === 'threshold') {
                        scene = 'entering';
                        enterRoom();
                    }
                }, 1200);
            }
        });

        // Click on hint
        interactionHint.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isReadyForInteraction) {
                startInteraction();
            }
        });
    }

    // --------------------------------------------------------------
    // Start
    // --------------------------------------------------------------
    scene = 'threshold';
    init();

    console.log('🜁 TarocchAI — Liminal Room (v4)');
    console.log('🔮 Madame Tarocchai is waiting for you...');
    console.log('🜁 TarocchAI — Backend Integration Ready');
    console.log('🔮 Session ID:', SESSION_ID);

    // Fallback: force entry after 4 seconds if not triggered
    setTimeout(() => {
        if (!entryTriggered) {
            console.warn('⚠️ Auto‑entry fallback triggered');
            enterRoom();
        }
    }, 4000);

});  // End of DOMContentLoaded

    // --------------------------------------------------------------
    // Mobile keyboard detection — keeps input above on-screen keyboard
    // --------------------------------------------------------------
    if (window.visualViewport) {
        const setKbHeight = () => {
            const vv = window.visualViewport;
            const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
            document.documentElement.style.setProperty('--kb-height', kb + 'px');
        };
        window.visualViewport.addEventListener('resize', setKbHeight);
        window.visualViewport.addEventListener('scroll', setKbHeight);
        setKbHeight();
    }

    // --------------------------------------------------------------
    // WebSocket keep-alive — prevents Cloudflare Tunnel idle-close
    // --------------------------------------------------------------
    setInterval(() => {
        fetch('/', { method: 'HEAD', cache: 'no-store' }).catch(() => {});
    }, 45000);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            fetch('/', { method: 'HEAD', cache: 'no-store' }).catch(() => {});
        }
    });