/**
 * All tunable constants for Stick War Three.js (MVP)
 * Change these, save, and see results instantly (with HMR).
 */

// === Battlefield Geometry (current Phase 0 visuals) ===
export const LANE_LENGTH = 70;
export const PLAYER_STATUE_X = -32;
export const ENEMY_STATUE_X = 32;
export const GOLD_NODE_X = -26;      // center of the visual gold pile cluster
export const LANE_MIN_X = -38;
export const LANE_MAX_X = 38;

// === Economy & Units (MVP vertical slice) ===
// Starting values tuned for fun early gameplay (expect heavy iteration)
export const GOLD_START = 250; // Increased to make early game less punishing

export const MINER = {
  cost: 75,
  buildTime: 6,            // seconds in production queue
  hp: 60,
  maxHealth: 60,
  speed: 1.8,
  mineTime: 2.5,           // seconds spent at gold node
  goldPerTrip: 18,
  attackDamage: 3,
  attackRange: 1.5,
  attackCooldown: 1.2,
  // Visual / feel
  color: 0xcccccc,
} as const;

export const SWORDWRATH = {
  cost: 125,
  buildTime: 5,
  hp: 85,
  maxHealth: 85,
  speed: 2.6,
  attackDamage: 11,
  attackRange: 2.2,
  attackCooldown: 0.9,
  // Visual / feel
  color: 0xdddddd,
} as const;

export const STATUE = {
  hp: 650,
  // Units that reach the enemy statue deal damage (simple for MVP)
} as const;

// === Timing & Simulation ===
export const FIXED_STEP = 1 / 30; // 30 Hz fixed timestep for logic

// === Difficulty Tuning ===
export const ENEMY_SPAWN_INTERVAL = 13; // seconds between enemy unit spawns (higher = easier)

// === Visual / Camera (Phase 0 seeds) ===
export const CAMERA_START_X = 0;
export const CAMERA_Y = 38;
export const CAMERA_Z = 52;
