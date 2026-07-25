class Player {
  constructor() {
    this.x           = CANVAS_WIDTH  / 2;
    this.y           = CANVAS_HEIGHT / 2;
    this.radius      = PLAYER_RADIUS;
    this.facing        = 0;
    this.cooldown      = 0;
    this.swingTimer    = 0;
    this.hp            = PLAYER_MAX_HP;
    this.maxHp         = PLAYER_MAX_HP;
    this.contactTimer  = 0;
    this.energy        = ENERGY_MAX;
    this.projCooldown  = 0;
    this.hitFlash      = 0;
    // Perk modifiers
    this.speedMult        = 1;
    this.arcBonus         = 0;
    this.energyRegenBonus = 0;
    this.projCooldownMult = 1;
    // Dash
    this.dashTimer    = 0;
    this.dashCooldown = 0;
    this.dashVx       = 0;
    this.dashVy       = 0;
  }

  get dead()    { return this.hp <= 0; }
  get dashing() { return this.dashTimer > 0; }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.15;
  }

  update(dt) {
    // Facing follows mouse cursor
    const mx = Input.mouse.x - this.x;
    const my = Input.mouse.y - this.y;
    if (mx !== 0 || my !== 0) {
      this.facing = Math.atan2(my, mx);
    }

    // WASD movement / dash
    const k = Input.keys;
    let dx = 0, dy = 0;
    if (k.a) dx -= 1;
    if (k.d) dx += 1;
    if (k.w) dy -= 1;
    if (k.s) dy += 1;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      const speed = DASH_DISTANCE / DASH_DURATION;
      this.x += this.dashVx * speed * dt;
      this.y += this.dashVy * speed * dt;
    } else {
      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
      }
      this.x += dx * PLAYER_SPEED * this.speedMult * dt;
      this.y += dy * PLAYER_SPEED * this.speedMult * dt;
    }
    this.x = Math.max(this.radius, Math.min(CANVAS_WIDTH  - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(CANVAS_HEIGHT - this.radius, this.y));

    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.cooldown     > 0) this.cooldown     -= dt;
    if (this.swingTimer   > 0) this.swingTimer   -= dt;
    if (this.projCooldown > 0) this.projCooldown -= dt;
    if (this.hitFlash     > 0) this.hitFlash     -= dt;

    // Energy regen
    this.energy = Math.min(ENERGY_MAX, this.energy + (ENERGY_REGEN + this.energyRegenBonus) * dt);
  }

  tryDash() {
    if (this.dashCooldown > 0) return false;
    const k = Input.keys;
    let dx = 0, dy = 0;
    if (k.a) dx -= 1;
    if (k.d) dx += 1;
    if (k.w) dy -= 1;
    if (k.s) dy += 1;
    if (dx === 0 && dy === 0) {
      this.dashVx = Math.cos(this.facing);
      this.dashVy = Math.sin(this.facing);
    } else {
      const len = Math.sqrt(dx * dx + dy * dy);
      this.dashVx = dx / len;
      this.dashVy = dy / len;
    }
    this.dashTimer    = DASH_DURATION;
    this.dashCooldown = DASH_COOLDOWN;
    return true;
  }

  tryAttack() {
    if (this.cooldown > 0) return false;
    this.cooldown   = MELEE_COOLDOWN;
    this.swingTimer = MELEE_FLASH;
    return true;
  }

  tryShoot() {
    if (this.projCooldown > 0 || this.energy < PROJ_COST) return false;
    this.energy       -= PROJ_COST;
    this.projCooldown  = PROJ_COOLDOWN * this.projCooldownMult;
    return true;
  }

  draw(ctx) {
    // Dash trail
    if (this.dashing) {
      ctx.save();
      ctx.globalAlpha = (this.dashTimer / DASH_DURATION) * 0.45;
      ctx.beginPath();
      ctx.arc(
        this.x - this.dashVx * this.radius * 1.8,
        this.y - this.dashVy * this.radius * 1.8,
        this.radius, 0, Math.PI * 2
      );
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.restore();
    }

    // Dash cooldown ring
    if (this.dashCooldown > 0 && !this.dashing) {
      const progress = 1 - this.dashCooldown / DASH_COOLDOWN;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#aaaaff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 5,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.stroke();
      ctx.restore();
    }

    // Swing arc flash
    if (this.swingTimer > 0) {
      const alpha = this.swingTimer / MELEE_FLASH;
      ctx.save();
      ctx.globalAlpha = alpha * 0.55;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      const arc = MELEE_ARC + this.arcBonus;
      ctx.arc(this.x, this.y, MELEE_RANGE,
        this.facing - arc / 2,
        this.facing + arc / 2);
      ctx.closePath();
      ctx.fillStyle = '#fff0f5';
      ctx.fill();
      ctx.restore();
    }

    // Body
    const hasSprite = Assets.ready('player_sprite');
    if (hasSprite) {
      drawSprite(ctx, 'player_sprite', this.x, this.y,
        this.radius * 2 * SPRITE_DRAW_SCALE, this.facing);
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = PLAYER_COLOR;
      ctx.fill();
    }

    // Hit flash overlay
    if (this.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = (this.hitFlash / 0.15) * 0.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ff3c3c';
      ctx.fill();
      ctx.restore();
    }

    if (!hasSprite) {
      // Direction nub
      const nubX = this.x + Math.cos(this.facing) * this.radius * 0.6;
      const nubY = this.y + Math.sin(this.facing) * this.radius * 0.6;
      ctx.beginPath();
      ctx.arc(nubX, nubY, this.radius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Hero', this.x, this.y - this.radius - 6);
    }
  }
}
