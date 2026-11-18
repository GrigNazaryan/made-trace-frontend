import { productDefaults, switchProductType } from "../../lib/productDefaults.js";
import FilePicker from "../../components/FilePicker.jsx";
import EditableColor from "../../components/EditableColor.jsx";
import StoreProductCard from "../../components/StoreProductCard.jsx";
import ClassicIcon from "../../components/ClassicIcon.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { Link } from "../../router/HashRouter.jsx";
import { printSurface } from "../../lib/printAreas.js";
import ProductPreview from "../../components/ProductPreview.jsx";
import NumberInput from "../../components/NumberInput.jsx";
import { useEffect, useRef, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { api } from "../../lib/api.js";
import { normalizeArtwork, readImageSize, uploadToStorage } from "../../lib/supabaseClient.js";
import WorkspaceLayout from "./WorkspaceLayout.jsx";

const HEX_RE = /^#[0-9a-f]{6}$/i;
const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "One size"];
const MOCKUP_TYPES = ["tee", "hoodie", "tank", "tote", "cap", "mug", "reference"];

function emptyForm() {
  return {
    name: "", description: "", category: "Apparel", base: 0, acquisitionCost: "", published: false,
    colors: "#ffffff, #0d1b2a", sizes: "S, M, L, XL", mockupType: "tee", image: null,
    paymentMode: "full", paymentPercent: 50, sizeAdjustments: {}, printAreas: {_preset:{version:2}},
  };
}

function toFormValues(p) {
  return {
    name: p.name, description: p.description, category: p.category, base: p.base,
    acquisitionCost: p.acquisitionCost ?? "", published: p.published,
    colors: (p.colors || []).join(", "), sizes: (p.sizes || []).join(", "), mockupType: p.mockupType,
    image: p.image || null,
    paymentMode: p.paymentMode || "full", paymentPercent: p.paymentPercent || 50, sizeAdjustments: p.sizeAdjustments || {}, printAreas: p.printAreas || {},
  };
}

function ProductForm({ initial, currency, t, onCancel, onSubmit, onDirty, busy, error }) {
  const [baseline] = useState(initial);
  const [form, setForm] = useState(baseline);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const photoBusy = useRef(false);
  const custom = useRef({
    category: baseline.category !== productDefaults(baseline.mockupType).category,
    sizes: baseline.sizes !== productDefaults(baseline.mockupType).sizes,
  });
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [pickedPreviewColor, setPickedPreviewColor] = useState("");
  const previewHeading = useRef(null);
  useEffect(() => () => { if (pendingPhoto) URL.revokeObjectURL(pendingPhoto); }, [pendingPhoto]);

  const [nextColor, setNextColor] = useState("#3b82f6");
  const dirty = Boolean(pendingFile) || JSON.stringify(form) !== JSON.stringify(baseline);
  const selectedSizes = form.sizes.split(",").map(size => size.trim()).filter(Boolean);
  const selectedColors = form.colors.split(",").map(color => color.trim()).filter(Boolean);

  const previewColors = selectedColors.filter(color => HEX_RE.test(color));
  const previewColor = previewColors.includes(pickedPreviewColor) ? pickedPreviewColor : previewColors[0];
  const previewProduct = {
    ...form, name: form.name.trim() || t("preview_product_placeholder"),
    base: Number(form.base) || 0, sizes: selectedSizes, colors: previewColors, image: pendingPhoto || form.image,
  };

  useEffect(() => { onDirty(dirty || uploading); }, [dirty, uploading, onDirty]);
  useEffect(() => {
    if (!dirty && !uploading) return;
    const beforeUnload = event => { event.preventDefault(); event.returnValue = ""; };
    const beforeNavigate = event => {
      if (!window.confirm(t("confirm_unsaved_product"))) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("madetrace:before-navigate", beforeNavigate);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("madetrace:before-navigate", beforeNavigate);
    };
  }, [dirty, uploading, t]);

  function set(key, value) {
    if (key === "category" || key === "sizes") custom.current[key] = true;
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function sendPhoto(file) {
    setPendingFile(file);
    setUploadError(null);
    try {
      const { url } = await uploadToStorage(file, "products");
      set("image", url);
      discardPhoto();
    } catch {
      setUploadError(t("product_photo_upload_failed"));
    }
  }

  function discardPhoto() {
    setPendingFile(null);
    setPendingPhoto(null);
    setUploadError(null);
  }

  async function onPickImage(file) {
    if (photoBusy.current) return;
    photoBusy.current = true;
    setUploading(true);
    setUploadError(null);
    try {
      const normalized = await normalizeArtwork(file);
      const {width, height} = await readImageSize(normalized);
      if (width <= 1 || height <= 1 || width > 12000 || height > 12000 || width * height > 40_000_000) {
        setUploadError(t("product_photo_invalid"));
        return;
      }
      setPendingPhoto(URL.createObjectURL(normalized));
      setPickedPreviewColor("");
      await sendPhoto(normalized);
    } catch (err) {
      const known = ["artwork_size_limit", "artwork_type_limit", "artwork_heic_unsupported"];
      setUploadError(t(known.includes(err.message) ? err.message : "product_photo_invalid"));
    } finally {
      photoBusy.current = false;
      setUploading(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    if (uploading || pendingFile) return;
    const colors = selectedColors;
    const invalid = colors.find((c) => !HEX_RE.test(c));
    if (invalid) {
      onSubmit(null, `Not a valid hex color: ${invalid}`);
      return;
    }
    onSubmit({
      name: form.name, description: form.description, category: form.category,
      base: Number(form.base) || 0,
      acquisitionCost: form.acquisitionCost === "" ? null : Number(form.acquisitionCost),
      published: form.published, colors, sizes: selectedSizes,
      ...(form.sizeAdjustments !== baseline.sizeAdjustments ? { sizeAdjustments: form.sizeAdjustments } : {}),
      printAreas: form.printAreas,
      mockupType: form.mockupType, image: form.image || null,
      paymentMode: form.paymentMode, paymentPercent: Number(form.paymentPercent) || 50,
    });
  }

  return (
    <div className="product-form-preview-layout">
      <aside className="workshop-live-preview">
        <h3 ref={previewHeading} tabIndex={-1}><ClassicIcon name="eye" />{t("preview_storefront")}</h3>
        <p className="small">{t("preview_storefront_description")}</p>
        <StoreProductCard product={previewProduct} currency={currency} color={previewColor} previewAction />
        {previewColors.length > 1 && <div className="row wrap workshop-preview-swatches" role="group" aria-label={t("neworder_color")}>
          {previewColors.map(color => <button key={color} type="button" className="studio-swatch"
            aria-label={color} aria-pressed={previewColor === color} onClick={() => setPickedPreviewColor(color)}>
            <span style={{ backgroundColor: color }} />
          </button>)}
        </div>}
      </aside>
    <form onSubmit={submit} className="card pad stack">
      {error && <div className="notice" role="alert">{error}</div>}
      <label className="field">
        <span className="field-label">{t("ws_product_name")}</span>
        <input className="control" required value={form.name} onChange={(e) => set("name", e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">{t("ws_product_description")}</span>
        <input className="control" value={form.description} onChange={(e) => set("description", e.target.value)} />
      </label>
      <div className="form-cols">
        <label className="field">
          <span className="field-label">{t("ws_product_category")}</span>
          <input className="control" value={form.category} onChange={(e) => set("category", e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">{t("ws_product_mockup")}</span>
          <select className="control" value={form.mockupType} onChange={event => {
            const type = event.target.value;
            setForm(current => switchProductType(current, type, custom.current));
          }}>
            {MOCKUP_TYPES.map((m) => (
              <option key={m} value={m}>{t("mockup_" + m)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t("ws_product_base")}</span>
          <NumberInput className="control" type="number" min={0} step={0.01} value={form.base} onChange={(e) => set("base", e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">{t("ws_product_cost")}</span>
          <NumberInput className="control" type="number" min={0} step={0.01} value={form.acquisitionCost} onChange={(e) => set("acquisitionCost", e.target.value)} />
        </label>
      </div>
      <fieldset className="stack">
        <legend>{t("editor_color")}</legend>
        <div className="row wrap">
          {selectedColors.map((color, index) => HEX_RE.test(color) && (
            <EditableColor key={color + index} color={color} selected={previewColor === color}
              onSelect={() => setPickedPreviewColor(color)}
              onRemove={() => set("colors", selectedColors.filter((_, i) => i !== index).join(", "))} />
          ))}
          <label className="catalog-color-picker" style={{ "--picked-color": nextColor }}>
            <ClassicIcon name="plus" />
            <input type="color" value={nextColor} aria-label={t("catalog_custom_color")}
              onChange={event => setNextColor(event.target.value)} />
          </label>
          <button type="button" className="btn secondary small"
            onClick={() => set("colors", [...new Set([...selectedColors, nextColor])].join(", "))}>
            <ClassicIcon name="plus" />{t("catalog_add_color")}
          </button>
        </div>
        <p className="small" id="catalog-color-hint">{t("catalog_color_hint")}</p>
      </fieldset>
      <fieldset className="stack">
        <legend>{t("editor_size")}</legend>
        <div className="row wrap">
          {STANDARD_SIZES.map(size => (
            <button key={size} type="button" className={`chip ${selectedSizes.includes(size) ? "blue" : ""}`}
              aria-pressed={selectedSizes.includes(size)} onClick={() => set("sizes",
                (selectedSizes.includes(size) ? selectedSizes.filter(value => value !== size) : [...selectedSizes, size]).join(", "))}>
              {size}
            </button>
          ))}
        </div>
        {selectedSizes.map(size => (
          <label className="field" key={size}>
            <span className="field-label">{size} · {t("catalog_size_adjustment")}</span>
            <NumberInput className="control" step={0.01} value={form.sizeAdjustments[size] ?? ""}
              onChange={event => set("sizeAdjustments", { ...form.sizeAdjustments, [size]: Number(event.target.value) || 0 })} />
          </label>
        ))}
      </fieldset>
      {form.mockupType !== "reference" && <details className="settings-disclosure">
        <summary><ClassicIcon name="shirt" />{t("product_print_area")}</summary>
        <p className="small">{t("product_print_area_note")}</p>
        {!form.printAreas._preset && ["tee","hoodie"].includes(form.mockupType) &&
          <label className="check-row"><input type="checkbox" checked={false} onChange={() =>
            set("printAreas", {...form.printAreas,_preset:{version:2}})} />{t("product_print_area_wider")}</label>}
        <div className="form-cols">{["front","back"].flatMap(side => ["widthCm","heightCm"].map(key => {
          const fallback = printSurface(form.mockupType, side, form.printAreas)[key];
          return <label className="field" key={side + key}>
            <span className="field-label">{t(form.mockupType === "mug" ? side === "front" ? "mug_left" : "mug_right" : "editor_" + side)} · {t(key === "widthCm" ? "editor_width" : "editor_height")} (cm)</span>
            <input className="control" type="number" min={2} max={100} step={0.1} placeholder={String(fallback)}
              value={form.printAreas[side]?.[key] ?? ""} onChange={event => {
                const value = event.target.value === "" ? null : Number(event.target.value);
                const next = {...form.printAreas[side]};
                if (value === null) delete next[key]; else next[key] = value;
                set("printAreas", {...form.printAreas,[side]:next});
              }} />
          </label>;
        }))}</div>
      </details>}
      <details className="settings-disclosure">
        <summary><ClassicIcon name="gear" />{t("catalog_advanced_variants")}</summary>
        <label className="field">
          <span className="field-label">{t("ws_product_colors")}</span>
          <input className="control" value={form.colors} onChange={event => set("colors", event.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">{t("ws_product_sizes")}</span>
          <input className="control" value={form.sizes} onChange={event => set("sizes", event.target.value)} />
        </label>
      </details>
      <div className="field">
        <span className="field-label">{t("product_photo")}</span>
        <FilePicker accept="image/png,image/jpeg,image/webp,.heic,.heif" onFile={onPickImage} disabled={uploading} fileName={pendingFile?.name || ""} />
        {uploading && <span className="small" role="status">{t("common_loading")}</span>}
        {uploadError && <span className="small" role="alert">{uploadError}</span>}
        {pendingFile && !uploading && <div className="row wrap">
          <button type="button" className="btn secondary small" onClick={() => onPickImage(pendingFile)}>{t("account_retry")}</button>
          <button type="button" className="btn secondary small" onClick={discardPhoto}>{t("product_photo_discard")}</button>
        </div>}
      </div>
      <label className="field">
        <span className="field-label">{t("ws_product_payment_mode")}</span>
        <select className="control" value={form.paymentMode} onChange={(e) => set("paymentMode", e.target.value)}>
          <option value="prepay">{t("ws_payment_mode_prepay")}</option>
          <option value="full">{t("ws_payment_mode_full")}</option>
          <option value="on_ready">{t("ws_payment_mode_on_ready")}</option>
        </select>
      </label>
      {form.paymentMode === "prepay" && (
        <label className="field">
          <span className="field-label">{t("ws_product_payment_percent")}</span>
          <NumberInput
            className="control"
            type="number"
            min={1}
            max={99}
            value={form.paymentPercent}
            onChange={(e) => set("paymentPercent", e.target.value)}
          />
        </label>
      )}
      <label className="check-row">
        <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} />
        <span>{t("ws_product_published")}</span>
      </label>
      <div className="row wrap">
        <button className="btn primary" type="submit" disabled={busy || uploading || Boolean(pendingFile)}>
          <ClassicIcon name="check" />{busy ? t("common_loading") : t("ws_product_save")}
        </button>
        <button className="btn secondary" type="button" onClick={onCancel}>
          {t("ws_product_cancel")}
        </button>
        <button className="btn secondary preview-jump" type="button" onClick={() => {
          previewHeading.current?.scrollIntoView({ block: "start" });
          previewHeading.current?.focus({ preventScroll: true });
        }}><ClassicIcon name="eye" />{t("preview_storefront")}</button>
      </div>
    </form>
    </div>
  );
}

function BulkPricing({ t, products }) {
  const [scope, setScope] = useState("all");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState([]);
  const [percent, setPercent] = useState(0);
  const [preview, setPreview] = useState(null);
  const [adjustmentId, setAdjustmentId] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function runPreview() {
    setError(null);
    setBusy(true);
    try {
      const body = { scope, category, selected, percent: Number(percent), rounding: 0.01 };
      const { rows } = await api.bulkPricePreview(body);
      setPreview(rows);
    } catch (err) {
      setError(err.code === "growth_required" ? t("ws_bulk_growth_only") : errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      const body = { scope, category, selected, percent: Number(percent), rounding: 0.01 };
      const { id } = await api.bulkPriceApply(body);
      setAdjustmentId(id);
      setPreview(null);
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!adjustmentId) return;
    setBusy(true);
    try {
      await api.bulkPriceUndo(adjustmentId);
      setAdjustmentId(null);
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <section className="card pad">
      <h3>{t("ws_bulk_title")}</h3>
      {error && <div className="notice" role="alert" style={{ marginTop: 10 }}>{error}</div>}
      {adjustmentId && (
        <div className="notice" style={{ marginTop: 10 }}>
          {t("ws_bulk_applied")}{" "}
          <button className="btn secondary small" onClick={undo} disabled={busy}>
            {t("ws_bulk_undo")}
          </button>
        </div>
      )}
      <div className="form-cols" style={{ marginTop: 14 }}>
        <label className="field">
          <span className="field-label">{t("ws_bulk_scope")}</span>
          <select className="control" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">{t("ws_bulk_scope_all")}</option>
            <option value="category">{t("ws_bulk_scope_category")}</option>
            <option value="selected">{t("ws_bulk_scope_selected")}</option>
          </select>
        </label>
        {scope === "category" && (
          <label className="field">
            <span className="field-label">{t("ws_product_category")}</span>
            <select className="control" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span className="field-label">{t("ws_bulk_percent")}</span>
          <NumberInput className="control" type="number" step={0.1} value={percent} onChange={(e) => setPercent(e.target.value)} />
        </label>
      </div>
      {scope === "selected" && (
        <div className="row wrap" style={{ marginTop: 10 }}>
          {products.map((p) => (
            <label key={p.id} className="chip">
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={(e) =>
                  setSelected((prev) => (e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)))
                }
              />
              &nbsp;{p.name}
            </label>
          ))}
        </div>
      )}
      <div className="row wrap" style={{ marginTop: 14 }}>
        <button className="btn secondary small" onClick={runPreview} disabled={busy} type="button">
          {t("ws_bulk_preview")}
        </button>
        <button className="btn primary small" onClick={apply} disabled={busy || !preview} type="button">
          {t("ws_bulk_apply")}
        </button>
      </div>
      {preview && (
        <div className="table-scroll" style={{ marginTop: 14 }}>
          <table className="order-table">
            <thead>
              <tr><th>Name</th><th>Before</th><th>After</th></tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.before}</td>
                  <td>{row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function Products() {
  const { t, formatMoney } = useI18n();
  const currency = useAuth().user?.workshop?.currency;
  const editAnchor = useRef(null);
  const [previewColors, setPreviewColors] = useState({});
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [editingDirty, setEditingDirty] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = none, "new" = creating
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editingId) return;
    editAnchor.current?.scrollIntoView({block:"start"});
    editAnchor.current?.focus({preventScroll:true});
  }, [editingId]);

  function selectProduct(id) {
    if (id === editingId) return;
    if (editingDirty && !window.confirm(t("confirm_unsaved_product"))) return;
    setEditingDirty(false);
    setEditingId(id);
    setFormError(null);
  }

  function load() {
    api.listProducts().then(setProducts).catch((err) => setError(errorText(t, err.code)));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(body, validationError) {
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      if (editingId === "new") await api.createProduct(body);
      else await api.updateProduct(editingId, body);
      setEditingDirty(false);
      setEditingId(null);
      load();
    } catch (err) {
      setFormError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id) {
    await api.deleteProduct(id);
    load();
  }

  return (
    <WorkspaceLayout section="products">
      <div className="between" style={{ marginBottom: 20 }}>
        <h2>{t("ws_products_title")}</h2>
        {!editingId && <Link className="btn secondary" to="/workspace/products/pricing">{t("ws_settings_pricing")}</Link>}
        {editingId === null && (
          <button className="btn primary" onClick={() => { setEditingId("new"); setFormError(null); }}>
            <ClassicIcon name="plus" />{t("ws_products_new")}
          </button>
        )}
      </div>

      {error && <div className="notice" role="alert">{error}</div>}

      {editingId && (
        <div ref={editAnchor} tabIndex={-1} className="catalog-edit-anchor" style={{ marginBottom: 20 }}>
          <ProductForm
            currency={currency}
            key={editingId}
            initial={editingId === "new" ? emptyForm() : toFormValues(products.find((p) => p.id === editingId))}
            t={t}
            busy={busy}
            error={formError}
            onDirty={setEditingDirty}
            onCancel={() => selectProduct(null)}
            onSubmit={onSubmit}
          />
        </div>
      )}

      {products === null && !error && <p className="small">{t("common_loading")}</p>}

      {products !== null && (
        <>
          {products.length === 0 ? (
            <div className="empty"><strong>{t("ws_products_empty")}</strong></div>
          ) : (
            <div className="products-grid workshop-products">
              {products.map((p) => (
                <div className="card product-card" key={p.id}>
                  <ProductPreview product={p} color={previewColors[p.id] || p.colors[0]} />
                  <span className="eyebrow">{["Apparel","Headwear","Drinkware"].includes(p.category) ? t("category_" + p.category.toLowerCase()) : p.category}</span>
                  <h3>{p.name}</h3>
                  <p className="small">
                    {t("ws_product_base")} · {currency ? formatMoney(p.base, currency) : p.base}
                    <span className="chip">{t(p.published ? "template_public" : "template_private")}</span>
                  </p>
                  <div className="row wrap">
                    {p.colors.map((c) => (
                      <button key={c} type="button" className="color-dot"
                      aria-label={p.name + " · " + c}
                      aria-pressed={(previewColors[p.id] || p.colors[0]) === c}
                      style={{ background: c }}
                      onClick={() => setPreviewColors(previous => ({ ...previous, [p.id]: c }))} />
                    ))}
                  </div>
                  <div className="row wrap card-actions">
                    <button className="btn secondary small" onClick={() => selectProduct(p.id)}>
                      {t("ws_product_edit")}
                    </button>
                    <button className="btn danger small" onClick={() => onDelete(p.id)}>
                      {t("ws_product_delete")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 24 }}>
            <BulkPricing t={t} products={products} />
          </div>
        </>
      )}
    </WorkspaceLayout>
  );
}
