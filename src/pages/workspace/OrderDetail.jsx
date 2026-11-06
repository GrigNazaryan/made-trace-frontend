import NumberInput from "../../components/NumberInput.jsx";
import { useEffect, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { Link } from "../../router/HashRouter.jsx";
import { api } from "../../lib/api.js";
import WorkspaceLayout from "./WorkspaceLayout.jsx";
import DesignEditor from "../../components/DesignEditor.jsx";

const STATUSES = [
  "request", "clarification", "quoted", "approved", "proof",
  "production", "ready", "completed", "waiting", "delayed", "cancelled",
];

function QuoteSection({ order, t, formatMoney, onSent }) {
  const latest = order.quotes[order.quotes.length - 1];
  const [amount, setAmount] = useState(latest?.amount ?? order.estimate ?? 0);
  const [reason, setReason] = useState("");
  const [expected, setExpected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function send(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await api.sendQuote(order.id, { amount: Number(amount), reason, expectedDate: expected || null });
      onSent(updated);
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card pad">
      <h3>{t("ws_order_quote_section")}</h3>
      {latest && (
        <p className="small">
          v{latest.version} · {formatMoney(latest.amount, order.currency)} · {latest.decision || "awaiting response"}
        </p>
      )}
      <form onSubmit={send} className="stack" style={{ marginTop: 10 }}>
        {error && <div className="notice" role="alert">{error}</div>}
        <label className="field">
          <span className="field-label">{t("ws_order_quote_amount")} ({order.currency})</span>
          <NumberInput className="control" type="number" min={0.01} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">{t("ws_order_quote_reason")}</span>
          <textarea className="control" rows={3} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">{t("ws_order_quote_expected")}</span>
          <input className="control" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
        </label>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? t("common_loading") : t("ws_order_quote_send")}
        </button>
      </form>
    </section>
  );
}

function ProofSection({ order, t, onSent }) {
  const [designs, setDesigns] = useState(() => Object.fromEntries(order.lines.map((l) => [l.id, l.design || { front: [], back: [] }])));
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const body = { lines: order.lines.map((l) => ({ id: l.id, design: designs[l.id] })) };
      const updated = await api.sendProof(order.id, body);
      onSent(updated);
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card pad">
      <h3>{t("ws_order_proof_section")}</h3>
      <p className="small">Proof v{order.proof?.version || 0}{order.proof?.approved ? " · approved" : ""}</p>
      {error && <div className="notice" role="alert">{error}</div>}
      <div className="stack" style={{ marginTop: 10 }}>
        {order.lines.map((line) => (
          <div key={line.id}>
            <div className="line-card">
              <div className="grow">
                <strong style={{ fontSize: 12 }}>{line.name}</strong>
                <div className="small">{line.color} · {line.size} · ×{line.quantity}</div>
              </div>
              <button
                className="btn secondary small"
                type="button"
                onClick={() => setEditingId(editingId === line.id ? null : line.id)}
              >
                {editingId === line.id ? t("common_close") : "Edit artwork"}
              </button>
            </div>
            {editingId === line.id && (
              <div style={{ marginBottom: 14 }}>
                <DesignEditor
                  product={{ mockupType: line.mockupType, printAreas: line.printAreas, name: line.name, productId: line.productId }}
                  color={line.color}
                  value={designs[line.id]}
                  onChange={(design) => setDesigns((d) => ({ ...d, [line.id]: design }))}
                  folder={`orders/${order.id}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="btn primary" style={{ marginTop: 14 }} onClick={send} disabled={busy}>
        {busy ? t("common_loading") : t("ws_order_proof_send")}
      </button>
    </section>
  );
}

function StatusSection({ order, t, onSent }) {
  const [status, setStatus] = useState(order.status);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await api.changeOrderStatus(order.id, { status, comment });
      onSent(updated);
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card pad">
      <h3>{t("ws_order_status_section")}</h3>
      <form onSubmit={save} className="stack" style={{ marginTop: 10 }}>
        {error && <div className="notice" role="alert">{error}</div>}
        <label className="field">
          <span className="field-label">{t("ws_order_status")}</span>
          <select className="control" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status_${s}`)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t("ws_order_status_comment")}</span>
          <textarea className="control" rows={2} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>
        <button className="btn secondary" type="submit" disabled={busy} style={{ justifySelf: "start" }}>
          {busy ? t("common_loading") : t("ws_order_status_save")}
        </button>
      </form>
    </section>
  );
}

function ScheduleSection({ order, t, onSent }) {
  const sched = order.schedule || {};
  const [form, setForm] = useState({
    productionStart: sched.productionStart || "", productionDue: sched.productionDue || "",
    estimatedDate: sched.estimatedDate || "", promisedDate: sched.promisedDate || "", comment: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateSchedule(order.id, form);
      onSent(updated);
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <section className="card pad">
      <h3>{t("ws_order_schedule_section")}</h3>
      <form onSubmit={save} className="stack" style={{ marginTop: 10 }}>
        {error && <div className="notice" role="alert">{error}</div>}
        <div className="form-cols">
          <label className="field">
            <span className="field-label">{t("ws_order_schedule_start")}</span>
            <input className="control" type="date" value={form.productionStart} onChange={set("productionStart")} />
          </label>
          <label className="field">
            <span className="field-label">{t("ws_order_schedule_due")}</span>
            <input className="control" type="date" value={form.productionDue} onChange={set("productionDue")} />
          </label>
          <label className="field">
            <span className="field-label">{t("ws_order_schedule_estimated")}</span>
            <input className="control" type="date" value={form.estimatedDate} onChange={set("estimatedDate")} />
          </label>
          <label className="field">
            <span className="field-label">{t("ws_order_schedule_promised")}</span>
            <input className="control" type="date" value={form.promisedDate} onChange={set("promisedDate")} />
          </label>
        </div>
        <label className="field">
          <span className="field-label">{t("ws_order_schedule_comment")}</span>
          <input className="control" value={form.comment} onChange={set("comment")} />
        </label>
        <button className="btn secondary" type="submit" disabled={busy} style={{ justifySelf: "start" }}>
          {busy ? t("common_loading") : t("ws_order_schedule_save")}
        </button>
      </form>
    </section>
  );
}

function NotesSection({ order, t, onSent }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const updated = await api.addNote(order.id, { text: text.trim() });
      onSent(updated);
      setText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card pad">
      <h3>{t("ws_order_notes_section")}</h3>
      <div className="stack" style={{ margin: "10px 0" }}>
        {(order.internalNotes || []).map((n) => (
          <div key={n.id} className="surface">
            <p style={{ margin: 0, fontSize: 12 }}>{n.text}</p>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="row">
        <input className="control" placeholder={t("ws_order_notes_placeholder")} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn secondary" type="submit" disabled={busy || !text.trim()}>
          {t("ws_order_notes_add")}
        </button>
      </form>
    </section>
  );
}

function MessagesSection({ order, t, formatDate, onSent }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const updated = await api.sendMessage(order.id, text.trim());
      onSent(updated);
      setText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card pad">
      <h3>{t("order_messages_title")}</h3>
      <div className="stack" style={{ margin: "12px 0" }}>
        {order.messages.length === 0 && <p className="small">{t("order_messages_empty")}</p>}
        {order.messages.map((m) => (
          <div key={m.id} className={`message ${m.from === "staff" ? "staff" : ""}`}>
            <div className="meta">{m.from === "staff" ? "You" : "Customer"} · {formatDate(m.createdAt)}</div>
            {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="row">
        <input className="control" placeholder={t("order_messages_placeholder")} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn primary" type="submit" disabled={busy || !text.trim()}>
          {t("order_messages_send")}
        </button>
      </form>
    </section>
  );
}

export default function OrderDetail({ number }) {
  const { t, formatMoney, formatDate } = useI18n();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setOrder(null);
    api.getOrder(number).then(setOrder).catch((err) => setError(errorText(t, err.code)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number]);

  return (
    <WorkspaceLayout section="orders">
      <Link to="/workspace/orders" className="small">{t("ws_order_back")}</Link>

      {error && <div className="notice" role="alert" style={{ marginTop: 14 }}>{error}</div>}
      {!order && !error && <p className="small" style={{ marginTop: 14 }}>{t("common_loading")}</p>}

      {order && (
        <>
          <div className="between" style={{ margin: "16px 0 24px" }}>
            <div>
              <span className="eyebrow">{order.id}</span>
              <h2 style={{ margin: "8px 0 4px" }}>{order.title}</h2>
              <div className="small">{order.customer.name} · {order.customer.email}</div>
            </div>
            <span className={`badge ${order.status}`}>{t(`status_${order.status}`)}</span>
          </div>

          <div className="settings-two">
            <div className="stack">
              <section className="card pad">
                <h3>{t("order_lines_title")}</h3>
                <div className="stack" style={{ marginTop: 10 }}>
                  {order.lines.map((l) => (
                    <div key={l.id} className="row between">
                      <span>{l.name} · {l.color} · {l.size}</span>
                      <span className="small">× {l.quantity}</span>
                    </div>
                  ))}
                </div>
                {order.note && <p className="small" style={{ marginTop: 10 }}>{order.note}</p>}
              </section>
              <ProofSection order={order} t={t} onSent={setOrder} />
              <ScheduleSection order={order} t={t} onSent={setOrder} />
              <NotesSection order={order} t={t} onSent={setOrder} />
            </div>
            <div className="stack">
              <QuoteSection order={order} t={t} formatMoney={formatMoney} onSent={setOrder} />
              <StatusSection order={order} t={t} onSent={setOrder} />
              <MessagesSection order={order} t={t} formatDate={formatDate} onSent={setOrder} />
            </div>
          </div>
        </>
      )}
    </WorkspaceLayout>
  );
}
