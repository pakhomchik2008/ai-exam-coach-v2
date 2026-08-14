# Brand source

Why this folder exists: PNG master + SVG fallback + iOS AppIcon.
`public/brand/` is what the site serves. This folder is what you edit.

## Mark construction

Open book. Two facing pages, champagne gold `#CCA563` on
navy `#141822`. No teal, no bars, no forecast arrow.

`logo-master.png` is the app icon (1024). Generator punches
transparent corners, then writes web PNG + iOS set.

## Generators

```
python3 brand/generate-icons.py
python3 brand/generate-sounds.py
```
