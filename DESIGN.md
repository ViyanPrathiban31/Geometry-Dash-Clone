# Geometry Dash Clone — Design Reference

Source of truth for level and skin content. Level data lives in `levels.js`
(`LEVELS` array), skin data lives in `skins.js` (`SKINS` array) — this doc
mirrors that data for quick scanning; keep both in sync when tuning.

## Difficulty staircase

| Tier | Levels | Player-facing difficulty |
|------|--------|---------------------------|
| Easy | 1–3 | Basic jump timing only. No portals. |
| Medium | 4–6 | Introduces gravity-flip and speed portals, tighter spacing. |
| Hard | 7–10 | Tight gaps, dense spikes, fast/very fast sections, all mechanics combined. |

Color palette arcs from **neon blue** (Level 1) to **fiery red/orange**
(Levels 9–10), with music BPM climbing from 120 to 176 alongside it.

## Levels

| # | Name | Tier | Length | BPM | New mechanic | Palette (primary / secondary) |
|---|------|------|--------|-----|---------------|-------------------------------|
| — | **Beginner** | Beginner | 2000 | 108 | A short, gently-spaced warm-up. No portals. | Calm cyan / mint |
| 1 | First Steps | Easy | 2900 | 120 | — | Neon green / neon blue |
| 2 | Cube Rhythm | Easy | 3200 | 126 | Block staircases | Neon green / yellow |
| 3 | Spike Alley | Easy | 3400 | 132 | Denser spike clusters | Neon blue / purple |
| 4 | Gravity Shift | Medium | 3800 | 138 | **Gravity-flip portals** + ceiling spikes | Purple / pink |
| 5 | Turbo Lane | Medium | 4000 | 145 | **Speed portals** (0.6×–1.8×) | Pink / orange |
| 6 | Twist & Flip | Medium | 4200 | 150 | Gravity + speed combined | Cyan / pink |
| 7 | Needle Storm | Hard | 4500 | 158 | Tight gaps, dense spike rows, 2× bursts | Red / orange |
| 8 | Blackout Run | Hard | 4700 | 165 | Fast pace, moody dark palette | Purple / deep violet |
| 9 | **Molten Core** | Hard | 5000 | 170 | Lava theme — heavy gravity flips over lava spikes. **Unlocks the Magma skin.** | Fiery red / orange / yellow |
| 10 | Final Ascent | Hard | 5400 | 176 | Finale — every mechanic, 3× sprint finish | Red / orange, full-spectrum accents |
| — | **Pro** | Pro | 8500 | 200 | The longest level by far, on purpose. | Blood red / white, glitch-fast |

All 12 levels are open from the start (no sequential unlock gating). Beginner
and Pro are extras that sit outside the 1–10 difficulty staircase — Beginner
at the very front of the menu, Pro at the very end.

**Pro is a deliberate joke-turned-design-choice**: darkest palette, fastest
BPM (200), densest decorations in the game, and by far the longest level —
everything about its *presentation* screams "impossible." Mechanically,
though, `marathonPattern()` in `levels.js` generates it from the same
generously-spaced, single-spike/single-block units as the Easy tier, with no
portals at all. It's "actually kind of easy" — length and nerve are the only
real obstacles. Both extras use their own tier value (`'beginner'` / `'pro'`)
purely for menu badge styling; they play by identical rules to every other
level otherwise, and completing either counts toward the normal
level-count skin unlocks (Prism, Aurora) same as any of the 10.

### Mechanics

- **Gravity portal** — vertical trigger line; touching one sets which surface
  (ground or ceiling) is "down" for the player. Jump direction, fall
  direction, and resting orientation all flip with it. Reverts on the next
  gravity portal (or on respawn — always resets to normal gravity).
- **Speed portal** — vertical trigger line; touching one changes the
  auto-scroll multiplier (0.6× up to 3×), GD-style.
- **Ceiling-mounted spikes** — only appear in gravity-flip sections, mirrored
  hazards for when the ceiling is acting as the floor.

## Skins

| Skin | Look | Unlock condition |
|------|------|-------------------|
| Cube Classic | Smiley-face cube | Unlocked from the start |
| Godzilla | Green spiky dinosaur cube | Dodge 100 spikes in a row across any levels (streak resets on death) |
| Prism | Faceted crystal, continuously shifting hue | Complete any 3 levels |
| Magma | Cracked rock with glowing, pulsing lava veins | Beat Level 9, "Molten Core" |
| Aurora | Pastel cube with shimmering aurora bands | Complete any 6 levels |
| Voidwalker | Black cube with a twinkling starfield | Beat Level 10, "Final Ascent" |
| Ultra Godzilla | Oversized, glowing spiky dinosaur (renders ~1.7× size) | Secret — the "goji" cheat code only |

All skins are drawn procedurally with canvas paths — no image/sprite assets.
Ultra Godzilla is also a gameplay cheat, not just a look: while it's equipped,
touching a spike or block destroys that obstacle (small explosion, it's
removed for the rest of the attempt) instead of killing the player — the
player becomes unkillable by anything in the level. See `isInvincible()`
in `game.js`. Destroyed obstacles reset back to normal on the next
respawn/level load.

## Level Maker

A full in-game level editor, reachable from the main menu's **Level Maker**
button. Custom levels are plain data shaped exactly like the 10 built-in
ones (obstacles, portals, palette, music, decorations), just kept in
`save.customLevels` — an unlimited list, no cap on how many levels you can
save, how long a level can be, or how many objects it holds (only real
limits are the browser's localStorage quota). `tier: 'custom'` is what
distinguishes them from the built-in 10 wherever that matters (HUD label,
hiding "Next Level" on the win screen, etc.) rather than id, since a level
being test-played before its first save has no id yet.

**Toolbar** (bottom bar over the canvas — unlike every other screen, this
one doesn't cover the canvas, so it stays clickable for placement):
- **Spike** — click below the vertical midline for a ground spike, above it
  for a ceiling spike.
- **Block** — click at the height you want; snaps to one of 5 lanes (ground,
  and four platform heights up to the ceiling).
- **Gravity Flip ↓ / ↑** — places a gravity portal (the "screen flip"
  mechanic) with a fixed direction, reusing the exact portal system the
  built-in medium/hard levels use.
- **Speed Portal** — placed with whatever multiplier is chosen in the
  adjacent dropdown (0.5×–3×).
- **Godzilla** — a placeable, one-time pickup. During play, touching it
  destroys every block currently in the level in one hit (explosion effect
  per block) — spikes are unaffected. Non-lethal, resets on respawn.
- **Eraser** — removes whatever placed object (of any type) is closest to
  the click, within a small tolerance.

All placement snaps to a 20px grid on a click-to-place model — no drag/resize.
**Extend +500** grows the level length for empty runway at the end; placing
anything past the current length also auto-extends it. Scroll ← / → pan the
edit view in 400px steps (levels can be arbitrarily long). A palette dropdown
(5 presets) sets the level's color theme.

**Save** writes to `save.customLevels` (assigns a `custom-<timestamp>` id on
first save, overwrites in place afterward) and returns to the toolbar so you
keep editing. **Test Play** runs the in-progress level immediately, saved or
not. **Back** returns to the menu without saving. From a custom level's win
screen, **Back to Editor** reopens exactly what you were just playing
(works whether it was saved or was only a Test Play).

The **My Levels** section at the bottom of the main menu lists every saved
custom level with its cleared status, plus **Edit** and **Delete** (native
`confirm()` before delete — it's not recoverable) buttons; clicking the row
itself plays it. Level names are user text and get HTML-escaped
(`escapeHtml()`) before insertion — they're the only user-supplied strings
rendered anywhere in this codebase, so that's the one place it matters.

## How to Play manual

An in-game "How to Play" button on the main menu opens a scrollable overlay
covering controls, the obstacle legend, portals, the Godzilla pickup, what
Beginner/Pro/1–10 each mean, the Level Maker, skins, and a one-line teaser
about cheat codes (deliberately not spelling them out — see Cheat codes
below for the actual list). This is the manual players actually see, since
the deployed GitHub Pages site only serves `index.html` — this repo's
markdown files aren't visible to someone just playing the game.

## Autoplay

HUD toggle button, off by default, not persisted across reloads. While on:

- The game still auto-jumps whenever any obstacle's near edge is within
  ~95px ahead of the player and grounded (`maybeAutoJump()`), so it looks
  like it's actually playing.
- As a guarantee on top of that, the player is invincible while autoplay is
  on: any spike/block touch that would normally kill the player instead
  destroys that obstacle (same small-explosion effect as the Ultra Godzilla
  skin's rampage mode) and lets the run continue. This is what makes
  autoplay reliably finish the level rather than just "usually" clear it —
  see `isInvincible()` in `game.js`, which the block/spike collision code
  checks in place of the old rampage-only check.

## Cheat codes

Typed anywhere in-game (no input box — just type on the keyboard), detected
by a rolling buffer of recent letter keys in `handleCheatKey()`:

| Type | Effect |
|------|--------|
| **cheat** | Toggles cheat mode: unlocks every *normally-earnable* skin (permanently, via the save) and turns on an easier mode — auto-run speed drops to 0.75×, hitbox becomes more forgiving (9px inset vs. the normal 5px). Type it again to turn it back off (skins already unlocked stay unlocked). |
| **master** | Marks every level as completed in the save. Cascades into any level-count/level-id skin unlocks (Prism, Aurora, Magma, Voidwalker) that are now satisfied. |
| **goji** | Unlocks the secret Ultra Godzilla skin (see Skins above). Doesn't equip it automatically — pick it in the Skins menu. |

Each triggers a toast confirming what happened, and refreshes the level/skin
grids live if they're open. Adding a new code is a one-line addition to the
`CHEAT_CODES` list in `game.js`.

## Persistence

Single `localStorage` key `gdclone_save_v1` holds: completed level ids, the
current and best spike streak, unlocked skin ids, the selected skin, and the
mute flag. See `defaultSave()` in `game.js` for the exact shape.
