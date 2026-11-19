// Golden Coast Cover Studio v2 — cover engine (canvas 2D, offline, no network).
// P0: every panel photo is rendered THROUGH the selected grade — duotone
// gradient map + contrast/saturation + posterize + grain + halftone dots.
// The grade is the art direction, never a title-only overlay.

export const GRADES = [
  { id: 'sunset', name: 'Vice Sunset', shadow: [26, 8, 54], mid: [214, 48, 110], high: [255, 214, 90], ink: [18, 6, 38], halftone: 0.55, outline: '#ffd319', posterize: 6 },
  { id: 'neon', name: 'Neon Night', shadow: [8, 8, 42], mid: [118, 40, 200], high: [64, 240, 255], ink: [6, 6, 28], halftone: 0.6, outline: '#00f0ff', posterize: 6 },
  { id: 'ink', name: 'Poster Ink', shadow: [12, 10, 14], mid: [96, 32, 62], high: [255, 240, 200], ink: [10, 8, 12], halftone: 1.0, outline: '#f5efe0', posterize: 4 },
  { id: 'gold', name: 'Golden Hour', shadow: [42, 16, 8], mid: [222, 122, 42], high: [255, 230, 140], ink: [32, 12, 6], halftone: 0.5, outline: '#ffb347', posterize: 6 },
  { id: 'mint', name: 'Vice Mint', shadow: [6, 32, 28], mid: [42, 192, 150], high: [220, 255, 200], ink: [4, 26, 22], halftone: 0.5, outline: '#3dffb0', posterize: 6 },
  { id: 'bubble', name: 'Bubblegum', shadow: [42, 8, 52], mid: [232, 62, 162], high: [255, 200, 230], ink: [32, 6, 42], halftone: 0.55, outline: '#ff7ad9', posterize: 6 },
  { id: 'noir', name: 'Noir', shadow: [8, 8, 10], mid: [112, 112, 122], high: [246, 246, 250], ink: [5, 5, 8], halftone: 0.7, outline: '#e8e8e8', posterize: 5 },
];

export const LAYOUTS = [
  { id: 'hero', name: 'Hero' },
  { id: 'comic', name: 'Comic' },
  { id: 'nine', name: '9-Panel' },
  { id: 'one', name: '1 Panel' },
  { id: 'two', name: '2 Panels' },
  { id: 'three', name: '3 Panels' },
  { id: 'four', name: '4 Panels' },
];

export const SIZES = [
  { id: 'square', name: '1080 x 1080', w: 1080, h: 1080 },
  { id: 'portrait', name: '1080 x 1350', w: 1080, h: 1350 },
  { id: 'wide', name: '1920 x 1080', w: 1920, h: 1080 },
];

export function gradeById(id) { return GRADES.find(g => g.id === id) || GRADES[0]; }
export function sizeById(id) { return SIZES.find(s => s.id === id) || SIZES[2]; }
export function layoutPanelCount(id) {
  return { hero: 1, comic: 3, nine: 9, one: 1, two: 2, three: 3, four: 4 }[id] || 1;
}

const clamp255 = v => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const rgb = a => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function grid(x, y, w, h, cols, rows, g) {
  const out = [];
  const cw = (w - g * (cols - 1)) / cols;
  const ch = (h - g * (rows - 1)) / rows;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push({ x: x + c * (cw + g), y: y + r * (ch + g), w: cw, h: ch });
  return out;
}

// Panel geometry for a layout. Hero is one full-bleed photo; every other
// layout gets a title band on top, a panel area and a footer strip.
export function panelRects(layout, W, H) {
  const g = Math.max(4, Math.round(Math.min(W, H) * 0.012));
  const titleH = Math.round(H * 0.17);
  const footH = Math.round(H * 0.095);
  const midH = Math.round(H * 0.08);
  if (layout === 'hero')
    return { hero: true, g, titleH, footH, midH: 0, panels: [{ x: 0, y: 0, w: W, h: H }] };
  const ax = g, ay = titleH + g, aw = W - 2 * g, ah = H - titleH - footH - midH - 2 * g;
  let panels;
  if (layout === 'comic') {
    const topH = ah * 0.58 - g / 2, botH = ah * 0.42 - g / 2;
    panels = [{ x: ax, y: ay, w: aw, h: topH }, ...grid(ax, ay + topH + g, aw, botH, 2, 1, g)];
  } else if (layout === 'nine') panels = grid(ax, ay, aw, ah, 3, 3, g);
  else if (layout === 'one') panels = [{ x: ax, y: ay, w: aw, h: ah }];
  else if (layout === 'two') panels = grid(ax, ay, aw, ah, 2, 1, g);
  else if (layout === 'three') panels = grid(ax, ay, aw, ah, 3, 1, g);
  else panels = grid(ax, ay, aw, ah, 2, 2, g);
  return { hero: false, g, titleH, footH, midH, panels };
}

// The grade pipeline. Draws the photo cover-fit with the panel's crop/zoom/
// pan transform, then pushes every pixel through the grade: contrast,
// saturation, a duotone gradient map (shadow -> mid -> highlight), a light
// posterize, deterministic grain and halftone dots in the grade's ink.
// `o` holds the editor sliders: strength/halftone/grain 0..1, contrast and
// saturation 0..100. Returns an offscreen canvas at the panel's size.
export function gradePhoto(img, w, h, t, grade, o) {
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(w));
  off.height = Math.max(2, Math.round(h));
  const c = off.getContext('2d', { willReadFrequently: true });
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const s = Math.max(off.width / iw, off.height / ih) * (t.zoom || 1);
  const dw = iw * s, dh = ih * s;
  const dx = (off.width - dw) / 2 + (t.panX || 0) * off.width * 0.25;
  const dy = (off.height - dh) / 2 + (t.panY || 0) * off.height * 0.25;
  c.drawImage(img, dx, dy, dw, dh);
  const id = c.getImageData(0, 0, off.width, off.height);
  const d = id.data;
  const str = o.strength, htAmt = o.halftone * grade.halftone, grAmt = o.grain;
  const cf = 0.5 + (o.contrast / 100) * 1.1;
  const sf = o.saturation / 50;
  const cell = Math.max(5, Math.round(Math.min(off.width, off.height) / 140));
  const q = 255 / grade.posterize;
  const [sr, sg, sb] = grade.shadow, [mr, mg, mb] = grade.mid, [hr, hg, hb] = grade.high;
  const [ir, ig, ib] = grade.ink;
  for (let y = 0; y < off.height; y++) {
    for (let x = 0; x < off.width; x++) {
      const i = (y * off.width + x) * 4;
      let r = d[i], g = d[i + 1], b = d[i + 2];
      r = (r - 128) * cf + 128; g = (g - 128) * cf + 128; b = (b - 128) * cf + 128;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum + (r - lum) * sf; g = lum + (g - lum) * sf; b = lum + (b - lum) * sf;
      const L = Math.max(0, Math.min(1, lum / 255));
      let dr, dg, db;
      if (L < 0.5) { const k = L * 2; dr = sr + (mr - sr) * k; dg = sg + (mg - sg) * k; db = sb + (mb - sb) * k; }
      else { const k = (L - 0.5) * 2; dr = mr + (hr - mr) * k; dg = mg + (hg - mg) * k; db = mb + (hb - mb) * k; }
      r += (dr - r) * str; g += (dg - g) * str; b += (db - b) * str;
      const pr = Math.round(r / q) * q, pg = Math.round(g / q) * q, pb = Math.round(b / q) * q;
      r += (pr - r) * str * 0.7; g += (pg - g) * str * 0.7; b += (pb - b) * str * 0.7;
      if (grAmt > 0) { const n = (hash2(x, y) * 2 - 1) * grAmt * 18; r += n; g += n; b += n; }
      if (htAmt > 0) {
        const cx = Math.floor(x / cell) * cell + cell / 2, cy = Math.floor(y / cell) * cell + cell / 2;
        const ddx = x - cx, ddy = y - cy, rad = (1 - L) * cell * 0.62 * htAmt;
        if (ddx * ddx + ddy * ddy < rad * rad) {
          r += (ir - r) * 0.55 * htAmt; g += (ig - g) * 0.55 * htAmt; b += (ib - b) * 0.55 * htAmt;
        }
      }
      d[i] = clamp255(r); d[i + 1] = clamp255(g); d[i + 2] = clamp255(b);
    }
  }
  c.putImageData(id, 0, 0);
  return off;
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Renders the whole cover onto `canvas` at the chosen export size, or at a
// smaller preview size when maxLong is set. Everything scales from W/H, so
// the preview and the export are the same composition.
export function renderCover(canvas, state, photos, maxLong, forceSize) {
  const size = forceSize || sizeById(state.size);
  let W = size.w, H = size.h;
  if (maxLong && Math.max(W, H) > maxLong) {
    const k = maxLong / Math.max(W, H);
    W = Math.round(W * k); H = Math.round(H * k);
  }
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grade = gradeById(state.grade);
  const geo = panelRects(state.layout, W, H);
  ctx.fillStyle = rgb(grade.shadow);
  ctx.fillRect(0, 0, W, H);
  const opts = {
    strength: state.strength / 100, halftone: state.halftone / 100,
    contrast: state.contrast, saturation: state.saturation, grain: state.grain / 100,
  };
  geo.panels.forEach((r, i) => {
    const p = state.panels[i] || { photo: 0, zoom: 1, panX: 0, panY: 0 };
    const img = photos[p.photo];
    if (img && img.complete && img.naturalWidth)
      ctx.drawImage(gradePhoto(img, r.w, r.h, p, grade, opts), r.x, r.y);
    ctx.lineWidth = Math.max(2, Math.round(W * 0.004));
    ctx.strokeStyle = grade.outline;
    ctx.strokeRect(r.x + ctx.lineWidth / 2, r.y + ctx.lineWidth / 2, r.w - ctx.lineWidth, r.h - ctx.lineWidth);
  });
  if (geo.hero) {
    const sc = ctx.createLinearGradient(0, 0, 0, H * 0.3);
    sc.addColorStop(0, 'rgba(8,4,20,0.72)'); sc.addColorStop(1, 'rgba(8,4,20,0)');
    ctx.fillStyle = sc; ctx.fillRect(0, 0, W, H * 0.3);
    const sb = ctx.createLinearGradient(0, H * 0.78, 0, H);
    sb.addColorStop(0, 'rgba(8,4,20,0)'); sb.addColorStop(1, 'rgba(8,4,20,0.78)');
    ctx.fillStyle = sb; ctx.fillRect(0, H * 0.78, W, H * 0.22);
  }
  drawTitleBlock(ctx, W, H, geo, grade, state);
  drawBottom(ctx, W, H, geo, grade, state);
  if (state.vignette > 0) {
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(5,2,14,0)');
    v.addColorStop(1, `rgba(5,2,14,${(state.vignette / 100) * 0.55})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
}

function drawTitleBlock(ctx, W, H, geo, grade, state) {
  const g = geo.g;
  let titlePx = Math.round(W * 0.095);
  const title = (state.title || 'GOLDEN COAST').toUpperCase();
  const fit = px => { ctx.font = `${px}px Anton, sans-serif`; return ctx.measureText(title).width; };
  while (titlePx > 24 && fit(titlePx) > W * (geo.hero ? 0.8 : 0.72)) titlePx = Math.round(titlePx * 0.92);
  let cy = geo.hero ? Math.round(H * 0.12) : Math.round(geo.titleH * 0.44);
  cy = Math.max(cy, Math.round(titlePx * 0.62));
  const grad = ctx.createLinearGradient(0, cy - titlePx * 0.6, 0, cy + titlePx * 0.5);
  grad.addColorStop(0, rgb(grade.high));
  grad.addColorStop(0.55, rgb(grade.mid));
  grad.addColorStop(1, '#ffffff');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, titlePx * 0.055);
  ctx.strokeStyle = rgb(grade.ink);
  ctx.strokeText(title, W / 2, cy);
  ctx.fillStyle = grad;
  ctx.fillText(title, W / 2, cy);
  const subPx = Math.round(titlePx * 0.34);
  ctx.font = `${subPx}px Pacifico, cursive`;
  ctx.lineWidth = Math.max(2, subPx * 0.12);
  ctx.strokeStyle = 'rgba(8,4,20,0.85)';
  const sub = state.subtitle || '';
  ctx.strokeText(sub, W / 2, cy + titlePx * 0.62);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(sub, W / 2, cy + titlePx * 0.62);
  const bPx = Math.max(12, Math.round(W * 0.016));
  ctx.font = `${bPx}px Anton, sans-serif`;
  const label = 'COMING SOON';
  const bw = ctx.measureText(label).width + bPx * 1.6, bh = bPx * 2.1;
  const bx = W - g - bw, by = geo.hero ? Math.round(H * 0.028) : Math.round(geo.titleH * 0.16);
  ctx.fillStyle = grade.outline;
  rr(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
  ctx.fillStyle = rgb(grade.ink);
  ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1);
}

function drawBottom(ctx, W, H, geo, grade, state) {
  const footH = geo.footH;
  ctx.fillStyle = 'rgba(8,4,20,0.88)';
  ctx.fillRect(0, H - footH, W, footH);
  ctx.fillStyle = grade.outline;
  ctx.fillRect(0, H - footH, W, Math.max(2, Math.round(W * 0.003)));
  const tagPx = Math.max(12, Math.round(footH * 0.4));
  ctx.font = `${tagPx}px Pacifico, cursive`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgb(grade.high);
  ctx.fillText(state.tagline || '', W / 2, H - footH / 2 + 1);
  const qPx = Math.max(11, Math.round(H * 0.02));
  const starR = Math.max(6, Math.round(H * 0.012));
  let starY, quoteY;
  if (geo.hero) {
    starY = H - footH - qPx * 1.9;
    quoteY = H - footH - qPx * 0.55;
  } else {
    const bandTop = H - footH - geo.midH;
    starY = bandTop + geo.midH * 0.3;
    quoteY = bandTop + geo.midH * 0.72;
  }
  const gap = starR * 2.6;
  for (let i = -2; i <= 2; i++) {
    starPath(ctx, W / 2 + i * gap, starY, starR);
    ctx.fillStyle = '#ffd319';
    ctx.fill();
  }
  ctx.font = `italic 600 ${qPx}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(244,241,255,0.92)';
  ctx.fillText(`\u201C${state.quote || ''}\u201D`, W / 2, quoteY);
}
