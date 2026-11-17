import { MAX_ORDER_LINES, MAX_PRODUCT_UNITS, orderGroups, orderPayloadLines, removeDesign, splitDesign, splitDesignsTo, designCapacity } from "../lib/orderDesigns.js";
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
  const { t, formatMoney } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const { navigate } = useRoute();
  const [templates, setTemplates] = useState({});
  const requestedProduct = new URLSearchParams(location.hash.split("?")[1]).get("product");
  const [workshop, setWorkshop] = useState(null);
  const [error, setError] = useState(null);
  const [lines, setLines] = useState([]);
  const [note, setNote] = useState("");
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftError, setDraftError] = useState(null);
  const [draftAttempt, setDraftAttempt] = useState(0);
  const restoredDraft = useRef(false);
  const draftRevision = useRef(0);
  const paused = useRef(false);
  const submission = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    let current = true;
    api.continuation(workshopId).then(saved => {
      if (!current) return;
      restoredDraft.current = saved?.returnTo === "/order/" + workshopId;
      draftRevision.current = saved?.revision ?? 0;
      setLines(restoredDraft.current ? saved.state.lines : []);
      setNote(restoredDraft.current ? saved.state.note || "" : "");
      setDraftError(null);
      setDraftReady(true);
    }).catch(error => { if (current) setDraftError(error.code || "network_error"); });
    return () => { current = false; };
  }, [workshopId, authLoading, draftAttempt]);

  function saveOrderDraft() {
    return queueDraftWrite(async () => {
      const result = await api.saveContinuation({
        returnTo: "/order/" + workshopId, state: { lines, note }, revision: draftRevision.current,
      });
      draftRevision.current = result.revision ?? draftRevision.current;
    });
  }

  useEffect(() => {
    if (!draftReady || !workshop || submitting) return;
    const timer = setTimeout(() => {
      if (paused.current) return;
      saveOrderDraft().then(() => setDraftError(null)).catch(error => setDraftError(error.code || "network_error"));
    }, 750);
    return () => clearTimeout(timer);
  }, [draftReady, workshop, workshopId, lines, note, submitting]);

  useEffect(() => {
    if (!draftReady) return;
    setPendingContinuation(() => saveOrderDraft().catch(error => {
      setDraftError(error.code || "network_error");
      throw error;
    }));
    const failed = () => setDraftError(current => current || "network_error");
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
    if (draftReady && !restoredDraft.current && products.length > 0 && lines.length === 0) setLines([emptyLine(products.find(product => product.id === requestedProduct) || products[0])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshop,draftReady]);

  const templateType = lines.find(line => line.editing)?.productId;
  const mockup = products.find(product => product.id === templateType)?.mockupType;
  useEffect(() => {
    if (!mockup || mockup === "reference") return;
    let active = true;
    api.publicTemplates(workshopId, mockup).then(items => {
      if (active) setTemplates(current => ({...current, [mockup]: items}));
    }).catch(() => {});
    return () => { active = false; };
  }, [workshopId, mockup]);

  const groups = orderGroups(lines);
  const quoteInput = orderPayloadLines(groups);
  const quoteKey = JSON.stringify(quoteInput);
  const currentEstimate = estimate?.key === quoteKey ? estimate : null;

  async function previewEstimate() {
    setEstimating(true);
    try {
      const result = await api.estimateOrder({ workshopId, lines: quoteInput });
      setEstimate({ key: quoteKey, result });
    } catch (error) {
      setEstimate({ key: quoteKey, error: errorText(t, error.code) });
    } finally {
      setEstimating(false);
    }
  }

  function chooseProduct(group, next) {
    if (group.variants[0].productId === next.id) return;
    if (group.variants.some(variant => hasArtwork(variant.design)) && !window.confirm(t("confirm_replace_product"))) return;
    updateGroup(group, {
      editorSide: "front", productId: next.id, color: next.colors[0] || "#f7f7f5",
      size: next.sizes[0] || "", design: { front: [], back: [] },
    });
  }

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
    if (e.nativeEvent.submitter?.dataset.action !== "send-order") return;
    if (!user) {
      try { await saveOrderDraft(); } catch (error) {
        setDraftError(error.code || "network_error");
        return;
      }
      navigate("/login");
      return;
    }
    if (lines.length === 0 || paused.current) return;
    paused.current = true;
    setSubmitting(true);
    try {
      const payload = {
        workshopId,
        note,
        lines: orderPayloadLines(groups),
      };
      const fingerprint = JSON.stringify(payload);
      if (submission.current?.fingerprint !== fingerprint) {
        submission.current = { fingerprint, id: crypto.randomUUID() };
      }
      await saveOrderDraft();
      const order = await api.createOrder({ ...payload, requestId: submission.current.id });
      await queueDraftWrite(() => api.clearContinuation({ workshopId, revision: draftRevision.current })).catch(() => {});
      navigate(`/orders/${order.id}`,{replace:true});
    } catch (err) {
      paused.current = false;
      if (err.code === "draft_conflict") setDraftError(err.code);
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

      {draftError && <div className="notice" role="status">
        {t(draftError === "draft_conflict" ? "err_draft_conflict" : "account_draft_failed")}
        {draftError === "draft_conflict" && <button type="button" className="btn secondary small"
          onClick={() => { if (window.confirm(t("confirm_reload_draft"))) setDraftAttempt(current => current + 1); }}>
          {t("reload_saved_draft")}
        </button>}
      </div>}
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
              const capacity = designCapacity(lines.length, group);
              return (
                <div className="card pad" key={group.id}>
                  <strong>{t("neworder_product")}</strong>
                  <div className="order-product-picker">
                    {products.map(product => (
                      <button key={product.id} type="button" className="btn secondary"
                        aria-pressed={line.productId === product.id} onClick={() => chooseProduct(group, product)}>
                        <ProductPreview product={product} color={line.productId === product.id ? line.color : product.colors[0]} />
                        <strong>{product.name}</strong>
                        <span className="small">{formatMoney(product.base, workshop.currency)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="row wrap" style={{ gap: 14, alignItems: "flex-end" }}>
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
                  <div className="row wrap between" style={{ marginTop: 14 }}>
                    <strong>{t("design_group_total", { count: group.quantity })}</strong>
                    <button className="btn danger small" type="button" onClick={() => removeGroup(group)}>
                      {t("neworder_remove_line")}
                    </button>
                  </div>

                  <section className="design-split-tools" aria-label={t("design_section")}>
                    <strong>{t("design_section")}</strong>
                    <p className="small">{t("design_start_help")}</p>
                    <div className="row wrap">
                      <button className="btn secondary small" type="button"
                        disabled={capacity <= group.variants.length}
                        onClick={() => setLines(previous => splitDesign(previous, group.id, crypto.randomUUID()))}>
                        {t("design_add")}
                      </button>
                      {capacity > group.variants.length + 1 && (
                        <button className="btn secondary small" type="button"
                          onClick={() => setLines(previous => splitDesignsTo(previous, group.id, capacity, () => crypto.randomUUID()))}>
                          {t("design_split_all", { count: capacity })}
                        </button>
                      )}
                    </div>
                    {group.variants.length > 1 && <p className="small">{t("design_split_help")}</p>}
                  </section>

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
                              templates={templates[productFor(variant)?.mockupType] || []}
                              workshopId={workshopId}
                              prepareUpload={user ? undefined : () => saveOrderDraft()} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

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

          {!!lines.length && <section className="card pad" style={{ marginTop: 16 }}>
            <div className="between">
              <h3>{t("order_estimate")}</h3>
              <button type="button" className="btn secondary small" onClick={previewEstimate} disabled={estimating}>
                {t(estimating ? "common_loading" : "estimate_calculate")}
              </button>
            </div>
            {currentEstimate?.error && <p className="notice" role="alert">{currentEstimate.error}</p>}
            {currentEstimate?.result && (currentEstimate.result.estimate ? (
              <div className="stack">
                <p className="small">{t("estimate_not_quote")}</p>
                {currentEstimate.result.estimate.breakdown.map((line, index) => (
                  <div key={quoteInput[index].id} className="row between">
                    <span>{line.name} × {line.quantity}</span>
                    <strong>{formatMoney(line.total, currentEstimate.result.currency)}</strong>
                  </div>
                ))}
                <strong>{formatMoney(currentEstimate.result.estimate.total, currentEstimate.result.currency)}</strong>
              </div>
            ) : <p className="small">{t("estimate_by_workshop")}</p>)}
          </section>}

          {submitError && (
            <div className="notice" role="alert" style={{ marginTop: 12 }}>
              {submitError}
            </div>
          )}

          <button className="btn primary block" type="submit" data-action="send-order" disabled={submitting || lines.length === 0 || draftError === "draft_conflict"} style={{ marginTop: 16 }}>
            {submitting ? t("common_loading") : t("neworder_submit")}
          </button>
        </form>
      )}
    </div>
  );
}
