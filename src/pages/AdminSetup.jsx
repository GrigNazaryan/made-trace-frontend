import { useState } from "react";
import { useI18n, errorText } from "../lib/i18n/index.jsx";
import { Link, useRoute, BackButton } from "../router/HashRouter.jsx";
import { api, setToken } from "../lib/api.js";

// Creates a brand-new, dedicated admin account — it never touches or promotes an
// existing customer/company account, and the backend refuses this once any admin
// already exists. No prior login is required or used.
export default function AdminSetup() {
  const { t } = useI18n();
  const { navigate } = useRoute();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", secret: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.bootstrapAdmin({
        secret: form.secret.trim(),
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
      });
      setDone(true);
      setTimeout(() => navigate("/admin-login"), 1200);
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <BackButton fallback="/admin-login" />
      <section className="section" style={{ maxWidth: 420, margin: "0 auto" }}>
        <h2>{t("admin_setup_title")}</h2>
        <p className="small" style={{ marginTop: 8 }}>{t("admin_setup_lead")}</p>

        {!done && (
          <form onSubmit={onSubmit} className="form" style={{ marginTop: 16 }}>
            {error && <div className="notice" role="alert">{error}</div>}
            <label className="field">
              <span className="field-label">{t("admin_setup_name")}</span>
              <input className="control" required value={form.fullName} onChange={set("fullName")} />
            </label>
            <label className="field">
              <span className="field-label">{t("auth_email")}</span>
              <input className="control" type="email" required value={form.email} onChange={set("email")} />
            </label>
            <label className="field">
              <span className="field-label">{t("auth_password")}</span>
              <input
                className="control"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={set("password")}
              />
            </label>
            <label className="field">
              <span className="field-label">{t("admin_setup_secret")}</span>
              <input
                className="control"
                type="password"
                required
                value={form.secret}
                onChange={set("secret")}
              />
            </label>
            <button className="btn primary block" type="submit" disabled={busy}>
              {busy ? t("common_loading") : t("admin_setup_submit")}
            </button>
          </form>
        )}

        {done && <div className="notice" style={{ marginTop: 16 }}>{t("admin_setup_success")}</div>}
        <p className="small" style={{ marginTop: 16 }}>
          <Link to="/admin-login">{t("admin_login_title")}</Link>
        </p>
      </section>
    </div>
  );
}
