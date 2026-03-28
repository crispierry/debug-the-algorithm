# Debug the Algorithm

A generated daily logic deduction puzzle game for [crispierry.com](https://crispierry.com).

ARIA, your friendly (but glitchy) recommendation AI, scrambles user content recommendations every day. Read the system log clues, fill the logic grid, and figure out who got what.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build for Production

```bash
npm run build
```

Output goes to `dist/` -- deploy anywhere (Vercel, Netlify, static host, or embed in your existing site).

## Deploy to Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `22`

`netlify.toml` is included, so Netlify can pick up the build settings automatically.

## QA and Production Deploys

This repo is set up for manual Netlify deploys so you can avoid Netlify's Git-triggered build pipeline and keep credit usage under control.

- QA deploy: `npm run deploy:qa`
- Production deploy: `npm run deploy:prod`
- GitHub Actions workflows:
  - `Netlify QA Deploy`
  - `Netlify Production Deploy`

Recommended setup:

- Keep Netlify Git auto-deploys disabled for this site
- Use the QA workflow or `npm run deploy:qa` for reviewable test deploys
- Use the production workflow or `npm run deploy:prod` only when you want to ship

GitHub Actions expects these repository secrets:

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

The QA workflow publishes a stable draft URL alias named `qa-preview`. Production deploys publish to the main site URL.

## Project Structure

```
src/
  DebugTheAlgorithm.jsx   -- Full game (generator, UI, state, styles)
  main.jsx                -- React entry point
```

## How the Puzzle Generator Works

1. A seeded RNG creates deterministic puzzles from the current date
2. Random users and content categories are selected
3. A valid solution (1-to-1 matching) is generated
4. Clue templates are filled from the solution to create each day's puzzle
5. Clues are shuffled for presentation

## Customization

- Edit `USERS` array to change character names, colors, and emojis
- Edit `CONTENT` array for different content categories
- Edit `CT` (clue templates) to change ARIA's voice
- Adjust difficulty settings in `generatePuzzle()`

## Next Steps (v2)

- [ ] Constraint satisfaction solver for guaranteed unique solutions
- [ ] Expanded clue template library
- [ ] Sound effects
- [ ] ARIA character animations
- [ ] Backend leaderboard
- [ ] Weekly "conspiracy arc" puzzles
