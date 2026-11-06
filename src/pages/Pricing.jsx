import { useEffect, useState } from "react";
import { useI18n, errorText } from "../lib/i18n/index.jsx";
import { Link, BackButton } from "../router/HashRouter.jsx";
import { api } from "../lib/api.js";

export default function Pricing() {
  const { t, formatMoney } = useI18n();
  const [plans, setPlans] = useState(null);
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .billingPlans()
      .then((data) => { setPlans(data.plans); setCurrency(data.currency); })
      .catch((err) => setError(errorText(t, err.code)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byId = (id) => (plans || []).find((p) => p.id === id);

  return (
    <div className="page">
      <BackButton fallback="/" />
      <div className="center section-head">
        <span className="eyebrow">{t("nav_pricing")}</span>
        <h1 style={{ marginTop: 12 }}>{t("pricing_title")}</h1>
        <p>{t("pricing_lead")}</p>
      </div>

      {error && <div className="notice" role="alert">{error}</div>}
      {!plans && !error && <p className="small">{t("common_loading")}</p>}

      {plans && (
        <div className="plan-grid">
          <div className="card plan-card">
            <div className="plan-card-header">
              <span className="eyebrow">{t("pricing_core_name")}</span>
              <h2>{formatMoney(byId("core")?.price ?? 0, currency)}<span className="small">{t("pricing_per_month")}</span></h2>
              <p>{t("pricing_core_body")}</p>
            </div>
            <div className="plan-card-action">
              <Link to="/register" className="btn secondary block">{t("pricing_cta")}</Link>
            </div>
          </div>
          <div className="card plan-card growth-plan">
            <div className="plan-card-header">
              <span className="eyebrow">{t("pricing_growth_name")}</span>
              <h2>{formatMoney(byId("growth")?.price ?? 0, currency)}<span className="small">{t("pricing_per_month")}</span></h2>
              <p>{t("pricing_growth_body")}</p>
            </div>
            <div className="plan-card-action">
              <Link to="/register" className="btn primary block">{t("pricing_cta")}</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
