const DIFFICULTIES = [
  { name: 'Easy',   hpMult: 0.65, spawnMult: 1.4,  contactMult: 0.5, bonusHp: 2,
    color: '#4caf50', lines: ['+2 Starting HP', 'Zombies weaker',  'Less contact dmg'] },
  { name: 'Normal', hpMult: 1.0,  spawnMult: 1.0,  contactMult: 1.0, bonusHp: 0,
    color: '#ffc107', lines: ['Standard mode',  'Balanced',        ''] },
  { name: 'Hard',   hpMult: 1.4,  spawnMult: 0.75, contactMult: 1.5, bonusHp: 0,
    color: '#e53935', lines: ['Zombies tougher','Faster spawns',   'More contact dmg'] },
];

// Effects are data-driven: generic code reads these fields, no per-id branches.
const CHALLENGE_MODIFIERS = [
  { id: 'horde',      label: 'HORDE',      color: '#e53935', desc: '+50% zombie count',  countMult: 1.5 },
  { id: 'berserker',  label: 'BERSERKER',  color: '#ff6d00', desc: 'Zombies +30% speed', zombieSpeedMult: 1.3 },
  { id: 'armored',    label: 'ARMORED',    color: '#78909c', desc: 'Zombies +50% HP',    zombieHpMult: 1.5 },
  { id: 'frenzy',     label: 'FRENZY',     color: '#ffc107', desc: 'Double spawn rate',  spawnIntervalMult: 0.5 },
  { id: 'relentless', label: 'RELENTLESS', color: '#7b1fa2', desc: 'No HP restore',      noHeal: true },
  { id: 'cursed',     label: 'CURSED',     color: '#bf360c', desc: 'Your damage -30%',   playerDmgMult: 0.7 },
];

// Seed identifying today's daily challenge, e.g. 20260725. Everyone playing on
// the same calendar day gets the same run.
function todaySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

class Game {
  constructor() {
    this.state          = 'title';
    this.prevMouseLeft  = false;
    this.prevMouseRight = false;
    this.titleReady     = false; // prevents instant skip on load
    this._listenTitle();
  }

  _listenTitle() {
    this._titleKeyHandler = (e) => {
      if (e.key === 'Escape') {
        if (this.state === 'playing' || this.state === 'between-wave' || this.state === 'perk-select') {
          this._stateBeforePause = this.state;
          this.state = 'paused';
        } else if (this.state === 'paused') {
          this.state = this._stateBeforePause;
        } else if (this.state === 'leaderboard') {
          this.state = 'title';
        } else if (this.state === 'difficulty') {
          this.state = 'title';
        }
        return;
      }
      if (e.key === 'm' || e.key === 'M') { Sfx.toggleMute(); return; }
      if ((e.key === 'h' || e.key === 'H') && this.state === 'title')       { this.state = 'leaderboard'; return; }
      if ((e.key === 'h' || e.key === 'H') && this.state === 'leaderboard') { this.state = 'title';       return; }
      // Must come before the any-key-starts fallthrough below
      if ((e.key === 'd' || e.key === 'D') && this.state === 'title' && this.titleReady) {
        this._startDaily();
        return;
      }
      if (this.state === 'perk-select' && ['1','2','3'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < this.perkOptions.length) this._selectPerk(idx);
        return;
      }
      if (this.state === 'title' && this.titleReady) this._startGame();
    };
    window.addEventListener('keydown', this._titleKeyHandler);
  }

  _startGame() {
    this.state = 'difficulty';
  }

  // Daily challenge: locked to Normal so scores are comparable, and seeded with
  // the bare date so every attempt today replays the exact same run.
  _startDaily() {
    this._startWithDifficulty(DIFFICULTIES[1], true);
  }

  _startWithDifficulty(diff, daily) {
    this._init();
    this.difficulty = diff;
    this.isDaily    = !!daily;
    if (diff.bonusHp > 0) {
      this.player.maxHp += diff.bonusHp;
      this.player.hp     = this.player.maxHp;
    }
    const seed = todaySeed();
    if (this.isDaily) {
      Rng.reset(seed);
    } else {
      // Vary every run so same-day play doesn't replay identical perk/type/
      // modifier rolls. Mixes the clock in as well as a counter — the counter
      // alone lives on this instance, so a page refresh would reset it to 1
      // and replay the previous session's first run.
      this._runCounter = (this._runCounter || 0) + 1;
      Rng.reset((Date.now() ^ (this._runCounter * 0x9e3779b9)) >>> 0);
    }
    this._dailySeed = seed;
    Sfx.startMusic();
  }

  _autoPause() {
    if (this.state === 'playing' || this.state === 'between-wave' || this.state === 'perk-select') {
      this._stateBeforePause = this.state;
      this.state = 'paused';
    }
  }

  _init() {
    this.player         = new Player();
    this.zombies          = [];
    this.projectiles      = [];
    this.enemyProjectiles = [];
    this.kills          = 0;
    this.score          = 0;
    this.particles      = [];
    this.damageNumbers  = [];
    this.shakeTimer     = 0;
    this.state          = 'playing'; // 'playing' | 'between-wave' | 'gameover' | 'title'
    this.prevMouseLeft  = false;
    this.prevMouseRight = false;
    this.prevSpace      = false;
    // Combo
    this.combo          = 0;
    this.comboTimer     = 0;
    this.comboFlash     = 0; // > 0 while tier-up glow is active
    // Perk modifiers
    this.meleeDamageMult  = 1;
    this.projDamageBonus  = 0;
    this.comboWindowBonus = 0;
    // New perk flags
    this.vampiricSwing  = false;
    this.afterimage     = false;
    this.doubleTap      = false;
    this.shotCounter    = 0;
    this.ricochet       = false;
    this.berserkerPerk  = false;
    this.luckyStrike    = false;
    this.luckyStrikeCounter = 0;
    // Perk select state
    this.perkOptions   = [];
    this.perkHovered   = -1;
    this.acquiredPerks = [];
    // Wave preview
    this.wavePreview   = [];
    // Run summary stats
    this.runTimer          = 0;
    this.totalDamageDealt  = 0;
    this.highestCombo      = 0;
    // Leaderboard — populated on game over
    this._savedScores   = [];
    this._currentRunIdx = -1;
    // Challenge modifier
    this.activeModifier      = null;
    this.modifierBannerTimer = 0;
    // Difficulty / daily flag (overwritten by _startWithDifficulty)
    this.difficulty = DIFFICULTIES[1];
    this.isDaily    = false;
    // Hit-stop, death shake
    this.hitStop         = 0;
    this.deathShakeTimer = 0;
    // Drop pickups
    this.pickups = [];
    // Zombies spawned mid-kill-resolution (splitters) — flushed after the kill loops
    this._pendingZombies = [];
    // Modifier pre-rolled for the next wave so the between-wave screen can show it
    this.pendingModifier = undefined;
    // Toasts
    this.toasts           = [];
    this.wavePlayerDamage = 0;
    this._comboMilestones = new Set();
    // Wave state
    this.wave          = 1;
    this.waveTotal     = WAVE_BASE_COUNT;
    this.waveSpawned   = 0;
    this.waveDeaths    = 0;
    this.spawnTimer    = 0;
    this.betweenTimer  = 0;
  }

  update(dt) {
    const mouseDown  = Input.mouse.left;
    const clicked    = mouseDown && !this.prevMouseLeft;
    this.prevMouseLeft = mouseDown;

    const rightDown  = Input.mouse.right;
    const rightClick = rightDown && !this.prevMouseRight;
    this.prevMouseRight = rightDown;

    const spaceDown  = Input.keys.space;
    const spacePress = spaceDown && !this.prevSpace;
    this.prevSpace   = spaceDown;

    // Touch: sticks only while actually playing; everywhere else taps are clicks
    Input.playMode = (this.state === 'playing');
    if (Input.pauseTapped) {
      Input.pauseTapped = false;
      if (this.state === 'playing') {
        this._stateBeforePause = this.state;
        this.state = 'paused';
        return;
      }
    }

    if (this.state === 'title') {
      this.titleReady = true;
      if (clicked) this._startGame();
      return;
    }

    if (this.state === 'leaderboard') {
      if (clicked && isLeaderboardBackClicked(Input.mouse.x, Input.mouse.y)) {
        this.state = 'title';
      }
      return;
    }

    if (this.state === 'difficulty') {
      if (clicked) {
        const idx = getDifficultyCardIndex(Input.mouse.x, Input.mouse.y);
        if (idx >= 0) this._startWithDifficulty(DIFFICULTIES[idx]);
      }
      return;
    }

    if (this.state === 'paused') {
      if (clicked) {
        if (isResumeClicked(Input.mouse.x, Input.mouse.y)) {
          this.state = this._stateBeforePause;
        } else if (isPauseVolMinusClicked(Input.mouse.x, Input.mouse.y)) {
          Sfx.setVolume(Sfx.getVolume() - 0.2);
        } else if (isPauseVolPlusClicked(Input.mouse.x, Input.mouse.y)) {
          Sfx.setVolume(Sfx.getVolume() + 0.2);
        }
      }
      return;
    }

    if (this.state === 'gameover') {
      if (this.deathShakeTimer > 0) this.deathShakeTimer -= dt;
      if (clicked && isRestartClicked(Input.mouse.x, Input.mouse.y)) {
        this.state      = 'title';
        this.titleReady = false;
        setTimeout(() => { this.titleReady = true; }, 300);
      }
      return;
    }

    // Tick toasts during perk-select, between-wave, and playing
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      this.toasts[i].timer -= dt;
      if (this.toasts[i].timer <= 0) this.toasts.splice(i, 1);
    }

    if (this.state === 'perk-select') {
      this.perkHovered = getPerkCardIndex(Input.mouse.x, Input.mouse.y, this.perkOptions);
      if (clicked) {
        const idx = getPerkCardIndex(Input.mouse.x, Input.mouse.y, this.perkOptions);
        if (idx >= 0) this._selectPerk(idx);
      }
      return;
    }

    if (this.state === 'between-wave') {
      this.betweenTimer -= dt;
      if (this.betweenTimer <= 0) this._startWave(this.wave + 1);
      return;
    }

    // --- playing ---
    this.runTimer += dt;
    if (this.modifierBannerTimer > 0) this.modifierBannerTimer -= dt;

    if (this.hitStop > 0) {
      this.hitStop -= dt;
      // Re-arm any input edges consumed this frame so they fire once the freeze ends
      if (clicked)    this.prevMouseLeft  = false;
      if (rightClick) this.prevMouseRight = false;
      if (spacePress) this.prevSpace      = false;
      return;
    }

    this.player.update(dt);

    if (spacePress) {
      const preDashX = this.player.x, preDashY = this.player.y;
      if (this.player.tryDash() && this.afterimage) this._resolveAfterimage(preDashX, preDashY);
    }
    // Touch melee/fire are held rather than edge-triggered; the attack cooldowns
    // already rate-limit them, so holding repeats at the normal rate.
    if ((clicked || Input.melee) && this.player.tryAttack()) { Sfx.play('swing'); this._resolveSwing(); }
    if ((rightClick || Input.fire) && this.player.tryShoot()) {
      Sfx.play('shoot');
      if (this.doubleTap) {
        this.shotCounter++;
        if (this.shotCounter % 3 === 0) this.player.energy = Math.min(ENERGY_MAX, this.player.energy + PROJ_COST);
      }
      this.projectiles.push(new Projectile(this.player.x, this.player.y, this.player.facing, this.ricochet ? 1 : 0));
    }

    // Combo timer decay
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.comboTimer = 0; }
    }
    if (this.comboFlash > 0) this.comboFlash -= dt;

    // Contact damage — emerging zombies are not yet tangible
    let touchingZombie = null;
    for (const z of this.zombies) {
      if (z.emergeTimer > 0) continue;
      const dx = z.x - this.player.x, dy = z.y - this.player.y;
      const r  = this.player.radius + z.radius;
      if (dx*dx + dy*dy < r*r) { touchingZombie = z; break; }
    }
    if (touchingZombie && !this.player.dashing) {
      this.player.contactTimer += dt;
      if (this.player.contactTimer >= CONTACT_INTERVAL) {
        const contactDmg = Math.max(1, Math.round(touchingZombie.contactDamage * this.difficulty.contactMult));
        this._damagePlayer(contactDmg);
        this.player.contactTimer = 0;
      }
    } else {
      this.player.contactTimer = 0;
    }

    if (this.player.dead) {
      this.deathShakeTimer = 0.4;
      this.state = 'gameover';
      Sfx.stopMusic();
      this._saveRun();
      return;
    }

    // Spawn remaining wave zombies
    if (this.waveSpawned < this.waveTotal) {
      this.spawnTimer += dt;
      const spawnInterval = ZOMBIE_SPAWN_INTERVAL
        * (this.activeModifier?.spawnIntervalMult || 1)
        * this.difficulty.spawnMult;
      if (this.spawnTimer >= spawnInterval) {
        const type = this._isBossWave(this.wave) ? 'boss' : this._pickZombieType();
        const z = new Zombie(type);
        const pos = this._spawnPointAwayFromPlayer(z.radius);
        z.x = pos.x;
        z.y = pos.y;
        this._applyScaling(z);
        this._applyModifier(z);
        this.zombies.push(z);
        this.waveSpawned++;
        this.spawnTimer = 0;
      }
    }

    for (const z of this.zombies) {
      z.update(dt, this.player);
      for (const shot of z.pendingShots) {
        const angle = Math.atan2(shot.ty - shot.y, shot.tx - shot.x);
        this.enemyProjectiles.push(new EnemyProjectile(shot.x, shot.y, angle));
      }
      z.pendingShots.length = 0;
    }

    // Enemy projectiles — update + collide with player
    for (const ep of this.enemyProjectiles) {
      ep.update(dt);
      if (!ep.expired && !this.player.dashing) {
        const dx = ep.x - this.player.x, dy = ep.y - this.player.y;
        const r  = this.player.radius + 5;
        if (dx*dx + dy*dy < r*r) {
          ep._hit = true;
          this._damagePlayer(Math.max(1, Math.round(ENEMY_PROJ_DAMAGE * this.difficulty.contactMult)));
        }
      }
    }
    this.enemyProjectiles = this.enemyProjectiles.filter(ep => !ep.expired);

    // Particles
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter(p => !p.dead);

    // Damage numbers
    for (const dn of this.damageNumbers) dn.timer -= dt;
    this.damageNumbers = this.damageNumbers.filter(dn => dn.timer > 0);
    if (this.shakeTimer > 0) this.shakeTimer -= dt;

    // Update projectiles and resolve piercing hits
    const projDmg = Math.round((PROJ_DAMAGE + this.projDamageBonus) * this._playerDamageMult());
    for (const p of this.projectiles) {
      p.update(dt);
      for (const z of this.zombies) {
        if (p.hitSet.has(z)) continue;
        const dx = z.x - p.x, dy = z.y - p.y;
        const r  = z.radius + 4;
        if (dx*dx + dy*dy < r*r) {
          p.hitSet.add(z);
          if (z.blocksProjectiles && this._shieldBlocks(z, p)) {
            this._spawnDamageNumber(z.x, z.y - z.radius, 'BLOCKED', '#80d8ff');
            Sfx.play('hit');
            continue;
          }
          z.takeDamage(projDmg);
          this.totalDamageDealt += projDmg;
          this._spawnDamageNumber(z.x, z.y - z.radius, String(projDmg), projDmg >= 5 ? '#ffd700' : '#fff');
          if (z.dead) this._onZombieKilled(z, false);
          else Sfx.play('hit');
        }
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.expired);

    const before = this.zombies.length;
    this.zombies = this.zombies.filter(z => !z.dead);
    this.waveDeaths += before - this.zombies.length;

    // Flush zombies spawned during kill resolution (splitter offspring) so the
    // attack that killed the parent can never hit them in the same pass
    if (this._pendingZombies.length > 0) {
      this.zombies.push(...this._pendingZombies);
      this._pendingZombies.length = 0;
    }

    // Pickup tick + collect
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.life -= dt;
      if (pk.life > 0) {
        const dx = pk.x - this.player.x, dy = pk.y - this.player.y;
        if (Math.sqrt(dx*dx + dy*dy) < this.player.radius + 12) {
          if (pk.type === 'energy') this.player.energy = Math.min(ENERGY_MAX, this.player.energy + 40);
          if (pk.type === 'health') this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
          this.pickups.splice(i, 1);
        }
      } else {
        this.pickups.splice(i, 1);
      }
    }

    // Wave clear: all spawned and all dead
    if (this.waveSpawned >= this.waveTotal && this.zombies.length === 0) {
      this._startPerkSelect();
    }
  }

  _loadScores() {
    let scores;
    try { scores = JSON.parse(localStorage.getItem('kzs_scores') || '[]'); }
    catch { scores = []; }
    // One-time migration of the pre-leaderboard high score
    const legacy = parseInt(localStorage.getItem('kzs_highscore'), 10);
    if (legacy > 0) {
      scores.push({ score: legacy, wave: '—', kills: '—', date: 'legacy', diff: 'N' });
      scores.sort((a, b) => b.score - a.score);
      scores.splice(10);
      localStorage.setItem('kzs_scores', JSON.stringify(scores));
      localStorage.removeItem('kzs_highscore');
    }
    return scores;
  }

  _saveRun() {
    const scores = this._loadScores();
    const entry  = {
      score: this.score, wave: this.wave, kills: this.kills,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      diff: this.difficulty.name[0],
      daily: this.isDaily || undefined,
      seed:  this.isDaily ? this._dailySeed : undefined,
    };
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    scores.splice(10);
    localStorage.setItem('kzs_scores', JSON.stringify(scores));
    this._savedScores   = scores;
    this._currentRunIdx = scores.indexOf(entry);
  }

  _addToast(text, color) {
    this.toasts.push({ text, color: color || '#fff', timer: 2.2, maxTimer: 2.2 });
  }

  // Single home for every player-damage source: hp, sfx, number, combo reset, shake, wave tracking
  _damagePlayer(amount) {
    this.player.takeDamage(amount);
    Sfx.play('playerHit');
    this._spawnDamageNumber(this.player.x, this.player.y - this.player.radius, '-' + amount, '#ff4444');
    this.combo      = 0;
    this.comboTimer = 0;
    this.shakeTimer = Math.max(this.shakeTimer, SHAKE_DURATION);
    this.wavePlayerDamage += amount;
  }

  // Single home for every zombie-death effect, keyed off ZOMBIE_TYPES data
  _onZombieKilled(z, isMelee) {
    this._registerKill(z.x, z.y, z.color, z.scoreMult);
    if (isMelee && this.vampiricSwing) this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
    if (z.onDeath === 'explode') this._resolveExploderBlast(z.x, z.y);
    else if (z.onDeath === 'split') this._spawnSplinterlings(z.x, z.y);
  }

  // True when the projectile approached through the zombie's frontal shield arc
  // (matches the ±0.6π arc drawn in zombie.js)
  _shieldBlocks(z, p) {
    const approach = Math.atan2(-p.vy, -p.vx);
    let a = approach - z.facingAngle;
    while (a >  Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return Math.abs(a) <= Math.PI * 0.6;
  }

  _spawnPointAwayFromPlayer(radius) {
    for (let i = 0; i < 25; i++) {
      const pos = Zombie.randomArenaPoint(radius);
      const dx = pos.x - this.player.x, dy = pos.y - this.player.y;
      if (dx*dx + dy*dy >= SPAWN_SAFE_DIST * SPAWN_SAFE_DIST) return pos;
    }
    return Zombie.randomArenaPoint(radius);
  }

  _resolveExploderBlast(x, y) {
    const dx = x - this.player.x, dy = y - this.player.y;
    if (dx*dx + dy*dy < EXPLODER_BLAST_RADIUS * EXPLODER_BLAST_RADIUS && !this.player.dashing) {
      this._damagePlayer(EXPLODER_BLAST_DAMAGE);
    }
    for (let i = 0; i < 24; i++) this.particles.push(new Particle(x, y, '#ff5722'));
    for (let i = 0; i < 8;  i++) this.particles.push(new Particle(x, y, '#ffab40'));
    this.shakeTimer = SHAKE_DURATION * 2.5;
  }

  // Melee base damage shared by swing and afterimage (before per-zombie meleeMult)
  _meleeBaseDamage() {
    const berserkerMult = this.berserkerPerk ? 1 + (1 - this.player.hp / this.player.maxHp) : 1;
    return MELEE_DAMAGE * this.meleeDamageMult * this._playerDamageMult() * berserkerMult;
  }

  _applyMeleeHit(z, base, numberColor) {
    const dmg = Math.round(base * z.meleeMult);
    z.takeDamage(dmg);
    this.totalDamageDealt += dmg;
    this._spawnDamageNumber(z.x, z.y - z.radius, String(dmg), numberColor || (dmg >= 5 ? '#ffd700' : '#fff'));
    if (z.dead) this._onZombieKilled(z, true);
    else Sfx.play('hit');
  }

  _resolveAfterimage(x, y) {
    const base = this._meleeBaseDamage();
    for (const z of this.zombies) {
      const dx = z.x - x, dy = z.y - y;
      const r  = MELEE_RANGE + z.radius;
      if (dx*dx + dy*dy > r*r) continue;
      this._applyMeleeHit(z, base, '#aaaaff');
    }
  }

  _spawnDamageNumber(x, y, label, color) {
    this.damageNumbers.push({ x, y, label, color, timer: 0.7, maxTimer: 0.7 });
  }

  _spawnSplinterlings(x, y) {
    for (let i = 0; i < 2; i++) {
      const angle = i * Math.PI + (Rng.float() - 0.5);
      const z = new Zombie('splinterling');
      z.x = Math.max(z.radius, Math.min(CANVAS_WIDTH  - z.radius, x + Math.cos(angle) * 28));
      z.y = Math.max(z.radius, Math.min(CANVAS_HEIGHT - z.radius, y + Math.sin(angle) * 28));
      this._pendingZombies.push(z);
    }
  }

  _applyScaling(z) {
    if (z.isBoss) {
      const encounter = Math.floor(this.wave / BOSS_WAVE_INTERVAL);
      if (encounter > 1) {
        z.hp = Math.ceil(z.hp * (1 + BOSS_HP_SCALE * (encounter - 1)));
      }
      z.hp    = Math.ceil(z.hp * this.difficulty.hpMult);
      z.maxHp = z.hp;
    } else {
      const scale    = Math.max(0, this.wave - SCALE_START_WAVE);
      const scaledHp = scale > 0 ? z.hp * (1 + HP_SCALE_PER_WAVE * scale) : z.hp;
      z.hp    = Math.ceil(scaledHp * this.difficulty.hpMult);
      z.maxHp = z.hp;
      if (scale > 0) z.speed = z.speed * (1 + SPEED_SCALE_PER_WAVE * scale);
    }
  }

  _startPerkSelect() {
    if (this.wavePlayerDamage === 0 && this.wave > 1) this._addToast('PERFECT WAVE!', '#4caf50');
    Sfx.play('waveClear');
    this.perkOptions = samplePerks(3);
    this.perkHovered = -1;
    this.wavePreview = this._computeWavePreview(this.wave + 1);
    // Pre-roll the next wave's modifier so the between-wave screen can show it honestly
    this.pendingModifier = this._rollModifier(this.wave + 1);
    this.state       = 'perk-select';
  }

  _selectPerk(idx) {
    const perk = this.perkOptions[idx];
    perk.apply(this);
    this.acquiredPerks.push(perk.label);
    Sfx.play('perkPick');
    if (this._isBossWave(this.wave + 1)) Sfx.play('bossWarning');
    this.state        = 'between-wave';
    this.betweenTimer = BETWEEN_WAVE_DURATION;
  }

  _rollModifier(n) {
    if (n < MODIFIER_START_WAVE || this._isBossWave(n)) return null;
    return CHALLENGE_MODIFIERS[Rng.int(CHALLENGE_MODIFIERS.length)];
  }

  _computeWavePreview(n) {
    if (this._isBossWave(n)) {
      return [{ type: 'boss', color: ZOMBIE_TYPES.boss.color, count: 1 }];
    }
    const table       = ZOMBIE_WEIGHTS.find(t => n >= t.minWave);
    const w           = table.weights;
    let   totalWeight = 0;
    for (const k in w) totalWeight += w[k];
    const totalZombies = WAVE_BASE_COUNT + (n - 1) * WAVE_INCREMENT;
    const result = [];
    for (const k in w) {
      if (w[k] === 0) continue;
      const count = Math.round(totalZombies * w[k] / totalWeight);
      if (count > 0) result.push({ type: k, color: ZOMBIE_TYPES[k].color, count });
    }
    return result;
  }

  _isBossWave(n) {
    return n % BOSS_WAVE_INTERVAL === 0;
  }

  // Combo multiplier only — also feeds scoring, so modifiers must not leak in here
  _damageMultiplier() {
    return Math.min(COMBO_MAX_MULT, 1 + Math.floor(this.combo / COMBO_TIER_SIZE) * COMBO_DAMAGE_STEP);
  }

  // Full outgoing-damage multiplier: combo tier × active modifier penalty
  _playerDamageMult() {
    return this._damageMultiplier() * (this.activeModifier?.playerDmgMult || 1);
  }

  _spawnParticles(x, y, color) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  _pickZombieType() {
    const table = ZOMBIE_WEIGHTS.find(t => this.wave >= t.minWave);
    const w = table.weights;
    let total = 0;
    for (const k in w) total += w[k];
    let roll = Rng.float() * total;
    for (const k in w) { roll -= w[k]; if (roll <= 0) return k; }
    return 'normal';
  }

  _registerKill(x, y, color, scoreMult) {
    scoreMult = scoreMult || 1;
    this.kills++;
    this.score += Math.round(BASE_KILL_PTS * this.wave * this._damageMultiplier() * scoreMult);
    Sfx.play('death');
    this._spawnParticles(x, y, color);
    this.shakeTimer = SHAKE_DURATION * 0.5;
    this.hitStop = Math.max(this.hitStop, 0.05);
    const prevTier = Math.floor(this.combo / COMBO_TIER_SIZE);
    this.combo++;
    this.comboTimer = COMBO_WINDOW + this.comboWindowBonus;
    if (Math.floor(this.combo / COMBO_TIER_SIZE) > prevTier) {
      this.comboFlash = COMBO_FLASH_DUR;
    }
    if (this.combo > this.highestCombo) this.highestCombo = this.combo;
    // Drop pickups
    const dropRoll = Rng.float();
    if (dropRoll < 0.08) this.pickups.push({ x, y, type: 'energy', life: 6 });
    else if (dropRoll < 0.12) this.pickups.push({ x, y, type: 'health', life: 6 });
    if (this.luckyStrike) {
      this.luckyStrikeCounter++;
      if (this.luckyStrikeCounter % 5 === 0) this.pickups.push({ x, y, type: 'health', life: 8 });
    }
    // Combo milestone toasts
    const milestones = [10, 25, 50, 100];
    for (const m of milestones) {
      if (this.combo >= m && !this._comboMilestones.has(m)) {
        this._comboMilestones.add(m);
        this._addToast(m + '-KILL COMBO!', '#ff69b4');
      }
    }
  }

  _startWave(n) {
    this.wave             = n;
    this.wavePlayerDamage = 0;
    this.waveTotal = this._isBossWave(n) ? 1 : WAVE_BASE_COUNT + (n - 1) * WAVE_INCREMENT;
    Sfx.setTempo(115 + (n - 1) * 3);
    if (this._isBossWave(n)) this._addToast('BOSS INCOMING!', '#e53935');

    // Use the modifier pre-rolled at perk-select (shown on the between-wave screen);
    // roll fresh only if the wave starts without passing through perk-select
    this.activeModifier  = this.pendingModifier !== undefined ? this.pendingModifier : this._rollModifier(n);
    this.pendingModifier = undefined;
    this.modifierBannerTimer = this.activeModifier ? MODIFIER_BANNER_DUR : 0;
    if (this.activeModifier?.countMult) {
      this.waveTotal = Math.ceil(this.waveTotal * this.activeModifier.countMult);
    }

    this.waveSpawned = 0;
    this.waveDeaths  = 0;
    this.spawnTimer  = 0;
    if (!this.activeModifier?.noHeal) {
      this.player.hp = this.player.maxHp;
    }
    this.state = 'playing';
  }

  _applyModifier(z) {
    if (!this.activeModifier || z.isBoss) return;
    if (this.activeModifier.zombieSpeedMult) z.speed *= this.activeModifier.zombieSpeedMult;
    if (this.activeModifier.zombieHpMult) {
      z.hp    = Math.ceil(z.hp * this.activeModifier.zombieHpMult);
      z.maxHp = z.hp;
    }
  }

  _resolveSwing() {
    const p    = this.player;
    const arc  = MELEE_ARC + p.arcBonus;
    const base = this._meleeBaseDamage();
    for (const z of this.zombies) {
      const dx = z.x - p.x, dy = z.y - p.y;
      const r  = MELEE_RANGE + z.radius;
      if (dx*dx + dy*dy > r*r) continue;
      let a = Math.atan2(dy, dx) - p.facing;
      while (a >  Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      if (Math.abs(a) <= arc / 2) this._applyMeleeHit(z, base);
    }
  }

  draw(ctx) {
    if (this.state === 'title') {
      drawTitle(ctx);
      return;
    }
    if (this.state === 'leaderboard') {
      drawLeaderboard(ctx, this._loadScores());
      return;
    }
    if (this.state === 'difficulty') {
      drawDifficulty(ctx);
      return;
    }

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const now       = Date.now();
    const bossAlive = this.zombies.some(z => z.isBoss);

    // Death shake (wraps everything including gameover overlay)
    const doDeathShake = this.deathShakeTimer > 0;
    if (doDeathShake) {
      const s = SHAKE_STRENGTH * 3 * (this.deathShakeTimer / 0.4);
      ctx.save();
      ctx.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
    }

    drawArenaFloor(ctx);

    // Low-HP vignette (pulsing red border when hp ≤ 3) — gradient built once, pulse via alpha
    if (this.player && this.player.hp <= 3 && this.state !== 'gameover') {
      if (!this._vignetteGrad) {
        const grad = ctx.createRadialGradient(
          CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.2,
          CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.75
        );
        grad.addColorStop(0, 'rgba(180,0,0,0)');
        grad.addColorStop(1, 'rgba(180,0,0,1)');
        this._vignetteGrad = grad;
      }
      const pulse = 0.5 + 0.5 * Math.sin(now / 350);
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.2 * pulse;
      ctx.fillStyle = this._vignetteGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.restore();
    }

    // Playing shake
    const doPlayShake = this.shakeTimer > 0 && this.state === 'playing';
    if (doPlayShake) {
      const strength = SHAKE_STRENGTH * (this.shakeTimer / SHAKE_DURATION);
      ctx.save();
      ctx.translate(
        (Math.random() * 2 - 1) * strength,
        (Math.random() * 2 - 1) * strength
      );
    }

    for (const z of this.zombies) z.draw(ctx);
    for (const p of this.projectiles) p.draw(ctx);
    for (const ep of this.enemyProjectiles) ep.draw(ctx);
    for (const pt of this.particles) pt.draw(ctx);

    // Pickups
    for (const pk of this.pickups) {
      const pulse = 0.6 + 0.4 * Math.sin(now / 200 + pk.x);
      const fade  = Math.min(1, pk.life * 0.8); // dims over the last ~1.25s
      const key   = pk.type === 'energy' ? 'pickup_energy' : 'pickup_health';
      ctx.save();
      ctx.globalAlpha = fade * pulse;
      if (Assets.ready(key)) {
        // Outline is baked into the icon, so no stroke here
        drawIcon(ctx, key, pk.x, pk.y, PICKUP_DRAW_SIZE);
      } else {
        ctx.beginPath();
        ctx.arc(pk.x, pk.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = pk.type === 'energy' ? '#29b6f6' : '#ff69b4';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Floating damage numbers
    for (const dn of this.damageNumbers) {
      const t     = 1 - dn.timer / dn.maxTimer;
      const alpha = dn.timer / dn.maxTimer;
      const yOff  = t * 35;
      const val   = Math.abs(parseInt(dn.label) || 1);
      const size  = Math.min(24, 12 + val * 1.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = dn.color;
      ctx.font        = `bold ${size}px sans-serif`;
      ctx.textAlign   = 'center';
      ctx.fillText(dn.label, dn.x, dn.y - yOff);
      ctx.restore();
    }

    // Combo aura ring around player
    if (this.combo >= COMBO_TIER_SIZE) {
      const tier   = Math.min(Math.floor(this.combo / COMBO_TIER_SIZE), 3);
      const colors = ['#00e5ff', '#ffd700', '#ff6d00'];
      const pulse  = 0.6 + 0.4 * Math.sin(now / 200);
      ctx.save();
      ctx.globalAlpha  = pulse * 0.55;
      ctx.strokeStyle  = colors[tier - 1];
      ctx.lineWidth    = 3;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    this.player.draw(ctx);

    // Boss wave atmosphere tint
    if (bossAlive) {
      ctx.save();
      ctx.fillStyle = 'rgba(80,0,0,0.12)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.restore();
    }

    if (doPlayShake) ctx.restore();

    if (this.state === 'gameover') {
      const summary = {
        score: this.score, kills: this.kills, wave: this.wave,
        runTime: this.runTimer, totalDamage: this.totalDamageDealt,
        highestCombo: this.highestCombo, acquiredPerks: this.acquiredPerks,
      };
      drawGameOver(ctx, summary, this._savedScores, this._currentRunIdx);
    } else {
      const zombiesLeft = bossAlive
        ? 'BOSS ALIVE'
        : this.zombies.length + (this.waveTotal - this.waveSpawned);
      drawHUD(ctx, this.player.hp, this.player.maxHp, this.player.energy, this.score, this.kills, this.wave, this.combo, this.comboFlash, zombiesLeft, Sfx.muted, this.isDaily);
      drawZombieIndicators(ctx, this.zombies);
      if (this.state === 'playing') drawTouchControls(ctx);
      if (this.modifierBannerTimer > 0) {
        drawModifierBanner(ctx, this.activeModifier, this.modifierBannerTimer);
      }
      if (this.state === 'between-wave') {
        drawBetweenWave(ctx, this.wave, this.betweenTimer, this._isBossWave(this.wave + 1), this.wavePreview, this.pendingModifier);
      } else if (this.state === 'perk-select') {
        drawPerkSelect(ctx, this.perkOptions, this.perkHovered);
      } else if (this.state === 'paused') {
        drawPaused(ctx, this.acquiredPerks);
      }
      drawToasts(ctx, this.toasts);
    }

    if (doDeathShake) ctx.restore();
  }
}
