import { useEffect, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { Link } from "../../router/HashRouter.jsx";
import { api } from "../../lib/api.js";
import WorkspaceLayout from "./WorkspaceLayout.jsx";

const OPEN_STATUSES = ["request", "clarification", "quoted", "approved", "proof", "production"];

export default function Overview() {
  const { t } = useI18n();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.workspaceOrders({}).then(setOrders).catch((err) => setError(errorText(t, err.code)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (orders || []).filter((o) => OPEN_STATUSES.includes(o.status));

  return (
    <WorkspaceLayout section="overview">
      <h2>{t("ws_overview_title")}</h2>
      <p className="small">{t("ws_overview_lead")}</p>

      {error && <div className="notice" role="alert" style={{ marginTop: 14 }}>{error}</div>}

      <section className="card pad" style={{ marginTop: 18, maxWidth: 320 }}>
        <span className="eyebrow">{t("ws_overview_open_orders")}</span>
        <p style={{ fontSize: 32, fontWeight: 700, margin: "8px 0" }}>{orders === null ? "—" : open.length}</p>
        <Link to="/workspace/orders" className="btn secondary small">
          {t("ws_overview_go_orders")}
        </Link>
      </section>
    </WorkspaceLayout>
  );
}
