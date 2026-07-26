// Asset loader — call Assets.load(callback) before starting the game loop
const Assets = {
  images: {},

  load(onReady) {
    const manifest = [
      { key: 'background',    src: 'assets/images/floor_venue.png' },
      { key: 'title_bg',      src: 'assets/images/keyart_stage.png' },
      { key: 'pause_bg',      src: 'assets/images/pause_corridor.png' },
      { key: 'player_sprite',       src: 'assets/images/player_lyasan.png' },
      { key: 'zombie_normal',       src: 'assets/images/zombies/zombie_normal.png' },
      { key: 'zombie_fast',         src: 'assets/images/zombies/zombie_fast.png' },
      { key: 'zombie_tank',         src: 'assets/images/zombies/zombie_tank.png' },
      { key: 'zombie_ranged',       src: 'assets/images/zombies/zombie_ranged.png' },
      { key: 'zombie_exploder',     src: 'assets/images/zombies/zombie_exploder.png' },
      { key: 'zombie_shield',       src: 'assets/images/zombies/zombie_shield.png' },
      { key: 'zombie_splitter',     src: 'assets/images/zombies/zombie_splitter.png' },
      { key: 'zombie_splinterling', src: 'assets/images/zombies/splinterling.png' },
      { key: 'zombie_boss',         src: 'assets/images/zombies/boss_fallen_idol.png' },
      { key: 'pickup_energy',       src: 'assets/images/icon_energy_lightstick.png' },
      { key: 'pickup_health',       src: 'assets/images/icon_health_heart.png' },
    ];

    let pending = manifest.length;
    const done  = () => { if (--pending === 0) onReady(); };

    for (const item of manifest) {
      const img   = new Image();
      img.onload  = done;
      img.onerror = done; // missing file — fall back to placeholder shape
      img.src     = item.src;
      this.images[item.key] = img;
    }
  },

  // Returns true when an image loaded successfully
  ready(key) {
    const img = this.images[key];
    return img && img.complete && img.naturalWidth > 0;
  }
};

// Draw an entity sprite centered at (x, y), rotated to `angle`.
// Sprites are authored facing "up", so angle 0 (facing right) needs +90°.
function drawSprite(ctx, key, x, y, size, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.imageSmoothingEnabled = false; // keep pixel art crisp
  ctx.drawImage(Assets.images[key], -size / 2, -size / 2, size, size);
  ctx.restore();
}

// Draw a non-rotating icon centered at (x, y) — pickups and HUD items, which
// always face the viewer, unlike entity sprites.
function drawIcon(ctx, key, x, y, size) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(Assets.images[key], x - size / 2, y - size / 2, size, size);
  ctx.restore();
}

function drawArenaFloor(ctx) {
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;

  if (Assets.ready('background')) {
    ctx.drawImage(Assets.images.background, 0, 0, W, H);
    return;
  }

  // Fallback: dark purple-black + synthwave grid
  ctx.fillStyle = '#0d0015';
  ctx.fillRect(0, 0, W, H);

  const VX = W / 2;
  const VY = Math.round(H * 0.38); // horizon line

  function glowLine(x1, y1, x2, y2, color, alpha) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 5;
    ctx.globalAlpha = alpha * 0.18;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.lineWidth   = 1;
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  }

  // Clip drawing to floor area (below horizon)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, VY, W, H - VY);
  ctx.clip();

  // Vertical lines (cyan) — radiate from vanishing point to bottom edge
  const V_COUNT = 14;
  for (let i = 0; i <= V_COUNT; i++) {
    const xBottom = (W / V_COUNT) * i;
    // Brightest at centre, fades toward edges
    const centreness = 1 - Math.abs(i / V_COUNT - 0.5) * 2;
    const alpha = 0.18 + 0.42 * centreness;
    glowLine(VX, VY, xBottom, H, '#00e5ff', alpha);
  }

  // Horizontal lines (magenta) — quadratic spacing = perspective depth
  const H_COUNT = 9;
  for (let i = 1; i <= H_COUNT; i++) {
    const t     = Math.pow(i / H_COUNT, 2);
    const y     = VY + (H - VY) * t;
    const alpha = 0.12 + 0.55 * t; // brighter near bottom (nearer to camera)
    glowLine(0, y, W, y, '#ff00cc', alpha);
  }

  ctx.restore(); // remove clip

  // Horizon glow line
  glowLine(0, VY, W, VY, '#ff00cc', 0.65);
}
