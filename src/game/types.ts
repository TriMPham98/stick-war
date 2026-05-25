/**
 * Core domain types for Stick War Three.js (MVP)
 * Plain data — no methods. Systems mutate these.
 */

export type Team = 0 | 1; // 0 = player (left/Order), 1 = enemy (right)

export type UnitType = 'miner' | 'swordwrath';

export type UnitState =
  | 'idle'
  | 'moving'
  | 'mining'
  | 'returning'
  | 'attacking'
  | 'dead';

export interface Unit {
  id: number;
  type: UnitType;
  team: Team;
  x: number;           // primary simulation position on the 1D lane
  z?: number;          // tiny visual-only offset (logic never reads this)
  health: number;
  maxHealth: number;
  state: UnitState;
  targetX?: number;
  targetEnemyId?: number;
  carryGold?: number;  // only meaningful for miners
  attackCooldown: number;
  // Visual-only animation state (updated by render sync, never used by game logic)
  animTime?: number;
  /** Transient visual flash timer (seconds). Set by combat, consumed by renderer. */
  damageFlash?: number;
}

export interface ProductionOrder {
  type: UnitType;
  progress: number;    // seconds elapsed
  totalTime: number;   // seconds required
}

export interface GameState {
  gold: number;
  units: Unit[];
  playerStatueHP: number;
  enemyStatueHP: number;
  productionQueue: ProductionOrder[];
  // Future: selectedUnitIds, lastSpawnId counter, etc.
}
