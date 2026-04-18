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
  const inits = { bubbles: initBubbles, spinner: initSpinner, tapper: initTapper, doodle: initDoodle, ball: initBall, slider: initSlider, sudoku: initSudoku, patches: initPatches, binario: initBinario };
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

// ═══════════════════════════════════════════════════════════════════════════
// SUDOKU
// ═══════════════════════════════════════════════════════════════════════════
let sudokuPuzzle = [];
let sudokuSolution = [];
let sudokuGiven = [];
let sudokuSelected = null;
let sudokuDiff = 'easy';
let sudokuSolved = false;

function initSudoku() {
  newSudokuGame();
}

function newSudokuGame() {
  sudokuSolved = false;
  sudokuSelected = null;
  const { puzzle, solution } = generateSudoku(sudokuDiff);
  sudokuPuzzle = puzzle;
  sudokuSolution = solution;
  sudokuGiven = puzzle.map(row => row.map(v => v !== 0));
  renderSudokuGrid();
  document.getElementById('sudoku-status').textContent = '';
}

function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sudokuCellValid(board, r, c, num) {
  if (board[r].includes(num)) return false;
  for (let i = 0; i < 9; i++) if (board[i][c] === num) return false;
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let i = br; i < br + 3; i++)
    for (let j = bc; j < bc + 3; j++)
      if (board[i][j] === num) return false;
  return true;
}

function fillBoard(board) {
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9), c = i % 9;
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
  const removes = { easy: 36, medium: 46, hard: 54 };
  let count = removes[difficulty] || 36;
  for (const pos of shuffleArr([...Array(81).keys()])) {
    if (count <= 0) break;
    puzzle[Math.floor(pos / 9)][pos % 9] = 0;
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
      cell.dataset.r = r;
      cell.dataset.c = c;
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
}

function selectSudokuCell(r, c) {
  sudokuSelected = [r, c];
  highlightSudokuCells();
  buzz('light');
}

function highlightSudokuCells() {
  const [sr, sc] = sudokuSelected || [-1, -1];
  const selVal = (sr >= 0) ? sudokuPuzzle[sr][sc] : 0;
  document.querySelectorAll('.sudoku-cell').forEach(cell => {
    const r = +cell.dataset.r, c = +cell.dataset.c;
    const val = sudokuPuzzle[r][c];
    cell.classList.remove('selected', 'related', 'same-num', 'error');
    if (r === sr && c === sc) {
      cell.classList.add('selected');
    } else if (sr >= 0) {
      const sameBox = Math.floor(r/3) === Math.floor(sr/3) && Math.floor(c/3) === Math.floor(sc/3);
      if (r === sr || c === sc || sameBox) cell.classList.add('related');
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
    btn.className = 'numpad-btn';
    btn.textContent = n;
    btn.addEventListener('click', () => enterSudokuNum(n));
    pad.appendChild(btn);
  }
  const erase = document.createElement('button');
  erase.className = 'numpad-btn erase-btn';
  erase.textContent = '⌫';
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
  buzz('light');
  if (checkSudokuWin()) {
    sudokuSolved = true;
    buzz('heavy');
    document.getElementById('sudoku-status').textContent = '🎉 Solved!';
    sudokuSelected = null;
    highlightSudokuCells();
    document.querySelectorAll('.sudoku-cell').forEach(el => el.classList.add('win'));
  }
}

function checkSudokuWin() {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (sudokuPuzzle[r][c] !== sudokuSolution[r][c]) return false;
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
// PATCHES
// ═══════════════════════════════════════════════════════════════════════════
const PATCH_COLS = 6;
const PATCH_ROWS = 10;
const PATCH_PALETTE = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#f8fafc','#1e293b'];
let patchColor = PATCH_PALETTE[4];
let isPatchPainting = false;

function initPatches() {
  buildPatchPalette();
  buildPatchGrid();
}

function buildPatchPalette() {
  const wrap = document.getElementById('patches-palette');
  if (wrap.childElementCount > 0) return;
  PATCH_PALETTE.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'patch-color-btn' + (i === 4 ? ' active' : '');
    btn.style.background = c;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.patch-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      patchColor = c;
    });
    wrap.appendChild(btn);
  });
}

function buildPatchGrid() {
  const grid = document.getElementById('patches-grid');
  grid.innerHTML = '';
  for (let i = 0; i < PATCH_COLS * PATCH_ROWS; i++) {
    const p = document.createElement('div');
    p.className = 'patch';
    grid.appendChild(p);
  }

  grid.addEventListener('touchstart', e => {
    e.preventDefault();
    isPatchPainting = true;
    paintPatchAt(e.touches[0]);
  }, { passive: false });
  grid.addEventListener('touchmove', e => {
    e.preventDefault();
    if (isPatchPainting) paintPatchAt(e.touches[0]);
  }, { passive: false });
  grid.addEventListener('touchend', () => { isPatchPainting = false; });
  grid.addEventListener('mousedown', e => { isPatchPainting = true; paintPatchAt(e); });
  grid.addEventListener('mousemove', e => { if (isPatchPainting) paintPatchAt(e); });
  grid.addEventListener('mouseup', () => { isPatchPainting = false; });
}

function paintPatchAt(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (el && el.classList.contains('patch') && el.style.background !== patchColor) {
    el.style.background = patchColor;
    buzz('light');
  }
}

document.getElementById('patches-clear').addEventListener('click', () => {
  document.querySelectorAll('.patch').forEach(p => { p.style.background = '#e2e8f0'; });
});

// ═══════════════════════════════════════════════════════════════════════════
// BINARIO
// ═══════════════════════════════════════════════════════════════════════════
let binarioSize = 6;
let binarioPuzzle = [];
let binarioGiven = [];
let binarioSolved = false;

function initBinario() {
  newBinarioGame();
}

function newBinarioGame() {
  binarioSolved = false;
  document.getElementById('binario-status').textContent = '';
  const solution = generateBinarioSolution(binarioSize);
  if (!solution) { newBinarioGame(); return; }
  const { puzzle, given } = createBinarioPuzzle(solution, binarioSize);
  binarioPuzzle = puzzle;
  binarioGiven = given;
  renderBinarioGrid();
}

function generateBinarioSolution(size) {
  const board = Array.from({length: size}, () => Array(size).fill(-1));
  return fillBinarioBoard(board, size, 0) ? board : null;
}

function fillBinarioBoard(board, size, pos) {
  if (pos === size * size) return true;
  const r = Math.floor(pos / size), c = pos % size;
  for (const v of (Math.random() < 0.5 ? [0, 1] : [1, 0])) {
    board[r][c] = v;
    if (binarioCellOk(board, r, c, size)) {
      if (fillBinarioBoard(board, size, pos + 1)) return true;
    }
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
  if (c === size - 1) {
    const rStr = board[r].join('');
    for (let pr = 0; pr < r; pr++) if (board[pr].join('') === rStr) return false;
  }
  if (r === size - 1) {
    const cStr = board.map(row => row[c]).join('');
    for (let pc = 0; pc < c; pc++) if (board.map(row => row[pc]).join('') === cStr) return false;
  }
  return true;
}

function createBinarioPuzzle(solution, size) {
  const puzzle = solution.map(r => [...r]);
  const given = solution.map(r => r.map(() => true));
  const removes = { 6: 20, 8: 36, 10: 55 }[size] || 20;
  let count = 0;
  for (const pos of shuffleArr([...Array(size * size).keys()])) {
    if (count >= removes) break;
    puzzle[Math.floor(pos / size)][pos % size] = -1;
    given[Math.floor(pos / size)][pos % size] = false;
    count++;
  }
  return { puzzle, given };
}

function renderBinarioGrid() {
  const grid = document.getElementById('binario-grid');
  const cellSize = Math.min(
    Math.floor((window.innerWidth - 32) / binarioSize),
    Math.floor((window.innerHeight - 250) / binarioSize)
  );
  grid.style.cssText = `grid-template-columns:repeat(${binarioSize},${cellSize}px);grid-template-rows:repeat(${binarioSize},${cellSize}px);width:${cellSize*binarioSize}px`;
  grid.innerHTML = '';
  for (let r = 0; r < binarioSize; r++) {
    for (let c = 0; c < binarioSize; c++) {
      const cell = document.createElement('div');
      cell.className = 'b-cell';
      cell.dataset.r = r; cell.dataset.c = c;
      cell.style.fontSize = `${Math.round(cellSize * 0.52)}px`;
      const val = binarioPuzzle[r][c];
      if (val !== -1) { cell.dataset.val = val; cell.textContent = '●'; }
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
  else { cell.dataset.val = val; cell.textContent = '●'; }
  buzz('light');
  updateBinarioErrors();
  checkBinarioWin();
}

function getBinarioErrors() {
  const errors = new Set();
  const b = binarioPuzzle, size = binarioSize, half = size / 2;
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
  document.querySelectorAll('.b-cell').forEach(cell => {
    cell.classList.toggle('b-error', errors.has(`${cell.dataset.r},${cell.dataset.c}`));
  });
}

function checkBinarioWin() {
  const b = binarioPuzzle, size = binarioSize;
  if (b.some(row => row.includes(-1))) return;
  if (getBinarioErrors().size > 0) return;
  for (let r = 0; r < size; r++)
    for (let r2 = r+1; r2 < size; r2++)
      if (b[r].join('') === b[r2].join('')) return;
  for (let c = 0; c < size; c++) {
    const col = b.map(row => row[c]).join('');
    for (let c2 = c+1; c2 < size; c2++)
      if (col === b.map(row => row[c2]).join('')) return;
  }
  binarioSolved = true;
  buzz('heavy');
  document.getElementById('binario-status').textContent = '🎉 Solved!';
}

document.getElementById('binario-new').addEventListener('click', newBinarioGame);

document.querySelectorAll('.size-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.size-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    binarioSize = parseInt(btn.dataset.size);
    newBinarioGame();
  });
});
