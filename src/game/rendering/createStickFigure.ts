/**
 * Procedural stick-figure factory for Stick War Three.js
 * Pure visual component — no game logic.
 * All geometry is generated from primitives so we stay 100% asset-free in MVP.
 */

import * as THREE from 'three';
import type { UnitType } from '../types';

const HEAD_MATERIAL_CACHE = new Map<number, THREE.Material>();

function getHeadMaterial(color: number) {
  if (!HEAD_MATERIAL_CACHE.has(color)) {
    HEAD_MATERIAL_CACHE.set(color, new THREE.MeshLambertMaterial({ color }));
  }
  return HEAD_MATERIAL_CACHE.get(color)!;
}

/**
 * Creates a Group representing a stick figure.
 * For 'miner' it gets a pickaxe; for 'swordwrath' a simple blade.
 * The returned Group can be positioned/animated by the render sync layer.
 */
export function createStickFigure(
  color: number = 0x222222,
  type: UnitType = 'miner'
): THREE.Group {
  const group = new THREE.Group();

  // Classic Stick War look: very thin dark "ink" sticks + small head
  const stickMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a }); // almost black for classic thin stick feel
  const headMat = getHeadMaterial(0xeeeeee); // light head like original
  const weaponMat = new THREE.MeshLambertMaterial({ color: 0x555555 });

  // Smaller head (classic proportion)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), headMat);
  head.position.y = 4.8;
  group.add(head);

  // Very thin torso (classic stick)
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6),
    stickMat
  );
  torso.position.y = 3.0;
  group.add(torso);

  // Thin legs
  const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 5);
  const leftLeg = new THREE.Mesh(legGeo, stickMat);
  leftLeg.position.set(-0.35, 1.1, 0);
  leftLeg.rotation.z = 0.25;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, stickMat);
  rightLeg.position.set(0.35, 1.1, 0);
  rightLeg.rotation.z = -0.25;
  group.add(rightLeg);

  // Thin arms
  const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.0, 5);
  const leftArm = new THREE.Mesh(armGeo, stickMat);
  leftArm.position.set(-0.7, 3.4, 0);
  leftArm.rotation.z = 1.0;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, stickMat);
  rightArm.position.set(0.7, 3.4, 0);

  // Weapon
  if (type === 'miner') {
    rightArm.rotation.z = -0.85;
    group.add(rightArm);

    // Pickaxe handle (thin)
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 3.2, 4),
      new THREE.MeshLambertMaterial({ color: 0x3d2b1f })
    );
    handle.position.set(2.1, 2.6, 0);
    handle.rotation.z = -0.55;
    group.add(handle);

    // Pick head
    const pickHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.1, 4),
      weaponMat
    );
    pickHead.position.set(2.85, 2.0, 0);
    pickHead.rotation.z = -1.65;
    group.add(pickHead);
  } else {
    // Swordwrath - classic sword
    rightArm.rotation.z = -0.55;
    group.add(rightArm);

    // Sword blade (thin rectangle)
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 2.2, 0.35),
      weaponMat
    );
    blade.position.set(1.85, 3.0, 0);
    blade.rotation.z = -0.35;
    group.add(blade);

    // Simple hilt
    const hilt = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.18, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x3a3a3a })
    );
    hilt.position.set(1.55, 2.55, 0);
    group.add(hilt);
  }

  // Small team color band on torso (Order blue / enemy red)
  const teamColor = color; // passed in as team accent
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.35, 6),
    new THREE.MeshLambertMaterial({ color: teamColor })
  );
  band.position.y = 3.6;
  group.add(band);

  // Tiny head "helmet" accent for team
  const helm = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, 8, 8),
    new THREE.MeshLambertMaterial({ color: teamColor })
  );
  helm.position.y = 4.95;
  helm.scale.set(1, 0.35, 1); // flat top like classic
  group.add(helm);

  return group;
}
