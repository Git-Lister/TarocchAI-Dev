// TarocchAI – Candle Controller & Audio (v2)
window.audioCtx = null;

window.unlockAudio = function() {
  if (!window.audioCtx) {
    window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
  }
};

// Gentle chime (not a snap)
window.play_chime = function() {
  if (!window.audioCtx) return;
  try {
    const osc = window.audioCtx.createOscillator();
    const gain = window.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, window.audioCtx.currentTime); // C5
    gain.gain.setValueAtTime(0.3, window.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, window.audioCtx.currentTime + 2);
    osc.connect(gain);
    gain.connect(window.audioCtx.destination);
    osc.start(0);
    osc.stop(window.audioCtx.currentTime + 2);
  } catch(e) {
    console.warn('Chime failed:', e);
  }
};

window.candle_ignite = function() {
  const candle = document.getElementById('candle');
  const flame = document.getElementById('flame');
  if (!candle || !flame) return;
  candle.style.display = 'block';
  flame.style.animation = 'flicker 0.12s infinite alternate, float 3s ease-in-out infinite';
  flame.style.boxShadow = '0 0 60px rgba(255,180,50,0.7), 0 0 120px rgba(255,120,20,0.3)';
};

window.candle_flicker = function() {
  const flame = document.getElementById('flame');
  if (!flame) return;
  flame.style.animation = 'flicker-fast 0.06s infinite alternate, float 3s ease-in-out infinite';
  setTimeout(() => {
    if (flame) flame.style.animation = 'flicker 0.12s infinite alternate, float 3s ease-in-out infinite';
  }, 1000);
};

window.candle_brighten = function() {
  const flame = document.getElementById('flame');
  if (!flame) return;
  flame.style.animation = 'brighten 1.5s ease-out forwards, float 3s ease-in-out infinite';
  setTimeout(() => {
    if (flame) flame.style.animation = 'flicker 0.12s infinite alternate, float 3s ease-in-out infinite';
  }, 1500);
};

window.candle_snuff = function() {
  const candle = document.getElementById('candle');
  const flame = document.getElementById('flame');
  if (!candle || !flame) return;
  flame.style.animation = 'snuff 0.8s ease-in forwards';
  setTimeout(() => {
    if (candle) candle.style.display = 'none';
  }, 800);
};