import NumberInput from "../../components/NumberInput.jsx";
import { useEffect, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { api } from "../../lib/api.js";
import { uploadToStorage } from "../../lib/supabaseClient.js";
import WorkspaceLayout from "./WorkspaceLayout.jsx";

const HEX_RE = /^#[0-9a-f]{6}$/i;
const MOCKUP_TYPES = ["tee", "hoodie", "tank", "tote", "reference"];

function emptyForm() {
  return {
    name: "", description: "", category: "Apparel", base: 0, acquisitionCost: "", published: false,
    colors: "#ffffff, #0d1b2a", sizes: "S, M, L, XL", mockupType: "tee", image: null,
    paymentMode: "full", paymentPercent: 50,
  };
}

function toFormValues(p) {
  return {
    name: p.name, description: p.description, category: p.category, base: p.base,
    acquisitionCost: p.acquisitionCost ?? "", published: p.published,
    colors: (p.colors || []).join(", "), sizes: (p.sizes || []).join(", "), mockupType: p.mockupType,
    image: p.image || null,
    paymentMode: p.paymentMode || "full", paymentPercent: p.paymentPercent || 50,
  };
}

function ProductForm({ initial, t, onCancel, onSubmit, busy, error }) {
  const [form, setForm] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onPickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { url } = await uploadToStorage(file, "products");
      set("image", url);
    } catch (err) {
      setUploadError(err.message || String(err));
    } finally {
      setUploading(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    const colors = form.colors.split(",").map((c) => c.trim()).filter(Boolean);
    const invalid = colors.find((c) => !HEX_RE.test(c));
    if (invalid) {
      onSubmit(null, `Not a valid hex color: ${invalid}`);
      return;
    }
    onSubmit({
      name: form.name, description: form.description, category: form.category,
      base: Number(form.base) || 0,
      acquisitionCost: form.acquisitionCost === "" ? null : Number(form.acquisitionCost),
      published: form.published, colors, sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      sizeAdjustments: {}, mockupType: form.mockupType, printAreas: {}, image: form.image || null,
      paymentMode: form.paymentMode, paymentPercent: Number(form.paymentPercent) || 50,
    });
  }

  return (
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
          <select className="control" value={form.mockupType} onChange={(e) => set("mockupType", e.target.value)}>
            {MOCKUP_TYPES.map((m) => (
              <option key={m} value={m}>{m}</option>
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
      <label className="field">
        <span className="field-label">{t("ws_product_colors")}</span>
        <input className="control" value={form.colors} onChange={(e) => set("colors", e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">{t("ws_product_sizes")}</span>
        <input className="control" value={form.sizes} onChange={(e) => set("sizes", e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">Image</span>
        {form.image && <img src={form.image} alt="" style={{ width: 120, borderRadius: 8, marginBottom: 8 }} />}
        <input className="control" type="file" accept="image/png,image/jpeg,image/webp" onChange={onPickImage} disabled={uploading} />
        {uploading && <span className="small">{t("common_loading")}</span>}
        {uploadError && <span className="small" style={{ color: "#c44b57" }}>{uploadError}</span>}
      </label>
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
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? t("common_loading") : t("ws_product_save")}
        </button>
        <button className="btn secondary" type="button" onClick={onCancel}>
          {t("ws_product_cancel")}
        </button>
      </div>
    </form>
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
  const { t } = useI18n();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null); // null = none, "new" = creating
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

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
        {editingId === null && (
          <button className="btn primary" onClick={() => { setEditingId("new"); setFormError(null); }}>
            {t("ws_products_new")}
          </button>
        )}
      </div>

      {error && <div className="notice" role="alert">{error}</div>}

      {editingId && (
        <div style={{ marginBottom: 20 }}>
          <ProductForm
            initial={editingId === "new" ? emptyForm() : toFormValues(products.find((p) => p.id === editingId))}
            t={t}
            busy={busy}
            error={formError}
            onCancel={() => setEditingId(null)}
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
            <div className="products-grid">
              {products.map((p) => (
                <div className="card product-card" key={p.id}>
                  <span className="eyebrow">{p.category}</span>
                  <h3>{p.name}</h3>
                  <p className="small">
                    {p.base} · {p.published ? "Published" : "Draft"}
                  </p>
                  <div className="row wrap">
                    {p.colors.map((c) => (
                      <span key={c} className="color-dot" style={{ background: c }} />
                    ))}
                  </div>
                  <div className="row wrap card-actions">
                    <button className="btn secondary small" onClick={() => { setEditingId(p.id); setFormError(null); }}>
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
