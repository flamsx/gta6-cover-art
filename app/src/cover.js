// Golden Coast Cover Studio v2 — cover engine.
// Every panel photo is rendered THROUGH the selected grade (duotone gradient
// map + halftone + posterize + outline), never pasted raw. Pure canvas 2D,
// no network, no libraries. Exposes window.CoverEngine.
(function (global) {
  'use strict';

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lumOf(r, g, b) { return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }
  // Deterministic grain: a hash of the pixel index, stable across renders.
  function grainHash(i) {
    let h = (i * 2654435761) >>> 0;
    h ^= h >>> 13; h = (h * 1274126177) >>> 0; h ^= h >>> 16;
    return (h >>> 0) / 4294967295 - 0.5;
  }

  // Seven grades. Each one is a full art direction for the photos:
  // duotone shadow -> mid -> highlight, halftone strength, panel outline,
  // contrast, saturation and posterize levels.
  var GRADES = [
    { id: 'sunset', name: 'Vice Sunset', shadow: [26, 11, 46], mid: [255, 94, 58], highlight: [255, 209, 102], halftone: 0.35, outline: '#1a0b2e', outlineWidth: 6, contrast: 1.15, saturation: 1.25, posterize: 6 },
    { id: 'neon', name: 'Neon Night', shadow: [11, 11, 46], mid: [255, 46, 136], highlight: [0, 229, 255], halftone: 0.4, outline: '#0b0b2e', outlineWidth: 6, contrast: 1.2, saturation: 1.4, posterize: 6 },
    { id: 'ink', name: 'Poster Ink', shadow: [13, 13, 13], mid: [230, 57, 70], highlight: [241, 250, 238], halftone: 0.85, outline: '#0d0d0d', outlineWidth: 10, contrast: 1.3, saturation: 1.1, posterize: 4 },
    { id: 'golden', name: 'Golden Hour', shadow: [46, 26, 11], mid: [255, 140, 66], highlight: [255, 230, 109], halftone: 0.3, outline: '#2e1a0b', outlineWidth: 6, contrast: 1.1, saturation: 1.3, posterize: 6 },
    { id: 'mint', name: 'Vice Mint', shadow: [6, 40, 31], mid: [46, 196, 182], highlight: [203, 243, 240], halftone: 0.3, outline: '#06281f', outlineWidth: 6, contrast: 1.12, saturation: 1.25, posterize: 6 },
    { id: 'bubble', name: 'Bubblegum', shadow: [43, 10, 61], mid: [255, 112, 166], highlight: [255, 214, 112], halftone: 0.35, outline: '#2b0a3d', outlineWidth: 6, contrast: 1.12, saturation: 1.35, posterize: 6 },
    { id: 'noir', name: 'Noir', shadow: [0, 0, 0], mid: [108, 117, 125], highlight: [255, 255, 255], halftone: 0.5, outline: '#000000', outlineWidth: 6, contrast: 1.25, saturation: 0, posterize: 5 }
  ];

  function gradeById(id) {
    for (var i = 0; i < GRADES.length; i++) if (GRADES[i].id === id) return GRADES[i];
    return GRADES[0];
  }

  // Seven layouts. Panels are fractions of the cover: [x, y, w, h].
  var LAYOUTS = [
    { id: 'hero', name: 'Hero', panels: [[0, 0, 1, 0.6], [0, 0.62, 0.5, 0.38], [0.5, 0.62, 0.5, 0.38]] },
    { id: 'comic', name: 'Comic', panels: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]] },
    { id: 'nine', name: '9-Panel', panels: [[0, 0, 1 / 3, 1 / 3], [1 / 3, 0, 1 / 3, 1 / 3], [2 / 3, 0, 1 / 3, 1 / 3], [0, 1 / 3, 1 / 3, 1 / 3], [1 / 3, 1 / 3, 1 / 3, 1 / 3], [2 / 3, 1 / 3, 1 / 3, 1 / 3], [0, 2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 1 / 3, 1 / 3], [2 / 3, 2 / 3, 1 / 3, 1 / 3]] },
    { id: 'one', name: '1 Panel', panels: [[0, 0, 1, 1]] },
    { id: 'two', name: '2 Panels', panels: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]] },
    { id: 'three', name: '3 Panels', panels: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]] },
    { id: 'four', name: '4 Panels', panels: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]] }
  ];

  function layoutById(id) {
    for (var i = 0; i < LAYOUTS.length; i++) if (LAYOUTS[i].id === id) return LAYOUTS[i];
    return LAYOUTS[0];
  }

  var SIZES = [
    { id: '1080x1080', w: 1080, h: 1080 },
    { id: '1080x1350', w: 1080, h: 1350 },
    { id: '1920x1080', w: 1920, h: 1080 }
  ];

  // Map one pixel through the grade's duotone gradient, mixed with the
  // original by strength (1 = fully graded, 0 = original photo).
  function duotonePixel(r, g, b, grade, strength) {
    var lum = lumOf(r, g, b);
    var cr, cg, cb;
    if (lum < 0.5) {
      var t = lum / 0.5;
      cr = lerp(grade.shadow[0], grade.mid[0], t);
      cg = lerp(grade.shadow[1], grade.mid[1], t);
      cb = lerp(grade.shadow[2], grade.mid[2], t);
    } else {
      var u = (lum - 0.5) / 0.5;
      cr = lerp(grade.mid[0], grade.highlight[0], u);
      cg = lerp(grade.mid[1], grade.highlight[1], u);
      cb = lerp(grade.mid[2], grade.highlight[2], u);
    }
    return [r + (cr - r) * strength, g + (cg - g) * strength, b + (cb - b) * strength];
  }

  function posterizeValue(v, levels) {
    if (!levels || levels < 2) return v;
    return Math.round((v / 255) * (levels - 1)) / (levels - 1) * 255;
  }

  // The uniform grade pipeline: every panel photo passes through it.
  // image: an <img>/canvas; pw, ph: panel pixels; t: {zoom, ox, oy};
  // grade: a GRADES entry; strength: 0..1; opts: {contrast, saturation,
  // halftone, grain}. Returns a canvas of pw x ph.
  function gradePhoto(image, pw, ph, t, grade, strength, opts) {
    var c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(pw));
    c.height = Math.max(2, Math.round(ph));
    var x = c.getContext('2d', { willReadFrequently: true });
    // 1. Cover-fit draw with the panel's crop / zoom / pan.
    var iw = image.naturalWidth || image.width;
    var ih = image.naturalHeight || image.height;
    var zoom = (t && t.zoom) || 1;
    var scale = Math.max(pw / iw, ph / ih) * zoom;
    var dw = iw * scale, dh = ih * scale;
    var dx = (pw - dw) / 2 + ((t && t.ox) || 0) * pw;
    var dy = (ph - dh) / 2 + ((t && t.oy) || 0) * ph;
    x.drawImage(image, dx, dy, dw, dh);
    // 2. Contrast + saturation (GPU filter), onto a second canvas.
    var c2 = document.createElement('canvas');
    c2.width = c.width; c2.height = c.height;
    var x2 = c2.getContext('2d', { willReadFrequently: true });
    var contrast = (opts && opts.contrast) || grade.contrast;
    var saturation = (opts && opts.saturation) || grade.saturation;
    x2.filter = 'contrast(' + contrast + ') saturate(' + saturation + ')';
    x2.drawImage(c, 0, 0);
    x2.filter = 'none';
    // 3. Duotone gradient map + posterize + deterministic grain.
    var img = x2.getImageData(0, 0, c2.width, c2.height);
    var d = img.data;
    var grain = (opts && opts.grain) || 0;
    var levels = grade.posterize;
    for (var i = 0; i < d.length; i += 4) {
      var px = duotonePixel(d[i], d[i + 1], d[i + 2], grade, strength);
      var r = posterizeValue(px[0], levels);
      var g = posterizeValue(px[1], levels);
      var b = posterizeValue(px[2], levels);
      if (grain > 0) {
        var n = grainHash(i >> 2) * grain * 255;
        r += n; g += n; b += n;
      }
      d[i] = clamp(r, 0, 255); d[i + 1] = clamp(g, 0, 255); d[i + 2] = clamp(b, 0, 255);
    }
    x2.putImageData(img, 0, 0);
    // 4. Halftone dots: dot size follows darkness, so shadows print as dots.
    var halftone = (opts && opts.halftone !== undefined ? opts.halftone : grade.halftone);
    if (halftone > 0.02) {
      var cell = Math.max(6, Math.round(c2.width / 150));
      var data = x2.getImageData(0, 0, c2.width, c2.height).data;
      x2.fillStyle = 'rgb(' + grade.shadow[0] + ',' + grade.shadow[1] + ',' + grade.shadow[2] + ')';
      for (var gy = 0; gy < c2.height; gy += cell) {
        for (var gx = 0; gx < c2.width; gx += cell) {
          var cx = Math.min(c2.width - 1, gx + (cell >> 1));
          var cy = Math.min(c2.height - 1, gy + (cell >> 1));
          var k = (cy * c2.width + cx) * 4;
          var l = lumOf(data[k], data[k + 1], data[k + 2]);
          var radius = (cell * 0.5) * (1 - l) * halftone;
          if (radius < 0.4) continue;
          x2.globalAlpha = 0.55 * halftone + 0.15;
          x2.beginPath();
          x2.arc(gx + cell / 2, gy + cell / 2, radius, 0, Math.PI * 2);
          x2.fill();
        }
      }
      x2.globalAlpha = 1;
    }
    return c2;
  }

  // Panel rects in pixels, with a consistent gutter between panels.
  function panelRects(layout, W, H, gutter) {
    var out = [];
    for (var i = 0; i < layout.panels.length; i++) {
      var p = layout.panels[i];
      var x = p[0] * W + (p[0] > 0 ? gutter / 2 : 0);
      var y = p[1] * H + (p[1] > 0 ? gutter / 2 : 0);
      var w = p[2] * W - (p[0] > 0 ? gutter / 2 : 0) - (p[0] + p[2] < 1 ? gutter / 2 : 0);
      var h = p[3] * H - (p[1] > 0 ? gutter / 2 : 0) - (p[1] + p[3] < 1 ? gutter / 2 : 0);
      out.push({ x: x, y: y, w: w, h: h });
    }
    return out;
  }

  function roundRectPath(x, X, Y, W, H, r) {
    x.beginPath();
    x.moveTo(X + r, Y);
    x.arcTo(X + W, Y, X + W, Y + H, r);
    x.arcTo(X + W, Y + H, X, Y + H, r);
    x.arcTo(X, Y + H, X, Y, r);
    x.arcTo(X, Y, X + W, Y, r);
    x.closePath();
  }

  function drawTitleBlock(x, state, W, H, grade) {
    var u = W / 1080; // scale unit: everything sizes off the cover width
    // Soft scrim behind the title so lettering reads over any photo.
    var scrim = x.createLinearGradient(0, 0, 0, H * 0.30);
    scrim.addColorStop(0, 'rgba(8,4,18,0.72)');
    scrim.addColorStop(1, 'rgba(8,4,18,0)');
    x.fillStyle = scrim;
    x.fillRect(0, 0, W, H * 0.30);
    // Title: gradient Anton with a dark outline. Sized to fit inside the
    // cover: its centre sits below the top edge by more than half its size.
    var title = (state.title || 'GOLDEN COAST').toUpperCase();
    var size = Math.round(W * 0.09);
    var titleY = H * 0.095;
    x.font = size + 'px Anton, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    var grad = x.createLinearGradient(0, titleY - size / 2, 0, titleY + size / 2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, 'rgb(' + grade.highlight[0] + ',' + grade.highlight[1] + ',' + grade.highlight[2] + ')');
    grad.addColorStop(1, 'rgb(' + grade.mid[0] + ',' + grade.mid[1] + ',' + grade.mid[2] + ')');
    x.lineWidth = Math.max(3, 7 * u);
    x.strokeStyle = 'rgba(10,5,20,0.9)';
    x.lineJoin = 'round';
    x.strokeText(title, W / 2, titleY);
    x.fillStyle = grad;
    x.fillText(title, W / 2, titleY);
    // Subtitle: Pacifico script in the grade's highlight colour, clear of
    // the title's descenders.
    var sub = state.subtitle || '';
    if (sub) {
      var subY = titleY + size * 0.78;
      x.font = Math.round(W * 0.045) + 'px Pacifico, cursive';
      x.fillStyle = 'rgb(' + grade.highlight[0] + ',' + grade.highlight[1] + ',' + grade.highlight[2] + ')';
      x.lineWidth = Math.max(2, 4 * u);
      x.strokeStyle = 'rgba(10,5,20,0.85)';
      x.strokeText(sub, W / 2, subY);
      x.fillText(sub, W / 2, subY);
    }
    // Badge: top-right corner, "COMING SOON".
    var badge = 'COMING SOON';
    x.font = 'bold ' + Math.round(W * 0.022) + 'px system-ui, sans-serif';
    var bw = x.measureText(badge).width + 28 * u;
    var bh = Math.round(W * 0.045);
    var bx = W - bw - 18 * u, by = 16 * u;
    x.fillStyle = 'rgb(' + grade.mid[0] + ',' + grade.mid[1] + ',' + grade.mid[2] + ')';
    roundRectPath(x, bx, by, bw, bh, bh / 2);
    x.fill();
    x.fillStyle = '#ffffff';
    x.font = 'bold ' + Math.round(W * 0.02) + 'px system-ui, sans-serif';
    x.fillText(badge, bx + bw / 2, by + bh / 2 + 1);
  }

  function drawBottomStrip(x, state, W, H, grade) {
    var u = W / 1080;
    var stripH = H * 0.085;
    var y = H - stripH;
    // Star row + quote, just above the strip.
    var quote = state.quote || '';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    if (quote) {
      x.font = Math.round(W * 0.026) + 'px system-ui, sans-serif';
      x.fillStyle = '#ffffff';
      x.lineWidth = Math.max(2, 3 * u);
      x.strokeStyle = 'rgba(10,5,20,0.85)';
      var line = '★★★★★  “' + quote + '”';
      x.strokeText(line, W / 2, y - H * 0.022);
      x.fillText(line, W / 2, y - H * 0.022);
    }
    // Tagline strip.
    x.fillStyle = 'rgba(8,4,18,0.88)';
    x.fillRect(0, y, W, stripH);
    x.fillStyle = 'rgb(' + grade.highlight[0] + ',' + grade.highlight[1] + ',' + grade.highlight[2] + ')';
    x.fillRect(0, y, W, Math.max(3, 5 * u));
    var tag = (state.tagline || '').toUpperCase();
    x.font = Math.round(W * 0.032) + 'px Anton, sans-serif';
    x.fillStyle = '#ffffff';
    x.fillText(tag, W / 2, y + stripH / 2 + 1);
  }

  // Render the whole cover into ctx at W x H.
  // state: {layout, grade, gradeStrength, contrast, saturation, halftone,
  // grain, vignette, title, subtitle, tagline, quote, panels:[{photo}],
  // photos: Map id -> image}. images: a Map from photo id to <img>/canvas.
  function renderCover(canvas, state, images) {
    var W = canvas.width, H = canvas.height;
    var x = canvas.getContext('2d');
    var grade = gradeById(state.grade);
    var layout = layoutById(state.layout);
    var strength = (state.gradeStrength === undefined ? 1 : state.gradeStrength);
    var gutter = Math.max(4, Math.round(W * 0.009));
    // Backdrop: the grade's shadow colour.
    x.fillStyle = 'rgb(' + grade.shadow[0] + ',' + grade.shadow[1] + ',' + grade.shadow[2] + ')';
    x.fillRect(0, 0, W, H);
    var rects = panelRects(layout, W, H, gutter);
    var outlineW = Math.max(3, Math.round(grade.outlineWidth * (W / 1080)));
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      var panel = (state.panels && state.panels[i]) || {};
      var img = panel.photoId ? images.get(panel.photoId) : null;
      if (img) {
        var graded = gradePhoto(img, r.w, r.h, panel, grade, strength, {
          contrast: state.contrast, saturation: state.saturation,
          halftone: state.halftone, grain: state.grain
        });
        x.drawImage(graded, r.x, r.y);
      } else {
        // Empty panel: a diagonal wash of the grade, so the cover never
        // shows a raw hole.
        var g = x.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
        g.addColorStop(0, 'rgb(' + grade.mid[0] + ',' + grade.mid[1] + ',' + grade.mid[2] + ')');
        g.addColorStop(1, 'rgb(' + grade.shadow[0] + ',' + grade.shadow[1] + ',' + grade.shadow[2] + ')');
        x.fillStyle = g;
        x.fillRect(r.x, r.y, r.w, r.h);
      }
      // One consistent outline + gutter on every panel.
      x.lineWidth = outlineW;
      x.strokeStyle = grade.outline;
      x.strokeRect(r.x + outlineW / 2, r.y + outlineW / 2, r.w - outlineW, r.h - outlineW);
    }
    // Vignette over the panels, under the lettering.
    var vig = (state.vignette === undefined ? 0.25 : state.vignette);
    if (vig > 0.01) {
      var v = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,' + clamp(vig, 0, 0.8) + ')');
      x.fillStyle = v;
      x.fillRect(0, 0, W, H);
    }
    drawTitleBlock(x, state, W, H, grade);
    drawBottomStrip(x, state, W, H, grade);
    return canvas;
  }

  // Render an export canvas at the target size, then hand back a PNG blob.
  function exportCover(state, images, w, h) {
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    renderCover(canvas, state, images);
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) { resolve(blob); }, 'image/png');
    });
  }

  global.CoverEngine = {
    GRADES: GRADES, LAYOUTS: LAYOUTS, SIZES: SIZES,
    gradeById: gradeById, layoutById: layoutById,
    panelRects: panelRects, gradePhoto: gradePhoto,
    renderCover: renderCover, exportCover: exportCover
  };
})(window);
