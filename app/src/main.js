// Golden Coast Cover Studio v2 — editor state + UI wiring.
import { GRADES, GRADE_KEYS, LAYOUTS, SIZES, layoutRects, renderCover, exportCover } from './cover.js';

const SAMPLES = ['coast.jpg', 'palms.jpg', 'neon.jpg', 'pier.jpg', 'moto.jpg', 'boulevard.jpg'];
const VARIANTS = [
  { name: 'Sunset Coast', grade: 'sunset', layout: 'hero' },
  { name: 'Neon Nights', grade: 'neon', layout: 'comic' },
  { name: 'Ink City', grade: 'ink', layout: '9-panel' },
];

const state = {
  layout: 'hero', grade: 'sunset', strength: 80, halftone: 55, contrast: 15, saturation: 20, grain: 25, vignette: 30,
  title: 'GOLDEN COAST', subtitle: 'a Vice City story', tagline: 'Sunsets, speed & second chances',
  quote: '\u201cThe coast never looked this good.\u201d',
  size: { w: 1920, h: 1080 }, panels: [], selected: 0,
};

const photos = new Map();
let uploadCount = 0;
const preview = document.getElementById('preview');
const pctx = preview.getContext('2d');
let lastRects = null, lastW = 0, lastH = 0;

function panelCount() { return layoutRects(state.layout, 100, 100).panels.length; }
function ensurePanels() {
  const n = panelCount();
  while (state.panels.length < n) {
    const i = state.panels.length;
    state.panels.push({ photo: SAMPLES[(i + Math.floor(i / 3)) % SAMPLES.length], zoom: 1, panX: 0, panY: 0 });
  }
  state.panels.length = n;
  if (state.selected >= n) state.selected = 0;
}

function loadSamples() {
  const jobs = SAMPLES.map((name) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { photos.set(name, img); resolve(); };
    img.onerror = () => resolve();
    img.src = 'samples/' + name;
  }));
  return Promise.all(jobs);
}

function render() {
  ensurePanels();
  const { w, h } = state.size;
  const scale = Math.min(1, 960 / w);
  const pw = Math.round(w * scale), ph = Math.round(h * scale);
  if (preview.width !== pw || preview.height !== ph) { preview.width = pw; preview.height = ph; }
  pctx.clearRect(0, 0, pw, ph);
  renderCover(pctx, state, photos, pw, ph);
  lastRects = layoutRects(state.layout, pw, ph);
  lastW = pw; lastH = ph;
  document.getElementById('selPanel').textContent = String(state.selected + 1);
  document.querySelectorAll('#thumbs img').forEach((el) => {
    el.classList.toggle('active', el.dataset.photo === state.panels[state.selected].photo);
  });
}

function snapshot() { return JSON.stringify(state); }
const undoStack = [], redoStack = [];
function pushHistory() { undoStack.push(snapshot()); if (undoStack.length > 60) undoStack.shift(); redoStack.length = 0; refreshUndo(); }
function applySnapshot(json) { const s = JSON.parse(json); Object.assign(state, s); state.panels = s.panels; syncInputs(); render(); refreshUndo(); }
function refreshUndo() {
  document.getElementById('undoBtn').disabled = undoStack.length === 0;
  document.getElementById('redoBtn').disabled = redoStack.length === 0;
}
function undo() { if (!undoStack.length) return; redoStack.push(snapshot()); applySnapshot(undoStack.pop()); }
function redo() { if (!redoStack.length) return; undoStack.push(snapshot()); applySnapshot(redoStack.pop()); }

function buildButtons(el, items, active, onPick) {
  el.innerHTML = '';
  items.forEach((it) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = it.label || it;
    if ((it.key || it) === active) b.classList.add('active');
    b.addEventListener('click', () => { pushHistory(); onPick(it.key || it); buildButtons(el, items, it.key || it, onPick); render(); });
    el.appendChild(b);
  });
}
function refreshPickers() {
  buildButtons(document.getElementById('variants'), VARIANTS.map((v) => ({ key: v.name, label: v.name })), null, (name) => {
    const v = VARIANTS.find((x) => x.name === name);
    state.grade = v.grade; state.layout = v.layout; syncInputs();
  });
  buildButtons(document.getElementById('layouts'), LAYOUTS.map((l) => ({ key: l, label: l })), state.layout, (l) => { state.layout = l; });
  buildButtons(document.getElementById('grades'), GRADE_KEYS.map((k) => ({ key: k, label: GRADES[k].name })), state.grade, (g) => { state.grade = g; });
  buildButtons(document.getElementById('sizes'), SIZES.map((s) => ({ key: s.name, label: s.name })), state.size.name || SIZES[2].name, (name) => {
    const s = SIZES.find((x) => x.name === name); state.size = { w: s.w, h: s.h, name: s.name };
  });
}
function buildThumbs() {
  const el = document.getElementById('thumbs');
  el.innerHTML = '';
  SAMPLES.forEach((name) => {
    const img = document.createElement('img');
    img.src = 'samples/' + name; img.alt = name; img.dataset.photo = name;
    img.addEventListener('click', () => { pushHistory(); state.panels[state.selected].photo = name; render(); });
    el.appendChild(img);
  });
}
function bindSlider(id, key) {
  const input = document.getElementById(id);
  const val = document.getElementById(id + 'Val');
  let armed = false;
  input.addEventListener('input', () => {
    if (!armed) { pushHistory(); armed = true; }
    state[key] = Number(input.value); val.textContent = input.value + '%'; render();
  });
  input.addEventListener('change', () => { armed = false; });
}
function bindText(id, key) {
  const input = document.getElementById(id);
  let armed = false;
  input.addEventListener('input', () => {
    if (!armed) { pushHistory(); armed = true; }
    state[key] = input.value; render();
  });
  input.addEventListener('change', () => { armed = false; });
}
function syncInputs() {
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('tagline').value = state.tagline;
  document.getElementById('quote').value = state.quote;
  [['strength', 'strength'], ['halftone', 'halftone'], ['contrast', 'contrast'], ['saturation', 'saturation'], ['grain', 'grain'], ['vignette', 'vignette']].forEach(([id, key]) => {
    document.getElementById(id).value = state[key];
    document.getElementById(id + 'Val').textContent = state[key] + '%';
  });
  refreshPickers();
}

// Panel interaction: click to select, drag to pan, scroll to zoom, double-click to reset.
function coverPoint(e) {
  const r = preview.getBoundingClientRect();
  const x = (e.clientX - r.left) * (lastW / r.width);
  const y = (e.clientY - r.top) * (lastH / r.height);
  return { x, y };
}
function panelAt(x, y) {
  if (!lastRects) return -1;
  return lastRects.panels.findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
}
let drag = null;
preview.addEventListener('pointerdown', (e) => {
  const { x, y } = coverPoint(e);
  const i = panelAt(x, y);
  if (i < 0) return;
  pushHistory();
  state.selected = i;
  drag = { i, x, y, moved: false };
  preview.setPointerCapture(e.pointerId);
  render();
});
preview.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { x, y } = coverPoint(e);
  const p = state.panels[drag.i], r = lastRects.panels[drag.i];
  const dx = (x - drag.x) / r.w, dy = (y - drag.y) / r.h;
  if (Math.abs(dx) + Math.abs(dy) > 0.005) drag.moved = true;
  p.panX = Math.max(-2, Math.min(2, (p.panX || 0) + dx * 2));
  p.panY = Math.max(-2, Math.min(2, (p.panY || 0) + dy * 2));
  drag.x = x; drag.y = y;
  render();
});
preview.addEventListener('pointerup', () => { drag = null; });
preview.addEventListener('wheel', (e) => {
  e.preventDefault();
  const { x, y } = coverPoint(e);
  const i = panelAt(x, y);
  if (i < 0) return;
  pushHistory();
  const p = state.panels[i];
  p.zoom = Math.max(1, Math.min(4, (p.zoom || 1) * (e.deltaY < 0 ? 1.12 : 0.89)));
  render();
}, { passive: false });
preview.addEventListener('dblclick', (e) => {
  const { x, y } = coverPoint(e);
  const i = panelAt(x, y);
  if (i < 0) return;
  pushHistory();
  state.panels[i].zoom = 1; state.panels[i].panX = 0; state.panels[i].panY = 0;
  render();
});

document.getElementById('upload').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    const key = 'upload-' + (++uploadCount);
    const img = new Image();
    img.onload = () => { photos.set(key, img); pushHistory(); state.panels[state.selected].photo = key; render(); };
    img.src = reader.result;
  };
  reader.readAsDataURL(f);
  e.target.value = '';
});
document.getElementById('fillAllBtn').addEventListener('click', () => {
  pushHistory();
  const photo = state.panels[state.selected].photo;
  state.panels.forEach((p) => { p.photo = photo; });
  render();
});
document.getElementById('spreadBtn').addEventListener('click', () => {
  pushHistory();
  state.panels.forEach((p, i) => { p.photo = SAMPLES[(i + Math.floor(i / 3)) % SAMPLES.length]; });
  render();
});
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

function download(canvas, name) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function exportPNG(w, h) {
  const c = exportCover(state, photos, w, h);
  return c;
}
document.getElementById('exportBtn').addEventListener('click', () => {
  download(exportPNG(state.size.w, state.size.h), `golden-coast-${state.size.w}x${state.size.h}.png`);
});
document.getElementById('exportAllBtn').addEventListener('click', () => {
  SIZES.forEach((s, i) => {
    setTimeout(() => download(exportPNG(s.w, s.h), `golden-coast-${s.w}x${s.h}.png`), i * 350);
  });
});

bindSlider('strength', 'strength');
bindSlider('halftone', 'halftone');
bindSlider('contrast', 'contrast');
bindSlider('saturation', 'saturation');
bindSlider('grain', 'grain');
bindSlider('vignette', 'vignette');
bindText('title', 'title');
bindText('subtitle', 'subtitle');
bindText('tagline', 'tagline');
bindText('quote', 'quote');

window.CoverStudio = {
  state, photos,
  setVariant(name) {
    const v = VARIANTS.find((x) => x.name === name);
    if (!v) return false;
    pushHistory(); state.grade = v.grade; state.layout = v.layout; syncInputs(); render();
    return true;
  },
  setLayout(l) { pushHistory(); state.layout = l; syncInputs(); render(); },
  setGrade(g) { pushHistory(); state.grade = g; syncInputs(); render(); },
  render() { render(); },
  exportPNG(w, h) { return exportPNG(w, h).toDataURL('image/png'); },
  ready: null,
};

buildThumbs();
refreshPickers();
syncInputs();
const fontsReady = Promise.all([
  document.fonts.load('16px Anton'),
  document.fonts.load('16px Pacifico'),
]).catch(() => undefined);
window.CoverStudio.ready = loadSamples().then(() => fontsReady).then(() => { render(); });
render();
