// ---------------------------------------------------------------------------
// Procedural chiptune player. Web Audio oscillators only (no audio files).
// Uses the standard "lookahead scheduler" pattern, keyed entirely off
// audioCtx.currentTime so playback never drifts from the visual beat-flash.
// Loaded before game.js; exposes global `MusicEngine`.
// ---------------------------------------------------------------------------

const MusicEngine = (function () {
  const SCHEDULE_AHEAD = 0.1; // seconds
  const DEFAULT_VOLUME = 0.15;

  let audioCtx = null;
  let masterGain = null;
  let currentLevel = null;
  let nextNoteTime = 0;
  let currentStep = 0;
  let active = false;
  let beatFlashQueue = [];
  let muted = false;
  let volume = DEFAULT_VOLUME;

  function ensureContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = muted ? 0 : volume;
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function scheduleStep(step, time) {
    const music = currentLevel.music;
    const note = music.melody[step % music.melody.length];
    if (note) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = note.wave || 'square';
      osc.frequency.setValueAtTime(note.freq, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(note.vel, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + note.dur);
      osc.connect(gain).connect(masterGain);
      osc.start(time);
      osc.stop(time + note.dur + 0.02);
    }
    if (music.kick[step % music.kick.length]) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
      osc.connect(gain).connect(masterGain);
      osc.start(time);
      osc.stop(time + 0.16);
    }
  }

  function playLevel(level) {
    ensureContext();
    currentLevel = level;
    currentStep = 0;
    nextNoteTime = audioCtx.currentTime + 0.05;
    beatFlashQueue = [];
    active = true;
  }

  function stop() {
    active = false;
    currentLevel = null;
    beatFlashQueue = [];
  }

  // Call once per animation frame from the main game loop.
  function tick() {
    if (!active || !currentLevel || !audioCtx) return;
    const stepDur = 60 / currentLevel.music.bpm / 4;
    while (nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD) {
      scheduleStep(currentStep, nextNoteTime);
      beatFlashQueue.push({ time: nextNoteTime, step: currentStep });
      nextNoteTime += stepDur;
      currentStep = (currentStep + 1) % currentLevel.music.totalSteps;
    }
  }

  // Drains any beats whose audio has actually reached the speakers, so
  // visual flashes never fire early relative to the sound.
  function drainBeatFlashes(onBeat) {
    if (!audioCtx) return;
    while (beatFlashQueue.length && beatFlashQueue[0].time <= audioCtx.currentTime) {
      onBeat(beatFlashQueue.shift());
    }
  }

  function setMuted(m) {
    muted = m;
    if (masterGain) masterGain.gain.value = muted ? 0 : volume;
  }

  function getMuted() {
    return muted;
  }

  return { ensureContext, playLevel, stop, tick, drainBeatFlashes, setMuted, getMuted };
})();
