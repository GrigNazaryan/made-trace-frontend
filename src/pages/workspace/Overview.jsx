import { collectOrderPages } from "../../lib/orderPages.js";
import { useEffect, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { Link } from "../../router/HashRouter.jsx";
import { api } from "../../lib/api.js";
import WorkspaceLayout from "./WorkspaceLayout.jsx";

const CLOSED = ["completed", "cancelled"];
const ACTION = {
  request: "action_review_request", clarification: "action_review_request", quoted: "action_wait_quote",
  approved: "action_plan_order", proof: "action_wait_proof", production: "action_track_production",
  ready: "action_fulfill_order", waiting: "status_waiting", delayed: "status_delayed",
};

function due(order) {
  return order.schedule?.productionDue || order.schedule?.promisedDate || "";
}

export default function Overview() {
  const { t, formatDate } = useI18n();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    collectOrderPages(api.workspaceOrders, {}, () => active)
      .then(value => { if (active) setOrders(value); })
      .catch(err => { if (active) setError(errorText(t, err.code)); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (orders || []).filter(order => !CLOSED.includes(order.status));
  const queue = [...open].sort((a, b) =>
    Number(Boolean(b.unread)) - Number(Boolean(a.unread))
    || (due(a) || "9999").localeCompare(due(b) || "9999")
  );

  return (
    <WorkspaceLayout section="overview">
      <h2>{t("ws_overview_title")}</h2>
      <p className="small">{t("ws_overview_lead")}</p>

      {error && <div className="notice" role="alert" style={{ marginTop: 14 }}>{error}</div>}

      {orders && <section className="card pad" style={{ marginTop: 18 }}>
        <div className="between">
          <h3>{t("action_queue")}</h3>
          <Link to="/workspace/calendar" className="btn secondary small">{t("calendar_title")}</Link>
        </div>
        {!queue.length && <p className="small">{t("ws_orders_empty")}</p>}
        {queue.slice(0, 12).map(order => (
          <Link key={order.id} to={`/workspace/orders/${order.id}`} className="activity-link">
            <strong>{order.id} · {order.title}</strong>
            <span className="small">{t(order.unread ? "action_read_messages" : ACTION[order.status] || "action_review_request")}
              {due(order) ? " · " + formatDate(due(order) + "T00:00:00Z", { dateStyle: "medium", timeZone: "UTC" }) : ""}
            </span>
          </Link>
        ))}
      </section>}

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
