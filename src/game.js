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
        }
        return;
      }
      if (this.state === 'title' && this.titleReady) this._startGame();
    };
    window.addEventListener('keydown', this._titleKeyHandler);
  }

  _startGame() {
    this._init();
  }

  _init() {
    this.player         = new Player();
    this.zombies        = [];
    this.projectiles    = [];
    this.kills          = 0;
    this.score          = 0;
    this.particles      = [];
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
    // Perk select state
    this.perkOptions   = [];
    this.perkHovered   = -1;
    this.acquiredPerks = [];
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

    if (this.state === 'title') {
      // Allow click-to-start after first frame
      this.titleReady = true;
      if (clicked) this._startGame();
      return;
    }

    if (this.state === 'paused') {
      if (clicked && isResumeClicked(Input.mouse.x, Input.mouse.y)) {
        this.state = this._stateBeforePause;
      }
      return;
    }

    if (this.state === 'gameover') {
      if (clicked && isRestartClicked(Input.mouse.x, Input.mouse.y)) {
        this.state      = 'title';
        this.titleReady = false;
        // brief delay before accepting input so the click doesn't instantly start
        setTimeout(() => { this.titleReady = true; }, 300);
      }
      return;
    }

    if (this.state === 'perk-select') {
      this.perkHovered = getPerkCardIndex(Input.mouse.x, Input.mouse.y, this.perkOptions);
      if (clicked) {
        const idx = getPerkCardIndex(Input.mouse.x, Input.mouse.y, this.perkOptions);
        if (idx >= 0) {
          const perk = this.perkOptions[idx];
          perk.apply(this);
          this.acquiredPerks.push(perk.label);
          this.state        = 'between-wave';
          this.betweenTimer = BETWEEN_WAVE_DURATION;
        }
      }
      return;
    }

    if (this.state === 'between-wave') {
      this.betweenTimer -= dt;
      if (this.betweenTimer <= 0) this._startWave(this.wave + 1);
      return;
    }

    // --- playing ---
    this.player.update(dt);

    if (spacePress) this.player.tryDash();
    if (clicked    && this.player.tryAttack()) this._resolveSwing();
    if (rightClick && this.player.tryShoot()) {
      this.projectiles.push(new Projectile(this.player.x, this.player.y, this.player.facing));
    }

    // Combo timer decay
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.comboTimer = 0; }
    }
    if (this.comboFlash > 0) this.comboFlash -= dt;

    // Contact damage
    let touchingZombie = null;
    for (const z of this.zombies) {
      const dx = z.x - this.player.x, dy = z.y - this.player.y;
      if (Math.sqrt(dx*dx + dy*dy) < this.player.radius + z.radius) { touchingZombie = z; break; }
    }
    if (touchingZombie && !this.player.dashing) {
      this.player.contactTimer += dt;
      if (this.player.contactTimer >= CONTACT_INTERVAL) {
        this.player.takeDamage(touchingZombie.contactDamage);
        this.player.contactTimer = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.shakeTimer = SHAKE_DURATION;
      }
    } else {
      this.player.contactTimer = 0;
    }

    if (this.player.dead) {
      this.state = 'gameover';
      const prev = parseInt(localStorage.getItem('kzs_highscore') || '0', 10);
      if (this.score > prev) localStorage.setItem('kzs_highscore', this.score);
      return;
    }

    // Spawn remaining wave zombies
    if (this.waveSpawned < this.waveTotal) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= ZOMBIE_SPAWN_INTERVAL) {
        const type = this._isBossWave(this.wave) ? 'boss' : this._pickZombieType();
        const z = new Zombie(type);
        this._applyScaling(z);
        this.zombies.push(z);
        this.waveSpawned++;
        this.spawnTimer = 0;
      }
    }

    for (const z of this.zombies) z.update(dt, this.player);

    // Particles
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter(p => !p.dead);
    if (this.shakeTimer > 0) this.shakeTimer -= dt;

    // Update projectiles and resolve piercing hits
    const projDmg = Math.round((PROJ_DAMAGE + this.projDamageBonus) * this._damageMultiplier());
    for (const p of this.projectiles) {
      p.update(dt);
      for (const z of this.zombies) {
        if (p.hitSet.has(z)) continue;
        const dx = z.x - p.x, dy = z.y - p.y;
        if (Math.sqrt(dx*dx + dy*dy) < z.radius + 4) {
          p.hitSet.add(z);
          z.takeDamage(projDmg);
          if (z.dead) this._registerKill(z.x, z.y, z.color, z.scoreMult);
        }
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.expired);

    const before = this.zombies.length;
    this.zombies = this.zombies.filter(z => !z.dead);
    this.waveDeaths += before - this.zombies.length;

    // Wave clear: all spawned and all dead
    if (this.waveSpawned >= this.waveTotal && this.zombies.length === 0) {
      this._startPerkSelect();
    }
  }

  _applyScaling(z) {
    if (z.isBoss) {
      const encounter = Math.floor(this.wave / BOSS_WAVE_INTERVAL);
      if (encounter > 1) {
        z.hp    = Math.ceil(z.hp * (1 + BOSS_HP_SCALE * (encounter - 1)));
        z.maxHp = z.hp;
      }
    } else {
      const scale = Math.max(0, this.wave - SCALE_START_WAVE);
      if (scale > 0) {
        z.hp    = Math.ceil(z.hp    * (1 + HP_SCALE_PER_WAVE    * scale));
        z.maxHp = z.hp;
        z.speed = z.speed * (1 + SPEED_SCALE_PER_WAVE * scale);
      }
    }
  }

  _startPerkSelect() {
    this.perkOptions = samplePerks(3);
    this.perkHovered = -1;
    this.state       = 'perk-select';
  }

  _isBossWave(n) {
    return n % BOSS_WAVE_INTERVAL === 0;
  }

  _damageMultiplier() {
    return Math.min(COMBO_MAX_MULT, 1 + Math.floor(this.combo / COMBO_TIER_SIZE) * COMBO_DAMAGE_STEP);
  }

  _spawnParticles(x, y, color) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  _pickZombieType() {
    const table = ZOMBIE_WEIGHTS.find(t => this.wave >= t.minWave);
    const w = table.weights;
    const total = w.normal + w.fast + w.tank;
    const roll  = Math.random() * total;
    if (roll < w.normal) return 'normal';
    if (roll < w.normal + w.fast) return 'fast';
    return 'tank';
  }

  _registerKill(x, y, color, scoreMult) {
    scoreMult = scoreMult || 1;
    this.kills++;
    this.score += Math.round(BASE_KILL_PTS * this.wave * this._damageMultiplier() * scoreMult);
    this._spawnParticles(x, y, color);
    this.shakeTimer = SHAKE_DURATION * 0.5;
    const prevTier = Math.floor(this.combo / COMBO_TIER_SIZE);
    this.combo++;
    this.comboTimer = COMBO_WINDOW + this.comboWindowBonus;
    if (Math.floor(this.combo / COMBO_TIER_SIZE) > prevTier) {
      this.comboFlash = COMBO_FLASH_DUR;
    }
  }

  _startWave(n) {
    this.wave        = n;
    this.waveTotal   = this._isBossWave(n) ? 1 : WAVE_BASE_COUNT + (n - 1) * WAVE_INCREMENT;
    this.waveSpawned = 0;
    this.waveDeaths  = 0;
    this.spawnTimer  = 0;
    this.player.hp   = this.player.maxHp; // full heal
    this.state       = 'playing';
  }

  _resolveSwing() {
    const p   = this.player;
    const arc = MELEE_ARC + p.arcBonus;
    const dmg = Math.round(MELEE_DAMAGE * this.meleeDamageMult * this._damageMultiplier());
    for (const z of this.zombies) {
      const dx = z.x - p.x, dy = z.y - p.y;
      if (Math.sqrt(dx*dx + dy*dy) > MELEE_RANGE + z.radius) continue;
      let a = Math.atan2(dy, dx) - p.facing;
      while (a >  Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      if (Math.abs(a) <= arc / 2) {
        z.takeDamage(dmg);
        if (z.dead) this._registerKill(z.x, z.y, z.color, z.scoreMult);
      }
    }
  }

  draw(ctx) {
    if (this.state === 'title') {
      drawTitle(ctx);
      return;
    }

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawArenaFloor(ctx);

    // Screen shake
    if (this.shakeTimer > 0) {
      const strength = SHAKE_STRENGTH * (this.shakeTimer / SHAKE_DURATION);
      ctx.save();
      ctx.translate(
        (Math.random() * 2 - 1) * strength,
        (Math.random() * 2 - 1) * strength
      );
    }

    for (const z of this.zombies) z.draw(ctx);
    for (const p of this.projectiles) p.draw(ctx);
    for (const pt of this.particles) pt.draw(ctx);
    this.player.draw(ctx);

    if (this.shakeTimer > 0) ctx.restore();

    if (this.state === 'gameover') {
      const hi = parseInt(localStorage.getItem('kzs_highscore') || '0', 10);
      drawGameOver(ctx, this.score, this.kills, this.wave, hi);
    } else {
      const zombiesLeft = this._isBossWave(this.wave) && this.zombies.some(z => z.isBoss)
        ? 'BOSS ALIVE'
        : this.zombies.length + (this.waveTotal - this.waveSpawned);
      drawHUD(ctx, this.player.hp, this.player.maxHp, this.player.energy, this.score, this.kills, this.wave, this.combo, this.comboFlash, zombiesLeft);
      if (this.state === 'between-wave') {
        drawBetweenWave(ctx, this.wave, this.betweenTimer, this._isBossWave(this.wave + 1));
      } else if (this.state === 'perk-select') {
        drawPerkSelect(ctx, this.perkOptions, this.perkHovered);
      } else if (this.state === 'paused') {
        drawPaused(ctx, this.acquiredPerks);
      }
    }
  }
}
