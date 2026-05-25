/**
 * Game orchestrator — Phase 1.4 real Miner economy core loop
 * Plain data + simple update loop. No external systems yet (kept simple per approved plan).
 */

import type { GameState, Unit, UnitType } from './types';
import {
  MINER,
  SWORDWRATH,
  GOLD_START,
  GOLD_NODE_X,
  PLAYER_STATUE_X,
  LANE_MIN_X,
  LANE_MAX_X,
  ENEMY_SPAWN_INTERVAL,
} from './constants';
import { ProductionSystem } from './production';
import { EnemySpawner } from './EnemySpawner';
import { CombatSystem } from './CombatSystem';

let nextId = 1;

function createUnit(type: UnitType, team: 0 | 1, x: number): Unit {
  const def = type === 'miner' ? MINER : SWORDWRATH;
  return {
    id: nextId++,
    type,
    team,
    x,
    health: def.hp,
    maxHealth: def.maxHealth,
    state: 'moving',
    attackCooldown: 0,
    targetX: type === 'miner' ? GOLD_NODE_X : undefined,
  };
}

function distance(a: number, b: number) {
  return Math.abs(a - b);
}

export class Game {
  state: GameState;
  private production: ProductionSystem;
  private spawner: EnemySpawner;
  private combat: CombatSystem;

  // Phase 4 stats
  gameStartTime = performance.now();
  totalGoldEarned = 0;
  unitsProduced = 0;

  constructor() {
    this.state = {
      gold: GOLD_START,
      units: [],
      playerStatueHP: 650,
      enemyStatueHP: 650,
      productionQueue: [],
    };

    // Starting miners — increased for easier early game
    this.state.units.push(createUnit('miner', 0, -18));
    this.state.units.push(createUnit('miner', 0, -20.5));
    this.state.units.push(createUnit('miner', 0, -15));
    this.state.units.push(createUnit('miner', 0, -23)); // extra miner to make the level easier

    this.production = new ProductionSystem(this.state);
    this.spawner = new EnemySpawner(ENEMY_SPAWN_INTERVAL); // slower spawns = easier level
    this.combat = new CombatSystem(this.state);
  }

  update(dt: number) {
    // === Production Queue (delegated to ProductionSystem) ===
    const finishedType = this.production.update(dt);
    if (finishedType) {
      const spawnX = PLAYER_STATUE_X + 3;
      const unit = this.spawnUnit(finishedType, 0, spawnX);
      unit.targetX = GOLD_NODE_X + (Math.random() - 0.5) * 8;
    }

    // === Enemy AI Spawner (delegated) ===
    const spawn = this.spawner.update(dt);
    if (spawn) {
      const u = this.spawnUnit(spawn.type, 1, spawn.spawnX);
      u.targetX = spawn.targetX;
    }

    // === Miner Economy (existing) ===
    const miners = this.state.units.filter((u) => u.type === 'miner' && u.team === 0 && u.state !== 'dead');

    for (const miner of miners) {
      const speed = MINER.speed;
      const mineX = GOLD_NODE_X;
      const depositX = PLAYER_STATUE_X;

      switch (miner.state) {
        case 'moving':
        case 'idle': {
          const target = miner.targetX ?? mineX;
          const dir = Math.sign(target - miner.x);
          miner.x += dir * speed * dt;

          if (distance(miner.x, mineX) < 0.8) {
            miner.state = 'mining';
            miner.targetX = undefined;
          }
          break;
        }

        case 'mining': {
          miner.animTime = (miner.animTime ?? 0) + dt;
          if (miner.animTime >= MINER.mineTime) {
            miner.carryGold = MINER.goldPerTrip;
            miner.animTime = 0;
            miner.state = 'returning';
            miner.targetX = depositX;
          }
          break;
        }

        case 'returning': {
          const dir = Math.sign(depositX - miner.x);
          miner.x += dir * speed * dt;

          if (distance(miner.x, depositX) < 1.2) {
            if (miner.carryGold) {
              this.state.gold += miner.carryGold;
              this.totalGoldEarned += miner.carryGold;
              miner.carryGold = 0;
            }
            miner.state = 'moving';
            miner.targetX = mineX;
          }
          break;
        }
      }

      miner.x = Math.max(LANE_MIN_X + 2, Math.min(LANE_MAX_X - 2, miner.x));

      // Separation
      for (const other of miners) {
        if (other.id === miner.id) continue;
        const d = distance(miner.x, other.x);
        if (d < 1.6 && d > 0.01) {
          const push = (1.6 - d) * 0.6;
          const sign = Math.sign(miner.x - other.x) || 1;
          miner.x += push * sign * dt;
        }
      }
    }

    // === General movement for all units with targets (Phase 2) ===
    for (const unit of this.state.units) {
      if (unit.state === 'dead') continue;
      if (unit.type === 'miner' && unit.team === 0) continue; // miners handled by economy logic

      // Auto-pursuit behavior: acquire nearest enemy if no explicit order (for swordwrath mainly)
      if (!unit.targetX && !unit.targetEnemyId && unit.type !== 'miner') {
        const aggroRange = 14;
        let nearest: Unit | null = null;
        let minDist = Infinity;
        for (const other of this.state.units) {
          if (other.team === unit.team || other.state === 'dead') continue;
          const d = distance(unit.x, other.x);
          if (d < aggroRange && d < minDist) {
            minDist = d;
            nearest = other;
          }
        }
        if (nearest) {
          unit.targetEnemyId = nearest.id;
        }
      }

      let targetX: number | undefined = unit.targetX;

      // Pursuit logic for explicit attack commands (this was missing)
      if (unit.targetEnemyId) {
        const enemy = this.state.units.find(u => u.id === unit.targetEnemyId && u.state !== 'dead');
        if (enemy) {
          targetX = enemy.x;
        } else {
          // Enemy died — clear the command
          unit.targetEnemyId = undefined;
        }
      }

      if (!targetX) continue;

      const speed = (unit.type === 'miner' ? MINER : SWORDWRATH).speed;
      const dir = Math.sign(targetX - unit.x);
      unit.x += dir * speed * dt;

      // Clamp
      unit.x = Math.max(LANE_MIN_X + 1, Math.min(LANE_MAX_X - 1, unit.x));

      // If we were moving to a location and got close, clear the order (arrival)
      if (!unit.targetEnemyId && Math.abs(unit.x - targetX) < 1.5) {
        unit.targetX = undefined;
      }
    }

    // === Combat (delegated to CombatSystem) ===
    this.combat.update(dt);

    // Unit separation (all units, prevent overlap) - minimal addition (moved after combat so statue DPS uses stable pre-sep positions for the tick)
    const allLiving = this.state.units.filter(u => u.state !== 'dead' && !(u.type === 'miner' && u.team === 0));
    for (let i = 0; i < allLiving.length; i++) {
      for (let j = i + 1; j < allLiving.length; j++) {
        const a = allLiving[i], b = allLiving[j];
        const d = distance(a.x, b.x);
        if (d < 1.3 && d > 0.05) {
          const p = (1.3 - d) * 0.4 * dt;
          const s = Math.sign(a.x - b.x) || 1;
          a.x += p * s;
          b.x -= p * s;
          a.x = Math.max(LANE_MIN_X + 1, Math.min(LANE_MAX_X - 1, a.x));
          b.x = Math.max(LANE_MIN_X + 1, Math.min(LANE_MAX_X - 1, b.x));
        }
      }
    }
  }

  /** Queue a unit for production (spends gold immediately) */
  queueUnit(type: UnitType): boolean {
    const def = type === 'miner' ? MINER : SWORDWRATH;
    if (this.state.gold < def.cost) return false;

    this.state.gold -= def.cost;
    this.unitsProduced += 1;

    return this.production.queue(type);
  }

  private spawnUnit(type: UnitType, team: 0 | 1, x: number): Unit {
    const def = type === 'miner' ? MINER : SWORDWRATH;
    const unit: Unit = {
      id: nextId++,
      type,
      team,
      x,
      health: def.hp,
      maxHealth: def.maxHealth,
      state: 'moving',
      attackCooldown: 0,
      targetX: team === 0 ? GOLD_NODE_X + 10 : GOLD_NODE_X - 10, // head toward center
    };
    this.state.units.push(unit);
    return unit;
  }

  /** Very basic combat for Phase 2 */
  get units(): Unit[] {
    return this.state.units;
  }

  get gold(): number {
    return this.state.gold;
  }

  get playerStatueHP(): number {
    return Math.max(0, Math.floor(this.state.playerStatueHP));
  }

  get enemyStatueHP(): number {
    return Math.max(0, Math.floor(this.state.enemyStatueHP));
  }

  /** Quick way to know if game is over */
  get isGameOver(): boolean {
    return this.state.playerStatueHP <= 0 || this.state.enemyStatueHP <= 0;
  }

  // Phase 4 stats getters
  getGameDuration(): number {
    return Math.floor((performance.now() - this.gameStartTime) / 1000);
  }

  getTotalGoldEarned(): number {
    return Math.floor(this.totalGoldEarned);
  }

  getUnitsProduced(): number {
    return this.unitsProduced;
  }
}

