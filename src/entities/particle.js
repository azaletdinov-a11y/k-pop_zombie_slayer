class Particle {
  constructor(x, y, color) {
    this.x     = x;
    this.y     = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 80;
    this.vx    = Math.cos(angle) * speed;
    this.vy    = Math.sin(angle) * speed;
    this.radius       = 3 + Math.random() * 2;
    this.maxLifetime  = 0.4 + Math.random() * 0.2;
    this.lifetime     = this.maxLifetime;
  }

  get dead() { return this.lifetime <= 0; }

  update(dt) {
    this.x        += this.vx * dt;
    this.y        += this.vy * dt;
    this.lifetime -= dt;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.lifetime / this.maxLifetime);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}
