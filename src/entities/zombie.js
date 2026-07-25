class Zombie {
  constructor(type) {
    type          = type || 'normal';
    this.type     = type;
    const stats   = ZOMBIE_TYPES[type];
    this.radius   = stats.radius;
    this.speed    = stats.speed;
    this.hp       = stats.hp;
    this.color    = stats.color;
    this.maxHp         = stats.hp;
    this.scoreMult     = stats.scoreMult;
    this.contactDamage = stats.contactDamage || CONTACT_DAMAGE;
    this.onDeath           = stats.onDeath || null;
    this.blocksProjectiles = !!stats.blocksProjectiles;
    this.meleeMult         = stats.meleeMult || 1;
    this.hitFlash      = 0;
    this.hpBarTimer    = 0;
    this.facingAngle   = 0;
    this.emergeTimer   = EMERGE_DURATION;
    this.shootTimer    = 0;
    this.pendingShots  = [];
    const pos = Zombie.randomArenaPoint(this.radius);
    this.x = pos.x;
    this.y = pos.y;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash   = 0.1;
    this.hpBarTimer = 1.5;
  }

  get dead()   { return this.hp <= 0; }
  get isBoss() { return this.type === 'boss'; }

  static randomArenaPoint(radius) {
    const margin = (radius || ZOMBIE_RADIUS) + 1;
    return {
      x: margin + Math.random() * (CANVAS_WIDTH  - margin * 2),
      y: margin + Math.random() * (CANVAS_HEIGHT - margin * 2),
    };
  }

  update(dt, target) {
    const dx   = target.x - this.x;
    const dy   = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (this.type === 'ranged') {
      if (dist > 0) this.facingAngle = Math.atan2(dy, dx);
      // Move toward player only beyond stop distance
      if (dist > RANGED_STOP_DIST && dist > 0) {
        this.x += (dx / dist) * this.speed * dt;
        this.y += (dy / dist) * this.speed * dt;
      }
      // Shoot on interval
      this.shootTimer += dt;
      if (this.shootTimer >= RANGED_SHOOT_INTERVAL && dist > 0) {
        this.shootTimer = 0;
        this.pendingShots.push({ x: this.x, y: this.y, tx: target.x, ty: target.y });
      }
    } else {
      if (dist > 0) {
        this.facingAngle = Math.atan2(dy, dx);
        this.x += (dx / dist) * this.speed * dt;
        this.y += (dy / dist) * this.speed * dt;
      }
    }

    if (this.emergeTimer > 0) this.emergeTimer -= dt;
    if (this.hitFlash    > 0) this.hitFlash    -= dt;
    if (this.hpBarTimer  > 0) this.hpBarTimer  -= dt;
  }

  _drawEyes(ctx, size, color, yFactor = 0.8) {
    const eyeOff = this.radius * 0.3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x - eyeOff, this.y - eyeOff * yFactor, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x + eyeOff, this.y - eyeOff * yFactor, size, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx) {
    const emerging  = this.emergeTimer > 0;
    const progress  = emerging ? 1 - this.emergeTimer / EMERGE_DURATION : 1; // 0→1
    const scale     = emerging ? 0.25 + 0.75 * progress : 1;

    if (emerging) {
      // Portal ring — shrinks and fades as zombie rises
      const portalR = this.radius * 1.5 * (1 - progress * 0.6);
      ctx.save();
      ctx.globalAlpha = (1 - progress) * 0.7;
      ctx.beginPath();
      ctx.arc(this.x, this.y, portalR, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.strokeStyle = this.isBoss ? '#8b0000' : '#222';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = progress;
      ctx.translate(this.x, this.y);
      ctx.scale(scale, scale);
      ctx.translate(-this.x, -this.y);
    }

    const hasSprite = Assets.ready('zombie_' + this.type);
    if (hasSprite) {
      drawSprite(ctx, 'zombie_' + this.type, this.x, this.y,
        this.radius * 2 * SPRITE_DRAW_SCALE, this.facingAngle);
    }

    if (this.isBoss) {
      const crownBaseY = this.y - this.radius - 2;
      if (!hasSprite) {
        // Body
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#8b0000';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Crown — 3 gold spikes above body
        const spikes = [
          { cx: this.x - 20, h: 14 },
          { cx: this.x,      h: 22 },
          { cx: this.x + 20, h: 14 },
        ];
        ctx.fillStyle = '#ffd700';
        for (const s of spikes) {
          ctx.beginPath();
          ctx.moveTo(s.cx - 10, crownBaseY);
          ctx.lineTo(s.cx + 10, crownBaseY);
          ctx.lineTo(s.cx, crownBaseY - s.h);
          ctx.closePath();
          ctx.fill();
        }
      }

      // HP bar above crown
      const hpBarW = this.radius * 2.2;
      const hpBarH = 6;
      const hpBarX = this.x - hpBarW / 2;
      const hpBarY = crownBaseY - 28;
      const hpFill = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = '#3a0000';
      ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
      ctx.fillStyle = '#e53935';
      ctx.fillRect(hpBarX, hpBarY, Math.round(hpBarW * hpFill), hpBarH);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

      // BOSS label
      ctx.fillStyle = '#e53935';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BOSS', this.x, hpBarY - 3);

      if (!hasSprite) this._drawEyes(ctx, 5, '#ff5555', 0.5);
    } else if (this.type === 'exploder') {
      if (!hasSprite) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff5722';
        ctx.fill();
        const r = this.radius * 0.4;
        ctx.strokeStyle = '#7f2800';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - r, this.y - r); ctx.lineTo(this.x + r, this.y + r);
        ctx.moveTo(this.x + r, this.y - r); ctx.lineTo(this.x - r, this.y + r);
        ctx.stroke();
      }
      // Pulsing warning ring — reads as "about to blow" even over the sprite
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(Date.now() / 180));
      ctx.save();
      ctx.globalAlpha = pulse * 0.7;
      ctx.strokeStyle = '#ffab40';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (this.type === 'shield') {
      if (!hasSprite) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#455a64';
        ctx.fill();
        ctx.strokeStyle = '#37474f';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // Block-arc indicator — gameplay-critical (shows the protected front arc)
      const fa = this.facingAngle;
      ctx.save();
      ctx.strokeStyle = '#80d8ff';
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 5, fa - Math.PI * 0.6, fa + Math.PI * 0.6);
      ctx.stroke();
      ctx.restore();
      if (!hasSprite) this._drawEyes(ctx, 3, '#1a237e');
    } else if (this.type === 'splitter') {
      if (!hasSprite) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ce93d8';
        ctx.fill();
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(this.x + this.radius * 0.5, this.y - this.radius * 0.3, this.radius * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = '#ba68c8';
        ctx.fill();
        ctx.restore();
        this._drawEyes(ctx, 2.5, '#4a148c');
      }
    } else if (this.type === 'ranged') {
      if (!hasSprite) {
        // Body
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff6d00';
        ctx.fill();
        // Outer ring (signals ranged type)
        ctx.strokeStyle = '#ffab40';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
        this._drawEyes(ctx, 2.5, '#7f3300');
      }
    } else if (!hasSprite) {
      // Body
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();

      // Tank gets a thick border
      if (this.type === 'tank') {
        ctx.strokeStyle = '#000';
        ctx.lineWidth   = 3;
        ctx.stroke();
      }

      // Eyes — small types get smaller, darker-lime eyes
      const small = this.type === 'fast' || this.type === 'splinterling';
      this._drawEyes(ctx, small ? 2 : 3, small ? '#5a6e00' : '#1b5e20');
    }

    // HP bar for non-boss zombies when damaged
    if (!this.isBoss && this.hp < this.maxHp && this.hpBarTimer > 0) {
      const barW   = 40;
      const barH   = 3;
      const barX   = this.x - barW / 2;
      const barY   = this.y - this.radius - 7;
      const fill   = Math.max(0, this.hp / this.maxHp);
      const alpha  = Math.min(1, this.hpBarTimer * 2);
      const hue    = Math.round(fill * 120);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = 'hsl(' + hue + ',90%,45%)';
      ctx.fillRect(barX, barY, Math.round(barW * fill), barH);
      ctx.restore();
    }

    // Hit flash overlay (all types)
    if (this.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.hitFlash / 0.1 * 0.6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.restore();
    }

    if (emerging) ctx.restore(); // close emergence scale/alpha transform
  }
}
