import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const BUCKET = "uploads";

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function readImageSize(file) {
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
