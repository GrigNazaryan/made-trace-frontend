import { useEffect, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useRoute } from "../../router/HashRouter.jsx";
import { api } from "../../lib/api.js";
import AdminLayout from "./AdminLayout.jsx";

export default function Workshops() {
  const { t, formatDate } = useI18n();
  const { impersonateAs } = useAuth();
  const { navigate } = useRoute();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [busyId, setBusyId] = useState(null);

  function load() {
    api
      .adminWorkshops({ q: q || undefined, status: status || undefined, plan: plan || undefined, blocked: blockedOnly ? true : undefined })
      .then(setRows)
      .catch((err) => setError(errorText(t, err.code)));
  }

  useEffect(load, [status, plan, blockedOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(id, fn) {
    setBusyId(id);
    try {
      const updated = await fn();
      setRows((prev) => prev.map((w) => (w.id === id ? updated : w)));
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusyId(null);
    }
  }

  async function onImpersonate(id, readOnly) {
    setBusyId(id);
    try {
      const { accessToken, readOnly: ro } = await api.adminImpersonate(id, readOnly);
      await impersonateAs(accessToken, ro);
      navigate("/workspace/overview");
    } catch (err) {
      setError(errorText(t, err.code));
      setBusyId(null);
    }
  }

  return (
    <AdminLayout section="workshops">
      <h2>{t("admin_workshops_title")}</h2>

      <div className="row wrap" style={{ margin: "18px 0" }}>
        <input
          className="control"
          placeholder={t("admin_search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          style={{ maxWidth: 240 }}
        />
        <select className="control" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">{t("admin_filter_status")}</option>
          <option value="trial">trial</option>
          <option value="active">active</option>
          <option value="expired">expired</option>
        </select>
        <select className="control" value={plan} onChange={(e) => setPlan(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">{t("admin_filter_plan")}</option>
          <option value="core">Core</option>
          <option value="growth">Growth</option>
        </select>
        <label className="check-row">
          <input type="checkbox" checked={blockedOnly} onChange={(e) => setBlockedOnly(e.target.checked)} />
          <span>{t("admin_filter_blocked")}</span>
        </label>
      </div>

      {error && <div className="notice" role="alert">{error}</div>}
      {rows === null && !error && <p className="small">{t("common_loading")}</p>}

      {rows !== null && (
        <div className="table-scroll">
          <table className="order-table">
            <thead>
              <tr>
                <th>{t("admin_col_name")}</th>
                <th>{t("admin_col_plan")}</th>
                <th>{t("admin_col_status")}</th>
                <th>{t("admin_col_expires")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id}>
                  <td>
                    <strong>{w.name}</strong>
                    <div className="small">{w.city}, {w.country} · {w.ownerEmail}</div>
                  </td>
                  <td>{w.effectivePlan}{w.isBlocked ? " · blocked" : ""}</td>
                  <td><span className={`badge ${w.subscriptionStatus === "active" ? "ready" : w.subscriptionStatus === "trial" ? "quoted" : "cancelled"}`}>{w.subscriptionStatus}</span></td>
                  <td>{formatDate(w.subscriptionExpiresAt)}</td>
                  <td>
                    <div className="row wrap" style={{ gap: 6 }}>
                      <button className="btn secondary small" disabled={busyId === w.id} onClick={() => onImpersonate(w.id, true)}>
                        {t("admin_action_impersonate")}
                      </button>
                      <button className="btn soft small" disabled={busyId === w.id} onClick={() => onImpersonate(w.id, false)}>
                        {t("admin_action_impersonate_rw")}
                      </button>
                      <button className="btn secondary small" disabled={busyId === w.id} onClick={() => run(w.id, () => api.adminGrantTrial(w.id))}>
                        {t("admin_action_trial")}
                      </button>
                      {w.isBlocked ? (
                        <button className="btn secondary small" disabled={busyId === w.id} onClick={() => run(w.id, () => api.adminUnblock(w.id))}>
                          {t("admin_action_unblock")}
                        </button>
                      ) : (
                        <button className="btn danger small" disabled={busyId === w.id} onClick={() => run(w.id, () => api.adminBlock(w.id))}>
                          {t("admin_action_block")}
                        </button>
                      )}
                      <button className="btn secondary small" disabled={busyId === w.id} onClick={() => run(w.id, () => api.adminSetPlan(w.id, "core"))}>
                        {t("admin_action_set_core")}
                      </button>
                      <button className="btn secondary small" disabled={busyId === w.id} onClick={() => run(w.id, () => api.adminSetPlan(w.id, "growth"))}>
                        {t("admin_action_set_growth")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
