# Stick War — Three.js Project Rules

This is a faithful modern recreation of the 2009 Flash game *Stick War* using Three.js + TypeScript. The goal is to capture the addictive "mine → produce → micro" loop with clean, understandable code.

## Core Philosophy
- **Fun first, then fidelity.** Make the core loop feel great before adding every unit from the original.
- **100% procedural / asset-free** in the base game (no external images, models, or sounds unless explicitly added later).
- **Simple mental model**: Plain data `Unit` objects + fixed-timestep simulation. Rendering is a thin, dumb sync layer.
- **Iteration speed matters**. Constants should be easy to tweak. HMR should feel instant.

## Architecture & Conventions

### Simulation vs Rendering
- **Game.ts** owns all authoritative state and logic (units, economy, combat, production, AI).
- **main.ts** (and rendering/) only syncs visuals from `game.units` and `game.state`. Never mutate simulation state from render code.
- Use a **fixed 30 Hz timestep** (`FIXED_STEP` from constants) for all logic. Rendering can run at display rate.

### Data Model
- Keep `Unit` as a plain interface (see types.ts). Add fields only when truly needed.
- Visual-only or transient state belongs in Maps in main.ts (meshes, health bars, selection rings) or as optional fields marked clearly (e.g. `animTime?`).
- Prefer explicit state machines over implicit flags.

### Adding New Units / Mechanics
1. Add constants to `constants.ts` (cost, hp, speed, attackDamage, buildTime, etc.).
2. Extend `UnitType` in types.ts if needed.
3. Implement behavior in `Game.update()` (or a cleanly extracted system later).
4. Extend `createStickFigure()` for the visual.
5. Wire production button + any UI in main.ts.

### Code Style
- TypeScript strict. Avoid `any` except for well-documented one-off visual hacks (and even then prefer branded types or Maps).
- Small focused functions. Extract systems when Game.ts grows too large.
- No heavy frameworks. Vanilla DOM + Three.js.
- Comments explain *why*, not just *what* (especially for combat, economy timing, and pursuit logic).

## What Good Changes Look Like
- A new feature can be turned on/off via constants or a small feature flag.
- Existing miners/swordwrath behavior does not regress.
- The game still feels responsive at 30 Hz logic rate.
- New visuals stay consistent with the thin, high-contrast "classic ink" stick figure style.

## What to Avoid
- Putting game logic in render code or event handlers.
- Large PRs that touch economy + combat + rendering + UI all at once.
- Adding external asset dependencies without a clear plan.
- Over-engineering early (no ECS until the unit count or complexity justifies it).

## Current Focus Areas (as of 2025)
See the improvement plan and README roadmap:
- Polish & UX (production queue feedback, unit counts, better command visualization)
- Type safety cleanup (`_damageFlash`, `animTime`, etc.)
- Extracting systems from the monolithic `Game` class
- Next unit: Archidons (ranged) — the first major new unit type
- Enemy AI improvements (focus fire, statue prioritization, basic formations)

## Testing & Verification
- Run `npm run typecheck` and `npm run build` before considering a change complete.
- Playtest the core loop (gold flow, combat feel, command responsiveness) after every significant change.
- For simulation logic changes, consider adding lightweight tests in a future `tests/` directory.

## Git & Workflow
- Keep the demo playable at every step. The `main` branch should always be fun to load.
- Small, reviewable commits. One logical change per commit when possible.
- Update this file when patterns or constraints evolve.

---

**Remember the original magic**: one gold mine, two statues, simple units, and deep emergent strategy from real-time decisions. Protect that feeling above all.
