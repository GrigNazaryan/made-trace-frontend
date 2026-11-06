import { destinationAfterAuth } from "../lib/authReturn.js";
import { GoogleButton } from "./AccountSecurity.jsx";
import { useState } from "react";
import { useI18n, errorText } from "../lib/i18n/index.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { Link, useRoute, BackButton } from "../router/HashRouter.jsx";

function destinationFor(role) {
  if (role === "company_owner") return "/workspace/overview";
  return "/my-orders";
}

export default function Register() {
  const { t } = useI18n();
  const { register } = useAuth();
  const { navigate } = useRoute();

  const [role, setRole] = useState("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("US");
  const [city, setCity] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [createdAccount,setCreatedAccount]=useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = {
        role: role === "company_owner" ? "company" : "customer",
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        tosAccepted,
      };
      if (role === "company_owner") {
        body.company = { name: companyName.trim(), country, city: city.trim(), services: [], description: "" };
      }
      const user = createdAccount || await register(body);
      setCreatedAccount(user);
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
      <section className="section" style={{ maxWidth: 480, margin: "0 auto" }}>
        <h2>{t("auth_register_title")}</h2>
        <form onSubmit={onSubmit} className="form">
          {error && (
            <div className="notice" role="alert">
              {error}
            </div>
          )}

          <div className="inline-options" role="radiogroup">
            <label className="chip">
              <input type="radio" name="role" checked={role === "customer"} onChange={() => setRole("customer")} />
              &nbsp;{t("auth_role_customer")}
            </label>
            <label className="chip">
              <input
                type="radio"
                name="role"
                checked={role === "company_owner"}
                onChange={() => setRole("company_owner")}
              />
              &nbsp;{t("auth_role_company")}
            </label>
          </div>

          <label className="field">
            <span className="field-label">{t("auth_full_name")}</span>
            <input className="control" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
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
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {role === "company_owner" && (
            <>
              <label className="field">
                <span className="field-label">{t("auth_company_name")}</span>
                <input
                  className="control"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </label>
              <div className="form-cols">
                <label className="field">
                  <span className="field-label">{t("auth_company_country")}</span>
                  <input
                    className="control"
                    required
                    maxLength={2}
                    placeholder="US"
                    value={country}
                    onChange={(e) => setCountry(e.target.value.toUpperCase())}
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t("auth_company_city")}</span>
                  <input className="control" required value={city} onChange={(e) => setCity(e.target.value)} />
                </label>
              </div>
              <label className="check-row">
                <input type="checkbox" checked={tosAccepted} onChange={(e) => setTosAccepted(e.target.checked)} />
                <span>
                  {t("auth_tos_accept")} (<Link to="/legal/terms">{t("legal_terms_title")}</Link>)
                </span>
              </label>
            </>
          )}
          {role === "customer" && (
            <p className="small">
              {t("legal_disclaimer_p1")} <Link to="/legal/disclaimer">{t("legal_disclaimer_title")}</Link>
            </p>
          )}

          <button className="btn primary block" type="submit" disabled={busy}>
            {busy ? t("common_loading") : t("auth_submit_register")}
          </button>
        </form>
        <GoogleButton disabled={role === "company_owner"} />
        <p className="small" style={{ marginTop: 16 }}>
          <Link to="/login">{t("auth_switch_to_login")}</Link>
        </p>
      </section>
    </div>
  );
}
