import { useI18n } from "../lib/i18n/index.jsx";
import { Link } from "../router/HashRouter.jsx";

export default function Home() {
  const { t } = useI18n();
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
              <Link to="/register" className="btn secondary">
                {t("home_cta_secondary")}
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
                <span style={{ marginLeft: 13, color: "#7a8797", fontSize: 11 }}>MadeTrace / Orders</span>
              </div>
              <div className="window-body">
                <div className="between">
                  <div>
                    <span className="eyebrow">WORKSPACE / OVERVIEW</span>
                    <h3 style={{ margin: "8px 0 2px" }}>{t("status_proof")}</h3>
                    <span className="small">{t("status_production")}</span>
                  </div>
                </div>
              </div>
            </div>
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
    </div>
  );
}
