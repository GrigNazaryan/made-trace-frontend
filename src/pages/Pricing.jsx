import { useAuth } from "../lib/AuthContext.jsx";
import { useEffect, useState } from "react";
import { useI18n, errorText } from "../lib/i18n/index.jsx";
import { Link, BackButton } from "../router/HashRouter.jsx";
import { api } from "../lib/api.js";

const features = [
  ["compare_orders"], ["compare_approvals"], ["compare_production"], ["compare_catalog"],
  ["compare_portal"], ["compare_directory"], ["compare_reports"],
  ["compare_bulk", "growth"], ["compare_sponsored", "planned"], ["compare_branding", "planned"], ["compare_reminders", "planned"],
  ["compare_analytics", "planned"],
];

export default function Pricing() {
  const { user, loading, connectionError } = useAuth();
  const destination = user?.role === "company_owner" ? "/workspace/billing"
    : user?.role === "admin" ? "/admin/workshops" : user ? "/my-orders" : "/register";
  const destinationLabel = user?.role === "company_owner" ? "ws_nav_billing"
    : user?.role === "admin" ? "nav_admin" : user ? "nav_my_orders" : "pricing_cta";
  const { t, formatMoney } = useI18n();
  const [billing, setBilling] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api.billingPlans().then(data => { if (active) setBilling(data); })
      .catch(err => { if (active) setError(err.code || "network_error"); });
    return () => { active = false; };
  }, []);

  return (
    <div className="page classic-pricing">
      <BackButton fallback="/" />
      <div className="center section-head">
        <span className="eyebrow">{t("nav_pricing")}</span>
        <h1>{t("compare_title")}</h1>
        <p>{t("compare_intro")}</p>
      </div>

      {error && <div className="notice" role="alert">{errorText(t, error)}</div>}
      {!billing && !error && <p className="small" role="status">{t("common_loading")}</p>}

      {billing && <>
        <p className="note plan-trial-note">{t("pricing_lead")} {t("compare_billing_note")}</p>
        <div className="plan-grid">
          {["core", "growth"].map(id => {
            const growth = id === "growth";
            const plan = billing.plans.find(item => item.id === id);
            return <section key={id} className={`card plan-card${growth ? " growth-plan" : ""}`}>
              <div className="plan-card-header">
                <span className="chip">MadeTrace {t(`pricing_${id}_name`)}</span>
                <h2>{t(`pricing_${id}_name`)}</h2>
                <div className="plan-price">
                  {plan && typeof plan.price === "number" ? formatMoney(plan.price, billing.currency) : t("compare_price_unavailable")}
                  {plan && typeof plan.price === "number" && <small>{t("compare_per_workshop")}</small>}
                </div>
                <p>{t(`compare_${id}_body`)}</p>
              </div>
              <ul className="plan-features comparison-features">
                {features.map(([label, availability]) => {
                  const included = !availability || (availability === "growth" && growth);
                  const status = availability === "planned" ? "compare_planned" : included ? "compare_included" : "compare_growth_only";
                  return <li key={label} className={included ? "plan-feature-included" : ""}>
                    <span className="plan-feature-mark" aria-hidden="true">{included ? "✓" : "–"}</span>
                    <div><strong>{t(label)}</strong><span className="feature-availability">{t(status)}</span></div>
                  </li>;
                })}
              </ul>
              <div className="plan-card-action">
                <Link to={destination} aria-disabled={loading || connectionError}
                  onClick={event => { if (loading || connectionError) event.preventDefault(); }}
                  className={`btn ${growth ? "primary" : "secondary"} block`}>{t(destinationLabel)}</Link>
              </div>
            </section>;
          })}
        </div>
      </>}
    </div>
  );
}
