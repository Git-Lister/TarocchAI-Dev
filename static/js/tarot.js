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
            madameArea.style.height = '45vh';
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
        "The photograph on the table... I think you know who it is."
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

    function speak(text, callback) {
        // Strip parenthetical annotations
        text = text.replace(/\([^)]*\)/g, '').trim();

        if (isSpeaking) {
            voiceQueue.push({ text, callback });
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

        // Pre-create character spans wrapped in word containers to prevent mid-word line breaks
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

        // Build schedule (same timing logic as before)
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
                    if (voiceQueue.length > 0) {
                        const next = voiceQueue.shift();
                        speak(next.text, next.callback);
                    }
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
            card: card
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

                    setTimeout(() => {
                        wipeVoiceBox();
                        const line = cardLinesData[item.label] || 'The card is silent.';
                        speak(line, () => {
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
                                    candle.addEventListener('click', handleCandleClick);
                                }
                                interactionHint.textContent = '— click the candle when you are ready —';
                                interactionHint.classList.add('visible', 'clickable');
                            }
                        });
                    }, 900);
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
        fanCards();
        brightenCandle();
        setTimeout(() => {
            interactionHint.classList.add('visible');
            interactionHint.textContent = '— speak when you are ready —';

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

        threshold.classList.add('hidden');
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
            speak(threadTextData, () => {
                interactionHint.textContent = '— the reading is complete —';
                interactionHint.classList.add('visible');
                setTimeout(contractTextBox, 3000);
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
                speak(data.opener, () => {
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
                speak(data.reply, () => {
                    showUserInput();
                });
            }
        } catch (e) {
            console.error('Failed to send message:', e);
            speak('I am sorry, something has stirred the air. Let us try again.');
            showUserInput();
        }
    }

    async function startReading() {
        try {
            console.log('📖 startReading called');
            console.log('📖 sketchData:', sketchData);

            // Show thinking state
            showThinkingState();
            interactionHint.textContent = '— Madame Tarocchai is reading the cards... —';
            interactionHint.classList.add('visible');

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

            // Channeling state: minimum 2.5s hold during LLM latency
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
            });
        } catch (e) {
            console.error('📖 Failed to generate reading:', e);
            speak('The cards are not speaking clearly. Let us sit with the silence.');
            interactionHint.textContent = '— the reading is complete —';
            interactionHint.classList.add('visible');
        }
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