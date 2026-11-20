// Golden Coast Cover Studio v2 — cover engine (canvas 2D).
// Every panel photo is rendered THROUGH the selected grade: duotone gradient-map
// + halftone + contrast/saturation + light posterize + outline. The grade is the
// art direction, not a sticker on top of raw photos.

export const GRADES = {
  sunset: { name: 'Vice Sunset', shadow: [38, 8, 74], mid: [255, 46, 136], high: [255, 179, 71], outline: '#1c0533', outlineW: 1, halftone: 0.55, ink: false, posterize: 6, title: ['#ffb347', '#ff2e88', '#b537f2'] },
  neon: { name: 'Neon Night', shadow: [5, 5, 20], mid: [0, 229, 255], high: [255, 0, 229], outline: '#02020a', outlineW: 1, halftone: 0.6, ink: false, posterize: 6, title: ['#00e5ff', '#ff00e5', '#7b2fff'] },
  ink: { name: 'Poster Ink', shadow: [12, 12, 12], mid: [70, 70, 70], high: [255, 255, 255], outline: '#000000', outlineW: 2.2, halftone: 0.95, ink: true, posterize: 4, title: ['#ffffff', '#ffd400', '#ff2e88'] },
  golden: { name: 'Golden Hour', shadow: [58, 28, 0], mid: [255, 122, 0], high: [255, 224, 138], outline: '#2a1400', outlineW: 1, halftone: 0.5, ink: false, posterize: 6, title: ['#ffe08a', '#ff7a00', '#ff2e88'] },
  mint: { name: 'Vice Mint', shadow: [2, 18, 14], mid: [0, 200, 150], high: [200, 255, 233], outline: '#01120e', outlineW: 1, halftone: 0.5, ink: false, posterize: 6, title: ['#c8ffe9', '#00c896', '#00e5ff'] },
  bubble: { name: 'Bubblegum', shadow: [43, 0, 51], mid: [255, 94, 196], high: [255, 227, 242], outline: '#1e0024', outlineW: 1, halftone: 0.55, ink: false, posterize: 6, title: ['#ffe3f2', '#ff5ec4', '#b537f2'] },
  noir: { name: 'Noir', shadow: [0, 0, 0], mid: [85, 85, 85], high: [238, 238, 238], outline: '#000000', outlineW: 1.4, halftone: 0.7, ink: true, posterize: 5, title: ['#ffffff', '#cfcfcf', '#888888'] },
};

export const GRADE_KEYS = Object.keys(GRADES);
export const LAYOUTS = ['hero', 'comic', '9-panel', '1-panel', '2-panel', '3-panel', '4-panel'];
export const SIZES = [{ name: '1080 × 1080', w: 1080, h: 1080 }, { name: '1080 × 1350', w: 1080, h: 1350 }, { name: '1920 × 1080', w: 1920, h: 1080 }];

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// Render one photo through the grade into a canvas of pw x ph.
// panel: {photo, zoom, panX, panY}; s: {strength, halftone, contrast, saturation, grain}; seed: number.
export function gradePhoto(img, pw, ph, panel, grade, s, seed) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(pw)); c.height = Math.max(2, Math.round(ph));
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const zoom = clamp(panel.zoom || 1, 1, 4);
  const base = Math.max(pw / iw, ph / ih) * zoom;
  const dw = iw * base, dh = ih * base;
  const dx = (pw - dw) / 2 + (panel.panX || 0) * pw * 0.25;
  const dy = (ph - dh) / 2 + (panel.panY || 0) * ph * 0.25;
  ctx.drawImage(img, dx, dy, dw, dh);
  const id = ctx.getImageData(0, 0, c.width, c.height);
  const d = id.data, st = clamp(s.strength, 0, 1), ct = clamp(s.contrast, -0.5, 0.5), sat = clamp(s.saturation, -0.5, 0.8);
  const lv = grade.posterize > 0 ? grade.posterize - 1 : 0;
  const sh = grade.shadow, md = grade.mid, hi = grade.high;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    let dr, dg, db;
    if (lum < 0.5) { const t = lum * 2; dr = lerp(sh[0], md[0], t); dg = lerp(sh[1], md[1], t); db = lerp(sh[2], md[2], t); }
    else { const t = (lum - 0.5) * 2; dr = lerp(md[0], hi[0], t); dg = lerp(md[1], hi[1], t); db = lerp(md[2], hi[2], t); }
    let nr = lerp(r, dr, st), ng = lerp(g, dg, st), nb = lerp(b, db, st);
    nr = (nr / 255 - 0.5) * (1 + ct) + 0.5; ng = (ng / 255 - 0.5) * (1 + ct) + 0.5; nb = (nb / 255 - 0.5) * (1 + ct) + 0.5;
    const gy = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
    nr = lerp(gy, nr, 1 + sat); ng = lerp(gy, ng, 1 + sat); nb = lerp(gy, nb, 1 + sat);
    if (lv > 0) { nr = Math.round(nr * lv) / lv; ng = Math.round(ng * lv) / lv; nb = Math.round(nb * lv) / lv; }
    d[i] = clamp(nr * 255, 0, 255); d[i + 1] = clamp(ng * 255, 0, 255); d[i + 2] = clamp(nb * 255, 0, 255);
  }
  ctx.putImageData(id, 0, 0);
  // Deterministic grain.
  const gr = clamp(s.grain, 0, 1);
  if (gr > 0.01) {
    const rnd = mulberry32(seed);
    const gd = ctx.getImageData(0, 0, c.width, c.height), g = gd.data;
    const amp = gr * 26;
    for (let i = 0; i < g.length; i += 4) { const n = (rnd() * 2 - 1) * amp; g[i] = clamp(g[i] + n, 0, 255); g[i + 1] = clamp(g[i + 1] + n, 0, 255); g[i + 2] = clamp(g[i + 2] + n, 0, 255); }
    ctx.putImageData(gd, 0, 0);
  }
  // Halftone dots: radius from luminance, grade colour.
  const ht = clamp(s.halftone, 0, 1) * grade.halftone;
  if (ht > 0.02) {
    const sp = Math.max(5, Math.round(Math.min(pw, ph) / 110));
    const dotCol = grade.ink ? `rgb(${sh[0]},${sh[1]},${sh[2]})` : `rgb(${hi[0]},${hi[1]},${hi[2]})`;
    ctx.fillStyle = dotCol; ctx.globalAlpha = ht * 0.30;
    const lum2 = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let y = sp / 2; y < ph; y += sp) {
      for (let x = sp / 2; x < pw; x += sp) {
        const px = (Math.floor(y) * c.width + Math.floor(x)) * 4;
        const l = (0.2126 * lum2[px] + 0.7152 * lum2[px + 1] + 0.0722 * lum2[px + 2]) / 255;
        const rad = grade.ink ? sp * 0.42 * (1 - l) + 0.4 : sp * 0.42 * l + 0.4;
        if (rad > 0.7) { ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    ctx.globalAlpha = 1;
  }
  // Outline.
  const ow = Math.max(2, Math.min(pw, ph) * 0.014 * grade.outlineW);
  ctx.strokeStyle = grade.outline; ctx.lineWidth = ow;
  ctx.strokeRect(ow / 2, ow / 2, pw - ow, ph - ow);
  return c;
}

// Panel rects for a layout. Returns {hero, panels, titleH, bottomH, margin, gutter}.
export function layoutRects(layout, W, H) {
  const M = W * 0.018, G = W * 0.012;
  const titleH = H * 0.16, bottomH = H * 0.10;
  const ax = M, ay = titleH + G, aw = W - 2 * M, ah = H - titleH - bottomH - 2 * G;
  function grid(cols, rows) {
    const cw = (aw - (cols - 1) * G) / cols, ch = (ah - (rows - 1) * G) / rows;
    const out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: ax + c * (cw + G), y: ay + r * (ch + G), w: cw, h: ch });
    return out;
  }
  switch (layout) {
    case 'hero': return { hero: true, panels: [{ x: 0, y: 0, w: W, h: H }], titleH, bottomH, margin: M, gutter: G };
    case 'comic': return { hero: false, panels: grid(2, 2), titleH, bottomH, margin: M, gutter: G };
    case '9-panel': return { hero: false, panels: grid(3, 3), titleH, bottomH, margin: M, gutter: G };
    case '2-panel': return { hero: false, panels: grid(2, 1), titleH, bottomH, margin: M, gutter: G };
    case '3-panel': return { hero: false, panels: grid(3, 1), titleH, bottomH, margin: M, gutter: G };
    case '4-panel': return { hero: false, panels: grid(2, 2), titleH, bottomH, margin: M, gutter: G };
    default: return { hero: false, panels: grid(1, 1), titleH, bottomH, margin: M, gutter: G };
  }
}

function fitTitleSize(ctx, text, maxW, start) {
  let s = start;
  ctx.font = `${s}px Anton, sans-serif`;
  while (s > 12 && ctx.measureText(text).width > maxW) { s -= 2; ctx.font = `${s}px Anton, sans-serif`; }
  return s;
}

function drawTitleBlock(ctx, state, grade, W, H, cy, maxW, align) {
  const g = grade.title;
  let size = fitTitleSize(ctx, state.title || 'GOLDEN COAST', maxW, Math.round(W * 0.105));
  const grad = ctx.createLinearGradient(0, cy - size * 0.5, W, cy + size * 0.5);
  grad.addColorStop(0, g[0]); grad.addColorStop(0.5, g[1]); grad.addColorStop(1, g[2]);
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, size * 0.06); ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(state.title || 'GOLDEN COAST', align === 'center' ? W / 2 : 0, cy);
  ctx.fillStyle = grad;
  ctx.fillText(state.title || 'GOLDEN COAST', align === 'center' ? W / 2 : 0, cy);
  const subSize = Math.round(size * 0.30);
  ctx.font = `${subSize}px Pacifico, cursive`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = Math.round(subSize * 0.25);
  ctx.fillText(state.subtitle || '', align === 'center' ? W / 2 : 0, cy + size * 0.62);
  ctx.shadowBlur = 0;
  return size;
}

function drawBadge(ctx, grade, W, H, x, y) {
  const txt = 'COMING SOON';
  const fs = Math.max(11, Math.round(W * 0.016));
  ctx.font = `bold ${fs}px system-ui, sans-serif`;
  const tw = ctx.measureText(txt).width;
  const pad = fs * 0.7, bw = tw + pad * 2, bh = fs * 2.1;
  ctx.fillStyle = '#ff2e88';
  ctx.beginPath(); ctx.roundRect(x - bw, y, bw, bh, bh / 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, x - bw / 2, y + bh / 2 + 1);
}

function drawBottomBand(ctx, state, W, H, y, h) {
  ctx.fillStyle = 'rgba(8,8,16,0.92)';
  ctx.fillRect(0, y, W, h);
  ctx.fillStyle = '#ffb347';
  const starSize = Math.round(h * 0.30);
  ctx.font = `${starSize}px system-ui, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const sx = W * 0.03;
  ctx.fillText('★★★★★', sx, y + h * 0.30);
  ctx.fillStyle = '#ffffff';
  const qSize = Math.round(h * 0.26);
  ctx.font = `italic ${qSize}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(state.quote || '', W / 2, y + h * 0.30);
  ctx.fillStyle = '#d8d8e2';
  const tSize = Math.round(h * 0.22);
  ctx.font = `${tSize}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText((state.tagline || '').toUpperCase(), W / 2, y + h * 0.74);
  ctx.fillStyle = '#ffb347';
  ctx.textAlign = 'right';
  ctx.fillText('GOLDEN COAST', W * 0.97, y + h * 0.30);
}

// Render the full cover into ctx at W x H. photos: Map key -> HTMLImageElement.
export function renderCover(ctx, state, photos, W, H) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const s = { strength: state.strength / 100, halftone: state.halftone / 100, contrast: state.contrast / 100, saturation: state.saturation / 100, grain: state.grain / 100 };
  const L = layoutRects(state.layout, W, H);
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);
  const seedBase = hashStr(state.grade + '|' + state.layout);
  L.panels.forEach((r, i) => {
    const p = state.panels[i] || { photo: 'coast.jpg', zoom: 1, panX: 0, panY: 0 };
    const img = photos.get(p.photo);
    if (!img) { ctx.fillStyle = '#22222e'; ctx.fillRect(r.x, r.y, r.w, r.h); return; }
    const graded = gradePhoto(img, r.w, r.h, p, grade, s, seedBase + i * 7919);
    ctx.drawImage(graded, r.x, r.y, r.w, r.h);
  });
  if (L.hero) {
    const scrim = ctx.createLinearGradient(0, 0, 0, H * 0.42);
    scrim.addColorStop(0, 'rgba(0,0,0,0.72)'); scrim.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = scrim; ctx.fillRect(0, 0, W, H * 0.42);
    const bscrim = ctx.createLinearGradient(0, H * 0.62, 0, H);
    bscrim.addColorStop(0, 'rgba(0,0,0,0)'); bscrim.addColorStop(1, 'rgba(0,0,0,0.78)');
    ctx.fillStyle = bscrim; ctx.fillRect(0, H * 0.62, W, H * 0.38);
    drawTitleBlock(ctx, state, grade, W, H, H * 0.13, W * 0.94, 'center');
    drawBadge(ctx, grade, W, H, W * 0.97, H * 0.03);
    ctx.fillStyle = '#ffb347';
    const starSize = Math.round(H * 0.032);
    ctx.font = `${starSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('★★★★★', W / 2, H * 0.86);
    ctx.fillStyle = '#ffffff';
    ctx.font = `italic ${Math.round(H * 0.026)}px Georgia, serif`;
    ctx.fillText(state.quote || '', W / 2, H * 0.90);
    ctx.fillStyle = '#d8d8e2';
    ctx.font = `${Math.round(H * 0.021)}px system-ui, sans-serif`;
    ctx.fillText((state.tagline || '').toUpperCase(), W / 2, H * 0.955);
  } else {
    drawTitleBlock(ctx, state, grade, W, H, L.titleH * 0.42, W * 0.88, 'center');
    drawBadge(ctx, grade, W, H, W * 0.985, L.titleH * 0.10);
    drawBottomBand(ctx, state, W, H, H - L.bottomH, L.bottomH);
  }
  // Vignette.
  const vg = clamp(state.vignette / 100, 0, 1);
  if (vg > 0.01) {
    const rg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, `rgba(0,0,0,${vg * 0.5})`);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
}

// Render at full size and return the canvas.
export function exportCover(state, photos, W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  renderCover(c.getContext('2d'), state, photos, W, H);
  return c;
}
