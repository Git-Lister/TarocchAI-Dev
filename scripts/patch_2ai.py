import io
import sys

path = "static/js/tarot.js"

with io.open(path, "r", encoding="utf-8") as f:
    src = f.read()

# --- Edit 1: activate threshold on load ---
# The guard block ends with: console.error('Missing...'); return; }
# Insert `threshold.classList.add('active');` after the guard closing brace.

guard_anchor = "return;\n    }"
if guard_anchor not in src:
    print("EDIT 1 FAILED: guard anchor not found")
    sys.exit(1)

# Only replace the FIRST occurrence (the DOM guard at top of DOMContentLoaded).
insert_after = (
    "return;\n"
    "    }\n"
    "\n"
    "    // Cycle 2A: activate threshold on load\n"
    "    threshold.classList.add('active');"
)
src = src.replace(guard_anchor, insert_after, 1)
print("Edit 1: threshold.classList.add('active') inserted after guard")

# --- Edit 2: swap threshold.hidden for .active removal ---
count_before = src.count("threshold.classList.add('hidden')")
if count_before == 0:
    print("EDIT 2 FAILED: no threshold.classList.add('hidden') found")
    sys.exit(1)
src = src.replace(
    "threshold.classList.add('hidden')", "threshold.classList.remove('active')"
)
print("Edit 2: applied to %d occurrence(s)" % count_before)

# --- Write back ---
with io.open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("Patched file written:", path)
