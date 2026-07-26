// ============================================================
// TAROCCHAI — Liminal Room (v3) — DOM‑ready wrapper
// ============================================================

document.addEventListener('DOMContentLoaded', function() {

    // DOM refs
    const threshold = document.getElementById('threshold');
    const room = document.getElementById('room');
    const candleLight = document.getElementById('candle-light');
    const candleContainer = document.getElementById('candle-container');
    const deckArea = document.getElementById('deck-area');
    const voiceText = document.getElementById('voice-text');
    const voiceContent = document.getElementById('voice-content');
    const interactionHint = document.getElementById('interaction-hint');
    const userInputArea = document.getElementById('user-input-area');
    const userInput = document.getElementById('user-input');

    // Guard against missing elements
    if (!threshold || !room || !candleLight || !candleContainer || !deckArea || !voiceText || !voiceContent || !interactionHint || !userInputArea || !userInput) {
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

    const CARD_COUNT = 78;

    // ============================================================
    // MADAME TAROCCHAI'S GREETINGS (Randomized)
    // ============================================================

    const GREETINGS = [
        "Let us sit quietly for a moment.",
        "The room knows you are here.",
        "I have been expecting you.",
        "Come, sit. The cards have been waiting.",
        "The silence is warm tonight.",
        "You arrived just as the candle flickered.",
        "I was just thinking of you.",
        "There is a presence in the room tonight. It knows you.",
        "The velvet knows your weight already.",
        "Sit. Let the shadows settle.",
        "I have heard your footsteps for a while now.",
        "The cards stirred when you entered.",
        "Let the quiet hold us both.",
        "You are not late. You are exactly on time.",
        "The room has been waiting for you to return.",
        "I see you have brought something with you. Leave it by the door.",
        "The candle knows your name.",
        "Sit with me. Let the questions rise on their own.",
        "The air changes when you enter. I noticed.",
        "Let us sit in the dark together for a moment.",
        "The shadows are restless tonight. They know you.",
        "I was just looking at the cards when you arrived.",
        "The door is never locked. You found it anyway.",
        "Sit. Let the words find their own way.",
        "The silence here is different. You will notice.",
        "I have been sitting here since you last thought of me.",
        "The cards are warm tonight. They have been handled.",
        "There is a question in the room. I can feel it.",
        "Let the quiet do its work.",
        "You came with a question. It is already here.",
        "The candle is burning low. There is time.",
        "I have seen you in the cards before. You are not a stranger.",
        "Sit. Let the night hold us both.",
        "The teacup is cold now. I will pour more.",
        "The cards know your name. I do not need to ask."
    ];

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
    // READY QUESTIONS (Random)
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
    // SPEAK — Slow Materializing Text (Melt Effect)
    // ============================================================

    function speak(text, callback) {
        if (isSpeaking) {
            voiceQueue.push({ text, callback });
            return;
        }
        isSpeaking = true;

        // Show the voice area
        const voiceArea = document.getElementById('voice-text');
        voiceArea.classList.add('visible');

        // Clear the container
        const container = document.getElementById('voice-content');
        container.innerHTML = '';

        // Split text into characters
        const chars = text.split('');
        const schedule = [];
        let time = 0;
        let i = 0;

        while (i < chars.length) {
            const char = chars[i];

            // Base delay — slower overall (80-150ms base)
            let delay = 80 + Math.random() * 70;

            // Longer pauses at punctuation
            if (char === '.' || char === ',' || char === '!' || char === '?') {
                delay = 300 + Math.random() * 150;
            } else if (char === ' ') {
                delay = 40 + Math.random() * 30;
            } else if (char === '—' || char === ';' || char === ':') {
                delay = 250 + Math.random() * 100;
            }

            // Random bursts — small groups appear together (2-5 chars)
            let burstSize = 1;
            if (Math.random() < 0.12) {
                burstSize = 2 + Math.floor(Math.random() * 4);
            }

            const burstChars = [];
            for (let b = 0; b < burstSize && i < chars.length; b++) {
                burstChars.push(chars[i]);
                i++;
            }

            // Schedule each character with slight offset within burst
            burstChars.forEach((c, idx) => {
                const offset = idx * 30 + Math.random() * 25;
                schedule.push({
                    char: c,
                    time: time + offset,
                });
            });

            // Extra pause after punctuation
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
                // All characters rendered
                setTimeout(() => {
                    isSpeaking = false;
                    if (callback) callback();
                    if (voiceQueue.length > 0) {
                        const next = voiceQueue.shift();
                        speak(next.text, next.callback);
                    }
                }, 800);
                return;
            }

            const now = Date.now() - startTime;
            const next = schedule[scheduledIndex];

            if (now >= next.time) {
                const span = document.createElement('span');
                span.className = 'materializing-char';
                if (next.char === ' ') {
                    span.innerHTML = '&nbsp;';
                } else {
                    span.textContent = next.char;
                }
                container.appendChild(span);

                // Trigger reveal with slight random delay (adds organic feel)
                const revealDelay = Math.random() * 80;
                setTimeout(() => {
                    span.classList.add('revealed');
                }, revealDelay);

                scheduledIndex++;
                renderNext();
            } else {
                setTimeout(renderNext, 10);
            }
        }

        // Start the rendering after a short pause (200ms)
        setTimeout(renderNext, 300);
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
            card.style.opacity = '0';
            card.style.transform = 'scale(0.5)';
            deckArea.appendChild(card);
            cards.push(card);
        }
    }

    function fanCards() {
        const total = cards.length;
        const columns = 8;
        const rows = Math.ceil(total / columns);
        const spacingX = 14;
        const spacingY = 18;
        const startX = -(columns - 1) * spacingX / 2;
        const startY = -(rows - 1) * spacingY / 2;

        cards.forEach((card, i) => {
            const col = i % columns;
            const row = Math.floor(i / columns);
            const x = startX + col * spacingX;
            const y = startY + row * spacingY;
            const rot = (col - columns / 2) * 0.8 + (row - rows / 2) * 0.3;
            const delay = i * 10;
            setTimeout(() => {
                card.style.transform =
                    `translate(${x}px, ${y}px) rotate(${rot}deg) scale(0.85)`;
                card.style.opacity = '0.6';
            }, delay);
        });
    }

    // --------------------------------------------------------------
    // Shuffle Animation
    // --------------------------------------------------------------
    function shuffleCards(callback) {
        const total = cards.length;
        const steps = 40;
        const duration = 3000;

        for (let step = 0; step < steps; step++) {
            setTimeout(() => {
                cards.forEach((card, i) => {
                    if (Math.random() > 0.75) {
                        const x = (Math.random() - 0.5) * 400;
                        const y = (Math.random() - 0.5) * 250;
                        const rot = (Math.random() - 0.5) * 80;
                        card.style.transform =
                            `translate(${x}px, ${y}px) rotate(${rot}deg) scale(0.4)`;
                        card.style.opacity = '0.3';
                    }
                });
            }, step * 40);
        }

        setTimeout(() => {
            cards.forEach((card, i) => {
                const offsetX = (Math.random() - 0.5) * 6;
                const offsetY = (Math.random() - 0.5) * 6;
                const rot = (Math.random() - 0.5) * 2;
                const delay = i * 3;
                setTimeout(() => {
                    card.style.transform =
                        `translate(${offsetX}px, ${offsetY}px) rotate(${rot}deg) scale(0.6)`;
                    card.style.opacity = '0.4';
                }, delay);
            });

            setTimeout(() => {
                for (let i = 0; i < cards.length - 3; i++) {
                    cards[i].style.opacity = '0';
                }
                for (let i = 0; i < 3; i++) {
                    const idx = cards.length - 1 - i;
                    const card = cards[idx];
                    card.style.opacity = '0.7';
                    card.style.transform =
                        `translate(${(i - 1) * 2}px, ${(i - 1) * 1}px) rotate(${i * 0.5}deg) scale(0.6)`;
                }
                if (callback) callback();
            }, 300);
        }, duration + 500);
    }

    // --------------------------------------------------------------
    // Spread and Reveal — With Real Card Images (Fixed)
    // --------------------------------------------------------------
    function spreadAndReveal(spreadData, callback) {
        if (!spreadData || spreadData.length === 0) {
            console.error('No spread data provided');
            return;
        }

        deckArea.innerHTML = '';

        const positions = [
            { label: 'Past', offsetX: -120, offsetY: 0, rot: -3 },
            { label: 'Present', offsetX: 0, offsetY: 0, rot: 0 },
            { label: 'Future', offsetX: 120, offsetY: 0, rot: 3 }
        ];

        const cardElements = [];

        spreadData.forEach((entry, index) => {
            const card = entry.card;
            const pos = positions[index] || positions[0];
            const imagePath = entry.image_path || `/static/img/cards/default.png`;

            console.log(`🃏 Creating card ${index}: ${card.name} → ${imagePath}`);

            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            // Set initial position and scale
            cardEl.style.cssText = `
                position: absolute;
                width: 90px;
                height: 140px;
                transform: translate(${pos.offsetX}px, ${pos.offsetY}px) rotate(${pos.rot}deg) scale(0.9);
                opacity: 0;
                transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
                perspective: 600px;
                transform-style: preserve-3d;
            `;

            // Card Back
            const back = document.createElement('div');
            back.className = 'card-back';
            back.style.cssText = `
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: radial-gradient(ellipse at 50% 50%, #1e1a14, #0f0c08);
                border: 1px solid rgba(184, 155, 75, 0.15);
                border-radius: 8px;
                backface-visibility: hidden;
                display: flex;
                justify-content: center;
                align-items: center;
                background-image: repeating-linear-gradient(45deg, transparent 0px, transparent 6px, rgba(184, 155, 75, 0.02) 6px, rgba(184, 155, 75, 0.02) 7px);
            `;
            const emblem = document.createElement('div');
            emblem.textContent = '✦';
            emblem.style.cssText = `color: rgba(184, 155, 75, 0.08); font-size: 2rem; font-family: 'Cinzel', serif;`;
            back.appendChild(emblem);

            // Card Front
            const front = document.createElement('div');
            front.className = 'card-front';
            front.style.cssText = `
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                backface-visibility: hidden;
                transform: rotateY(180deg);
                border-radius: 8px;
                overflow: hidden;
                background: #1a1410;
                border: 1px solid rgba(184, 155, 75, 0.1);
                display: flex;
                justify-content: center;
                align-items: center;
            `;

            // Create image element
            const img = document.createElement('img');
            img.src = imagePath;
            img.alt = card.name;
            img.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 8px;
                display: block;
            `;

            // Handle successful load
            img.onload = function() {
                console.log('✅ Image loaded:', imagePath);
            };

            // Handle errors
            img.onerror = function() {
                console.warn('⚠️ Image failed to load:', imagePath);
                this.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.textContent = card.name;
                fallback.style.cssText = `
                    width: 100%; height: 100%;
                    display: flex; justify-content: center; align-items: center;
                    font-family: 'Cinzel', serif;
                    font-size: 0.8rem;
                    color: #d4af37;
                    text-align: center;
                    padding: 0.5rem;
                `;
                front.appendChild(fallback);
            };

            front.appendChild(img);
            cardEl.appendChild(back);
            cardEl.appendChild(front);
            deckArea.appendChild(cardEl);

            cardElements.push({ el: cardEl, pos: pos, label: positions[index].label, card: card });
        });

        // Reveal the cards with a delay
        setTimeout(() => {
            cardElements.forEach((item, idx) => {
                setTimeout(() => {
                    item.el.style.opacity = '1';
                    item.el.style.transform = `translate(${item.pos.offsetX}px, ${item.pos.offsetY}px) rotate(${item.pos.rot}deg) scale(1)`;
                }, idx * 400);
            });

            // After all cards are visible, flip them one by one
            setTimeout(() => {
                cardElements.forEach((item, idx) => {
                    setTimeout(() => {
                        flipCardWithImage(item.el, item.label, item.card);
                    }, idx * 1200);
                });
            }, cardElements.length * 400 + 500);
        }, 800);

        // Callback after all cards are flipped
        const totalFlipTime = cardElements.length * 1200 + 800;
        setTimeout(() => {
            if (callback) callback();
        }, totalFlipTime + 1500);
    }

    // --------------------------------------------------------------
    // Flip Card — With Real Card Image (Fixed)
    // --------------------------------------------------------------
    function flipCardWithImage(cardEl, label, cardData) {
        // The current transform includes translate and rotateZ
        // We need to add rotateY(180deg) to show the front
        const currentTransform = cardEl.style.transform;
        // Flip: add rotateY(180deg) — this reveals the front face
        cardEl.style.transition = 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)';
        cardEl.style.transform = currentTransform + ' rotateY(180deg)';
        cardEl.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6), 0 0 40px rgba(212,175,55,0.1)';

        brightenCandle();

        console.log(`🃏 ${label}: ${cardData.name} (ID: ${cardData.id})`);
    }

    // --------------------------------------------------------------
    // Main Flow
    // --------------------------------------------------------------
    function startInteraction() {
        if (!isReadyForInteraction) return;
        isReadyForInteraction = false;
        interactionHint.classList.remove('clickable');
        interactionHint.textContent = '— the cards are stirring —';

        speak('I see. Let us see what the cards have to say.', () => {
            dimCandle();
            shuffleCards(() => {
                brightenCandle();
                speak('Three cards. Past, Present, Future.', () => {
                    spreadAndReveal(() => {
                        speak('The cards have spoken. One thing stands before you tomorrow: ...', () => {
                            interactionHint.textContent = '— the reading is complete —';
                            interactionHint.classList.add('visible');
                        });
                    });
                });
            });
        });
    }

    // --------------------------------------------------------------
    // Entry — With Candle Ritual (Clean, no cloning)
    // --------------------------------------------------------------
    function transitionToRoom() {
        if (entryTriggered) return;
        entryTriggered = true;

        threshold.classList.add('hidden');
        showCandle();

        setTimeout(() => {
            room.classList.add('visible');
        }, 400);

        createCards();

        const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

        setTimeout(() => {
            speak(greeting, () => {
                setTimeout(() => {
                    fanCards();
                    brightenCandle();
                    setTimeout(() => {
                        interactionHint.classList.remove('visible');

                        isAwaitingCandleClick = true;
                        candleClickTriggered = false;

                        const readyQuestion = READY_QUESTIONS[Math.floor(Math.random() * READY_QUESTIONS.length)];

                        speak(readyQuestion, () => {
                            // ENABLE CANDLE CLICK — SIMPLE, NO CLONING
                            const candle = document.getElementById('candle-container');
                            if (candle) {
                                candle.style.cursor = 'pointer';
                                candle.style.pointerEvents = 'auto';
                                candle.classList.add('waiting');

                                // Remove any old listener to avoid duplicates
                                candle.removeEventListener('click', handleCandleClick);
                                candle.addEventListener('click', handleCandleClick);

                                console.log('🕯️ Candle click enabled (addEventListener)');
                            } else {
                                console.warn('⚠️ Candle not found');
                            }
                        });
                    }, 600);
                }, 600);
            });
        }, 1200);
    }

    // --------------------------------------------------------------
    // ENTER ROOM — Defined HERE, BEFORE init() and BEFORE fallback
    // --------------------------------------------------------------
    function enterRoom() {
        transitionToRoom();
    }

    // --------------------------------------------------------------
    // CANDLE CLICK HANDLER (Primary)
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

        // Colour change
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

        // Disable candle
        const candle = document.getElementById('candle-container');
        if (candle) {
            candle.classList.remove('waiting');
            candle.style.cursor = 'default';
            candle.style.pointerEvents = 'none';
            candle.removeEventListener('click', handleCandleClick); // Clean up
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

        speak(ack, () => {
            currentState = 'intake';
            startIntake();
        });
    }

    // --------------------------------------------------------------
    // CANDLE SETUP — Only sets up the listener
    // --------------------------------------------------------------
    function setupCandleClick() {
        const candle = document.getElementById('candle-container');
        if (!candle) {
            console.warn('⚠️ Candle not found for setup');
            return;
        }

        // Remove any old listeners to avoid duplicates
        candle.removeEventListener('click', handleCandleClick);
        // Add the listener
        candle.addEventListener('click', handleCandleClick);

        // DO NOT reset pointerEvents or cursor here
        // Let transitionToRoom control these

        console.log('🕯️ Candle click setup complete');
    }

    // --------------------------------------------------------------
    // Init
    // --------------------------------------------------------------
    function init() {
        // --- REMOVE OR COMMENT THIS OUT ---
        // setupCandleClick();
        // console.log('🕯️ Candle setup called from init');

        // Show candle early
        setTimeout(() => {
            candleContainer.classList.add('visible');
            candleLight.classList.add('visible');
            candleLight.style.opacity = '0.3';
        }, 1000);

        // Threshold text evolves to riddle
        setTimeout(() => {
            const waitText = document.querySelector('.wait-text');
            if (waitText) {
                waitText.textContent = 'Embrace Asha\'s flickering light to enter...';
                waitText.style.opacity = '0.7';
                waitText.style.letterSpacing = '0.3em';
                waitText.style.fontSize = 'clamp(0.8rem, 1.2vw, 1rem)';
                waitText.style.color = 'rgba(212, 175, 55, 0.6)';
            }
        }, 4000);

        // Auto-enter after 7s — now calls defined enterRoom
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
    // BACKEND INTEGRATION
    // --------------------------------------------------------------
    const SESSION_ID = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
    let currentState = 'intake';
    let sketchData = null;

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
            const response = await fetch('/api/reading/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sketch: sketchData || 'A quiet presence at the table.',
                    spread: []
                })
            });
            const data = await response.json();

            if (data.reading && data.spread) {
                currentState = 'complete';

                // Dim candle for the ritual
                dimCandle();

                // Perform shuffle visual (using the existing animation)
                shuffleCards(() => {
                    brightenCandle();

                    // Now reveal the actual cards from the backend
                    speak('Three cards. Past, Present, Future.', () => {
                        // Pass the real spread data to the reveal function
                        spreadAndReveal(data.spread, () => {
                            // After cards are revealed, show the reading
                            setTimeout(() => {
                                speak(data.reading, () => {
                                    interactionHint.textContent = '— the reading is complete —';
                                    interactionHint.classList.add('visible');
                                });
                            }, 600);
                        });
                    });
                });
            } else {
                speak('The cards are silent tonight. Perhaps another time.');
            }
        } catch (e) {
            console.error('Failed to generate reading:', e);
            speak('The cards are not speaking clearly. Let us sit with the silence.');
        }
    }

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
                speak(message, () => {
                    if (currentState === 'intake') {
                        sendUserMessage(message);
                    } else {
                        sendUserMessage(message);
                    }
                });
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
    // Start
    // --------------------------------------------------------------
    scene = 'threshold';
    init();

    console.log('🜁 TarocchAI — Liminal Room (v3)');
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