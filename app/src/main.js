// Golden Coast Cover Studio v2 — editor: state, controls, live preview, export.
// The app runs offline: sample photos and fonts are files under app/,
// uploads are read on the user's own machine and never leave it.
import { GRADES, LAYOUTS, SIZES, gradeById, sizeById, layoutPanelCount, panelRects, renderCover } from './cover.js';

const SAMPLES = ['coast.jpg', 'palms.jpg', 'neon.jpg', 'moto.jpg', 'pier.jpg', 'boulevard.jpg'];

const VARIANTS = [
  { id: 'sunset', name: 'Sunset Coast', layout: 'hero', grade: 'sunset', title: 'GOLDEN COAST', subtitle: 'Vice City Stories', tagline: 'Sun, sand and trouble.', quote: 'The city never sleeps. Neither do we.' },
  { id: 'neon', name: 'Neon Nights', layout: 'comic', grade: 'neon', title: 'NEON NIGHTS', subtitle: 'After dark in Vice City', tagline: 'Chase the glow.', quote: 'Every light in this city has a price.' },
  { id: 'ink', name: 'Ink City', layout: 'nine', grade: 'ink', title: 'INK CITY', subtitle: 'A Leonida story', tagline: 'Drawn in bold.', quote: 'Nine panels. One city. No mercy.' },
];

const $ = id => document.getElementById(id);
const preview = $('preview');

let photos = [];
let state = freshState();
let selected = 0;
let undoStack = [], redoStack = [];
let renderQueued = false;
let lastWheelPush = 0;

function freshState() {
  return {
    variant: 'sunset', layout: 'hero', grade: 'sunset',
    strength: 85, halftone: 50, contrast: 55, saturation: 60, grain: 25, vignette: 30,
    title: 'GOLDEN COAST', subtitle: 'Vice City Stories',
    tagline: 'Sun, sand and trouble.', quote: 'The city never sleeps. Neither do we.',
    size: 'wide', panels: [{ photo: 0, zoom: 1, panX: 0, panY: 0 }],
  };
}

function ensurePanels() {
  const n = layoutPanelCount(state.layout);
  while (state.panels.length < n) {
    const idx = state.panels.length;
    state.panels.push({ photo: (idx + Math.floor(idx / 3)) % Math.max(1, photos.length), zoom: 1, panX: 0, panY: 0 });
  }
  state.panels.length = n;
  if (selected >= n) selected = 0;
}

function loadImage(src) {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

const ready = (async () => {
  try { await Promise.all([document.fonts.load('16px Anton'), document.fonts.load('16px Pacifico')]); } catch (e) { /* fonts fall back */ }
  await document.fonts.ready;
  photos = (await Promise.all(SAMPLES.map(f => loadImage('samples/' + f)))).filter(Boolean);
  ensurePanels();
  buildUI();
  syncInputs();
  render();
})();

function render() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderCover(preview, state, photos, 900);
  });
}

function pushHistory() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  syncUndoButtons();
}

function syncUndoButtons() {
  $('undoBtn').disabled = undoStack.length === 0;
  $('redoBtn').disabled = redoStack.length === 0;
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(state));
  state = JSON.parse(undoStack.pop());
  ensurePanels(); syncInputs(); render(); syncUndoButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(state));
  state = JSON.parse(redoStack.pop());
  ensurePanels(); syncInputs(); render(); syncUndoButtons();
}

function applyVariant(id) {
  const v = VARIANTS.find(x => x.id === id) || VARIANTS[0];
  pushHistory();
  state.variant = v.id; state.layout = v.layout; state.grade = v.grade;
  state.title = v.title; state.subtitle = v.subtitle;
  state.tagline = v.tagline; state.quote = v.quote;
  ensurePanels(); syncInputs(); render();
}

function setLayout(id) {
  if (!LAYOUTS.some(l => l.id === id)) return;
  pushHistory();
  state.layout = id;
  ensurePanels(); syncInputs(); render();
}

function setGrade(id) {
  if (!GRADES.some(g => g.id === id)) return;
  pushHistory();
  state.grade = id;
  syncInputs(); render();
}

function setSize(id) {
  if (!SIZES.some(s => s.id === id)) return;
  pushHistory();
  state.size = id;
  syncInputs(); render();
}

function syncInputs() {
  document.querySelectorAll('#variants button').forEach(b => b.classList.toggle('active', b.dataset.id === state.variant));
  document.querySelectorAll('#layouts button').forEach(b => b.classList.toggle('active', b.dataset.id === state.layout));
  document.querySelectorAll('#grades button').forEach(b => b.classList.toggle('active', b.dataset.id === state.grade));
  document.querySelectorAll('#sizes button').forEach(b => b.classList.toggle('active', b.dataset.id === state.size));
  for (const k of ['strength', 'halftone', 'contrast', 'saturation', 'grain', 'vignette']) {
    $(k).value = state[k];
    $(k + 'Val').textContent = state[k];
  }
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('tagline').value = state.tagline;
  $('quote').value = state.quote;
  document.querySelectorAll('#thumbs img').forEach((im, i) =>
    im.classList.toggle('sel', state.panels[selected] && state.panels[selected].photo === i));
}

function buildUI() {
  const mkBtn = (parent, label, id, fn) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.dataset.id = id;
    b.addEventListener('click', fn);
    $(parent).appendChild(b);
    return b;
  };
  VARIANTS.forEach(v => mkBtn('variants', v.name, v.id, () => applyVariant(v.id)));
  LAYOUTS.forEach(l => mkBtn('layouts', l.name, l.id, () => setLayout(l.id)));
  GRADES.forEach(g => mkBtn('grades', g.name, g.id, () => setGrade(g.id)));
  SIZES.forEach(s => mkBtn('sizes', s.name, s.id, () => setSize(s.id)));
  const thumbs = $('thumbs');
  photos.forEach((im, i) => {
    const t = document.createElement('img');
    t.src = im.src; t.alt = SAMPLES[i] || 'Uploaded photo';
    t.addEventListener('click', () => {
      pushHistory();
      ensurePanels();
      state.panels[selected].photo = i;
      syncInputs(); render();
    });
    thumbs.appendChild(t);
  });
  for (const k of ['strength', 'halftone', 'contrast', 'saturation', 'grain', 'vignette']) {
    $(k).addEventListener('input', () => {
      state[k] = +$(k).value;
      $(k + 'Val').textContent = state[k];
      render();
    });
    $(k).addEventListener('change', pushHistory);
  }
  for (const k of ['title', 'subtitle', 'tagline', 'quote']) {
    $(k).addEventListener('input', () => { state[k] = $(k).value; render(); });
    $(k).addEventListener('change', pushHistory);
  }
  $('upload').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const im = await loadImage(url);
    if (!im) return;
    pushHistory();
    photos.push(im);
    const t = document.createElement('img');
    t.src = url; t.alt = 'Uploaded photo'; t.classList.add('up');
    const idx = photos.length - 1;
    t.addEventListener('click', () => {
      pushHistory();
      state.panels[selected].photo = idx;
      syncInputs(); render();
    });
    thumbs.appendChild(t);
    ensurePanels();
    state.panels[selected].photo = idx;
    syncInputs(); render();
    e.target.value = '';
  });
  $('fillAllBtn').addEventListener('click', () => {
    pushHistory();
    const p = state.panels[selected] ? state.panels[selected].photo : 0;
    state.panels.forEach(x => { x.photo = p; });
    render();
  });
  $('spreadBtn').addEventListener('click', () => {
    pushHistory();
    state.panels.forEach((x, i) => { x.photo = i % photos.length; });
    render();
  });
  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  $('exportBtn').addEventListener('click', exportCurrent);
  $('exportAllBtn').addEventListener('click', exportAll);
  wireCanvas();
  syncUndoButtons();
}

function panelAt(cx, cy) {
  const geo = panelRects(state.layout, preview.width, preview.height);
  return geo.panels.findIndex(r => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h);
}

function wireCanvas() {
  let drag = null;
  preview.addEventListener('pointerdown', e => {
    const r = preview.getBoundingClientRect();
    const cx = (e.clientX - r.left) * (preview.width / r.width);
    const cy = (e.clientY - r.top) * (preview.height / r.height);
    const i = panelAt(cx, cy);
    if (i < 0) return;
    pushHistory();
    selected = i;
    drag = { x: cx, y: cy, moved: false };
    preview.setPointerCapture(e.pointerId);
    syncInputs();
  });
  preview.addEventListener('pointermove', e => {
    if (!drag) return;
    const r = preview.getBoundingClientRect();
    const cx = (e.clientX - r.left) * (preview.width / r.width);
    const cy = (e.clientY - r.top) * (preview.height / r.height);
    const geo = panelRects(state.layout, preview.width, preview.height);
    const p = geo.panels[selected];
    const panel = state.panels[selected];
    panel.panX = Math.max(-2, Math.min(2, panel.panX + ((cx - drag.x) / p.w) * 2));
    panel.panY = Math.max(-2, Math.min(2, panel.panY + ((cy - drag.y) / p.h) * 2));
    drag.x = cx; drag.y = cy; drag.moved = true;
    render();
  });
  preview.addEventListener('pointerup', () => { drag = null; });
  preview.addEventListener('wheel', e => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastWheelPush > 400) { pushHistory(); lastWheelPush = now; }
    const panel = state.panels[selected];
    panel.zoom = Math.max(1, Math.min(4, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
    render();
  }, { passive: false });
  preview.addEventListener('dblclick', () => {
    pushHistory();
    const panel = state.panels[selected];
    panel.zoom = 1; panel.panX = 0; panel.panY = 0;
    render();
  });
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function exportPNG(w, h) {
  const c = document.createElement('canvas');
  renderCover(c, state, photos, 0, { w, h });
  return new Promise(res => c.toBlob(res, 'image/png'));
}

async function exportCurrent() {
  const s = sizeById(state.size);
  const blob = await exportPNG(s.w, s.h);
  if (blob) download(blob, `golden-coast-${s.w}x${s.h}.png`);
}

async function exportAll() {
  for (const s of SIZES) {
    const blob = await exportPNG(s.w, s.h);
    if (blob) download(blob, `golden-coast-${s.w}x${s.h}.png`);
    await new Promise(r => setTimeout(r, 350));
  }
}

// Test/automation handle: the screenshot script drives the app through this.
window.CoverStudio = {
  get state() { return state; },
  get photos() { return photos; },
  setVariant: applyVariant,
  setLayout,
  setGrade,
  setSize,
  render,
  exportDataURL: async (w, h) => {
    const c = document.createElement('canvas');
    renderCover(c, state, photos, 0, { w, h });
    return c.toDataURL('image/png');
  },
  ready,
};
