/**
 * EnemySpawner — simple timer-based enemy wave generator.
 *
 * Current behavior (preserved exactly):
 * - Every ~7.5s, spawn 1 enemy unit
 * - 65% chance Swordwrath, 35% Miner
 * - Spawns near enemy statue, heads toward player statue area with some randomness
 *
 * Designed to be extracted and later upgraded (better waves, difficulty scaling, formations, etc.)
 * without touching the main Game loop.
 */

import type { UnitType } from './types';
import { ENEMY_STATUE_X, PLAYER_STATUE_X } from './constants';

export interface SpawnRequest {
  type: UnitType;
  spawnX: number;
  targetX: number;
}

export class EnemySpawner {
  private timer = 0;
  private interval = 7.5;

  constructor(intervalSeconds = 7.5) {
    this.interval = intervalSeconds;
  }

  /**
   * Advance the spawner. Returns a spawn request if it's time to create a new enemy unit.
   */
  update(dt: number): SpawnRequest | null {
    this.timer += dt;
    if (this.timer >= this.interval) {
      this.timer = 0;

      const type: UnitType = Math.random() > 0.35 ? 'swordwrath' : 'miner';
      const spawnX = ENEMY_STATUE_X - 3;
      const targetX = PLAYER_STATUE_X + 8 + (Math.random() - 0.5) * 5;

      return { type, spawnX, targetX };
    }
    return null;
  }

  /** Allow runtime tuning (useful for difficulty or testing) */
  setInterval(seconds: number) {
    this.interval = seconds;
  }

  getInterval(): number {
    return this.interval;
  }
}
