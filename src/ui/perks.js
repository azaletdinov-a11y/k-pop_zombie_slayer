const PERK_POOL = [
  {
    id: 'maxhp',
    label: '+2 Max HP',
    desc: ['Raise max health by 2', 'and gain 2 HP now.'],
    apply(game) {
      game.player.maxHp += 2;
      game.player.hp = Math.min(game.player.hp + 2, game.player.maxHp);
    }
  },
  {
    id: 'fullheal',
    label: 'Full Heal',
    desc: ['Restore all HP', 'to maximum.'],
    apply(game) {
      game.player.hp = game.player.maxHp;
    }
  },
  {
    id: 'powerswing',
    label: 'Power Swing',
    desc: ['Melee damage', '+20% permanently.'],
    apply(game) {
      game.meleeDamageMult *= 1.2;
    }
  },
  {
    id: 'widearc',
    label: 'Wide Arc',
    desc: ['Melee swing arc', '+15 degrees.'],
    apply(game) {
      game.player.arcBonus += Math.PI / 12;
    }
  },
  {
    id: 'energyrush',
    label: 'Energy Rush',
    desc: ['Energy regen', '+8 per second.'],
    apply(game) {
      game.player.energyRegenBonus += 8;
    }
  },
  {
    id: 'heavyshot',
    label: 'Heavy Shot',
    desc: ['Projectile damage', '+1 permanently.'],
    apply(game) {
      game.projDamageBonus += 1;
    }
  },
  {
    id: 'swiftsteps',
    label: 'Swift Steps',
    desc: ['Move speed', '+10% permanently.'],
    apply(game) {
      game.player.speedMult *= 1.1;
    }
  },
  {
    id: 'hotstreak',
    label: 'Hot Streak',
    desc: ['Combo window', '+0.5 seconds.'],
    apply(game) {
      game.comboWindowBonus += 0.5;
    }
  },
];

const CARD_W   = 180;
const CARD_H   = 220;
const CARD_GAP = 24;

function _cardRect(i) {
  const totalW = 3 * CARD_W + 2 * CARD_GAP;
  const x = (CANVAS_WIDTH - totalW) / 2 + i * (CARD_W + CARD_GAP);
  const y = (CANVAS_HEIGHT - CARD_H) / 2;
  return { x, y };
}

function drawPerkSelect(ctx, cards, hoveredIdx) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const headerY = (CANVAS_HEIGHT - CARD_H) / 2 - 26;
  ctx.fillStyle = '#ff69b4';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CHOOSE A PERK', CANVAS_WIDTH / 2, headerY);

  for (let i = 0; i < cards.length; i++) {
    const perk = cards[i];
    const r    = _cardRect(i);
    const hov  = i === hoveredIdx;
    const cx   = r.x + CARD_W / 2;

    // Background
    ctx.fillStyle = hov ? '#2a1525' : '#181818';
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, CARD_W, CARD_H, 10);
    ctx.fill();

    // Border
    ctx.strokeStyle = hov ? '#ff69b4' : '#444';
    ctx.lineWidth   = hov ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, CARD_W, CARD_H, 10);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(perk.label, cx, r.y + 44);

    // Divider
    ctx.strokeStyle = '#333';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(r.x + 20, r.y + 58);
    ctx.lineTo(r.x + CARD_W - 20, r.y + 58);
    ctx.stroke();

    // Description lines
    ctx.fillStyle = '#aaa';
    ctx.font = '14px sans-serif';
    perk.desc.forEach((line, li) => {
      ctx.fillText(line, cx, r.y + 84 + li * 22);
    });

    // Click hint
    ctx.fillStyle = hov ? '#ff69b4' : '#555';
    ctx.font = '12px sans-serif';
    ctx.fillText('click to pick', cx, r.y + CARD_H - 14);
  }
}

function getPerkCardIndex(mx, my, cards) {
  for (let i = 0; i < cards.length; i++) {
    const r = _cardRect(i);
    if (mx >= r.x && mx <= r.x + CARD_W && my >= r.y && my <= r.y + CARD_H) {
      return i;
    }
  }
  return -1;
}

function samplePerks(count) {
  const pool   = PERK_POOL.slice();
  const result = [];
  while (result.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}
