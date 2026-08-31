# Geometry Dash Clone

A 2D side-scrolling platformer inspired by *Geometry Dash*, built with plain
HTML5 Canvas and vanilla JavaScript — no build step, no dependencies.

Play instantly in your browser — no installation required.

**Play it live:** https://viyanprathiban31.github.io/Geometry-Dash-Clone/

## How to play

- **Space**, click, or tap — jump
- **R** — restart the current level
- **Esc** or the **Menu** button — back to the level select screen
- Dodge spikes and blocks, ride gravity-flip and speed portals, and reach
  the end of the level.

A full in-game manual is also one click away — hit **How to Play** on the
main menu.

## Features

- **12 levels total**: a **Beginner** warm-up, the core **10-level**
  difficulty staircase from easy to hard (each with its own color palette
  and music, introducing gravity-flip portals, speed portals, and tighter
  platforming as you progress), and **Pro** — a long, intimidating-looking
  bonus level that's actually easy, just very long.
- **7 unlockable skins**, earned by beating specific levels, completing a
  number of levels, or dodging 100 spikes in a row without dying — plus a
  secret one found only through a cheat code.
- **Level Maker** — build and save your own levels (unlimited), with a
  toolbar for spikes, blocks, gravity-flip portals, speed portals, and a
  "Godzilla" pickup that smashes every block in the level on touch. Test,
  save, edit, and delete your creations from the main menu's **My Levels**
  section.
- **Autoplay** — a toggle that plays the level for you.
- **Cheat codes** — type these anywhere in-game:
  - `cheat` — unlocks every normally-earnable skin and turns on an easier
    mode (slower run speed, more forgiving hitbox)
  - `master` — marks every built-in level as completed
  - `goji` — unlocks a secret oversized "Ultra Godzilla" skin that destroys
    obstacles instead of dying to them
- A mute toggle and a synced, procedurally generated chiptune soundtrack.

See [DESIGN.md](DESIGN.md) for the full level/skin/mechanics reference.

## Running it locally

This is a static site — no build tools, no server required. Just open
`index.html` in a browser, or serve the folder with any static file server,
e.g.:

```
npx serve .
```

## Project structure

| File | Purpose |
|------|---------|
| `index.html` | Page structure, all UI overlays (menu, skins, editor, win screen) |
| `style.css` | Neon visual styling |
| `levels.js` | The 10 built-in levels, obstacle/portal/decoration builder helpers, procedural music generator |
| `skins.js` | All player skins and their unlock conditions |
| `audio.js` | The chiptune music engine (Web Audio API, lookahead scheduler) |
| `game.js` | Game loop, physics, collision, rendering, persistence, level editor, menus |
| `DESIGN.md` | Full design reference for levels, skins, mechanics, and cheat codes |

## Deploying / publishing

The `main` branch is served directly by GitHub Pages — pushing to `main`
updates the live site at the URL above (may take a minute or two to
propagate). No build step is needed since this is a plain static site.
