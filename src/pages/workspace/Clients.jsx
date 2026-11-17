import { Link } from "../../router/HashRouter.jsx";
import { collectOrderPages } from "../../lib/orderPages.js";
import { useEffect, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { api } from "../../lib/api.js";
import WorkspaceLayout from "./WorkspaceLayout.jsx";

export default function Clients() {
  const { t, formatDate, formatMoney } = useI18n();
  const [client, setClient] = useState(null);
  const [history, setHistory] = useState(null);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.clients().then(setRows).catch((err) => setError(errorText(t, err.code)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!client) return;
    let active = true;
    setHistory(null);
    setError(null);
    collectOrderPages(params => api.clientOrders(client.id, params), {}, () => active)
      .then(result => { if (active) setHistory(result); })
      .catch(err => { if (active) setError(errorText(t, err.code)); });
    return () => { active = false; };
  }, [client, t]);

  return (
    <WorkspaceLayout section="clients">
      <h2>{t("ws_clients_title")}</h2>
      {error && <div className="notice" role="alert" style={{ marginTop: 14 }}>{error}</div>}
      {rows === null && !error && <p className="small" style={{ marginTop: 14 }}>{t("common_loading")}</p>}
      {client && <section className="card pad stack">
        <div className="row between"><h3>{client.name}</h3><button className="btn secondary" type="button" onClick={() => setClient(null)}>{t("client_back")}</button></div>
        <p>{client.email}</p>
        {!history && !error && <p>{t("common_loading")}</p>}
        {history?.map(order => <article className="row between wrap" key={order.id}>
          <Link to={"/workspace/orders/" + order.id}><strong>{order.id}</strong> · {order.title}</Link>
          <span>{t("status_" + order.status)}</span>
          <span>{t("ws_order_schedule_due")}: {order.schedule?.productionDue || "—"}</span>
          <span>{t("ws_order_schedule_promised")}: {order.schedule?.promisedDate || "—"}</span>
        </article>)}
      </section>}
      {!client && rows !== null && (
        rows.length === 0 ? (
          <div className="empty" style={{ marginTop: 14 }}><strong>{t("ws_clients_empty")}</strong></div>
        ) : (
          <div className="table-scroll" style={{ marginTop: 14 }}>
            <table className="order-table">
              <thead>
                <tr>
                  <th>{t("ws_col_client")}</th>
                  <th>{t("ws_col_orders")}</th>
                  <th>{t("ws_col_total")}</th>
                  <th>{t("ws_col_last_order")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={c.email || i}>
                    <td><button type="button" className="btn secondary small" onClick={() => setClient(c)}>{c.name}</button><div className="small">{c.email}</div></td>
                    <td>{c.orders}</td>
                    <td>{formatMoney(c.totalEstimate, c.currency)}</td>
                    <td>{c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}</td>
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
