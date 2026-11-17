import { useEffect, useRef, useState } from "react";
import { useI18n, errorText } from "../lib/i18n/index.jsx";
import { createEditor } from "../lib/editorEngine.js";
import { normalizeArtwork, readImageSize } from "../lib/supabaseClient.js";
import { api } from "../lib/api.js";
import { designFonts, fontStack } from "../lib/fonts.js";

/**
 * @param {object} props
 * @param {object} props.product - {mockupType, printAreas, name, productId}
 * @param {string} props.color - current garment color (hex)
 * @param {{front:array, back:array}} props.value - current design
 * @param {(design:object)=>void} props.onChange
 * @param {string} props.workshopId - workshop that may receive this artwork
 */
function layerPosition(layer) {
  return {left: layer.x / 6 + "%", top: layer.y / 6.5 + "%",
    width: layer.width / 6 + "%", height: layer.height / 6.5 + "%",
    transform: "translate(-50%, -50%) rotate(" + (layer.rotation || 0) + "deg)"};
}

export default function DesignEditor({ product, color, value, onChange, workshopId, orderNumber, prepareUpload, templates = [], allowUpload = true, initialSide = "front", onSideChange }) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const inlineRef = useRef(null);
  const imageToolsRef = useRef(null);
  const [inline, setInline] = useState(false);
  const [fontMenu, setFontMenu] = useState(false);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const replaceInput = useRef(false);
  const uploadPreparation = useRef(prepareUpload);
  uploadPreparation.current = prepareUpload;
  const [preview, setPreview] = useState(null);

  async function resolveImage(src) {
    if (!src.startsWith("artwork/")) return src;
    return (await api.artworkUrl({ path: src, orderNumber })).url;
  }

  async function saveArtwork(file) {
    file = await normalizeArtwork(file);
    const dimensions = await readImageSize(file);
    if (dimensions.width <= 1 || dimensions.height <= 1 ||
        dimensions.width > 12000 || dimensions.height > 12000 ||
        dimensions.width * dimensions.height > 40_000_000) {
      throw new Error(t("artwork_upload_failed"));
    }
    await uploadPreparation.current?.();
    const { uploadUrl, path } = await api.signArtwork({ filename: file.name, workshopId, orderNumber });
    const result = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!result.ok) throw new Error(t("artwork_upload_failed"));
    return { url: path, ...dimensions };
  }
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
      interactionTarget: stageRef.current,
      onSelection: (layer) => setSelected(layer),
      onActivate: layer => {
        if (layer?.type === "text") setInline(true);
        if (layer?.type === "image") imageToolsRef.current?.focus({ preventScroll: false });
      },
      onImageError: () => setUploadError(t("artwork_preview_failed")),
      uploadImage: saveArtwork,
      resolveImage,
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

  useEffect(() => {
    let active = true;
    setPreview(null);
    if (selected?.type === "image") {
      resolveImage(selected.src).then(url => { if (active) setPreview(url); }).catch(() => {});
    }
    return () => { active = false; };
  }, [selected?.src, orderNumber]);

  useEffect(() => {
    if (inline) inlineRef.current?.focus({ preventScroll: true });
  }, [inline]);

  function changeSide(next) {
    setInline(false);
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
      await editorRef.current.addImageFile(file, { replace: replaceInput.current });
    } catch (err) {
      const message = err.code ? errorText(t, err.code) : t(err.message);
      setUploadError(message === (err.code || err.message) ? t("artwork_upload_failed") : message);
    } finally {
      setUploading(false);
    }
  }

  function patch(props) {
    editorRef.current?.patch(props);
  }

  const editor = editorRef.current;

  return (
    <div className="design-editor" onKeyDown={event => {
      const isEntry = ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName);
      if (isEntry) event.stopPropagation();
      if (isEntry && event.key === "Enter" && !event.nativeEvent.isComposing && event.target.tagName === "INPUT") event.preventDefault();
    }}>
      <div className="editor-toolbar">
        <div className="segmented">
          <button className={side === "front" ? "active" : ""} onClick={() => changeSide("front")} type="button">
            {t(product?.mockupType === "mug" ? "mug_left" : "editor_front")}
          </button>
          <button className={side === "back" ? "active" : ""} onClick={() => changeSide("back")} type="button">
            {t(product?.mockupType === "mug" ? "mug_right" : "editor_back")}
          </button>
        </div>
        <div className="editor-action-wrap">
          <button className="btn secondary small" type="button" onClick={() => { editor?.undo(); forceRender((n) => n + 1); }} disabled={!editor?.canUndo()}>
            {t("editor_undo")}
          </button>
          <button className="btn secondary small" type="button" onClick={() => { editor?.redo(); forceRender((n) => n + 1); }} disabled={!editor?.canRedo()}>
            {t("editor_redo")}
          </button>
          <button className="btn secondary small" type="button" disabled={!selected} title={t("editor_fit_layer")} onClick={() => editor?.fitSelection()}>
            ⛶ {t("editor_fit_layer")}
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
            {allowUpload && <button className="btn secondary block" type="button" onClick={() => { replaceInput.current = false; fileInputRef.current?.click(); }} disabled={uploading}>
              {uploading ? t("common_loading") : t("editor_upload")}
            </button>}
            {templates.length > 0 && <label className="field"><span>{t("editor_template")}</span>
              <select className="control" value="" onChange={event => {
                const template = templates.find(item => item.id === event.target.value);
                if (template && (!(value?.front?.length || value?.back?.length) || window.confirm(t("confirm_replace_product")))) editor?.applyDesign(template.design);
              }}><option value="">{t("editor_choose_template")}</option>
                {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
            </label>}
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif" hidden onChange={onPickFile} />
          </div>
          {uploadError && (
            <p className="small" style={{ color: "#c44b57", marginTop: 8 }}>
              {uploadError}
              <button type="button" className="btn secondary small" onClick={() => {setUploadError(null); editor?.retryImages();}}>{t("account_retry")}</button>
            </p>
          )}
          <p className="instruction" style={{ marginTop: 16 }}>
            <span className="editor-desktop-hint">{t("editor_desktop_hint")}</span>
            <span className="editor-mobile-hint">{t("editor_mobile_hint")}</span>
          </p>
        </aside>

        <section className="card pad editor-canvas-shell">
          <div className="editor-stage" ref={stageRef}>
            <canvas ref={canvasRef} tabIndex={0} aria-label={t("editor_canvas")}
              onKeyDown={event => {
                const shifts = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
                const shift = shifts[event.key];
                if (!shift || !selected) return;
                event.preventDefault();
                const step = event.shiftKey ? 10 : 1;
                patch({ x: selected.x + shift[0] * step, y: selected.y + shift[1] * step });
              }} />
            {selected && !(inline && selected.type === "text") && (
              <div className="editor-touch-zone" aria-hidden="true" style={layerPosition(selected)}>
                {[[0,0],[50,0],[100,0],[0,50],[100,50],[0,100],[50,100],[100,100]].map(([x,y]) =>
                  <span key={x + ":" + y} style={{left: x + "%", top: y + "%"}} />)}
                <span style={{left:"50%",top:"0", marginTop:"calc(-27 * var(--editor-pixel, 0.6px))"}} />
              </div>
            )}
            {inline && selected?.type === "text" && (
              <textarea ref={inlineRef} className="control editor-inline-text" style={layerPosition(selected)}
                aria-label={t("editor_text")} maxLength={80} value={selected.text}
                onChange={event => patch({ text: event.target.value })}
                onBlur={() => setInline(false)}
                onKeyDown={event => {
                  if (event.key === "Escape" && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    setInline(false);
                    canvasRef.current.focus({preventScroll: true});
                  }
                }} />
            )}
          </div>
        </section>

        <aside className={"card editor-panel editor-properties" + (selected ? " has-selection" : "")}>
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
              <div className="field">
                <span className="field-label">{t("editor_font")}</span>
                <button type="button" className="btn secondary small" aria-expanded={fontMenu} aria-label={t("editor_font") + ": " + selected.font}
                  onClick={() => setFontMenu(!fontMenu)} style={{fontFamily: fontStack(selected.font)}}>{selected.font}</button>
                {fontMenu && <div className="editor-font-list">
                  {designFonts.map(([name, stack]) => (
                    <button type="button" key={name} className="btn secondary small" aria-pressed={selected.font === name}
                      onClick={() => { patch({ font: name }); setFontMenu(false); }}
                      style={{fontFamily: stack}}>{name} · Aa Аа</button>
                  ))}
                </div>}
              </div>
              <label className="field">
                <span className="field-label">{t("editor_size")}</span>
                <input
                  className="control"
                  type="range"
                  min={8}
                  max={120}
                  value={selected.fontSize}
                  onChange={(e) => patch({ fontSize: Number(e.target.value), stretch: false })}
                />
              </label>
              <label className="field">
                <span className="field-label">{t("editor_align")}</span>
                <select className="control" value={selected.align || "center"} onChange={event => patch({align: event.target.value})}>
                  {["left", "center", "right"].map(value => <option key={value} value={value}>{t("editor_align_" + value)}</option>)}
                </select>
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
              {preview && <img
                src={preview}
                alt=""
                style={{ width: "100%", borderRadius: 10, border: "1px solid #e5e9f0" }}
              />}
              <button ref={imageToolsRef} className="btn secondary small block" type="button" onClick={() => { replaceInput.current = true; fileInputRef.current?.click(); }} disabled={uploading}>
                {t("editor_replace")}
              </button>
            </div>
          )}
          {selected && (
            <div className="stack" style={{ marginTop: 16 }}>
              <div className="form-cols">
                {["width", "height"].map(key => <label key={key} className="field">
                  <span className="field-label">{t("editor_" + key)} (cm)</span>
                  <input className="control" type="number" min="0.5" max="100" step="0.1"
                    key={selected.id + ":" + Math.round(editor.pxToCm(selected[key]) * 10)}
                    defaultValue={(editor.pxToCm(selected[key])).toFixed(1)}
                    onBlur={event => {
                      if (Number.isFinite(event.target.valueAsNumber) && event.target.valueAsNumber > 0) {
                        patch({[key]: event.target.valueAsNumber * editor.surface().pxPerCm, ...(selected.type === "text" ? {stretch:true} : {})});
                      }
                    }} />
                </label>)}
              </div>
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
