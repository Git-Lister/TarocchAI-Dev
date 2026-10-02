import io
import sys

path = "static/js/tarot.js"

with io.open(path, "r", encoding="utf-8") as f:
    src = f.read()

# The broken block, exactly as it currently appears on disk
old_block = """    function escapeHTML(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, ''');
    }"""

# Correct version — entities properly escaped, last line closed cleanly
new_block = """    function escapeHTML(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }"""

if old_block not in src:
    print("FAILED: exact broken block not found. Reporting neighboring lines.")
    idx = src.find("function escapeHTML")
    if idx == -1:
        print("  escapeHTML function not found at all.")
    else:
        print(src[idx : idx + 400])
    sys.exit(1)

src = src.replace(old_block, new_block, 1)
with io.open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("Fixed: escapeHTML rewritten with correct entity strings")
