import { MAX_ORDER_LINES, MAX_PRODUCT_UNITS, orderGroups, orderPayloadLines, removeDesign, splitDesign } from "../lib/orderDesigns.js";
import ProductPreview from "../components/ProductPreview.jsx";
import { setPendingContinuation } from "../lib/authReturn.js";
import NumberInput from "../components/NumberInput.jsx";
import { useEffect, useRef, useState } from "react";
import { useI18n, errorText } from "../lib/i18n/index.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { Link, useRoute } from "../router/HashRouter.jsx";
import { api, ApiError } from "../lib/api.js";
import DesignEditor from "../components/DesignEditor.jsx";

let draftWrites = Promise.resolve();

function queueDraftWrite(operation) {
  draftWrites = draftWrites.catch(() => {}).then(operation);
  return draftWrites;
}

function saveOrderDraft(workshopId, lines, note) {
  return queueDraftWrite(() => api.saveContinuation({ returnTo: "/order/" + workshopId, state: { lines, note } }));
}

function emptyLine(product) {
  return {
    localId: crypto.randomUUID(),
    productId: product.id,
    color: product.colors[0] || "#f7f7f5",
    size: product.sizes[0] || "",
    quantity: 1,
    design: { front: [], back: [] },
    editing: false,
  };
}

function hasArtwork(design) {
  return (design.front || []).length > 0 || (design.back || []).length > 0;
}

export default function NewOrder({ workshopId }) {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const { navigate } = useRoute();
  const [workshop, setWorkshop] = useState(null);
  const [error, setError] = useState(null);
  const [lines, setLines] = useState([]);
  const [note, setNote] = useState("");
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftError, setDraftError] = useState(false);
  const [draftAttempt, setDraftAttempt] = useState(0);
  const restoredDraft = useRef(false);
  const paused = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    let current = true;
    api.continuation().then(saved => {
      if (!current) return;
      restoredDraft.current = saved?.returnTo === "/order/" + workshopId;
      setLines(restoredDraft.current ? saved.state.lines : []);
      setNote(restoredDraft.current ? saved.state.note || "" : "");
      setDraftError(false);
      setDraftReady(true);
    }).catch(() => { if (current) setDraftError(true); });
    return () => { current = false; };
  }, [workshopId, authLoading, draftAttempt]);

  useEffect(() => {
    if (!draftReady || !workshop || submitting) return;
    const timer = setTimeout(() => {
      if (paused.current) return;
      saveOrderDraft(workshopId, lines, note).then(() => setDraftError(false)).catch(() => setDraftError(true));
    }, 750);
    return () => clearTimeout(timer);
  }, [draftReady, workshop, workshopId, lines, note, submitting]);

  useEffect(() => {
    if (!draftReady) return;
    setPendingContinuation(() => saveOrderDraft(workshopId, lines, note));
    const failed = () => setDraftError(true);
    window.addEventListener("madetrace:draft-failed", failed);
    return () => {
      setPendingContinuation(null);
      window.removeEventListener("madetrace:draft-failed", failed);
    };
  }, [draftReady, workshopId, lines, note]);

  useEffect(() => {
    let cancelled = false;
    api
      .storefront(workshopId)
      .then((w) => !cancelled && setWorkshop(w))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setError(t("store_not_available"));
        else setError(errorText(t, err.code));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshopId]);

  const products = (workshop?.products || []).filter((p) => p.published);

  useEffect(() => {
    if (draftReady && !restoredDraft.current && products.length > 0 && lines.length === 0) setLines([emptyLine(products[0])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshop,draftReady]);

  const groups = orderGroups(lines);

  function addLine() {
    if (products.length === 0 || lines.length >= MAX_ORDER_LINES) return;
    setLines((prev) => [...prev, emptyLine(products[0])]);
  }

  function updateLine(localId, patch) {
    setLines((prev) => prev.map((l) => (l.localId === localId ? { ...l, ...patch } : l)));
  }

  function updateGroup(group, patch) {
    const ids = new Set(group.variants.map(line => line.localId));
    setLines(previous => previous.map(line => ids.has(line.localId) ? { ...line, ...patch } : line));
  }

  function removeGroup(group) {
    const ids = new Set(group.variants.map(line => line.localId));
    setLines(previous => previous.filter(line => !ids.has(line.localId)));
  }

  function toggleEditor(line) {
    setLines(previous => previous.map(item => ({
      ...item,
      editing: item.localId === line.localId && !line.editing,
    })));
  }

  function productFor(line) {
    return products.find((p) => p.id === line.productId) || products[0];
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    if (!user) {
      try{await saveOrderDraft(workshopId, lines, note);}catch{setSubmitError(t("account_draft_failed"));return;}
      navigate("/login");
      return;
    }
    if (lines.length === 0) return;
    paused.current = true;
    setSubmitting(true);
    try {
      const payload = {
        workshopId,
        note,
        lines: orderPayloadLines(groups),
      };
      const order = await api.createOrder(payload);
      await queueDraftWrite(() => api.clearContinuation()).catch(() => {});
      navigate(`/orders/${order.id}`,{replace:true});
    } catch (err) {
      paused.current = false;
      setSubmitError(errorText(t, err.code));
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="page narrow">
        <div className="empty">
          <strong>{error}</strong>
          <Link to="/directory" className="btn primary">
            {t("store_back")}
          </Link>
        </div>
      </div>
    );
  }

  if (!workshop || !draftReady || authLoading) {
    return (
      <div className="page">
        <p className="small">{t(draftError?"account_draft_failed":"common_loading")}</p>
        {draftError&&<button className="btn secondary" onClick={()=>setDraftAttempt(n=>n+1)}>{t("account_retry")}</button>}
      </div>
    );
  }

  return (
    <div className="page">
      <Link to={`/workshops/${workshopId}`} className="small">
        ← {workshop.name}
      </Link>
      <h2 style={{ marginTop: 10 }}>{t("neworder_title")}</h2>

      {draftError && <p className="notice" role="status">{t("account_draft_failed")}</p>}
      {products.length === 0 ? (
        <div className="empty">
          <strong>{t("neworder_no_products")}</strong>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          {!user && (
            <div className="notice" role="alert">
              {t("neworder_login_required")}
            </div>
          )}

          <div className="stack" style={{ marginTop: 16 }}>
            {groups.map(group => {
              const line = group.variants[0];
              const product = productFor(line);
              const remaining = MAX_PRODUCT_UNITS - group.quantity;
              return (
                <div className="card pad" key={group.id}>
                  <div className="row wrap" style={{ gap: 14, alignItems: "flex-end" }}>
                    <label className="field" style={{ minWidth: 180 }}>
                      <span className="field-label">{t("neworder_product")}</span>
                      <select
                        className="control"
                        value={line.productId}
                        onChange={(e) => {
                          const next = products.find((p) => p.id === e.target.value);
                          updateGroup(group, {
                            editorSide: "front",
                            productId: next.id,
                            color: next.colors[0] || "#f7f7f5",
                            size: next.sizes[0] || "",
                            design: { front: [], back: [] },
                          });
                        }}
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">{t("neworder_color")}</span>
                      <div className="row wrap color-options">
                        {(product?.colors || []).map((c) => (
                          <button
                            type="button"
                            key={c}
                            className="color-dot"
                            style={{
                              background: c,
                              outline: line.color === c ? "2px solid #2464e8" : "1px solid #d7dde6",
                            }}
                            aria-label={c}
                            onClick={() => updateGroup(group, { color: c })}
                          />
                        ))}
                      </div>
                    </label>
                    <label className="field">
                      <span className="field-label">{t("neworder_size")}</span>
                      <select
                        className="control"
                        value={line.size}
                        onChange={(e) => updateGroup(group, { size: e.target.value })}
                      >
                        {(product?.sizes || []).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {product && (
                    <div style={{ maxWidth: 150, marginTop: 14 }}>
                      <ProductPreview product={product} color={line.color} />
                    </div>
                  )}

                  <div className="row wrap between" style={{ marginTop: 14 }}>
                    <strong>{t("design_group_total", { count: group.quantity })}</strong>
                    <button className="btn danger small" type="button" onClick={() => removeGroup(group)}>
                      {t("neworder_remove_line")}
                    </button>
                  </div>

                  <div className="stack" style={{ marginTop: 12 }}>
                    {group.variants.map((variant, index) => (
                      <div key={variant.localId}>
                        <div className="design-allocation">
                          <strong className="small">{t("design_variant", { index: index + 1 })}</strong>
                          <label className="field">
                            <span className="field-label">{t("neworder_quantity")}</span>
                            <NumberInput className="control" min={1} max={remaining + variant.quantity}
                              value={variant.quantity}
                              onChange={event => {
                                const quantity = Math.trunc(Number(event.target.value)) || 1;
                                updateLine(variant.localId, { quantity: Math.min(remaining + variant.quantity, Math.max(1, quantity)) });
                              }} />
                          </label>
                          <button className="btn secondary small" type="button" onClick={() => toggleEditor(variant)}>
                            {variant.editing ? t("common_close") : hasArtwork(variant.design) ? t("neworder_designed") : t("neworder_customize")}
                          </button>
                          {group.variants.length > 1 && <button className="btn secondary small" type="button"
                            onClick={() => setLines(previous => removeDesign(previous, group.id, variant.localId))}>
                            {t("design_remove")}
                          </button>}
                        </div>
                        {variant.editing && product && (
                          <div style={{ marginTop: 16 }}>
                            <DesignEditor key={line.productId} product={product} color={line.color}
                              value={variant.design}
                              onChange={design => updateLine(variant.localId, { design })}
                              initialSide={variant.editorSide || "front"}
                              onSideChange={side => updateLine(variant.localId, { editorSide: side })}
                              folder={`orders/${workshopId}`} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button className="btn secondary small" type="button" style={{ marginTop: 12 }}
                    disabled={lines.length >= MAX_ORDER_LINES || !group.variants.some(variant => variant.quantity > 1)}
                    onClick={() => setLines(previous => splitDesign(previous, group.id, crypto.randomUUID()))}>
                    {t("design_add")}
                  </button>
                  <p className="small" style={{ marginTop: 8 }}>{t("design_split_help")}</p>
                </div>
              );
            })}
          </div>

          <button className="btn secondary" type="button" onClick={addLine} disabled={lines.length >= MAX_ORDER_LINES} style={{ marginTop: 14 }}>
            {t("neworder_add_line")}
          </button>

          <label className="field" style={{ marginTop: 20 }}>
            <span className="field-label">{t("neworder_note")}</span>
            <textarea className="control" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={4000} />
          </label>

          {submitError && (
            <div className="notice" role="alert" style={{ marginTop: 12 }}>
              {submitError}
            </div>
          )}

          <button className="btn primary block" type="submit" disabled={submitting || lines.length === 0} style={{ marginTop: 16 }}>
            {submitting ? t("common_loading") : t("neworder_submit")}
          </button>
        </form>
      )}
    </div>
  );
}
