import { useEffect, useRef, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { Link } from "../../router/HashRouter.jsx";
import { api } from "../../lib/api.js";
import WorkspaceLayout from "./WorkspaceLayout.jsx";

const STATUSES = [
  "request", "clarification", "quoted", "approved", "proof",
  "production", "ready", "completed", "waiting", "delayed", "cancelled",
];

export default function Orders() {
  const { t, formatDate } = useI18n();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const generation = useRef(0);
  const pageSize = 50;

  async function load(before) {
    const current = ++generation.current;
    setError(null);
    if (before) setLoadingMore(true);
    try {
      const rows = await api.workspaceOrders({ status, q: search, before, limit: pageSize });
      if (generation.current !== current) return;
      setOrders(previous => before ? [...previous, ...rows] : rows);
      setMore(rows.length === pageSize);
    } catch (error) {
      if (generation.current === current) setError(errorText(t, error.code));
    } finally {
      if (generation.current === current) setLoadingMore(false);
    }
  }

  useEffect(() => {
    setOrders(null);
    setMore(false);
    load();
    return () => { generation.current++; };
  }, [status, search]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WorkspaceLayout section="orders">
      <h2>{t("ws_orders_title")}</h2>

      <form className="card workspace-order-filters" onSubmit={event => { event.preventDefault(); setSearch(q.trim()); }}>
        <input
          className="control"
          type="search"
          aria-label={t("ws_orders_search")}
          placeholder={t("ws_orders_search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn secondary" type="submit">{t("classic_search")}</button>
        <select className="control" aria-label={t("studio_order_filter")} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t("myorders_filter_all")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`status_${s}`)}</option>
          ))}
        </select>
      </form>

      {error && <div className="notice" role="alert">{error}</div>}
      {orders === null && !error && <p className="small">{t("common_loading")}</p>}

      {orders !== null && (
        orders.length === 0 ? (
          <div className="empty"><strong>{t("ws_orders_empty")}</strong></div>
        ) : (
          <div className="table-scroll">
            <table className="order-table workspace-order-table">
              <thead>
                <tr>
                  <th>{t("order_lines_title")}</th>
                  <th>{t("studio_customer")}</th>
                  <th>{t("studio_order_filter")}</th>
                  <th>{t("ws_order_schedule_due")}</th>
                  <th>{t("studio_updated")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link className="workspace-order-link" to={`/workspace/orders/${o.id}`}>
                        <span className="small mono">{o.id}</span><strong>{o.title}</strong>
                      </Link>
                    </td>
                    <td data-label={t("studio_customer")}>{o.customer.name}</td>
                    <td data-label={t("studio_order_filter")}><span className={`badge ${o.status}`}>{t(`status_${o.status}`)}</span></td>
                    <td data-label={t("ws_order_schedule_due")}>{o.schedule?.productionDue
                      ? formatDate(o.schedule.productionDue, { dateStyle: "medium", timeZone: "UTC" }) : "—"}</td>
                    <td data-label={t("studio_updated")}>{formatDate(o.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      {orders?.length > 0 && more && (
        <button type="button" className="btn secondary" style={{ marginTop: 14 }}
          disabled={loadingMore} onClick={() => load(orders.at(-1).id)}>
          {t(loadingMore ? "common_loading" : "orders_load_more")}
        </button>
      )}
    </WorkspaceLayout>
  );
}
