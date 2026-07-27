# K-pop Zombie Slayer — PLAN

> Living document. Claude Code should update this whenever architecture or
> scope changes. Read this first at the start of every session.

## 1. Game Overview
- **Title:** K-pop Zombie Slayer
- **Genre:** 2D top-down wave-survival shooter
- **Tech:** HTML5 Canvas + vanilla JavaScript (ES modules). No frameworks, no
  build step. Runs by opening `index.html` in a browser.
- **Target:** Desktop browser (keyboard + mouse) and touch devices (twin-stick).
  Both schemes are live at once; the on-screen controls appear only after a real
  touch, so desktop is unaffected. See P22.
- **Main character:** Lyasan, a K-pop idol who fights zombies

## 2. Tech / Architecture Decisions
- Vanilla JS loaded as ordered global `<script>` tags in `index.html` (no
  bundler, no module system). Each file exposes a global (`Game`, `Player`,
  `Sfx`, `Rng`, …); load order in `index.html` is the dependency order.
- Determinism: `src/rng.js` provides a seeded xorshift32 RNG (`Rng`). Every roll
  that affects how a run plays out — zombie type, spawn position, perk draw,
  modifier, drops — goes through `Rng`. Purely cosmetic randomness (particles,
  screen shake, audio noise) deliberately stays on `Math.random` so it cannot
  perturb the seeded stream. Daily-challenge runs seed from the bare date;
  normal runs seed from the clock so each is different (see P21).
- Single fixed-timestep game loop using `requestAnimationFrame` with a
  delta-time accumulator (target 60fps; logic decoupled from render rate).
- Entity model: plain JS classes (`Player`, `Zombie`, `Projectile`), each with
  `update(dt)` and `draw(ctx)`. Keep rendering separate from logic so sprites
  can replace placeholder shapes later without touching game rules.
- Input handled in one `Input` module (keyboard state map + mouse position +
  mouse buttons). Game code reads state; never binds logic to raw events.
- All tunable numbers (speeds, damage, cooldowns, spawn counts) live in one
  `config.js` so balancing never requires hunting through logic files.
- State lives in files (this PLAN + PROGRESS), not in chat history.

## 3. Proposed File Structure
```
kpop-zombie-slayer/
├── index.html          # canvas + module entry point
├── styles.css          # page + canvas framing
├── PLAN.md             # this file
├── PROGRESS.md         # running log of what's built
└── src/
    ├── main.js         # bootstraps game loop, HiDPI canvas, asset load, auto-pause
    ├── config.js       # all tunable constants
    ├── input.js        # keyboard + mouse state
    ├── rng.js          # seeded xorshift32 RNG (daily seed)
    ├── audio.js        # Sfx: Web Audio SFX + procedural synthwave music
    ├── render.js       # asset loader + entity/background draw helpers
    ├── game.js         # game state, wave logic, win/lose, scoring, difficulty, modifiers
    ├── entities/
    │   ├── player.js         # Lyasan: movement, dash, attacks, health, energy
    │   ├── zombie.js         # all zombie types (data-driven by `type`)
    │   ├── projectile.js     # player sound-wave projectile (pierce + ricochet)
    │   ├── enemyProjectile.js# ranged-zombie projectile
    │   └── particle.js       # death/impact particles
    └── ui/
        ├── screens.js  # title, difficulty, perk-select, pause, leaderboard, game over, HUD
        └── perks.js    # perk definitions + perk-select draw
```
(No `systems/` dir was created; render lives at `src/render.js` and collision
helpers live inline in `game.js`.)
(Structure may be simplified in early milestones and expanded as features land.
Claude Code: propose adjustments in the plan step, not mid-code.)

## 4. Milestones

### V1 — Minimum Playable
- [x] **M1 — Loop & canvas:** fixed-timestep game loop, canvas sized + cleared
      each frame, FPS stable. Lyasan drawn as a placeholder shape, stationary.
- [x] **M2 — Movement:** WASD 8-directional movement, clamped to canvas bounds.
- [x] **M3 — Zombies:** one zombie type spawns from screen edges and chases
      Lyasan. Spawn timing/count from `config.js`.
- [x] **M4 — Melee combat:** left-click "mic swing" — 60px / 90° arc in front
      of Lyasan, 2 damage, 0.4s cooldown. Hit detection + zombie death.
- [x] **M5 — Survival loop:** player health, contact damage (1 dmg per 0.5s of
      contact), Game Over screen with score + Restart button.
- [x] **M6 — HUD:** health bar + kill counter on screen.

### Phase 2 — Build order: P4 → P3+P2 → P5 → P6

- [x] **P4 — Wave scaling:** Replace freeform spawning with structured waves.
      Wave N spawns (5 + (N-1)×3) zombies total, released in batches from edges.
      Between waves: freeze spawning, show "Wave N complete!" banner for 3s,
      restore player to full HP, then start next wave. Wave number shown in HUD.
      Tunables: `WAVE_BASE_COUNT` (5), `WAVE_INCREMENT` (3), `BETWEEN_WAVE_DURATION` (3s).

- [x] **P3+P2 — Energy & ranged attack:** Energy pool (max 100, regen 15/s).
      Right-click fires a "sound wave" projectile (costs 25 energy, 0.3s cooldown).
      Projectile travels in a straight line at 400px/s, deals 3 damage, pierces
      all zombies it touches, expires at `PROJ_RANGE` (350px) or canvas edge.
      Energy bar added to HUD (below health bar). No shot if energy < cost.
      New file: `src/entities/projectile.js`.
      Tunables: `ENERGY_MAX`, `ENERGY_REGEN`, `PROJ_SPEED`, `PROJ_RANGE`,
      `PROJ_DAMAGE`, `PROJ_COST`, `PROJ_COOLDOWN`.

- [x] **P5 — Combo meter:** Killing zombies in quick succession builds a combo
      multiplier. Each kill within `COMBO_WINDOW` (2s) of the last increments
      the counter. Counter resets to 0 on taking any damage.
      Damage multiplier: `1 + floor(combo / 5) × 0.25` (so every 5 combo = +25%,
      cap at ×3). Combo count displayed in HUD; flashes on new tier.
      Tunable: `COMBO_WINDOW`, `COMBO_TIER_SIZE` (5), `COMBO_DAMAGE_STEP` (0.25),
      `COMBO_MAX_MULT` (3).

- [x] **P6 — Art & audio:** Done in two later passes. Audio became procedural
      (see P13 — no asset files needed). Sprite art landed as top-down pixel-art
      PNGs: `player_lyasan.png` plus one per zombie type in
      `assets/images/zombies/`. Entities draw sprites via `drawSprite()` in
      `render.js` (rotated to facing, `SPRITE_DRAW_SCALE` in config), falling
      back to the original placeholder shapes if an image fails to load.
      Mechanic overlays (boss HP bar/label, exploder pulse ring, shield block
      arc) render on top of sprites.

### Phase 3 — Build order: P7 → P8 → P9 → P10 → P11 → P12

- [x] **P7 — Title screen:** New game state `'title'`. Canvas shows game title,
      tagline, controls summary (WASD / left-click / right-click), and a
      "Press any key or click to start" prompt. Transitions to `'playing'` on
      any key or click. Game Over RESTART button returns to title screen (not
      directly to gameplay). New function `drawTitle(ctx)` in `screens.js`.

- [x] **P8 — Scoring:** Points awarded per kill: `BASE_KILL_PTS × wave × damageMultiplier`.
      Running score shown in HUD (top-center, replacing plain kill counter).
      On Game Over: show score + kills + wave reached + high score (persisted to
      `localStorage`). New high score flashes gold. Tunables: `BASE_KILL_PTS` (10).

- [x] **P9 — Polish & juice:** Four independent feel improvements, one commit each:
      1. **Screen shake** — on player taking damage: translate ctx by a random
         small offset for 0.2s, decaying to zero. Strength tunable.
      2. **Zombie death particles** — on zombie death: spawn 6–8 short-lived
         coloured dots that fly outward and fade. New `Particle` class in
         `src/entities/particle.js`.
      3. **Player hit-flash** — player circle briefly fills red for 0.15s when
         taking contact damage.
      4. **Zombie hit-flash** — zombie briefly flashes white when struck.

- [x] **P10 — Zombie variants:** Two new zombie types introduced at fixed waves.
      All types share the same `Zombie` base class; a `type` string drives
      differences in config lookups.
      - **Fast zombie** (from wave 4): radius 10, speed 140, HP 1, green-yellow color.
      - **Tank zombie** (from wave 6): radius 24, speed 45, HP 6, dark green color.
      Spawn logic in `game.js` picks type based on current wave; type weights
      tunable in `config.js`.

- [x] **P11 — Boss waves:** Every 5th wave is a boss wave. One boss spawns instead
      of the normal quota. Boss: radius 36, HP 30, speed 55, deals 2 contact dmg
      per tick, drops 3× score. Boss shown with a HP bar above it and a
      "BOSS" label. Between-wave banner reads "BOSS INCOMING" for boss waves.
      New boss properties on `Zombie` class; detected by `z.isBoss` flag.
      Tunables: `BOSS_WAVE_INTERVAL` (5), `BOSS_HP`, `BOSS_SPEED`, `BOSS_RADIUS`,
      `BOSS_SCORE_MULT` (3).

- [x] **P12 — Perk system:** After each wave clears (before the between-wave timer
      starts), show a perk-select screen: 3 randomly drawn cards from a pool.
      Player clicks one; it applies permanently for the run.
      Perk pool (8 perks): +2 max HP, full heal, +20% melee damage, wider arc
      (+15°), faster energy regen (+8/s), +1 projectile pierce count, +10% move
      speed, combo window +0.5s.
      New game state `'perk-select'`. New file `src/ui/perks.js` with perk
      definitions and `drawPerkSelect(ctx, options)`. Perks stored as a flat
      modifier object on `Game` and applied at point-of-use (not baked into
      config constants).

### Phase 4 — Depth, feel & meta (implemented; supersedes deferred P6 audio)

- [x] **P13 — Procedural audio (`src/audio.js`, `Sfx`):** Web Audio API, no asset
      files needed. Synthesized SFX (swing, shoot, hit, death, playerHit,
      waveClear, perkPick, bossWarning) and a looping procedural synthwave track
      (kick/snare/hihat/sawtooth-bass step sequencer). Master volume persisted to
      `localStorage` (`kzs_volume`); `M` toggles mute; pause screen has −/+ volume
      buttons. Replaces the old asset-dependent P6 plan — the game ships no audio
      files at all.

- [x] **P14 — Difficulty select:** New `'difficulty'` state between title and play.
      Three tiers (`DIFFICULTIES` in `game.js`): Easy / Normal / Hard, each with
      `hpMult`, `spawnMult`, `contactMult`, `bonusHp`. Card UI; click to start.

- [x] **P15 — More zombie types (data-driven):** Four new types on the shared
      `Zombie` class, selected by `ZOMBIE_WEIGHTS` per wave:
      - **ranged** — keeps distance (`RANGED_STOP_DIST`) and fires
        `EnemyProjectile`s at Lyasan (`src/entities/enemyProjectile.js`).
      - **exploder** — on death deals `EXPLODER_BLAST_DAMAGE` in
        `EXPLODER_BLAST_RADIUS`.
      - **shield** — frontal arc blocks player projectiles; takes `meleeMult`×
        melee damage (kill it up close).
      - **splitter** — on death spawns small fast **splinterlings**.
      Behaviours are config flags (`onDeath`, `blocksProjectiles`, `meleeMult`),
      read by generic code — no per-type branches.

- [x] **P16 — Challenge modifiers:** From `MODIFIER_START_WAVE` (8), each wave may
      roll a modifier from `CHALLENGE_MODIFIERS` (horde, berserker, armored,
      frenzy, relentless, cursed). Data-driven multiplier fields; announced with a
      banner and previewed on the between-wave screen.

- [x] **P17 — Expanded perks:** New perks beyond the P12 pool — vampiric swing,
      afterimage (dash leaves a damaging trail), double-tap (every 3rd shot
      refunds energy), ricochet projectiles, berserker, lucky strike (periodic
      guaranteed health drop). Perk-select cards also selectable via keys `1/2/3`.

- [x] **P18 — Pickups & drops:** Zombie deaths can drop energy/health pickups
      (`SPAWN_SAFE_DIST`-aware) that Lyasan collects by walking over them.
      Drawn as pixel-art icons (lightstick / heart) via `drawIcon()` at
      `PICKUP_DRAW_SIZE`. Icons are authored on a coarse 16x16 logical grid
      because they display at ~22px — art authored at sprite resolution is
      destroyed by the nearest-neighbour downscale at that size.

- [x] **P19 — Leaderboard & run summary:** Scores persisted to `localStorage`;
      `'leaderboard'` state (open with `H` from title). Game Over shows a run
      summary (time, total damage, highest combo) and highlights the current run.

- [x] **P20 — Extra juice:** Hit-stop on impactful hits, floating damage numbers,
      toast notifications, death-shake, and a next-wave composition preview.

### Phase 5

- [x] **P21 — Daily challenge:** `[D]` on the title screen starts a run seeded
      with the bare date (`todaySeed()`, e.g. `20260725`), so every attempt on a
      given day replays the exact same run and scores are comparable. Locked to
      Normal difficulty for that reason. The seed is shown in the title hint bar
      and as a gold `★ DAILY #…` badge in the HUD; daily entries are starred on
      the leaderboard and stored with their seed.
      Two bugs fixed to make this real: zombie spawn positions used
      `Math.random`, so runs were never actually reproducible; and the non-daily
      run counter lived on the `Game` instance, so a page refresh reset it and
      replayed the previous session's first run.

- [x] **P22 — Touch / mobile support:** Twin-stick scheme, additive to keyboard
      and mouse. Left stick moves (analog), right stick aims and auto-fires;
      MIC / DASH / pause buttons. Sticks use a floating origin. All of it is
      driven from `Input`, so game logic is unchanged, and the overlay only
      draws once `Input.touchActive` flips — desktop never sees it.
      The canvas keeps its 800x600 logical space and is CSS-scaled to fit,
      capped at 1:1, so every layout constant and hit-test stays valid.
      Title hint chips (`[D]`/`[H]`/`[M]`) are tappable, since touch has no
      keyboard and any other tap starts a run; the controls panel shows
      whichever scheme is in use.
      Not yet validated on real hardware — thumb reach, stick size and deadzone
      need a device, and `STICK_MAX_DIST` / `STICK_DEADZONE` / the
      `TOUCH_BTN_*` rects in `config.js` are the tuning knobs.

## 5. Acceptance Criteria (V1 "done")
- Lyasan moves smoothly with WASD, can't leave the canvas.
- Zombies spawn, chase, and can be killed with melee.
- Player takes damage on contact and dies at 0 health.
- Game Over screen shows kill count and restarts cleanly (no leftover state).
- HUD shows current health and kills.
- Stable 60fps with ~20 zombies on screen.

## 6. Workflow Rules (for Claude Code)
- Plan first; write code only after the human approves the plan.
- Implement ONE milestone at a time, then stop for review.
- After each milestone: update PROGRESS.md, update this PLAN if anything
  changed, and give a 5-line summary + current file tree.
- Keep all tunables in `config.js`. Keep rendering separate from logic.
