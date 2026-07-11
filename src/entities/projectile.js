class Projectile {
  constructor(x, y, angle, bounces = 0) {
    this.x    = x;
    this.y    = y;
    this.vx   = Math.cos(angle);
    this.vy   = Math.sin(angle);
    this.dist = 0;
    this.bouncesLeft = bounces;
    this.hitSet = new Set();
  }

  get expired() {
    if (this.dist >= PROJ_RANGE) return true;
    if (this.bouncesLeft === 0) return this.x < 0 || this.x > CANVAS_WIDTH || this.y < 0 || this.y > CANVAS_HEIGHT;
    return false;
  }

  update(dt) {
    const step = PROJ_SPEED * dt;
    this.x    += this.vx * step;
    this.y    += this.vy * step;
    this.dist += step;

    if (this.bouncesLeft > 0) {
      let bounced = false;
      if      (this.x < 2)                { this.x = 2;                  this.vx =  Math.abs(this.vx); bounced = true; }
      else if (this.x > CANVAS_WIDTH - 2) { this.x = CANVAS_WIDTH - 2;  this.vx = -Math.abs(this.vx); bounced = true; }
      if      (this.y < 2)                { this.y = 2;                  this.vy =  Math.abs(this.vy); bounced = true; }
      else if (this.y > CANVAS_HEIGHT - 2){ this.y = CANVAS_HEIGHT - 2; this.vy = -Math.abs(this.vy); bounced = true; }
      if (bounced) { this.bouncesLeft--; this.dist = 0; this.hitSet.clear(); }
    }
  }

  draw(ctx) {
    const fade  = 1 - this.dist / PROJ_RANGE;
    const len   = 18;
    const tailX = this.x - this.vx * len;
    const tailY = this.y - this.vy * len;

    ctx.save();
    ctx.globalAlpha = 0.3 + fade * 0.7;
    ctx.strokeStyle = '#e0f7ff';
    ctx.lineWidth   = 4;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    // Bright tip
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
  }
}
