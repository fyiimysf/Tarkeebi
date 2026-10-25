# Tarkeebi — Design System

> Hand-maintained record of what is actually implemented. The generator output that
> originally created this file described a different direction (editorial black +
> pink, Libre Bodoni/Public Sans) and has been replaced, because the tokens in
> `src/routes/layout.css` are the source of truth, not this document.

## Direction

**Warm Paper (refined).** An editorial recipe box: cream paper, ink, one clay
accent, a sage secondary. Quiet, print-inspired, generous whitespace, hairline
rules rather than heavy borders. The type pairing deliberately inverts the usual
editorial recipe: a tight grotesque carries the headings, a reading serif carries
the recipe prose, and the sans is reserved for UI chrome. Alternatives explored
but not shipped: *Broadsheet* (sharper, more asymmetric), *Paper & Ink*
(near-monochrome, zero elevation), *Kitchen Warmth* (large radii, soft depth).
Mockups: `/tmp/opencode/tarkeebi-directions/index.html`.

## Typography

| Role | Family | Source | Notes |
| --- | --- | --- | --- |
| Display / headings | **Bricolage Grotesque Variable** | `@fontsource-variable/bricolage-grotesque/opsz.css` | optical-size + weight (200–800) |
| UI / chrome | **Karla Variable** | `@fontsource-variable/karla/wght.css` | weight axis (200–800) |
| Recipe prose | **Source Serif 4 Variable** | `@fontsource-variable/source-serif-4/opsz.css` | optical-size + weight; old-style figures |
| Meta / eyebrow / numerals | **JetBrains Mono Variable** | `@fontsource-variable/jetbrains-mono/wght.css` | |

All self-hosted. Fontsource emits per-subset `unicode-range`, so only the
subsets a page needs are downloaded; no third-party font request, and identical
rendering on Apple, Windows, Linux and Android.

Heading tracking is set once in `@layer base` (`-0.022em`, `-0.032em` on `h1`).
Large display headings pair `font-bold` with `tracking-[-0.03em]`. Long-form prose
uses `.prose-editorial` / `.prose-editorial-lg`: Source Serif 4 at 17–20px,
1.65–1.7 line-height, capped at 68ch / 60ch, `text-wrap: pretty`, old-style
figures.

## Token architecture — three layers

Everything lives in `src/routes/layout.css`.

1. **Primitive** — raw ramps in `@theme`: `--color-paper-*`, `--color-ink-*`,
   `--color-clay-*`, `--color-sage-*`, plus radii, shadows, easing.
   *Components must never reference these.*
2. **Semantic** — plain CSS variables declared in `:root` and overridden in
   `.dark`, exposed to Tailwind through `@theme inline` as `--color-*`.
3. **Component** — `.card`, `.btn-*`, `.chip`, `.input`, `.label`, `.eyebrow`,
   `.meta`, `.prose-editorial`, `.prose-editorial-lg`, `.icon-badge`, `.rule`,
   `.surface-sunken`, `.count-pop`.

Because the utilities are declared with `@theme inline`, `bg-canvas` compiles to
`background-color: var(--canvas)`. Flipping `.dark` re-themes the whole app with
**zero `dark:` variants** anywhere in the codebase.

### Semantic tokens

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--canvas` | `#f9f5ed` | `#12100d` | page background |
| `--surface` | `#fcfaf5` | `#1a1713` | cards, popovers, inputs |
| `--surface-sunken` | `#f3ede1` | `#262220` | inset panels, hover fill |
| `--fg` | `#1a1713` | `#f5f1ea` | primary text |
| `--fg-muted` | `#514a42` | `#c9c1b6` | secondary text |
| `--fg-subtle` | `#6b6157` | `#a9a196` | tertiary text, meta |
| `--border` | `#e4ded5` | `#332e28` | decorative dividers |
| `--border-strong` | `#8a7f72` | `#857868` | input/control boundaries (≥3:1) |
| `--accent` | `#9a3d06` | `#e0a171` | brand, links, focus |
| `--accent-hover` | `#7c3105` | `#edc4a1` | solid-button hover |
| `--accent-fg` | `#ffffff` | `#12100d` | text on solid accent |
| `--accent-soft` | `#f6e1cb` | `#3d2517` | tinted fills |
| `--accent-soft-fg` | `#7c3105` | `#e0a171` | text on tinted fill |
| `--success` | `#3a6331` | `#93b985` | published / cooked |
| `--danger` | `#b3261e` | `#f2b8b5` | destructive |
| `--ring` | `#9a3d06` | `#e0a171` | focus ring |

### Contrast contract (verified)

Every text pair clears WCAG AA 4.5:1 in both themes; the lowest is
`--fg-subtle` on canvas at **5.56:1** (light) and **7.44:1** (dark).
`--accent` on canvas is **6.34:1** light / **8.60:1** dark.
`--border-strong` clears 3:1 against canvas, surface and sunken in both themes,
satisfying WCAG 1.4.11 for control boundaries. The decorative `--border` is
deliberately low-contrast (≈1.2–1.4:1) and must never be the only thing marking
a control's extent.

## Shape, depth, motion

- Radius: `--radius-control` 0.5rem (buttons, inputs), `--radius-card` 1rem
  (cards, dialogs), `--radius-pill` (chips, badges).
- Shadows: `--shadow-subtle` (cards), `--shadow-raised` (popovers, FAB),
  `--shadow-lifted` (hover, dialogs). No coloured glows.
- Easing: `--ease-out-quint`; durations `--duration-fast` 120ms,
  `--duration-base` 180ms, `--duration-slow` 280ms.

### Accessibility rules baked in

- A single global `@media (prefers-reduced-motion: reduce)` block zeroes
  animation/transition durations and smooth scrolling.
- Movement-based effects are additionally gated behind `motion-safe:`.
- `:focus-visible` uses a 2px `--ring` outline with 2px offset.
- `.input` is 16px on mobile (prevents iOS Safari focus zoom), 14px on `sm+`.
- Icon buttons are 40×40px; the mobile compose button is 56px.

## Layout

- Mobile first. Breakpoints at 640 / 768 / 1024 / 1280.
- Two surfaces: public blog (editorial, serif-led) and private recipe app
  (denser, same tokens).
- Logical properties throughout (`inset-s-*`, `-me-*`, `border-e`) so Urdu RTL
  mirrors correctly.
- Print: `.no-print` removes chrome; cards lose borders and shadows, and the
  page forces black-on-white.

### Mobile interaction patterns

- Safe areas are handled in the chrome, never with magic numbers: sticky headers
  use `pt-[max(0.75rem,env(safe-area-inset-top))]`, bottom bars use
  `pb-[max(0.75rem,env(safe-area-inset-bottom))]`.
- The mobile tab bar stands aside on the recipe new/edit routes. A fixed action
  bar owns the bottom edge there, so Cancel and Save are always reachable.
- Enter advances to the next field instead of submitting (`.input` fields only;
  textareas keep their newlines). Every form field carries `enterkeyhint`.
- Adding an ingredient or step focuses the new row and flashes a 2px accent ring,
  so the eye lands where the content goes. `.input` has `scroll-margin-block` to
  clear sticky chrome.
- Textareas autosize to their content (`{@attach autosize}`); no inner scroll
  boxes on a phone.
- The public recipe page pins Cook mode and "I cooked this" to the bottom edge on
  phones, and the footer reserves room for that bar. The cooked tally rides
  inside the button and pops (`count-pop`) when it changes.

## Conventions

- No raw palette utilities in components (`bg-neutral-500` is a bug). Use
  semantic tokens only.
- No `dark:` variants. If you need a theme-dependent value, add a semantic token.
- Icons come from `@lucide/svelte`; never emoji.
- All user-facing strings go through Paraglide (`m.*()`), including short
  labels.
