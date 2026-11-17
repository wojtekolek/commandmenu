---
"commandmenu": patch
---

Fixes:

- On Latin layouts other than QWERTY, a Cmd/Ctrl combo whose typed letter has no shortcut no longer falls back to the physical key. AZERTY's Ctrl+A, QWERTZ's Ctrl+Z and Dvorak's Ctrl+C stay with the browser instead of firing the "Q", "Y" or "I" shortcut. Non-Latin layouts and Shift+digit still match by physical key.
- An item `id` containing a lone surrogate (say, a string cut through an emoji) no longer crashes the render with `URIError: URI malformed`.
- Enter pressed in the same batch as an arrow key selects the item the arrow moved to.
- A very large `asyncResultsGroup.items` no longer throws `RangeError: Maximum call stack size exceeded`.

Performance:

- Async results are deduplicated against the menu in O(results) instead of O(menu) on every update.
