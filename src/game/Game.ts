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
  ENEMY_STATUE_X,
  LANE_MIN_X,
  LANE_MAX_X,
} from './constants';

let nextId = 1;

function createUnit(type: UnitType, team: 0 | 1, x: number): Unit {
  const def = type === 'miner' ? MINER : ({} as any);
  return {
    id: nextId++,
    type,
    team,
    x,
    health: def.hp ?? 60,
    maxHealth: def.maxHealth ?? 60,
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
  private enemySpawnTimer = 0;
  private enemySpawnInterval = 7.5; // seconds between enemy waves (tunable)

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

    // Three real Miners — the heart of the MVP economy
    this.state.units.push(createUnit('miner', 0, -18));
    this.state.units.push(createUnit('miner', 0, -20.5));
    this.state.units.push(createUnit('miner', 0, -15));
  }

  update(dt: number) {
    // === Production Queue (Phase 2) ===
    if (this.state.productionQueue.length > 0) {
      const current = this.state.productionQueue[0];
      current.progress += dt;

      if (current.progress >= current.totalTime) {
        const spawnX = PLAYER_STATUE_X + 3;
        const unit = this.spawnUnit(current.type, 0, spawnX);
        unit.targetX = GOLD_NODE_X + (Math.random() - 0.5) * 8;
        this.state.productionQueue.shift();
      }
    }

    // === Simple Enemy AI Spawner (Phase 2.4) ===
    this.enemySpawnTimer += dt;
    if (this.enemySpawnTimer >= this.enemySpawnInterval) {
      this.enemySpawnTimer = 0;
      // Spawn 1-2 enemy units (mix of miner and swordwrath)
      const enemyType: UnitType = Math.random() > 0.35 ? 'swordwrath' : 'miner';
      const spawnX = ENEMY_STATUE_X - 3; // right side
      const u = this.spawnUnit(enemyType, 1, spawnX);
      u.targetX = GOLD_NODE_X - 5 + (Math.random() - 0.5) * 6;
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

    // === Combat (Phase 2.3) ===
    this.processCombat(dt);
  }

  /** Queue a unit for production (spends gold immediately) */
  queueUnit(type: UnitType): boolean {
    const def = type === 'miner' ? MINER : SWORDWRATH;
    if (this.state.gold < def.cost) return false;

    this.state.gold -= def.cost;
    this.unitsProduced += 1;

    this.state.productionQueue.push({
      type,
      progress: 0,
      totalTime: def.buildTime,
    });

    return true;
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
  private processCombat(dt: number) {
    const living = this.state.units.filter(u => u.state !== 'dead');

    for (let i = 0; i < living.length; i++) {
      const a = living[i];
      if (a.attackCooldown > 0) a.attackCooldown -= dt;

      for (let j = i + 1; j < living.length; j++) {
        const b = living[j];
        if (a.team === b.team) continue;

        const dist = distance(a.x, b.x);
        const range = (a.type === 'miner' ? MINER : SWORDWRATH).attackRange;

        if (dist < range && a.attackCooldown <= 0) {
          // a attacks b
          const dmg = (a.type === 'miner' ? MINER : SWORDWRATH).attackDamage;
          b.health -= dmg;
          (b as any)._damageFlash = 0.35; // visual flash timer (seconds)
          a.attackCooldown = (a.type === 'miner' ? MINER : SWORDWRATH).attackCooldown;

          if (b.health <= 0) {
            b.state = 'dead';
          }
        }

        if (b.attackCooldown <= 0 && dist < ((b.type === 'miner' ? MINER : SWORDWRATH).attackRange)) {
          const dmg = (b.type === 'miner' ? MINER : SWORDWRATH).attackDamage;
          a.health -= dmg;
          (a as any)._damageFlash = 0.35;
          b.attackCooldown = (b.type === 'miner' ? MINER : SWORDWRATH).attackCooldown;

          if (a.health <= 0) {
            a.state = 'dead';
          }
        }
      }
    }

    // Remove dead units (simple for now)
    this.state.units = this.state.units.filter(u => u.state !== 'dead');

    // === Statue damage (Phase 2.5) ===
    const playerStatueX = PLAYER_STATUE_X;
    const enemyStatueX = ENEMY_STATUE_X;

    for (const unit of this.state.units) {
      if (unit.team === 1 && Math.abs(unit.x - playerStatueX) < 4) {
        // Enemy attacking player statue
        this.state.playerStatueHP -= (unit.type === 'swordwrath' ? 1.8 : 0.8) * dt * 4;
      }
      if (unit.team === 0 && Math.abs(unit.x - enemyStatueX) < 4) {
        this.state.enemyStatueHP -= (unit.type === 'swordwrath' ? 1.8 : 0.8) * dt * 4;
      }
    }

    // Clamp HP
    this.state.playerStatueHP = Math.max(0, this.state.playerStatueHP);
    this.state.enemyStatueHP = Math.max(0, this.state.enemyStatueHP);
  }

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

