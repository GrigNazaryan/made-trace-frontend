// Calibrated to the torso/bag panels of the 600 × 650 mockups in /public/mockups.
// These are visual reference surfaces, not supplier-certified production templates.
const surfaces = {
  tee: { front: { cx: 313, y: 202, w: 240, h: 270, widthCm: 32, heightCm: 36 }, back: { cx: 301, y: 175, w: 240, h: 270, widthCm: 32, heightCm: 36 } },
  hoodie: { front: { cx: 310, y: 207, w: 174, h: 145, widthCm: 24, heightCm: 20 }, back: { cx: 300, y: 198, w: 216, h: 274, widthCm: 30, heightCm: 38 } },
  tank: { front: { cx: 313, y: 224, w: 200, h: 260, widthCm: 25, heightCm: 32.5 }, back: { cx: 300, y: 218, w: 200, h: 260, widthCm: 25, heightCm: 32.5 } },
  cap: { front: { cx:300, y:223, w:196, h:98, widthCm:12, heightCm:6 }, back: { cx:300, y:240, w:110, h:58, widthCm:7, heightCm:3.7 } },
  mug: { front: { cx:275, y:214, w:282, h:227, widthCm:10, heightCm:8 }, back: { cx:325, y:214, w:282, h:227, widthCm:10, heightCm:8 } },
  tote: { front: { cx: 318, y: 292, w: 224, h: 224, widthCm: 28, heightCm: 28 }, back: { cx: 301, y: 292, w: 224, h: 224, widthCm: 28, heightCm: 28 } },
};

const wider = {
  tee: { front:{cx:313,y:188,w:268,h:298,widthCm:34,heightCm:38}, back:{cx:301,y:162,w:264,h:300,widthCm:34,heightCm:39} },
  hoodie: { front:{cx:310,y:198,w:200,h:160,widthCm:26,heightCm:21}, back:{cx:300,y:192,w:232,h:284,widthCm:31,heightCm:38} },
};

export function printSurface(type = "tee", side = "front", configured = {}) {
  const selected = configured?._preset?.version === 2 ? wider[type] || surfaces[type] : surfaces[type];
  const base = selected?.[side] || surfaces.tee[side] || surfaces.tee.front;
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
