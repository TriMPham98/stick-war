/**
 * CombatSystem — handles all unit-vs-unit combat and statue damage.
 *
 * Extracted from the monolithic Game class for better separation.
 * Behavior is preserved exactly as of the extraction date.
 *
 * Current characteristics (to be improved later):
 * - Naive O(n²) pairwise checks every tick (fine for small unit counts)
 * - Mutual damage when in range
 * - Cooldowns respected
 * - Simple statue DPS when units reach the target
 */

import type { GameState } from './types';
import { MINER, SWORDWRATH, PLAYER_STATUE_X, ENEMY_STATUE_X } from './constants';

export class CombatSystem {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  update(dt: number) {
    const living = this.state.units.filter(u => u.state !== 'dead');

    for (let i = 0; i < living.length; i++) {
      const a = living[i];
      if (a.attackCooldown > 0) a.attackCooldown -= dt;

      for (let j = i + 1; j < living.length; j++) {
        const b = living[j];
        if (a.team === b.team) continue;

        const dist = Math.abs(a.x - b.x);
        const aRange = (a.type === 'miner' ? MINER : SWORDWRATH).attackRange;

        if (dist < aRange && a.attackCooldown <= 0) {
          const dmg = (a.type === 'miner' ? MINER : SWORDWRATH).attackDamage;
          b.health -= dmg;
          b.damageFlash = 0.35;
          a.attackCooldown = (a.type === 'miner' ? MINER : SWORDWRATH).attackCooldown;

          if (b.health <= 0) {
            b.state = 'dead';
          }
        }

        const bRange = (b.type === 'miner' ? MINER : SWORDWRATH).attackRange;
        if (b.attackCooldown <= 0 && dist < bRange) {
          const dmg = (b.type === 'miner' ? MINER : SWORDWRATH).attackDamage;
          a.health -= dmg;
          a.damageFlash = 0.35;
          b.attackCooldown = (b.type === 'miner' ? MINER : SWORDWRATH).attackCooldown;

          if (a.health <= 0) {
            a.state = 'dead';
          }
        }
      }
    }

    // Remove dead units
    for (let i = this.state.units.length - 1; i >= 0; i--) {
      if (this.state.units[i].state === 'dead') {
        this.state.units.splice(i, 1);
      }
    }

    // Statue damage
    const playerStatueX = PLAYER_STATUE_X;
    const enemyStatueX = ENEMY_STATUE_X;

    for (const unit of this.state.units) {
      if (unit.team === 1 && Math.abs(unit.x - playerStatueX) < 4) {
        // Slightly reduced to make the level more forgiving
        const dmgPerSec = unit.type === 'swordwrath' ? 1.5 : 0.7;
        this.state.playerStatueHP -= dmgPerSec * dt * 4;
      }
      if (unit.team === 0 && Math.abs(unit.x - enemyStatueX) < 4) {
        const dmgPerSec = unit.type === 'swordwrath' ? 1.8 : 0.8;
        this.state.enemyStatueHP -= dmgPerSec * dt * 4;
      }
    }

    // Clamp
    this.state.playerStatueHP = Math.max(0, this.state.playerStatueHP);
    this.state.enemyStatueHP = Math.max(0, this.state.enemyStatueHP);
  }
}
