// Canonical paired photographs (front+back in one image); every color is derived from
// identical pixels/alpha via tintPixels() below — see /public/mockups.
export const mockupTypes = ["tee", "hoodie", "tank", "tote"];
export const supportsEditor = (product) => product?.mockupType !== "reference";

export function garmentType(product = {}) {
  if (mockupTypes.includes(product.mockupType)) return product.mockupType;
  const name = (product.name || product.productId || "").toLowerCase();
  if (/hoodie|sweat/.test(name)) return "hoodie";
  if (/tank|sleeveless/.test(name)) return "tank";
  if (/tote|bag/.test(name)) return "tote";
  return "tee";
}

const FILE_BY_TYPE = { tee: "crewneck", hoodie: "hoodie", tank: "tank", tote: "tote" };
export const mockupSource = (type) => `/mockups/${FILE_BY_TYPE[type] || "crewneck"}-pair.png`;
export const thumbnailSource = (type) => `/mockups/thumbnails/${mockupTypes.includes(type) ? type : "tee"}.png`;
export const mockupGeometry = Object.freeze({ x: 56, y: 40, width: 488, height: 540 });

const originals = new Map();
const tints = new Map();

export function loadMockup(type) {
  if (!originals.has(type)) {
    originals.set(
      type,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
          originals.delete(type);
          reject(new Error("Mockup image unavailable"));
        };
        img.src = mockupSource(type);
      })
    );
  }
  return originals.get(type);
}

export function tintPixels(data, color) {
  const hex = /^#[0-9a-f]{6}$/i.test(color) ? color : "#f7f7f5";
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const luminance = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
    for (let c = 0; c < 3; c++) {
      data[i + c] = Math.round(
        Math.max(0, Math.min(255, rgb[c] * (0.4 + 0.6 * luminance) * luminance + Math.max(0, luminance - 0.91) * 52))
      );
    }
  }
  return data;
}

export async function tintedMockup(type, side, color) {
  const key = [type, side, color].join(":");
  if (tints.has(key)) return tints.get(key);
  const image = await loadMockup(type);
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 650;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const g = mockupGeometry;
  ctx.drawImage(image, side === "back" ? image.width / 2 : 0, 0, image.width / 2, image.height, g.x, g.y, g.width, g.height);
  const pixels = ctx.getImageData(0, 0, 600, 650);
  tintPixels(pixels.data, color);
  ctx.putImageData(pixels, 0, 0);
  if (tints.size > 48) tints.delete(tints.keys().next().value);
  tints.set(key, canvas);
  return canvas;
}

const thumbnailImages = new Map();
const thumbnailTints = new Map();

function loadThumbnail(type) {
  if (!thumbnailImages.has(type)) {
    thumbnailImages.set(
      type,
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => {
          thumbnailImages.delete(type);
          reject(new Error("Thumbnail unavailable"));
        };
        image.src = thumbnailSource(type);
      })
    );
  }
  return thumbnailImages.get(type);
}

export async function tintedThumbnail(type, color) {
  const key = type + ":" + color;
  if (thumbnailTints.has(key)) return thumbnailTints.get(key);
  const image = await loadThumbnail(type);
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 260;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, 240, 260);
  const pixels = ctx.getImageData(0, 0, 240, 260);
  tintPixels(pixels.data, color);
  ctx.putImageData(pixels, 0, 0);
  if (thumbnailTints.size > 40) thumbnailTints.delete(thumbnailTints.keys().next().value);
  thumbnailTints.set(key, canvas);
  return canvas;
}
