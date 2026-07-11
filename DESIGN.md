# Handoff: Minimal Meditation App

## Overview
A two-screen meditation web app: a Landing/Setup screen (duration + sound selection) and a Meditation Session screen (3s countdown → full-bleed background photo, crossfading every minute, thin progress bar, Stop with confirmation).

## About the Design Files
The file `Meditation App.dc.html` in this bundle is a **design reference prototype**, not production code to copy directly. It's built in a proprietary component templating format (holes like `{{ x }}`, custom `sc-if`/`sc-for` tags) that only runs inside the design tool — it will not run standalone in a browser as-is. Treat it as a fully-specified interactive spec: recreate the layout, states, copy, and behavior in the target codebase's existing framework (React, Vue, SwiftUI, etc.), using its established component/styling patterns. If no framework exists yet, choose the most appropriate one for the project.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interaction behavior below are final — recreate pixel-precisely using the codebase's own styling approach (CSS-in-JS, Tailwind, native styling, etc. — whichever the codebase already uses).

## Visual Direction
Three color themes were explored; **Warm** is the selected default. All three share the same layout/typography — only the palette (background/text/accent) swaps. Implement theming as a simple token swap (see Design Tokens).

## Screens / Views

### 1. Landing / Setup
**Purpose:** User picks a session duration and ambient sound, then starts.

**Layout:** Full viewport, flex column, centered both axes. Inner content column max-width 520px, gap 44px between sections, generous padding (40px) around the whole screen.

**Components (top to bottom):**
- **Duration section**: label "Duration" (13px, uppercase, 0.1em letter-spacing, muted text color, weight 500). Below it, a horizontally centered, wrapping row of 4 pill chips, gap 10px:
  - Chips: "5 min", "10 min", "20 min", "Custom"
  - Chip style: padding 12px 22px, border-radius 999px (full pill), font-size 15px, weight 500
  - Unselected: transparent background, 1px border in theme border color, text in theme text color
  - Selected: filled with theme accent color, border same accent color, text in "accentText" (contrasting) color
  - Clicking "Custom" reveals an hours/minutes stepper (see below) and marks Custom selected; clicking 5/10/20 sets that duration directly and hides the stepper.
- **Custom stepper** (only visible when Custom is selected): two columns side by side, gap 28px, each column: a "+" circular button (36px, 1px border, transparent bg) above a large numeral display (32px, weight 600, tabular-nums) above a "–" circular button, with a small uppercase label ("hours" / "minutes") below. Hours range 0–3 (step 1). Minutes range 0–55 in steps of 5, wrapping (55→0 on increment past, 0→55 on decrement past).
- **Sound section**: label "Sound" (same style as Duration label). Below, a row of 3 cards, gap 16px, each 120px wide, padding 22px/12px/16px, border-radius 16px, flex column centered, gap 14px:
  - Card background: theme "cardBg" (very low-opacity tint of the text color) at all times; selected card additionally gets a 1.5px border in the theme accent color (unselected: 1.5px transparent border, so sizing doesn't shift).
  - Icon area: 56×40px, centered. Icons are simple flat CSS/geometric shapes (no photographic icons):
    - **Forest**: a solid triangle (24px tall) in a muted green tone, with a small rectangular "trunk" beneath it at 60% opacity of the same green.
    - **Sea**: three horizontal rounded bars stacked with 5px gaps, widths 34/26/18px, all 6px tall, in a muted blue tone, opacities 0.9/0.6/0.35 (top to bottom) suggesting layered waves.
    - **Fireplace**: a single teardrop/flame shape (20×26px div, border-radius 50% 50% 50% 0, rotated -135°) in a muted orange tone.
  - Label under icon: sound name ("Forest" / "Sunrise beach" / "Fireplace"), 14px, weight 500, theme text color.
- **Background section**: label "Background" (same style as Duration/Sound labels). Below it, a single on/off switch (not chips) with flanking text labels "No video" and "Video"; the active side's label is bolded to full text color, the inactive side stays muted. This picks between the two Session-screen background modes:
  - **No video** (default): the plain looping ambient soundtrack + crossfading photo background described in the Meditation Session section below.
  - **Video**: for sounds that have a YouTube video mapped (currently only Sea), the session background becomes the full YouTube video instead of photos, and its own audio replaces the local ambient loop. Sounds without a mapped video fall back to "No video" behavior even when the switch is on.
- **Start control**: centered column, gap 10px — a large pill "Start" button (padding 18px/64px, border-radius 999px, theme accent background, accentText color, 17px, weight 600) and, beneath it, a small muted summary line showing the chosen duration + sound (e.g. "10 minutes · Forest").

### 2. Countdown (transitional, ~3 seconds)
**Purpose:** Brief pause before the session begins.

**Layout:** Full viewport, flex centered, background = theme background color (flat, no imagery).
**Component:** A single large numeral (180px, weight 300, tabular-nums, theme text color) counting down 3 → 2 → 1, one second per number. Each number change fades/scales in (soft ease, ~0.4–0.9s). At 0 it immediately transitions to the Session screen.

### 3. Meditation Session
**Purpose:** The active meditation screen — imagery and stillness carry the design; minimal chrome.

**Layout:** Full-bleed, full viewport, `position: relative`.
- **Background — No video mode (default, or any sound without a mapped video)**: a full-bleed photo layer (`position: absolute; inset: 0`). Three photo slots per sound are preloaded/cycled; every 60 seconds the visible photo crossfades to the next one in the set (opacity transition, ~1.8s ease, only one visible at a time — stacked, not slid). Loops back to the first after the third. A subtle static gradient overlay sits on top of the photo for legibility: `linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.28) 100%)` — darkens just the bottom edge slightly. Audio comes from the ~1-minute looping ambient soundtrack matching the chosen sound (see `assets/sounds/README.md`).
- **Background — Video mode** (Background switch set to "Video", and the chosen sound has a mapped YouTube video): the photo layer and its ambient audio loop are replaced by a full-bleed embedded YouTube player showing the full video on loop, muted down to a fixed mix level under the breathing pacer. If the video fails to start within ~20s (blocked embed, region lock, offline `file://` context, etc.), the session silently falls back to the No video photo/audio background instead.
- **Stop button**: top-right, 28px from top/right edges. Solid pill button, theme accent background, accentText color, padding 10px/22px, font-size 14px weight 600, subtle drop shadow. Tapping it does **not** end the session immediately — it opens a confirmation dialog.
- **Progress bar**: fixed to the viewport, NOT flush with the bottom edge — sits 28px above the bottom, horizontally inset 5% on each side (90% width), 4px tall, fully rounded ends. Track: `rgba(0,0,0,0.18)`. Fill: theme accent color, width = elapsed/total percentage, animates via `width` transition (linear, ~1s steps as time updates). Entirely non-interactive (no click/drag).
- **Stop confirmation dialog**: appears as a centered modal over a `rgba(0,0,0,0.4)` scrim covering the whole screen. Card: theme background color, border-radius 18px, padding 32px/36px, max-width 320px, centered text, soft shadow. Content: heading "End your session?" (18px, weight 500), subtext "Your progress won't be saved." (14px, muted), then two pill buttons side by side (gap 10px): "Continue" (outline style — transparent bg, theme border) and "End session" (filled, theme accent bg/accentText). "Continue" dismisses the dialog and resumes the session; "End session" stops all timers and returns to Landing.
- **Completion**: when elapsed time reaches the chosen duration, the session ends automatically (no dialog) and returns to Landing.

## Interactions & Behavior
- **Start → Countdown → Session** flow is one continuous state machine; no page reloads.
- Countdown: 1-second interval, 3 ticks, then auto-advances to Session.
- Session: a 1-second interval increments elapsed time and drives the progress bar; a 60-second interval advances the background photo index (mod 3).
- Stop: click Stop → confirmation dialog → "End session" clears all timers and returns to Landing; "Continue" just dismisses the dialog, session keeps running.
- On natural completion (elapsed ≥ total duration), same reset as Stop, but no confirmation shown.
- Returning to Landing resets elapsed time and background index, and closes any open dialog.

## State Management
Minimal state machine, single source of truth:
- `screen`: `'landing' | 'countdown' | 'session'`
- `durationMinutes`: number (derived from selected chip, or from custom hours/minutes)
- `selectedDurationOption`: `'5' | '10' | '20' | 'custom'`
- `customHours`, `customMinutes`: numbers (only relevant when `custom` selected)
- `selectedSound`: `'forest' | 'sea' | 'fireplace' | 'tropical-beach'`
- `videoMode`: `'off' | 'on'` — `'off'` (default) always uses the photo+loop background; `'on'` uses the YouTube video background for sounds that have one mapped, otherwise still falls back to photo+loop
- `countdownVal`: 3 → 0
- `elapsedSeconds`: counts up during session
- `bgIndex`: 0–2, which background photo is active
- `showStopConfirm`: boolean

No backend/data-fetching is implied by the design — everything is local/session state. (A real implementation may want to persist duration/sound preference and swap in real audio playback for the "Sound" selection, which is visual-only in this prototype.)

## Design Tokens

Colors are specified in OKLCH (convert to hex/RGB as needed for the target stack — most modern CSS supports `oklch()` directly).

**Warm (default theme):**
- Background: `oklch(96% 0.012 70)`
- Text: `oklch(28% 0.02 50)`
- Text muted: `oklch(28% 0.02 50 / 0.55)`
- Accent: `oklch(62% 0.09 45)`
- Accent text (on accent): `oklch(98% 0.01 70)`
- Border: `oklch(28% 0.02 50 / 0.14)`
- Card background: `oklch(28% 0.02 50 / 0.05)`

**Cool (alternate):**
- Background: `oklch(96% 0.006 240)`, Text: `oklch(26% 0.02 240)`, Muted: `oklch(26% 0.02 240 / 0.55)`, Accent: `oklch(58% 0.07 235)`, Accent text: `oklch(98% 0.004 240)`, Border: `oklch(26% 0.02 240 / 0.14)`, Card bg: `oklch(26% 0.02 240 / 0.05)`

**Dark / night (alternate):**
- Background: `oklch(20% 0.012 260)`, Text: `oklch(93% 0.01 260)`, Muted: `oklch(93% 0.01 260 / 0.55)`, Accent: `oklch(72% 0.08 280)`, Accent text: `oklch(15% 0.01 260)`, Border: `oklch(93% 0.01 260 / 0.14)`, Card bg: `oklch(93% 0.01 260 / 0.07)`

**Sound icon tints (constant across themes):**
- Forest: `oklch(52% 0.09 150)`
- Sea: `oklch(56% 0.08 230)`
- Fireplace: `oklch(60% 0.13 40)`

**Typography:** Single family — Manrope (Google Font, weights 300/400/500/600/700). Fallback stack: `-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif`.
- Countdown numeral: 180px / weight 300
- Start button: 17px / weight 600
- Stepper numeral: 32px / weight 600, tabular-nums
- Section labels ("Duration", "Sound"): 13px, uppercase, 0.1em letter-spacing, weight 500
- Body/card text: 14–15px, weight 500

**Spacing/shape scale:** pill radius 999px, card radius 16px, dialog radius 18px, section gap 44px, chip gap 10px, sound-card gap 16px.

## Assets
- **Background photos**: user-provided landscape photography — one sample is included (`sample-background.jpeg`, mountain/forest scene) as a placeholder for the "Forest" sound's first background slot. In the final app, plan for 3 photos per sound (9 total) or a simpler CMS-driven pool; images should be calm, low-contrast landscapes that won't fight with white/light UI text and the progress bar.
- **Icons**: hand-built with flat CSS shapes (see Sound section above) — no icon font or SVG library needed; trivial to recreate natively.
- No logo/wordmark is used anywhere in the design (intentionally omitted for a distraction-free feel).

## Files
- `Meditation App.dc.html` — full design reference (all 3 screens + theme switching), in the proprietary template format described above. Read it top-to-bottom for exact structure; cross-reference against this README for pixel values.
- `image-slot.js` — the design tool's placeholder-image component (drag/drop background photo tool). Not needed in the target codebase — just a reference for which 3×3 photo slot ids per sound the prototype used.
- `sample-background.jpeg` — sample background photo used during design review.
