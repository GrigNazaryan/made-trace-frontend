// Calibrated to the torso/bag panels of the 600 × 650 mockups in /public/mockups.
// These are visual reference surfaces, not supplier-certified production templates.
const surfaces = {
  tee: { front: { cx: 313, y: 202, w: 240, h: 270, widthCm: 32, heightCm: 36 }, back: { cx: 301, y: 175, w: 240, h: 270, widthCm: 32, heightCm: 36 } },
  hoodie: { front: { cx: 310, y: 207, w: 174, h: 145, widthCm: 24, heightCm: 20 }, back: { cx: 300, y: 198, w: 216, h: 274, widthCm: 30, heightCm: 38 } },
  tank: { front: { cx: 313, y: 224, w: 200, h: 260, widthCm: 25, heightCm: 32.5 }, back: { cx: 300, y: 218, w: 200, h: 260, widthCm: 25, heightCm: 32.5 } },
  tote: { front: { cx: 318, y: 292, w: 224, h: 224, widthCm: 28, heightCm: 28 }, back: { cx: 301, y: 292, w: 224, h: 224, widthCm: 28, heightCm: 28 } },
};

export function printSurface(type = "tee", side = "front", configured = {}) {
  const base = surfaces[type]?.[side] || surfaces.tee[side] || surfaces.tee.front;
  const widthCm = Number(configured?.[side]?.widthCm) || base.widthCm;
  const heightCm = Number(configured?.[side]?.heightCm) || base.heightCm;
  // A smaller configured print area remains centered within the actual product panel.
  const scale = Math.min(base.w / widthCm, base.h / heightCm);
  const w = widthCm * scale;
  const h = heightCm * scale;
  return { x: base.cx - w / 2, y: base.y + (base.h - h) / 2, w, h, widthCm, heightCm, pxPerCm: scale };
}

export function validatePrintAreas(areas) {
  for (const side of ["front", "back"]) {
    for (const key of ["widthCm", "heightCm"]) {
      const value = areas?.[side]?.[key];
      if (!Number.isFinite(value) || value < 2 || value > 100) {
        throw new Error("Print dimensions must be between 2 and 100 cm.");
      }
    }
  }
  return areas;
}
