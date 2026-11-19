// Golden Coast Cover Studio v2 — editor UI.
// State, photos, layout/grade pickers, panel crop, undo/redo, export.
// Exposes window.CoverStudio for testing: state, photos, setVariant,
// render, exportPNG (returns {size, bytes, type, png}) and ready.
(function () {
  'use strict';

  var SAMPLES = [
    { id: 'sample-coast', name: 'Coast', file: 'coast.jpg' },
    { id: 'sample-palms', name: 'Palms', file: 'palms.jpg' },
    { id: 'sample-neon', name: 'Neon', file: 'neon.jpg' },
    { id: 'sample-moto', name: 'Moto', file: 'moto.jpg' },
    { id: 'sample-boulevard', name: 'Boulevard', file: 'boulevard.jpg' },
    { id: 'sample-pier', name: 'Pier', file: 'pier.jpg' }
  ];

  var VARIANTS = {
    sunset: { layout: 'hero', grade: 'sunset', title: 'GOLDEN COAST', subtitle: 'Neon Nights', tagline: 'VICE CITY · SUNSET · NO RULES', quote: 'The coast is calling.', photos: ['sample-coast', 'sample-palms', 'sample-boulevard'] },
    neon: { layout: 'comic', grade: 'neon', title: 'NEON NIGHTS', subtitle: 'Vice City After Dark', tagline: 'DRIVE FAST · SHINE BRIGHT', quote: 'The city never sleeps.', photos: ['sample-neon', 'sample-moto', 'sample-pier'] },
    ink: { layout: 'nine', grade: 'ink', title: 'INK CITY', subtitle: 'A Vice Story', tagline: 'DRAWN IN HALFTONE', quote: 'Every panel a poster.', photos: ['sample-boulevard', 'sample-coast', 'sample-moto', 'sample-neon', 'sample-palms', 'sample-pier', 'sample-coast', 'sample-neon', 'sample-palms'] }
  };

  var state = {
    layout: 'hero', grade: 'sunset', gradeStrength: 1,
    contrast: 1.15, saturation: 1.25, halftone: 0.4, grain: 0.12, vignette: 0.25,
    title: 'GOLDEN COAST', subtitle: 'Neon Nights',
    tagline: 'VICE CITY · SUNSET · NO RULES', quote: 'The coast is calling.',
    size: '1080x1080', panels: []
  };

  var photos = new Map(); // id -> {id, name, src, img}
  var selectedPanel = 0;
  var selectedPhotoId = null;
  var userPhotoCount = 0;
  var undoStack = [];
  var redoStack = [];
  var canvas = document.getElementById('cover');
  var statusEl = document.getElementById('status');

  function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

  function snapshot() { return JSON.stringify(state); }
  function pushHistory() {
    undoStack.push(snapshot());
    if (undoStack.length > 60) undoStack.shift();
    redoStack = [];
    syncUndoButtons();
  }
  function restore(json) {
    var s = JSON.parse(json);
    var keepPanels = state.panels;
    state = s;
    state.panels = state.panels || keepPanels;
    syncControls();
    renderPreview();
  }
  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restore(undoStack.pop());
    syncUndoButtons();
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restore(redoStack.pop());
    syncUndoButtons();
  }
  function syncUndoButtons() {
    var u = document.getElementById('undoBtn'), r = document.getElementById('redoBtn');
    if (u) u.disabled = !undoStack.length;
    if (r) r.disabled = !redoStack.length;
  }

  function panelCount() {
    return CoverEngine.layoutById(state.layout).panels.length;
  }
  function fitPanels() {
    var n = panelCount();
    while (state.panels.length < n) {
      var first = photos.size ? photos.keys().next().value : null;
      state.panels.push({ photoId: first, zoom: 1, ox: 0, oy: 0 });
    }
    state.panels.length = n;
    if (selectedPanel >= n) selectedPanel = 0;
  }

  function imagesMap() {
    var m = new Map();
    photos.forEach(function (p, id) { if (p.img) m.set(id, p.img); });
    return m;
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('cannot load ' + src)); };
      img.src = src;
    });
  }

  function addPhoto(id, name, src) {
    if (photos.has(id)) return Promise.resolve(photos.get(id));
    var rec = { id: id, name: name, src: src, img: null };
    photos.set(id, rec);
    return loadImage(src).then(function (img) {
      rec.img = img;
      return rec;
    });
  }

  function loadSamples() {
    return Promise.all(SAMPLES.map(function (s) {
      return addPhoto(s.id, s.name, 'samples/' + s.file);
    }));
  }

  function sizeOf(id) {
    for (var i = 0; i < CoverEngine.SIZES.length; i++) {
      if (CoverEngine.SIZES[i].id === id) return CoverEngine.SIZES[i];
    }
    return CoverEngine.SIZES[0];
  }

  function renderPreview() {
    var size = sizeOf(state.size);
    var maxW = 960;
    var scale = Math.min(1, maxW / size.w);
    canvas.width = Math.max(2, Math.round(size.w * scale));
    canvas.height = Math.max(2, Math.round(size.h * scale));
    fitPanels();
    CoverEngine.renderCover(canvas, state, imagesMap());
    renderPanelBar();
  }

  function renderPanelBar() {
    var bar = document.getElementById('panelbar');
    if (!bar) return;
    bar.innerHTML = '';
    for (var i = 0; i < panelCount(); i++) {
      (function (idx) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'panel-chip' + (idx === selectedPanel ? ' active' : '');
        b.textContent = 'Panel ' + (idx + 1);
        b.addEventListener('click', function () {
          selectedPanel = idx;
          renderPreview();
        });
        bar.appendChild(b);
      })(i);
    }
  }

  function panelAt(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var px = (clientX - rect.left) * (canvas.width / rect.width);
    var py = (clientY - rect.top) * (canvas.height / rect.height);
    var layout = CoverEngine.layoutById(state.layout);
    var gutter = Math.max(4, Math.round(canvas.width * 0.009));
    var rects = CoverEngine.panelRects(layout, canvas.width, canvas.height, gutter);
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
    }
    return -1;
  }

  function buildChoices(el, items, activeId, onPick) {
    el.innerHTML = '';
    items.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice' + (it.id === activeId ? ' active' : '');
      b.textContent = it.name;
      b.addEventListener('click', function () { onPick(it.id); });
      el.appendChild(b);
    });
  }

  function syncControls() {
    buildChoices(document.getElementById('layouts'), CoverEngine.LAYOUTS, state.layout, function (id) {
      pushHistory(); state.layout = id; fitPanels(); renderPreview(); syncControls();
    });
    buildChoices(document.getElementById('grades'), CoverEngine.GRADES, state.grade, function (id) {
      pushHistory(); state.grade = id; applyGradeDefaults(); renderPreview(); syncControls();
    });
    buildChoices(document.getElementById('sizes'), CoverEngine.SIZES.map(function (s) {
      return { id: s.id, name: s.id.replace('x', ' × ') };
    }), state.size, function (id) {
      pushHistory(); state.size = id; renderPreview(); syncControls();
    });
    var setVal = function (id, val, fmt) {
      var el = document.getElementById(id);
      if (el) el.value = val;
      var lab = document.getElementById(id + 'Val');
      if (lab) lab.textContent = fmt(val);
    };
    setVal('gradeStrength', Math.round(state.gradeStrength * 100), function (v) { return v + '%'; });
    setVal('halftone', Math.round(state.halftone * 100), function (v) { return v + '%'; });
    setVal('contrast', Math.round(state.contrast * 100), function (v) { return v + '%'; });
    setVal('saturation', Math.round(state.saturation * 100), function (v) { return v + '%'; });
    setVal('grain', Math.round(state.grain * 100), function (v) { return v + '%'; });
    setVal('vignette', Math.round(state.vignette * 100), function (v) { return v + '%'; });
    var cap = function (id, v) { var el = document.getElementById(id); if (el) el.value = v; };
    cap('capTitle', state.title); cap('capSubtitle', state.subtitle);
    cap('capTagline', state.tagline); cap('capQuote', state.quote);
    document.querySelectorAll('#variants .variant').forEach(function (b) {
      b.classList.toggle('active', VARIANTS[b.dataset.variant] &&
        VARIANTS[b.dataset.variant].grade === state.grade &&
        VARIANTS[b.dataset.variant].layout === state.layout);
    });
    renderTray();
    syncUndoButtons();
  }

  function applyGradeDefaults() {
    var g = CoverEngine.gradeById(state.grade);
    state.halftone = g.halftone;
    state.contrast = g.contrast;
    state.saturation = g.saturation;
  }

  function renderTray() {
    var tray = document.getElementById('tray');
    if (!tray) return;
    tray.innerHTML = '';
    photos.forEach(function (p) {
      var img = document.createElement('img');
      img.src = p.src;
      img.alt = p.name;
      img.title = p.name + ' — click to put in the selected panel';
      if (p.id === selectedPhotoId) img.classList.add('selected');
      img.addEventListener('click', function () {
        selectedPhotoId = p.id;
        pushHistory();
        fitPanels();
        state.panels[selectedPanel].photoId = p.id;
        state.panels[selectedPanel].zoom = 1;
        state.panels[selectedPanel].ox = 0;
        state.panels[selectedPanel].oy = 0;
        renderPreview(); renderTray();
      });
      tray.appendChild(img);
    });
  }

  function renderSamples() {
    var box = document.getElementById('samples');
    if (!box) return;
    box.innerHTML = '';
    SAMPLES.forEach(function (s) {
      var img = document.createElement('img');
      img.src = 'samples/' + s.file;
      img.alt = s.name;
      img.title = s.name;
      img.addEventListener('click', function () {
        selectedPhotoId = s.id;
        pushHistory();
        fitPanels();
        state.panels[selectedPanel].photoId = s.id;
        state.panels[selectedPanel].zoom = 1;
        state.panels[selectedPanel].ox = 0;
        state.panels[selectedPanel].oy = 0;
        renderPreview(); renderTray();
      });
      box.appendChild(img);
    });
  }

  function applyVariant(key) {
    var v = VARIANTS[key];
    if (!v) return;
    pushHistory();
    state.layout = v.layout;
    state.grade = v.grade;
    state.title = v.title;
    state.subtitle = v.subtitle;
    state.tagline = v.tagline;
    state.quote = v.quote;
    applyGradeDefaults();
    state.panels = [];
    fitPanels();
    for (var i = 0; i < state.panels.length; i++) {
      state.panels[i].photoId = v.photos[i % v.photos.length];
      state.panels[i].zoom = 1;
      state.panels[i].ox = 0;
      state.panels[i].oy = 0;
    }
    selectedPanel = 0;
    syncControls();
    renderPreview();
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }

  function doExport(sizeId, save) {
    var size = sizeOf(sizeId || state.size);
    return CoverEngine.exportCover(state, imagesMap(), size.w, size.h).then(function (blob) {
      var info = { size: size.id, bytes: blob.size, type: blob.type, png: false, magic: [] };
      return blob.arrayBuffer().then(function (buf) {
        var u = new Uint8Array(buf);
        info.magic = [u[0], u[1], u[2], u[3]];
        info.png = u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47;
        if (save) downloadBlob(blob, 'golden-coast-' + size.id + '.png');
        setStatus('Exported ' + size.id + ' — ' + (blob.size / 1024).toFixed(0) + ' KiB PNG');
        return info;
      });
    });
  }

  function bindEvents() {
    document.getElementById('addPhotos').addEventListener('change', function (ev) {
      var files = Array.prototype.slice.call(ev.target.files || []);
      if (!files.length) return;
      pushHistory();
      var jobs = files.map(function (f) {
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onload = function () {
            userPhotoCount++;
            var id = 'user-' + userPhotoCount;
            addPhoto(id, f.name, String(reader.result)).then(resolve);
          };
          reader.readAsDataURL(f);
        });
      });
      Promise.all(jobs).then(function () {
        fitPanels();
        renderPreview(); renderTray();
        setStatus(files.length + ' photo(s) added');
      });
      ev.target.value = '';
    });
    document.getElementById('fillAll').addEventListener('click', function () {
      if (!selectedPhotoId && photos.size) selectedPhotoId = photos.keys().next().value;
      if (!selectedPhotoId) return;
      pushHistory();
      fitPanels();
      state.panels.forEach(function (p) { p.photoId = selectedPhotoId; p.zoom = 1; p.ox = 0; p.oy = 0; });
      renderPreview();
    });
    document.getElementById('spread').addEventListener('click', function () {
      var ids = Array.from(photos.keys());
      if (!ids.length) return;
      pushHistory();
      fitPanels();
      state.panels.forEach(function (p, i) { p.photoId = ids[i % ids.length]; p.zoom = 1; p.ox = 0; p.oy = 0; });
      renderPreview();
    });
    var slider = function (id, key, scale) {
      document.getElementById(id).addEventListener('input', function (ev) {
        state[key] = Number(ev.target.value) * scale;
        var lab = document.getElementById(id + 'Val');
        if (lab) lab.textContent = ev.target.value + '%';
        renderPreview();
      });
      document.getElementById(id).addEventListener('change', function () { pushHistory(); });
    };
    slider('gradeStrength', 'gradeStrength', 0.01);
    slider('halftone', 'halftone', 0.01);
    slider('contrast', 'contrast', 0.01);
    slider('saturation', 'saturation', 0.01);
    slider('grain', 'grain', 0.01);
    slider('vignette', 'vignette', 0.01);
    var caption = function (id, key) {
      document.getElementById(id).addEventListener('input', function (ev) {
        state[key] = ev.target.value;
        renderPreview();
      });
      document.getElementById(id).addEventListener('change', function () { pushHistory(); });
    };
    caption('capTitle', 'title');
    caption('capSubtitle', 'subtitle');
    caption('capTagline', 'tagline');
    caption('capQuote', 'quote');
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('exportPng').addEventListener('click', function () { doExport(state.size, true); });
    document.getElementById('exportAll').addEventListener('click', function () {
      var chain = Promise.resolve();
      CoverEngine.SIZES.forEach(function (s) {
        chain = chain.then(function () { return doExport(s.id, true); });
      });
      chain.then(function () { setStatus('Exported all 3 sizes'); });
    });
    document.querySelectorAll('#variants .variant').forEach(function (b) {
      b.addEventListener('click', function () { applyVariant(b.dataset.variant); });
    });
    // Panel crop: click selects, drag pans, wheel zooms, double-click resets.
    var dragging = null;
    canvas.addEventListener('mousedown', function (ev) {
      var idx = panelAt(ev.clientX, ev.clientY);
      if (idx < 0) return;
      selectedPanel = idx;
      dragging = { x: ev.clientX, y: ev.clientY, ox: state.panels[idx].ox, oy: state.panels[idx].oy };
      renderPreview();
      ev.preventDefault();
    });
    window.addEventListener('mousemove', function (ev) {
      if (!dragging) return;
      var rect = canvas.getBoundingClientRect();
      var p = state.panels[selectedPanel];
      p.ox = dragging.ox + (ev.clientX - dragging.x) / rect.width;
      p.oy = dragging.oy + (ev.clientY - dragging.y) / rect.height;
      p.ox = Math.max(-0.6, Math.min(0.6, p.ox));
      p.oy = Math.max(-0.6, Math.min(0.6, p.oy));
      renderPreview();
    });
    window.addEventListener('mouseup', function () {
      if (dragging) { dragging = null; pushHistory(); }
    });
    canvas.addEventListener('wheel', function (ev) {
      var idx = panelAt(ev.clientX, ev.clientY);
      if (idx < 0) return;
      ev.preventDefault();
      pushHistory();
      var p = state.panels[idx];
      p.zoom = Math.max(1, Math.min(4, p.zoom * (ev.deltaY < 0 ? 1.12 : 0.89)));
      renderPreview();
    }, { passive: false });
    canvas.addEventListener('dblclick', function (ev) {
      var idx = panelAt(ev.clientX, ev.clientY);
      if (idx < 0) return;
      pushHistory();
      var p = state.panels[idx];
      p.zoom = 1; p.ox = 0; p.oy = 0;
      renderPreview();
    });
  }

  var readyPromise = null;
  function init() {
    renderSamples();
    bindEvents();
    fitPanels();
    var fontsReady = Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico')
    ]).catch(function () { return null; });
    readyPromise = Promise.all([fontsReady, loadSamples()]).then(function () {
      applyVariant('sunset');
      return document.fonts.ready.then(function () { renderPreview(); });
    });
    renderPreview();
  }

  window.CoverStudio = {
    state: function () { return state; },
    photos: function () { return Array.from(photos.keys()); },
    setVariant: applyVariant,
    render: renderPreview,
    exportPNG: function (sizeId) { return doExport(sizeId || state.size, false); },
    setSize: function (id) { state.size = id; renderPreview(); },
    setLayout: function (id) { state.layout = id; fitPanels(); renderPreview(); },
    setGrade: function (id) { state.grade = id; applyGradeDefaults(); renderPreview(); },
    ready: function () { return readyPromise; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
