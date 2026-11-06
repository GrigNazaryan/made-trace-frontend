import { useState } from "react";
import { useI18n, errorText } from "../lib/i18n/index.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { Link, useRoute, BackButton } from "../router/HashRouter.jsx";

// Deliberately a separate page/component/endpoint from the customer Login page:
// this form can never produce a customer/company session, and the customer Login
// page can never produce an admin session. See routers/auth.py (login vs admin-login).
export default function AdminLogin() {
  const { t } = useI18n();
  const { adminLogin } = useAuth();
  const { navigate } = useRoute();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await adminLogin(email.trim(), password);
      navigate("/admin");
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <BackButton fallback="/" />
      <section className="section" style={{ maxWidth: 420, margin: "0 auto" }}>
        <h2>{t("admin_login_title")}</h2>
        <p className="small" style={{ marginTop: 8 }}>{t("admin_login_lead")}</p>
        <form onSubmit={onSubmit} className="form" style={{ marginTop: 16 }}>
          {error && (
            <div className="notice" role="alert">
              {error}
            </div>
          )}
          <label className="field">
            <span className="field-label">{t("auth_email")}</span>
            <input
              className="control"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">{t("auth_password")}</span>
            <input
              className="control"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="btn primary block" type="submit" disabled={busy}>
            {busy ? t("common_loading") : t("auth_submit_login")}
          </button>
        </form>
        <p className="small" style={{ marginTop: 16 }}>
          <Link to="/admin-setup">{t("admin_setup_link")}</Link>
        </p>
      </section>
    </div>
  );
}
