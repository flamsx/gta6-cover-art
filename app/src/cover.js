// Golden Coast Cover Studio — the cover engine.
// Draws GTA-style multi-panel poster covers on a 2D canvas, entirely by code:
// panel layouts, gradient-map grades, huge gradient lettering, star rating,
// press quote, starburst badge, palm bottom strip and footer credits.
// No Rockstar logo, artwork or font anywhere: lettering is Anton + Pacifico
// (SIL Open Font License, vendored under app/fonts/).

/** Export sizes: [width, height] in pixels. */
export const SIZES = {
  '1920x1080': [1920, 1080],
  '1080x1350': [1080, 1350],
  '1080x1080': [1080, 1080],
};

/** Grade presets. sat/con/bri/sep are the filter values at strength 1;
 *  overlay is a vertical gradient laid over the photo with `blend`. */
export const GRADES = {
  vice:    { label: 'VICE SUNSET',        sat: 1.35, con: 1.12, bri: 1.02, sep: 0.16, overlay: ['#ff9a3d', '#d63384'], blend: 'soft-light', alpha: 0.50 },
  neon:    { label: 'NEON NIGHT',         sat: 1.50, con: 1.20, bri: 0.95, sep: 0.00, overlay: ['#00e5ff', '#ff2e88'], blend: 'overlay',    alpha: 0.50 },
  golden:  { label: 'GOLDEN HOUR',        sat: 1.25, con: 1.05, bri: 1.06, sep: 0.35, overlay: ['#ffb347', '#ff7b00'], blend: 'soft-light', alpha: 0.45 },
  duotone: { label: 'DUOTONE PINK/TEAL',  sat: 1.10, con: 1.25, bri: 1.00, sep: 0.00, overlay: ['#ff5da2', '#00b3c8'], blend: 'overlay',    alpha: 0.55 },
  comic:   { label: 'COMIC INK',          sat: 1.70, con: 1.60, bri: 1.05, sep: 0.00, overlay: ['#7b2ff7', '#ff8a00'], blend: 'overlay',    alpha: 0.35, halftone: true },
  natural: { label: 'NATURAL',            sat: 1.08, con: 1.06, bri: 1.00, sep: 0.00, overlay: null,                              blend: null,        alpha: 0 },
};

/** Layout names in the order the editor shows them. */
export const LAYOUTS = ['hero', 'comic', 'nine', 'one', 'two', 'three', 'four'];
export const LAYOUT_LABELS = {
  hero: 'HERO', comic: 'COMIC', nine: '9 PANELS', one: '1 PANEL',
  two: '2 PANELS', three: '3 PANELS', four: '4 PANELS',
};

/** Panel cells as fractions [x, y, w, h] of the cover, per layout and aspect. */
function cellsFor(layout, aspect) {
  const L = {
    hero: {
      land: [[0, 0, .575, 1], [.575, 0, .2125, .34], [.7875, 0, .2125, .34],
             [.575, .34, .425, .33], [.575, .67, .2125, .33], [.7875, .67, .2125, .33]],
      port: [[0, 0, 1, .52], [0, .52, .5, .16], [.5, .52, .5, .16],
             [0, .68, 1, .16], [0, .84, .5, .16], [.5, .84, .5, .16]],
    },
    comic: {
      land: [[0, 0, .34, .5], [0, .5, .34, .5], [.34, 0, .33, .5], [.34, .5, .33, .5],
             [.67, 0, .33, .5], [.67, .5, .33, .5]],
      port: [[0, 0, .5, .34], [.5, 0, .5, .34], [0, .34, .5, .33], [.5, .34, .5, .33],
             [0, .67, .5, .33], [.5, .67, .5, .33]],
    },
    nine: {
      land: [[0, 0, 1 / 3, 1 / 3], [1 / 3, 0, 1 / 3, 1 / 3], [2 / 3, 0, 1 / 3, 1 / 3],
             [0, 1 / 3, 1 / 3, 1 / 3], [1 / 3, 1 / 3, 1 / 3, 1 / 3], [2 / 3, 1 / 3, 1 / 3, 1 / 3],
             [0, 2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 1 / 3, 1 / 3], [2 / 3, 2 / 3, 1 / 3, 1 / 3]],
      port: [[0, 0, 1 / 3, 1 / 3], [1 / 3, 0, 1 / 3, 1 / 3], [2 / 3, 0, 1 / 3, 1 / 3],
             [0, 1 / 3, 1 / 3, 1 / 3], [1 / 3, 1 / 3, 1 / 3, 1 / 3], [2 / 3, 1 / 3, 1 / 3, 1 / 3],
             [0, 2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 1 / 3, 1 / 3], [2 / 3, 2 / 3, 1 / 3, 1 / 3]],
    },
    one:   { land: [[0, 0, 1, 1]], port: [[0, 0, 1, 1]] },
    two:   { land: [[0, 0, .5, 1], [.5, 0, .5, 1]], port: [[0, 0, 1, .5], [0, .5, 1, .5]] },
    three: {
      land: [[0, 0, 1, .58], [0, .58, .5, .42], [.5, .58, .5, .42]],
      port: [[0, 0, 1, .55], [0, .55, .5, .45], [.5, .55, .5, .45]],
    },
    four:  {
      land: [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]],
      port: [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]],
    },
  };
  return (L[layout] ?? L.hero)[aspect];
}

/** Panel rects in pixels for a layout on a cover of w x h, with white gutters. */
export function layoutPanels(layout, w, h) {
  const aspect = w >= h ? 'land' : 'port';
  const g = Math.max(4, Math.round(w * 0.004));
  return cellsFor(layout, aspect).map(([fx, fy, fw, fh]) => ({
    x: fx * w + g / 2, y: fy * h + g / 2,
    w: fw * w - g, h: fh * h - g,
  }));
}

/** Default state for a fresh cover. `photos` is the array of loaded images. */
export function defaultState(photos) {
  const state = {
    size: '1920x1080', layout: 'hero', grade: 'vice',
    strength: 0.9, contrast: 0.06, saturation: 0.06, grain: 0.28, vignette: 0.5,
    halftone: false,
    title: 'GOLDEN COAST', subtitle: 'Neon Nights',
    tagline: 'ONE COAST  •  NO RULES  •  COMING SOON',
    quote: 'A FEVER DREAM IN NEON', quoteSource: 'THE COAST HERALD',
    photos: photos || [],
    panels: [],
  };
  spreadPhotos(state);
  return state;
}

/** Assigns photos across the panels of the current layout (round-robin). */
export function spreadPhotos(state) {
  const [w, h] = SIZES[state.size];
  const rects = layoutPanels(state.layout, w, h);
  const n = state.photos.length;
  state.panels = rects.map((_, i) => ({
    photo: n ? i % n : -1,
    scale: 1,
    ox: ((i % 3) - 1) * 0.08,
    oy: ((i % 2) - 0.5) * 0.08,
  }));
}

/** Fills every panel with photo `k`, each panel a different crop of it. */
export function fillAllFrom(state, k) {
  state.panels = state.panels.map((_, i) => ({
    photo: k, scale: 1,
    ox: ((i % 3) - 1) * 0.22,
    oy: ((Math.floor(i / 3) % 3) - 1) * 0.18,
  }));
}

/* ---- photo panels ---- */

/** CSS filter string for a grade at a strength 0..1, with the user's tweaks. */
function gradeFilter(grade, state) {
  const g = GRADES[grade];
  const s = state.strength;
  const sat = (1 + (g.sat - 1) * s) * (1 + state.saturation);
  const con = (1 + (g.con - 1) * s) * (1 + state.contrast);
  const bri = 1 + (g.bri - 1) * s;
  const sep = g.sep * s;
  return `saturate(${sat.toFixed(3)}) contrast(${con.toFixed(3)}) brightness(${bri.toFixed(3)}) sepia(${sep.toFixed(3)})`;
}

/** Draws one photo into a panel rect, cover-fit, with the panel's pan/zoom. */
function drawPhotoInto(ctx, img, rect, t, state) {
  const { x, y, w, h } = rect;
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const s = base * t.scale;
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  const dx = x + (w - dw) / 2 + t.ox * w;
  const dy = y + (h - dh) / 2 + t.oy * h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = gradeFilter(state.grade, state);
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  const g = GRADES[state.grade];
  if (g.overlay) {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, g.overlay[0]);
    grad.addColorStop(1, g.overlay[1]);
    ctx.globalCompositeOperation = g.blend;
    ctx.globalAlpha = g.alpha * state.strength;
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

/* ---- print textures ---- */

let noiseCanvas = null;
function getNoise() {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 128;
  noiseCanvas.height = 128;
  const nctx = noiseCanvas.getContext('2d');
  const data = nctx.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 96);
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
  }
  nctx.putImageData(data, 0, 0);
  return noiseCanvas;
}

let dotCanvas = null;
function getDots() {
  if (dotCanvas) return dotCanvas;
  dotCanvas = document.createElement('canvas');
  dotCanvas.width = 9;
  dotCanvas.height = 9;
  const dctx = dotCanvas.getContext('2d');
  dctx.fillStyle = '#000000';
  dctx.beginPath();
  dctx.arc(4.5, 4.5, 2.1, 0, Math.PI * 2);
  dctx.fill();
  return dotCanvas;
}

/** Film grain over the whole cover. */
function applyGrain(ctx, w, h, amount) {
  if (amount <= 0.01) return;
  const pattern = ctx.createPattern(getNoise(), 'repeat');
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = Math.min(0.55, amount * 0.6);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Darkened corners. */
function applyVignette(ctx, w, h, amount) {
  if (amount <= 0.01) return;
  const r = Math.hypot(w, h) / 2;
  const grad = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${(amount * 0.55).toFixed(3)})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Halftone print dots over the whole cover. */
function applyHalftone(ctx, w, h, alpha) {
  if (alpha <= 0.01) return;
  const pattern = ctx.createPattern(getDots(), 'repeat');
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/* ---- ornaments ---- */

/** A 5-point star path centred at (cx, cy). */
function starPath(ctx, cx, cy, rOuter, rInner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** A spiky starburst seal. */
function burstPath(ctx, cx, cy, rOuter, rInner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** One palm silhouette: curved trunk, five drooping fronds. */
function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // trunk
  ctx.lineWidth = Math.max(1.5, s * 0.07);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.08, y - s * 0.55, x + s * 0.22, y - s * 0.95);
  ctx.stroke();
  // fronds
  const topX = x + s * 0.22;
  const topY = y - s * 0.95;
  ctx.lineWidth = Math.max(1.2, s * 0.045);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * (0.08 + i * 0.2);
    const ex = topX + Math.cos(a) * s * 0.55;
    const ey = topY + Math.sin(a) * s * 0.55 + s * 0.28;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * s * 0.3, topY + Math.sin(a) * s * 0.3 - s * 0.12, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---- title block ---- */

/** Fits a font size so `text` spans at most `maxW` pixels. */
function fitSize(ctx, text, font, start, maxW) {
  let size = start;
  ctx.font = font(size);
  while (size > 12 && ctx.measureText(text).width > maxW) {
    size *= 0.96;
    ctx.font = font(size);
  }
  return size;
}

/** Draws the star rating + press quote line above the title. */
function drawQuote(ctx, w, h, state, titleTop) {
  const size = Math.max(14, h * 0.021);
  const y = titleTop - size * 0.9;
  const quote = `“${state.quote}”  — ${state.quoteSource}`;
  ctx.save();
  ctx.font = `700 ${size}px Anton, sans-serif`;
  const quoteW = ctx.measureText(quote).width;
  const starR = size * 0.62;
  const gap = size * 0.35;
  const totalW = starR * 2 * 5 + gap * 4 + size * 0.8 + quoteW;
  let x = (w - totalW) / 2;
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 5; i++) {
    starPath(ctx, x + starR, y, starR, starR * 0.45);
    ctx.fillStyle = '#FFC93C';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.fill();
    ctx.stroke();
    x += starR * 2 + gap;
  }
  x += size * 0.4;
  ctx.font = `700 ${size}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = size * 0.35;
  ctx.fillText(quote, x, y);
  ctx.restore();
}

/** The giant gradient title with its pink script subtitle. */
function drawTitle(ctx, w, h, state, titleTop) {
  const title = (state.title || 'GOLDEN COAST').toUpperCase();
  const maxW = w * 0.94;
  let size = fitSize(ctx, title, (s) => `${s}px Anton, sans-serif`, h * 0.15, maxW);
  const cx = w / 2;
  const baseline = titleTop + size * 0.98;
  ctx.save();
  ctx.translate(cx, baseline);
  ctx.rotate(-0.03);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  const grad = ctx.createLinearGradient(0, -size, 0, size * 0.12);
  grad.addColorStop(0, '#FFF3B0');
  grad.addColorStop(0.35, '#FFD23F');
  grad.addColorStop(0.62, '#FF8A00');
  grad.addColorStop(1, '#FF3D77');
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.strokeStyle = '#1A0533';
  ctx.lineWidth = size * 0.16;
  ctx.strokeText(title, 0, 0);
  ctx.strokeStyle = '#2A0A4A';
  ctx.lineWidth = size * 0.09;
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = grad;
  ctx.fillText(title, 0, 0);
  ctx.restore();

  // script subtitle, overlapping the title's foot, tilted the other way
  const sub = state.subtitle || '';
  if (sub.trim()) {
    const subSize = size * 0.52;
    ctx.save();
    ctx.translate(cx + w * 0.07, baseline + size * 0.42);
    ctx.rotate(-0.055);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = subSize * 0.14;
    ctx.strokeText(sub, 0, 0);
    ctx.fillStyle = '#FF5DA2';
    ctx.fillText(sub, 0, 0);
    ctx.restore();
  }
  return baseline;
}

/** Pink starburst "ORIGINAL / COVER ART" seal near the top right. */
function drawBadge(ctx, w, h) {
  const r = Math.min(w, h) * 0.058;
  const cx = w * 0.86;
  const cy = h * 0.40;
  ctx.save();
  burstPath(ctx, cx, cy, r, r * 0.78, 14);
  ctx.fillStyle = '#FF2E88';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.68, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1.5, r * 0.04);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `${r * 0.30}px Anton, sans-serif`;
  ctx.fillText('ORIGINAL', cx, cy - r * 0.16);
  ctx.font = `${r * 0.20}px Anton, sans-serif`;
  ctx.fillText('COVER ART', cx, cy + r * 0.22);
  ctx.restore();
}

/** Bottom band: sunset gradient, palm silhouettes, tagline in spaced caps. */
function drawStrip(ctx, w, h, state) {
  const stripH = h * 0.055;
  const y = h * 0.905;
  ctx.save();
  const grad = ctx.createLinearGradient(0, y, 0, y + stripH);
  grad.addColorStop(0, '#2A0A4A');
  grad.addColorStop(0.5, '#7B1E5B');
  grad.addColorStop(1, '#FF7B2E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, w, stripH);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, y, w, Math.max(2, stripH * 0.06));
  // palms along the band
  const palmH = stripH * 1.15;
  const step = w / 9;
  for (let i = 0; i < 10; i++) {
    const px = i * step + step * 0.5;
    const flip = i % 2 === 0 ? 1 : -1;
    ctx.save();
    ctx.translate(px, y + stripH);
    ctx.scale(flip, 1);
    drawPalm(ctx, 0, 0, palmH, 'rgba(20,4,32,0.85)');
    ctx.restore();
  }
  // tagline
  const size = Math.max(12, stripH * 0.42);
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = size * 0.3;
  const tag = (state.tagline || '').toUpperCase();
  const maxW = w * 0.72;
  if (ctx.measureText(tag).width > maxW) {
    ctx.font = `${Math.max(10, (size * maxW) / ctx.measureText(tag).width)}px Anton, sans-serif`;
  }
  ctx.fillText(tag, w / 2, y + stripH / 2);
  ctx.restore();
}

/** Tiny credits line + barcode at the very foot. */
function drawFooter(ctx, w, h, state) {
  const y = h * 0.978;
  const size = Math.max(9, h * 0.011);
  ctx.save();
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const title = (state.title || 'GOLDEN COAST').toUpperCase();
  ctx.fillText(
    `${title}  —  A GOLDEN COAST COVER STUDIO PICTURE  •  STARRING YOU  •  SHOT ON YOUR OWN CAMERA  •  GRADED BY HAND  •  LETTERING AND SEAL ORIGINAL`,
    w * 0.012, y,
  );
  // barcode block, bottom right
  const bw = w * 0.045;
  const bh = h * 0.014;
  let bx = w * 0.945;
  const bars = [3, 1, 2, 1, 1, 3, 2, 2, 1, 1, 2, 3, 1, 2];
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const b of bars) {
    const ww = Math.max(1, (bw / bars.length) * (b / 2));
    ctx.fillRect(bx, y - bh / 2, ww, bh);
    bx += bw / bars.length;
  }
  ctx.restore();
}

/* ---- entry point ---- */

/** Draws the full cover for `state` onto `canvas` (sized to state.size). */
export function drawCover(canvas, state) {
  const [w, h] = SIZES[state.size] || SIZES['1920x1080'];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#14091F';
  ctx.fillRect(0, 0, w, h);
  const rects = layoutPanels(state.layout, w, h);
  rects.forEach((rect, i) => {
    const t = state.panels[i];
    if (!t) return;
    const img = state.photos[t.photo];
    if (!img) {
      ctx.fillStyle = '#2B1838';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      return;
    }
    drawPhotoInto(ctx, img, rect, t, state);
  });
  // white gutters between panels
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, w * 0.002);
  for (const r of rects) ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.restore();
  // title block over the lower panels
  const titleTop = h * 0.60;
  drawQuote(ctx, w, h, state, titleTop);
  drawTitle(ctx, w, h, state, titleTop);
  drawBadge(ctx, w, h);
  drawStrip(ctx, w, h, state);
  drawFooter(ctx, w, h, state);
  // outer frame
  ctx.save();
  ctx.strokeStyle = '#0B0614';
  ctx.lineWidth = Math.max(6, w * 0.006);
  ctx.strokeRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(2, w * 0.0015);
  ctx.strokeRect(w * 0.006, h * 0.006, w * 0.988, h * 0.988);
  ctx.restore();
  // print finish over everything
  applyGrain(ctx, w, h, state.grain);
  applyVignette(ctx, w, h, state.vignette);
  const grade = GRADES[state.grade];
  if (state.halftone || grade.halftone) applyHalftone(ctx, w, h, 0.16);
}
