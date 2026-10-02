import io, sys

path = 'static/js/tarot.js'

with io.open(path, 'r', encoding='utf-8') as f:
    src = f.read()

# --- Patch A: hook closing state after thread finishes ---
old_final = """        if (candleAction === 'reveal-thread') {
            candleAction = 'start-intake';
            wipeVoiceBox();
            // Use the new final reading function
            speakFinalReading(threadTextData, () => { 
                interactionHint.textContent = '— the reading is complete —';
                interactionHint.classList.add('visible');
            });
            return;
        }"""

new_final = """        if (candleAction === 'reveal-thread') {
            candleAction = 'start-intake';
            wipeVoiceBox();
            // Speak the thread, then enter the closing state
            speakFinalReading(threadTextData, () => {
                interactionHint.classList.remove('visible');
                enterClosingState();
            });
            return;
        }"""

if old_final not in src:
    print("PATCH A FAILED: reveal-thread block not found")
    sys.exit(1)
src = src.replace(old_final, new_final, 1)
print("Patch A: thread now triggers enterClosingState")

# --- Patch B: insert closing functions before "function replaceVoiceContent" ---
anchor_replace = "    function replaceVoiceContent(text) {"
if anchor_replace not in src:
    print("PATCH B FAILED: replaceVoiceContent anchor not found")
    sys.exit(1)

closing_functions = """    // --------------------------------------------------------------
    // Closing state \u2014 appears after thread ends
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
    // Download generator \u2014 self-contained HTML artifact
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
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, ''');
    }

    async function handleTakeReading() {
        const btnTake = document.getElementById('btn-take');
        if (btnTake) {
            btnTake.disabled = true;
            btnTake.textContent = '[ gathering\u2026 ]';
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
<title>TarocchAI \u2014 a reading for ${name}</title>
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
  <div class="thread">${thread.replace(/\\n\\n/g, '</p><p>').replace(/\\n/g, '<br>')}</div>
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
    // Snuff \u2014 exit sequence
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

"""

src = src.replace(anchor_replace, closing_functions + anchor_replace, 1)
print("Patch B: closing functions inserted")

with io.open(path, 'w', encoding='utf-8') as f:
    f.write(src)

print("Patched:", path)