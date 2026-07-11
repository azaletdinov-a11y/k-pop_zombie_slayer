const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

// HiDPI / Retina fix: render at device pixel density, display at logical size
const dpr = window.devicePixelRatio || 1;
canvas.width  = CANVAS_WIDTH  * dpr;
canvas.height = CANVAS_HEIGHT * dpr;
canvas.style.width  = CANVAS_WIDTH  + 'px';
canvas.style.height = CANVAS_HEIGHT + 'px';
ctx.scale(dpr, dpr);

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
