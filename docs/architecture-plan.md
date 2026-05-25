# Stick War — Architecture Refactoring Plan (2025)

## Current Problem
`Game.ts` (~355 LOC) has become a God Class. It owns:
- Production queue + spawning
- Enemy wave spawning (AI)
- Full miner economy state machine
- General unit movement + pursuit
- Complete combat resolution + statue damage
- Multiple separation passes
- Stats tracking

This makes the class hard to reason about, test, and extend (especially when we add Archidons, better AI, etc.).

## Guiding Principles (from .claude/CLAUDE.md)
- Keep simulation authoritative in plain data.
- Fixed 30 Hz timestep.
- Extract systems when complexity grows.
- Prefer small focused modules over one giant orchestrator.

## Proposed Extraction Order

### Phase A — Low Risk, High Value
1. **ProductionSystem** (`src/game/production.ts`)
   - Manages `productionQueue`
   - Handles progress + completion
   - Spawns units when orders finish
   - Exposes `queueUnit(type)` and `update(dt)`

2. **EnemyAISpawner** (small, can live in `ai/spawner.ts` or stay simple)
   - Timer + wave logic

### Phase B — Core Simulation
3. **CombatSystem**
   - Pairwise damage
   - Death processing
   - Statue damage calculation
   - Returns "events" or mutates units in place (decide during impl)

4. **EconomySystem** (or keep miner logic in Game for now)
   - Player miner state machine (the heart of the game feel)
   - Separation specific to miners

### Phase C — Later
- Movement / pathing / pursuit as a shared utility
- Full AI director for enemy

## First Target: ProductionSystem

**Why first?**
- Clear boundary
- Already somewhat isolated (`state.productionQueue`, `queueUnit`, spawn logic)
- Easy to test in isolation
- Unblocks future "multiple production buildings" or "cancel queue" features

**Interface sketch**
```ts
export class ProductionSystem {
  constructor(private state: GameState) {}

  queue(type: UnitType): boolean;
  update(dt: number): UnitType | null; // returns type if something finished
}
```

The `Game` class will delegate to it.

## Non-Goals (for now)
- Full ECS
- Event bus (too heavy for current scale)
- Changing the public surface used by `main.ts` dramatically

## Verification
After every extraction:
- `npm run typecheck`
- `npm run build`
- Manual playtest of economy + combat + commands for at least 2 minutes

---

## Progress Log

**Completed (this session):**
- **ProductionSystem** — extracted cleanly. Game delegates queue + progress.
- **EnemySpawner** — small, self-contained timer + spawn request generator.
- **CombatSystem** — full pairwise combat + death cleanup + statue DPS moved out. Game now just calls `combat.update(dt)`.

Game.ts is noticeably smaller and more focused. The three major simulation concerns (Production, Combat, Enemy spawning) are now in their own modules.

Remaining big item: Miner economy + separation logic (the most "core gameplay" code).

---

Status: Strong progress on architecture cleanup. All extractions verified with clean builds.
