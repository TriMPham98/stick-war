/**
 * ProductionSystem — handles the unit training queue.
 *
 * Responsibilities:
 * - Queue management (add orders, only if gold is available — caller checks)
 * - Progress ticking on the front of the queue
 * - Signaling when an order completes (so Game can spawn the unit)
 *
 * This keeps Game.ts smaller and makes the production logic easy to test/extend later
 * (e.g. multiple queues, cancel orders, different buildings).
 */

import type { GameState, UnitType } from './types';
import { MINER, SWORDWRATH } from './constants';

export interface ProductionOrder {
  type: UnitType;
  progress: number;
  totalTime: number;
}

export class ProductionSystem {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  /** Attempt to queue a unit. Returns true if successful (gold was spent by caller). */
  queue(type: UnitType): boolean {
    const def = type === 'miner' ? MINER : SWORDWRATH;

    this.state.productionQueue.push({
      type,
      progress: 0,
      totalTime: def.buildTime,
    });

    return true;
  }

  /**
   * Advance production. Returns the UnitType that just finished (if any).
   * The caller (Game) is responsible for actually spawning the unit.
   */
  update(dt: number): UnitType | null {
    const q = this.state.productionQueue;
    if (q.length === 0) return null;

    const current = q[0];
    current.progress += dt;

    if (current.progress >= current.totalTime) {
      const finishedType = current.type;
      q.shift();
      return finishedType;
    }

    return null;
  }

  /** Current queue snapshot (for UI / debug) */
  getQueue(): ProductionOrder[] {
    return this.state.productionQueue;
  }
}
