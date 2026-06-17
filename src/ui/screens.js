// Restart button rect — shared between draw and click-hit-test
const RESTART_BTN = {
  w: 160, h: 44,
  get x() { return (CANVAS_WIDTH  - this.w) / 2; },
  get y() { return (CANVAS_HEIGHT - this.h) / 2 + 60; }
};

function drawGameOver(ctx, score, kills, wave, highScore) {
  const cx = CANVAS_WIDTH / 2;
  const isRecord = score > 0 && score >= highScore;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#ff69b4';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', cx, CANVAS_HEIGHT / 2 - 90);

  // Score (large)
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(score.toLocaleString(), cx, CANVAS_HEIGHT / 2 - 42);

  // Stats row
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Wave ' + wave + '   ·   Kills: ' + kills, cx, CANVAS_HEIGHT / 2 - 10);

  // High score
  const hiLabel = isRecord ? '★ NEW RECORD' : 'High score: ' + highScore.toLocaleString();
  ctx.font = isRecord ? 'bold 18px sans-serif' : '16px sans-serif';
  ctx.fillStyle = isRecord ? '#ffd700' : '#777';
  ctx.fillText(hiLabel, cx, CANVAS_HEIGHT / 2 + 20);

  // Restart button
  const b = RESTART_BTN;
  ctx.fillStyle = '#ff69b4';
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 8);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('RESTART', cx, b.y + b.h / 2 + 7);
}

function isRestartClicked(mx, my) {
  const b = RESTART_BTN;
  return mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
}

function drawHUD(ctx, hp, maxHp, energy, score, kills, wave, combo, comboFlash, zombiesLeft) {
  const PAD = 8;

  // --- Health bar ---
  const barW = 160, barH = 14;
  const barX = PAD + 20, barY = 28;
  const fill  = Math.max(0, hp / maxHp);

  ctx.fillStyle = '#333';
  ctx.fillRect(barX, barY, barW, barH);

  const hue = Math.round(fill * 120);
  ctx.fillStyle = 'hsl(' + hue + ',90%,45%)';
  ctx.fillRect(barX, barY, Math.round(barW * fill), barH);

  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = '#ff69b4';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('♥', PAD, barY + barH - 1);

  ctx.fillStyle = '#fff';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(hp + ' / ' + maxHp, barX + barW + 6, barY + barH - 1);

  // --- Energy bar ---
  const eBarY = barY + barH + 6;
  const eFill = Math.max(0, energy / ENERGY_MAX);

  ctx.fillStyle = '#1a2a2a';
  ctx.fillRect(barX, eBarY, barW, barH);

  ctx.fillStyle = '#29b6f6';
  ctx.fillRect(barX, eBarY, Math.round(barW * eFill), barH);

  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, eBarY, barW, barH);

  ctx.fillStyle = '#29b6f6';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('⚡', PAD, eBarY + barH - 1);

  ctx.fillStyle = '#fff';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(Math.floor(energy) + ' / ' + ENERGY_MAX, barX + barW + 6, eBarY + barH - 1);

  // --- Score + kills (center) ---
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(score.toLocaleString() + '  |  Kills: ' + kills, CANVAS_WIDTH / 2, PAD + 14);

  // --- Wave number (top-right) ---
  ctx.fillStyle = '#ff69b4';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Wave ' + wave, CANVAS_WIDTH - PAD, PAD + 14);

  // --- Zombies remaining (bottom-right) ---
  if (zombiesLeft !== null && zombiesLeft !== undefined) {
    ctx.fillStyle = typeof zombiesLeft === 'string' ? '#e53935' : '#888';
    ctx.font = '13px monospace';
    ctx.textAlign = 'right';
    const label = typeof zombiesLeft === 'string' ? zombiesLeft : 'Zombies: ' + zombiesLeft;
    ctx.fillText(label, CANVAS_WIDTH - PAD, CANVAS_HEIGHT - PAD);
  }

  // --- Combo meter (bottom-center) ---
  if (combo > 0) {
    const mult    = Math.min(COMBO_MAX_MULT, 1 + Math.floor(combo / COMBO_TIER_SIZE) * COMBO_DAMAGE_STEP);
    const flashing = comboFlash > 0;
    const cy      = CANVAS_HEIGHT - 20;

    ctx.textAlign = 'center';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = flashing ? '#ffd700' : '#fff';
    ctx.fillText('COMBO x' + combo, CANVAS_WIDTH / 2, cy);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#ff69b4';
    ctx.fillText('(×' + mult.toFixed(2) + ' dmg)', CANVAS_WIDTH / 2, cy + 18);
  }
}

function drawTitle(ctx) {
  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const cx = CANVAS_WIDTH / 2;

  // Title
  ctx.fillStyle = '#ff69b4';
  ctx.font = 'bold 58px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('K-POP ZOMBIE SLAYER', cx, 130);

  // Subtitle
  ctx.fillStyle = '#aaa';
  ctx.font = '20px sans-serif';
  ctx.fillText('Survive the undead horde', cx, 170);

  // Divider
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 180, 196);
  ctx.lineTo(cx + 180, 196);
  ctx.stroke();

  // Controls
  const controls = [
    ['WASD',         'Move'],
    ['Mouse',        'Aim'],
    ['Left-click',   'Melee swing'],
    ['Right-click',  'Sound wave  (costs energy)'],
    ['Space',        'Dash  (1.5s cooldown)'],
    ['Esc',          'Pause'],
  ];
  ctx.font = '16px monospace';
  const colL = cx - 140, colR = cx + 20, rowStart = 230, rowStep = 28;
  controls.forEach(([key, desc], i) => {
    const y = rowStart + i * rowStep;
    ctx.fillStyle = '#ff69b4';
    ctx.textAlign = 'right';
    ctx.fillText(key, colL, y);
    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'left';
    ctx.fillText(desc, colR, y);
  });

  // Pulsing prompt
  const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(Date.now() / 500));
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▶  Press any key or click to start', cx, CANVAS_HEIGHT - 60);
  ctx.globalAlpha = 1;
}

function drawBetweenWave(ctx, completedWave, timer, nextWaveIsBoss) {
  // Semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const cy = CANVAS_HEIGHT / 2;

  ctx.fillStyle = '#ff69b4';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Wave ' + completedWave + ' Clear!', CANVAS_WIDTH / 2, cy - 20);

  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  ctx.fillText('Next wave in ' + Math.ceil(timer) + '…', CANVAS_WIDTH / 2, cy + 24);

  ctx.fillStyle = '#4caf50';
  ctx.font = '16px sans-serif';
  ctx.fillText('HP restored', CANVAS_WIDTH / 2, cy + 56);

  if (nextWaveIsBoss) {
    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 300));
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#e53935';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('⚠ BOSS INCOMING', CANVAS_WIDTH / 2, cy + 92);
    ctx.restore();
  }
}

// ---- Pause screen ----

const RESUME_BTN = {
  w: 160, h: 44,
  get x() { return (CANVAS_WIDTH  - this.w) / 2; },
  get y() { return (CANVAS_HEIGHT - this.h) / 2 + 80; }
};

function drawPaused(ctx, acquiredPerks) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const cx = CANVAS_WIDTH / 2;
  const panelW = 320, panelH = 260 + Math.max(0, acquiredPerks.length - 1) * 22;
  const panelX = cx - panelW / 2;
  const panelY = CANVAS_HEIGHT / 2 - panelH / 2 - 20;

  // Panel background
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.stroke();

  // Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', cx, panelY + 46);

  // Perks list
  ctx.fillStyle = '#ff69b4';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('Perks this run:', cx, panelY + 78);

  if (acquiredPerks.length === 0) {
    ctx.fillStyle = '#555';
    ctx.font = '13px sans-serif';
    ctx.fillText('none yet', cx, panelY + 98);
  } else {
    ctx.fillStyle = '#ccc';
    ctx.font = '13px sans-serif';
    acquiredPerks.forEach((label, i) => {
      ctx.fillText(label, cx, panelY + 98 + i * 22);
    });
  }

  // Resume button
  const b = RESUME_BTN;
  ctx.fillStyle = '#ff69b4';
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 8);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('RESUME', cx, b.y + b.h / 2 + 6);

  ctx.fillStyle = '#555';
  ctx.font = '12px sans-serif';
  ctx.fillText('or press Esc', cx, b.y + b.h + 18);
}

function isResumeClicked(mx, my) {
  const b = RESUME_BTN;
  return mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
}
