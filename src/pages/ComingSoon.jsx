import { useI18n } from "../lib/i18n/index.jsx";
import { Link } from "../router/HashRouter.jsx";

/** Placeholder for screens not built yet — intentionally plain, not styled as finished. */
export default function ComingSoon({ titleKey }) {
  const { t } = useI18n();
  return (
    <div className="page">
      <section className="section center">
        <span className="eyebrow">{t(titleKey)}</span>
        <h2 style={{ marginTop: 12 }}>{t("coming_soon_title")}</h2>
        <p className="lead">{t("coming_soon_lead")}</p>
        <Link to="/" className="btn primary">
          {t("coming_soon_back")}
        </Link>
      </section>
    </div>
  );
}
