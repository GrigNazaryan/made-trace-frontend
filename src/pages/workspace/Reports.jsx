import { useEffect, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { api } from "../../lib/api.js";
import WorkspaceLayout from "./WorkspaceLayout.jsx";

export default function Reports() {
  const { t, formatMoney } = useI18n();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.reports().then(setData).catch((err) => setError(errorText(t, err.code)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WorkspaceLayout section="reports">
      <h2>{t("ws_reports_title")}</h2>
      {error && <div className="notice" role="alert" style={{ marginTop: 14 }}>{error}</div>}
      {!data && !error && <p className="small" style={{ marginTop: 14 }}>{t("common_loading")}</p>}
      {data && (
        <>
          <div className="row wrap" style={{ marginTop: 18, gap: 16 }}>
            <div className="card pad" style={{ minWidth: 180 }}>
              <span className="eyebrow">{t("ws_reports_total_orders")}</span>
              <p style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 0" }}>{data.totalOrders}</p>
            </div>
            <div className="card pad" style={{ minWidth: 180 }}>
              <span className="eyebrow">{t("ws_reports_completed_revenue")}</span>
              <p style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 0" }}>{formatMoney(data.completedRevenue, data.currency)}</p>
            </div>
            <div className="card pad" style={{ minWidth: 180 }}>
              <span className="eyebrow">{t("ws_reports_completed_units")}</span>
              <p style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 0" }}>{data.completedUnits}</p>
            </div>
          </div>
          <section className="card pad" style={{ marginTop: 18 }}>
            <h3>{t("ws_reports_by_status")}</h3>
            <div className="stack" style={{ marginTop: 10 }}>
              {Object.entries(data.byStatus).map(([status, count]) => (
                <div key={status} className="row between">
                  <span className={`badge ${status}`}>{t(`status_${status}`)}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </WorkspaceLayout>
  );
}
