import io, sys

path = 'static/js/tarot.js'

with io.open(path, 'r', encoding='utf-8') as f:
    src = f.read()

# ---------------------------------------------------------------
# Patch 1: insert speakFlow() right after the speak() function
# ---------------------------------------------------------------
# Anchor: the closing of speak() is the setTimeout line, then }. We locate
# the "function speakFast(" declaration and insert speakFlow before it.

anchor_speakfast = "    function speakFast(text, callback) {"
if anchor_speakfast not in src:
    print("PATCH 1 FAILED: anchor 'function speakFast(' not found")
    sys.exit(1)

speak_flow_def = '''    // ============================================================
    // SPEAK FLOW — word-by-word, ghost-aware (for MT's intake replies)
    // ============================================================

    function speakFlow(text, callback) {
        text = text.replace(/\\([^)]*\\)/g, '').trim();

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
        voiceArea.scrollTop = voiceArea.scrollHeight;

        const tokens = text.split(/(\\s+)/);
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

            if (/^\\s+$/.test(token) || token === '') {
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
            voiceArea.scrollTop = voiceArea.scrollHeight;

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
            } else if (lastChar === '\\u2014') {
                delay = 300;
            }

            setTimeout(processNextToken, delay);
        }

        processNextToken();
    }

'''

src = src.replace(anchor_speakfast, speak_flow_def + anchor_speakfast, 1)
print("Patch 1: speakFlow() inserted before speakFast()")

# ---------------------------------------------------------------
# Patch 2: extend the queue handler to route flow items
# ---------------------------------------------------------------
old_queue = "if (next.fast) speakFast(next.text, next.callback);\n                        else speak(next.text, next.callback);"
new_queue = "if (next.flow) speakFlow(next.text, next.callback);\n                        else if (next.fast) speakFast(next.text, next.callback);\n                        else if (next.finalReading) speakFinalReading(next.text, next.callback);\n                        else speak(next.text, next.callback);"

queue_count = src.count(old_queue)
if queue_count == 0:
    print("PATCH 2 WARNING: no matching queue handler found (may already be updated)")
else:
    src = src.replace(old_queue, new_queue)
    print("Patch 2: queue handler extended (%d occurrence%s)" % (queue_count, "s" if queue_count != 1 else ""))

# ---------------------------------------------------------------
# Patch 3: route MT's intake replies through speakFlow()
# ---------------------------------------------------------------
old_opener = "speak(data.opener, () => {"
if old_opener in src:
    src = src.replace(old_opener, "speakFlow(data.opener, () => {")
    print("Patch 3a: startIntake opener routed to speakFlow")
else:
    print("PATCH 3a WARNING: 'speak(data.opener' not found")

old_reply = "speak(data.reply, () => {"
if old_reply in src:
    src = src.replace(old_reply, "speakFlow(data.reply, () => {")
    print("Patch 3b: sendUserMessage reply routed to speakFlow")
else:
    print("PATCH 3b WARNING: 'speak(data.reply' not found")

# ---------------------------------------------------------------
# Write back
# ---------------------------------------------------------------
with io.open(path, 'w', encoding='utf-8') as f:
    f.write(src)

print("Patched:", path)