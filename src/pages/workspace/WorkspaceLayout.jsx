import ClassicIcon from "../../components/ClassicIcon.jsx";
import { useEffect } from "react";
import { useI18n } from "../../lib/i18n/index.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { Link, useRoute, BackButton } from "../../router/HashRouter.jsx";

const NAV = [
  ["overview", "ws_nav_overview", "home"],
  ["orders", "ws_nav_orders", "box"],
  ["calendar", "calendar_title", "calendar"],
  ["products", "ws_nav_products", "shirt"],
  ["templates", "ws_nav_templates", "review"],
  ["clients", "ws_nav_clients", "users"],
  ["reports", "ws_nav_reports", "chart"],
  ["import", "ws_nav_import", "upload"],
  ["billing", "ws_nav_billing", "pricing"],
  ["settings", "ws_nav_settings", "gear"],
];

/** `section` is the active sidebar slug; `children` is the page body. */
export default function WorkspaceLayout({ section, children }) {
  const { t } = useI18n();
  const { user, loading, connectionError } = useAuth();
  const { navigate } = useRoute();

  useEffect(() => {
    if (loading || connectionError) return;
    if (!user) navigate("/login", { replace: true });
    else if (user.role === "customer") navigate("/my-orders", { replace: true });
  }, [loading, connectionError, user, navigate]);

  if (loading || !user || !["company_owner", "admin"].includes(user.role)) return null;

  return (
    <div className="workspace">
      <div className="workspace-section-picker">
        <label className="field">
          <span>{t("ws_your_workspace")}</span>
          <select className="control" value={section} onChange={event => {
            navigate("/workspace/" + event.target.value);
            event.target.value = section;
          }}>
            {NAV.map(([slug,label]) => <option key={slug} value={slug}>{t(label)}</option>)}
          </select>
        </label>
      </div>
      <aside className="workspace-side">
        <div className="side-section" style={{ marginTop: 0 }}>
          {t("ws_your_workspace")}
        </div>
        <div className="side-section">{t("ws_operations")}</div>
        {NAV.map(([slug, labelKey, icon]) => (
          <Link key={slug} to={`/workspace/${slug}`} className={`side-link ${section === slug ? "active" : ""}`}>
            <ClassicIcon name={icon} /><span>{t(labelKey)}</span>
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
