# Brand source

Why this folder exists: SVG + PNG + iOS AppIcon.
`public/brand/` is what the site serves. This folder is what you edit.

## Mark construction

Block E. Eleven squares on a 3×5 grid, purple `#8921F5`.
Square 6, gap 4, origin 19,9. Glyph is 26×46 inside the 64 tile.

Lockup is horizontal only: unframed E + `Examik` in the brand serif.
Gap is one cell of the E. Framed cream rounded-rect is the app icon
and favicon — never a header. Placeholder mark until the new SVG.

## Generators

```
python3 brand/generate-icons.py
swift brand/generate-lockup.swift
python3 brand/generate-sounds.py
```
