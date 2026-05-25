# Stick War — Three.js

A modern Three.js recreation of the classic 2009 Flash strategy game *Stick War* by Jason Whitham (Crazy Jay).

Mine gold with stick figure miners, train an army of Swordwrath and Miners, command them in real-time, and destroy the enemy statue before they destroy yours.

**Play the demo:** [Live on GitHub Pages](https://trimpham98.github.io/stick-war/) (or deploy locally)

![Gameplay](https://via.placeholder.com/800x450/1a1a1a/5ab0ff?text=Stick+War+Three.js+Gameplay)

## Features

- Faithful side-view 2D gameplay in 3D (orthographic camera)
- Real-time economy with autonomous miners that mine, return, and deposit gold
- Production queue for Miners and Swordwrath
- Real-time combat with damage flashes and pursuit behavior
- Full unit command system:
  - Left-click to select (Shift/Cmd for multi-select)
  - Right-click to issue Move or Attack orders
  - **S** key to Stop selected units
  - Visual order markers appear when commands are issued
- Floating health bars above units and statues
- Simple enemy AI that sends waves
- Win/lose conditions with post-game stats (time, gold earned, units trained)

## Controls

**Unit Commands**
- **Left-click** units → Select (hold **Shift** or **Cmd** for multi-select)
- **Right-click** on the ground → Give Move or Attack order (intelligently targets nearby enemies)
- Press **S** → **Stop** all selected units (clears their orders)

**Camera & Interface**
- **Left mouse drag** → Pan the camera along the battlefield
- **Scroll wheel** → Zoom in/out
- **R** → Reset camera position
- **Esc** → Deselect all units
- **Space** → Print debug state to console

**Production**
- Click the buttons on the left panel to queue Miners or Swordwrath (spends gold immediately)

When units are selected, a helpful command hint appears in the top bar.

## How to Run Locally

```bash
git clone https://github.com/TriMPham98/stick-war.git
cd stick-war
npm install
npm run dev
```

Open http://localhost:5173

Build for production:
```bash
npm run build
npm run preview
```

## Tech Stack

- Vite + TypeScript
- Three.js (r128+)
- Pure vanilla HTML/CSS/JS for UI (no heavy frameworks)
- 100% procedural visuals (no external assets)

## Architecture Notes

The game uses a clean separation:

- `src/game/Game.ts` — Core simulation (units, economy, combat, production queue, AI spawner, command execution including pursuit and Stop)
- `src/game/rendering/createStickFigure.ts` — Procedural stickman generator (thin classic style)
- `src/main.ts` — Three.js scene setup, render loop, input handling, DOM overlays (health bars, selection rings, order markers)
- Plain data `Unit` objects + fixed 30 Hz timestep for logic

This keeps the simulation deterministic and easy to reason about while the rendering layer stays as a thin sync.

## Current State

This is a functional vertical slice of the classic Stick War experience:

- Working economy loop
- Unit production
- Real-time combat with visual feedback
- Complete unit command system (select, move, attack, stop)
- Health bars, selection highlights, and command feedback
- Win/lose with stats

It's not a full campaign recreation, but the core addictive loop is there and playable.

## Credits & Inspiration

- Original **Stick War** (2009) by Jason Whitham / Crazy Jay
- The addictive "mine → produce → micro" loop that defined a generation of Flash strategy games

This project is a non-commercial fan recreation built for learning Three.js, game loops, and systems architecture.

## Roadmap / Future Ideas

See the internal `plan.md` in the repo history for the original phased plan.

Possible extensions:
- Archidons (ranged)
- Manual unit control (the classic "possess" feature)
- Better animations & particles
- Sound effects
- Multiple levels / campaign map

## Deployment

This project is configured for easy deployment:

- **Vercel** (recommended): Connect the repo → Deploy. Zero config for Vite.
- **GitHub Pages**: Enable in repo settings after building to `dist/`.

## License

MIT — feel free to use the code as a learning reference or starting point for your own Three.js RTS experiments.

---

Made with ☕ and nostalgia for the golden age of browser games. 

If you enjoyed this, go play the original *Stick War* series!