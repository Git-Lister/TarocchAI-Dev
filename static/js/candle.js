// TarocchAI – Candle Controller & Audio
window.audioCtx = null;

window.unlockAudio = function() {
  if (!window.audioCtx) {
    window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
  }
};

window.snap_sound = function() {
  if (!window.audioCtx) return;
  const buffer = window.audioCtx.createBuffer(1, 1024, 44100);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < 1024; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 200);
  }
  const src = window.audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(window.audioCtx.destination);
  src.start(0);
};

window.candle_ignite = function() {
  const candle = document.getElementById('candle');
  const flame = document.getElementById('flame');
  if (!candle || !flame) return;
  candle.style.display = 'flex';
  flame.style.animation = 'flicker 0.15s infinite alternate';
  flame.style.boxShadow = '0 0 40px rgba(255,180,50,0.6), 0 0 80px rgba(255,120,20,0.3)';
};

window.candle_flicker = function() {
  const flame = document.getElementById('flame');
  if (!flame) return;
  flame.style.animation = 'flicker-fast 0.08s infinite alternate';
  setTimeout(function() {
    if (flame) flame.style.animation = 'flicker 0.15s infinite alternate';
  }, 1200);
};

window.candle_brighten = function() {
  const flame = document.getElementById('flame');
  if (!flame) return;
  flame.style.animation = 'brighten 1.5s ease-out forwards';
  setTimeout(function() {
    if (flame) flame.style.animation = 'flicker 0.15s infinite alternate';
  }, 1500);
};

window.candle_snuff = function() {
  const candle = document.getElementById('candle');
  const flame = document.getElementById('flame');
  if (!candle || !flame) return;
  flame.style.animation = 'snuff 0.8s ease-in forwards';
  setTimeout(function() {
    if (candle) candle.style.display = 'none';
  }, 800);
};