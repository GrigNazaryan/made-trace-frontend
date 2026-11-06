import { destinationAfterAuth } from "../lib/authReturn.js";
import { GoogleButton } from "./AccountSecurity.jsx";
import { useState } from "react";
import { useI18n, errorText } from "../lib/i18n/index.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { Link, useRoute, BackButton } from "../router/HashRouter.jsx";

function destinationFor(role) {
  if (role === "company_owner") return "/workspace/overview";
  if (role === "admin") return "/admin";
  return "/my-orders";
}

export default function Login() {
  const { t } = useI18n();
  const { login } = useAuth();
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
      const user = await login(email.trim(), password);
      navigate(await destinationAfterAuth(user.role),{replace:true});
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
        <h2>{t("auth_login_title")}</h2>
        <form onSubmit={onSubmit} className="form">
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
        <GoogleButton  />
        <p className="small"><Link to="/forgot-password">{t("account_forgot")}</Link></p>
        <p className="small"><Link to="/admin-login">{t("account_admin_login")}</Link></p>
        <p className="small" style={{ marginTop: 16 }}>
          <Link to="/register">{t("auth_switch_to_register")}</Link>
        </p>
      </section>
    </div>
  );
}
