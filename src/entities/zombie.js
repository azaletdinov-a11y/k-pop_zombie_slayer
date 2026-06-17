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
    this.hitFlash      = 0;
    this.emergeTimer   = EMERGE_DURATION;
    const pos = Zombie.randomEdgePoint(this.radius);
    this.x = pos.x;
    this.y = pos.y;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.1;
  }

  get dead()   { return this.hp <= 0; }
  get isBoss() { return this.type === 'boss'; }

  static randomEdgePoint(radius) {
    const margin = (radius || ZOMBIE_RADIUS) + 1;
    const edge   = Math.floor(Math.random() * 4);
    switch (edge) {
      case 0: return { x: Math.random() * CANVAS_WIDTH,  y: -margin };
      case 1: return { x: CANVAS_WIDTH  + margin,        y: Math.random() * CANVAS_HEIGHT };
      case 2: return { x: Math.random() * CANVAS_WIDTH,  y: CANVAS_HEIGHT + margin };
      default: return { x: -margin,                      y: Math.random() * CANVAS_HEIGHT };
    }
  }

  update(dt, target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
    if (this.emergeTimer > 0) this.emergeTimer -= dt;
    if (this.hitFlash    > 0) this.hitFlash    -= dt;
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

    if (this.isBoss) {
      // Body
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#8b0000';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Crown — 3 gold spikes above body
      const crownBaseY = this.y - this.radius - 2;
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

      // Eyes (red, larger)
      const eyeOff = this.radius * 0.3;
      ctx.fillStyle = '#ff5555';
      ctx.beginPath();
      ctx.arc(this.x - eyeOff, this.y - eyeOff * 0.5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.x + eyeOff, this.y - eyeOff * 0.5, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
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

      // Eyes — scale with radius
      const eyeOff  = this.radius * 0.3;
      const eyeSize = this.type === 'fast' ? 2 : 3;
      const eyeColor = this.type === 'fast' ? '#5a6e00' : '#1b5e20';
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(this.x - eyeOff, this.y - eyeOff * 0.8, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.x + eyeOff, this.y - eyeOff * 0.8, eyeSize, 0, Math.PI * 2);
      ctx.fill();
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
