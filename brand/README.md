# Brand source

Why this folder exists: the mega-prompt wants SVG + PNG + iOS AppIcon.
`public/brand/` is what the site serves. This folder is what you edit.

## Mark construction

One polyline. It climbs like a score graph and the mid plateau is the
crossbar of a lowercase "e". A 45° diamond sits on the last vertex
(the predicted score). No second stroke, no serifs, no mascot.

ViewBox 64. Stroke 3.2, round caps. Teal field `#1B4D4A`, line `#F5F5F4`,
diamond `#F3D062`.

```
(10,48) → (18,40) → (28,42) → (36,28) → (46,24) → (54,14)
                              ^ e-bar                 ^ diamond
```

## Generators

```
python3 brand/generate-icons.py
python3 brand/generate-sounds.py
```

`generate-sounds.py` calls `ffmpeg` if present for MP3 + loudnorm.
WAV always ships so the kit works without ffmpeg.
