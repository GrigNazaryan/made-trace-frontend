import { useAuth } from "../lib/AuthContext.jsx";
import { useI18n } from "../lib/i18n/index.jsx";
import { Link, BackButton } from "../router/HashRouter.jsx";

export default function ForBusiness() {
  const { user, loading, connectionError } = useAuth();
  const destination = user?.role === "company_owner"
    ? "/workspace/overview"
    : user?.role === "admin" ? "/admin/workshops" : user ? "/my-orders" : "/register";
  const destinationLabel = user?.role === "company_owner"
    ? "nav_workspace"
    : user?.role === "admin" ? "nav_admin" : user ? "nav_my_orders" : null;
  const { t } = useI18n();
  return (
    <div className="page">
      <BackButton fallback="/" />
      <section className="hero">
        <div className="hero-grid">
          <div>
            <div className="pill"><span className="dot"></span><span>{t("nav_for_business")}</span></div>
            <div style={{ height: 23 }}></div>
            <h1>{t("forbiz_title")}</h1>
            <p className="lead">{t("forbiz_lead")}</p>
            <div className="actions">
              <Link to={destination} aria-disabled={loading || connectionError} onClick={event => { if (loading || connectionError) event.preventDefault(); }} className="btn primary">{t(destinationLabel || "forbiz_cta")} <span className="arr">→</span></Link>
              <Link to="/pricing" className="btn secondary">{t("nav_pricing")}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid3">
          <div className="card feature">
            <div className="feature-icon">↗</div>
            <h3>{t("forbiz_point1_title")}</h3>
            <p>{t("forbiz_point1_body")}</p>
          </div>
          <div className="card feature">
            <div className="feature-icon">✓</div>
            <h3>{t("forbiz_point2_title")}</h3>
            <p>{t("forbiz_point2_body")}</p>
          </div>
          <div className="card feature">
            <div className="feature-icon">⌂</div>
            <h3>{t("forbiz_point3_title")}</h3>
            <p>{t("forbiz_point3_body")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
