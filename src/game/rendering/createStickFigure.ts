/**
 * Procedural stick-figure factory for Stick War Three.js
 *
 * Greatly improved version with:
 * - Much better visual fidelity while staying 100% procedural / asset-free
 * - Structured hierarchy with named parts for reliable animation
 * - Distinct, iconic looks for Miner vs Swordwrath
 *
 * Animation is handled externally via `animateStickFigure`.
 */

import * as THREE from 'three';
import type { UnitType } from '../types';

const stickMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
const headMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
const weaponMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
const darkWood = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });

export interface StickFigureParts {
  head: THREE.Mesh;
  helmet: THREE.Mesh;
  torso: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  weapon?: THREE.Group | THREE.Mesh;
}

export function createStickFigure(
  teamColor: number = 0x4a90d9,
  type: UnitType = 'miner'
): THREE.Group {
  const group = new THREE.Group();
  group.userData.parts = {} as StickFigureParts;

  // === HEAD (small classic proportion) ===
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 10), headMat);
  head.position.y = 4.9;
  group.add(head);
  (group.userData.parts as StickFigureParts).head = head;

  // Team helmet (flatter, more iconic)
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 12, 8),
    new THREE.MeshLambertMaterial({ color: teamColor })
  );
  helmet.position.y = 5.05;
  helmet.scale.set(1.05, 0.38, 1.05);
  group.add(helmet);
  (group.userData.parts as StickFigureParts).helmet = helmet;

  // === TORSO (slightly thicker than before for better silhouette) ===
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.105, 2.35, 5), // slightly shorter for better proportions
    stickMat
  );
  torso.position.y = 3.1;
  group.add(torso);
  (group.userData.parts as StickFigureParts).torso = torso;

  // Subtle team color chest band / "armor" hint for Swordwrath
  if (type === 'swordwrath') {
    const chestPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.135, 0.12, 0.7, 5),
      new THREE.MeshLambertMaterial({ color: teamColor })
    );
    chestPlate.position.y = 3.4;
    group.add(chestPlate);
  }

  // === LEGS — pivoting from the hip (top of leg), not the center ===
  const hipY = 1.925;                   // exactly at bottom of torso
  const legLength = 2.28;

  // Create leg geometry with origin at the TOP (hip) instead of center
  const legGeo = new THREE.CylinderGeometry(0.055, 0.055, legLength, 5);
  legGeo.translate(0, -legLength / 2, 0);   // move geometry so top of leg is at local y=0

  const leftLeg = new THREE.Mesh(legGeo, stickMat);
  leftLeg.position.set(-0.18, hipY, 0);     // closer to torso so fulcrum looks attached
  leftLeg.rotation.z = 0.16;
  group.add(leftLeg);
  (group.userData.parts as StickFigureParts).leftLeg = leftLeg;

  const rightLeg = new THREE.Mesh(legGeo, stickMat);
  rightLeg.position.set(0.18, hipY, 0);
  rightLeg.rotation.z = -0.16;
  group.add(rightLeg);
  (group.userData.parts as StickFigureParts).rightLeg = rightLeg;

  // === ARMS — pivoting from the shoulder (top of arm) ===
  const shoulderY = 4.05;               // high on the torso, near the top
  const armLength = 1.78;

  const armGeo = new THREE.CylinderGeometry(0.048, 0.048, armLength, 5);
  armGeo.translate(0, -armLength / 2, 0);   // origin at top (shoulder)

  const leftArm = new THREE.Mesh(armGeo, stickMat);
  leftArm.position.set(-0.22, shoulderY, 0);   // much closer to body
  leftArm.rotation.z = 0.78;
  group.add(leftArm);
  (group.userData.parts as StickFigureParts).leftArm = leftArm;

  const rightArm = new THREE.Mesh(armGeo, stickMat);
  rightArm.position.set(0.22, shoulderY, 0);
  group.add(rightArm);
  (group.userData.parts as StickFigureParts).rightArm = rightArm;

  // === WEAPONS (much more recognizable) ===
  // Weapons are now properly handheld: grip is attached at the end of the arm (wrist/hand)
  // so they swing from the hand, not from the shoulder/torso.
  const handOffsetY = -armLength * 0.88; // near the bottom of the arm
  let weapon: THREE.Group | undefined;

  if (type === 'miner') {
    // === Miner Pickaxe - handheld ===
    rightArm.rotation.z = -0.68;

    const pick = new THREE.Group();
    pick.name = 'pickaxe';

    // Grip point is at the weapon group's local origin (0,0,0)
    // The handle extends "forward" from the hand.

    // Handle (gripped near the bottom)
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 2.55, 4),
      darkWood
    );
    handle.position.set(0.02, 0.95, 0);   // most of handle above the grip
    handle.rotation.z = 0.25;
    pick.add(handle);

    // Pick head (working end)
    const pickHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.88, 4),
      weaponMat
    );
    pickHead.position.set(0.52, 1.72, 0);
    pickHead.rotation.z = -1.38;
    pick.add(pickHead);

    // Small back spike for classic look
    const backSpike = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.6, 4),
      weaponMat
    );
    backSpike.position.set(-0.28, 0.35, 0);
    backSpike.rotation.z = 0.9;
    pick.add(backSpike);

    // Attach the whole pick so its grip sits at the hand
    pick.position.set(0.06, handOffsetY, 0);
    pick.rotation.z = -0.35; // natural hold angle

    rightArm.add(pick);
    weapon = pick;
  } else {
    // === Swordwrath Sword - handheld ===
    rightArm.rotation.z = -0.55;

    const sword = new THREE.Group();
    sword.name = 'sword';

    // Grip at local (0,0,0) of the sword group

    // Blade extends forward from the hand
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.062, 1.95, 0.24),
      weaponMat
    );
    blade.position.set(0.08, 0.82, 0);
    blade.rotation.z = -0.12;
    sword.add(blade);

    // Hilt (where the hand grips)
    const hilt = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.18, 0.36),
      new THREE.MeshLambertMaterial({ color: 0x2a2a2a })
    );
    hilt.position.set(0, -0.08, 0);
    sword.add(hilt);

    // Crossguard
    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.06, 0.44),
      new THREE.MeshLambertMaterial({ color: teamColor })
    );
    guard.position.set(0.02, 0.12, 0);
    sword.add(guard);

    // Attach so the hilt/grip is at the hand
    sword.position.set(0.04, handOffsetY, 0);
    sword.rotation.z = -0.28;

    rightArm.add(sword);
    weapon = sword;
  }

  if (weapon) {
    (group.userData.parts as StickFigureParts).weapon = weapon;
  }

  // Team color accents
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.125, 0.125, 0.38, 5),
    new THREE.MeshLambertMaterial({ color: teamColor })
  );
  band.position.y = 3.55;
  group.add(band);

  return group;
}
