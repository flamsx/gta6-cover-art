// Golden Coast Cover Studio — the editor.
// Wires the page: photos in, caption typed, cover drawn live on canvas,
// exported as a PNG in the common post sizes. A `?shot=` query sets up a
// fixed scene for a screenshot instead (./shots.js).
import { drawCover, defaultState, spreadPhotos, fillAllFrom, layoutPanels, GRADES, LAYOUTS, LAYOUT_LABELS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const SAMPLES = ['boulevard', 'pier', 'palms', 'neon', 'coast', 'moto'];
const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

let state = null;
let selectedPanel = 0;
let dragging = null;
let history = [];
let historyIndex = -1;
let renderQueued = false;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cannot load ' + url));
    img.src = url;
  });
}

/** Loads the bundled sample photos. */
async function loadSamples() {
  const out = [];
  for (const name of SAMPLES) {
    try { out.push(await loadImage(`samples/${name}.jpg`)); }
    catch { /* a missing sample just means one fewer photo */ }
  }
  return out;
}

/* ---- history (undo / redo) ---- */

function snapshot() {
  return JSON.stringify({
    size: state.size, layout: state.layout, grade: state.grade,
    strength: state.strength, contrast: state.contrast, saturation: state.saturation,
    grain: state.grain, vignette: state.vignette, halftone: state.halftone,
    title: state.title, subtitle: state.subtitle, tagline: state.tagline,
    quote: state.quote, quoteSource: state.quoteSource,
    panels: state.panels,
  });
}

function pushHistory() {
  history = history.slice(0, historyIndex + 1);
  history.push(snapshot());
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  syncUndoButtons();
}

function restoreHistory(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  state.panels = s.panels;
  syncControls();
  render();
}

function syncUndoButtons() {
  $('undoBtn').disabled = historyIndex <= 0;
  $('redoBtn').disabled = historyIndex >= history.length - 1;
}

/* ---- rendering ---- */

/** Draws the cover at preview resolution into the visible canvas. */
function render() {
  const [w, h] = SIZES[state.size];
  const scale = Math.min(960 / w, 540 / h, 1);
  const pw = Math.round(w * scale);
  const ph = Math.round(h * scale);
  const off = document.createElement('canvas');
  drawCover(off, state);
  preview.width = pw;
  preview.height = ph;
  pctx.imageSmoothingEnabled = true;
  pctx.imageSmoothingQuality = 'high';
  pctx.drawImage(off, 0, 0, pw, ph);
  // In a full-frame cover shot the preview IS the cover: no editor chrome.
  if (!document.body.classList.contains('shot-cover')) drawSelection();
  $('exportSizeLabel').textContent = state.size.replace('x', ' × ');
}

/** Queues one render on the next animation frame. */
function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; render(); });
}

/** Outlines the selected panel on the preview. */
function drawSelection() {
  const [w, h] = SIZES[state.size];
  const sx = preview.width / w;
  const sy = preview.height / h;
  const rects = layoutPanels(state.layout, w, h);
  const r = rects[selectedPanel];
  if (!r) return;
  pctx.save();
  pctx.strokeStyle = '#ff2e88';
  pctx.lineWidth = 3;
  pctx.setLineDash([10, 6]);
  pctx.strokeRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
  pctx.setLineDash([]);
  pctx.fillStyle = '#ff2e88';
  pctx.font = `bold ${Math.max(13, 15 * sx + 6)}px system-ui, sans-serif`;
  pctx.fillText(`PANEL ${selectedPanel + 1}`, r.x * sx + 8, r.y * sy + 20);
  pctx.restore();
  $('panelLabel').textContent = `${selectedPanel + 1} OF ${rects.length}`;
}

/* ---- controls ---- */

function syncControls() {
  $('photoCount').textContent = `${state.photos.length} LOADED`;
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('taglineInput').value = state.tagline;
  $('quoteInput').value = state.quote;
  $('quoteSourceInput').value = state.quoteSource;
  $('strength').value = state.strength;
  $('contrast').value = state.contrast;
  $('saturation').value = state.saturation;
  $('grain').value = state.grain;
  $('vignette').value = state.vignette;
  $('halftone').checked = state.halftone;
  $('strengthVal').textContent = Number(state.strength).toFixed(2);
  $('contrastVal').textContent = Number(state.contrast).toFixed(2);
  $('saturationVal').textContent = Number(state.saturation).toFixed(2);
  $('grainVal').textContent = Number(state.grain).toFixed(2);
  $('vignetteVal').textContent = Number(state.vignette).toFixed(2);
  document.querySelectorAll('.size-tab').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  document.querySelectorAll('#layoutGrid button').forEach((b) => b.classList.toggle('sel', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeGrid button').forEach((b) => b.classList.toggle('sel', b.dataset.grade === state.grade));
  buildPhotoStrip();
  buildPanelPicker();
  const t = state.panels[selectedPanel];
  if (t) { $('zoom').value = t.scale; $('zoomVal').textContent = `${t.scale.toFixed(2)}×`; }
}

function buildPhotoStrip() {
  const strip = $('photoStrip');
  strip.innerHTML = '';
  state.photos.forEach((img, i) => {
    const el = document.createElement('img');
    el.src = img.src;
    el.alt = `Photo ${i + 1}`;
    el.classList.toggle('sel', state.panels[selectedPanel]?.photo === i);
    el.addEventListener('click', () => {
      state.panels[selectedPanel].photo = i;
      pushHistory();
      syncControls();
      queueRender();
    });
    strip.appendChild(el);
  });
}

function buildPanelPicker() {
  const picker = $('panelPicker');
  picker.innerHTML = '';
  const rects = layoutPanels(state.layout, ...SIZES[state.size]);
  rects.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = String(i + 1);
    b.classList.toggle('sel', i === selectedPanel);
    b.addEventListener('click', () => { selectedPanel = i; syncControls(); render(); });
    picker.appendChild(b);
  });
}

function buildLayoutGrid() {
  const grid = $('layoutGrid');
  LAYOUTS.forEach((name) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = name;
    const cells = layoutPanels(name, 300, 200).length;
    let thumbs = '';
    for (let i = 0; i < cells; i++) thumbs += '<i></i>';
    b.innerHTML = `<span class="layout-thumb ${name}">${thumbs}</span><span class="lbl">${LAYOUT_LABELS[name]}</span>`;
    b.addEventListener('click', () => {
      state.layout = name;
      const keep = state.panels;
      spreadPhotos(state);
      state.panels = state.panels.map((p, i) => (keep[i] ? { ...keep[i], photo: p.photo } : p));
      selectedPanel = 0;
      pushHistory();
      syncControls();
      queueRender();
    });
    grid.appendChild(b);
  });
}

function buildGradeGrid() {
  const grid = $('gradeGrid');
  for (const [name, g] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = name;
    const sw = g.overlay ? `linear-gradient(135deg, ${g.overlay[0]}, ${g.overlay[1]})` : 'linear-gradient(135deg,#888,#444)';
    b.innerHTML = `<span class="swatch" style="background:${sw}"></span><span class="lbl">${g.label}</span>`;
    b.addEventListener('click', () => {
      state.grade = name;
      if (g.halftone) state.halftone = true;
      pushHistory();
      syncControls();
      queueRender();
    });
    grid.appendChild(b);
  }
}

/* ---- preview interaction: pick, pan, zoom, replace ---- */

function panelAt(clientX, clientY) {
  const box = preview.getBoundingClientRect();
  const [w, h] = SIZES[state.size];
  const px = (clientX - box.left) * (w / box.width);
  const py = (clientY - box.top) * (h / box.height);
  const rects = layoutPanels(state.layout, w, h);
  const i = rects.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
  return { index: i, px, py, rects };
}

function bindPreview() {
  preview.addEventListener('pointerdown', (e) => {
    const hit = panelAt(e.clientX, e.clientY);
    if (hit.index < 0) return;
    selectedPanel = hit.index;
    const t = state.panels[selectedPanel];
    dragging = { x: hit.px, y: hit.py, ox: t.ox, oy: t.oy };
    preview.setPointerCapture(e.pointerId);
    syncControls();
    render();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const [w, h] = SIZES[state.size];
    const box = preview.getBoundingClientRect();
    const px = (e.clientX - box.left) * (w / box.width);
    const py = (e.clientY - box.top) * (h / box.height);
    const rects = layoutPanels(state.layout, w, h);
    const r = rects[selectedPanel];
    const t = state.panels[selectedPanel];
    t.ox = Math.max(-0.6, Math.min(0.6, dragging.ox + (px - dragging.x) / r.w));
    t.oy = Math.max(-0.6, Math.min(0.6, dragging.oy + (py - dragging.y) / r.h));
    queueRender();
  });
  preview.addEventListener('pointerup', () => { if (dragging) { dragging = null; pushHistory(); } });
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const hit = panelAt(e.clientX, e.clientY);
    const i = hit.index >= 0 ? hit.index : selectedPanel;
    const t = state.panels[i];
    if (!t) return;
    selectedPanel = i;
    t.scale = Math.max(1, Math.min(4, t.scale * Math.exp(-e.deltaY * 0.0012)));
    $('zoom').value = t.scale;
    $('zoomVal').textContent = `${t.scale.toFixed(2)}×`;
    queueRender();
  }, { passive: false });
  preview.addEventListener('dblclick', (e) => {
    const hit = panelAt(e.clientX, e.clientY);
    const i = hit.index >= 0 ? hit.index : selectedPanel;
    const t = state.panels[i];
    if (!t) return;
    t.scale = 1; t.ox = 0; t.oy = 0;
    pushHistory();
    syncControls();
    queueRender();
  });
  preview.addEventListener('dragover', (e) => e.preventDefault());
  preview.addEventListener('drop', async (e) => {
    e.preventDefault();
    const hit = panelAt(e.clientX, e.clientY);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    for (const f of files) state.photos.push(await loadImage(URL.createObjectURL(f)));
    if (hit.index >= 0) state.panels[hit.index].photo = state.photos.length - 1;
    pushHistory();
    syncControls();
    queueRender();
  });
}

/* ---- export ---- */

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
}

/** Renders the current cover at full size and downloads it as a PNG. */
async function exportSize(size) {
  const off = document.createElement('canvas');
  const keep = state.size;
  state.size = size;
  drawCover(off, state);
  state.size = keep;
  render();
  const [w, h] = SIZES[size];
  const name = `${slug(state.title)}-${w}x${h}.png`;
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return name;
}

async function exportCurrent() {
  const name = await exportSize(state.size);
  $('status').textContent = `Saved ${name}`;
}

async function exportAll() {
  const names = [];
  for (const size of Object.keys(SIZES)) names.push(await exportSize(size));
  $('status').textContent = `Saved ${names.length} PNGs`;
}

/* ---- uploads ---- */

function bindUploads() {
  const input = $('photoInput');
  const openPicker = () => input.click();
  $('addPhotosTop').addEventListener('click', openPicker);
  $('dropZone').addEventListener('click', openPicker);
  input.addEventListener('change', async () => {
    const files = [...input.files].filter((f) => f.type.startsWith('image/'));
    for (const f of files) state.photos.push(await loadImage(URL.createObjectURL(f)));
    input.value = '';
    spreadPhotos(state);
    pushHistory();
    syncControls();
    queueRender();
  });
}

/* ---- control wiring ---- */

function bindControls() {
  document.querySelectorAll('.size-tab').forEach((b) => b.addEventListener('click', () => {
    state.size = b.dataset.size;
    spreadPhotos(state);
    selectedPanel = 0;
    pushHistory();
    syncControls();
    queueRender();
  }));
  $('zoom').addEventListener('input', () => {
    const t = state.panels[selectedPanel];
    if (!t) return;
    t.scale = Number($('zoom').value);
    $('zoomVal').textContent = `${t.scale.toFixed(2)}×`;
    queueRender();
  });
  $('zoom').addEventListener('change', pushHistory);
  $('btnCenter').addEventListener('click', () => {
    const t = state.panels[selectedPanel];
    if (!t) return;
    t.scale = 1; t.ox = 0; t.oy = 0;
    pushHistory(); syncControls(); queueRender();
  });
  $('btnReplace').addEventListener('click', () => {
    const t = state.panels[selectedPanel];
    if (!t || !state.photos.length) return;
    t.photo = (t.photo + 1) % state.photos.length;
    pushHistory(); syncControls(); queueRender();
  });
  $('btnFillAll').addEventListener('click', () => {
    const t = state.panels[selectedPanel];
    if (!t || t.photo < 0) return;
    fillAllFrom(state, t.photo);
    pushHistory(); syncControls(); queueRender();
  });
  $('btnSpread').addEventListener('click', () => {
    spreadPhotos(state);
    pushHistory(); syncControls(); queueRender();
  });
  const bindSlider = (id, key, fmt) => {
    $(id).addEventListener('input', () => {
      state[key] = Number($(id).value);
      $(id + 'Val').textContent = fmt(state[key]);
      queueRender();
    });
    $(id).addEventListener('change', pushHistory);
  };
  bindSlider('strength', 'strength', (v) => v.toFixed(2));
  bindSlider('contrast', 'contrast', (v) => v.toFixed(2));
  bindSlider('saturation', 'saturation', (v) => v.toFixed(2));
  bindSlider('grain', 'grain', (v) => v.toFixed(2));
  bindSlider('vignette', 'vignette', (v) => v.toFixed(2));
  $('halftone').addEventListener('change', () => {
    state.halftone = $('halftone').checked;
    pushHistory();
    queueRender();
  });
  const bindText = (id, key) => {
    $(id).addEventListener('input', () => { state[key] = $(id).value; queueRender(); });
    $(id).addEventListener('change', pushHistory);
  };
  bindText('titleInput', 'title');
  bindText('subtitleInput', 'subtitle');
  bindText('taglineInput', 'tagline');
  bindText('quoteInput', 'quote');
  bindText('quoteSourceInput', 'quoteSource');
  $('exportBtn').addEventListener('click', exportCurrent);
  $('exportAllBtn').addEventListener('click', exportAll);
  $('exportAllTop').addEventListener('click', exportAll);
  $('undoBtn').addEventListener('click', () => {
    if (historyIndex <= 0) return;
    historyIndex -= 1;
    restoreHistory(history[historyIndex]);
    syncUndoButtons();
  });
  $('redoBtn').addEventListener('click', () => {
    if (historyIndex >= history.length - 1) return;
    historyIndex += 1;
    restoreHistory(history[historyIndex]);
    syncUndoButtons();
  });
}

/* ---- boot ---- */

const shot = new URLSearchParams(location.search).get('shot');
const api = {
  loadSamples,
  setState(patch) { Object.assign(state, patch); },
  spreadPhotos: () => spreadPhotos(state),
  syncControls: () => syncControls(),
  render: () => render(),
  markReady() {
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  },
};

if (shot) {
  state = defaultState([]);
  buildLayoutGrid();
  buildGradeGrid();
  bindControls();
  bindPreview();
  runShot(shot, new URLSearchParams(location.search), api);
} else {
  const photos = await loadSamples();
  state = defaultState(photos);
  buildLayoutGrid();
  buildGradeGrid();
  bindControls();
  bindUploads();
  bindPreview();
  pushHistory();
  syncControls();
  await document.fonts.ready;
  render();
}
