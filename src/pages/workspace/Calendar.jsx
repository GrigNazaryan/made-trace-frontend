import ClassicIcon from "../../components/ClassicIcon.jsx";
import { useEffect, useRef, useState } from "react";
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

function CalendarOrder({ entry, t, compact = false, onOpen }) {
  const { order, fields } = entry;
  return <Link to={`/workspace/orders/${order.id}`} onClick={onOpen}
    className={`calendar-order${compact ? " compact" : ""}`}>
    <span className="calendar-order-label">
      <strong>{order.id}</strong><span>{order.title}</span>
    </span>
    {compact
      ? <span className={`calendar-order-dot ${order.status}`} aria-hidden="true" />
      : <><span className={`badge ${order.status}`}>{t("status_" + order.status)}</span>
        <span className="small calendar-order-dates">{fields.map(key => t(labels[key])).join(" · ")}</span></>}
  </Link>;
}

export default function Calendar() {
  const { t, formatDate } = useI18n();
  const [date, setDate] = useState(today);
  const [view, setView] = useState("month");
  const [openOnly, setOpenOnly] = useState(true);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [activeDay, setActiveDay] = useState(null);
  const dialog = useRef(null);
  const opener = useRef(null);
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
  const capacity = view === "month" ? 2 : 3;
  const dateLabel = day => formatDate(day, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

  function openDay(day, target) {
    opener.current = target;
    setActiveDay(day);
    if (!dialog.current.open) dialog.current.showModal();
  }

  function closeDay() {
    dialog.current.close();
  }

  return (
    <WorkspaceLayout section="calendar">
      <h2>{t("calendar_title")}</h2>
      <div className="row wrap" style={{ margin: "18px 0" }}>
        <button type="button" className="btn secondary small" onClick={() => move(-1)} aria-label={t("calendar_previous")}>←</button>
        <button type="button" className="btn secondary small" onClick={() => setDate(today())}>{t("calendar_today")}</button>
        <button type="button" className="btn secondary small" onClick={() => move(1)} aria-label={t("calendar_next")}>→</button>
        <input type="date" className="control" style={{ width: "auto" }} aria-label={t("calendar_date")}
          value={date} onChange={event => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) setDate(event.target.value); }} />
        <div className="calendar-view-options" role="group" aria-label={t("calendar_view")}>
          {["month", "week", "day"].map(mode => <button className="btn secondary small" type="button" key={mode}
            aria-pressed={view === mode} onClick={() => setView(mode)}>{t("calendar_" + mode)}</button>)}
        </div>
        <label className="check-row"><input type="checkbox" checked={openOnly} onChange={event => setOpenOnly(event.target.checked)} />{t("calendar_open")}</label>
      </div>
      {error && <p role="alert" className="notice">{errorText(t, error)}</p>}
      {!orders && !error && <p className="small">{t("common_loading")}</p>}
      {orders && <div className={`workshop-calendar calendar-${view}`}>
        {[...days].map(([day, jobs]) => {
          const remaining = Math.max(0, jobs.length - capacity);
          return <section className="card calendar-cell" key={day}
            onDoubleClick={event => {
              if (view !== "day" && !event.target.closest("a, button")) {
                openDay(day, event.currentTarget.querySelector(".calendar-date-label"));
              }
            }}>
            {view === "day" ? <h3>{dateLabel(day)}</h3> :
              <button type="button" className="calendar-date-label" aria-haspopup="dialog"
                aria-label={t("calendar_open_date", {date:dateLabel(day)})}
                onClick={event => openDay(day, event.currentTarget)}>{dateLabel(day)}</button>}
            <div className="calendar-cell-orders">
              {(view === "day" ? jobs : jobs.slice(0, capacity)).map(entry =>
                <CalendarOrder key={entry.order.id} entry={entry} t={t} compact={view !== "day"} />)}
              {view === "day" && jobs.length === 0 && <p className="small">{t("calendar_day_empty")}</p>}
            </div>
            {view !== "day" && remaining > 0 &&
              <button type="button" className="calendar-more" aria-haspopup="dialog"
                onClick={event => openDay(day, event.currentTarget)}>{t("calendar_more_jobs", {count:remaining})}</button>}
          </section>;
        })}
      </div>}
      <dialog ref={dialog} className="calendar-dialog" aria-labelledby="calendar-dialog-title"
        onClose={() => { setActiveDay(null); opener.current?.focus({preventScroll:true}); }}
        onClick={event => { if (event.target === dialog.current) closeDay(); }}>
        <div className="calendar-dialog-inner">
          <header className="between">
            <div><span className="eyebrow"><ClassicIcon name="calendar" />{t("calendar_title")}</span>
              <h3 id="calendar-dialog-title">{activeDay && dateLabel(activeDay)}</h3></div>
            <button type="button" className="btn secondary small" autoFocus onClick={closeDay}>{t("common_close")}</button>
          </header>
          <div className="calendar-dialog-list">
            {(days.get(activeDay) || []).map(entry =>
              <CalendarOrder key={entry.order.id} entry={entry} t={t} onOpen={closeDay} />)}
            {!days.get(activeDay)?.length && <p className="small">{t("calendar_day_empty")}</p>}
          </div>
        </div>
      </dialog>
    </WorkspaceLayout>
  );
}
