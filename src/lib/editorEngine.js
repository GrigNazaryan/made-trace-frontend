// Framework-free interactive layer editor. Draws straight onto a <canvas> with pointer
// events for move/resize/rotate — ported from the original prototype's editor.js almost
// unchanged (it never touched the DOM beyond its own canvas, so there was nothing React-
// specific to rewrite). The one real change: addImageFile() used to embed the picture as a
// data: URL for the in-memory demo; here it uploads to real storage and uses that public
// URL instead, because the backend only accepts artwork hosted on our Supabase bucket
// (see domain/validation.py storage_url()).
import { tintedMockup, garmentType } from "./mockups.js";
import { printSurface } from "./printAreas.js";
import { fontStack } from "./fonts.js";

const W = 600;
const H = 650;
const clone = (x) => structuredClone(x);
const uid = (prefix = "id") => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));

const imgCache = new Map();
function imageFor(src, onload) {
  if (!src) return null;
  if (!imgCache.has(src)) {
    const img = new Image();
    img.onload = onload;
    img.onerror = onload;
    img.src = src;
    imgCache.set(src, img);
  }
  return imgCache.get(src);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts
 * @param {(state:object)=>void} [opts.onChange]
 * @param {(layer:object|null)=>void} [opts.onSelection]
 * @param {object} [opts.initial] - {front:[], back:[]}
 * @param {string} [opts.color]
 * @param {object} [opts.product] - {mockupType, printAreas, name, productId}
 * @param {boolean} [opts.readOnly]
 * @param {(file:File)=>Promise<{url:string,width:number,height:number}>} [opts.uploadImage] - required to add image layers
 */
export function createEditor(
  canvas,
  { onChange = () => {}, onSelection = () => {}, initial = null, color = "#fdfcf9", product = {}, readOnly = false, uploadImage = null } = {}
) {
  const ctx = canvas.getContext("2d");
  canvas.width = W;
  canvas.height = H;
  let state = clone(initial || { front: [], back: [] });
  let side = "front";
  let selected = null;
  let zoom = 1;
  let drag = null;
  let garmentImage = null;
  let destroyed = false;
  let guides = true;
  const type = garmentType(product);
  const background = "#e8ecf0";
  canvas.dataset.garmentType = type;

  const zone = () => printSurface(type, side, product.printAreas);
  const cm = () => zone().pxPerCm;
  function surface() {
    return { ...zone(), side };
  }
  function refreshGarment() {
    const requestedSide = side;
    const requestedColor = color;
    canvas.dataset.mockupReady = "false";
    tintedMockup(type, side, color)
      .then((image) => {
        if (destroyed || side !== requestedSide || color !== requestedColor) return;
        garmentImage = image;
        canvas.dataset.mockupReady = "true";
        draw();
      })
      .catch(() => {
        canvas.dataset.mockupReady = "error";
      });
  }
  function setColor(next) {
    color = next;
    refreshGarment();
  }
  function setGuides(visible) {
    guides = Boolean(visible);
    draw();
  }
  const history = [clone(state)];
  let historyIdx = 0;
  const layers = () => state[side] || (state[side] = []);
  function notify() {
    onChange(getState());
    onSelection(getSelected());
  }
  function snapshot() {
    history.splice(historyIdx + 1);
    history.push(clone(state));
    if (history.length > 60) history.shift();
    historyIdx = history.length - 1;
    notify();
  }
  function getState() {
    return clone(state);
  }
  function getSelected() {
    return clone(layers().find((l) => l.id === selected) || null);
  }
  function size(l) {
    return { w: Math.max(18, Number(l.width) || 80), h: Math.max(12, Number(l.height) || 30) };
  }
  function clampLayer(l) {
    const z = zone();
    const sz = size(l);
    const r = ((l.rotation || 0) * Math.PI) / 180;
    const c = Math.abs(Math.cos(r));
    const s = Math.abs(Math.sin(r));
    let w = sz.w * c + sz.h * s;
    let h = sz.w * s + sz.h * c;
    const scale = Math.min(1, z.w / w, z.h / h);
    if (scale < 1) {
      l.width = sz.w * scale;
      l.height = sz.h * scale;
      w *= scale;
      h *= scale;
    }
    l.x = clamp(l.x, z.x + w / 2, z.x + z.w - w / 2);
    l.y = clamp(l.y, z.y + h / 2, z.y + z.h - h / 2);
  }
  function ellipse(x, y, rx, ry, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function tee() {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, W, H);
    if (garmentImage) {
      ctx.save();
      ctx.shadowColor = "rgba(25,38,56,.17)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
      ctx.filter = "contrast(1.12) brightness(1.06)";
      ctx.drawImage(garmentImage, 0, 0);
      ctx.restore();
    }
    if (!readOnly && guides) {
      const x = zone().x,
        y = zone().y,
        w = zone().w,
        h = zone().h,
        len = 12;
      ctx.save();
      ctx.strokeStyle = "rgba(81,98,119,.32)";
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (const [cx, cy, dx, dy] of [
        [x, y, 1, 1],
        [x + w, y, -1, 1],
        [x, y + h, 1, -1],
        [x + w, y + h, -1, -1],
      ]) {
        ctx.moveTo(cx + dx * len, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + dy * len);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
  function renderLayer(l) {
    if (l.visible === false) return;
    const { w, h } = size(l);
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(((l.rotation || 0) * Math.PI) / 180);
    ctx.globalAlpha = typeof l.opacity === "number" ? l.opacity : 1;
    if (l.type === "text") {
      ctx.font = `${Math.max(12, l.fontSize || 30)}px ${fontStack(l.font)}`;
      ctx.fillStyle = l.color || "#234d78";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const words = String(l.text || "TEXT").split("\n");
      words.forEach((line, i) => {
        const y = (i - (words.length - 1) / 2) * (l.fontSize || 30) * 1.18;
        ctx.fillText(line, 0, y, w);
      });
    } else if (l.type === "image") {
      const img = imageFor(l.src, draw);
      if (img?.complete && img.naturalWidth) ctx.drawImage(img, -w / 2, -h / 2, w, h);
      else {
        ctx.fillStyle = "#c8d9f2";
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }
    }
    if (l.id === selected) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#2369eb";
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#2369eb";
      for (const [x, y] of [
        [-w / 2, -h / 2],
        [w / 2, -h / 2],
        [-w / 2, h / 2],
        [w / 2, h / 2],
      ]) {
        ctx.beginPath();
        ctx.roundRect(x - 5, y - 5, 10, 10, 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(0, -h / 2 - 25);
      ctx.stroke();
      ellipse(0, -h / 2 - 27, 6, 6, "#2369eb");
    }
    ctx.restore();
  }
  function draw() {
    canvas.dataset.printSurface = JSON.stringify(surface());
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.translate(300, 320);
    ctx.scale(zoom, zoom);
    ctx.translate(-300, -320);
    tee();
    layers().forEach(renderLayer);
    ctx.restore();
  }
  function select(id) {
    selected = id;
    draw();
    onSelection(getSelected());
  }
  function addText(text = "YOUR TEXT", textColor = "#295886") {
    const fontSize = 30;
    const layer = {
      id: uid("layer"),
      type: "text",
      text,
      x: zone().x + zone().w / 2,
      y: zone().y + zone().h * 0.38,
      width: Math.min(180, zone().w * 0.85),
      height: 42,
      rotation: 0,
      font: "Arial",
      fontSize,
      color: textColor,
      visible: true,
    };
    layers().push(layer);
    select(layer.id);
    snapshot();
    return layer;
  }
  function addImage(src, naturalW = 400, naturalH = 400) {
    const aspect = naturalW / Math.max(1, naturalH);
    let w = Math.min(185, zone().w * 0.78);
    let h = w / Math.max(0.01, aspect);
    if (h > zone().h * 0.8) {
      h = zone().h * 0.8;
      w = h * aspect;
    }
    const layer = {
      id: uid("img"),
      type: "image",
      src,
      x: zone().x + zone().w / 2,
      y: zone().y + zone().h / 2,
      width: w,
      height: h,
      rotation: 0,
      visible: true,
      originalWidth: naturalW,
      originalHeight: naturalH,
    };
    layers().push(layer);
    select(layer.id);
    snapshot();
    return layer;
  }
  async function addImageFile(file, { replace = false } = {}) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file?.type)) {
      throw new Error("Choose an image file (PNG, JPG, or WebP).");
    }
    if (file.size > 8 * 1024 * 1024) throw new Error("Image limit: 8 MB. Try a smaller file.");
    if (!uploadImage) throw new Error("Image upload isn't configured.");
    const { url, width, height } = await uploadImage(file);
    if (replace && getSelected()?.type === "image") patch({ src: url, originalWidth: width, originalHeight: height });
    else addImage(url, width, height);
  }
  function patch(props) {
    const l = layers().find((v) => v.id === selected);
    if (!l) return;
    Object.assign(l, props);
    if ("width" in props || "height" in props || "x" in props || "y" in props || "rotation" in props) clampLayer(l);
    draw();
    snapshot();
  }
  function remove() {
    const arr = layers();
    const index = arr.findIndex((v) => v.id === selected);
    if (index < 0) return;
    arr.splice(index, 1);
    selected = null;
    draw();
    snapshot();
  }
  function duplicate() {
    const l = getSelected();
    if (!l) return;
    const copy = { ...clone(l), id: uid("layer"), x: l.x + 13, y: l.y + 13 };
    clampLayer(copy);
    layers().push(copy);
    select(copy.id);
    snapshot();
  }
  function move(delta) {
    const arr = layers();
    const i = arr.findIndex((x) => x.id === selected);
    if (i < 0) return;
    const next = clamp(i + delta, 0, arr.length - 1);
    if (next === i) return;
    const item = arr.splice(i, 1)[0];
    arr.splice(next, 0, item);
    draw();
    snapshot();
  }
  function undo() {
    if (historyIdx > 0) {
      historyIdx--;
      state = clone(history[historyIdx]);
      if (!layers().some((l) => l.id === selected)) selected = null;
      draw();
      notify();
    }
  }
  function redo() {
    if (historyIdx < history.length - 1) {
      historyIdx++;
      state = clone(history[historyIdx]);
      if (!layers().some((l) => l.id === selected)) selected = null;
      draw();
      notify();
    }
  }
  function changeSide(next) {
    if (next !== "front" && next !== "back") return;
    side = next;
    selected = null;
    refreshGarment();
    draw();
    notify();
  }
  function setZoom(n) {
    zoom = clamp(n, 0.65, 1.5);
    draw();
  }
  function load(s) {
    state = clone(s || { front: [], back: [] });
    selected = null;
    history.length = 0;
    history.push(clone(state));
    historyIdx = 0;
    draw();
    notify();
  }
  function allLayers() {
    return clone(layers());
  }
  function coords(e) {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    return { x: (x - 300) / zoom + 300, y: (y - 320) / zoom + 320 };
  }
  function local(l, p) {
    const rad = (-(l.rotation || 0) * Math.PI) / 180;
    const dx = p.x - l.x;
    const dy = p.y - l.y;
    return { x: dx * Math.cos(rad) - dy * Math.sin(rad), y: dx * Math.sin(rad) + dy * Math.cos(rad) };
  }
  function hit(p) {
    for (let i = layers().length - 1; i >= 0; i--) {
      const l = layers()[i];
      if (l.visible === false) continue;
      const d = local(l, p);
      const { w, h } = size(l);
      const hand = Math.hypot(d.x - w / 2, d.y - h / 2);
      const rot = Math.hypot(d.x, d.y + h / 2 + 27);
      if (l.id === selected && rot < 15) return { id: l.id, mode: "rotate" };
      if (l.id === selected && hand < 18) return { id: l.id, mode: "resize" };
      if (Math.abs(d.x) <= w / 2 + 5 && Math.abs(d.y) <= h / 2 + 5) return { id: l.id, mode: "move" };
    }
    return null;
  }
  function down(e) {
    if (e.button !== 0) return;
    const p = coords(e);
    const found = hit(p);
    select(found?.id || null);
    if (!found) return;
    drag = { id: found.id, mode: found.mode, start: p, original: clone(layers().find((l) => l.id === found.id)), moved: false };
    canvas.setPointerCapture?.(e.pointerId);
  }
  function pointerMove(e) {
    if (!drag) return;
    const p = coords(e);
    const l = layers().find((l) => l.id === drag.id);
    if (!l) return;
    const dx = p.x - drag.start.x;
    const dy = p.y - drag.start.y;
    if (Math.hypot(dx, dy) > 1) drag.moved = true;
    if (drag.mode === "move") {
      l.x = drag.original.x + dx;
      l.y = drag.original.y + dy;
      clampLayer(l);
    }
    if (drag.mode === "resize") {
      const d = local(drag.original, p);
      const w = clamp(d.x + size(drag.original).w / 2, 32, zone().w);
      const aspect = size(drag.original).w / size(drag.original).h;
      l.width = w;
      l.height = clamp(w / aspect, 16, zone().h);
      clampLayer(l);
    }
    if (drag.mode === "rotate") {
      const a = Math.atan2(p.y - l.y, p.x - l.x);
      l.rotation = Math.round(((a * 180) / Math.PI + 90) / 5) * 5;
      clampLayer(l);
    }
    draw();
    onSelection(getSelected());
  }
  function up() {
    if (drag?.moved) snapshot();
    drag = null;
  }
  if (!readOnly) {
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
  }
  canvas.dataset.previewMode = readOnly ? "proof" : "editor";
  canvas.dataset.guides = String(!readOnly);
  refreshGarment();
  draw();
  notify();

  return {
    setColor,
    setGuides,
    surface,
    getState,
    getSelected,
    allLayers,
    select,
    addText,
    addImage,
    addImageFile,
    patch,
    remove,
    duplicate,
    move,
    undo,
    redo,
    changeSide,
    setZoom,
    load,
    draw,
    getSide: () => side,
    canUndo: () => historyIdx > 0,
    canRedo: () => historyIdx < history.length - 1,
    formatWidth: () => Math.round(((getSelected()?.width || 0) / cm()) * 10) / 10,
    cmToPx: (n) => clamp(n, 2, zone().widthCm) * cm(),
    pxToCm: (n) => n / cm(),
    destroy: () => {
      destroyed = true;
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    },
  };
}
