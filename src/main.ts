/**
 * Stick War — Three.js Recreation
 * Phase 0: Scaffolding + Hello Scene
 *
 * Faithful side-view 2D gameplay feel using Three.js (orthographic-style camera).
 * Everything is procedural. No external assets in MVP.
 */

import * as THREE from 'three';
import './style.css';

// Phase 1.1: Import shared constants (no behavior change yet)
import {
  LANE_LENGTH,
  PLAYER_STATUE_X,
  ENEMY_STATUE_X,
  FIXED_STEP,
} from './game/constants';
import { createStickFigure } from './game/rendering/createStickFigure';
import { animateStickFigure } from './game/rendering/animateStickFigure';
import { Game } from './game/Game';

// The real simulation (Phase 1.4 — miners now work!)
const game = new Game();

// Visual mesh association for real units (id → Group)
const unitMeshes = new Map<number, THREE.Group>();

// Selection visuals
const selectionRings = new Map<number, THREE.Mesh>();

// Health bars (Phase 3) - DOM elements
const healthBars = new Map<number, HTMLDivElement>();

// Temporary order markers (visual feedback for commands)
let orderMarkers: THREE.Mesh[] = [];

// Selection state (Phase 2.6)
const selectedUnits = new Set<number>();



// Input / Picking helpers
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0 plane for picking

function screenToWorld(clientX: number, clientY: number): THREE.Vector3 | null {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const intersectPoint = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(groundPlane, intersectPoint)) {
    return intersectPoint;
  }
  return null;
}

/** Convert world position to screen pixel coordinates (for DOM overlays) */
function worldToScreen(worldPos: THREE.Vector3): { x: number; y: number } | null {
  const vector = worldPos.clone();
  vector.project(camera);

  const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

  // Simple off-screen culling
  if (x < -50 || x > window.innerWidth + 50 || y < -20 || y > window.innerHeight + 20) {
    return null;
  }
  return { x, y };
}

function selectUnitAt(clientX: number, clientY: number, addToSelection = false) {
  const world = screenToWorld(clientX, clientY);
  if (!world) return;

  let closestId: number | null = null;
  let closestDist = Infinity;

  for (const [id, mesh] of unitMeshes) {
    const dist = Math.abs(mesh.position.x - world.x);
    if (dist < 3.5 && dist < closestDist) {  // generous click radius
      closestDist = dist;
      closestId = id;
    }
  }

  if (!addToSelection) selectedUnits.clear();

  if (closestId !== null) {
    if (selectedUnits.has(closestId)) {
      selectedUnits.delete(closestId);
    } else {
      selectedUnits.add(closestId);
    }
  }
}

function giveOrder(clientX: number, clientY: number) {
  const world = screenToWorld(clientX, clientY);
  if (!world || selectedUnits.size === 0) return;

  for (const id of selectedUnits) {
    const unit = game.units.find(u => u.id === id);
    if (unit && unit.state !== 'dead') {
      // Check for nearby enemy to attack
      const enemyNearby = game.units.find(u => 
        u.team !== unit.team && 
        Math.abs(u.x - world.x) < 4.5 && 
        u.state !== 'dead'
      );

      if (enemyNearby) {
        unit.targetEnemyId = enemyNearby.id;
        unit.targetX = undefined;
      } else {
        unit.targetX = world.x;
        unit.targetEnemyId = undefined;
      }
    }
  }

  // Visual order marker (command feedback)
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1.1, 20),
    new THREE.MeshBasicMaterial({ color: 0x5ab0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(world.x, 0.05, 0);
  scene.add(marker);
  orderMarkers.push(marker);

  // Auto-remove marker after 1.2 seconds
  setTimeout(() => {
    if (marker.parent) marker.parent.remove(marker);
    orderMarkers = orderMarkers.filter(m => m !== marker);
  }, 1200);
}

/** Stop command - clear all orders for selected units */
function stopSelectedUnits() {
  for (const id of selectedUnits) {
    const unit = game.units.find(u => u.id === id);
    if (unit) {
      unit.targetX = undefined;
      unit.targetEnemyId = undefined;
    }
  }
}

// ============================================
// Main Game Bootstrap
// ============================================
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const goldEl = document.getElementById('gold-value')!;
const incomeEl = document.getElementById('income-value')!;
const playerUnitsEl = document.getElementById('player-units')!;
const enemyUnitsEl = document.getElementById('enemy-units')!;
const queueList = document.getElementById('queue-list')!;
const prodPanel = document.getElementById('production-buttons')!;

// Simple HP displays (added dynamically for Phase 2)
const playerHP = document.createElement('div');
playerHP.style.cssText = 'margin-left:16px; color:#5ab0ff; font-family:var(--mono);';
const enemyHP = document.createElement('div');
enemyHP.style.cssText = 'margin-left:16px; color:#ff5a5a; font-family:var(--mono);';
document.getElementById('top-bar')!.appendChild(playerHP);
document.getElementById('top-bar')!.appendChild(enemyHP);

// Selected units indicator (Phase 3/4 commands)
const selectedDisplay = document.createElement('div');
selectedDisplay.style.cssText = 'margin-left: auto; margin-right: 12px; color: #5ab0ff; font-family: var(--mono); font-size: 13px;';
document.getElementById('top-bar')!.appendChild(selectedDisplay);

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

// Ground plane (the battlefield) - classic earthy brown
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(LANE_LENGTH + 20, 18),
  new THREE.MeshLambertMaterial({ color: 0x3a2f1f })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

// Subtle grid lines for "lane" feel (more visible classic style)
const grid = new THREE.GridHelper(LANE_LENGTH + 18, 22, 0x5c4630, 0x5c4630);
grid.position.y = 0.03;
grid.rotation.x = -Math.PI / 2;
scene.add(grid);

// Player Statue (left) - stronger Order blue
const playerStatue = new THREE.Mesh(
  new THREE.BoxGeometry(5.5, 15, 7),
  new THREE.MeshLambertMaterial({ color: 0x2f4a6e })
);
playerStatue.position.set(PLAYER_STATUE_X, 7.5, 0);
scene.add(playerStatue);

// Enemy Statue (right) - redder
const enemyStatue = new THREE.Mesh(
  new THREE.BoxGeometry(5.5, 15, 7),
  new THREE.MeshLambertMaterial({ color: 0x6e2f2f })
);
enemyStatue.position.set(ENEMY_STATUE_X, 7.5, 0);
scene.add(enemyStatue);

// Static health bars for statues (Phase 3)
const playerStatueHB = document.createElement('div');
playerStatueHB.className = 'health-bar';
playerStatueHB.style.width = '60px';
playerStatueHB.style.borderColor = '#4a90d9';
const playerFill = document.createElement('div');
playerFill.className = 'fill';
playerFill.style.background = '#4ade80';
playerStatueHB.appendChild(playerFill);
document.getElementById('ui')!.appendChild(playerStatueHB);

const enemyStatueHB = document.createElement('div');
enemyStatueHB.className = 'health-bar';
enemyStatueHB.style.width = '60px';
enemyStatueHB.style.borderColor = '#c94c4c';
const enemyFill = document.createElement('div');
enemyFill.className = 'fill';
enemyFill.style.background = '#f87171';
enemyStatueHB.appendChild(enemyFill);
document.getElementById('ui')!.appendChild(enemyStatueHB);

// (Legacy demoMiner removed - real units look much better now)

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
  const displayGold = Math.floor(game.gold);
  goldEl.textContent = displayGold.toString();

  // Real economy: rough activity estimate from active player miners (~2g/s per based on 18g deposits; actual varies with travel/state/congestion)
  const activeMiners = game.units.filter((u) => u.type === 'miner' && u.team === 0).length;
  incomeEl.textContent = activeMiners > 0 ? `+${Math.floor(activeMiners * 2)}/s` : '+0/s';
}

function updateUnitCountsUI() {
  const playerMiners = game.units.filter(u => u.type === 'miner' && u.team === 0).length;
  const playerSwords = game.units.filter(u => u.type === 'swordwrath' && u.team === 0).length;
  const enemyTotal = game.units.filter(u => u.team === 1).length;

  playerUnitsEl.textContent = `M:${playerMiners} S:${playerSwords}`;
  enemyUnitsEl.textContent = enemyTotal.toString();
}

function flashProductionButton(index: number) {
  const btn = prodButtons[index];
  if (!btn) return;
  btn.style.borderColor = 'var(--danger)';
  setTimeout(() => (btn.style.borderColor = ''), 220);
}

function addDemoButton(label: string, cost: number, onClick: () => void, hotkey?: string) {
  const btn = document.createElement('button');
  btn.className = 'prod-btn';
  const hotkeyHtml = hotkey ? `<span class="hotkey">${hotkey}</span>` : '';
  btn.innerHTML = `${label} ${hotkeyHtml}<span class="cost">${cost}g</span>`;
  btn.onclick = () => {
    // Phase 1.5: Spend from the real game gold so the economy feels connected
    if (game.gold >= cost) {
      onClick();
      updateGoldUI();
      updateUnitCountsUI();
    } else {
      btn.style.borderColor = 'var(--danger)';
      setTimeout(() => (btn.style.borderColor = ''), 220);
    }
  };
  prodPanel.appendChild(btn);
  return btn;
}

// Real production buttons (Phase 2)
const minerBtn = addDemoButton('MINER', 75, () => {
  game.queueUnit('miner');
}, 'Q');

const swordBtn = addDemoButton('SWORDWRATH', 125, () => {
  game.queueUnit('swordwrath');
}, 'W');

const prodButtons = [minerBtn, swordBtn];

// Update queue display — rich multi-item view
function updateQueueUI() {
  const q = game.state.productionQueue;
  queueList.innerHTML = '';

  if (q.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:#5a5f6e; font-size:11px;';
    empty.textContent = 'Queue: idle';
    queueList.appendChild(empty);
    return;
  }

  // Show up to 4 items with progress bars
  const maxVisible = 4;
  for (let i = 0; i < Math.min(q.length, maxVisible); i++) {
    const item = q[i];
    const pct = Math.floor((item.progress / item.totalTime) * 100);

    const row = document.createElement('div');
    row.className = 'queue-item';

    row.innerHTML = `
      <span class="name">${item.type}</span>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
      <span class="pct">${pct}%</span>
    `;

    queueList.appendChild(row);
  }

  if (q.length > maxVisible) {
    const more = document.createElement('div');
    more.style.cssText = 'font-size:10px; color:#5a5f6e; margin-top:1px;';
    more.textContent = `+${q.length - maxVisible} more`;
    queueList.appendChild(more);
  }
}

// ============================================
// Input (Phase 2.6 - basic selection + orders + camera)
// ============================================
let isDragging = false;
let prevMouseX = 0;
let dragThreshold = 5;
let mouseDownPos = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
  mouseDownPos = { x: e.clientX, y: e.clientY };

  if (e.button === 0) { // Left - camera drag or select
    isDragging = false; // will decide on move/up
    prevMouseX = e.clientX;
  }
});

window.addEventListener('mouseup', (e) => {
  const moved = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);

  if (e.button === 0) {
    if (!isDragging && moved < dragThreshold) {
      // Click - select unit
      const add = e.shiftKey || e.metaKey;
      selectUnitAt(e.clientX, e.clientY, add);
    }
    isDragging = false;
  }

  if (e.button === 2) { // Right click - give order
    giveOrder(e.clientX, e.clientY);
  }
});

// Prevent context menu on right click
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousemove', (e) => {
  const moved = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
  if (moved > dragThreshold && !isDragging && e.buttons & 1) {
    isDragging = true;
  }

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

// Keyboard
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    console.log('[Stick War] Game state snapshot:', {
      gold: game.gold,
      units: game.units.length,
      playerHP: game.playerStatueHP,
      enemyHP: game.enemyStatueHP,
      queue: game.state.productionQueue.length,
    });
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
  if (e.key.toLowerCase() === 'escape') {
    selectedUnits.clear();
  }
  if (e.key.toLowerCase() === 's' && selectedUnits.size > 0) {
    e.preventDefault();
    stopSelectedUnits();
  }

  // Production hotkeys (Q = Miner, W = Swordwrath)
  const key = e.key.toLowerCase();
  if (key === 'q') {
    e.preventDefault();
    const cost = 75;
    if (game.gold >= cost) {
      game.queueUnit('miner');
      updateGoldUI();
      updateUnitCountsUI();
    } else {
      flashProductionButton(0);
    }
  }
  if (key === 'w') {
    e.preventDefault();
    const cost = 125;
    if (game.gold >= cost) {
      game.queueUnit('swordwrath');
      updateGoldUI();
      updateUnitCountsUI();
    } else {
      flashProductionButton(1);
    }
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
// Animation Loop + Fixed Timestep (Phase 1.3)
// ============================================
let frame = 0;
let accumulator = 0;
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const t = performance.now() * 0.001;
  const now = performance.now();

  // Fixed timestep accumulator — real game logic now runs here
  const delta = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  accumulator += delta;

  while (accumulator >= FIXED_STEP) {
    game.update(FIXED_STEP);
    accumulator -= FIXED_STEP;
  }

  // === Render Sync: drive visuals from real game.units (Phase 1.4) ===
  const aliveIds = new Set<number>();

  for (const unit of game.units) {
    if (unit.state === 'dead') continue;
    aliveIds.add(unit.id);

    let mesh = unitMeshes.get(unit.id);
    if (!mesh) {
      // Classic Stick War colors: blue for Order (player), red for enemy
      const teamColor = unit.team === 0 ? 0x4a90d9 : 0xc94c4c;
      mesh = createStickFigure(teamColor, unit.type);
      mesh.position.y = 0;
      mesh.position.z = (unit.id % 3 - 1) * 0.55; // slight spread
      scene.add(mesh);
      unitMeshes.set(unit.id, mesh);
    }

    // Update position from simulation (1D lane → 3D)
    mesh.position.x = unit.x;

    // Damage flash (quick white flash on hit) — read from render-only transient on the unit
    const flash = unit.damageFlash ?? 0;
    if (flash > 0) {
      unit.damageFlash = Math.max(0, flash - delta);
      mesh.traverse((child: THREE.Object3D) => {
        const mat = (child as THREE.Mesh).material as THREE.Material & { emissive?: THREE.Color };
        if (mat && mat.emissive) {
          mat.emissive.setHex(0x888888);
        }
      });
    } else {
      mesh.traverse((child: THREE.Object3D) => {
        const mat = (child as THREE.Mesh).material as THREE.Material & { emissive?: THREE.Color };
        if (mat && mat.emissive) {
          mat.emissive.setHex(0x000000);
        }
      });
    }

    // Proper structured animation (walk, mine, attack, idle, death)
    animateStickFigure(mesh, unit, t);

    // === Health bar (Phase 3) ===
    let hb = healthBars.get(unit.id);
    if (!hb) {
      hb = document.createElement('div');
      hb.className = 'health-bar';

      const fill = document.createElement('div');
      fill.className = 'fill';
      hb.appendChild(fill);

      document.getElementById('ui')!.appendChild(hb);
      healthBars.set(unit.id, hb);
    }

    // Update fill width and color
    const pct = Math.max(0, unit.health / unit.maxHealth);
    const fillEl = hb.firstElementChild as HTMLDivElement;
    fillEl.style.width = `${pct * 100}%`;

    // Health bar color transitions (green >66%, yellow 33-66%, red <33%)
    let barColor: string;
    if (pct > 0.66) {
      barColor = unit.team === 0 ? '#4ade80' : '#f87171';
    } else if (pct > 0.33) {
      barColor = '#facc15';
    } else {
      barColor = '#ef4444';
    }
    fillEl.style.background = barColor;

    // Only show health bar if damaged (classic behavior) or selected
    const showBar = pct < 0.99 || selectedUnits.has(unit.id);

    // Position above the unit's head
    const headWorld = new THREE.Vector3(
      mesh.position.x,
      mesh.position.y + 3.8, // a bit above head
      mesh.position.z
    );

    const screenPos = worldToScreen(headWorld);
    if (screenPos && showBar) {
      hb.style.left = `${screenPos.x - 21}px`; // center the 42px bar
      hb.style.top = `${screenPos.y - 18}px`;
      hb.style.display = 'block';
    } else {
      hb.style.display = 'none';
    }
  }

  // Clean up any meshes whose units are gone
  for (const [id, mesh] of unitMeshes) {
    if (!aliveIds.has(id)) {
      scene.remove(mesh);
      unitMeshes.delete(id);

      // Also clean selection ring
      const ring = selectionRings.get(id);
      if (ring) {
        scene.remove(ring);
        selectionRings.delete(id);
      }
      selectedUnits.delete(id);

      // Remove health bar DOM element
      const hb = healthBars.get(id);
      if (hb) {
        hb.remove();
        healthBars.delete(id);
      }
    }
  }

  // === Selection highlights (Phase 2.6) ===
  for (const id of selectedUnits) {
    const mesh = unitMeshes.get(id);
    if (!mesh) continue;

    let ring = selectionRings.get(id);
    if (!ring) {
      // Thin glowing ring under the unit
      ring = new THREE.Mesh(
        new THREE.RingGeometry(1.1, 1.35, 24),
        new THREE.MeshBasicMaterial({ 
          color: 0x5ab0ff, 
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85
        })
      );
      ring.rotation.x = -Math.PI / 2;
      scene.add(ring);
      selectionRings.set(id, ring);
    }

    // Position the ring under the unit + gentle pulse
    ring.position.x = mesh.position.x;
    ring.position.y = 0.04;
    ring.position.z = mesh.position.z;

    const pulse = 1 + Math.sin(t * 8) * 0.08;
    ring.scale.set(pulse, pulse, 1);
  }

  // Hide rings for units no longer selected
  for (const [id, ring] of selectionRings) {
    if (!selectedUnits.has(id)) {
      ring.visible = false;
    } else {
      ring.visible = true;
    }
  }

  // Gold sparkle (unchanged)
  if (frame % 18 === 0) {
    goldPile.children.forEach((n, i) => {
      (n as THREE.Mesh).scale.setScalar(1 + Math.sin(t * 3 + i) * 0.08);
    });
  }

  // Clean up any stray order markers (safety)
  orderMarkers = orderMarkers.filter(marker => marker.parent);

  // Update UI from the *real* economy + production queue
  updateGoldUI();
  updateQueueUI();
  updateUnitCountsUI();

  // Selected units command feedback
  if (selectedUnits.size > 0) {
    selectedDisplay.textContent = `${selectedUnits.size} selected • S = Stop • Right-click to order`;
    selectedDisplay.style.color = '#5ab0ff';
  } else {
    selectedDisplay.textContent = '';
  }

  // Statue HP (text + floating bars)
  playerHP.textContent = `Your Statue: ${game.playerStatueHP}`;
  enemyHP.textContent = `Enemy Statue: ${game.enemyStatueHP}`;

  // Position statue health bars above the 3D statues
  const playerStatueScreen = worldToScreen(new THREE.Vector3(PLAYER_STATUE_X, 16, 0));
  if (playerStatueScreen) {
    playerStatueHB.style.left = `${playerStatueScreen.x - 30}px`;
    playerStatueHB.style.top = `${playerStatueScreen.y - 22}px`;
    playerStatueHB.style.display = 'block';
    const pFill = playerStatueHB.firstElementChild as HTMLDivElement;
    const pPct = Math.max(0, game.playerStatueHP / 650);
    pFill.style.width = `${pPct * 100}%`;
    let pBarColor: string;
    if (pPct > 0.66) pBarColor = '#4ade80';
    else if (pPct > 0.33) pBarColor = '#facc15';
    else pBarColor = '#ef4444';
    pFill.style.background = pBarColor;
  } else {
    playerStatueHB.style.display = 'none';
  }

  const enemyStatueScreen = worldToScreen(new THREE.Vector3(ENEMY_STATUE_X, 16, 0));
  if (enemyStatueScreen) {
    enemyStatueHB.style.left = `${enemyStatueScreen.x - 30}px`;
    enemyStatueHB.style.top = `${enemyStatueScreen.y - 22}px`;
    enemyStatueHB.style.display = 'block';
    const eFill = enemyStatueHB.firstElementChild as HTMLDivElement;
    const ePct = Math.max(0, game.enemyStatueHP / 650);
    eFill.style.width = `${ePct * 100}%`;
    let eBarColor: string;
    if (ePct > 0.66) eBarColor = '#f87171';
    else if (ePct > 0.33) eBarColor = '#facc15';
    else eBarColor = '#ef4444';
    eFill.style.background = eBarColor;
  } else {
    enemyStatueHB.style.display = 'none';
  }

  // Win / Lose check (Phase 2.5) + Phase 4 stats
  if (game.isGameOver) {
    const overlay = document.getElementById('game-over') as HTMLDivElement;
    if (overlay.style.display === 'flex') return; // already shown

    const title = document.getElementById('game-over-title')!;
    const statsContainer = document.getElementById('game-over-stats')!;

    if (game.playerStatueHP <= 0) {
      title.textContent = 'DEFEAT — The enemy destroyed your statue';
      title.style.color = '#ff5a5a';
    } else {
      title.textContent = 'VICTORY — You destroyed the enemy statue!';
      title.style.color = '#4ade80';
    }

    // Populate stats
    statsContainer.innerHTML = `
      <div style="margin: 12px 0; font-size: 14px; color: #c5c8d1; line-height: 1.6;">
        <div>Time: <strong>${game.getGameDuration()}s</strong></div>
        <div>Gold Earned: <strong>${game.getTotalGoldEarned()}</strong></div>
        <div>Units Trained: <strong>${game.getUnitsProduced()}</strong></div>
      </div>
    `;

    overlay.style.display = 'flex';
  }

  renderer.render(scene, camera);
  frame++;
}

// Restart button
const restartBtn = document.getElementById('restart-btn')!;
restartBtn.onclick = () => {
  location.reload(); // simple and effective for MVP
};

updateGoldUI();
updateUnitCountsUI();
animate();

console.log('%c[Stick War] Phase 0 hello scene ready. Press SPACE for debug state. R to reset camera.', 'color:#5ab0ff');
