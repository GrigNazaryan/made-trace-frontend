import ClassicIcon from "../components/ClassicIcon.jsx";
import { collectOrderPages } from "../lib/orderPages.js";
import { orderPayment } from "../lib/orderPayment.js";
import { useEffect, useMemo, useState } from "react";
import { useI18n, errorText } from "../lib/i18n/index.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { Link, useRoute, BackButton } from "../router/HashRouter.jsx";
import { api } from "../lib/api.js";

const ALL_STATUSES = [
  "request", "clarification", "quoted", "approved", "proof",
  "production", "ready", "completed", "waiting", "delayed", "cancelled",
];

function StatusChip({ status, t }) {
  return <span className={`badge ${status}`}>{t(`status_${status}`)}</span>;
}

export default function MyOrders() {
  const { t, formatDate } = useI18n();
  const { user, loading: authLoading, connectionError } = useAuth();
  const { navigate } = useRoute();
  const [orders, setOrders] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [draftLoadError, setDraftLoadError] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (authLoading || connectionError) return;
    if (!user) {
      navigate("/login");
      return;
    }
    let cancelled = false;
    setOrders(null);
    setDrafts([]);
    setDraftLoadError(false);
    api.continuations().then(items => {if (!cancelled) setDrafts(items);})
      .catch(() => {if (!cancelled) setDraftLoadError(true);});
    setError(null);
    collectOrderPages(api.myOrders, {}, () => !cancelled)
      .then((rows) => !cancelled && setOrders(rows))
      .catch((err) => !cancelled && setError(errorText(t, err.code)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, connectionError, user]);

  const presentStatuses = useMemo(
    () => ALL_STATUSES.filter((s) => (orders || []).some((o) => o.status === s)),
    [orders]
  );
  const results = useMemo(
    () => (orders || []).filter((o) => filter === "all" || o.status === filter),
    [orders, filter]
  );

  if (authLoading || (!user && !error)) return null;

  return (
    <div className="page">
      <BackButton fallback="/" />
      <div className="workspace-heading between">
        <div>
          <h2>{t("myorders_title")}</h2>
        </div>
      </div>

      {error && (
        <div className="notice" role="alert">
          {error}
        </div>
      )}

      {draftLoadError && <p className="small" role="status">{t("draft_list_failed")}</p>}
      {drafts.length > 0 && <section className="card pad stack draft-list">
        <h3>{t("draft_list")}</h3>
        {drafts.map(draft => <Link key={draft.workshopId} to={"/order/" + draft.workshopId} className="activity-link row between wrap">
          <span><strong>{draft.workshopName}</strong> · {t("design_group_total", {count:draft.units})}</span>
          <span>{t("draft_continue")} →</span>
        </Link>)}
      </section>}
      {orders === null && !error && <p className="small">{t("common_loading")}</p>}

      {orders !== null && (
        <>
          <div className="row wrap" style={{ marginBottom: 18 }}>
            <button className={`chip ${filter === "all" ? "blue" : ""}`} onClick={() => setFilter("all")} type="button">
              {t("myorders_filter_all")} ({orders.length})
            </button>
            {presentStatuses.map((s) => (
              <button
                key={s}
                className={`chip ${filter === s ? "blue" : ""}`}
                onClick={() => setFilter(s)}
                type="button"
              >
                {t(`status_${s}`)} ({orders.filter((o) => o.status === s).length})
              </button>
            ))}
          </div>

          {results.length === 0 ? (
            <div className="empty">
              <strong>{t("myorders_empty")}</strong>
            </div>
          ) : (
            <div className="stack">
              {results.map((order) => {
                const payment = orderPayment(order);
                return (
                  <article className="card my-order-card" key={order.id}>
                    <Link to={`/orders/${order.id}`} className="activity-link">
                      <div className="between">
                        <div>
                          <strong>{order.title}</strong>
                          <div className="small">{order.workshop.name} · {order.id}</div>
                        </div>
                        <StatusChip status={order.status} t={t} />
                      </div>
                      <span className="small">{formatDate(order.updatedAt)}</span>
                    </Link>
                    {(payment.url || payment.message) && (
                      <div className="my-order-payment">
                        {payment.url
                          ? <a className="btn primary small" href={payment.url} target="_blank" rel="noopener noreferrer">
                              <ClassicIcon name="card" />{t("order_pay")} →
                            </a>
                          : <p className="small">{t(payment.message)}</p>}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
