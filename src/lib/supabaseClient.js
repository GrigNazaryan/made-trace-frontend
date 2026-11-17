import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const BUCKET = "uploads";

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export function readImageSize(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 1, height: 1 });
    };
    img.src = url;
  });
}

/**
 * Uploads a file to the public `uploads` bucket and returns its public HTTPS URL —
 * the only kind of artwork/attachment URL the backend will accept (see
 * domain/validation.py storage_url(), which requires a Supabase public-object URL).
 * @param {File} file
 * @param {string} folder - e.g. "artwork" or "attachments", to keep the bucket tidy
 * @returns {Promise<{url:string, width:number, height:number}>}
 */
export async function uploadToStorage(file, folder = "uploads") {
  if (!supabase) throw new Error("api_base_url_not_configured");
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const isImage = (file.type || "").startsWith("image/");
  const size = isImage ? await readImageSize(file) : { width: 0, height: 0 };
  return { url: data.publicUrl, ...size };
}

const artworkLimit = 8 * 1024 * 1024;

export async function normalizeArtwork(file) {
  if (!file.size || file.size > artworkLimit) throw new Error("artwork_size_limit");
  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const marker = offset => String.fromCharCode(...signature.slice(offset, offset + 4));
  let type, extension;
  if (signature[0] === 0x89 && marker(1) === "PNG\r") [type, extension] = ["image/png", "png"];
  if (signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff) [type, extension] = ["image/jpeg", "jpg"];
  if (marker(0) === "RIFF" && marker(8) === "WEBP") [type, extension] = ["image/webp", "webp"];
  const name = file.name.replace(/\.[^.]*$/, "") || "artwork";
  if (type) return new File([file], name + "." + extension, { type });
  if (marker(4) !== "ftyp" || !(/\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/.test(file.type))) {
    throw new Error("artwork_type_limit");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > 12000 ||
        image.naturalHeight > 12000 || image.naturalWidth * image.naturalHeight > 40_000_000) {
      throw new Error("artwork_size_limit");
    }
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d").drawImage(image, 0, 0);
    const jpeg = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.94));
    if (!jpeg || jpeg.size > artworkLimit) throw new Error("artwork_size_limit");
    return new File([jpeg], name + ".jpg", {type:"image/jpeg"});
  } catch (error) {
    if (error.message === "artwork_size_limit") throw error;
    throw new Error("artwork_heic_unsupported");
  } finally {
    URL.revokeObjectURL(url);
  }
}
