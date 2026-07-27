const RESTART_BTN = {
  w: 160, h: 44,
  get x() { return (CANVAS_WIDTH  - this.w) / 2; },
  get y() { return 380; }
};

function _fmtTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function drawGameOver(ctx, summary, scores, currentIdx) {
  const { score, kills, wave, runTime, totalDamage, highestCombo, acquiredPerks } = summary;
  const cx = CANVAS_WIDTH / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Title
  ctx.fillStyle = '#ff69b4';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', cx, 48);

  // Score
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(score.toLocaleString(), cx, 86);

  // Wave + kills
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Wave ' + wave + '   ·   Kills: ' + kills, cx, 110);

  // Run stats
  ctx.fillStyle = '#ccc';
  ctx.font = '12px monospace';
  ctx.fillText(
    'Time: ' + _fmtTime(runTime || 0) +
    '   Dmg: ' + (totalDamage || 0) +
    '   Combo: ' + (highestCombo || 0),
    cx, 128
  );

  // Perks (if any)
  if (acquiredPerks && acquiredPerks.length > 0) {
    ctx.fillStyle = '#ff69b4';
    ctx.font = '11px sans-serif';
    ctx.fillText('Perks: ' + acquiredPerks.join(' · '), cx, 145);
  }

  // Separator + table header
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - 185, 157); ctx.lineTo(cx + 185, 157); ctx.stroke();

  ctx.fillStyle = '#ff69b4';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('TOP SCORES', cx, 171);

  // Scores table
  const rowH = 16, tableY = 187;
  if (!scores || scores.length === 0) {
    ctx.fillStyle = '#555';
    ctx.font = '12px sans-serif';
    ctx.fillText('No scores yet', cx, tableY + 8);
  } else {
    ctx.font = '12px monospace';
    scores.forEach((entry, i) => {
      const y   = tableY + i * rowH;
      const cur = i === currentIdx;
      ctx.fillStyle = cur ? '#ff69b4' : '#888';
      if (cur) {
        ctx.fillStyle = 'rgba(255,105,180,0.12)';
        ctx.fillRect(cx - 185, y - 11, 370, rowH);
        ctx.fillStyle = '#ff69b4';
      }
      ctx.textAlign = 'left';
      ctx.fillText('#' + (i + 1), cx - 185, y);
      ctx.fillText(entry.score.toLocaleString(), cx - 155, y);
      ctx.fillText('W:' + entry.wave,  cx + 35,  y);
      ctx.fillText('K:' + entry.kills, cx + 95,  y);
      ctx.fillText(entry.date || '',   cx + 155, y);
    });
  }

  ctx.textAlign = 'center';
  ctx.strokeStyle = '#333';
  ctx.beginPath(); ctx.moveTo(cx - 185, 358); ctx.lineTo(cx + 185, 358); ctx.stroke();

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

// Populated by drawTitle each frame so the hit-test always matches what is
// actually on screen.
const TITLE_HINT_RECTS = [];

function getTitleHintId(mx, my) {
  for (const r of TITLE_HINT_RECTS) {
    if (pointInRect(mx, my, r)) return r.id;
  }
  return null;
}

// ---- Touch controls overlay ----
// Only drawn once a real touch has happened, so desktop never sees it.
function drawTouchControls(ctx) {
  if (!Input.touchActive) return;

  const ring = (x, y, r, alpha, color) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  ctx.save();

  // Sticks: outer ring at the touch origin, filled nub at the deflection
  const s = Input._sticks;
  if (s.moveOrigin && s.moveId !== null) {
    ring(s.moveOrigin.x, s.moveOrigin.y, STICK_MAX_DIST, 0.35, '#fff');
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(s.moveOrigin.x + Input.move.x * STICK_MAX_DIST,
            s.moveOrigin.y + Input.move.y * STICK_MAX_DIST, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4da6';
    ctx.fill();
  }
  if (s.aimOrigin && s.aimId !== null) {
    ring(s.aimOrigin.x, s.aimOrigin.y, STICK_MAX_DIST, 0.35, '#fff');
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(s.aimOrigin.x + Input.aim.x * STICK_MAX_DIST,
            s.aimOrigin.y + Input.aim.y * STICK_MAX_DIST, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#00e5ff';
    ctx.fill();
  }

  // Action buttons
  const btn = (b, label, color, held) => {
    ctx.globalAlpha = held ? 0.75 : 0.35;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = held ? 1 : 0.7;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, b.x, b.y + 4);
  };
  btn(TOUCH_BTN_MELEE, 'MIC',  '#ff4da6', Input.melee);
  btn(TOUCH_BTN_DASH,  'DASH', '#aaaaff', Input.keys.space);
  btn(TOUCH_BTN_PAUSE, 'II',   '#000000', false);

  ctx.restore();
}

// ---- Shared UI helpers ----

function pointInRect(mx, my, r) {
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}

// Full-screen background: image asset with dark overlay, or flat fallback
function drawScreenBg(ctx, assetKey, overlayAlpha, fallbackFill) {
  if (Assets.ready(assetKey)) {
    ctx.drawImage(Assets.images[assetKey], 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = 'rgba(0,0,0,' + overlayAlpha + ')';
  } else {
    ctx.fillStyle = fallbackFill;
  }
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function isRestartClicked(mx, my) {
  return pointInRect(mx, my, RESTART_BTN);
}

function drawHUD(ctx, hp, maxHp, energy, score, kills, wave, combo, comboFlash, zombiesLeft, muted, daily) {
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

  // --- Daily-challenge badge (under the score) ---
  if (daily) {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('★ DAILY #' + todaySeed(), CANVAS_WIDTH / 2, PAD + 27);
  }

  // --- Wave number + mute indicator (top-right) ---
  ctx.fillStyle = '#ff69b4';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Wave ' + wave, CANVAS_WIDTH - PAD, PAD + 14);
  // Distinguish "you muted it" from "the browser is blocking audio" — otherwise
  // a silent game looks identical in both cases and is impossible to diagnose.
  const blocked = !muted && Sfx.state !== 'running';
  ctx.fillStyle = blocked ? '#ffc107' : (muted ? '#555' : '#4caf50');
  ctx.font = blocked ? 'bold 11px monospace' : '11px sans-serif';
  ctx.fillText(blocked ? '♪ BLOCKED - TAP' : (muted ? '[M] muted' : '[M] ♪'),
               CANVAS_WIDTH - PAD, PAD + 30);

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
  // Background — lighter overlay so the art reads better
  drawScreenBg(ctx, 'title_bg', 0.18, '#0a0a0a');

  const cx = CANVAS_WIDTH / 2;

  // Title — smaller + black stroke + pink glow so it pops over art
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 50px sans-serif';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.strokeText('K-POP ZOMBIE SLAYER', cx, 74);
  ctx.shadowColor = '#ff69b4';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#ff69b4';
  ctx.fillText('K-POP ZOMBIE SLAYER', cx, 74);
  ctx.restore();

  // Subtitle — stroke for contrast over any bg color
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '18px sans-serif';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText('Survive the undead horde', cx, 100);
  ctx.fillStyle = '#e8e8e8';
  ctx.fillText('Survive the undead horde', cx, 100);
  ctx.restore();

  // Controls panel — left side, clear of the character. Shows whichever scheme
  // the player is actually using.
  const controls = Input.touchActive ? [
    ['Left stick',  'Move'],
    ['Right stick', 'Aim + fire'],
    ['MIC',         'Melee swing'],
    ['DASH',        'Dash  (1.5s cd)'],
    ['II',          'Pause'],
  ] : [
    ['WASD',         'Move'],
    ['Mouse',        'Aim'],
    ['Left-click',   'Melee swing'],
    ['Right-click',  'Sound wave'],
    ['Space',        'Dash  (1.5s cd)'],
    ['Esc',          'Pause'],
  ];
  const rowStep   = 30;
  const panelW    = 246;
  const panelH    = controls.length * rowStep + 18;
  const panelX    = 22;
  const panelY    = CANVAS_HEIGHT / 2 - panelH / 2 + 30;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,105,180,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 10);
  ctx.stroke();
  ctx.restore();

  ctx.font = '14px monospace';
  const keyX    = panelX + 96;
  const descX   = panelX + 106;
  const rowStart = panelY + 22;
  controls.forEach(([key, desc], i) => {
    const y = rowStart + i * rowStep;
    ctx.fillStyle = '#ff69b4';
    ctx.textAlign = 'right';
    ctx.fillText(key, keyX, y);
    ctx.fillStyle = '#ddd';
    ctx.textAlign = 'left';
    ctx.fillText(desc, descX, y);
  });

  // Secondary hints — dark pill so they're legible
  ctx.save();
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  // Laid out as separate segments so each one can be tapped on touch devices,
  // where "press D" is not available and any tap would otherwise start a run.
  const segs = [
    { id: 'daily',  text: '[D] Daily #' + todaySeed() },
    { id: 'scores', text: '[H] High scores' },
    { id: 'mute',   text: '[M] Toggle sound' },
  ];
  const GAP = 22;
  segs.forEach(s => { s.w = ctx.measureText(s.text).width; });
  const totalW = segs.reduce((a, s) => a + s.w, 0) + GAP * (segs.length - 1);
  const hintsW = totalW + 28;
  const hintsY = CANVAS_HEIGHT - 68;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.roundRect(cx - hintsW / 2, hintsY, hintsW, 24, 6);
  ctx.fill();

  ctx.fillStyle = '#999';
  ctx.textAlign = 'left';
  let sx = cx - totalW / 2;
  TITLE_HINT_RECTS.length = 0;
  for (const s of segs) {
    ctx.fillText(s.text, sx, hintsY + 17);
    // Generous vertical padding — this is a touch target, not just a label
    TITLE_HINT_RECTS.push({ id: s.id, x: sx - 6, y: hintsY - 4, w: s.w + 12, h: 32 });
    sx += s.w + GAP;
  }
  ctx.restore();

  // Pulsing "Press any key" — stronger pulse, subtle glow
  ctx.save();
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 550);
  ctx.globalAlpha = 0.65 + 0.35 * pulse;
  ctx.font = 'bold 19px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur  = 10 * pulse;
  ctx.fillStyle   = '#fff';
  ctx.fillText('▶  Press any key or click to start', cx, CANVAS_HEIGHT - 26);
  ctx.restore();
}

function drawBetweenWave(ctx, completedWave, timer, nextWaveIsBoss, preview, nextModifier) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const cx = CANVAS_WIDTH / 2;
  const cy = CANVAS_HEIGHT / 2;

  ctx.fillStyle = '#ff69b4';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Wave ' + completedWave + ' Clear!', cx, cy - 40);

  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  ctx.fillText('Next wave in ' + Math.ceil(timer) + '…', cx, cy + 4);

  // Heal line — honest about the pre-rolled RELENTLESS modifier
  if (nextModifier?.noHeal) {
    ctx.fillStyle = nextModifier.color;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('⚠ NO HP RESTORE', cx, cy + 30);
  } else {
    ctx.fillStyle = '#4caf50';
    ctx.font = '16px sans-serif';
    ctx.fillText('HP restored', cx, cy + 30);
  }

  // Announce the incoming modifier
  if (nextModifier) {
    ctx.fillStyle = nextModifier.color;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Incoming: ' + nextModifier.label + ' — ' + nextModifier.desc, cx, cy - 76);
  }

  // Wave preview
  if (preview && preview.length > 0) {
    ctx.fillStyle = '#aaa';
    ctx.font = '13px sans-serif';
    ctx.fillText('Next wave preview:', cx, cy + 58);

    const dotR  = 10;
    const gap   = 56;
    const totalW = (preview.length - 1) * gap;
    const startX = cx - totalW / 2;

    preview.forEach((entry, i) => {
      const px = startX + i * gap;
      const py = cy + 82;
      ctx.beginPath();
      ctx.arc(px, py, dotR, 0, Math.PI * 2);
      ctx.fillStyle = entry.color;
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('×' + entry.count, px, py + dotR + 13);
    });
  }

  if (nextWaveIsBoss) {
    const pulse  = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 300));
    const bossY  = preview && preview.length > 0 ? cy + 116 : cy + 66;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#e53935';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ BOSS INCOMING', cx, bossY);
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
  drawScreenBg(ctx, 'pause_bg', 0.32, 'rgba(0,0,0,0.65)');

  const cx = CANVAS_WIDTH / 2;
  const b  = RESUME_BTN;
  const vb = _pauseVolButtons();

  // Cap display at 8 perks; show "+N more" if overflow
  const displayPerks = acquiredPerks.length > 8
    ? [...acquiredPerks.slice(0, 7), `+${acquiredPerks.length - 7} more`]
    : acquiredPerks;
  const perkRows    = Math.max(1, displayPerks.length);
  const perksBlockH = 22 + perkRows * 20;        // label + rows
  const perksLabelY = b.y - 18 - perksBlockH;    // anchored above button

  // Panel bounds derived from content
  const panelW  = 320;
  const panelY  = Math.max(20, perksLabelY - 58); // 58px for PAUSED heading
  const panelH  = vb.volY + 40 - panelY;
  const panelX  = cx - panelW / 2;

  // Panel — dark purple, semi-transparent so bg image bleeds through
  ctx.save();
  ctx.fillStyle = 'rgba(15,5,25,0.88)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.fill();
  ctx.strokeStyle = '#3a1a3a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.stroke();
  ctx.restore();

  // Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', cx, panelY + 40);

  // Thin pink separator under title
  ctx.save();
  ctx.strokeStyle = '#ff69b4';
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(panelX + 24, panelY + 50);
  ctx.lineTo(panelX + panelW - 24, panelY + 50);
  ctx.stroke();
  ctx.restore();

  // Perks section
  ctx.fillStyle = '#ff69b4';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Perks this run:', cx, perksLabelY + 14);

  if (displayPerks.length === 0) {
    ctx.fillStyle = '#555';
    ctx.font = '13px sans-serif';
    ctx.fillText('none yet', cx, perksLabelY + 34);
  } else {
    ctx.font = '13px sans-serif';
    displayPerks.forEach((label, i) => {
      ctx.fillStyle = (acquiredPerks.length > 8 && i === displayPerks.length - 1) ? '#888' : '#ccc';
      ctx.fillText(label, cx, perksLabelY + 34 + i * 20);
    });
  }

  // Resume button
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

  // Volume control
  const volLevel = Math.round((typeof Sfx !== 'undefined' ? Sfx.getVolume() : 0.8) * 5);
  ctx.fillStyle = '#888';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Volume', cx, vb.volY);
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath(); ctx.roundRect(vb.minus.x, vb.minus.y, vb.minus.w, vb.minus.h, 4); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif';
  ctx.fillText('−', vb.minus.x + vb.minus.w / 2, vb.minus.y + 16);
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(cx - 34 + i * 17, vb.volY + 19, 5, 0, Math.PI * 2);
    ctx.fillStyle = i < volLevel ? '#ff69b4' : '#333';
    ctx.fill();
  }
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath(); ctx.roundRect(vb.plus.x, vb.plus.y, vb.plus.w, vb.plus.h, 4); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif';
  ctx.fillText('+', vb.plus.x + vb.plus.w / 2, vb.plus.y + 16);
}

// ---- Leaderboard screen ----

const LEADERBOARD_BACK_BTN = {
  w: 120, h: 38,
  get x() { return (CANVAS_WIDTH  - this.w) / 2; },
  get y() { return 528; }
};

function drawLeaderboard(ctx, scores) {
  const cx = CANVAS_WIDTH / 2;

  // Heavier scrim than the title screen — this is a dense list of small text
  drawScreenBg(ctx, 'title_bg', 0.55, '#0a0a0a');

  ctx.fillStyle = '#ff69b4';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HIGH SCORES', cx, 55);

  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - 200, 70); ctx.lineTo(cx + 200, 70); ctx.stroke();

  if (!scores || scores.length === 0) {
    ctx.fillStyle = '#555';
    ctx.font = '16px sans-serif';
    ctx.fillText('No scores recorded yet', cx, 200);
  } else {
    // Column headers
    ctx.fillStyle = '#ff69b4';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('#',     cx - 200, 100);
    ctx.fillText('Score', cx - 170, 100);
    ctx.fillText('Wave',  cx + 30,  100);
    ctx.fillText('Kills', cx + 95,  100);
    ctx.fillText('Date',  cx + 160, 100);

    ctx.strokeStyle = '#222';
    ctx.beginPath(); ctx.moveTo(cx - 200, 106); ctx.lineTo(cx + 210, 106); ctx.stroke();

    ctx.font = '14px monospace';
    scores.forEach((entry, i) => {
      const y = 126 + i * 22;
      ctx.fillStyle = i === 0 ? '#ffd700' : '#ccc';
      ctx.textAlign = 'left';
      ctx.fillText('#' + (i + 1),               cx - 200, y);
      ctx.fillText(entry.score.toLocaleString(), cx - 170, y);
      ctx.fillText(String(entry.wave),           cx + 30,  y);
      ctx.fillText(String(entry.kills),          cx + 95,  y);
      ctx.fillText((entry.daily ? '★ ' : '') + (entry.date || ''), cx + 160, y);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#666';
    ctx.font = '11px sans-serif';
    ctx.fillText('★ = daily challenge', cx, 126 + scores.length * 22 + 14);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#555';
  ctx.font = '12px sans-serif';
  ctx.fillText('[H] or [Esc] to go back', cx, 510);

  const b = LEADERBOARD_BACK_BTN;
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 8); ctx.fill();
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 8); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('BACK', cx, b.y + b.h / 2 + 6);
}

function isLeaderboardBackClicked(mx, my) {
  return pointInRect(mx, my, LEADERBOARD_BACK_BTN);
}

// ---- Challenge modifier banner ----

function drawModifierBanner(ctx, modifier, timer) {
  const fade = Math.min(1, timer * 2.5); // fade out in last 0.4s
  const cx   = CANVAS_WIDTH  / 2;
  const cy   = CANVAS_HEIGHT / 2;
  const bw   = 360, bh = 72;

  ctx.save();
  ctx.globalAlpha = fade;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.beginPath();
  ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 10);
  ctx.fill();

  ctx.strokeStyle = modifier.color;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 10);
  ctx.stroke();

  ctx.fillStyle   = modifier.color;
  ctx.font        = 'bold 30px sans-serif';
  ctx.textAlign   = 'center';
  ctx.fillText(modifier.label, cx, cy - 4);

  ctx.fillStyle   = '#ddd';
  ctx.font        = '16px sans-serif';
  ctx.fillText(modifier.desc, cx, cy + 20);

  ctx.restore();
}

// ---- Edge proximity zombie indicators ----

const INDICATOR_MARGIN = 80;

function drawZombieIndicators(ctx, zombies) {
  for (const z of zombies) {
    let ex, ey, angle;

    if (z.y < INDICATOR_MARGIN) {
      ex = Math.max(12, Math.min(CANVAS_WIDTH - 12, z.x));
      ey = 8;
      angle = Math.PI / 2; // arrow points down
    } else if (z.y > CANVAS_HEIGHT - INDICATOR_MARGIN) {
      ex = Math.max(12, Math.min(CANVAS_WIDTH - 12, z.x));
      ey = CANVAS_HEIGHT - 8;
      angle = -Math.PI / 2; // arrow points up
    } else if (z.x < INDICATOR_MARGIN) {
      ex = 8;
      ey = Math.max(12, Math.min(CANVAS_HEIGHT - 12, z.y));
      angle = 0; // arrow points right
    } else if (z.x > CANVAS_WIDTH - INDICATOR_MARGIN) {
      ex = CANVAS_WIDTH - 8;
      ey = Math.max(12, Math.min(CANVAS_HEIGHT - 12, z.y));
      angle = Math.PI; // arrow points left
    } else {
      continue;
    }

    const dist  = Math.min(
      z.y, CANVAS_HEIGHT - z.y, z.x, CANVAS_WIDTH - z.x
    );
    const alpha = Math.max(0.25, 1 - dist / INDICATOR_MARGIN);
    const color = z.isBoss ? '#e53935' : z.color;
    const size  = z.isBoss ? 10 : 7;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = color;
    ctx.translate(ex, ey);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo( size,       0);
    ctx.lineTo(-size * 0.7, -size * 0.6);
    ctx.lineTo(-size * 0.7,  size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function isResumeClicked(mx, my) {
  return pointInRect(mx, my, RESUME_BTN);
}

function _pauseVolButtons() {
  const b    = RESUME_BTN;
  const volY = b.y + b.h + 46;
  const cx   = CANVAS_WIDTH / 2;
  return {
    minus: { x: cx - 80, y: volY + 8, w: 26, h: 22 },
    plus:  { x: cx + 54, y: volY + 8, w: 26, h: 22 },
    volY,
    cx,
  };
}

function isPauseVolMinusClicked(mx, my) {
  return pointInRect(mx, my, _pauseVolButtons().minus);
}

function isPauseVolPlusClicked(mx, my) {
  return pointInRect(mx, my, _pauseVolButtons().plus);
}

// ---- Difficulty select screen ----
// Card content (name/color/lines) lives on the DIFFICULTIES entries in game.js
// so the display can never drift from the actual stats.

const DIFF_W = 180, DIFF_H = 200, DIFF_GAP = 24;

function _diffCardRect(i) {
  const totalW = 3 * DIFF_W + 2 * DIFF_GAP;
  const x = (CANVAS_WIDTH - totalW) / 2 + i * (DIFF_W + DIFF_GAP);
  const y = (CANVAS_HEIGHT - DIFF_H) / 2 + 20;
  return { x, y, w: DIFF_W, h: DIFF_H };
}

function drawDifficulty(ctx) {
  drawScreenBg(ctx, 'title_bg', 0.42, '#0a0a0a');

  const cx = CANVAS_WIDTH / 2;

  ctx.save();
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeText('SELECT DIFFICULTY', cx, (CANVAS_HEIGHT - DIFF_H) / 2 - 14);
  ctx.fillStyle = '#fff';
  ctx.fillText('SELECT DIFFICULTY', cx, (CANVAS_HEIGHT - DIFF_H) / 2 - 14);
  ctx.restore();

  DIFFICULTIES.forEach((d, i) => {
    const r  = _diffCardRect(i);
    const cx = r.x + DIFF_W / 2;
    ctx.fillStyle = 'rgba(15,5,25,0.88)';
    ctx.beginPath(); ctx.roundRect(r.x, r.y, DIFF_W, DIFF_H, 10); ctx.fill();
    ctx.strokeStyle = d.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, DIFF_W, DIFF_H, 10); ctx.stroke();
    ctx.fillStyle = d.color;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.name.toUpperCase(), cx, r.y + 42);
    ctx.fillStyle = '#ccc';
    ctx.font = '14px sans-serif';
    d.lines.forEach((line, li) => {
      if (line) ctx.fillText(line, cx, r.y + 82 + li * 26);
    });
  });
}

function getDifficultyCardIndex(mx, my) {
  for (let i = 0; i < DIFFICULTIES.length; i++) {
    if (pointInRect(mx, my, _diffCardRect(i))) return i;
  }
  return -1;
}

// ---- Milestone toasts ----

function drawToasts(ctx, toasts) {
  if (!toasts || toasts.length === 0) return;
  const cx    = CANVAS_WIDTH / 2;
  const baseY = 90;
  toasts.forEach((t, i) => {
    const elapsed = t.maxTimer - t.timer;
    const fade    = Math.min(1, elapsed * 4, t.timer * 2);
    const slideY  = Math.max(0, (1 - elapsed * 6)) * 12;
    const y       = baseY + i * 32 - slideY;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.font = 'bold 15px sans-serif';
    const tw = ctx.measureText(t.text).width + 28;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, y - 16, tw, 24, 6);
    ctx.fill();
    ctx.fillStyle = t.color;
    ctx.textAlign = 'center';
    ctx.fillText(t.text, cx, y);
    ctx.restore();
  });
}
