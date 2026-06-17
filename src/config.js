const CANVAS_WIDTH  = 800;
const CANVAS_HEIGHT = 600;
const TARGET_FPS    = 60;
const FIXED_DT      = 1 / TARGET_FPS;

const PLAYER_RADIUS = 20;
const PLAYER_COLOR  = '#ff69b4';
const PLAYER_SPEED  = 200; // pixels per second

// Zombies
const ZOMBIE_SPAWN_INTERVAL = 1.2;  // seconds between individual spawns within a wave

const ZOMBIE_TYPES = {
  normal: { radius: 16, speed: 80,  hp: 2,  color: '#4caf50', scoreMult: 1   },
  fast:   { radius: 11, speed: 150, hp: 1,  color: '#c6e829', scoreMult: 1.5 },
  tank:   { radius: 26, speed: 40,  hp: 8,  color: '#1b5e20', scoreMult: 3   },
  boss:   { radius: 36, speed: 55,  hp: 30, color: '#8b0000', scoreMult: 5, contactDamage: 2 },
};

// Kept for backwards compat with randomEdgePoint margin
const ZOMBIE_RADIUS = 16;
// Legacy single-type constants (unused by typed zombies — keep for particle color fallback)
const ZOMBIE_COLOR  = '#4caf50';

// Spawn weight tables — first entry whose minWave <= current wave is used
const ZOMBIE_WEIGHTS = [
  { minWave: 6, weights: { normal: 40, fast: 35, tank: 25 } },
  { minWave: 4, weights: { normal: 60, fast: 40, tank: 0  } },
  { minWave: 1, weights: { normal: 100, fast: 0, tank: 0  } },
];

const FAST_WAVE_START     = 4;
const TANK_WAVE_START     = 6;
const BOSS_WAVE_INTERVAL  = 5; // every Nth wave is a boss wave

// Zombie emergence
const EMERGE_DURATION = 0.4; // seconds to rise from underground

// Difficulty scaling
const SCALE_START_WAVE    = 3;    // scaling begins after this wave
const HP_SCALE_PER_WAVE   = 0.08; // +8% HP per wave past baseline
const SPEED_SCALE_PER_WAVE = 0.05; // +5% speed per wave past baseline
const BOSS_HP_SCALE       = 0.15; // +15% HP per boss encounter after the first

// Waves
const WAVE_BASE_COUNT        = 5;   // zombies in wave 1
const WAVE_INCREMENT         = 3;   // extra zombies per wave
const BETWEEN_WAVE_DURATION  = 3;   // seconds of breather between waves

// Player survival
const PLAYER_MAX_HP      = 10;
const CONTACT_DAMAGE     = 1;
const CONTACT_INTERVAL   = 0.5; // seconds between contact damage ticks

// Melee
const MELEE_RANGE    = 60;          // pixels from player center
const MELEE_ARC      = Math.PI / 2; // 90° total arc
const MELEE_DAMAGE   = 2;
const MELEE_COOLDOWN = 0.4;         // seconds
const MELEE_FLASH    = 0.12;        // seconds the arc is visible

// Energy
const ENERGY_MAX   = 100;
const ENERGY_REGEN = 15;  // per second

// Projectile
const PROJ_SPEED    = 400; // pixels per second
const PROJ_RANGE    = 350; // pixels before expiry
const PROJ_DAMAGE   = 3;
const PROJ_COST     = 25;  // energy cost per shot
const PROJ_COOLDOWN = 0.3; // seconds

// Dash
const DASH_DISTANCE = 120; // pixels
const DASH_DURATION = 0.15; // seconds
const DASH_COOLDOWN = 1.5;  // seconds

// Scoring
const BASE_KILL_PTS = 10;

// Polish
const SHAKE_STRENGTH  = 6;    // max pixel offset
const SHAKE_DURATION  = 0.2;  // seconds
const PARTICLE_COUNT  = 8;    // per zombie death

// Combo
const COMBO_WINDOW      = 2;    // seconds before combo decays
const COMBO_TIER_SIZE   = 5;    // kills per multiplier tier
const COMBO_DAMAGE_STEP = 0.25; // multiplier added per tier
const COMBO_MAX_MULT    = 3;    // cap
const COMBO_FLASH_DUR   = 0.4;  // seconds the tier-up glow lasts
