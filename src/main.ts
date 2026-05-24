/**
 * Stick War — Three.js Recreation
 * Phase 0: Scaffolding + Hello Scene
 *
 * Faithful side-view 2D gameplay feel using Three.js (orthographic-style camera).
 * Everything is procedural. No external assets in MVP.
 */

import * as THREE from 'three';
import './style.css';

// ============================================
// Types (will expand in Phase 1+)
// ============================================
interface DemoState {
  gold: number;
  lastGoldTick: number;
}

// ============================================
// Constants (moved to src/game/constants.ts in Phase 1)
// ============================================
const LANE_LENGTH = 70;
const PLAYER_STATUE_X = -32;
const ENEMY_STATUE_X = 32;

// ============================================
// Procedural Stick Figure (will live in rendering/createStickFigure.ts later)
// ============================================
function createStickFigure(color: number = 0xcccccc): THREE.Group {
  const group = new THREE.Group();

  const material = new THREE.MeshLambertMaterial({ color });
  const limbMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 12, 12),
    material
  );
  head.position.y = 5.5;
  group.add(head);

  // Torso
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 3.2, 8),
    material
  );
  torso.position.y = 3.2;
  group.add(torso);

  // Left leg
  const leftLeg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 2.8, 6),
    limbMaterial
  );
  leftLeg.position.set(-0.6, 1.0, 0);
  leftLeg.rotation.z = 0.2;
  group.add(leftLeg);

  // Right leg
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.6;
  rightLeg.rotation.z = -0.2;
  group.add(rightLeg);

  // Left arm
  const leftArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 2.4, 6),
    limbMaterial
  );
  leftArm.position.set(-1.1, 3.5, 0);
  leftArm.rotation.z = 1.1;
  group.add(leftArm);

  // Right arm + pickaxe (miner look for Phase 0)
  const rightArm = leftArm.clone();
  rightArm.position.x = 1.1;
  rightArm.rotation.z = -0.9;
  group.add(rightArm);

  // Pickaxe handle
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 3.5, 5),
    new THREE.MeshLambertMaterial({ color: 0x5c4033 })
  );
  handle.position.set(2.6, 2.8, 0);
  handle.rotation.z = -0.6;
  group.add(handle);

  // Pickaxe head
  const pickHead = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 1.4, 4),
    new THREE.MeshLambertMaterial({ color: 0x777777 })
  );
  pickHead.position.set(3.6, 2.0, 0);
  pickHead.rotation.z = -1.8;
  group.add(pickHead);

  // Small team stripe on torso
  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 0.4, 8),
    new THREE.MeshLambertMaterial({ color: 0x5ab0ff })
  );
  stripe.position.y = 4.0;
  group.add(stripe);

  return group;
}

// ============================================
// Main Game Bootstrap
// ============================================
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const goldEl = document.getElementById('gold-value')!;
const incomeEl = document.getElementById('income-value')!;
const queueEl = document.getElementById('queue-text')!;
const prodPanel = document.getElementById('production-buttons')!;

const state: DemoState = {
  gold: 150,
  lastGoldTick: performance.now(),
};

// Three.js setup
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false; // keep cheap for MVP

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a0b0e, 60, 140);

// Camera — "faithful 2D side view" feel (we'll tune orthographic later)
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  -40 * aspect,
  40 * aspect,
  28,
  -28,
  0.1,
  200
);
camera.position.set(0, 38, 52);
camera.lookAt(0, 6, 0);

// Lights (simple & cheap)
scene.add(new THREE.AmbientLight(0x404050, 0.6));
const hemi = new THREE.HemisphereLight(0xaaaacc, 0x222233, 0.7);
scene.add(hemi);

const dirLight = new THREE.DirectionalLight(0xfff4d9, 0.9);
dirLight.position.set(30, 60, 20);
scene.add(dirLight);

// Ground plane (the battlefield)
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(LANE_LENGTH + 20, 18),
  new THREE.MeshLambertMaterial({ color: 0x2a2f38 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

// Subtle grid lines for "lane" feel (procedural, no texture)
const grid = new THREE.GridHelper(LANE_LENGTH + 18, 18, 0x3a3f48, 0x3a3f48);
grid.position.y = 0.02;
grid.rotation.x = -Math.PI / 2; // lay flat like ground
scene.add(grid);

// Player Statue (left)
const playerStatue = new THREE.Mesh(
  new THREE.BoxGeometry(5, 14, 6),
  new THREE.MeshLambertMaterial({ color: 0x3a5f8a })
);
playerStatue.position.set(PLAYER_STATUE_X, 7, 0);
scene.add(playerStatue);

// Enemy Statue (right)
const enemyStatue = new THREE.Mesh(
  new THREE.BoxGeometry(5, 14, 6),
  new THREE.MeshLambertMaterial({ color: 0x8a3a3a })
);
enemyStatue.position.set(ENEMY_STATUE_X, 7, 0);
scene.add(enemyStatue);

// Demo Miner (procedural)
const demoMiner = createStickFigure(0xcccccc);
demoMiner.position.x = -18;
demoMiner.position.y = 0;
scene.add(demoMiner);

// Simple "gold node" visual
const goldPile = new THREE.Group();
for (let i = 0; i < 5; i++) {
  const nugget = new THREE.Mesh(
    new THREE.SphereGeometry(0.7 + Math.random() * 0.4, 6, 6),
    new THREE.MeshLambertMaterial({ color: 0xf4c95f })
  );
  nugget.position.set(
    -26 + (i - 2) * 1.4 + (Math.random() - 0.5) * 0.8,
    0.8 + Math.random() * 0.6,
    (Math.random() - 0.5) * 2.5
  );
  goldPile.add(nugget);
}
scene.add(goldPile);

// ============================================
// UI Wiring (Phase 0 demo buttons)
// ============================================
function updateGoldUI() {
  goldEl.textContent = Math.floor(state.gold).toString();
  // Fake slow income for visual
  const elapsed = (performance.now() - state.lastGoldTick) / 1000;
  incomeEl.textContent = `+${(12 * Math.max(0, Math.min(1, elapsed / 8))).toFixed(0)}/s`;
}

function addDemoButton(label: string, cost: number, onClick: () => void) {
  const btn = document.createElement('button');
  btn.className = 'prod-btn';
  btn.innerHTML = `${label} <span class="cost">${cost}g</span>`;
  btn.onclick = () => {
    if (state.gold >= cost) {
      state.gold -= cost;
      onClick();
      updateGoldUI();
    } else {
      btn.style.borderColor = 'var(--danger)';
      setTimeout(() => (btn.style.borderColor = ''), 220);
    }
  };
  prodPanel.appendChild(btn);
  return btn;
}

// Phase 0 demo production (will be real in Phase 2)
addDemoButton('MINER', 75, () => {
  // Spawn another demo miner for fun
  const extra = createStickFigure(0xcccccc);
  extra.position.x = -18 + (Math.random() - 0.5) * 6;
  extra.position.z = (Math.random() - 0.5) * 4;
  scene.add(extra);
  // Auto-remove after 6s (demo only)
  setTimeout(() => scene.remove(extra), 6000);
});

addDemoButton('SWORDWRATH (preview)', 125, () => {
  const fighter = createStickFigure(0xdddddd);
  // Swap to sword look (quick hack for demo)
  fighter.children.forEach((c, i) => {
    if (i > 4) fighter.remove(c); // rough cleanup
  });
  fighter.position.x = -16;
  fighter.position.z = (Math.random() - 0.5) * 3;
  scene.add(fighter);
  setTimeout(() => scene.remove(fighter), 8000);
});

queueEl.textContent = 'Queue: (Phase 0 — static demo)';

// ============================================
// Input (preview of future InputSystem)
// ============================================
let isDragging = false;
let prevMouseX = 0;

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    isDragging = true;
    prevMouseX = e.clientX;
  }
});

window.addEventListener('mouseup', () => (isDragging = false));

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - prevMouseX;
  prevMouseX = e.clientX;

  // Pan camera along the lane (X)
  const panSpeed = 0.08;
  camera.position.x -= dx * panSpeed;
  camera.position.x = Math.max(-18, Math.min(18, camera.position.x));
  camera.lookAt(camera.position.x * 0.3, 6, 0);
});

canvas.addEventListener('wheel', (e) => {
  // Simple zoom (scale ortho)
  const zoomSpeed = 0.0018;
  const factor = 1 + Math.sign(e.deltaY) * zoomSpeed * 60;
  camera.left *= factor;
  camera.right *= factor;
  camera.top *= factor;
  camera.bottom *= factor;
  camera.updateProjectionMatrix();
});

// Keyboard for demo
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    console.log('[Stick War Demo] Current state:', state);
    console.log('Camera:', camera.position);
    // Tiny gold burst for fun
    state.gold += 8;
    updateGoldUI();
  }
  if (e.key.toLowerCase() === 'r') {
    // Reset camera
    camera.position.set(0, 38, 52);
    camera.lookAt(0, 6, 0);
    camera.left = -40 * aspect;
    camera.right = 40 * aspect;
    camera.top = 28;
    camera.bottom = -28;
    camera.updateProjectionMatrix();
  }
});

// ============================================
// Resize Handler
// ============================================
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);

  const newAspect = w / h;
  const base = 40;
  camera.left = -base * newAspect;
  camera.right = base * newAspect;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

// ============================================
// Animation Loop (will become Game loop in Phase 1)
// ============================================
let frame = 0;

function animate() {
  requestAnimationFrame(animate);

  const t = performance.now() * 0.001;

  // Gentle walk / bob animation on the demo miner
  demoMiner.position.y = Math.sin(t * 3.2) * 0.15;
  demoMiner.rotation.y = Math.sin(t * 0.6) * 0.08;

  // Subtle arm/leg swing (preview of real animation system)
  if (demoMiner.children[2]) (demoMiner.children[2] as THREE.Mesh).rotation.z = 0.2 + Math.sin(t * 4.5) * 0.6;
  if (demoMiner.children[3]) (demoMiner.children[3] as THREE.Mesh).rotation.z = -0.2 + Math.sin(t * 4.5 + 0.8) * 0.6;

  // Fake slow gold income
  const now = performance.now();
  if (now - state.lastGoldTick > 420) {
    state.gold += 0.6;
    state.lastGoldTick = now;
    updateGoldUI();
  }

  // Occasional gold sparkle on the pile (cheap demo effect)
  if (frame % 18 === 0) {
    goldPile.children.forEach((n, i) => {
      (n as THREE.Mesh).scale.setScalar(1 + Math.sin(t * 3 + i) * 0.08);
    });
  }

  renderer.render(scene, camera);
  frame++;
}

updateGoldUI();
animate();

console.log('%c[Stick War] Phase 0 hello scene ready. Press SPACE for debug state. R to reset camera.', 'color:#5ab0ff');
