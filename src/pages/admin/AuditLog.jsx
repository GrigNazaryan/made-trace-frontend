import { useEffect, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { api } from "../../lib/api.js";
import AdminLayout from "./AdminLayout.jsx";

export default function AuditLog() {
  const { t, formatDate } = useI18n();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.adminAuditLog({ limit: 200 }).then(setRows).catch((err) => setError(errorText(t, err.code)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminLayout section="audit-log">
      <h2>{t("admin_audit_title")}</h2>

      {error && <div className="notice" role="alert" style={{ marginTop: 14 }}>{error}</div>}
      {rows === null && !error && <p className="small" style={{ marginTop: 14 }}>{t("common_loading")}</p>}

      {rows !== null && (
        <div className="table-scroll" style={{ marginTop: 14 }}>
          <table className="order-table">
            <thead>
              <tr>
                <th>{t("admin_col_when")}</th>
                <th>{t("admin_col_action")}</th>
                <th>{t("admin_col_admin")}</th>
                <th>{t("admin_col_detail")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.createdAt, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td>{r.action}</td>
                  <td>{r.adminId}</td>
                  <td className="small">{r.detail || "—"}{r.method ? ` · ${r.method} ${r.path}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
