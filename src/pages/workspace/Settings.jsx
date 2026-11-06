import NumberInput from "../../components/NumberInput.jsx";
import { useEffect, useState } from "react";
import { useI18n, errorText } from "../../lib/i18n/index.jsx";
import { api } from "../../lib/api.js";
import WorkspaceLayout from "./WorkspaceLayout.jsx";

function ProfileForm({ workshop, t, onSaved }) {
  const [form, setForm] = useState({
    name: workshop.name,
    country: workshop.country,
    city: workshop.city,
    serviceArea: workshop.serviceArea || "",
    services: (workshop.services || []).join(", "),
    description: workshop.description || "",
    about: workshop.about || "",
    pickup: workshop.pickup,
    public: workshop.public,
    publicContact: workshop.publicContact || { email: "", phone: "", website: "" },
    paymentLink: workshop.paymentLink || "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        ...form,
        services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
        paymentLink: form.paymentLink || null,
      };
      const updated = await api.updateProfile(body);
      onSaved(updated);
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card pad">
      <h3>{t("ws_settings_profile")}</h3>
      <form onSubmit={onSubmit} className="stack" style={{ marginTop: 14 }}>
        {error && <div className="notice" role="alert">{error}</div>}
        <label className="field">
          <span className="field-label">{t("ws_settings_name")}</span>
          <input className="control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <div className="form-cols">
          <label className="field">
            <span className="field-label">{t("ws_settings_country")}</span>
            <input className="control" maxLength={2} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} required />
          </label>
          <label className="field">
            <span className="field-label">{t("ws_settings_city")}</span>
            <input className="control" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          </label>
        </div>
        <label className="field">
          <span className="field-label">{t("ws_settings_service_area")}</span>
          <input className="control" value={form.serviceArea} onChange={(e) => setForm({ ...form, serviceArea: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">Services (comma-separated)</span>
          <input className="control" value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">{t("ws_settings_description")}</span>
          <input className="control" maxLength={400} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">{t("ws_settings_about")}</span>
          <textarea className="control" rows={4} maxLength={6000} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">{t("ws_settings_payment_link")}</span>
          <input className="control" type="url" value={form.paymentLink} onChange={(e) => setForm({ ...form, paymentLink: e.target.value })} />
        </label>
        <label className="check-row">
          <input type="checkbox" checked={form.pickup} onChange={(e) => setForm({ ...form, pickup: e.target.checked })} />
          <span>{t("ws_settings_pickup")}</span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={form.public} onChange={(e) => setForm({ ...form, public: e.target.checked })} />
          <span>{t("ws_settings_public")}</span>
        </label>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? t("common_loading") : t("ws_settings_save")}
        </button>
      </form>
    </section>
  );
}

function PreferencesForm({ workshop, t, onSaved }) {
  const [timezone, setTimezone] = useState(workshop.timezone || "UTC");
  const [currency, setCurrency] = useState(workshop.currency || "USD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updatePreferences({ timezone, currency: currency.toUpperCase() });
      onSaved(updated);
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card pad">
      <h3>{t("ws_settings_preferences")}</h3>
      <form onSubmit={onSubmit} className="form-cols" style={{ marginTop: 14 }}>
        {error && <div className="notice" role="alert">{error}</div>}
        <label className="field">
          <span className="field-label">{t("ws_settings_timezone")}</span>
          <input className="control" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">{t("ws_settings_currency")}</span>
          <input className="control" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </label>
        <button className="btn secondary" type="submit" disabled={busy} style={{ gridColumn: "1 / -1", justifySelf: "start" }}>
          {busy ? t("common_loading") : t("ws_settings_save_prefs")}
        </button>
      </form>
    </section>
  );
}

function PricingForm({ workshop, t, onSaved }) {
  const p = workshop.pricing || {};
  const [form, setForm] = useState({
    mode: p.mode || "auto",
    print: p.print ?? 0,
    printSmall: p.printSmall ?? p.print ?? 0,
    printLarge: p.printLarge ?? p.print ?? 0,
    setup: p.setup ?? 0,
    discountAt: p.discountAt ?? 25,
    discountPct: p.discountPct ?? 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updatePricing({ ...form, productPrices: {} });
      onSaved(updated);
    } catch (err) {
      setError(errorText(t, err.code));
    } finally {
      setBusy(false);
    }
  }

  const num = (key) => (e) => setForm({ ...form, [key]: Number(e.target.value) });

  return (
    <section className="card pad">
      <h3>{t("ws_settings_pricing")}</h3>
      <form onSubmit={onSubmit} className="stack" style={{ marginTop: 14 }}>
        {error && <div className="notice" role="alert">{error}</div>}
        <label className="field">
          <span className="field-label">{t("ws_settings_pricing_mode")}</span>
          <select className="control" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            <option value="auto">{t("ws_settings_pricing_auto")}</option>
            <option value="manual">{t("ws_settings_pricing_manual")}</option>
          </select>
        </label>
        <div className="form-cols">
          <label className="field">
            <span className="field-label">{t("ws_settings_print_medium")}</span>
            <NumberInput className="control" type="number" min={0} step={0.01} value={form.print} onChange={num("print")} />
          </label>
          <label className="field">
            <span className="field-label">{t("ws_settings_print_small")}</span>
            <NumberInput className="control" type="number" min={0} step={0.01} value={form.printSmall} onChange={num("printSmall")} />
          </label>
          <label className="field">
            <span className="field-label">{t("ws_settings_print_large")}</span>
            <NumberInput className="control" type="number" min={0} step={0.01} value={form.printLarge} onChange={num("printLarge")} />
          </label>
          <label className="field">
            <span className="field-label">{t("ws_settings_setup")}</span>
            <NumberInput className="control" type="number" min={0} step={0.01} value={form.setup} onChange={num("setup")} />
          </label>
          <label className="field">
            <span className="field-label">{t("ws_settings_discount_at")}</span>
            <NumberInput className="control" type="number" min={2} step={1} value={form.discountAt} onChange={num("discountAt")} />
          </label>
          <label className="field">
            <span className="field-label">{t("ws_settings_discount_pct")}</span>
            <NumberInput className="control" type="number" min={0} max={100} step={0.1} value={form.discountPct} onChange={num("discountPct")} />
          </label>
        </div>
        <button className="btn primary" type="submit" disabled={busy} style={{ justifySelf: "start" }}>
          {busy ? t("common_loading") : t("ws_settings_save_pricing")}
        </button>
      </form>
    </section>
  );
}

function SubscriptionCard({ workshop, t, formatDate }) {
  return (
    <section className="card pad">
      <h3>{t("ws_settings_subscription")}</h3>
      <div className="stack" style={{ marginTop: 12 }}>
        <div className="row between">
          <span className="small">{t("ws_settings_plan")}</span>
          <strong>{workshop.effectivePlan}</strong>
        </div>
        <div className="row between">
          <span className="small">{t("ws_settings_status")}</span>
          <span className={`badge ${workshop.subscriptionStatus === "active" ? "ready" : workshop.subscriptionStatus === "trial" ? "quoted" : "cancelled"}`}>
            {workshop.subscriptionStatus}
          </span>
        </div>
        {workshop.subscriptionExpiresAt && (
          <div className="row between">
            <span className="small">{t("ws_settings_expires")}</span>
            <span>{formatDate(workshop.subscriptionExpiresAt)}</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Settings() {
  const { t, formatDate } = useI18n();
  const [workshop, setWorkshop] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getProfile().then(setWorkshop).catch((err) => setError(errorText(t, err.code)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WorkspaceLayout section="settings">
      <h2>{t("ws_settings_title")}</h2>
      {error && <div className="notice" role="alert">{error}</div>}
      {!workshop && !error && <p className="small">{t("common_loading")}</p>}
      {workshop && (
        <div className="settings-two" style={{ marginTop: 18 }}>
          <div className="stack">
            <ProfileForm workshop={workshop} t={t} onSaved={setWorkshop} />
            <PricingForm workshop={workshop} t={t} onSaved={setWorkshop} />
          </div>
          <div className="stack">
            <SubscriptionCard workshop={workshop} t={t} formatDate={formatDate} />
            <PreferencesForm workshop={workshop} t={t} onSaved={setWorkshop} />
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
