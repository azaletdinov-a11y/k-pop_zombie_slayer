const CANVAS_WIDTH  = 800;
const CANVAS_HEIGHT = 600;
const TARGET_FPS    = 60;
const FIXED_DT      = 1 / TARGET_FPS;

const PLAYER_RADIUS = 20;
const PLAYER_COLOR  = '#ff69b4';
const PLAYER_SPEED  = 200; // pixels per second

// Zombies
const ZOMBIE_SPAWN_INTERVAL = 1.2;  // seconds between individual spawns within a wave

// Behavior flags: onDeath ('explode' | 'split'), blocksProjectiles (frontal shield arc),
// meleeMult (melee damage taken multiplier)
const ZOMBIE_TYPES = {
  normal:      { radius: 16, speed: 80,  hp: 2,  color: '#4caf50', scoreMult: 1   },
  fast:        { radius: 11, speed: 150, hp: 1,  color: '#c6e829', scoreMult: 1.5 },
  tank:        { radius: 26, speed: 40,  hp: 8,  color: '#1b5e20', scoreMult: 3   },
  ranged:      { radius: 13, speed: 65,  hp: 3,  color: '#ff6d00', scoreMult: 2   },
  exploder:    { radius: 18, speed: 55,  hp: 3,  color: '#ff5722', scoreMult: 2.5, onDeath: 'explode' },
  shield:      { radius: 20, speed: 50,  hp: 6,  color: '#455a64', scoreMult: 3,   blocksProjectiles: true, meleeMult: 3 },
  splitter:    { radius: 16, speed: 90,  hp: 3,  color: '#ce93d8', scoreMult: 2,   onDeath: 'split' },
  splinterling:{ radius: 8,  speed: 150, hp: 1,  color: '#c6e829', scoreMult: 0.5 },
  boss:        { radius: 36, speed: 55,  hp: 30, color: '#8b0000', scoreMult: 5, contactDamage: 2 },
};

// Kept for backwards compat with randomEdgePoint margin
const ZOMBIE_RADIUS = 16;
// Legacy single-type constants (unused by typed zombies — keep for particle color fallback)
const ZOMBIE_COLOR  = '#4caf50';

// Spawn weight tables — first entry whose minWave <= current wave is used
const ZOMBIE_WEIGHTS = [
  { minWave: 7, weights: { normal: 25, fast: 20, tank: 15, ranged: 12, exploder: 8,  shield: 10, splitter: 10 } },
  { minWave: 6, weights: { normal: 30, fast: 28, tank: 20, ranged: 0,  exploder: 7,  shield: 8,  splitter: 7  } },
  { minWave: 5, weights: { normal: 50, fast: 32, tank: 0,  ranged: 0,  exploder: 5,  shield: 0,  splitter: 13 } },
  { minWave: 4, weights: { normal: 55, fast: 35, tank: 0,  ranged: 0,  exploder: 0,  shield: 0,  splitter: 10 } },
  { minWave: 1, weights: { normal: 100, fast: 0, tank: 0,  ranged: 0,  exploder: 0,  shield: 0,  splitter: 0  } },
];

const RANGED_STOP_DIST       = 180;
const RANGED_SHOOT_INTERVAL  = 2.5;
const ENEMY_PROJ_SPEED       = 120;
const ENEMY_PROJ_RANGE       = 400;
const ENEMY_PROJ_DAMAGE      = 1;
const BOSS_WAVE_INTERVAL  = 5; // every Nth wave is a boss wave

// Exploder zombie
const EXPLODER_BLAST_RADIUS = 70;
const EXPLODER_BLAST_DAMAGE = 3;

// Challenge modifiers
const MODIFIER_START_WAVE  = 8;
const MODIFIER_BANNER_DUR  = 2.5; // seconds banner is visible

// Sprite rendering — sprite content fills ~80% of its canvas, so draw larger
// than the hitbox diameter to make the visible body match the collision circle
const SPRITE_DRAW_SCALE = 1.35;

// On-screen size of dropped pickups. Purely visual — collection distance is
// based on the player's radius, not this.
const PICKUP_DRAW_SIZE = 22;

// Touch controls (logical canvas units). Sticks use a floating origin: wherever
// the thumb lands becomes the centre, which is far more forgiving than a fixed
// position when you cannot see your thumbs.
const STICK_MAX_DIST = 60;  // travel for full deflection
const STICK_DEADZONE = 10;  // ignore jitter below this
const TOUCH_BTN_MELEE = { x: 705, y: 470, r: 44 };
const TOUCH_BTN_DASH  = { x: 745, y: 360, r: 36 };
// Sits between the centred score and the right-aligned wave text, so it does
// not overlap either. r=36 keeps it at Apple's 44pt minimum even on the
// smallest landscape phone (375px tall → canvas scaled to 0.625).
const TOUCH_BTN_PAUSE = { x: 590, y: 42,  r: 36 };

// Zombie emergence
const EMERGE_DURATION = 0.4; // seconds to rise from underground
const SPAWN_SAFE_DIST = 150; // minimum spawn distance from the player

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
