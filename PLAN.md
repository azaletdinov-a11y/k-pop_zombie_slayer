# K-pop Zombie Slayer — PLAN

> Living document. Claude Code should update this whenever architecture or
> scope changes. Read this first at the start of every session.

## 1. Game Overview
- **Title:** K-pop Zombie Slayer
- **Genre:** 2D top-down wave-survival shooter
- **Tech:** HTML5 Canvas + vanilla JavaScript (ES modules). No frameworks, no
  build step. Runs by opening `index.html` in a browser.
- **Target:** Desktop browser (keyboard + mouse)
- **Main character:** Lyasan, a K-pop idol who fights zombies

## 2. Tech / Architecture Decisions
- Vanilla JS with ES modules (`<script type="module">`). No bundler.
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
    ├── main.js         # bootstraps game loop, ties modules together
    ├── config.js       # all tunable constants
    ├── input.js        # keyboard + mouse state
    ├── game.js         # game state, wave logic, win/lose, scoring
    ├── entities/
    │   ├── player.js   # Lyasan: movement, attacks, health, energy
    │   ├── zombie.js   # zombie: chase, contact damage, death
    │   └── projectile.js # sound-wave projectile (later phase)
    ├── systems/
    │   ├── render.js   # draws HUD, entities, screens
    │   └── collision.js # hit detection helpers
    └── ui/
        └── screens.js  # title, game over, restart
```
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

- [ ] **P6 — Art & audio:** Deferred until assets are available. Swap placeholder
      shapes for neon/synthwave sprites; add SFX (swing, hit, death, wave start);
      add looping background music. No code planned until assets exist.

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
