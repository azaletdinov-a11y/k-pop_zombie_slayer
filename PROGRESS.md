# K-pop Zombie Slayer — PROGRESS

> Running log. Claude Code updates this after every milestone. To resume a
> session: read PLAN.md, then read the latest entry here. Newest entry on top.

## Current Status
- **Active milestone:** Phase 4 in progress
- **Last completed:** P14/P15/P16 — Dash, enemies remaining HUD, pause menu
- **Next up:** next feature

## Current File Tree
```
k-pop_zombie_slayer/
├── index.html
├── styles.css
├── PLAN.md
├── PROGRESS.md
└── src/
    ├── main.js
    ├── config.js
    ├── input.js
    ├── game.js
    └── entities/
        ├── player.js
        └── zombie.js
```

---

## Log

<!--
Template for each entry — copy this block, fill it in, put newest on top:

### [DATE] — M#: <milestone name> — DONE
- **Built:** <1-2 lines on what was implemented>
- **Files touched:** <list>
- **Decisions/changes:** <anything that deviated from PLAN, or "none">
- **Known issues / TODO:** <bugs deferred, or "none">
- **How to test:** <e.g. open index.html, press WASD, expect ...>
-->

### [2026-06-15] — P14/P15/P16: Dash, Enemies Remaining, Pause — DONE
- **Built:** P14 — Space bar dash (120px, 0.15s, 1.5s cooldown); invincible during dash; white afterimage trail; blue cooldown arc fills clockwise around player. P15 — Bottom-right HUD shows "Zombies: N" (remaining alive + yet to spawn); boss waves show "BOSS ALIVE" in red. P16 — Escape pauses/resumes from any non-title/gameover state; pause overlay shows acquired perks for the run and a Resume button; Escape also resumes. Controls list on title screen updated with Space and Esc.
- **Files touched:** src/config.js, src/input.js, src/entities/player.js, src/game.js, src/ui/screens.js
- **Decisions/changes:** Pause stores previous state in `_stateBeforePause` so resuming from perk-select or between-wave works correctly. Dash direction falls back to facing direction when player is stationary.
- **Known issues / TODO:** none
- **How to test:** Space dashes with white trail + blue cooldown ring. Bottom-right shows zombie count that counts down as kills happen. Esc pauses mid-wave — perk list visible — click RESUME or Esc again to unpause.

---

### [2026-06-15] — P13: Difficulty scaling — DONE
- **Built:** Zombie HP and speed scale up each wave past wave 3 (+8% HP, +5% speed per wave). Bosses gain +15% HP per encounter after the first. Applied in `_applyScaling(z)` immediately after spawn — no changes to Zombie class needed.
- **Files touched:** src/config.js, src/game.js
- **Decisions/changes:** Scaling stored on the zombie instance (overrides `z.hp`, `z.maxHp`, `z.speed`) so the boss HP bar and hit detection stay correct without any further changes.
- **Known issues / TODO:** none
- **How to test:** Reach wave 5 — normal zombies noticeably tankier and faster. Boss at wave 10 has ~35 HP vs 30 at wave 5.

---

### [2026-06-15] — P12: Perk system — DONE
- **Built:** After each wave clears, a perk-select screen shows 3 randomly drawn cards from a pool of 8. Player hovers to highlight, clicks to pick. Perk applies immediately, then the 3s between-wave breather starts. 8 perks: +2 Max HP, Full Heal, Power Swing (×1.2 melee), Wide Arc (+15°), Energy Rush (+8/s regen), Heavy Shot (+1 proj dmg), Swift Steps (×1.1 speed), Hot Streak (+0.5s combo window). Modifiers stored on Player (speedMult, arcBonus, energyRegenBonus) and Game (meleeDamageMult, projDamageBonus, comboWindowBonus), applied at point-of-use.
- **Files touched:** src/ui/perks.js (new), src/entities/player.js, src/game.js, index.html
- **Decisions/changes:** Substituted "+1 pierce count" (redundant — projectiles already pierce all) with "Heavy Shot (+1 proj damage)". HP restore still happens in `_startWave` so "Full Heal" perk applies on top.
- **Known issues / TODO:** none — Phase 3 complete
- **How to test:** Kill all zombies in wave 1 → perk-select overlay appears with 3 cards → hover highlights card in pink → click picks perk → between-wave breather → new wave starts with perk active. Stack Power Swing multiple times for very high melee damage.

---

### [2026-06-15] — P11: Boss waves — DONE
- **Built:** Every 5th wave is a boss wave (1 boss spawns, waveTotal=1). Boss: radius 36, HP 30, speed 55, deals 2 contact damage per tick, ×5 score. Boss draws with dark-red body, 4px border, 3 gold crown spikes, overhead HP bar, red "BOSS" label. Between-wave banner pulses red "⚠ BOSS INCOMING" when the next wave is a boss.
- **Files touched:** src/config.js, src/entities/zombie.js, src/game.js, src/ui/screens.js
- **Decisions/changes:** Added `maxHp` and `contactDamage` to Zombie constructor (all types); `contactDamage` defaults to `CONTACT_DAMAGE` for normal/fast/tank. Contact damage tick now reads `touchingZombie.contactDamage` so boss hits harder. Boss HP bar uses `this.maxHp` for correct fill ratio.
- **Known issues / TODO:** none
- **How to test:** Reach wave 5 — one large dark-red boss with crown spawns. It deals 2 damage per hit tick. Kill it for ×5 score. After wave 4 clears, between-wave banner flashes "⚠ BOSS INCOMING".

---

### [2026-06-15] — P10: Zombie variants — DONE
- **Built:** Fast zombie (wave 4+): small, yellow-green, speed 150, 1HP, ×1.5 score. Tank zombie (wave 6+): large, dark green, thick border, speed 40, 8HP, ×3 score. `Zombie` constructor takes `type`, reads stats from `ZOMBIE_TYPES`. `_pickZombieType()` draws from `ZOMBIE_WEIGHTS` table. Score multiplied by `z.scoreMult` per kill.
- **Files touched:** src/config.js, src/entities/zombie.js, src/game.js
- **Decisions/changes:** `randomEdgePoint` now accepts radius param so fast/tank spawn fully off-screen per their actual size.
- **Known issues / TODO:** none
- **How to test:** Reach wave 4 — small yellow-green fast zombies appear. Wave 6 — large dark bordered tanks join. Tanks take many more hits; fast ones die in one melee swing.

---

### [2026-06-15] — P9: Polish & juice — DONE
- **Built:** Screen shake on player hit (decaying, 0.2s) and zombie kill (0.1s). Death particles — 8 green dots burst from each zombie on death. Player red hit-flash (0.15s). Zombie white hit-flash (0.1s). New `Particle` class.
- **Files touched:** src/config.js, src/entities/particle.js (new), src/entities/zombie.js, src/entities/player.js, src/game.js, index.html
- **Decisions/changes:** Shake on zombie kill is half-strength (0.5×) compared to player hit — kill feedback without being distracting on mass kills.
- **Known issues / TODO:** none
- **How to test:** Hit zombies — they flash white. Take contact damage — screen shakes, Lyasan flashes red. Kill zombie — green particles burst + light shake.

---

### [2026-06-15] — P8: Scoring — DONE
- **Built:** Score = `BASE_KILL_PTS × wave × damageMultiplier` per kill. HUD top-center shows `score | Kills: N`. Game Over shows score (large), wave + kills, high score from localStorage — gold "★ NEW RECORD" flash on beat.
- **Files touched:** src/config.js, src/game.js, src/ui/screens.js
- **Decisions/changes:** Score saved to localStorage on death (not on wave clear) — high score only counts completed runs.
- **Known issues / TODO:** none
- **How to test:** Kill zombies — score climbs top-center. Die — Game Over shows full stats. Reload — play again and beat it — gold NEW RECORD appears.

---

### [2026-06-15] — P7: Title screen — DONE
- **Built:** `'title'` game state with full-canvas title screen — game title, subtitle, controls table, pulsing "press any key" prompt. Any keydown or click starts the game. Game Over RESTART returns to title (300ms debounce prevents instant skip-through).
- **Files touched:** src/ui/screens.js, src/game.js
- **Decisions/changes:** Used `setTimeout` for 300ms debounce on restart→title transition so the RESTART click doesn't immediately skip the title screen.
- **Known issues / TODO:** none
- **How to test:** Open `index.html` → title screen with pulsing prompt → press key or click → game starts → die → RESTART → title screen again.

---

### [2026-06-15] — P5: Combo meter — DONE
- **Built:** Combo counter increments on each kill, resets after 2s of no kills or on taking damage. Damage multiplier = 1 + floor(combo÷5)×0.25, capped at ×3. Applied to both melee and projectile damage. Tier-up triggers a 0.4s gold flash. Bottom-center HUD shows `COMBO xN` + multiplier when active.
- **Files touched:** src/config.js, src/game.js, src/ui/screens.js
- **Decisions/changes:** none — implemented exactly as planned
- **Known issues / TODO:** none — Phase 2 complete (P6 deferred until assets)
- **How to test:** Kill zombies quickly — combo climbs, multiplier rises, display flashes gold on each tier. Take damage or wait 2s — combo resets to 0.

---

### [2026-06-15] — P3+P2: Energy & ranged attack — DONE
- **Built:** Energy pool (max 100, regen 15/s). Right-click fires a piercing sound wave projectile (400px/s, 350px range, 3 dmg, costs 25 energy, 0.3s cooldown). Projectile uses a `hitSet` to damage each zombie only once per shot. Energy bar (blue) added to HUD below health bar.
- **Files touched:** src/config.js, src/entities/player.js, src/entities/projectile.js (new), src/game.js, src/ui/screens.js, index.html
- **Decisions/changes:** none — implemented exactly as planned
- **Known issues / TODO:** none
- **How to test:** Open `index.html`, right-click toward zombies — white streak fires, passes through multiple zombies, energy bar drains; regens over time.

---

### [2026-06-15] — P4: Wave scaling — DONE
- **Built:** Structured waves (wave N = 5 + (N-1)×3 zombies), paced by spawn timer. Between-wave state with 3s breather, "Wave N Clear!" banner with countdown, full HP restore. Wave number shown top-right in HUD.
- **Files touched:** src/config.js, src/game.js, src/ui/screens.js
- **Decisions/changes:** Kept `ZOMBIE_SPAWN_INTERVAL` (adjusted to 1.2s) to pace releases within a wave rather than dumping all at once.
- **Known issues / TODO:** none
- **How to test:** Open `index.html` — wave 1 = 5 zombies, kill them all, banner appears for 3s with HP restored, wave 2 = 8 zombies begins.

---

### [2026-06-14] — M6: HUD — DONE
- **Built:** Health bar (top-left) with color shift green→yellow→red, HP numbers, heart glyph. Kill counter (top-center). HUD hidden during Game Over (overlay takes over).
- **Files touched:** src/ui/screens.js, src/game.js
- **Decisions/changes:** Health bar color uses HSL hue interpolation (120=green → 0=red) for smooth visual feedback — cleaner than hardcoded color thresholds.
- **Known issues / TODO:** none — V1 complete
- **How to test:** Open `index.html` — health bar and kill counter visible immediately; bar shrinks and shifts color as Lyasan takes damage.

---

### [2026-06-14] — M5: Survival loop — DONE
- **Built:** Player HP (10), contact damage (1 dmg per 0.5s of overlap), Game Over screen with kill count and RESTART button. Kill counter increments on zombie death. `_init()` resets all state cleanly on restart.
- **Files touched:** src/config.js, src/entities/player.js, src/game.js, src/ui/screens.js (new), index.html
- **Decisions/changes:** none — implemented exactly as planned
- **Known issues / TODO:** No HUD yet — health and kills only visible on Game Over screen (M6)
- **How to test:** Open `index.html`, let zombies touch Lyasan — health drains, Game Over screen appears with kill count; RESTART button resets everything.

---

### [2026-06-14] — M4: Melee combat — DONE
- **Built:** Left-click triggers a 90° arc swing (60px range, 2 dmg, 0.4s cooldown). Facing now tracks mouse cursor. Arc flash renders semi-transparent for 0.12s. Zombies have HP; dead ones are filtered each frame. Click-edge detection prevents holding the button to spam.
- **Files touched:** src/config.js, src/entities/player.js, src/entities/zombie.js, src/game.js
- **Decisions/changes:** Facing switched from movement-direction to mouse-direction (planned in M4 design). Mouse state was already wired in M2 so no input.js change needed.
- **Known issues / TODO:** No player health or game over yet (M5)
- **How to test:** Open `index.html`, move mouse toward zombies, left-click — arc flashes and zombies in range disappear.

---

### [2026-06-14] — M3: Zombies — DONE
- **Built:** `Zombie` class with random edge spawning and beeline chase AI. Spawn timer and max-count cap managed in `Game`. Zombie drawn as green circle with dark eye dots.
- **Files touched:** src/entities/zombie.js (new), src/config.js, src/game.js, index.html
- **Decisions/changes:** none — implemented exactly as planned
- **Known issues / TODO:** No hit detection yet — zombies pass through Lyasan (M4/M5)
- **How to test:** Open `index.html`, move around — green circles spawn from edges every 2s and chase Lyasan.

---

### [2026-06-14] — M2: Movement — DONE
- **Built:** WASD 8-directional movement with diagonal normalization, canvas clamping, rotating direction nub tracking facing angle. Mouse tracking wired into Input for use in M4.
- **Files touched:** src/input.js, src/config.js (PLAYER_SPEED), src/entities/player.js, src/main.js, index.html
- **Decisions/changes:** Added mouse state to `Input` now (not in plan) so M4 doesn't need to touch `input.js` or `index.html` again — low cost, forward-lean justified.
- **Known issues / TODO:** none
- **How to test:** Open `index.html`, press WASD — Lyasan moves smoothly, direction nub rotates, can't leave the canvas.

---

### [2026-06-14] — M1: Loop & canvas — DONE
- **Built:** Fixed-timestep game loop (RAF + accumulator), canvas sized to 800×600, dark background, Lyasan drawn as a hot-pink circle with a direction nub and name label. FPS counter displayed top-left.
- **Files touched:** index.html, styles.css, src/config.js, src/main.js, src/game.js, src/entities/player.js
- **Decisions/changes:** FPS rendered on canvas (top-left, low-opacity) rather than console — easier to eyeball at a glance. Delta capped at 100ms to prevent spiral-of-death on tab-blur. None of these deviate from the plan.
- **Known issues / TODO:** none
- **How to test:** Open `index.html` in a browser. You should see a centered dark canvas with a pink circle labelled "Lyasan" and a stable FPS ~60 in the top-left corner.

---

### [YYYY-MM-DD] — Project scaffolded
- **Built:** PLAN.md and PROGRESS.md starter files. No game code yet.
- **Files touched:** PLAN.md, PROGRESS.md
- **Decisions/changes:** Tech stack locked to vanilla JS + Canvas, no build
  step. V1 scope = M1–M6 (movement, one zombie, melee, survival loop, HUD).
- **Known issues / TODO:** none
- **How to test:** n/a — awaiting plan approval to begin M1.
