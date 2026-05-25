/**
 * Proper animation system for the procedural stick figures.
 * State-driven + time-based animations for walk, mine, attack, idle, etc.
 */

import * as THREE from 'three';
import type { Unit } from '../types';
import type { StickFigureParts } from './createStickFigure';

export function animateStickFigure(
  mesh: THREE.Group,
  unit: Unit,
  time: number
) {
  const parts = mesh.userData.parts as StickFigureParts;
  if (!parts) return;

  const isDead = unit.state === 'dead';
  if (isDead) {
    // Simple death collapse
    mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, -1.3, 0.08);
    mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, 0.1, 0.1);
    return;
  }

  // Reset death rotation if somehow revived (shouldn't happen)
  if (mesh.rotation.z !== 0) mesh.rotation.z = 0;

  const isMining = unit.state === 'mining';
  const isMoving = unit.state === 'moving' || unit.state === 'returning';
  const isAttacking = unit.state === 'attacking'; // future use

  // === Vertical bob + breathing ===
  let bob = 0;
  if (isMining) {
    bob = Math.sin(time * 7.5) * 0.045;
  } else if (isMoving) {
    bob = Math.sin(time * 11) * 0.06;
  } else {
    bob = Math.sin(time * 2.2) * 0.015; // idle breathing
  }
  mesh.position.y = bob;

  // === Leg animation (walk cycle) — now correctly pivoting from the hip ===
  const legSwing = isMoving ? Math.sin(time * 9.0) * 0.72 : 0;

  if (parts.leftLeg) {
    // Positive = leg swings forward/out
    parts.leftLeg.rotation.z = 0.18 + legSwing;
  }
  if (parts.rightLeg) {
    // Negative = opposite leg
    parts.rightLeg.rotation.z = -0.18 - legSwing;
  }

  // === Arm + Weapon animation (now pivoting from the shoulder) ===
  if (parts.leftArm) {
    const leftArmBase = 0.82;
    parts.leftArm.rotation.z = leftArmBase + (isMoving ? Math.sin(time * 8.8) * -0.52 : Math.sin(time * 2.3) * 0.07);
  }

  if (parts.rightArm && parts.weapon) {
    if (unit.type === 'miner') {
      // Mining pick swing — arm does the main motion, weapon gets extra chop relative to arm
      const armSwing = isMining
        ? Math.sin(time * 5.6) * 1.15 - 0.55
        : isMoving
          ? Math.sin(time * 8.2) * -0.48
          : -0.72;

      const weaponExtra = isMining
        ? Math.sin(time * 5.6) * 0.55          // extra swing on the pick head
        : 0;

      parts.rightArm.rotation.z = armSwing;
      (parts.weapon as THREE.Group).rotation.z = weaponExtra;
    } else {
      // Swordwrath
      const armBase = isMoving || isAttacking ? -0.42 : -0.58;
      const armSwing = isMoving
        ? Math.sin(time * 8.2) * -0.55
        : isAttacking
          ? Math.sin(time * 11) * 1.1
          : 0;

      const weaponFollow = isMoving || isAttacking
        ? armSwing * 0.35
        : 0;

      parts.rightArm.rotation.z = armBase + armSwing;
      (parts.weapon as THREE.Group).rotation.z = weaponFollow;
    }
  }

  // === Subtle torso lean when moving ===
  if (parts.torso) {
    const lean = isMoving ? Math.sin(time * 8.5) * 0.06 : 0;
    parts.torso.rotation.z = lean;
  }

  // === Facing / slight body rotation for returning miners ===
  const targetY = unit.state === 'returning' ? 0.18 : -0.06;
  mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, targetY, 0.12);
}