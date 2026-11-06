import { useEffect } from "react";
import { useI18n } from "../../lib/i18n/index.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { Link, useRoute, BackButton } from "../../router/HashRouter.jsx";

const NAV = [
  ["overview", "ws_nav_overview"],
  ["orders", "ws_nav_orders"],
  ["products", "ws_nav_products"],
  ["templates", "ws_nav_templates"],
  ["clients", "ws_nav_clients"],
  ["reports", "ws_nav_reports"],
  ["import", "ws_nav_import"],
  ["billing", "ws_nav_billing"],
  ["settings", "ws_nav_settings"],
];

/** `section` is the active sidebar slug; `children` is the page body. */
export default function WorkspaceLayout({ section, children }) {
  const { t } = useI18n();
  const { user, loading, connectionError } = useAuth();
  const { navigate } = useRoute();

  useEffect(() => {
    if (loading || connectionError) return;
    if (!user || (user.role !== "company_owner" && user.role !== "admin")) navigate("/login");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  if (loading || connectionError || !user || !["company_owner", "admin"].includes(user.role)) return null;

  return (
    <div className="workspace">
      <aside className="workspace-side">
        <div className="side-section" style={{ marginTop: 0 }}>
          {t("ws_your_workspace")}
        </div>
        <div className="side-section">{t("ws_operations")}</div>
        {NAV.map(([slug, labelKey]) => (
          <Link key={slug} to={`/workspace/${slug}`} className={`side-link ${section === slug ? "active" : ""}`}>
            {t(labelKey)}
          </Link>
        ))}
      </aside>
      <main className="workspace-content">
        <BackButton fallback="/" label={t("account_exit_workspace")} />
        {children}
      </main>
    </div>
  );
}
