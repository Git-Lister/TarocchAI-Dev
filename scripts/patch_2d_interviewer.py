import io, sys

path = 'engine/intake/interviewer.py'

with io.open(path, 'r', encoding='utf-8') as f:
    src = f.read()

# --- Patch A: new opener ---
old_opener = '''        opener = (
            "Let's sit quietly for a moment. "
            "There's an object on the table between us. "
            "What is it? Let the first thing rise to the surface."
        )'''

new_opener = '''        opener = (
            "Gaze into the space between us. "
            "Allow something to arise there — the first thing, "
            "or the thing you came to ask. Tell me what you see."
        )'''

if old_opener not in src:
    print("PATCH A FAILED: opener block not found")
    sys.exit(1)
src = src.replace(old_opener, new_opener, 1)
print("Patch A: opener replaced")

# --- Patch B: soften the reflection prompt ---
old_reflection = '''            "Reflect on this briefly, in your own voice. One sentence only. "
            "Be insightful, perhaps a little intrusive, but not rude. "
            "If the message was very short, just acknowledge it briefly. "
            "Keep it under 15 words."'''

new_reflection = '''            "Reflect on this briefly, in your own voice. One sentence only. "
            "Be quietly observant — not flattering, not probing. The querent "
            "should feel seen, not studied. If the message was very short, "
            "just acknowledge it briefly. Keep it under 15 words."'''

if old_reflection not in src:
    print("PATCH B FAILED: reflection prompt not found")
    sys.exit(1)
src = src.replace(old_reflection, new_reflection, 1)
print("Patch B: reflection prompt softened")

with io.open(path, 'w', encoding='utf-8') as f:
    f.write(src)

print("Patched:", path)