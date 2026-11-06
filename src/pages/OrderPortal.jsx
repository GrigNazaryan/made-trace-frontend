import { useEffect, useRef, useState } from "react";
import { useI18n, errorText } from "../lib/i18n/index.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { Link, useRoute } from "../router/HashRouter.jsx";
import { api, ApiError } from "../lib/api.js";

const STAGES = ["stage_request", "stage_review", "stage_production", "stage_ready"];

function ProgressTracker({ order, t }) {
  const { progress } = order;
  return (
    <div className="progress-tracker">
      <div className="row wrap" style={{ gap: 6 }}>
        {STAGES.map((key, i) => (
          <span key={key} className={`chip ${i <= progress.stage ? "blue" : ""}`}>
            {t(key)}
          </span>
        ))}
      </div>
      {progress.exception && (
        <div className="notice" style={{ marginTop: 10 }}>
          {progress.exception === "revision"
            ? t("status_clarification")
            : t(`status_${progress.exception}`)}
        </div>
      )}
    </div>
  );
}

function QuoteCard({ order, t, formatMoney, onDecision, busy }) {
  const quote = order.quotes[order.quotes.length - 1];
  return (
    <section className="card pad">
      <h3>{t("order_quote_title")}</h3>
      {!quote && <p className="small">{t("order_quote_none")}</p>}
      {quote && (
        <>
          <p style={{ fontSize: 22, fontWeight: 700, margin: "10px 0" }}>
            {formatMoney(quote.amount, order.currency)}
          </p>
          {quote.reason && <p className="small">{quote.reason}</p>}
          {quote.expectedDate && (
            <p className="small">
              {t("order_quote_expected")}: {quote.expectedDate}
            </p>
          )}
          {quote.decision ? (
            <p className="small" style={{ marginTop: 10 }}>
              {t("order_quote_decided")}
            </p>
          ) : (
            <div className="row wrap" style={{ marginTop: 14 }}>
              <button className="btn primary small" disabled={busy} onClick={() => onDecision(quote.version, "accepted")}>
                {t("order_quote_accept")}
              </button>
              <button className="btn secondary small" disabled={busy} onClick={() => onDecision(quote.version, "revision")}>
                {t("order_quote_revision")}
              </button>
              <button className="btn danger small" disabled={busy} onClick={() => onDecision(quote.version, "declined")}>
                {t("order_quote_decline")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ProofCard({ order, t, onApprove, onRevise, busy }) {
  const proof = order.proof;
  return (
    <section className="card pad">
      <h3>{t("order_proof_title")}</h3>
      {(!proof || !proof.version) && <p className="small">{t("order_proof_none")}</p>}
      {proof && proof.version > 0 && (
        <>
          {proof.approved && <p className="small">{t("order_proof_approved")}</p>}
          {!proof.approved && proof.revisionRequested && <p className="small">{t("order_proof_revision_pending")}</p>}
          {!proof.approved && !proof.revisionRequested && (
            <div className="row wrap" style={{ marginTop: 10 }}>
              <button className="btn primary small" disabled={busy} onClick={() => onApprove(proof.version)}>
                {t("order_proof_approve")}
              </button>
              <button className="btn secondary small" disabled={busy} onClick={() => onRevise(proof.version)}>
                {t("order_proof_revise")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Messages({ order, t, formatDate, onSend, busy }) {
  const [text, setText] = useState("");
  return (
    <section className="card pad">
      <h3>{t("order_messages_title")}</h3>
      {order.messages.length === 0 && <p className="small">{t("order_messages_empty")}</p>}
      <div className="stack" style={{ margin: "12px 0" }}>
        {order.messages.map((m) => (
          <div key={m.id} className={`message ${m.from}`}>
            <p>{m.text || (m.code ? t(`event_${m.code}`) || m.code : "")}</p>
            <span className="small">{formatDate(m.createdAt)}</span>
          </div>
        ))}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onSend(text.trim());
          setText("");
        }}
      >
        <input
          className="control"
          placeholder={t("order_messages_placeholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
        />
        <button className="btn primary" type="submit" disabled={busy || !text.trim()}>
          {t("order_messages_send")}
        </button>
      </form>
    </section>
  );
}

export default function OrderPortal({ number }) {
  const { t, formatMoney, formatDate } = useI18n();
  const { navigate } = useRoute();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const loadedForRef = useRef(null);

  async function load() {
    try {
      const data = await api.getOrder(number);
      setOrder(data);
      api.markOrderRead(number).catch(() => {});
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setError(errorText(t, "forbidden"));
      else setError(errorText(t, err.code));
    }
  }

  useEffect(() => {
    setOrder(null);
    setError(null);
    loadedForRef.current = number;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number]);

  async function withBusy(fn) {
    setBusy(true);
    try {
      const data = await fn();
      setOrder(data);
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  const onQuoteDecision = (version, decision) => withBusy(() => api.decideQuote(number, version, decision));
  const onProofApprove = (version) => withBusy(() => api.approveProof(number, version));
  const onProofRevise = (version) => withBusy(() => api.reviseProof(number, version));
  const onSendMessage = (text) => withBusy(() => api.sendMessage(number, text));
  const onRepeat = () =>
    withBusy(async () => {
      const fresh = await api.repeatOrder(number);
      navigate(`/orders/${fresh.id}`);
      return fresh;
    });

  if (error) {
    return (
      <div className="page narrow">
        <div className="empty">
          <strong>{error}</strong>
          <Link to="/my-orders" className="btn primary">
            {t("order_back")}
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page">
        <p className="small">{t("common_loading")}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/my-orders" className="small">
        {t("order_back")}
      </Link>

      <div className="workspace-heading between" style={{ marginTop: 12 }}>
        <div>
          <h2>{order.title}</h2>
          <p className="small">
            {order.id} · {order.workshop.name}
          </p>
        </div>
        <span className={`badge ${order.status}`}>{t(`status_${order.status}`)}</span>
      </div>

      <ProgressTracker order={order} t={t} />

      <section className="card pad" style={{ marginTop: 18 }}>
        <h3>{t("order_lines_title")}</h3>
        <div className="stack" style={{ marginTop: 10 }}>
          {order.lines.map((line) => (
            <div key={line.id} className="row between">
              <span>
                {line.name} · {line.color} · {line.size}
              </span>
              <span className="small">× {line.quantity}</span>
            </div>
          ))}
        </div>
        {order.estimate !== null && order.estimate !== undefined && (
          <p style={{ marginTop: 12, fontWeight: 700 }}>
            {t("order_estimate")}: {formatMoney(order.estimate, order.currency)}
          </p>
        )}
        {order.note && <p className="small" style={{ marginTop: 10 }}>{order.note}</p>}
      </section>

      <div className="grid2" style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <QuoteCard order={order} t={t} formatMoney={formatMoney} onDecision={onQuoteDecision} busy={busy} />
        <ProofCard order={order} t={t} onApprove={onProofApprove} onRevise={onProofRevise} busy={busy} />
      </div>

      {order.workshop.paymentLink && (
        <section className="card pad" style={{ marginTop: 18 }}>
          <p className="small" style={{ marginBottom: 10 }}>
            {order.paymentPercent >= 100 ? t("order_pay_full_note") : t("order_pay_partial_note", { percent: order.paymentPercent })}
          </p>
          <a className="btn primary" href={order.workshop.paymentLink} target="_blank" rel="noopener noreferrer">
            {t("order_pay")} →
          </a>
        </section>
      )}

      <div style={{ marginTop: 18 }}>
        <Messages order={order} t={t} formatDate={formatDate} onSend={onSendMessage} busy={busy} />
      </div>

      {order.status === "completed" && (
        <div style={{ marginTop: 18 }}>
          <button className="btn secondary" onClick={onRepeat} disabled={busy}>
            {t("order_repeat")}
          </button>
        </div>
      )}
    </div>
  );
}
