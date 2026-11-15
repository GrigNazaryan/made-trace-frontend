import { api } from "./api.js";

/**
 * Uploads a file to the PRIVATE bucket via a backend-issued signed URL (see
 * backend/app/routers/uploads.py). Unlike uploadToStorage() in supabaseClient.js,
 * the returned value is an opaque storage PATH, not a public URL — it only
 * becomes viewable again through a short-lived signed URL the backend hands
 * back when it later serves the record this path is attached to.
 *
 * @param {File} file
 * @param {"receipt"} kind - what this upload is for; must match a kind the
 *        backend's /api/uploads/sign endpoint accepts.
 * @returns {Promise<{path: string}>}
 */
export async function uploadToPrivateStorage(file, kind) {
  const { uploadUrl, path } = await api.signUpload({ kind, filename: file.name });
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!response.ok) throw new Error("upload_failed");
  return { path };
}
