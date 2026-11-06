import { useEffect } from "react";
import { useI18n } from "../../lib/i18n/index.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { Link, useRoute, BackButton } from "../../router/HashRouter.jsx";

const NAV = [
  ["workshops", "admin_nav_workshops"],
  ["payments", "admin_nav_payments"],
  ["audit-log", "admin_nav_audit"],
];

export default function AdminLayout({ section, children }) {
  const { t } = useI18n();
  const { user, loading, logout, connectionError } = useAuth();
  const { navigate } = useRoute();

  useEffect(() => {
    if (loading || connectionError) return;
    if (!user || user.role !== "admin") navigate("/admin-login");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  if (loading || connectionError || !user || user.role !== "admin") return null;

  return (
    <div className="workspace">
      <aside className="workspace-side">
        <div className="side-section" style={{ marginTop: 0 }}>
          ADMIN
        </div>
        {NAV.map(([slug, labelKey]) => (
          <Link key={slug} to={`/admin/${slug}`} className={`side-link ${section === slug ? "active" : ""}`}>
            {t(labelKey)}
          </Link>
        ))}
        <button
          type="button"
          className="side-link"
          style={{ marginTop: "auto", width: "100%", textAlign: "left", border: 0, background: "none", cursor: "pointer" }}
          onClick={async () => {
            if(await logout())navigate("/admin-login");
          }}
        >
          {t("nav_logout")}
        </button>
      </aside>
      <main className="workspace-content">
        <BackButton fallback="/" />
        {children}
      </main>
    </div>
  );
}
