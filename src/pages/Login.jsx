import { forgetAccounts, rememberedAccounts } from "../lib/rememberedAccounts.js";
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
  const { login, user } = useAuth();
  const { navigate } = useRoute();
  const [recent, setRecent] = useState(rememberedAccounts);
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
        <h2>{t(user ? "account_switch" : "auth_login_title")}</h2>
        {user && <p className="small">{t("account_active")}: <strong>{user.email}</strong></p>}
        {recent.length > 0 && <div className="account-recent">
          <span className="field-label">{t("account_recent")}</span>
          <div className="row wrap">{recent.filter(value => value !== user?.email).map(value =>
            <button key={value} type="button" className="btn secondary small" aria-pressed={email === value}
              onClick={() => {setEmail(value);setPassword("");}}>{value}</button>)}</div>
          <button type="button" className="btn quiet small" onClick={() => {forgetAccounts();setRecent([]);}}>
            {t("account_forget_list")}
          </button>
        </div>}
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
        <GoogleButton signIn />
        <p className="small"><Link to="/forgot-password">{t("account_forgot")}</Link></p>
        <p className="small"><Link to="/admin-login">{t("account_admin_login")}</Link></p>
        <p className="small" style={{ marginTop: 16 }}>
          <Link to="/register">{t("auth_switch_to_register")}</Link>
        </p>
      </section>
    </div>
  );
}
