class Projectile {
  constructor(x, y, angle) {
    this.x    = x;
    this.y    = y;
    this.vx   = Math.cos(angle);
    this.vy   = Math.sin(angle);
    this.dist = 0;
    this.hitSet = new Set(); // zombie references already hit by this projectile
  }

  get expired() {
    return this.dist >= PROJ_RANGE
      || this.x < 0 || this.x > CANVAS_WIDTH
      || this.y < 0 || this.y > CANVAS_HEIGHT;
  }

  update(dt) {
    const step = PROJ_SPEED * dt;
    this.x    += this.vx * step;
    this.y    += this.vy * step;
    this.dist += step;
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
