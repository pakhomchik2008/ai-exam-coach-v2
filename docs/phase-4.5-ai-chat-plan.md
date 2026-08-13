# Phase 4.5 — AI Chat markdown that actually renders

Branch: `phase-4.5/ai-chat`, cut from `phase-4.4/motion-energy`.

Students were seeing raw `##`, `- ` lists, and tables in Coach chat.
`**bold**` and `$math$` already render via `renderCoachMarkdown`. This
phase finishes the same renderer — no `react-markdown`, no new vendor.

## MVP

- Headings (`#` / `##` / `###`), lists, blockquotes, GFM tables, fenced code
- Same pipeline everywhere `_md` / `renderCoachMarkdown` already runs
- Copy on each AI chat bubble + on fenced code / block math
- Coach prompt tells Sonnet to use `##` and `- ` because they now paint

## Deferred

| Item | Why |
|---|---|
| `react-markdown` + remark/rehype stack | KaTeX already in-repo. New deps for one utility |
| Perplexity-style JSON cards in free chat | Learn theory reader already has sections. Chat stays a dialogue |
| New SVG diagram pipeline | Phase 3.7d + `sanitizeSvg` already exist |
| OpenAI TTS / Whisper | Decision Log #39 |
| 👍 / 👎 / pin | No backend that learns from them — theater |

## Decision Log

| # | Decision | Why |
|---|---|---|
| 54 | Grow `renderCoachMarkdown`, do not add react-markdown | Escape-then-format is already the XSS contract. A second renderer would drift |
| 55 | Copy writes the source string (markdown / LaTeX), not KaTeX HTML | Students paste into notes. Rendered HTML is useless outside the app |

## Reversibility

- Renderer is one function. Revert the block-parse step if a heading edge case bites.
- Copy buttons are additive DOM. Chat storage keys unchanged.

## What could break silently

| Risk | Guard |
|---|---|
| `* item` list vs `*italic*` | List only matches `* ` with a space |
| `>` quote after HTML escape | Match `&gt;` as well as `>` |
| LaTeX inside a heading | Math tokens run before block parse |
| Fenced ` ``` ` eaten by inline code | Extract fences first |
