import { useEffect, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { api } from "../../lib/api.js";
import WorkspaceLayout from "./WorkspaceLayout.jsx";

export default function Clients() {
  const { t, formatDate, formatMoney } = useI18n();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.clients().then(setRows).catch((err) => setError(errorText(t, err.code)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WorkspaceLayout section="clients">
      <h2>{t("ws_clients_title")}</h2>
      {error && <div className="notice" role="alert" style={{ marginTop: 14 }}>{error}</div>}
      {rows === null && !error && <p className="small" style={{ marginTop: 14 }}>{t("common_loading")}</p>}
      {rows !== null && (
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
                    <td><strong>{c.name}</strong><div className="small">{c.email}</div></td>
                    <td>{c.orders}</td>
                    <td>{formatMoney(c.totalEstimate)}</td>
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
