import { useEffect, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { Link } from "../../router/HashRouter.jsx";
import { api } from "../../lib/api.js";
import { collectOrderPages } from "../../lib/orderPages.js";
import { calendarDates, calendarJobs } from "../../lib/calendar.js";
import WorkspaceLayout from "./WorkspaceLayout.jsx";

const labels = {
  productionStart: "ws_order_schedule_start",
  productionDue: "ws_order_schedule_due",
  estimatedDate: "ws_order_schedule_estimated",
  promisedDate: "ws_order_schedule_promised",
};

function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export default function Calendar() {
  const { t, formatDate } = useI18n();
  const [date, setDate] = useState(today);
  const [view, setView] = useState("month");
  const [openOnly, setOpenOnly] = useState(true);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const dates = calendarDates(date, view);
  const start = dates[0];
  const end = dates.at(-1);

  useEffect(() => {
    let active = true;
    setOrders(null);
    setError(null);
    collectOrderPages(api.workspaceOrders, { calendarStart: start, calendarEnd: end }, () => active)
      .then(value => { if (active) setOrders(value); })
      .catch(err => { if (active) setError(err.code || "network_error"); });
    return () => { active = false; };
  }, [start, end]);

  function move(direction) {
    const next = new Date(date + "T00:00:00Z");
    if (view === "month") {
      next.setUTCDate(1);
      next.setUTCMonth(next.getUTCMonth() + direction);
    } else next.setUTCDate(next.getUTCDate() + direction * (view === "week" ? 7 : 1));
    setDate(next.toISOString().slice(0, 10));
  }

  const visible = (orders || []).filter(order => !openOnly || !["completed", "cancelled"].includes(order.status));
  const days = calendarJobs(visible, dates);
  return (
    <WorkspaceLayout section="calendar">
      <h2>{t("calendar_title")}</h2>
      <div className="row wrap" style={{ margin: "18px 0" }}>
        <button type="button" className="btn secondary small" onClick={() => move(-1)} aria-label={t("calendar_previous")}>←</button>
        <button type="button" className="btn secondary small" onClick={() => setDate(today())}>{t("calendar_today")}</button>
        <button type="button" className="btn secondary small" onClick={() => move(1)} aria-label={t("calendar_next")}>→</button>
        <input type="date" className="control" style={{ width: "auto" }} aria-label={t("calendar_date")}
          value={date} onChange={event => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) setDate(event.target.value); }} />
        <select className="control" style={{ width: "auto" }} aria-label={t("calendar_view")}
          value={view} onChange={event => setView(event.target.value)}>
          {["month", "week", "day"].map(mode => <option key={mode} value={mode}>{t("calendar_" + mode)}</option>)}
        </select>
        <label className="check-row"><input type="checkbox" checked={openOnly} onChange={event => setOpenOnly(event.target.checked)} />{t("calendar_open")}</label>
      </div>
      {error && <p role="alert" className="notice">{errorText(t, error)}</p>}
      {!orders && !error && <p className="small">{t("common_loading")}</p>}
      {orders && <div className={view === "day" ? "workshop-calendar single" : "workshop-calendar"}>
        {[...days].map(([day, jobs]) => (
          <section className="card calendar-cell" key={day}>
            <strong>{formatDate(day + "T00:00:00Z", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}</strong>
            {jobs.map(({ order, fields }) => (
              <Link key={order.id} to={`/workspace/orders/${order.id}`} className="calendar-job">
                <strong>{order.id}</strong> · {order.title}
                <span>{fields.map(key => t(labels[key])).join(" · ")}</span>
              </Link>
            ))}
          </section>
        ))}
      </div>}
    </WorkspaceLayout>
  );
}
