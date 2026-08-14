# @psp-asia/layout — PSP Rack & Rail grid + debug tools

Layout system for PSP development. v1.3.0 rebuilds `grid.css` from the Figma
spec (Foundations → Rack & Rail) as plain CSS — flexbox + `calc()`, no
Tailwind build required. Ships with the usage contract, rail enhancements
(scroll-snap + auto-centering), and a fixture-based rule test (`npm test`).

## Package Contents

- `grid.css` — Rack (wrapping flex grid) + Rail (horizontal scroll)
- `debug.css`, `debug.js` — visual debugging overlay (dev only)

## Installation

```bash
npm install @psp-asia/layout
```

## Usage

Plain CSS — either works:

```html
<link rel="stylesheet" href="node_modules/@psp-asia/layout/grid.css">
```

```css
/* inside a Tailwind/PostCSS build */
@import "@psp-asia/layout/grid.css";
```

Debug tools (development only):

```html
<link rel="stylesheet" href="node_modules/@psp-asia/layout/debug.css">
<script src="node_modules/@psp-asia/layout/debug.js"></script>
```

## The system

Two containers, one column scale, no responsive prefixes — breakpoint
behavior is built in. Never write `md:col-6`; just `col-6`.

```html
<div class="rack">
  <div class="col-8">Main content</div>
  <div class="col-4">Sidebar</div>
</div>

<div class="rail">
  <div class="col-3">Card 1</div>
  <div class="col-3">Card 2</div>
  <div class="col-3">Card 3</div>
</div>
```

### Rack (wrapping grid)

Column widths follow the design theory exactly, at every viewport width:

- **sm (0–767px)** — `col-1` = half row (two fit side by side);
  `col-2`…`col-12` = full row.
- **md (768–1023px)** — complementary pairs each fill a row:
  `col-1`+`col-6`, `col-2`+`col-5`, `col-3`+`col-4` (equal halves);
  `col-7`…`col-12` = full row.
- **lg+ (1024px+)** — true 12-column grid:
  `col-N = N × unit + (N−1) × 16px gap`, computed live with `calc()`.

### Offsets (self-centering)

`offset-N` centers the complementary column `col-(12−N)`:
`margin-left = (100% − col-(12−N)) / 2`. Because it derives from the actual
column width, it can never drift out of sync.

```html
<div class="rack">
  <div class="offset-3 col-6">Centered (3 + 6 + 3 = 12)</div>
</div>
```

On sm/md, offsets whose complement is full-width resolve to 0 automatically.

### Rail (horizontal scroll)

Fixed-width cards, never wraps, scrollbar hidden:

- `col-1`…`col-7`: fixed card sizes per breakpoint
  (e.g. lg: 260, 320, 364, 400, 470, 512, 555px)
- `col-8`…`col-11` (lg+): rack column width minus 32px peek
- `col-12`: full width minus 32px peek — slide mode with the next slide
  peeking in

### Tokens

```css
:root {
  --psp-gap: 16px;      /* column gap */
  --psp-gutter: 20px;   /* container side padding: 20 sm / 40 md / 32 lg+ */
  --psp-peek: 32px;     /* rail slide peek */
}
```

## Rules (the contract — enforced by `npm test`)

1. No responsive prefixes (`lg:col-6`) — the system owns breakpoints.
2. `col-*` must sit directly inside `.rack` or `.rail` — a `col-N` outside a
   container has no width (selectors are scoped).
3. **No nesting.** `.rack` and `.rail` sit at section level and contain only
   `col-*` / `offset-*`. Never place a rack/rail inside another rack/rail
   (rack-in-rack, rail-in-rack, rack-in-rail, rail-in-rail all banned).
   Card groups inside a `col-N` are restructured as their own section-level
   rows or a rail — never as a nested rack.
4. Never mix in another layout system (Tailwind `grid grid-cols-*`,
   `col-span-*`) — two control systems fight and break the column math.
5. Every rack row must total exactly 12 columns (`col-N` + `offset-N`). To
   center a group narrower than 12, prepend an offset so the row sums to 12 —
   `3×col-3` (= `col-9`) + `offset-3` = 12; a lone `col-8` + `offset-4` = 12.
   Never leave a row under 12 and hand-center it.
6. `rail` only when you want horizontal scrolling.

## Rails (built-in enhancements)

- **Vertical padding** (16px) so card shadows are never clipped by `overflow-x`.
- **Auto-centering**: first/last card get `margin-left/right: auto` — the row
  centers when it fits (desktop), scrolls from the start when it overflows.
- **Scroll-snap**: `x mandatory`; first card snaps to the start, every card
  from the 2nd snaps to the middle.
- `scroll-padding-inline: var(--psp-gutter)` — keep it exactly this. The snap
  container starts at the rail's **border edge** (the rail's own padding is
  part of the scrollable area and ignored by snap), so a small fixed value
  (e.g. 8px) pins the first card *inside* the gutter and misaligns the rail
  with rack rows beside it. Regression found & fixed 2026-08.

## Pitfalls (field notes — read before layout work)

- **md complementary pairs drift**: at 768–1023px, `col-3`+`col-4` both resolve
  to 50% (`col-3=col-4=50%`), so `3×col-4` groups fall to a lone third card.
  The PSPA website overrides md to a true 12-column ladder in its `main.css`
  (`@media (min-width: 48rem)` recomputing `--c1..--c12` with the lg formula);
  copy that override if you use 3+-column rows.
- **offset-N inside heroes**: in full-bleed hero containers the offset computes
  from the hero width, not the page column grid — use flex `justify-end` there
  instead of offsets.
- **Never patch `node_modules`**: local hand-edits are lost on the next
  install and the published tarball drifts from what the site runs. Backport
  to this source repo and republish.
- **Sections/containers**: this package is width-agnostic. Consumers that want
  a max content width (e.g. 1440px) center `.rack` with
  `max-width: 1440px; margin-inline: auto` on their own layer.

## Changelog

- **1.3.1** — polish: rail rules merged into one block; duplicate first-child
  rule collapsed; header comment condensed (contract/gotchas live in README —
  single source of truth); CSS smoke checks added to `npm test` (46 assertions
  on selectors/vars + a regression guard for the 8px snap-padding bug); GitHub
  Actions CI (runs `npm test` on every push).
- **1.3.0** — usage contract + gotchas in `grid.css` header; rail
  enhancements (snap w/ gutter-correct `scroll-padding-inline`, auto-centering,
  shadow padding) moved in from consumer CSS; fixture-based rule test
  (`tests/rack-rail-test.js`); docs.
- **1.2.0** — rebuilt from Figma spec: flexbox + calc (was CSS Grid tracks);
  exact at all viewport widths; self-centering offsets; rail peek; plain CSS
  (no `@apply`, raw `<link>` now works); fixed broken offsets and missing gap.
- **1.1.2** — CSS Grid track system.
