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
            Front
          </button>
          <button className={side === "back" ? "active" : ""} onClick={() => changeSide("back")} type="button">
            Back
          </button>
        </div>
        <div className="editor-action-wrap">
          <button className="btn secondary small" type="button" onClick={() => { editor?.undo(); forceRender((n) => n + 1); }} disabled={!editor?.canUndo()}>
            ↶ Undo
          </button>
          <button className="btn secondary small" type="button" onClick={() => { editor?.redo(); forceRender((n) => n + 1); }} disabled={!editor?.canRedo()}>
            ↷ Redo
          </button>
          <button className="btn secondary small" type="button" onClick={() => editor?.setZoom(1)}>
            Fit
          </button>
        </div>
      </div>

      <div className="builder">
        <aside className="card editor-panel">
          <span className="eyebrow">ADD ELEMENTS</span>
          <h3 style={{ marginTop: 11 }}>Create your design</h3>
          <div className="stack">
            <button className="btn secondary block" type="button" onClick={() => editor?.addText()}>
              ＋ Add text
            </button>
            <button className="btn secondary block" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? t("common_loading") : "⇪ Upload image"}
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPickFile} />
          </div>
          {uploadError && (
            <p className="small" style={{ color: "#c44b57", marginTop: 8 }}>
              {uploadError}
            </p>
          )}
          <p className="instruction" style={{ marginTop: 16 }}>
            Drag to move. Use the corner handle to resize and the top handle to rotate. Keep artwork within the
            print guides.
          </p>
        </aside>

        <section className="card pad editor-canvas-shell">
          <canvas ref={canvasRef} aria-label="Design canvas" />
        </section>

        <aside className="card editor-panel">
          <span className="eyebrow">SELECTED ELEMENT</span>
          {!selected && (
            <p className="small" style={{ marginTop: 11 }}>
              Select an element on the canvas to edit it.
            </p>
          )}
          {selected?.type === "text" && (
            <div className="stack" style={{ marginTop: 11 }}>
              <label className="field">
                <span className="field-label">Text</span>
                <input
                  className="control"
                  maxLength={80}
                  value={selected.text}
                  onChange={(e) => patch({ text: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">Font</span>
                <select className="control" value={selected.font} onChange={(e) => patch({ font: e.target.value })}>
                  {designFonts.map(([name, stack]) => (
                    <option key={name} value={name} style={{ fontFamily: stack }}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Size</span>
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
                <span className="field-label">Color</span>
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
                Replace image
              </button>
            </div>
          )}
          {selected && (
            <div className="stack" style={{ marginTop: 16 }}>
              <label className="field">
                <span className="field-label">Rotation</span>
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
                  Duplicate
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
