class EnemyProjectile {
  constructor(x, y, angle) {
    this.x     = x;
    this.y     = y;
    this.vx    = Math.cos(angle) * ENEMY_PROJ_SPEED;
    this.vy    = Math.sin(angle) * ENEMY_PROJ_SPEED;
    this.dist  = 0;
    this.prevX = x;
    this.prevY = y;
    this._hit  = false;
  }

  get expired() {
    return this._hit || this.dist >= ENEMY_PROJ_RANGE ||
      this.x < -10 || this.x > CANVAS_WIDTH  + 10 ||
      this.y < -10 || this.y > CANVAS_HEIGHT + 10;
  }

  update(dt) {
    this.prevX  = this.x;
    this.prevY  = this.y;
    this.x     += this.vx * dt;
    this.y     += this.vy * dt;
    this.dist  += ENEMY_PROJ_SPEED * dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 109, 0, 0.35)';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(this.prevX, this.prevY);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6d00';
    ctx.fill();
    ctx.restore();
  }
}
