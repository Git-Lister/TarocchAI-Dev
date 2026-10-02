import io, sys

path = 'static/js/tarot.js'

with io.open(path, 'r', encoding='utf-8') as f:
    src = f.read()

# --- Patch 1: manageVisibleSentences should fade, not remove ---
old_manage = """    function manageVisibleSentences() {
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
    }"""

new_manage = """    function manageVisibleSentences() {
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
    }"""

if old_manage not in src:
    print("PATCH 1 FAILED: manageVisibleSentences pattern not found")
    sys.exit(1)
src = src.replace(old_manage, new_manage, 1)
print("Patch 1: manageVisibleSentences now fades without removing")

# --- Patch 2: sticky auto-scroll in every speak function ---
old_scroll = "voiceArea.scrollTop = voiceArea.scrollHeight;"
new_scroll = "if (voiceArea.scrollHeight - voiceArea.scrollTop - voiceArea.clientHeight < 60) voiceArea.scrollTop = voiceArea.scrollHeight;"

scroll_count = src.count(old_scroll)
if scroll_count == 0:
    print("PATCH 2 FAILED: no scrollTop assignments found")
    sys.exit(1)
src = src.replace(old_scroll, new_scroll)
print("Patch 2: sticky scroll applied to %d occurrences" % scroll_count)

# --- Patch 3: remove the photograph greeting ---
old_greeting = '        "The photograph on the table... I think you know who it is."\n'
if old_greeting not in src:
    print("PATCH 3 WARNING: photograph greeting not found — may already be removed")
else:
    src = src.replace(old_greeting, "")
    print("Patch 3: photograph greeting removed from GREETINGS array")

with io.open(path, 'w', encoding='utf-8') as f:
    f.write(src)

print("Patched:", path)