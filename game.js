// ---------------------------------------------------------------------------
// Geometry Dash clone — core engine: state machine, physics (incl. gravity
// flip + speed portals), collision, rendering, persistence.
// Depends on globals from levels.js (VIEW_W, VIEW_H, GROUND_Y, CEILING_Y,
// LEVELS), skins.js (SKINS, getSkinById, isSkinUnlocked) and audio.js
// (MusicEngine), all loaded before this file.
// ---------------------------------------------------------------------------

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const menuOverlay = document.getElementById('menu-overlay');
const levelGridEl = document.getElementById('level-grid');
const openManualBtn = document.getElementById('open-manual-btn');
const manualOverlay = document.getElementById('manual-overlay');
const closeManualBtn = document.getElementById('close-manual-btn');
const openSkinsBtn = document.getElementById('open-skins-btn');
const openMakerBtn = document.getElementById('open-maker-btn');
const customListEl = document.getElementById('custom-list');
const skinOverlay = document.getElementById('skin-overlay');
const skinGridEl = document.getElementById('skin-grid');
const closeSkinsBtn = document.getElementById('close-skins-btn');
const winOverlay = document.getElementById('win-overlay');
const winAttemptsEl = document.getElementById('win-attempts');
const nextLevelBtn = document.getElementById('next-level-btn');
const backToEditorBtn = document.getElementById('back-to-editor-btn');
const levelSelectBtn = document.getElementById('level-select-btn');
const progressFill = document.getElementById('progress-fill');
const deathCountEl = document.getElementById('death-count');
const levelLabelEl = document.getElementById('level-label');
const muteBtn = document.getElementById('mute-btn');
const menuBtn = document.getElementById('menu-btn');
const autoplayBtn = document.getElementById('autoplay-btn');
const toastEl = document.getElementById('toast');

const editorOverlay = document.getElementById('editor-overlay');
const editorNameInput = document.getElementById('editor-name-input');
const editorPaletteSelect = document.getElementById('editor-palette-select');
const editorSpeedSelect = document.getElementById('editor-speed-select');
const editorScrollReadout = document.getElementById('editor-scroll-readout');
const editorScrollPrevBtn = document.getElementById('editor-scroll-prev');
const editorScrollNextBtn = document.getElementById('editor-scroll-next');
const editorExtendBtn = document.getElementById('editor-extend-btn');
const editorTestBtn = document.getElementById('editor-test-btn');
const editorSaveBtn = document.getElementById('editor-save-btn');
const editorBackBtn = document.getElementById('editor-back-btn');
const editorToolBtns = document.querySelectorAll('.editor-tool-btn');

// --- constant physics config -----------------------------------------------

const PLAYER_SIZE = 38;
const PLAYER_SCREEN_X = 220;
const GRAVITY = 2200;
const JUMP_VELOCITY = -760;
const MAX_FALL_SPEED = 1400;
const SCROLL_SPEED = 380;
const ROTATION_SPEED = 540;

const NEON = {
  green: '#39ff6a',
  blue: '#2ee6ff',
  pink: '#ff2ea6',
  orange: '#ff9d2e',
  yellow: '#fff42e',
  purple: '#b026ff',
  red: '#ff2e2e',
};

// --- persistence -------------------------------------------------------

const SAVE_KEY = 'gdclone_save_v1';

function defaultSave() {
  return {
    version: 1,
    completedLevels: [],
    currentSpikeStreak: 0,
    bestSpikeStreak: 0,
    unlockedSkins: ['default'],
    selectedSkin: 'default',
    customLevels: [],
    muted: false,
    volume: 0.15,
  };
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1) return defaultSave();
    return Object.assign(defaultSave(), parsed);
  } catch (e) {
    return defaultSave();
  }
}

function persistSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {
    /* ignore quota/private-mode errors */
  }
}

const save = loadSave();
MusicEngine.setMuted(save.muted);

// --- game state ----------------------------------------------------------

let state = 'menu'; // 'menu' | 'skins' | 'editor' | 'playing' | 'dead' | 'win'
let currentLevelIndex = 0;
let level = null;
let obstacles = [];
let portals = [];
let pickups = []; // level-editor-placed "Godzilla" pickups (destroy every block on touch)
let ambientParticles = [];
let deathParticles = [];
let deathCount = 0;
let gravityDir = 1;
let speedMult = 1;
let elapsedTime = 0;
let beatFlashIntensity = 0;
let toast = null;
let autoplay = false;
const AUTOPLAY_LOOKAHEAD = 95; // px ahead of the player's leading edge to watch for obstacles

// --- cheat codes: typed anywhere in-game, keyed by the word typed ---------
let cheatActive = false; // "cheat": easier mode (slower run + forgiving hitbox)
const CHEAT_SPEED_MULT = 0.75;
const CHEAT_HITBOX_INSET = 9;

const CHEAT_CODES = [
  { word: 'cheat', action: toggleCheat },
  { word: 'master', action: activateMasterCode },
  { word: 'goji', action: activateGojiCode },
];
const MAX_CHEAT_LEN = Math.max(...CHEAT_CODES.map((c) => c.word.length));
let cheatBuffer = [];

function handleCheatKey(code) {
  if (!code.startsWith('Key')) return;
  cheatBuffer.push(code.slice(3).toLowerCase());
  if (cheatBuffer.length > MAX_CHEAT_LEN) cheatBuffer.shift();
  const typed = cheatBuffer.join('');
  for (const cheatCode of CHEAT_CODES) {
    if (typed.endsWith(cheatCode.word)) {
      cheatBuffer = [];
      cheatCode.action();
      return;
    }
  }
}

function toggleCheat() {
  cheatActive = !cheatActive;
  if (cheatActive) {
    let newlyUnlocked = false;
    for (const skin of SKINS) {
      if (skin.unlock && skin.unlock.type === 'cheat') continue; // secret skins aren't part of this one
      if (!save.unlockedSkins.includes(skin.id)) {
        save.unlockedSkins.push(skin.id);
        newlyUnlocked = true;
      }
    }
    persistSave();
    showToast(newlyUnlocked ? 'CHEAT ACTIVATED — all skins unlocked + easy mode on!' : 'CHEAT ACTIVATED — easy mode on!');
  } else {
    showToast('Cheat mode off');
  }
  refreshOpenMenus();
}

function activateMasterCode() {
  for (const lvl of LEVELS) {
    if (!save.completedLevels.includes(lvl.id)) save.completedLevels.push(lvl.id);
  }
  checkSkinUnlocks();
  persistSave();
  showToast('MASTER CODE — every level marked complete!');
  refreshOpenMenus();
}

function activateGojiCode() {
  if (!save.unlockedSkins.includes('ultra-godzilla')) {
    save.unlockedSkins.push('ultra-godzilla');
    persistSave();
    showToast('GOJI — Ultra Godzilla unlocked! Equip it in Skins.');
  } else {
    showToast('Ultra Godzilla already unlocked.');
  }
  refreshOpenMenus();
}

function refreshOpenMenus() {
  if (!menuOverlay.classList.contains('hidden')) {
    buildLevelGrid();
    buildCustomLevelList();
  }
  if (!skinOverlay.classList.contains('hidden')) buildSkinGrid();
}

function isInvincible() {
  // Ultra Godzilla's rampage cheat, or autoplay's completion guarantee —
  // either way, obstacles get destroyed instead of killing the player.
  return state === 'playing' && (autoplay || save.selectedSkin === 'ultra-godzilla');
}

function obstacleCenter(obs) {
  if (obs.type === 'spike') {
    const cy = obs.mounted === 'ceiling' ? CEILING_Y + obs.h / 2 : GROUND_Y - obs.h / 2;
    return { x: obs.x + obs.w / 2, y: cy };
  }
  return { x: obs.x + obs.w / 2, y: obs.y + obs.h / 2 };
}

// --- level editor --------------------------------------------------------
// Custom levels are plain data shaped exactly like the hand-built ones in
// LEVELS (obstacles/portals/pickups/palette/music/decorations), just kept
// in save.customLevels (unlimited — no cap on count, length, or object
// count) instead of the static array. tier:'custom' is what distinguishes
// them from the 10 built-in levels wherever that matters (next-level
// button, HUD label) — ids can't be used for that since a level being
// test-played before its first save has no id yet.

const EDITOR_PALETTES = [
  { name: 'Neon Blue', palette: palette('#0a0a14', '#0d1420', '#39ff6a', '#2ee6ff', '#fff42e', '#ff9d2e', '#39ff6a') },
  { name: 'Fire', palette: palette('#1a0500', '#280800', '#ff4d1a', '#ff9d2e', '#fff42e', '#ff4d1a', '#ff2e2e') },
  { name: 'Toxic Green', palette: palette('#061208', '#0a1a0c', '#39ff6a', '#2fae52', '#fff42e', '#39ff6a', '#2fae52') },
  { name: 'Purple Haze', palette: palette('#100a18', '#160a22', '#b026ff', '#ff2ea6', '#2ee6ff', '#b026ff', '#ff2ea6') },
  { name: 'Blackout', palette: palette('#050308', '#0a0512', '#b026ff', '#5a1fb8', '#2ee6ff', '#b026ff', '#5a1fb8') },
];

let editorLevel = null;
let editingCustomId = null; // null while creating a brand-new level; set while editing a saved one
let editorScrollX = 0;
let editorTool = 'spike';
let editorSpeedMult = 1.5;
const EDITOR_GRID = 20; // px snap for placement

function createBlankCustomLevel() {
  return {
    id: null,
    name: 'My Level',
    tier: 'custom',
    length: 3000,
    palette: EDITOR_PALETTES[0].palette,
    music: buildMusic({ bpm: 140, root: 0, scaleName: 'major', wave: 'square', kickEvery: 4 }),
    obstacles: [],
    portals: [],
    pickups: [],
    decorations: { particleDensity: 0.5, gears: [] },
  };
}

function cloneCustomLevel(customLevel) {
  return JSON.parse(JSON.stringify(customLevel)); // safe: custom levels are plain data, no functions
}

function updateEditorToolButtons() {
  editorToolBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.tool === editorTool));
}

function updateEditorReadout() {
  editorScrollReadout.textContent = `${Math.round(editorScrollX)} / ${editorLevel.length}px`;
}

function openEditor(existingCustom) {
  if (respawnTimer) {
    clearTimeout(respawnTimer);
    respawnTimer = null;
  }
  MusicEngine.stop();
  editingCustomId = existingCustom ? existingCustom.id : null;
  editorLevel = existingCustom ? cloneCustomLevel(existingCustom) : createBlankCustomLevel();
  editorScrollX = 0;
  editorTool = 'spike';
  ambientParticles = [];
  level = editorLevel;
  obstacles = editorLevel.obstacles;
  portals = editorLevel.portals;
  pickups = editorLevel.pickups;
  state = 'editor';

  editorNameInput.value = editorLevel.name;
  const paletteIdx = EDITOR_PALETTES.findIndex((p) => JSON.stringify(p.palette) === JSON.stringify(editorLevel.palette));
  editorPaletteSelect.value = String(paletteIdx === -1 ? 0 : paletteIdx);
  levelLabelEl.textContent = `Editing: ${editorLevel.name}`;
  updateEditorToolButtons();
  updateEditorReadout();

  menuOverlay.classList.add('hidden');
  skinOverlay.classList.add('hidden');
  winOverlay.classList.add('hidden');
  editorOverlay.classList.remove('hidden');
}

function saveEditorLevel() {
  const name = editorNameInput.value.trim() || 'Untitled Level';
  editorLevel.name = name;
  if (editingCustomId) {
    const idx = save.customLevels.findIndex((l) => l.id === editingCustomId);
    if (idx !== -1) save.customLevels[idx] = editorLevel;
  } else {
    editorLevel.id = `custom-${Date.now()}`;
    editingCustomId = editorLevel.id;
    save.customLevels.push(editorLevel);
  }
  persistSave();
  showToast(`Saved "${name}"`);
  buildCustomLevelList();
  levelLabelEl.textContent = `Editing: ${editorLevel.name}`;
}

function testEditorLevel() {
  editorLevel.name = editorNameInput.value.trim() || 'Untitled Level';
  beginLevel(editorLevel, null);
}

function snapBlockHeight(clickY) {
  const lanes = [GROUND_Y - 40, GROUND_Y - 80, GROUND_Y - 120, GROUND_Y - 160, CEILING_Y];
  let best = lanes[0];
  let bestDist = Infinity;
  for (const y of lanes) {
    const d = Math.abs(y - clickY);
    if (d < bestDist) {
      bestDist = d;
      best = y;
    }
  }
  return best;
}

function handleEditorPlace(worldX, clickY) {
  if (editorTool === 'eraser') {
    eraseNearEditor(worldX);
    return;
  }
  if (editorTool === 'spike') {
    const mounted = clickY < (GROUND_Y + CEILING_Y) / 2 ? 'ceiling' : 'ground';
    editorLevel.obstacles.push({ type: 'spike', x: worldX, w: 40, h: 40, mounted });
  } else if (editorTool === 'block') {
    editorLevel.obstacles.push({ type: 'block', x: worldX, y: snapBlockHeight(clickY), w: 40, h: 40 });
  } else if (editorTool === 'gravity-down') {
    editorLevel.portals.push({ type: 'gravity', x: worldX, dir: -1, triggered: false });
  } else if (editorTool === 'gravity-up') {
    editorLevel.portals.push({ type: 'gravity', x: worldX, dir: 1, triggered: false });
  } else if (editorTool === 'speed') {
    editorLevel.portals.push({ type: 'speed', x: worldX, mult: editorSpeedMult, triggered: false });
  } else if (editorTool === 'godzilla') {
    editorLevel.pickups.push({ type: 'godzilla', x: worldX, y: GROUND_Y - 40, w: 40, h: 40, _consumed: false });
  }
  if (worldX + 400 > editorLevel.length) {
    editorLevel.length = worldX + 400;
    updateEditorReadout();
  }
}

function eraseNearEditor(worldX) {
  const tolerance = 25;
  const collections = [editorLevel.obstacles, editorLevel.portals, editorLevel.pickups];
  for (const arr of collections) {
    let closestIdx = -1;
    let closestDist = tolerance;
    arr.forEach((o, i) => {
      const d = Math.abs(o.x - worldX);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    });
    if (closestIdx !== -1) {
      arr.splice(closestIdx, 1);
      return;
    }
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function loadCustomLevel(customId) {
  const custom = save.customLevels.find((l) => l.id === customId);
  if (custom) beginLevel(custom, null);
}

function deleteCustomLevel(customId) {
  const lvl = save.customLevels.find((l) => l.id === customId);
  if (!lvl) return;
  if (!confirm(`Delete "${lvl.name}"? This can't be undone.`)) return;
  save.customLevels = save.customLevels.filter((l) => l.id !== customId);
  persistSave();
  buildCustomLevelList();
  showToast('Level deleted.');
}

function buildCustomLevelList() {
  customListEl.innerHTML = '';
  if (save.customLevels.length === 0) {
    customListEl.innerHTML = '<p class="hint-small">No custom levels yet — try the Level Maker!</p>';
    return;
  }
  save.customLevels.forEach((custom) => {
    const cleared = save.completedLevels.includes(custom.id);
    const row = document.createElement('div');
    row.className = `custom-row${cleared ? ' cleared' : ''}`;
    row.innerHTML =
      '<div class="custom-info">' +
      `<div class="custom-name">${escapeHtml(custom.name)}</div>` +
      `<div class="custom-status">${cleared ? 'Cleared' : 'Not cleared'}</div>` +
      '</div>' +
      '<button type="button" class="custom-edit-btn">Edit</button>' +
      '<button type="button" class="custom-delete-btn">Delete</button>';
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      loadCustomLevel(custom.id);
    });
    row.querySelector('.custom-edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openEditor(custom);
    });
    row.querySelector('.custom-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCustomLevel(custom.id);
    });
    customListEl.appendChild(row);
  });
}

const player = {
  worldX: 0,
  y: GROUND_Y - PLAYER_SIZE,
  vy: 0,
  size: PLAYER_SIZE,
  rotation: 0,
  grounded: true,
};

function activePalette() {
  return level ? level.palette : LEVELS[0].palette;
}

// --- level lifecycle -----------------------------------------------------

function generateAmbientParticles() {
  ambientParticles = [];
  const count = Math.round((level.length / 300) * level.decorations.particleDensity);
  for (let i = 0; i < count; i++) {
    ambientParticles.push({
      worldX: Math.random() * level.length,
      y: CEILING_Y + Math.random() * (GROUND_Y - CEILING_Y),
      r: 1 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

function resetPlayerAndRuntime() {
  player.worldX = 0;
  player.y = GROUND_Y - player.size;
  player.vy = 0;
  player.rotation = 0;
  player.grounded = true;
  gravityDir = 1;
  speedMult = 1;
  portals.forEach((p) => (p.triggered = false));
  obstacles.forEach((o) => {
    if (o.type === 'spike') o._passed = false;
    o._destroyed = false;
  });
  pickups.forEach((p) => (p._consumed = false));
  deathParticles = [];
}

function beginLevel(levelObj, idx) {
  if (respawnTimer) {
    clearTimeout(respawnTimer);
    respawnTimer = null;
  }
  currentLevelIndex = idx;
  level = levelObj;
  obstacles = level.obstacles;
  portals = level.portals;
  pickups = level.pickups || [];
  deathCount = 0;
  deathCountEl.textContent = '0';
  levelLabelEl.textContent =
    level.tier === 'custom' ? `Custom: ${level.name}`
    : (level.tier === 'beginner' || level.tier === 'pro') ? level.name
    : `${level.id}. ${level.name}`;
  generateAmbientParticles();
  resetPlayerAndRuntime();
  MusicEngine.playLevel(level);
  state = 'playing';
  menuOverlay.classList.add('hidden');
  skinOverlay.classList.add('hidden');
  editorOverlay.classList.add('hidden');
  winOverlay.classList.add('hidden');
}

function loadLevel(idx) {
  beginLevel(LEVELS[idx], idx);
}

function openMenu() {
  if (respawnTimer) {
    clearTimeout(respawnTimer);
    respawnTimer = null;
  }
  state = 'menu';
  level = null;
  MusicEngine.stop();
  buildLevelGrid();
  buildCustomLevelList();
  winOverlay.classList.add('hidden');
  skinOverlay.classList.add('hidden');
  manualOverlay.classList.add('hidden');
  editorOverlay.classList.add('hidden');
  menuOverlay.classList.remove('hidden');
}

function openSkins() {
  buildSkinGrid();
  skinOverlay.classList.remove('hidden');
}

function closeSkins() {
  skinOverlay.classList.add('hidden');
}

function openManual() {
  manualOverlay.classList.remove('hidden');
}

function closeManual() {
  manualOverlay.classList.add('hidden');
}

// --- menu / skin grids -------------------------------------------------

function buildLevelGrid() {
  levelGridEl.innerHTML = '';
  LEVELS.forEach((lvl, idx) => {
    const done = save.completedLevels.includes(lvl.id);
    const isExtra = lvl.tier === 'beginner' || lvl.tier === 'pro';
    const card = document.createElement('div');
    card.className = `level-card tier-${lvl.tier}`;
    card.innerHTML =
      `<div class="level-card-num">${isExtra ? 'EXTRA' : lvl.id}</div>` +
      `<div class="level-card-name">${lvl.name}</div>` +
      `<div class="level-card-tier">${lvl.tier}</div>` +
      (done ? '<div class="level-card-done">Cleared</div>' : '');
    card.addEventListener('click', () => loadLevel(idx));
    levelGridEl.appendChild(card);
  });
}

function buildSkinGrid() {
  skinGridEl.innerHTML = '';
  SKINS.forEach((skin) => {
    const unlocked = save.unlockedSkins.includes(skin.id);
    const selected = save.selectedSkin === skin.id;
    const card = document.createElement('div');
    card.className = `skin-card${unlocked ? '' : ' locked'}${selected ? ' selected' : ''}`;
    card.innerHTML =
      '<canvas class="skin-preview" width="72" height="72"></canvas>' +
      `<div class="skin-name">${skin.name}</div>` +
      `<div class="skin-desc">${unlocked ? skin.description : skin.unlock.text}</div>`;
    if (unlocked) {
      card.addEventListener('click', () => {
        save.selectedSkin = skin.id;
        persistSave();
        buildSkinGrid();
      });
    }
    skinGridEl.appendChild(card);
    const pctx = card.querySelector('canvas').getContext('2d');
    pctx.save();
    pctx.translate(36, 36);
    if (!unlocked) pctx.globalAlpha = 0.35;
    skin.draw(pctx, 44, elapsedTime);
    pctx.restore();
  });
}

// --- input -----------------------------------------------------------------

let jumpQueued = false;

function isTypingIntoField() {
  const tag = document.activeElement && document.activeElement.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
}

window.addEventListener('keydown', (e) => {
  if (isTypingIntoField()) return; // don't hijack typing into the level-name field, etc.
  handleCheatKey(e.code);
  if (e.code === 'Space') {
    e.preventDefault();
    if (state === 'playing') jumpQueued = true;
  } else if (e.code === 'KeyR') {
    if (level && state !== 'editor') beginLevel(level, currentLevelIndex);
  } else if (e.code === 'Escape') {
    if (state === 'playing' || state === 'dead') openMenu();
  }
});
canvas.addEventListener('mousedown', () => {
  if (state === 'playing') jumpQueued = true;
});
canvas.addEventListener(
  'touchstart',
  (e) => {
    e.preventDefault();
    if (state === 'playing') jumpQueued = true;
  },
  { passive: false }
);

openSkinsBtn.addEventListener('click', openSkins);
closeSkinsBtn.addEventListener('click', closeSkins);
openManualBtn.addEventListener('click', openManual);
closeManualBtn.addEventListener('click', closeManual);

// --- level editor UI wiring ---------------------------------------------

EDITOR_PALETTES.forEach((p, i) => {
  const opt = document.createElement('option');
  opt.value = String(i);
  opt.textContent = p.name;
  editorPaletteSelect.appendChild(opt);
});

openMakerBtn.addEventListener('click', () => openEditor(null));

editorToolBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    editorTool = btn.dataset.tool;
    updateEditorToolButtons();
  });
});

editorPaletteSelect.addEventListener('change', () => {
  editorLevel.palette = EDITOR_PALETTES[Number(editorPaletteSelect.value)].palette;
});

editorSpeedSelect.addEventListener('change', () => {
  editorSpeedMult = parseFloat(editorSpeedSelect.value);
});

editorNameInput.addEventListener('input', () => {
  editorLevel.name = editorNameInput.value;
  levelLabelEl.textContent = `Editing: ${editorLevel.name || 'Untitled'}`;
});

editorScrollPrevBtn.addEventListener('click', () => {
  editorScrollX = Math.max(0, editorScrollX - 400);
  updateEditorReadout();
});
editorScrollNextBtn.addEventListener('click', () => {
  editorScrollX = Math.min(Math.max(0, editorLevel.length - VIEW_W + 200), editorScrollX + 400);
  updateEditorReadout();
});
editorExtendBtn.addEventListener('click', () => {
  editorLevel.length += 500;
  updateEditorReadout();
  showToast(`Level length: ${editorLevel.length}px`);
});

editorTestBtn.addEventListener('click', testEditorLevel);
editorSaveBtn.addEventListener('click', saveEditorLevel);
editorBackBtn.addEventListener('click', openMenu);

canvas.addEventListener('click', (e) => {
  if (state !== 'editor') return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = VIEW_W / rect.width;
  const scaleY = VIEW_H / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;
  const worldX = Math.max(0, Math.round((clickX + editorScrollX) / EDITOR_GRID) * EDITOR_GRID);
  handleEditorPlace(worldX, clickY);
});
nextLevelBtn.addEventListener('click', () => {
  if (level && level.tier === 'custom') {
    openMenu();
    return;
  }
  const nextIdx = currentLevelIndex + 1;
  if (nextIdx < LEVELS.length) loadLevel(nextIdx);
  else openMenu();
});
backToEditorBtn.addEventListener('click', () => {
  if (level && level.tier === 'custom') openEditor(level);
});
levelSelectBtn.addEventListener('click', openMenu);
menuBtn.addEventListener('click', () => {
  if (state === 'playing' || state === 'dead' || state === 'editor') openMenu();
});
autoplayBtn.addEventListener('click', () => {
  autoplay = !autoplay;
  autoplayBtn.textContent = `Autoplay: ${autoplay ? 'On' : 'Off'}`;
  autoplayBtn.classList.toggle('active', autoplay);
});
muteBtn.addEventListener('click', () => {
  save.muted = !save.muted;
  MusicEngine.setMuted(save.muted);
  persistSave();
  updateMuteButton();
});

function updateMuteButton() {
  muteBtn.textContent = save.muted ? 'Sound: Off' : 'Sound: On';
}
updateMuteButton();

// --- collision helpers -------------------------------------------------

function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function polygonsIntersect(polyA, polyB) {
  const polys = [polyA, polyB];
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      const normal = { x: p2.y - p1.y, y: -(p2.x - p1.x) };

      let minA = Infinity, maxA = -Infinity;
      for (const p of polyA) {
        const proj = p.x * normal.x + p.y * normal.y;
        minA = Math.min(minA, proj);
        maxA = Math.max(maxA, proj);
      }
      let minB = Infinity, maxB = -Infinity;
      for (const p of polyB) {
        const proj = p.x * normal.x + p.y * normal.y;
        minB = Math.min(minB, proj);
        maxB = Math.max(maxB, proj);
      }
      if (maxA < minB || maxB < minA) return false;
    }
  }
  return true;
}

function spikeTriangle(o) {
  if (o.mounted === 'ceiling') {
    return [
      { x: o.x, y: CEILING_Y },
      { x: o.x + o.w, y: CEILING_Y },
      { x: o.x + o.w / 2, y: CEILING_Y + o.h },
    ];
  }
  return [
    { x: o.x, y: GROUND_Y },
    { x: o.x + o.w, y: GROUND_Y },
    { x: o.x + o.w / 2, y: GROUND_Y - o.h },
  ];
}

function playerHitboxWorld() {
  const inset = cheatActive ? CHEAT_HITBOX_INSET : 5;
  return {
    x: player.worldX + inset,
    y: player.y + inset,
    w: player.size - inset * 2,
    h: player.size - inset * 2,
  };
}

function playerPolygon() {
  const box = playerHitboxWorld();
  return [
    { x: box.x, y: box.y },
    { x: box.x + box.w, y: box.y },
    { x: box.x + box.w, y: box.y + box.h },
    { x: box.x, y: box.y + box.h },
  ];
}

function nearbyObstacles() {
  const lo = player.worldX - 100;
  const hi = player.worldX + 300;
  return obstacles.filter((o) => o.x + (o.w || 40) >= lo && o.x <= hi);
}

// --- death particles -----------------------------------------------------

function spawnExplosion(worldX, y) {
  const pal = activePalette();
  const colors = [pal.primary, pal.secondary, pal.accent, NEON.yellow];
  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 260;
    deathParticles.push({
      worldX,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.4,
      age: 0,
      size: 3 + Math.random() * 4,
      color: colors[(Math.random() * colors.length) | 0],
    });
  }
}

function updateDeathParticles(dt) {
  for (const p of deathParticles) {
    p.age += dt;
    p.worldX += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 900 * dt;
  }
  deathParticles = deathParticles.filter((p) => p.age < p.life);
}

// --- toast -----------------------------------------------------------------

function showToast(text) {
  toast = { text, timer: 3 };
  toastEl.textContent = text;
  toastEl.classList.remove('hidden');
}

function updateToast(dt) {
  if (!toast) return;
  toast.timer -= dt;
  if (toast.timer <= 0) {
    toast = null;
    toastEl.classList.add('hidden');
  }
}

// --- skin unlocks ------------------------------------------------------

function checkSkinUnlocks() {
  for (const skin of SKINS) {
    if (save.unlockedSkins.includes(skin.id)) continue;
    if (isSkinUnlocked(skin, save)) {
      save.unlockedSkins.push(skin.id);
      showToast(`Skin unlocked: ${skin.name}!`);
    }
  }
}

// --- death / respawn ---------------------------------------------------

let respawnTimer = null;

function die() {
  if (state !== 'playing') return;
  state = 'dead';
  deathCount++;
  deathCountEl.textContent = String(deathCount);
  save.currentSpikeStreak = 0;
  persistSave();
  spawnExplosion(player.worldX + player.size / 2, player.y + player.size / 2);
  respawnTimer = setTimeout(() => {
    respawnTimer = null;
    resetPlayerAndRuntime();
    state = 'playing';
  }, 500);
}

function winLevel() {
  state = 'win';
  MusicEngine.stop();
  if (level.id != null && !save.completedLevels.includes(level.id)) {
    save.completedLevels.push(level.id);
  }
  checkSkinUnlocks();
  persistSave();
  winAttemptsEl.textContent = `Attempts: ${deathCount + 1}`;
  const isLastMainLevel = level.tier !== 'custom' && currentLevelIndex + 1 >= LEVELS.length;
  nextLevelBtn.classList.toggle('hidden', level.tier === 'custom' || isLastMainLevel);
  backToEditorBtn.classList.toggle('hidden', level.tier !== 'custom');
  winOverlay.classList.remove('hidden');
}

// --- portals ---------------------------------------------------------------

function checkPortals() {
  for (const p of portals) {
    if (!p.triggered && player.worldX >= p.x) {
      p.triggered = true;
      if (p.type === 'gravity') gravityDir = p.dir;
      else if (p.type === 'speed') speedMult = p.mult;
    }
  }
}

// --- physics update ------------------------------------------------------

function resolveBlockCollisions(prevBottom, prevTop) {
  let landed = false;
  const invincible = isInvincible();
  for (const obs of nearbyObstacles()) {
    if (obs.type !== 'block' || obs._destroyed) continue;
    if (!aabbOverlap(player.worldX, player.y, player.size, player.size, obs.x, obs.y, obs.w, obs.h)) continue;

    if (invincible) {
      obs._destroyed = true;
      const c = obstacleCenter(obs);
      spawnExplosion(c.x, c.y);
      continue;
    }

    const approaching = gravityDir === 1 ? player.vy >= 0 : player.vy <= 0;
    const landSurface = gravityDir === 1 ? obs.y : obs.y + obs.h;
    const wasClear = gravityDir === 1 ? prevBottom <= landSurface + 1 : prevTop >= landSurface - 1;

    if (approaching && wasClear) {
      player.y = gravityDir === 1 ? landSurface - player.size : landSurface;
      player.vy = 0;
      player.grounded = true;
      landed = true;
    } else {
      die();
      return landed;
    }
  }
  return landed;
}

function resolveGroundCeiling(landedOnBlock) {
  if (gravityDir === 1) {
    if (!landedOnBlock) {
      if (player.y + player.size >= GROUND_Y) {
        player.y = GROUND_Y - player.size;
        player.vy = 0;
        player.grounded = true;
      } else {
        player.grounded = false;
      }
    }
    if (player.y <= CEILING_Y) {
      player.y = CEILING_Y;
      if (player.vy < 0) player.vy = 0;
    }
  } else {
    if (!landedOnBlock) {
      if (player.y <= CEILING_Y) {
        player.y = CEILING_Y;
        player.vy = 0;
        player.grounded = true;
      } else {
        player.grounded = false;
      }
    }
    if (player.y + player.size >= GROUND_Y) {
      player.y = GROUND_Y - player.size;
      if (player.vy > 0) player.vy = 0;
    }
  }
}

// Simple lookahead bot: jump whenever any obstacle's near edge falls within
// a fixed window ahead of the player while grounded. Not a real solver —
// it doesn't distinguish spikes from safe-to-land blocks or plan multi-jump
// sequences, it just reacts to what's immediately ahead.
function maybeAutoJump() {
  const frontX = player.worldX + player.size;
  for (const obs of obstacles) {
    if (obs.x >= frontX && obs.x <= frontX + AUTOPLAY_LOOKAHEAD) {
      jumpQueued = true;
      return;
    }
  }
}

function updatePlaying(dt) {
  player.worldX += SCROLL_SPEED * speedMult * (cheatActive ? CHEAT_SPEED_MULT : 1) * dt;
  checkPortals();

  if (player.worldX >= level.length) {
    winLevel();
    return;
  }

  if (autoplay && player.grounded) maybeAutoJump();

  if (jumpQueued) {
    if (player.grounded) {
      player.vy = JUMP_VELOCITY * gravityDir;
      player.grounded = false;
    }
    jumpQueued = false;
  }

  const prevBottom = player.y + player.size;
  const prevTop = player.y;

  player.vy += GRAVITY * gravityDir * dt;
  if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
  if (player.vy < -MAX_FALL_SPEED) player.vy = -MAX_FALL_SPEED;
  player.y += player.vy * dt;

  const landedOnBlock = resolveBlockCollisions(prevBottom, prevTop);
  if (state !== 'playing') return; // died on block impact

  resolveGroundCeiling(landedOnBlock);

  const pPoly = playerPolygon();
  const invincible = isInvincible();
  for (const obs of nearbyObstacles()) {
    if (obs.type !== 'spike' || obs._destroyed) continue;
    if (!obs._passed && player.worldX > obs.x + obs.w) {
      obs._passed = true;
      save.currentSpikeStreak++;
      if (save.currentSpikeStreak > save.bestSpikeStreak) save.bestSpikeStreak = save.currentSpikeStreak;
      checkSkinUnlocks();
      persistSave();
    }
    if (polygonsIntersect(pPoly, spikeTriangle(obs))) {
      if (invincible) {
        obs._destroyed = true;
        const c = obstacleCenter(obs);
        spawnExplosion(c.x, c.y);
        continue;
      }
      die();
      return;
    }
  }

  for (const p of pickups) {
    if (p._consumed) continue;
    if (!aabbOverlap(player.worldX, player.y, player.size, player.size, p.x, p.y, p.w, p.h)) continue;
    p._consumed = true;
    for (const obs of obstacles) {
      if (obs.type === 'block' && !obs._destroyed) {
        obs._destroyed = true;
        const c = obstacleCenter(obs);
        spawnExplosion(c.x, c.y);
      }
    }
    spawnExplosion(p.x + p.w / 2, p.y + p.h / 2);
  }

  if (!player.grounded) {
    player.rotation = (player.rotation + ROTATION_SPEED * gravityDir * dt) % 360;
    if (player.rotation < 0) player.rotation += 360;
  } else {
    const base = gravityDir === 1 ? 0 : 180;
    const rel = player.rotation - base;
    player.rotation = (base + Math.round(rel / 90) * 90) % 360;
    if (player.rotation < 0) player.rotation += 360;
  }

  const pct = Math.min(100, Math.max(0, (player.worldX / level.length) * 100));
  progressFill.style.width = pct.toFixed(1) + '%';

  MusicEngine.tick();
  MusicEngine.drainBeatFlashes(() => {
    beatFlashIntensity = 1;
  });
}

function update(dt) {
  elapsedTime += dt;
  updateToast(dt);
  beatFlashIntensity = Math.max(0, beatFlashIntensity - dt * 3);

  if (state === 'playing') {
    updatePlaying(dt);
  }
  updateDeathParticles(dt);
}

// --- render ------------------------------------------------------------

function cameraX() {
  if (state === 'editor') return editorScrollX;
  return player.worldX - PLAYER_SCREEN_X;
}

function drawBackground(camX) {
  const pal = activePalette();
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, pal.bgTop);
  grad.addColorStop(1, pal.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const wash = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  wash.addColorStop(0, hexToRgba(pal.primary, 0.03 + beatFlashIntensity * 0.1));
  wash.addColorStop(1, hexToRgba(pal.secondary, 0.02 + beatFlashIntensity * 0.08));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.strokeStyle = hexToRgba(pal.primary, 0.08);
  ctx.lineWidth = 1;
  const gridSpacing = 60;
  const offset = -((camX * 0.5) % gridSpacing);
  for (let x = offset; x < VIEW_W; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIEW_H);
    ctx.stroke();
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawGroundAndCeiling(camX) {
  const pal = activePalette();

  ctx.fillStyle = '#12121f';
  ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
  ctx.fillStyle = pal.primary;
  ctx.shadowColor = pal.primary;
  ctx.shadowBlur = 12;
  ctx.fillRect(0, GROUND_Y, VIEW_W, 3);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = hexToRgba(pal.primary, 0.15);
  const tickSpacing = 40;
  const offset = -(camX % tickSpacing);
  for (let x = offset; x < VIEW_W; x += tickSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 6);
    ctx.lineTo(x, VIEW_H);
    ctx.stroke();
  }

  ctx.fillStyle = '#12121f';
  ctx.fillRect(0, 0, VIEW_W, CEILING_Y);
  ctx.fillStyle = pal.secondary;
  ctx.shadowColor = pal.secondary;
  ctx.shadowBlur = 12;
  ctx.fillRect(0, CEILING_Y - 3, VIEW_W, 3);
  ctx.shadowBlur = 0;
}

function drawDecorations(camX) {
  if (!level) return;
  const pal = activePalette();

  for (const gear of level.decorations.gears) {
    const sx = gear.x - camX;
    if (sx < -60 || sx > VIEW_W + 60) continue;
    const angle = elapsedTime * gear.speed;
    ctx.save();
    ctx.translate(sx, gear.y);
    ctx.rotate(angle);
    ctx.strokeStyle = hexToRgba(pal.accent, 0.35);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, gear.r, 0, Math.PI * 2);
    ctx.stroke();
    const teeth = 8;
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * gear.r, Math.sin(a) * gear.r);
      ctx.lineTo(Math.cos(a) * (gear.r + 6), Math.sin(a) * (gear.r + 6));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(pal.accent, 0.35);
    ctx.fill();
    ctx.restore();
  }

  for (const p of ambientParticles) {
    const sx = p.worldX - camX;
    if (sx < -20 || sx > VIEW_W + 20) continue;
    const wobbleY = p.y + Math.sin(elapsedTime * 0.6 + p.phase) * 8;
    ctx.beginPath();
    ctx.fillStyle = hexToRgba(pal.accent, 0.5);
    ctx.shadowColor = pal.accent;
    ctx.shadowBlur = 6;
    ctx.arc(sx, wobbleY, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawPortals(camX) {
  for (const p of portals) {
    const sx = p.x - camX;
    if (sx < -20 || sx > VIEW_W + 20) continue;
    let color;
    if (p.type === 'gravity') color = p.dir === -1 ? NEON.purple : NEON.blue;
    else color = p.mult < 1 ? NEON.blue : p.mult < 1.8 ? NEON.orange : NEON.red;

    ctx.fillStyle = hexToRgba(color, 0.18);
    ctx.fillRect(sx - 6, CEILING_Y, 12, GROUND_Y - CEILING_Y);
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, (GROUND_Y + CEILING_Y) / 2, 14, (GROUND_Y - CEILING_Y) / 2 - 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawObstacles(camX) {
  const pal = activePalette();
  for (const obs of obstacles) {
    if (obs._destroyed) continue;
    const sx = obs.x - camX;
    if (sx + (obs.w || 40) < -40 || sx > VIEW_W + 40) continue;

    if (obs.type === 'spike') {
      const tri = spikeTriangle(obs);
      ctx.beginPath();
      ctx.moveTo(tri[0].x - camX, tri[0].y);
      ctx.lineTo(tri[1].x - camX, tri[1].y);
      ctx.lineTo(tri[2].x - camX, tri[2].y);
      ctx.closePath();
      ctx.fillStyle = pal.spike;
      ctx.shadowColor = pal.spike;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (obs.type === 'block') {
      const sy = obs.y;
      ctx.fillStyle = '#16162a';
      ctx.fillRect(sx, sy, obs.w, obs.h);
      ctx.strokeStyle = pal.block;
      ctx.shadowColor = pal.block;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3;
      ctx.strokeRect(sx + 1.5, sy + 1.5, obs.w - 3, obs.h - 3);
      ctx.shadowBlur = 0;
    }
  }
}

function drawPickups(camX) {
  for (const p of pickups) {
    if (p._consumed) continue;
    const sx = p.x - camX;
    if (sx + p.w < -40 || sx > VIEW_W + 40) continue;
    const half = p.w / 2;
    ctx.save();
    ctx.translate(sx + half, p.y + p.h / 2);

    ctx.fillStyle = '#0a2a0a';
    ctx.shadowColor = '#39ff6a';
    ctx.shadowBlur = 14;
    ctx.fillRect(-half, -half, p.w, p.h);
    ctx.strokeStyle = '#39ff6a';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-half, -half, p.w, p.h);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#39ff6a';
    for (let i = 0; i < 3; i++) {
      const sxp = -half + (p.w * (i + 0.5)) / 3;
      ctx.beginPath();
      ctx.moveTo(sxp - 4, -half);
      ctx.lineTo(sxp + 4, -half);
      ctx.lineTo(sxp, -half - 8);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#ff2e2e';
    ctx.beginPath();
    ctx.arc(-half * 0.3, -half * 0.1, 2.5, 0, Math.PI * 2);
    ctx.arc(half * 0.3, -half * 0.1, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawPlayer() {
  if (state === 'dead' || state === 'editor') return;
  if (!level) return;
  const sx = PLAYER_SCREEN_X;
  const sy = player.y + player.size / 2;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate((player.rotation * Math.PI) / 180);
  getSkinById(save.selectedSkin).draw(ctx, player.size, elapsedTime);
  ctx.restore();
}

function drawDeathParticles(camX) {
  for (const p of deathParticles) {
    const alpha = 1 - p.age / p.life;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fillRect(p.worldX - camX - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function render() {
  const camX = cameraX();
  drawBackground(camX);
  drawGroundAndCeiling(camX);
  drawDecorations(camX);
  drawPortals(camX);
  drawObstacles(camX);
  drawPickups(camX);
  drawDeathParticles(camX);
  drawPlayer(camX);
}

// --- main loop -----------------------------------------------------------

let lastTime = null;

function frame(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  let dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  dt = Math.min(dt, 1 / 30);

  update(dt);
  render();

  requestAnimationFrame(frame);
}

buildLevelGrid();
buildCustomLevelList();
requestAnimationFrame(frame);
