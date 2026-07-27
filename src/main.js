const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

// The game always draws in an 800x600 logical space. The canvas backing store
// stays at that size (times DPR); only the CSS display size changes, so every
// layout constant and hit-test stays valid at any screen size.
const dpr = window.devicePixelRatio || 1;
canvas.width  = CANVAS_WIDTH  * dpr;
canvas.height = CANVAS_HEIGHT * dpr;
ctx.scale(dpr, dpr);

const CANVAS_BORDER = 4; // 2px each side, outside the content box

function fitCanvas() {
  // Never scale up: on any viewport at least 800x600 this is exactly 1:1,
  // identical to a fixed-size canvas.
  const scale = Math.min(1,
    (window.innerWidth  - CANVAS_BORDER) / CANVAS_WIDTH,
    (window.innerHeight - CANVAS_BORDER) / CANVAS_HEIGHT);
  canvas.style.width  = Math.round(CANVAS_WIDTH  * scale) + 'px';
  canvas.style.height = Math.round(CANVAS_HEIGHT * scale) + 'px';
}
fitCanvas();
window.addEventListener('resize', fitCanvas);
window.addEventListener('orientationchange', fitCanvas);

Input.init(canvas);
const game = new Game();

// Auto-pause when tab is hidden or window loses focus
document.addEventListener('visibilitychange', () => { if (document.hidden) game._autoPause(); });
window.addEventListener('blur', () => game._autoPause());

let lastTime    = 0;
let accumulator = 0;
let fpsFrames   = 0;
let fpsTimer    = 0;
let fps         = 0;

function loop(timestamp) {
  const elapsed = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  accumulator += elapsed;
  while (accumulator >= FIXED_DT) {
    game.update(FIXED_DT);
    accumulator -= FIXED_DT;
  }

  game.draw(ctx);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('FPS: ' + fps, 8, 16);

  fpsFrames++;
  fpsTimer += elapsed;
  if (fpsTimer >= 1) {
    fps = Math.round(fpsFrames / fpsTimer);
    fpsFrames = 0;
    fpsTimer  = 0;
  }

  requestAnimationFrame(loop);
}

Assets.load(() => requestAnimationFrame(loop));
