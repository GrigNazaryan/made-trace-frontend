import { useEffect, useRef, useState } from "react";
import { useI18n } from "../lib/i18n/index.jsx";
import { createEditor } from "../lib/editorEngine.js";
import { uploadToStorage } from "../lib/supabaseClient.js";
import { designFonts } from "../lib/fonts.js";

/**
 * @param {object} props
 * @param {object} props.product - {mockupType, printAreas, name, productId}
 * @param {string} props.color - current garment color (hex)
 * @param {{front:array, back:array}} props.value - current design
 * @param {(design:object)=>void} props.onChange
 * @param {string} [props.folder] - storage folder, defaults to "artwork"
 */
export default function DesignEditor({ product, color, value, onChange, folder = "artwork", initialSide = "front", onSideChange }) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [side, setSide] = useState(initialSide);
  const [selected, setSelected] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const editor = createEditor(canvasRef.current, {
      initial: value,
      color,
      product,
      onChange: (state) => onChange(state),
      onSelection: (layer) => setSelected(layer),
      uploadImage: (file) => uploadToStorage(file, folder),
    });
    editor.changeSide(initialSide);
    editorRef.current = editor;
    forceRender((n) => n + 1); // re-render once so undo/redo button state reflects the fresh editor
    return () => editor.destroy();
    // Editor is created once per mount; product/initial changes are intentionally not re-applied
    // here (that would wipe in-progress edits) — see the color/product effects below instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    editorRef.current?.setColor(color);
  }, [color]);

  function changeSide(next) {
    setSide(next);
    onSideChange?.(next);
    editorRef.current?.changeSide(next);
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editorRef.current) return;
    setUploadError(null);
    setUploading(true);
    try {
      await editorRef.current.addImageFile(file);
    } catch (err) {
      setUploadError(err.message || String(err));
    } finally {
      setUploading(false);
    }
  }

  function patch(props) {
    editorRef.current?.patch(props);
  }

  const editor = editorRef.current;

  return (
    <div>
      <div className="editor-toolbar">
        <div className="segmented">
          <button className={side === "front" ? "active" : ""} onClick={() => changeSide("front")} type="button">
            {t("editor_front")}
          </button>
          <button className={side === "back" ? "active" : ""} onClick={() => changeSide("back")} type="button">
            {t("editor_back")}
          </button>
        </div>
        <div className="editor-action-wrap">
          <button className="btn secondary small" type="button" onClick={() => { editor?.undo(); forceRender((n) => n + 1); }} disabled={!editor?.canUndo()}>
            {t("editor_undo")}
          </button>
          <button className="btn secondary small" type="button" onClick={() => { editor?.redo(); forceRender((n) => n + 1); }} disabled={!editor?.canRedo()}>
            {t("editor_redo")}
          </button>
          <button className="btn secondary small" type="button" onClick={() => editor?.setZoom(1)}>
            {t("editor_fit")}
          </button>
        </div>
      </div>

      <div className="builder">
        <aside className="card editor-panel">
          <span className="eyebrow">{t("editor_elements")}</span>
          <h3 style={{ marginTop: 11 }}>{t("editor_title")}</h3>
          <div className="stack">
            <button className="btn secondary block" type="button" onClick={() => editor?.addText()}>
              {t("editor_add_text")}
            </button>
            <button className="btn secondary block" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? t("common_loading") : t("editor_upload")}
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPickFile} />
          </div>
          {uploadError && (
            <p className="small" style={{ color: "#c44b57", marginTop: 8 }}>
              {uploadError}
            </p>
          )}
          <p className="instruction" style={{ marginTop: 16 }}>
            {t("editor_instruction")}
          </p>
        </aside>

        <section className="card pad editor-canvas-shell">
          <canvas ref={canvasRef} aria-label={t("editor_canvas")} />
        </section>

        <aside className="card editor-panel">
          <span className="eyebrow">{t("editor_selected")}</span>
          {!selected && (
            <p className="small" style={{ marginTop: 11 }}>
              {t("editor_select")}
            </p>
          )}
          {selected?.type === "text" && (
            <div className="stack" style={{ marginTop: 11 }}>
              <label className="field">
                <span className="field-label">{t("editor_text")}</span>
                <input
                  className="control"
                  maxLength={80}
                  value={selected.text}
                  onChange={(e) => patch({ text: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">{t("editor_font")}</span>
                <select className="control" value={selected.font} onChange={(e) => patch({ font: e.target.value })}>
                  {designFonts.map(([name, stack]) => (
                    <option key={name} value={name} style={{ fontFamily: stack }}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{t("editor_size")}</span>
                <input
                  className="control"
                  type="range"
                  min={8}
                  max={120}
                  value={selected.fontSize}
                  onChange={(e) => patch({ fontSize: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span className="field-label">{t("editor_color")}</span>
                <input
                  className="control"
                  type="color"
                  value={selected.color}
                  onChange={(e) => patch({ color: e.target.value })}
                />
              </label>
            </div>
          )}
          {selected?.type === "image" && (
            <div className="stack" style={{ marginTop: 11 }}>
              <img
                src={selected.src}
                alt=""
                style={{ width: "100%", borderRadius: 10, border: "1px solid #e5e9f0" }}
              />
              <button className="btn secondary small block" type="button" onClick={() => fileInputRef.current?.click()}>
                {t("editor_replace")}
              </button>
            </div>
          )}
          {selected && (
            <div className="stack" style={{ marginTop: 16 }}>
              <label className="field">
                <span className="field-label">{t("editor_rotation")}</span>
                <input
                  className="control"
                  type="range"
                  min={-180}
                  max={180}
                  step={5}
                  value={selected.rotation || 0}
                  onChange={(e) => patch({ rotation: Number(e.target.value) })}
                />
              </label>
              <div className="row wrap">
                <button className="btn secondary small" type="button" onClick={() => editor?.duplicate()}>
                  {t("editor_duplicate")}
                </button>
                <button className="btn danger small" type="button" onClick={() => editor?.remove()}>
                  {t("common_delete")}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
