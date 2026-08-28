// ---------------------------------------------------------------------------
// Player skins. Each draw(ctx, size, time) is called with the canvas already
// translated to the player's center and rotated to its current orientation —
// draw relative to (0,0). `time` is seconds since page load, for animated
// looks (hue shift, pulsing glow). Loaded before game.js; exposes `SKINS`.
// ---------------------------------------------------------------------------

const SKINS = [
  {
    id: 'default',
    name: 'Cube Classic',
    description: 'The original smiley cube.',
    unlock: null, // unlocked from the start
    draw(ctx, size) {
      const half = size / 2;
      ctx.fillStyle = '#0a0a14';
      ctx.shadowColor = '#fff42e';
      ctx.shadowBlur = 18;
      ctx.fillRect(-half, -half, size, size);
      ctx.strokeStyle = '#fff42e';
      ctx.lineWidth = 3;
      ctx.strokeRect(-half, -half, size, size);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#fff42e';
      ctx.beginPath();
      ctx.arc(-half * 0.35, -half * 0.2, 3, 0, Math.PI * 2);
      ctx.arc(half * 0.35, -half * 0.2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff42e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, half * 0.15, half * 0.35, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    },
  },
  {
    id: 'godzilla',
    name: 'Godzilla',
    description: 'A spiky green dinosaur cube.',
    unlock: { type: 'spikeStreak', target: 100, text: 'Dodge 100 spikes in a row without crashing' },
    draw(ctx, size) {
      const half = size / 2;
      ctx.fillStyle = '#0d1f0d';
      ctx.shadowColor = '#39ff6a';
      ctx.shadowBlur = 18;
      ctx.fillRect(-half, -half, size, size);
      ctx.strokeStyle = '#39ff6a';
      ctx.lineWidth = 3;
      ctx.strokeRect(-half, -half, size, size);
      ctx.shadowBlur = 0;

      // spiky ridge along the top edge
      ctx.fillStyle = '#39ff6a';
      const spikeCount = 4;
      for (let i = 0; i < spikeCount; i++) {
        const sx = -half + (size * (i + 0.5)) / spikeCount;
        ctx.beginPath();
        ctx.moveTo(sx - 5, -half);
        ctx.lineTo(sx + 5, -half);
        ctx.lineTo(sx, -half - 8);
        ctx.closePath();
        ctx.fill();
      }

      // eyes
      ctx.fillStyle = '#fff42e';
      ctx.beginPath();
      ctx.arc(-half * 0.35, -half * 0.15, 3.2, 0, Math.PI * 2);
      ctx.arc(half * 0.35, -half * 0.15, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // jagged teeth mouth
      ctx.strokeStyle = '#39ff6a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const mouthY = half * 0.25;
      ctx.moveTo(-half * 0.4, mouthY);
      for (let i = 0; i < 4; i++) {
        const mx = -half * 0.4 + (half * 0.8 * (i + 1)) / 4;
        ctx.lineTo(mx, mouthY + (i % 2 === 0 ? 5 : -5));
      }
      ctx.stroke();
    },
  },
  {
    id: 'prism',
    name: 'Prism',
    description: 'A faceted crystal that shifts color.',
    unlock: { type: 'levelsCompleted', target: 3, text: 'Complete any 3 levels' },
    draw(ctx, size, time) {
      const half = size / 2;
      const hue = (time * 60) % 360;
      ctx.fillStyle = `hsl(${hue}, 90%, 55%)`;
      ctx.shadowColor = `hsl(${hue}, 90%, 65%)`;
      ctx.shadowBlur = 20;
      ctx.fillRect(-half, -half, size, size);
      ctx.shadowBlur = 0;

      // facet lines
      ctx.strokeStyle = `hsl(${(hue + 40) % 360}, 90%, 80%)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-half, -half); ctx.lineTo(half, half);
      ctx.moveTo(half, -half); ctx.lineTo(-half, half);
      ctx.moveTo(0, -half); ctx.lineTo(0, half);
      ctx.moveTo(-half, 0); ctx.lineTo(half, 0);
      ctx.stroke();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-half, -half, size, size);
    },
  },
  {
    id: 'magma',
    name: 'Magma',
    description: 'Cracked rock with flowing lava veins.',
    unlock: { type: 'levelId', target: 9, text: "Beat Level 9: Molten Core" },
    draw(ctx, size, time) {
      const half = size / 2;
      const pulse = (Math.sin(time * 4) + 1) / 2;
      ctx.fillStyle = '#241008';
      ctx.shadowColor = `rgba(255,${77 + pulse * 60},26,0.9)`;
      ctx.shadowBlur = 16 + pulse * 8;
      ctx.fillRect(-half, -half, size, size);
      ctx.strokeStyle = '#ff4d1a';
      ctx.lineWidth = 3;
      ctx.strokeRect(-half, -half, size, size);
      ctx.shadowBlur = 0;

      // lava crack veins
      ctx.strokeStyle = `rgba(255, ${157 + pulse * 60}, 46, 1)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-half * 0.7, -half * 0.6);
      ctx.lineTo(-half * 0.1, -half * 0.1);
      ctx.lineTo(-half * 0.4, half * 0.3);
      ctx.moveTo(-half * 0.1, -half * 0.1);
      ctx.lineTo(half * 0.5, -half * 0.4);
      ctx.moveTo(-half * 0.1, -half * 0.1);
      ctx.lineTo(half * 0.3, half * 0.6);
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 244, 46, ${0.6 + pulse * 0.4})`;
      ctx.beginPath();
      ctx.arc(-half * 0.1, -half * 0.1, 2.5, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'A pastel cube with shimmering aurora bands.',
    unlock: { type: 'levelsCompleted', target: 6, text: 'Complete any 6 levels' },
    draw(ctx, size, time) {
      const half = size / 2;
      const hue = (time * 20) % 360;
      const grad = ctx.createLinearGradient(-half, -half, half, half);
      grad.addColorStop(0, `hsl(${hue}, 80%, 70%)`);
      grad.addColorStop(0.5, `hsl(${(hue + 60) % 360}, 80%, 70%)`);
      grad.addColorStop(1, `hsl(${(hue + 120) % 360}, 80%, 70%)`);
      ctx.fillStyle = grad;
      ctx.shadowColor = `hsl(${hue}, 80%, 70%)`;
      ctx.shadowBlur = 18;
      ctx.fillRect(-half, -half, size, size);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const yBase = -half + (size * (i + 1)) / 4;
        for (let x = -half; x <= half; x += 4) {
          const y = yBase + Math.sin((x + time * 80) * 0.15) * 3;
          if (x === -half) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-half, -half, size, size);
    },
  },
  {
    id: 'voidwalker',
    name: 'Voidwalker',
    description: 'A starfield cube for those who beat the whole run.',
    unlock: { type: 'levelId', target: 10, text: 'Beat Level 10: Final Ascent' },
    draw(ctx, size, time) {
      const half = size / 2;
      ctx.fillStyle = '#05050f';
      ctx.shadowColor = '#8f5bff';
      ctx.shadowBlur = 20;
      ctx.fillRect(-half, -half, size, size);
      ctx.strokeStyle = '#8f5bff';
      ctx.lineWidth = 3;
      ctx.strokeRect(-half, -half, size, size);
      ctx.shadowBlur = 0;

      const stars = [
        [-0.4, -0.3], [0.2, -0.15], [0.35, 0.25],
        [-0.15, 0.35], [0.05, -0.4], [-0.35, 0.1],
      ];
      ctx.fillStyle = '#fff';
      for (const [nx, ny] of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(time * 3 + nx * 10);
        ctx.globalAlpha = twinkle;
        ctx.beginPath();
        ctx.arc(nx * size, ny * size, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'ultra-godzilla',
    name: 'Ultra Godzilla',
    description: 'A colossal, unstoppable Godzilla. Nothing survives contact — spikes and blocks shatter on touch instead of killing you.',
    unlock: { type: 'cheat', text: 'Unlock with a secret cheat code' },
    draw(ctx, size, time) {
      const half = size / 2;
      const pulse = (Math.sin(time * 6) + 1) / 2;
      ctx.save();
      ctx.scale(1.7, 1.7); // renders oversized — the "colossal" look — hitbox size is unaffected

      ctx.fillStyle = '#0a2a0a';
      ctx.shadowColor = '#39ff6a';
      ctx.shadowBlur = 22 + pulse * 10;
      ctx.fillRect(-half, -half, size, size);
      ctx.strokeStyle = '#39ff6a';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(-half, -half, size, size);
      ctx.shadowBlur = 0;

      // tall jagged spine ridge
      ctx.fillStyle = '#39ff6a';
      const spikeCount = 5;
      for (let i = 0; i < spikeCount; i++) {
        const sx = -half + (size * (i + 0.5)) / spikeCount;
        ctx.beginPath();
        ctx.moveTo(sx - 6, -half);
        ctx.lineTo(sx + 6, -half);
        ctx.lineTo(sx, -half - 12);
        ctx.closePath();
        ctx.fill();
      }

      // glowing red eyes
      ctx.fillStyle = `rgba(255, ${40 + pulse * 40}, 40, 1)`;
      ctx.shadowColor = '#ff2e2e';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(-half * 0.35, -half * 0.15, 4, 0, Math.PI * 2);
      ctx.arc(half * 0.35, -half * 0.15, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // wide jagged roar
      ctx.strokeStyle = '#39ff6a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const mouthY = half * 0.3;
      ctx.moveTo(-half * 0.5, mouthY);
      for (let i = 0; i < 6; i++) {
        const mx = -half * 0.5 + (half * 1.0 * (i + 1)) / 6;
        ctx.lineTo(mx, mouthY + (i % 2 === 0 ? 7 : -7));
      }
      ctx.stroke();

      ctx.restore();
    },
  },
];

function getSkinById(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}

function isSkinUnlocked(skin, save) {
  if (!skin.unlock) return true;
  if (skin.unlock.type === 'spikeStreak') return save.bestSpikeStreak >= skin.unlock.target;
  if (skin.unlock.type === 'levelsCompleted') return save.completedLevels.length >= skin.unlock.target;
  if (skin.unlock.type === 'levelId') return save.completedLevels.includes(skin.unlock.target);
  // type 'cheat' (and anything else unrecognized) is never auto-granted —
  // it's only added to save.unlockedSkins directly by a cheat-code handler.
  return false;
}
