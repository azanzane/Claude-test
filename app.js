'use strict';

// ── Screen navigation ──────────────────────────────────────────────────────
function showScreen(id) {
  const current = document.querySelector('.screen.active');
  const next = document.getElementById('screen-' + id);
  if (!next || next === current) return;

  if (current) {
    current.classList.add('leaving');
    current.addEventListener('animationend', () => {
      current.classList.remove('active', 'leaving');
    }, { once: true });
  }
  next.classList.add('active', 'entering');
  next.addEventListener('animationend', () => next.classList.remove('entering'), { once: true });

  if (id !== 'home') initGame(id);
}

document.querySelectorAll('.game-card').forEach(btn => {
  btn.addEventListener('click', () => showScreen(btn.dataset.game));
});
document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', () => showScreen('home'));
});

function initGame(id) {
  const inits = { bubbles: initBubbles, spinner: initSpinner, tapper: initTapper, doodle: initDoodle, ball: initBall, slider: initSlider };
  if (inits[id]) inits[id]();
}

// ── Haptic helper ──────────────────────────────────────────────────────────
function buzz(style = 'light') {
  if (window.navigator && window.navigator.vibrate) {
    const durations = { light: 10, medium: 25, heavy: 50 };
    window.navigator.vibrate(durations[style] || 10);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BUBBLE WRAP
// ═══════════════════════════════════════════════════════════════════════════
let bubblePopped = 0;

function initBubbles() {
  buildBubbleGrid();
}

function buildBubbleGrid() {
  const grid = document.getElementById('bubble-grid');
  grid.innerHTML = '';
  bubblePopped = 0;
  document.getElementById('bubble-count').textContent = '0';

  const cols = 9;
  const rows = 12;
  for (let i = 0; i < cols * rows; i++) {
    const b = document.createElement('div');
    b.className = 'bubble';
    b.addEventListener('touchstart', popBubble, { passive: true });
    b.addEventListener('mousedown', popBubble);
    grid.appendChild(b);
  }
}

function popBubble(e) {
  const b = e.currentTarget;
  if (b.classList.contains('popped')) return;
  b.classList.add('popped');
  buzz('light');
  bubblePopped++;
  document.getElementById('bubble-count').textContent = bubblePopped;
}

document.getElementById('bubbles-reset').addEventListener('click', buildBubbleGrid);

// ═══════════════════════════════════════════════════════════════════════════
// SPINNER
// ═══════════════════════════════════════════════════════════════════════════
let spinAngle = 0;
let spinVelocity = 0;
let spinRAF = null;
let lastPointerAngle = null;
let lastPointerTime = null;
let spinPointerVelocity = 0;

function initSpinner() {
  const disc = document.getElementById('spinner-disc');
  disc.style.transform = `rotate(${spinAngle}deg)`;
  startSpinLoop();
}

function getPointerAngle(e, el) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const touch = e.touches ? e.touches[0] : e;
  return Math.atan2(touch.clientY - cy, touch.clientX - cx) * (180 / Math.PI);
}

const disc = document.getElementById('spinner-disc');
disc.addEventListener('touchstart', e => {
  e.preventDefault();
  lastPointerAngle = getPointerAngle(e, disc);
  lastPointerTime = Date.now();
  spinPointerVelocity = 0;
}, { passive: false });

disc.addEventListener('touchmove', e => {
  e.preventDefault();
  const angle = getPointerAngle(e, disc);
  const now = Date.now();
  let delta = angle - lastPointerAngle;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  const dt = Math.max(now - lastPointerTime, 1);
  spinPointerVelocity = delta / dt * 16;
  spinAngle += delta;
  lastPointerAngle = angle;
  lastPointerTime = now;
  disc.style.transform = `rotate(${spinAngle}deg)`;
}, { passive: false });

disc.addEventListener('touchend', () => {
  spinVelocity = spinPointerVelocity;
  lastPointerAngle = null;
});

function startSpinLoop() {
  if (spinRAF) cancelAnimationFrame(spinRAF);
  function loop() {
    if (lastPointerAngle === null) {
      spinVelocity *= 0.988;
      spinAngle += spinVelocity;
      disc.style.transform = `rotate(${spinAngle}deg)`;
    }
    const rpm = Math.abs(spinVelocity * 60000 / 360 / 16).toFixed(0);
    document.getElementById('spinner-rpm').textContent = rpm;
    spinRAF = requestAnimationFrame(loop);
  }
  loop();
}

// ═══════════════════════════════════════════════════════════════════════════
// TAP COUNTER
// ═══════════════════════════════════════════════════════════════════════════
let tapCount = 0;
let tapBest = 0;

function initTapper() {
  tapCount = 0;
  updateTapDisplay();
}

const tapArea = document.getElementById('tap-area');
const rippleContainer = document.getElementById('tap-ripple-container');

tapArea.addEventListener('touchstart', handleTap, { passive: true });
tapArea.addEventListener('mousedown', handleTap);

function handleTap(e) {
  tapCount++;
  if (tapCount > tapBest) {
    tapBest = tapCount;
    document.getElementById('tapper-best').textContent = tapBest;
  }
  updateTapDisplay();
  buzz('light');
  spawnRipple(e);
}

function updateTapDisplay() {
  const el = document.getElementById('tap-number');
  el.textContent = tapCount;
  el.style.transform = 'scale(1.15)';
  setTimeout(() => { el.style.transform = 'scale(1)'; }, 80);
  el.style.transition = 'transform 0.08s';
}

function spawnRipple(e) {
  const rect = rippleContainer.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  const x = (touch.clientX - rect.left);
  const y = (touch.clientY - rect.top);
  const size = 80;
  const r = document.createElement('div');
  r.className = 'ripple';
  r.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
  rippleContainer.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}

document.getElementById('tapper-reset').addEventListener('click', () => {
  tapCount = 0;
  updateTapDisplay();
});

// ═══════════════════════════════════════════════════════════════════════════
// ZEN DOODLE
// ═══════════════════════════════════════════════════════════════════════════
const COLORS = ['#f87171','#fb923c','#fbbf24','#a3e635','#34d399','#22d3ee','#60a5fa','#a78bfa','#f472b6','#ffffff'];
let doodleColor = COLORS[5];
let drawing = false;
let lastX = 0, lastY = 0;

function initDoodle() {
  const canvas = document.getElementById('doodle-canvas');
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight - canvas.offsetTop + container.getBoundingClientRect().top;
  // fit canvas to remaining space
  const rect = canvas.getBoundingClientRect();
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - rect.top;

  buildSwatches();
}

function buildSwatches() {
  const wrap = document.getElementById('color-swatches');
  if (wrap.childElementCount > 0) return;
  COLORS.forEach((c, i) => {
    const s = document.createElement('div');
    s.className = 'swatch' + (i === 5 ? ' active' : '');
    s.style.background = c;
    s.addEventListener('click', () => {
      document.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
      s.classList.add('active');
      doodleColor = c;
    });
    wrap.appendChild(s);
  });
}

const canvas = document.getElementById('doodle-canvas');
const ctx = canvas.getContext('2d');

function doodlePos(e) {
  const rect = canvas.getBoundingClientRect();
  const src = e.touches ? e.touches[0] : e;
  return [src.clientX - rect.left, src.clientY - rect.top];
}

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  drawing = true;
  [lastX, lastY] = doodlePos(e);
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!drawing) return;
  const [x, y] = doodlePos(e);
  doodleDraw(x, y);
}, { passive: false });

canvas.addEventListener('touchend', () => { drawing = false; });
canvas.addEventListener('mousedown', e => { drawing = true; [lastX, lastY] = doodlePos(e); });
canvas.addEventListener('mousemove', e => { if (!drawing) return; const [x, y] = doodlePos(e); doodleDraw(x, y); });
canvas.addEventListener('mouseup', () => { drawing = false; });

function doodleDraw(x, y) {
  const size = parseInt(document.getElementById('brush-size').value);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = doodleColor;
  ctx.lineWidth = size;
  ctx.shadowColor = doodleColor;
  ctx.shadowBlur = size * 0.6;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();
  lastX = x; lastY = y;
}

document.getElementById('doodle-clear').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// ═══════════════════════════════════════════════════════════════════════════
// STRESS BALL
// ═══════════════════════════════════════════════════════════════════════════
let ballCount = 0;

function initBall() {
  ballCount = 0;
  document.getElementById('ball-count').textContent = '0';
}

const stressBall = document.getElementById('stress-ball');
stressBall.addEventListener('touchstart', squeezeBall, { passive: true });
stressBall.addEventListener('mousedown', squeezeBall);

function squeezeBall() {
  ballCount++;
  document.getElementById('ball-count').textContent = ballCount;
  buzz('medium');

  // color pulse
  const hues = [340, 280, 200, 160, 40];
  const h = hues[ballCount % hues.length];
  stressBall.style.background = `radial-gradient(circle at 35% 30%, hsl(${h},90%,70%), hsl(${h},80%,30%))`;
  stressBall.style.boxShadow = `0 4px 20px hsla(${h},80%,60%,0.6), inset -4px -4px 12px rgba(0,0,0,0.4)`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDERS
// ═══════════════════════════════════════════════════════════════════════════
const SLIDER_DEFS = [
  { label: 'Chill',    color: '#60a5fa', from: 0, to: 100 },
  { label: 'Energy',   color: '#f472b6', from: 0, to: 100 },
  { label: 'Focus',    color: '#a3e635', from: 0, to: 100 },
  { label: 'Chaos',    color: '#fb923c', from: 0, to: 100 },
  { label: 'Zen',      color: '#a78bfa', from: 0, to: 100 },
];

function initSlider() {
  const arena = document.getElementById('slider-arena');
  if (arena.childElementCount > 0) return;

  SLIDER_DEFS.forEach(def => {
    const row = document.createElement('div');
    row.className = 'slider-row';

    const lbl = document.createElement('label');
    const valSpan = document.createElement('span');
    const startVal = Math.floor(Math.random() * 101);
    valSpan.textContent = startVal;
    lbl.textContent = def.label + ' ';
    lbl.appendChild(valSpan);

    const sl = document.createElement('input');
    sl.type = 'range';
    sl.className = 'fancy-slider';
    sl.min = def.from; sl.max = def.to;
    sl.value = startVal;
    sl.style.accentColor = def.color;
    sl.style.setProperty('--thumb-color', def.color);

    // Gradient track
    function updateTrack() {
      const pct = ((sl.value - def.from) / (def.to - def.from)) * 100;
      sl.style.background = `linear-gradient(to right, ${def.color} ${pct}%, var(--surface2) ${pct}%)`;
      valSpan.textContent = sl.value;
    }
    updateTrack();

    sl.addEventListener('input', () => { updateTrack(); buzz('light'); });
    sl.style.setProperty('--thumb', def.color);

    // custom thumb color via injected style
    const styleId = 'slider-thumb-' + def.label;
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = `.fancy-slider[data-label="${def.label}"]::-webkit-slider-thumb { background: ${def.color}; }`;
      document.head.appendChild(s);
    }
    sl.dataset.label = def.label;

    row.appendChild(lbl);
    row.appendChild(sl);
    arena.appendChild(row);
  });
}

document.getElementById('slider-randomize').addEventListener('click', () => {
  document.querySelectorAll('.fancy-slider').forEach(sl => {
    sl.value = Math.floor(Math.random() * 101);
    sl.dispatchEvent(new Event('input'));
  });
});
