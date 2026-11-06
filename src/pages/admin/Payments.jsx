import { useEffect, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { api } from "../../lib/api.js";
import AdminLayout from "./AdminLayout.jsx";

export default function Payments() {
  const { t, formatDate, formatMoney } = useI18n();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("submitted");
  const [busyId, setBusyId] = useState(null);

  function load() {
    api.adminPayments({ status: status || undefined }).then(setRows).catch((err) => setError(errorText(t, err.code)));
  }

  useEffect(load, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(id, fn) {
    setBusyId(id);
    try {
      await fn(id);
      setRows((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminLayout section="payments">
      <h2>{t("admin_payments_title")}</h2>

      <div className="row wrap" style={{ margin: "18px 0" }}>
        <select className="control" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">{t("admin_all")}</option>
          <option value="pending">pending</option>
          <option value="submitted">submitted</option>
          <option value="confirmed">confirmed</option>
          <option value="rejected">rejected</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>

      {error && <div className="notice" role="alert">{error}</div>}
      {rows === null && !error && <p className="small">{t("common_loading")}</p>}

      {rows !== null && (
        rows.length === 0 ? (
          <div className="empty"><strong>{t("admin_payments_empty")}</strong></div>
        ) : (
          <div className="table-scroll">
            <table className="order-table">
              <thead>
                <tr>
                  <th>{t("admin_col_workshop")}</th>
                  <th>{t("admin_col_reference")}</th>
                  <th>{t("admin_col_amount")}</th>
                  <th>{t("admin_col_status")}</th>
                  <th>{t("admin_col_submitted")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.workshopName}</td>
                    <td>{p.reference}</td>
                    <td>{formatMoney(p.amount, p.currency)} · {p.plan} × {p.months}mo</td>
                    <td><span className="badge quoted">{p.status}</span></td>
                    <td>{formatDate(p.submittedAt)}</td>
                    <td>
                      {(p.status === "pending" || p.status === "submitted") && (
                        <div className="row wrap" style={{ gap: 6 }}>
                          <button className="btn primary small" disabled={busyId === p.id} onClick={() => act(p.id, api.adminConfirmPayment)}>
                            {t("admin_action_confirm")}
                          </button>
                          <button className="btn danger small" disabled={busyId === p.id} onClick={() => act(p.id, api.adminRejectPayment)}>
                            {t("admin_action_reject")}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </AdminLayout>
  );
}
