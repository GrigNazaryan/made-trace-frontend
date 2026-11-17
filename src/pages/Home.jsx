import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { WorkshopCard } from "./Directory.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { useI18n } from "../lib/i18n/index.jsx";
import { Link } from "../router/HashRouter.jsx";

export default function Home() {
  const { user, loading, connectionError } = useAuth();
  const destination = user?.role === "company_owner"
    ? "/workspace/overview"
    : user?.role === "admin" ? "/admin/workshops" : user ? "/my-orders" : "/register";
  const destinationLabel = user?.role === "company_owner"
    ? "nav_workspace"
    : user?.role === "admin" ? "nav_admin" : user ? "nav_my_orders" : null;
  const { t } = useI18n();
  const [workshops, setWorkshops] = useState([]);

  useEffect(() => {
    let active = true;
    api.directory().then(rows => {
      if (active) setWorkshops(rows.slice(0, 3));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-grid">
          <div>
            <div className="pill">
              <span className="dot"></span>
              <span>{t("home_pill")}</span>
            </div>
            <div style={{ height: 23 }}></div>
            <h1>
              {t("home_title_1")}
              <br />
              <span className="blue">{t("home_title_2")}</span>
            </h1>
            <p className="lead">{t("home_lead")}</p>
            <div className="actions">
              <Link to="/directory" className="btn primary">
                {t("home_cta_primary")} <span className="arr">→</span>
              </Link>
              <Link to={destination} aria-disabled={loading || connectionError} onClick={event => { if (loading || connectionError) event.preventDefault(); }} className="btn secondary">
                {t(destinationLabel || "home_cta_secondary")}
              </Link>
            </div>
            <div className="space"></div>
            <span className="small">{t("home_note")}</span>
          </div>
          <div className="hero-visual">
            <div className="window">
              <div className="window-title">
                <i></i>
                <i></i>
                <i></i>
                <span style={{ marginLeft: 13, color: "#7a8797", fontSize: 11 }}>MadeTrace OS / {t("ws_nav_orders")}</span>
              </div>
              <div className="window-body">
                <div className="between">
                  <div>
                    <span className="eyebrow">{t("nav_workspace")} / {t("ws_nav_overview")}</span>
                    <h3 style={{ margin: "8px 0 2px" }}>{t("classic_greeting")}</h3>
                    <span className="small">{t("classic_attention")}</span>
                  </div>
                  <span className="chip blue">{t("classic_demo_preview")}</span>
                </div>
                <div className="hero-list">
                  <span className="bubble">OP</span>
                  <div className="grow"><strong>{t("classic_demo_tee")}</strong><div className="small">Olivia Parker · {t("status_proof")}</div></div>
                  <span className="badge proof">{t("status_proof")}</span>
                </div>
                <div className="hero-list">
                  <span className="bubble classic-purple">EB</span>
                  <div className="grow"><strong>{t("classic_demo_hoodie")}</strong><div className="small">Ethan Brooks · {t("status_production")}</div></div>
                  <span className="badge production">{t("status_production")}</span>
                </div>
                <div className="classic-preview-footer between">
                  <span className="small">{t("classic_preview_footer")}</span>
                  <span className="preview-orders">{t("ws_nav_orders")} ↗</span>
                </div>
              </div>
            </div>
            <div className="floating">✦ &nbsp; {t("classic_shared_history")}</div>
            <div className="floating right">✓ &nbsp; {t("classic_artwork_approved")}</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="center section-head">
          <span className="eyebrow">{t("home_section_eyebrow")}</span>
          <h2 style={{ marginTop: 12 }}>{t("home_section_title")}</h2>
          <p>{t("home_section_lead")}</p>
        </div>
        <div className="grid3">
          <div className="card feature">
            <div className="feature-icon">↗</div>
            <h3>{t("home_feature_link_title")}</h3>
            <p>{t("home_feature_link_body")}</p>
          </div>
          <div className="card feature">
            <div className="feature-icon">$</div>
            <h3>{t("home_feature_pricing_title")}</h3>
            <p>{t("home_feature_pricing_body")}</p>
          </div>
          <div className="card feature">
            <div className="feature-icon">✓</div>
            <h3>{t("home_feature_status_title")}</h3>
            <p>{t("home_feature_status_body")}</p>
          </div>
        </div>
      </section>

      {workshops.length > 0 && (
        <section className="section">
          <div className="between section-head wrap">
            <div>
              <span className="eyebrow">{t("dir_eyebrow")}</span>
              <h2>{t("classic_discover_heading")}</h2>
              <p>{t("classic_discover_lead")}</p>
            </div>
            <Link to="/directory" className="btn secondary">{t("nav_directory")} →</Link>
          </div>
          <div className="grid3">
            {workshops.map(workshop => <WorkshopCard key={workshop.id} w={workshop} t={t}
              canOrder={!user || user.role === "customer"} />)}
          </div>
        </section>
      )}

      <section className="section-cta between wrap">
        <div>
          <span className="eyebrow">{t("nav_for_business")}</span>
          <h2>{t("classic_business_heading")}</h2>
          <p>{t("classic_business_lead")}</p>
        </div>
        <Link to="/for-business" className="btn">{t("nav_for_business")} →</Link>
      </section>
    </div>
  );
}
