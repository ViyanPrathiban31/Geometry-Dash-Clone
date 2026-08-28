// ---------------------------------------------------------------------------
// Level content: 10 levels, easy -> medium -> hard, each with its own
// obstacles, portals, decorations, color palette and procedurally-generated
// chiptune data. Loaded before game.js; exposes globals: VIEW_W, VIEW_H,
// GROUND_Y, CEILING_Y, LEVELS.
// ---------------------------------------------------------------------------

const VIEW_W = 960;
const VIEW_H = 540;
const GROUND_Y = VIEW_H - 90; // 450
const CEILING_Y = 40;

const G = GROUND_Y;
const C = CEILING_Y;

// --- obstacle / portal / decoration builders --------------------------

function spike(x, opts = {}) {
  return { type: 'spike', x, w: opts.w || 40, h: opts.h || 40, mounted: opts.mounted || 'ground' };
}
function block(x, topY, w = 40, h = 40) {
  return { type: 'block', x, y: topY, w, h };
}
function gravityPortal(x, dir) {
  return { type: 'gravity', x, dir, triggered: false };
}
function speedPortal(x, mult) {
  return { type: 'speed', x, mult, triggered: false };
}
function gear(x, y, r, speed = 1) {
  return { x, y, r, speed };
}

function spikeRow(startX, count, gap = 50, opts = {}) {
  const arr = [];
  for (let i = 0; i < count; i++) arr.push(spike(startX + i * gap, opts));
  return arr;
}

function stairsUp(startX, steps, stepGap = 60, baseH = 40, riseH = 40, w = 40) {
  const arr = [];
  for (let i = 0; i < steps; i++) arr.push(block(startX + i * stepGap, G - baseH - i * riseH, w, baseH));
  return arr;
}

function stairsDown(startX, steps, stepGap = 60, baseH = 40, riseH = 40, w = 40) {
  const arr = [];
  for (let i = 0; i < steps; i++) arr.push(block(startX + i * stepGap, G - baseH - (steps - 1 - i) * riseH, w, baseH));
  return arr;
}

function gearField(startX, endX, y, count, r = 18, speed = 1) {
  const arr = [];
  const span = endX - startX;
  for (let i = 0; i < count; i++) arr.push(gear(startX + (span * i) / Math.max(1, count - 1), y, r, speed * (i % 2 === 0 ? 1 : -1)));
  return arr;
}

// --- procedural chiptune data ------------------------------------------

function noteFreq(semitoneFromC4) {
  return 261.63 * Math.pow(2, semitoneFromC4 / 12);
}

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dark: [0, 1, 3, 5, 7, 8, 10],
};

function buildMusic({ bpm, root = 0, scaleName = 'major', wave = 'square', octave = 0, kickEvery = 4, steps = 16, restEvery = null }) {
  const scale = SCALES[scaleName];
  const degreePattern = [0, 1, 2, 3, 4, 3, 2, 1];
  const melody = [];
  const stepDur = 60 / bpm / 4;
  for (let i = 0; i < steps; i++) {
    if (restEvery && i % restEvery === restEvery - 1) {
      melody.push(null);
      continue;
    }
    const deg = degreePattern[i % degreePattern.length];
    const semitone = root + scale[deg % scale.length] + 12 * (octave + Math.floor(deg / scale.length));
    melody.push({ freq: noteFreq(semitone), dur: stepDur * 0.9, vel: 0.16, wave });
  }
  const kick = [];
  for (let i = 0; i < steps; i++) kick.push(i % kickEvery === 0);
  return { bpm, totalSteps: steps, melody, kick };
}

// --- palettes -------------------------------------------------------------

function palette(bgTop, bgBottom, primary, secondary, accent, spikeColor, blockColor) {
  return { bgTop, bgBottom, primary, secondary, accent, spike: spikeColor, block: blockColor };
}

// --- levels ----------------------------------------------------------------

const LEVELS = [
  {
    id: 1,
    name: 'First Steps',
    tier: 'easy',
    length: 2900,
    lavaTheme: false,
    palette: palette('#0a0a14', '#0d1420', '#39ff6a', '#2ee6ff', '#fff42e', '#ff9d2e', '#39ff6a'),
    music: buildMusic({ bpm: 120, root: 0, scaleName: 'major', wave: 'square', kickEvery: 4 }),
    obstacles: [
      spike(700), spike(760),
      block(1000, G - 40),
      spike(1120),
      block(1400, G - 80), block(1460, G - 80),
      ...spikeRow(1650, 3, 55),
      block(1950, G - 40),
      block(2100, G - 160),
      spike(2260),
      block(2500, G - 40), block(2560, G - 40), block(2620, G - 40),
      ...spikeRow(2760, 2, 55),
    ],
    portals: [],
    decorations: {
      particleDensity: 0.6,
      gears: gearField(500, 2700, G - 200, 5, 16, 0.6),
    },
  },
  {
    id: 2,
    name: 'Cube Rhythm',
    tier: 'easy',
    length: 3200,
    lavaTheme: false,
    palette: palette('#0a0f0a', '#0a1410', '#39ff6a', '#fff42e', '#2ee6ff', '#ff9d2e', '#39ff6a'),
    music: buildMusic({ bpm: 126, root: 2, scaleName: 'major', wave: 'square', kickEvery: 4 }),
    obstacles: [
      ...spikeRow(650, 2, 55),
      ...stairsUp(950, 3, 60, 40, 40),
      spike(1250),
      ...stairsDown(1350, 3, 60, 40, 40),
      block(1700, G - 40, 120, 40),
      ...spikeRow(1900, 3, 50),
      block(2150, G - 120),
      spike(2320),
      ...stairsUp(2450, 4, 55, 40, 30),
      spike(2750),
      block(2900, G - 40), block(2960, G - 40),
    ],
    portals: [],
    decorations: {
      particleDensity: 0.7,
      gears: gearField(600, 3000, G - 220, 6, 18, 0.8),
    },
  },
  {
    id: 3,
    name: 'Spike Alley',
    tier: 'easy',
    length: 3400,
    lavaTheme: false,
    palette: palette('#0a0a18', '#0d0d22', '#2ee6ff', '#b026ff', '#fff42e', '#2ee6ff', '#39ff6a'),
    music: buildMusic({ bpm: 132, root: -2, scaleName: 'major', wave: 'triangle', kickEvery: 4 }),
    obstacles: [
      ...spikeRow(600, 3, 50),
      block(950, G - 40),
      ...spikeRow(1100, 4, 48),
      block(1450, G - 80), block(1510, G - 80),
      ...spikeRow(1700, 2, 50),
      block(1950, G - 160),
      ...spikeRow(2150, 3, 48),
      ...stairsUp(2450, 3, 60, 40, 40),
      spike(2750),
      block(2900, G - 40, 140, 40),
      ...spikeRow(3100, 3, 48),
    ],
    portals: [],
    decorations: {
      particleDensity: 0.8,
      gears: gearField(500, 3300, G - 240, 7, 16, 1),
    },
  },
  {
    id: 4,
    name: 'Gravity Shift',
    tier: 'medium',
    length: 3800,
    lavaTheme: false,
    palette: palette('#100a18', '#160a22', '#b026ff', '#ff2ea6', '#2ee6ff', '#b026ff', '#ff2ea6'),
    music: buildMusic({ bpm: 138, root: 1, scaleName: 'minor', wave: 'square', kickEvery: 4 }),
    obstacles: [
      ...spikeRow(600, 2, 50),
      block(850, G - 40),
      spike(1050),
      // first gravity-flip section: ceiling-mounted hazards while flipped
      spike(1260, { mounted: 'ceiling' }),
      spike(1320, { mounted: 'ceiling' }),
      block(1500, C, 60, 40),
      spike(1750, { mounted: 'ceiling' }),
      // back to normal gravity, buffer already provided by portal spacing
      block(2050, G - 40),
      ...spikeRow(2200, 3, 50),
      block(2450, G - 120),
      spike(2650, { mounted: 'ceiling' }),
      spike(2710, { mounted: 'ceiling' }),
      block(3000, G - 40),
      ...spikeRow(3200, 2, 50),
      block(3450, G - 40), block(3510, G - 40),
    ],
    portals: [
      gravityPortal(1150, -1),
      gravityPortal(1900, 1),
      gravityPortal(2550, -1),
      gravityPortal(2900, 1),
    ],
    decorations: {
      particleDensity: 0.9,
      gears: gearField(500, 3700, (G + C) / 2, 8, 20, 1.2),
    },
  },
  {
    id: 5,
    name: 'Turbo Lane',
    tier: 'medium',
    length: 4000,
    lavaTheme: false,
    palette: palette('#180a10', '#220a14', '#ff2ea6', '#ff9d2e', '#fff42e', '#ff2ea6', '#ff9d2e'),
    music: buildMusic({ bpm: 145, root: 3, scaleName: 'minor', wave: 'sawtooth', kickEvery: 2 }),
    obstacles: [
      ...spikeRow(600, 2, 50),
      block(850, G - 40),
      ...spikeRow(1150, 3, 45),
      block(1400, G - 80),
      ...spikeRow(1650, 4, 42),
      block(1950, G - 40), block(2010, G - 40),
      ...spikeRow(2200, 3, 42),
      block(2500, G - 120),
      spike(2700),
      ...spikeRow(2850, 4, 40),
      block(3150, G - 40),
      ...spikeRow(3350, 3, 40),
      block(3650, G - 40), block(3710, G - 40), block(3770, G - 40),
    ],
    portals: [
      speedPortal(1000, 0.6),
      speedPortal(1900, 1.5),
      speedPortal(2650, 0.8),
      speedPortal(3300, 1.8),
    ],
    decorations: {
      particleDensity: 1,
      gears: gearField(500, 3900, G - 200, 8, 18, 1.5),
    },
  },
  {
    id: 6,
    name: 'Twist & Flip',
    tier: 'medium',
    length: 4200,
    lavaTheme: false,
    palette: palette('#0a1418', '#100a20', '#2ee6ff', '#ff2ea6', '#b026ff', '#2ee6ff', '#ff2ea6'),
    music: buildMusic({ bpm: 150, root: 4, scaleName: 'dark', wave: 'square', kickEvery: 2 }),
    obstacles: [
      ...spikeRow(600, 3, 46),
      block(900, G - 40),
      spike(1150, { mounted: 'ceiling' }),
      block(1350, C, 60, 40),
      spike(1550, { mounted: 'ceiling' }),
      ...spikeRow(1800, 3, 44),
      block(2100, G - 40),
      ...spikeRow(2300, 4, 40),
      spike(2600, { mounted: 'ceiling' }),
      block(2800, G - 40, 100, 40),
      ...spikeRow(3050, 3, 42),
      block(3300, G - 160),
      spike(3500, { mounted: 'ceiling' }),
      spike(3560, { mounted: 'ceiling' }),
      ...spikeRow(3750, 3, 40),
      block(4000, G - 40), block(4060, G - 40),
    ],
    portals: [
      gravityPortal(1050, -1),
      speedPortal(1250, 1.5),
      gravityPortal(1700, 1),
      speedPortal(2500, 0.7),
      gravityPortal(2700, -1),
      gravityPortal(3050, 1),
      speedPortal(3300, 1.8),
    ],
    decorations: {
      particleDensity: 1.1,
      gears: gearField(500, 4100, (G + C) / 2, 10, 20, 1.6),
    },
  },
  {
    id: 7,
    name: 'Needle Storm',
    tier: 'hard',
    length: 4500,
    lavaTheme: false,
    palette: palette('#180a0a', '#220a0a', '#ff2e2e', '#ff9d2e', '#fff42e', '#ff2e2e', '#ff9d2e'),
    music: buildMusic({ bpm: 158, root: -1, scaleName: 'dark', wave: 'sawtooth', kickEvery: 2 }),
    obstacles: [
      ...spikeRow(600, 4, 40),
      block(850, G - 40),
      ...spikeRow(1050, 5, 38),
      block(1350, G - 80), block(1410, G - 80),
      ...spikeRow(1600, 5, 38),
      block(1900, G - 40),
      ...spikeRow(2100, 6, 36),
      block(2400, G - 120),
      ...spikeRow(2600, 4, 38),
      block(2850, G - 40), block(2910, G - 40),
      ...spikeRow(3100, 5, 36),
      block(3400, G - 160),
      ...spikeRow(3600, 6, 36),
      block(3900, G - 40),
      ...spikeRow(4100, 5, 38),
      block(4350, G - 40), block(4410, G - 40),
    ],
    portals: [
      speedPortal(950, 2),
      speedPortal(2250, 0.8),
      speedPortal(2950, 2),
      speedPortal(4000, 1.4),
    ],
    decorations: {
      particleDensity: 1.2,
      gears: gearField(500, 4400, G - 250, 10, 16, 2),
    },
  },
  {
    id: 8,
    name: 'Blackout Run',
    tier: 'hard',
    length: 4700,
    lavaTheme: false,
    palette: palette('#050308', '#0a0512', '#b026ff', '#5a1fb8', '#2ee6ff', '#b026ff', '#5a1fb8'),
    music: buildMusic({ bpm: 165, root: -3, scaleName: 'dark', wave: 'square', kickEvery: 2 }),
    obstacles: [
      ...spikeRow(600, 4, 38),
      block(850, G - 40),
      spike(1050, { mounted: 'ceiling' }),
      ...spikeRow(1200, 5, 36),
      block(1500, C, 60, 40),
      spike(1700, { mounted: 'ceiling' }),
      ...spikeRow(1900, 5, 36),
      block(2200, G - 120),
      ...spikeRow(2450, 6, 34),
      spike(2750, { mounted: 'ceiling' }),
      block(2950, G - 40),
      ...spikeRow(3150, 5, 36),
      block(3450, G - 160),
      spike(3650, { mounted: 'ceiling' }),
      spike(3710, { mounted: 'ceiling' }),
      ...spikeRow(3900, 6, 34),
      block(4200, G - 40), block(4260, G - 40),
      ...spikeRow(4450, 4, 36),
    ],
    portals: [
      gravityPortal(950, -1),
      speedPortal(1350, 1.6),
      gravityPortal(1850, 1),
      gravityPortal(2650, -1),
      speedPortal(3050, 2),
      gravityPortal(3550, 1),
    ],
    decorations: {
      particleDensity: 0.9,
      gears: gearField(500, 4600, (G + C) / 2, 9, 18, 2.2),
    },
  },
  {
    id: 9,
    name: 'Molten Core',
    tier: 'hard',
    lavaTheme: true,
    length: 5000,
    palette: palette('#1a0500', '#280800', '#ff4d1a', '#ff9d2e', '#fff42e', '#ff4d1a', '#ff2e2e'),
    music: buildMusic({ bpm: 170, root: -4, scaleName: 'dark', wave: 'sawtooth', kickEvery: 2 }),
    obstacles: [
      ...spikeRow(600, 4, 38),
      block(850, G - 40),
      spike(1050, { mounted: 'ceiling' }),
      ...spikeRow(1200, 5, 34),
      block(1500, C, 60, 40),
      spike(1700, { mounted: 'ceiling' }),
      spike(1760, { mounted: 'ceiling' }),
      ...spikeRow(1950, 6, 34),
      block(2250, G - 120),
      ...spikeRow(2500, 5, 34),
      spike(2750, { mounted: 'ceiling' }),
      block(2950, G - 40),
      ...spikeRow(3150, 6, 32),
      block(3450, G - 160),
      spike(3650, { mounted: 'ceiling' }),
      spike(3710, { mounted: 'ceiling' }),
      spike(3770, { mounted: 'ceiling' }),
      ...spikeRow(3950, 6, 32),
      block(4250, G - 40), block(4310, G - 40),
      ...spikeRow(4500, 5, 34),
      block(4750, G - 40),
      ...spikeRow(4900, 3, 32),
    ],
    portals: [
      gravityPortal(950, -1),
      speedPortal(1350, 1.8),
      gravityPortal(1900, 1),
      gravityPortal(2650, -1),
      speedPortal(3050, 2.2),
      gravityPortal(3550, 1),
      speedPortal(4200, 1.6),
    ],
    decorations: {
      particleDensity: 1.4,
      gears: gearField(500, 4900, G - 260, 10, 20, 2.4),
    },
  },
  {
    id: 10,
    name: 'Final Ascent',
    tier: 'hard',
    lavaTheme: false,
    length: 5400,
    palette: palette('#0a0a0a', '#140a1e', '#ff2e2e', '#ff9d2e', '#fff42e', '#ff2e2e', '#2ee6ff'),
    music: buildMusic({ bpm: 176, root: -2, scaleName: 'dark', wave: 'sawtooth', kickEvery: 2 }),
    obstacles: [
      ...spikeRow(600, 4, 36),
      block(850, G - 40),
      spike(1050, { mounted: 'ceiling' }),
      ...spikeRow(1200, 5, 34),
      block(1500, C, 60, 40),
      spike(1700, { mounted: 'ceiling' }),
      ...spikeRow(1900, 6, 32),
      block(2200, G - 120),
      ...spikeRow(2450, 6, 32),
      spike(2750, { mounted: 'ceiling' }),
      spike(2810, { mounted: 'ceiling' }),
      block(3000, G - 40),
      ...spikeRow(3200, 6, 32),
      block(3500, G - 160),
      spike(3700, { mounted: 'ceiling' }),
      ...spikeRow(3900, 7, 30),
      block(4200, G - 40), block(4260, G - 40),
      ...spikeRow(4450, 6, 32),
      block(4750, G - 120),
      spike(4950, { mounted: 'ceiling' }),
      ...spikeRow(5100, 6, 30),
      block(5350, G - 40),
    ],
    portals: [
      gravityPortal(950, -1),
      speedPortal(1350, 2),
      gravityPortal(1850, 1),
      gravityPortal(2650, -1),
      speedPortal(3050, 2.4),
      gravityPortal(3550, 1),
      speedPortal(4100, 3),
      gravityPortal(4650, -1),
      gravityPortal(4900, 1),
      speedPortal(5050, 3),
    ],
    decorations: {
      particleDensity: 1.5,
      gears: gearField(500, 5300, (G + C) / 2, 12, 22, 2.6),
    },
  },
];
