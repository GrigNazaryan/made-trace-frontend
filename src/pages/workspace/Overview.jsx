import ClassicIcon from "../../components/ClassicIcon.jsx";
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
  const [filter, setFilter] = useState("all");
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
  const now = new Date();
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0,10);
  const upcoming = open.filter(order => order.schedule?.productionStart >= today)
    .sort((a, b) => a.schedule.productionStart.localeCompare(b.schedule.productionStart)).slice(0, 5);
  const categories = {
    requests: open.filter(order => order.status === "request"),
    overdue: open.filter(order => due(order) && due(order) < today),
    approval: open.filter(order => ["quoted", "proof", "clarification"].includes(order.status)),
    unread: open.filter(order => order.unread),
  };
  const queue = [...(categories[filter] || open)].sort((a, b) =>
    Number(Boolean(b.unread)) - Number(Boolean(a.unread))
    || (due(a) || "9999").localeCompare(due(b) || "9999")
  );

  return (
    <WorkspaceLayout section="overview">
      <h2>{t("ws_overview_title")}</h2>
      <p className="small">{t("ws_overview_lead")}</p>

      {error && <div className="notice" role="alert" style={{ marginTop: 14 }}>{error}</div>}

      {orders && <div className="overview-priorities" role="group" aria-label={t("action_queue")}>
        {[["requests", "status_request", "box"], ["overdue", "dashboard_overdue", "calendar"],
          ["approval", "dashboard_approval", "review"], ["unread", "dashboard_unread", "track"]].map(([key, label, icon]) => (
          <button key={key} type="button" className="card overview-priority"
            aria-pressed={filter === key} onClick={() => setFilter(filter === key ? "all" : key)}>
            <span className="feature-icon"><ClassicIcon name={icon} /></span>
            <strong>{categories[key].length}</strong>
            <span>{t(label)}</span>
          </button>
        ))}
      </div>}
      {orders && <section className="card pad" style={{ marginTop: 18 }}>
        <div className="between">
          <h3>{t("action_queue")}</h3>
          <Link to="/workspace/calendar" className="btn secondary small">{t("calendar_title")}</Link>
        </div>
        {filter !== "all" && <div className="overview-filters">
          <button className="btn secondary small" type="button" onClick={() => setFilter("all")}>
            {t("myorders_filter_all")} · {open.length}
          </button>
        </div>}
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

      {orders && <section className="card pad upcoming-production">
        <div className="between wrap">
          <h3>{t("studio_upcoming")}</h3>
          <Link to="/workspace/calendar" className="btn secondary small">{t("calendar_title")}</Link>
        </div>
        {upcoming.length === 0 && <p className="small">{t("studio_no_upcoming")}</p>}
        {upcoming.map(order => <Link className="activity-link" key={order.id} to={`/workspace/orders/${order.id}`}>
          <strong>{order.id} · {order.title}</strong>
          <span className="small">{formatDate(order.schedule.productionStart, {dateStyle:"medium", timeZone:"UTC"})}</span>
        </Link>)}
      </section>}
    </WorkspaceLayout>
  );
}
