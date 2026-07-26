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
    // SPEAK — Materializing Text Effect
    // ============================================================
    function speak(text, callback) {
        if (isSpeaking) {
            voiceQueue.push({ text, callback });
            return;
        }
        isSpeaking = true;
        voiceText.classList.add('visible');

        voiceContent.innerHTML = '';

        const chars = text.split('');
        const schedule = [];
        let time = 0;
        let i = 0;

        while (i < chars.length) {
            const char = chars[i];
            let delay = 50 + Math.random() * 60;

            if (char === '.' || char === ',' || char === '!' || char === '?') {
                delay = 200 + Math.random() * 100;
            } else if (char === ' ') {
                delay = 30 + Math.random() * 40;
            } else if (char === '—') {
                delay = 250 + Math.random() * 80;
            }

            let burstSize = 1;
            if (Math.random() < 0.08) {
                burstSize = 2 + Math.floor(Math.random() * 3);
            }

            const burstChars = [];
            for (let b = 0; b < burstSize && i < chars.length; b++) {
                burstChars.push(chars[i]);
                i++;
            }

            burstChars.forEach((c, idx) => {
                schedule.push({
                    char: c,
                    time: time + (idx * 20 + Math.random() * 20),
                });
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

        function renderNext() {
            if (scheduledIndex >= schedule.length) {
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
                const span = document.createElement('span');
                span.className = 'materializing-char';
                if (next.char === ' ') {
                    span.innerHTML = '&nbsp;';
                } else {
                    span.textContent = next.char;
                }
                voiceContent.appendChild(span);

                requestAnimationFrame(() => {
                    span.classList.add('revealed');
                });

                scheduledIndex++;
                renderNext();
            } else {
                setTimeout(renderNext, 5);
            }
        }

        setTimeout(renderNext, 200);
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
    // Spread and Reveal
    // --------------------------------------------------------------
    function spreadAndReveal(callback) {
        const topCards = cards.slice(-3);
        deckArea.innerHTML = '';
        topCards.forEach(c => deckArea.appendChild(c));

        const positions = [
            { label: 'Past', offsetX: -120, offsetY: 0, rot: -3 },
            { label: 'Present', offsetX: 0, offsetY: 0, rot: 0 },
            { label: 'Future', offsetX: 120, offsetY: 0, rot: 3 }
        ];

        topCards.forEach((card, i) => {
            const pos = positions[i];
            card.style.transform =
                `translate(${pos.offsetX}px, ${pos.offsetY}px) rotate(${pos.rot}deg) scale(1)`;
            card.style.opacity = '1';
            card.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
        });

        setTimeout(() => {
            flipCard(topCards[0], 'Past', () => {
                setTimeout(() => {
                    flipCard(topCards[1], 'Present', () => {
                        setTimeout(() => {
                            flipCard(topCards[2], 'Future', () => {
                                if (callback) callback();
                            });
                        }, 800);
                    });
                }, 800);
            });
        }, 600);
    }

    function flipCard(card, position, callback) {
        card.style.transition = 'transform 0.8s ease-in-out';
        const idx = Array.from(deckArea.children).indexOf(card);
        const positions = [
            { offsetX: -120, offsetY: 0, rot: -3 },
            { offsetX: 0, offsetY: 0, rot: 0 },
            { offsetX: 120, offsetY: 0, rot: 3 }
        ];
        const pos = positions[idx] || { offsetX: 0, offsetY: 0, rot: 0 };
        card.style.transform =
            `translate(${pos.offsetX}px, ${pos.offsetY}px) rotate(${pos.rot}deg) rotateY(180deg) scale(1)`;

        const back = card.querySelector('.card-back');
        if (back) {
            back.style.display = 'none';
        }
        const face = document.createElement('div');
        face.className = 'card-face';
        face.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: radial-gradient(ellipse at 50% 40%, #3a2a1a, #1a1410);
            border-radius: 6px;
            display: flex; justify-content: center; align-items: center;
            font-family: 'Cinzel', serif;
            font-size: 1.2rem;
            color: #d4af37;
            letter-spacing: 0.1em;
            text-shadow: 0 0 20px rgba(212,175,55,0.2);
        `;
        face.textContent = position;
        card.appendChild(face);

        brightenCandle();

        setTimeout(() => {
            if (callback) callback();
        }, 800);
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
    // Entry
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

        // Random greeting from Madame Tarocchai's voice
        const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
        

        setTimeout(() => {
            speak(greeting, () => {
                setTimeout(() => {
                    fanCards();
                    brightenCandle();
                    setTimeout(() => {
                        interactionHint.classList.add('visible');
                        interactionHint.textContent = '— speak when you are ready —';
                        isReadyForInteraction = true;
                        interactionHint.classList.add('clickable');
                    }, 600);
                }, 600);
            });
        }, 1200);
    }

    function enterRoom() {
        transitionToRoom();
    }

    // --------------------------------------------------------------
    // Init
    // --------------------------------------------------------------
    function init() {
        // Show candle early
        setTimeout(() => {
            candleContainer.classList.add('visible');
            candleLight.classList.add('visible');
            candleLight.style.opacity = '0.3';
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

            if (data.reading) {
                currentState = 'complete';
                dimCandle();
                shuffleCards(() => {
                    brightenCandle();
                    speak('Three cards. Past, Present, Future.', () => {
                        spreadAndReveal(() => {
                            speak(data.reading, () => {
                                interactionHint.textContent = '— the reading is complete —';
                                interactionHint.classList.add('visible');
                            });
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
        userInputArea.style.display = 'block';
        userInput.focus();
        interactionHint.classList.remove('visible');
    }

    function hideUserInput() {
        userInputArea.style.display = 'none';
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