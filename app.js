'use strict';

// ── Timer system ───────────────────────────────────────────────────────────
const timers = {};

function timerStart(id) {
  const t = timers[id] || (timers[id] = { elapsed: 0, start: null, raf: null });
  if (t.start !== null) return;
  t.start = Date.now();
  function tick() {
    t.raf = requestAnimationFrame(tick);
    const ms = t.elapsed + (Date.now() - t.start);
    const el = document.getElementById(id + '-timer');
    if (el) el.textContent = msToMSS(ms);
  }
  tick();
}

function timerPause(id) {
  const t = timers[id];
  if (!t || t.start === null) return;
  t.elapsed += Date.now() - t.start;
  t.start = null;
  if (t.raf) { cancelAnimationFrame(t.raf); t.raf = null; }
}

function timerReset(id) {
  if (timers[id]?.raf) cancelAnimationFrame(timers[id].raf);
  timers[id] = { elapsed: 0, start: null, raf: null };
  const el = document.getElementById(id + '-timer');
  if (el) el.textContent = '00:00';
  timerStart(id);
}

function timerElapsed(id) {
  const t = timers[id];
  if (!t) return 0;
  return t.elapsed + (t.start ? Date.now() - t.start : 0);
}

function timerRestore(id, ms) {
  if (timers[id]?.raf) cancelAnimationFrame(timers[id].raf);
  timers[id] = { elapsed: ms, start: null, raf: null };
  timerStart(id);
}

function msToMSS(ms) {
  const s = Math.floor(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

// ── localStorage helpers ───────────────────────────────────────────────────
function saveState(key, data) {
  try { localStorage.setItem('fz_' + key, JSON.stringify(data)); } catch(_) {}
}

function loadState(key) {
  try { const s = localStorage.getItem('fz_' + key); return s ? JSON.parse(s) : null; } catch(_) { return null; }
}

// ── Screen navigation ──────────────────────────────────────────────────────
let activeGameId = null;

function showScreen(id) {
  const current = document.querySelector('.screen.active');
  const next = document.getElementById('screen-' + id);
  if (!next || next === current) return;

  if (activeGameId && activeGameId !== id) timerPause(activeGameId);

  if (current) {
    current.classList.add('leaving');
    current.addEventListener('animationend', () => current.classList.remove('active', 'leaving'), { once: true });
  }
  next.classList.add('active', 'entering');
  next.addEventListener('animationend', () => next.classList.remove('entering'), { once: true });

  if (id !== 'home') {
    activeGameId = id;
    initGame(id);
  } else {
    activeGameId = null;
  }
}

document.querySelectorAll('.game-card').forEach(btn =>
  btn.addEventListener('click', () => showScreen(btn.dataset.game))
);
document.querySelectorAll('.back-btn').forEach(btn =>
  btn.addEventListener('click', () => showScreen('home'))
);

function initGame(id) {
  const inits = { bubbles: initBubbles, spinner: initSpinner, tapper: initTapper, doodle: initDoodle, ball: initBall, slider: initSlider, sudoku: initSudoku, patches: initPatches, binario: initBinario };
  if (inits[id]) inits[id]();
}

// ── Haptic helper ──────────────────────────────────────────────────────────
function buzz(style = 'light') {
  if (navigator.vibrate) navigator.vibrate({ light: 10, medium: 25, heavy: 50 }[style] || 10);
}

function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUBBLE WRAP
// ═══════════════════════════════════════════════════════════════════════════
let bubblePopped = 0;

function initBubbles() {
  const saved = loadState('bubbles');
  if (saved) {
    bubblePopped = saved.popped || 0;
    buildBubbleGrid(saved.poppedSet || []);
    timerRestore('bubbles', saved.timer || 0);
  } else {
    buildBubbleGrid([]);
    timerReset('bubbles');
  }
}

function buildBubbleGrid(poppedSet = []) {
  const grid = document.getElementById('bubble-grid');
  grid.innerHTML = '';
  bubblePopped = 0;
  const set = new Set(poppedSet);
  const cols = 9, rows = 12;
  for (let i = 0; i < cols * rows; i++) {
    const b = document.createElement('div');
    b.className = 'bubble';
    if (set.has(i)) { b.classList.add('popped'); bubblePopped++; }
    b.dataset.i = i;
    b.addEventListener('touchstart', popBubble, { passive: true });
    b.addEventListener('mousedown', popBubble);
    grid.appendChild(b);
  }
  document.getElementById('bubble-count').textContent = bubblePopped;
}

function popBubble(e) {
  const b = e.currentTarget;
  if (b.classList.contains('popped')) return;
  b.classList.add('popped');
  buzz('light');
  bubblePopped++;
  document.getElementById('bubble-count').textContent = bubblePopped;
  saveBubbles();
}

function saveBubbles() {
  const poppedSet = [...document.querySelectorAll('.bubble.popped')].map(b => +b.dataset.i);
  saveState('bubbles', { popped: bubblePopped, poppedSet, timer: timerElapsed('bubbles') });
}

document.getElementById('bubbles-reset').addEventListener('click', () => {
  saveState('bubbles', null);
  buildBubbleGrid([]);
  timerReset('bubbles');
});

// ═══════════════════════════════════════════════════════════════════════════
// SPINNER
// ═══════════════════════════════════════════════════════════════════════════
let spinAngle = 0, spinVelocity = 0, spinRAF = null;
let lastPointerAngle = null, lastPointerTime = null, spinPointerVelocity = 0;

function initSpinner() {
  const disc = document.getElementById('spinner-disc');
  disc.style.transform = `rotate(${spinAngle}deg)`;
  startSpinLoop();
  timerStart('spinner');
}

function getPointerAngle(e, el) {
  const rect = el.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return Math.atan2(touch.clientY - rect.top - rect.height/2, touch.clientX - rect.left - rect.width/2) * (180 / Math.PI);
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
  spinPointerVelocity = delta / Math.max(now - lastPointerTime, 1) * 16;
  spinAngle += delta;
  lastPointerAngle = angle;
  lastPointerTime = now;
  disc.style.transform = `rotate(${spinAngle}deg)`;
}, { passive: false });
disc.addEventListener('touchend', () => { spinVelocity = spinPointerVelocity; lastPointerAngle = null; });

function startSpinLoop() {
  if (spinRAF) cancelAnimationFrame(spinRAF);
  function loop() {
    if (lastPointerAngle === null) {
      spinVelocity *= 0.988;
      spinAngle += spinVelocity;
      disc.style.transform = `rotate(${spinAngle}deg)`;
    }
    document.getElementById('spinner-rpm').textContent = Math.abs(spinVelocity * 60000 / 360 / 16).toFixed(0);
    spinRAF = requestAnimationFrame(loop);
  }
  loop();
}

// ═══════════════════════════════════════════════════════════════════════════
// TAP COUNTER
// ═══════════════════════════════════════════════════════════════════════════
let tapCount = 0, tapBest = 0;

function initTapper() {
  const saved = loadState('tapper');
  tapBest = saved?.best || 0;
  tapCount = 0;
  document.getElementById('tapper-best').textContent = tapBest;
  updateTapDisplay();
  timerStart('tapper');
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
    saveState('tapper', { best: tapBest });
  }
  updateTapDisplay();
  buzz('light');
  spawnRipple(e);
}

function updateTapDisplay() {
  const el = document.getElementById('tap-number');
  el.textContent = tapCount;
  el.style.transition = 'transform 0.08s';
  el.style.transform = 'scale(1.15)';
  setTimeout(() => { el.style.transform = 'scale(1)'; }, 80);
}

function spawnRipple(e) {
  const rect = rippleContainer.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  const r = document.createElement('div');
  r.className = 'ripple';
  r.style.cssText = `width:80px;height:80px;left:${touch.clientX - rect.left}px;top:${touch.clientY - rect.top}px`;
  rippleContainer.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}

document.getElementById('tapper-reset').addEventListener('click', () => {
  tapCount = 0;
  updateTapDisplay();
  timerReset('tapper');
});

// ═══════════════════════════════════════════════════════════════════════════
// ZEN DOODLE
// ═══════════════════════════════════════════════════════════════════════════
const COLORS = ['#f87171','#fb923c','#fbbf24','#a3e635','#34d399','#22d3ee','#60a5fa','#a78bfa','#f472b6','#ffffff'];
let doodleColor = COLORS[5], drawing = false, lastX = 0, lastY = 0;

function initDoodle() {
  const canvas = document.getElementById('doodle-canvas');
  const rect = canvas.getBoundingClientRect();
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - rect.top;
  buildSwatches();
  timerStart('doodle');
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

canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing = true; [lastX, lastY] = doodlePos(e); }, { passive: false });
canvas.addEventListener('touchmove', e => { e.preventDefault(); if (!drawing) return; const [x, y] = doodlePos(e); doodleDraw(x, y); }, { passive: false });
canvas.addEventListener('touchend', () => { drawing = false; });
canvas.addEventListener('mousedown', e => { drawing = true; [lastX, lastY] = doodlePos(e); });
canvas.addEventListener('mousemove', e => { if (!drawing) return; const [x, y] = doodlePos(e); doodleDraw(x, y); });
canvas.addEventListener('mouseup', () => { drawing = false; });

function doodleDraw(x, y) {
  const size = parseInt(document.getElementById('brush-size').value);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = doodleColor; ctx.lineWidth = size;
  ctx.shadowColor = doodleColor; ctx.shadowBlur = size * 0.6;
  ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke();
  lastX = x; lastY = y;
}

document.getElementById('doodle-clear').addEventListener('click', () => ctx.clearRect(0, 0, canvas.width, canvas.height));

// ═══════════════════════════════════════════════════════════════════════════
// STRESS BALL
// ═══════════════════════════════════════════════════════════════════════════
let ballCount = 0;

function initBall() {
  const saved = loadState('ball');
  ballCount = saved?.count || 0;
  document.getElementById('ball-count').textContent = ballCount;
  timerStart('ball');
}

const stressBall = document.getElementById('stress-ball');
stressBall.addEventListener('touchstart', squeezeBall, { passive: true });
stressBall.addEventListener('mousedown', squeezeBall);

function squeezeBall() {
  ballCount++;
  document.getElementById('ball-count').textContent = ballCount;
  buzz('medium');
  const hues = [340, 280, 200, 160, 40];
  const h = hues[ballCount % hues.length];
  stressBall.style.background = `radial-gradient(circle at 35% 30%, hsl(${h},90%,70%), hsl(${h},80%,30%))`;
  stressBall.style.boxShadow = `0 4px 20px hsla(${h},80%,60%,0.5), inset -4px -4px 12px rgba(0,0,0,0.35)`;
  saveState('ball', { count: ballCount });
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDERS
// ═══════════════════════════════════════════════════════════════════════════
const SLIDER_DEFS = [
  { label: 'Chill',  color: '#60a5fa' },
  { label: 'Energy', color: '#f472b6' },
  { label: 'Focus',  color: '#a3e635' },
  { label: 'Chaos',  color: '#fb923c' },
  { label: 'Zen',    color: '#a78bfa' },
];

function initSlider() {
  const arena = document.getElementById('slider-arena');
  if (arena.childElementCount > 0) { timerStart('slider'); return; }
  const saved = loadState('slider');

  SLIDER_DEFS.forEach((def, idx) => {
    const row = document.createElement('div');
    row.className = 'slider-row';
    const valSpan = document.createElement('span');
    const startVal = saved?.values[idx] ?? Math.floor(Math.random() * 101);
    valSpan.textContent = startVal;
    const lbl = document.createElement('label');
    lbl.textContent = def.label + ' ';
    lbl.appendChild(valSpan);
    const sl = document.createElement('input');
    sl.type = 'range'; sl.className = 'fancy-slider'; sl.min = 0; sl.max = 100; sl.value = startVal;
    const styleId = 'st-' + def.label;
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = `.fancy-slider[data-lbl="${def.label}"]::-webkit-slider-thumb { background: ${def.color}; }`;
      document.head.appendChild(s);
    }
    sl.dataset.lbl = def.label;
    function updateTrack() {
      const pct = sl.value;
      sl.style.background = `linear-gradient(to right, ${def.color} ${pct}%, var(--surface3) ${pct}%)`;
      valSpan.textContent = sl.value;
      saveSliders();
    }
    updateTrack();
    sl.addEventListener('input', () => { updateTrack(); buzz('light'); });
    row.appendChild(lbl); row.appendChild(sl);
    arena.appendChild(row);
  });
  timerStart('slider');
}

function saveSliders() {
  const values = [...document.querySelectorAll('.fancy-slider')].map(s => +s.value);
  saveState('slider', { values });
}

document.getElementById('slider-randomize').addEventListener('click', () => {
  document.querySelectorAll('.fancy-slider').forEach(sl => {
    sl.value = Math.floor(Math.random() * 101);
    sl.dispatchEvent(new Event('input'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUDOKU
// ═══════════════════════════════════════════════════════════════════════════
let sudokuPuzzle = [], sudokuSolution = [], sudokuGiven = [];
let sudokuSelected = null, sudokuDiff = 'easy', sudokuSolved = false;

function initSudoku() {
  const saved = loadState('sudoku');
  if (saved && saved.diff === sudokuDiff && !saved.solved) {
    sudokuPuzzle   = saved.puzzle;
    sudokuSolution = saved.solution;
    sudokuGiven    = saved.given;
    sudokuSolved   = false;
    renderSudokuGrid();
    document.getElementById('sudoku-status').textContent = '';
    timerRestore('sudoku', saved.timer || 0);
  } else {
    newSudokuGame();
  }
}

function newSudokuGame() {
  sudokuSolved = false; sudokuSelected = null;
  const { puzzle, solution } = generateSudoku(sudokuDiff);
  sudokuPuzzle = puzzle; sudokuSolution = solution;
  sudokuGiven = puzzle.map(row => row.map(v => v !== 0));
  renderSudokuGrid();
  document.getElementById('sudoku-status').textContent = '';
  timerReset('sudoku');
  saveSudoku();
}

function saveSudoku() {
  saveState('sudoku', { puzzle: sudokuPuzzle, solution: sudokuSolution, given: sudokuGiven, diff: sudokuDiff, solved: sudokuSolved, timer: timerElapsed('sudoku') });
}

function sudokuCellValid(board, r, c, num) {
  if (board[r].includes(num)) return false;
  for (let i = 0; i < 9; i++) if (board[i][c] === num) return false;
  const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
  for (let i = br; i < br+3; i++) for (let j = bc; j < bc+3; j++) if (board[i][j] === num) return false;
  return true;
}

function fillBoard(board) {
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i/9), c = i%9;
    if (board[r][c] === 0) {
      for (const n of shuffleArr([1,2,3,4,5,6,7,8,9])) {
        if (sudokuCellValid(board, r, c, n)) {
          board[r][c] = n;
          if (fillBoard(board)) return true;
          board[r][c] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

function generateSudoku(difficulty) {
  const solution = Array.from({length: 9}, () => Array(9).fill(0));
  fillBoard(solution);
  const puzzle = solution.map(r => [...r]);
  let count = { easy: 36, medium: 46, hard: 54 }[difficulty] || 36;
  for (const pos of shuffleArr([...Array(81).keys()])) {
    if (count <= 0) break;
    puzzle[Math.floor(pos/9)][pos%9] = 0;
    count--;
  }
  return { puzzle, solution };
}

function renderSudokuGrid() {
  const grid = document.getElementById('sudoku-grid');
  grid.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'sudoku-cell';
      cell.dataset.r = r; cell.dataset.c = c;
      if (c % 3 === 0 && c !== 0) cell.classList.add('box-left');
      if (r % 3 === 0 && r !== 0) cell.classList.add('box-top');
      const val = sudokuPuzzle[r][c];
      if (val) cell.textContent = val;
      if (sudokuGiven[r][c]) cell.classList.add('given');
      cell.addEventListener('click', () => selectSudokuCell(r, c));
      grid.appendChild(cell);
    }
  }
  buildNumpad();
  highlightSudokuCells();
  renderSudokuMini();
}

function renderSudokuMini() {
  const mini = document.getElementById('sudoku-mini');
  mini.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'mini-cell';
      const boxIdx = Math.floor(r/3)*3 + Math.floor(c/3);
      if (boxIdx % 2 === 1) cell.classList.add('mini-box-dark');
      if (c % 3 === 0 && c !== 0) cell.classList.add('mini-box-left');
      if (r % 3 === 0 && r !== 0) cell.classList.add('mini-box-top');
      const val = sudokuPuzzle[r][c];
      if (val) {
        cell.textContent = val;
        if (sudokuGiven[r][c]) cell.classList.add('mini-given');
        else if (val !== sudokuSolution[r][c]) cell.classList.add('mini-error');
        else cell.classList.add('mini-user');
      }
      mini.appendChild(cell);
    }
  }
}

function selectSudokuCell(r, c) {
  sudokuSelected = [r, c];
  highlightSudokuCells();
  buzz('light');
}

function highlightSudokuCells() {
  const [sr, sc] = sudokuSelected || [-1, -1];
  const selVal = sr >= 0 ? sudokuPuzzle[sr][sc] : 0;
  document.querySelectorAll('.sudoku-cell').forEach(cell => {
    const r = +cell.dataset.r, c = +cell.dataset.c;
    const val = sudokuPuzzle[r][c];
    cell.classList.remove('selected', 'related', 'same-num', 'error');
    if (r === sr && c === sc) cell.classList.add('selected');
    else if (sr >= 0) {
      if (r === sr || c === sc || (Math.floor(r/3) === Math.floor(sr/3) && Math.floor(c/3) === Math.floor(sc/3)))
        cell.classList.add('related');
    }
    if (selVal && val === selVal) cell.classList.add('same-num');
    if (val && !sudokuGiven[r][c] && val !== sudokuSolution[r][c]) cell.classList.add('error');
  });
}

function buildNumpad() {
  const pad = document.getElementById('sudoku-numpad');
  if (pad.childElementCount > 0) return;
  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.className = 'numpad-btn'; btn.textContent = n;
    btn.addEventListener('click', () => enterSudokuNum(n));
    pad.appendChild(btn);
  }
  const erase = document.createElement('button');
  erase.className = 'numpad-btn erase-btn'; erase.textContent = '⌫';
  erase.addEventListener('click', () => enterSudokuNum(0));
  pad.appendChild(erase);
}

function enterSudokuNum(num) {
  if (!sudokuSelected || sudokuSolved) return;
  const [r, c] = sudokuSelected;
  if (sudokuGiven[r][c]) {
    const cell = document.querySelector(`.sudoku-cell[data-r="${r}"][data-c="${c}"]`);
    cell.classList.add('shake');
    cell.addEventListener('animationend', () => cell.classList.remove('shake'), { once: true });
    return;
  }
  sudokuPuzzle[r][c] = num;
  const cell = document.querySelector(`.sudoku-cell[data-r="${r}"][data-c="${c}"]`);
  cell.textContent = num || '';
  highlightSudokuCells();
  renderSudokuMini();
  buzz('light');
  saveSudoku();
  if (checkSudokuWin()) {
    sudokuSolved = true;
    timerPause('sudoku');
    buzz('heavy');
    document.getElementById('sudoku-status').textContent = '🎉 Solved!';
    sudokuSelected = null;
    highlightSudokuCells();
    document.querySelectorAll('.sudoku-cell').forEach(el => el.classList.add('win'));
    saveSudoku();
  }
}

function checkSudokuWin() {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (sudokuPuzzle[r][c] !== sudokuSolution[r][c]) return false;
  return true;
}

document.getElementById('sudoku-new').addEventListener('click', newSudokuGame);
document.querySelectorAll('.diff-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    sudokuDiff = btn.dataset.diff;
    newSudokuGame();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PATCHES (Rectangle Puzzle)
// ═══════════════════════════════════════════════════════════════════════════
const P_COLS = 6, P_ROWS = 8;
let pSolution = [], pPatches = [], pPlaced = new Set();
let pCellSize = 0, pDragStart = null, pListenersReady = false;

function initPatches() {
  const saved = loadState('patches');
  if (saved) {
    pSolution = saved.solution;
    pPatches  = saved.patches;
    pPlaced   = new Set(saved.placed);
    renderPatchesBoard();
    timerRestore('patches', saved.timer || 0);
    if (saved.solved) timerPause('patches');
  } else {
    newPatchesGame();
  }
}

function newPatchesGame() {
  pPlaced = new Set();
  document.getElementById('patches-status').textContent = '';
  document.getElementById('patches-count').textContent = '0';
  const result = genPatchesSolution(P_ROWS, P_COLS);
  pSolution = result.grid; pPatches = result.patches;
  renderPatchesBoard();
  timerReset('patches');
  savePatches();
}

function genPatchesSolution(rows, cols) {
  const grid = Array.from({length: rows}, () => Array(cols).fill(-1));
  const patches = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== -1) continue;
      const candidates = [];
      for (let h = 1; h <= Math.min(4, rows - r); h++) {
        for (let w = 1; w <= Math.min(6, cols - c); w++) {
          if (h * w > 6) continue;
          let ok = true;
          for (let dr = 0; dr < h && ok; dr++)
            for (let dc = 0; dc < w && ok; dc++)
              if (grid[r+dr][c+dc] !== -1) ok = false;
          if (ok) candidates.push({h, w});
        }
      }
      const good = candidates.filter(x => x.h * x.w >= 2);
      const pool = good.length > 0 ? good : candidates;
      const {h, w} = pool[Math.floor(Math.random() * pool.length)];
      const id = patches.length;
      const cells = [];
      for (let dr = 0; dr < h; dr++)
        for (let dc = 0; dc < w; dc++) { grid[r+dr][c+dc] = id; cells.push([r+dr, c+dc]); }
      const shapeType = h === w ? 'square' : w > h ? 'wide' : 'tall';
      const [clueR, clueC] = cells[Math.floor(Math.random() * cells.length)];
      patches.push({id, h, w, cells, clueR, clueC, shapeType});
    }
  }
  return {grid, patches};
}

function renderPatchesBoard() {
  const grid = document.getElementById('patches-grid');
  pCellSize = Math.floor(Math.min((window.innerWidth - 4) / P_COLS, (window.innerHeight - 220) / P_ROWS));
  grid.style.cssText = `grid-template-columns:repeat(${P_COLS},${pCellSize}px);grid-template-rows:repeat(${P_ROWS},${pCellSize}px);width:${pCellSize*P_COLS}px;height:${pCellSize*P_ROWS}px`;
  grid.innerHTML = '';
  for (let r = 0; r < P_ROWS; r++) {
    for (let c = 0; c < P_COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'p-cell';
      cell.dataset.r = r; cell.dataset.c = c;
      cell.style.width = pCellSize + 'px'; cell.style.height = pCellSize + 'px';
      const pid = pSolution[r][c];
      const patch = pPatches[pid];
      if (patch.clueR === r && patch.clueC === c) {
        const clue = document.createElement('div'); clue.className = 'p-clue';
        const shape = document.createElement('div'); shape.className = `p-shape p-${patch.shapeType}`;
        const num = document.createElement('div'); num.className = 'p-num';
        num.textContent = patch.h * patch.w;
        clue.appendChild(shape); clue.appendChild(num); cell.appendChild(clue);
      }
      if (pPlaced.has(pid)) cell.classList.add('p-placed');
      grid.appendChild(cell);
    }
  }
  document.getElementById('patches-count').textContent = pPlaced.size;
  if (!pListenersReady) { pListenersReady = true; setupPatchesListeners(); }
}

function pCellAt(x, y) {
  const rect = document.getElementById('patches-grid').getBoundingClientRect();
  const c = Math.floor((x - rect.left) / pCellSize);
  const r = Math.floor((y - rect.top) / pCellSize);
  return (r >= 0 && r < P_ROWS && c >= 0 && c < P_COLS) ? [r, c] : null;
}

function clearPPreview() { document.querySelectorAll('#patches-grid .p-preview').forEach(el => el.classList.remove('p-preview')); }

function updatePPreview(r1, c1, r2, c2) {
  clearPPreview();
  const minR = Math.min(r1,r2), maxR = Math.max(r1,r2), minC = Math.min(c1,c2), maxC = Math.max(c1,c2);
  for (let r = minR; r <= maxR; r++)
    for (let c = minC; c <= maxC; c++) {
      const el = document.querySelector(`#patches-grid .p-cell[data-r="${r}"][data-c="${c}"]`);
      if (el) el.classList.add('p-preview');
    }
}

function doPlacePatch(r1, c1, r2, c2) {
  clearPPreview();
  const minR = Math.min(r1,r2), maxR = Math.max(r1,r2), minC = Math.min(c1,c2), maxC = Math.max(c1,c2);
  const h = maxR - minR + 1, w = maxC - minC + 1;
  const pid = pSolution[minR][minC];

  if (r1 === r2 && c1 === c2 && pPlaced.has(pid)) {
    pPlaced.delete(pid); buzz('medium'); renderPatchesBoard(); savePatches(); return;
  }

  let allSame = true;
  for (let r = minR; r <= maxR && allSame; r++)
    for (let c = minC; c <= maxC && allSame; c++)
      if (pSolution[r][c] !== pid) allSame = false;

  const patch = pPatches[pid];
  if (!allSame || pPlaced.has(pid) || h !== patch.h || w !== patch.w) {
    for (let r = minR; r <= maxR; r++)
      for (let c = minC; c <= maxC; c++) {
        const el = document.querySelector(`#patches-grid .p-cell[data-r="${r}"][data-c="${c}"]`);
        if (el) { el.classList.add('p-error'); el.addEventListener('animationend', () => el.classList.remove('p-error'), {once:true}); }
      }
    buzz('medium'); return;
  }

  pPlaced.add(pid); buzz('light'); renderPatchesBoard(); savePatches();
  if (pPlaced.size === pPatches.length) {
    timerPause('patches');
    buzz('heavy');
    document.getElementById('patches-status').textContent = '🎉 Solved!';
    savePatches(true);
  }
}

function savePatches(solved = false) {
  saveState('patches', { solution: pSolution, patches: pPatches, placed: [...pPlaced], timer: timerElapsed('patches'), solved: solved || (pPlaced.size === pPatches.length) });
}

function setupPatchesListeners() {
  const g = document.getElementById('patches-grid');
  g.addEventListener('touchstart', e => {
    e.preventDefault();
    const pos = pCellAt(e.touches[0].clientX, e.touches[0].clientY);
    if (pos) { pDragStart = pos; updatePPreview(pos[0], pos[1], pos[0], pos[1]); }
  }, {passive: false});
  g.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!pDragStart) return;
    const pos = pCellAt(e.touches[0].clientX, e.touches[0].clientY);
    if (pos) updatePPreview(pDragStart[0], pDragStart[1], pos[0], pos[1]);
  }, {passive: false});
  g.addEventListener('touchend', e => {
    if (!pDragStart) return;
    const t = e.changedTouches[0];
    const pos = pCellAt(t.clientX, t.clientY) || pDragStart;
    doPlacePatch(pDragStart[0], pDragStart[1], pos[0], pos[1]);
    pDragStart = null;
  });
  g.addEventListener('mousedown', e => {
    const pos = pCellAt(e.clientX, e.clientY);
    if (pos) { pDragStart = pos; updatePPreview(pos[0], pos[1], pos[0], pos[1]); }
  });
  g.addEventListener('mousemove', e => {
    if (!pDragStart) return;
    const pos = pCellAt(e.clientX, e.clientY);
    if (pos) updatePPreview(pDragStart[0], pDragStart[1], pos[0], pos[1]);
  });
  g.addEventListener('mouseup', e => {
    if (!pDragStart) return;
    const pos = pCellAt(e.clientX, e.clientY) || pDragStart;
    doPlacePatch(pDragStart[0], pDragStart[1], pos[0], pos[1]);
    pDragStart = null;
  });
}

document.getElementById('patches-new').addEventListener('click', newPatchesGame);

// ═══════════════════════════════════════════════════════════════════════════
// BINARIO
// ═══════════════════════════════════════════════════════════════════════════
let binarioSize = 6, binarioPuzzle = [], binarioGiven = [], binarioSolved = false;

function initBinario() {
  const saved = loadState('binario');
  if (saved && saved.size === binarioSize && !saved.solved) {
    binarioPuzzle = saved.puzzle;
    binarioGiven  = saved.given;
    binarioSolved = false;
    renderBinarioGrid();
    document.getElementById('binario-status').textContent = '';
    timerRestore('binario', saved.timer || 0);
  } else {
    newBinarioGame();
  }
}

function newBinarioGame() {
  binarioSolved = false;
  document.getElementById('binario-status').textContent = '';
  const solution = generateBinarioSolution(binarioSize);
  if (!solution) { newBinarioGame(); return; }
  const { puzzle, given } = createBinarioPuzzle(solution, binarioSize);
  binarioPuzzle = puzzle; binarioGiven = given;
  renderBinarioGrid();
  timerReset('binario');
  saveBinario();
}

function saveBinario() {
  saveState('binario', { puzzle: binarioPuzzle, given: binarioGiven, size: binarioSize, solved: binarioSolved, timer: timerElapsed('binario') });
}

function generateBinarioSolution(size) {
  const board = Array.from({length: size}, () => Array(size).fill(-1));
  return fillBinarioBoard(board, size, 0) ? board : null;
}

function fillBinarioBoard(board, size, pos) {
  if (pos === size * size) return true;
  const r = Math.floor(pos/size), c = pos%size;
  for (const v of (Math.random() < 0.5 ? [0,1] : [1,0])) {
    board[r][c] = v;
    if (binarioCellOk(board, r, c, size) && fillBinarioBoard(board, size, pos+1)) return true;
  }
  board[r][c] = -1;
  return false;
}

function binarioCellOk(board, r, c, size) {
  const half = size / 2;
  let rz = 0, ro = 0;
  for (let i = 0; i <= c; i++) { if (board[r][i] === 0) rz++; else if (board[r][i] === 1) ro++; }
  if (rz > half || ro > half) return false;
  if (c >= 2 && board[r][c] === board[r][c-1] && board[r][c] === board[r][c-2]) return false;
  let cz = 0, co = 0;
  for (let i = 0; i <= r; i++) { if (board[i][c] === 0) cz++; else if (board[i][c] === 1) co++; }
  if (cz > half || co > half) return false;
  if (r >= 2 && board[r][c] === board[r-1][c] && board[r][c] === board[r-2][c]) return false;
  if (c === size-1) { const rStr = board[r].join(''); for (let pr = 0; pr < r; pr++) if (board[pr].join('') === rStr) return false; }
  if (r === size-1) { const cStr = board.map(row => row[c]).join(''); for (let pc = 0; pc < c; pc++) if (board.map(row => row[pc]).join('') === cStr) return false; }
  return true;
}

function createBinarioPuzzle(solution, size) {
  const puzzle = solution.map(r => [...r]);
  const given  = solution.map(r => r.map(() => true));
  const removes = { 6: 20, 8: 36, 10: 55 }[size] || 20;
  let count = 0;
  for (const pos of shuffleArr([...Array(size*size).keys()])) {
    if (count >= removes) break;
    puzzle[Math.floor(pos/size)][pos%size] = -1;
    given[Math.floor(pos/size)][pos%size] = false;
    count++;
  }
  return { puzzle, given };
}

function renderBinarioGrid() {
  const grid = document.getElementById('binario-grid');
  const cellSize = Math.min(Math.floor((window.innerWidth - 32) / binarioSize), Math.floor((window.innerHeight - 260) / binarioSize));
  grid.style.cssText = `grid-template-columns:repeat(${binarioSize},${cellSize}px);grid-template-rows:repeat(${binarioSize},${cellSize}px);width:${cellSize*binarioSize}px`;
  grid.innerHTML = '';
  for (let r = 0; r < binarioSize; r++) {
    for (let c = 0; c < binarioSize; c++) {
      const cell = document.createElement('div');
      cell.className = 'b-cell';
      cell.dataset.r = r; cell.dataset.c = c;
      cell.style.fontSize = `${Math.round(cellSize * 0.46)}px`;
      const val = binarioPuzzle[r][c];
      if (val !== -1) { cell.dataset.val = val; cell.textContent = val === 0 ? 'O' : 'I'; }
      if (binarioGiven[r][c]) cell.classList.add('given');
      else cell.addEventListener('click', () => toggleBinarioCell(r, c));
      grid.appendChild(cell);
    }
  }
  updateBinarioErrors();
}

function toggleBinarioCell(r, c) {
  if (binarioSolved) return;
  const cur = binarioPuzzle[r][c];
  binarioPuzzle[r][c] = cur === -1 ? 0 : cur === 0 ? 1 : -1;
  const cell = document.querySelector(`.b-cell[data-r="${r}"][data-c="${c}"]`);
  const val = binarioPuzzle[r][c];
  if (val === -1) { delete cell.dataset.val; cell.textContent = ''; }
  else { cell.dataset.val = val; cell.textContent = val === 0 ? 'O' : 'I'; }
  buzz('light');
  updateBinarioErrors();
  saveBinario();
  checkBinarioWin();
}

function getBinarioErrors() {
  const errors = new Set();
  const b = binarioPuzzle, size = binarioSize, half = size/2;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (b[r][c] === -1) continue;
      if (c >= 2 && b[r][c] === b[r][c-1] && b[r][c] === b[r][c-2]) [c-2,c-1,c].forEach(i => errors.add(`${r},${i}`));
      if (r >= 2 && b[r][c] === b[r-1][c] && b[r][c] === b[r-2][c]) [r-2,r-1,r].forEach(i => errors.add(`${i},${c}`));
    }
    const rz = b[r].filter(v=>v===0).length, ro = b[r].filter(v=>v===1).length;
    if (rz > half || ro > half) for (let c = 0; c < size; c++) errors.add(`${r},${c}`);
  }
  for (let c = 0; c < size; c++) {
    const col = b.map(row => row[c]);
    const cz = col.filter(v=>v===0).length, co = col.filter(v=>v===1).length;
    if (cz > half || co > half) for (let r = 0; r < size; r++) errors.add(`${r},${c}`);
  }
  return errors;
}

function updateBinarioErrors() {
  const errors = getBinarioErrors();
  document.querySelectorAll('.b-cell').forEach(cell =>
    cell.classList.toggle('b-error', errors.has(`${cell.dataset.r},${cell.dataset.c}`))
  );
}

function checkBinarioWin() {
  const b = binarioPuzzle, size = binarioSize;
  if (b.some(row => row.includes(-1))) return;
  if (getBinarioErrors().size > 0) return;
  for (let r = 0; r < size; r++) for (let r2 = r+1; r2 < size; r2++) if (b[r].join('') === b[r2].join('')) return;
  for (let c = 0; c < size; c++) { const col = b.map(row => row[c]).join(''); for (let c2 = c+1; c2 < size; c2++) if (col === b.map(row => row[c2]).join('')) return; }
  binarioSolved = true;
  timerPause('binario');
  buzz('heavy');
  document.getElementById('binario-status').textContent = '🎉 Solved!';
  saveBinario();
}

document.getElementById('binario-new').addEventListener('click', newBinarioGame);
document.querySelectorAll('.size-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.size-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    binarioSize = parseInt(btn.dataset.size);
    saveState('binario', null);
    newBinarioGame();
  });
});
