import { useEffect, useState } from "react";
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

  function load() {
    api
      .workspaceOrders({ status: status || undefined, q: q || undefined })
      .then(setOrders)
      .catch((err) => setError(errorText(t, err.code)));
  }

  useEffect(load, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WorkspaceLayout section="orders">
      <h2>{t("ws_orders_title")}</h2>

      <div className="row wrap" style={{ margin: "18px 0" }}>
        <input
          className="control"
          placeholder={t("ws_orders_search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          style={{ maxWidth: 320 }}
        />
        <button className="btn secondary small" onClick={load} type="button">
          ⌕
        </button>
        <select className="control" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">{t("myorders_filter_all")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`status_${s}`)}</option>
          ))}
        </select>
      </div>

      {error && <div className="notice" role="alert">{error}</div>}
      {orders === null && !error && <p className="small">{t("common_loading")}</p>}

      {orders !== null && (
        orders.length === 0 ? (
          <div className="empty"><strong>{t("ws_orders_empty")}</strong></div>
        ) : (
          <div className="table-scroll">
            <table className="order-table">
              <thead>
                <tr>
                  <th>{t("order_lines_title")}</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/workspace/orders/${o.id}`}>
                        <strong>{o.id}</strong> · {o.title}
                      </Link>
                    </td>
                    <td>{o.customer.name}</td>
                    <td><span className={`badge ${o.status}`}>{t(`status_${o.status}`)}</span></td>
                    <td>{formatDate(o.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </WorkspaceLayout>
  );
}
