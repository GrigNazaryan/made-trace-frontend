import NumberInput from "../../components/NumberInput.jsx";
import { useEffect, useRef, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { api } from "../../lib/api.js";
import { uploadToStorage } from "../../lib/supabaseClient.js";
import WorkspaceLayout from "./WorkspaceLayout.jsx";

function NewPaymentForm({ info, t, onCreated }) {
  const [plan, setPlan] = useState(info.plans[0]?.id || "core");
  const [months, setMonths] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payment = await api.createPayment({ plan, months: Number(months) });
      onCreated(payment);
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card pad">
      <h3>{t("ws_billing_new_payment")}</h3>
      <form onSubmit={submit} className="form-cols" style={{ marginTop: 12 }}>
        {error && <div className="notice" role="alert">{error}</div>}
        <label className="field">
          <span className="field-label">{t("ws_billing_plan")}</span>
          <select className="control" value={plan} onChange={(e) => setPlan(e.target.value)}>
            {info.plans.map((p) => (
              <option key={p.id} value={p.id}>{p.id} — {p.price} {info.currency}/mo</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t("ws_billing_months")}</span>
          <NumberInput className="control" type="number" min={1} max={24} value={months} onChange={(e) => setMonths(e.target.value)} />
        </label>
        <button className="btn primary" type="submit" disabled={busy} style={{ gridColumn: "1 / -1", justifySelf: "start" }}>
          {busy ? t("common_loading") : t("ws_billing_create")}
        </button>
      </form>
    </section>
  );
}

function PaymentRow({ p, t, formatMoney, formatDate, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  async function submitReceipt(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let receiptUrl = null;
      const file = fileRef.current?.files?.[0];
      if (file) {
        const { url } = await uploadToStorage(file, "receipts");
        receiptUrl = url;
      }
      const updated = await api.submitPayment(p.id, { payerNote: note, receiptUrl });
      onUpdated(updated);
      setOpen(false);
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      await api.cancelPayment(p.id);
      onUpdated({ ...p, status: "cancelled" });
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card pad">
      <div className="row between">
        <div>
          <strong>{p.reference}</strong>
          <div className="small">{p.plan} × {p.months}mo · {formatMoney(p.amount, p.currency)}</div>
        </div>
        <span className={`badge ${p.status === "confirmed" ? "completed" : p.status === "rejected" || p.status === "cancelled" ? "cancelled" : "quoted"}`}>
          {p.status}
        </span>
      </div>
      <div className="small" style={{ marginTop: 6 }}>{formatDate(p.createdAt)}</div>
      {error && <div className="notice" role="alert" style={{ marginTop: 8 }}>{error}</div>}
      {(p.status === "pending" || p.status === "submitted") && (
        <div className="row wrap" style={{ marginTop: 10 }}>
          {p.status === "pending" && (
            <button className="btn secondary small" onClick={() => setOpen(!open)} type="button">
              {t("ws_billing_submit_receipt")}
            </button>
          )}
          <button className="btn danger small" onClick={cancel} disabled={busy} type="button">
            {t("ws_billing_cancel")}
          </button>
        </div>
      )}
      {open && (
        <form onSubmit={submitReceipt} className="stack" style={{ marginTop: 10 }}>
          <label className="field">
            <span className="field-label">{t("ws_billing_receipt_note")}</span>
            <input className="control" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">{t("ws_billing_receipt_url")}</span>
            <input ref={fileRef} className="control" type="file" accept="image/*,application/pdf" />
          </label>
          <button className="btn primary small" type="submit" disabled={busy}>
            {busy ? t("common_loading") : t("ws_billing_submit")}
          </button>
        </form>
      )}
    </div>
  );
}

export default function Billing() {
  const { t, formatDate, formatMoney } = useI18n();
  const [info, setInfo] = useState(null);
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    Promise.all([api.billingInfo(), api.listPayments()])
      .then(([i, p]) => { setInfo(i); setPayments(p); })
      .catch((err) => setError(errorText(t, err.code)));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WorkspaceLayout section="billing">
      <h2>{t("ws_billing_title")}</h2>
      {error && <div className="notice" role="alert" style={{ marginTop: 14 }}>{error}</div>}
      {!info && !error && <p className="small" style={{ marginTop: 14 }}>{t("common_loading")}</p>}

      {info && (
        <div className="settings-two" style={{ marginTop: 18 }}>
          <div className="stack">
            <section className="card pad">
              <h3>{t("ws_billing_current_plan")}</h3>
              <div className="stack" style={{ marginTop: 10 }}>
                <div className="row between"><span className="small">{t("ws_settings_plan")}</span><strong>{info.subscription.effectivePlan}</strong></div>
                <div className="row between"><span className="small">{t("ws_settings_status")}</span><span>{info.subscription.status}</span></div>
                {info.subscription.expiresAt && (
                  <div className="row between"><span className="small">{t("ws_settings_expires")}</span><span>{formatDate(info.subscription.expiresAt)}</span></div>
                )}
              </div>
            </section>
            {info.paymentDetails.ready && (
              <section className="card pad">
                <h3>{t("ws_billing_pay_details")}</h3>
                <div className="stack" style={{ marginTop: 10 }}>
                  <div className="row between"><span className="small">{t("ws_billing_method")}</span><span>{info.paymentDetails.method}</span></div>
                  {info.paymentDetails.address && <div className="row between"><span className="small">{t("ws_billing_address")}</span><span>{info.paymentDetails.address}</span></div>}
                  {info.paymentDetails.holder && <div className="row between"><span className="small">{t("ws_billing_holder")}</span><span>{info.paymentDetails.holder}</span></div>}
                  {info.paymentDetails.link && <div className="row between"><span className="small">{t("ws_billing_link")}</span><a href={info.paymentDetails.link} target="_blank" rel="noopener noreferrer">↗</a></div>}
                  {info.paymentDetails.note && <p className="small">{info.paymentDetails.note}</p>}
                </div>
              </section>
            )}
            <NewPaymentForm info={info} t={t} onCreated={(p) => setPayments((prev) => [p, ...(prev || [])])} />
          </div>
          <div className="stack">
            <h3>{t("ws_billing_history")}</h3>
            {payments && payments.length === 0 && <p className="small">{t("ws_billing_empty")}</p>}
            {payments && payments.map((p) => (
              <PaymentRow
                key={p.id}
                p={p}
                t={t}
                formatMoney={formatMoney}
                formatDate={formatDate}
                onUpdated={(updated) => setPayments((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
              />
            ))}
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
