import { useI18n } from "../lib/i18n/index.jsx";
import { Link, BackButton } from "../router/HashRouter.jsx";

// Generic B2B legal text. This is a reasonable starting draft, not a substitute
// for review by a lawyer in your jurisdiction before going live with real
// international clients — swap in reviewed text when you have it.
const DOCS = {
  terms: {
    titleKey: "legal_terms_title",
    body: (t) => [
      t("legal_terms_p1"),
      t("legal_terms_p2"),
      t("legal_terms_p3"),
      t("legal_terms_p4"),
      t("legal_terms_p5"),
    ],
  },
  privacy: {
    titleKey: "legal_privacy_title",
    body: (t) => [
      t("legal_privacy_p1"),
      t("legal_privacy_p2"),
      t("legal_privacy_p3"),
      t("legal_privacy_p4"),
    ],
  },
  disclaimer: {
    titleKey: "legal_disclaimer_title",
    body: (t) => [
      t("legal_disclaimer_p1"),
      t("legal_disclaimer_p2"),
      t("legal_disclaimer_p3"),
    ],
  },
};

export default function Legal({ doc }) {
  const { t } = useI18n();
  const d = DOCS[doc] || DOCS.terms;
  return (
    <div className="page narrow">
      <BackButton fallback="/" />
      <section className="section">
        <div className="row wrap" style={{ gap: 8, marginBottom: 20 }}>
          <Link to="/legal/terms" className={`chip ${doc === "terms" ? "blue" : ""}`}>{t("legal_terms_title")}</Link>
          <Link to="/legal/privacy" className={`chip ${doc === "privacy" ? "blue" : ""}`}>{t("legal_privacy_title")}</Link>
          <Link to="/legal/disclaimer" className={`chip ${doc === "disclaimer" ? "blue" : ""}`}>{t("legal_disclaimer_title")}</Link>
        </div>
        <h2>{t(d.titleKey)}</h2>
        <p className="small" style={{ marginBottom: 20 }}>{t("legal_updated", { version: "1.0" })}</p>
        {d.body(t).map((p, i) => (
          <p key={i} style={{ marginBottom: 14 }}>{p}</p>
        ))}
      </section>
    </div>
  );
}
