import FilePicker from "../../components/FilePicker.jsx";
import ClassicIcon from "../../components/ClassicIcon.jsx";
import WorkshopBrand, { workshopBrandStyle } from "../../components/WorkshopBrand.jsx";
import { normalizeArtwork, readImageSize, uploadToStorage } from "../../lib/supabaseClient.js";
import { confirmNavigation, useUnsavedChanges } from "../../lib/unsavedChanges.js";
import { Link } from "../../router/HashRouter.jsx";
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
    brandColor: workshop.brandColor || null,
    logoUrl: workshop.logoUrl || null,
  });
  const [busy, setBusy] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [localLogo, setLocalLogo] = useState(null);
  useEffect(() => () => { if (localLogo) URL.revokeObjectURL(localLogo); }, [localLogo]);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [savedState, setSavedState] = useState(() => JSON.stringify(form));
  useUnsavedChanges(uploadingLogo || JSON.stringify(form) !== savedState, t);

  async function pickLogo(file) {
    setUploadingLogo(true);
    setLogoError("");
    try {
      const image = await normalizeArtwork(file);
      const {width, height} = await readImageSize(image);
      if (width < 2 || height < 2 || width > 4096 || height > 4096) throw new Error("logo");
      setLocalLogo(URL.createObjectURL(image));
      const {url} = await uploadToStorage(image, "workshop-logos/" + workshop.id);
      setForm(current => ({...current, logoUrl:url}));
    } catch {
      setLogoError(t("product_photo_upload_failed"));
    } finally {
      setLocalLogo(null);
      setUploadingLogo(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (uploadingLogo) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const body = {
        ...form,
        services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
        paymentLink: form.paymentLink.trim() || null,
      };
      const updated = await api.updateProfile(body);
      setForm(current => ({ ...current, paymentLink: updated.paymentLink || "" }));
      setSavedState(JSON.stringify({...form, paymentLink: updated.paymentLink || ""}));
      onSaved(updated);
      setSaved(true);
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
        {saved && <p className="small" role="status">{t("account_saved")}</p>}
        {error && <div className="notice" role="alert">{error}</div>}
        <label className="field">
          <span className="field-label">{t("ws_settings_name")}</span>
          <input className="control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <fieldset className="workshop-brand-settings">
          <legend>{t("branding_title")}</legend>
          <div className={`studio-cover workshop-brand-cover ${workshop.theme || "blue"}`} style={workshopBrandStyle(form)}>
            <WorkshopBrand workshop={{...form, initials: form.name.trim().slice(0,2).toUpperCase(),
              logoUrl:localLogo || form.logoUrl}} />
          </div>
          <div className="row wrap">
            {["#4477cc", "#d66b62", "#34846e", "#785ec0", "#bd762f"].map(color =>
              <button type="button" key={color} aria-label={color} aria-pressed={form.brandColor === color}
                className="studio-swatch" onClick={() => setForm(current => ({...current, brandColor:color}))}>
                <span style={{backgroundColor:color}} />
              </button>)}
            <label className="catalog-color-picker" style={{"--picked-color":form.brandColor || "#4477cc"}}>
              <ClassicIcon name="plus" />
              <input type="color" aria-label={t("branding_color")} value={form.brandColor || "#4477cc"}
                onChange={event => setForm(current => ({...current, brandColor:event.target.value}))} />
            </label>
            <button className="btn secondary small" type="button" onClick={() => setForm(current => ({...current, brandColor:null}))}>
              {t("branding_reset")}
            </button>
          </div>
          <FilePicker accept="image/png,image/jpeg,image/webp" onFile={pickLogo} disabled={busy || uploadingLogo} fileName="" />
          {form.logoUrl && <button className="btn secondary small" type="button" disabled={uploadingLogo}
            onClick={() => setForm(current => ({...current, logoUrl:null}))}>{t("branding_remove")}</button>}
          {uploadingLogo && <p className="small" role="status">{t("common_loading")}</p>}
          {logoError && <p className="notice" role="alert">{logoError}</p>}
        </fieldset>
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
          <span className="small">{t("ws_settings_payment_link_help")}</span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={form.pickup} onChange={(e) => setForm({ ...form, pickup: e.target.checked })} />
          <span>{t("ws_settings_pickup")}</span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={form.public} onChange={(e) => setForm({ ...form, public: e.target.checked })} />
          <span>{t("ws_settings_public")}</span>
        </label>
        <button className="btn primary" type="submit" disabled={busy || uploadingLogo}>
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

  const [savedState, setSavedState] = useState(() => JSON.stringify([timezone, currency]));
  useUnsavedChanges(JSON.stringify([timezone, currency]) !== savedState, t);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updatePreferences({ timezone, currency: currency.toUpperCase() });
      setTimezone(updated.timezone);
      setCurrency(updated.currency);
      setSavedState(JSON.stringify([updated.timezone, updated.currency]));
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

function PricingForm({ workshop, t, onSaved, mockupType }) {
  const all = workshop.pricing || {};
  const override = all.typeRules?.[mockupType];
  const p = override || all;
  const [inherits, setInherits] = useState(Boolean(mockupType && !override));
  const [form, setForm] = useState({
    mode: p.mode || "auto",
    ...(mockupType ? {method: p.method || "width_tiers"} : {}),
    print: p.print ?? 0,
    printSmall: p.printSmall ?? p.print ?? 0,
    printLarge: p.printLarge ?? p.print ?? 0,
    setup: p.setup ?? 0,
    discountAt: p.discountAt ?? 25,
    discountPct: p.discountPct ?? 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [savedState, setSavedState] = useState(() => JSON.stringify([form, inherits]));
  useUnsavedChanges(JSON.stringify([form, inherits]) !== savedState, t);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const typeRules = {...all.typeRules};
      if (mockupType) {
        if (inherits) delete typeRules[mockupType];
        else typeRules[mockupType] = form;
      }
      const updated = await api.updatePricing(mockupType ? {...all, typeRules} : {...form, typeRules});
      setSavedState(JSON.stringify([form, inherits]));
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
        {mockupType && <label className="check-row"><input type="checkbox" checked={inherits}
          onChange={event => setInherits(event.target.checked)} />{t("pricing_use_default")}</label>}
        <fieldset disabled={inherits} className="stack">
        <label className="field">
          <span className="field-label">{t("ws_settings_pricing_mode")}</span>
          <select className="control" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            <option value="auto">{t("ws_settings_pricing_auto")}</option>
            <option value="manual">{t("ws_settings_pricing_manual")}</option>
          </select>
        </label>
        {mockupType && <label className="field"><span>{t("pricing_method")}</span>
          <select className="control" value={form.method} onChange={event => setForm({...form,method:event.target.value})}>
            {["width_tiers","per_side","per_item"].map(method => <option key={method} value={method}>{t("pricing_method_"+method)}</option>)}
          </select>
        </label>}
        <div className="form-cols">
          <label className="field">
            <span className="field-label">{t(form.method && form.method !== "width_tiers" ? "pricing_flat_rate" : "ws_settings_print_medium")}</span>
            <NumberInput className="control" type="number" min={0} step={0.01} value={form.print} onChange={num("print")} />
          </label>
          {(!form.method || form.method === "width_tiers") && <><label className="field">
            <span className="field-label">{t("ws_settings_print_small")}</span>
            <NumberInput className="control" type="number" min={0} step={0.01} value={form.printSmall} onChange={num("printSmall")} />
          </label>
          <label className="field">
            <span className="field-label">{t("ws_settings_print_large")}</span>
            <NumberInput className="control" type="number" min={0} step={0.01} value={form.printLarge} onChange={num("printLarge")} />
          </label></>}
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
        </fieldset>
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


export function ProductPricing() {
  const {t} = useI18n();
  const [workshop, setWorkshop] = useState(null);
  const [mockupType, setMockupType] = useState("");
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api.getProfile().then(setWorkshop).catch(error => setError(errorText(t, error.code)));
  }, [t]);
  return <WorkspaceLayout section="products">
    <Link to="/workspace/products">{t("ws_nav_products")}</Link>
    <label className="field" style={{margin:"16px 0"}}>
      <span>{t("pricing_applies_to")}</span>
      <select className="control" value={mockupType} onChange={event => {if (confirmNavigation()) {setMockupType(event.target.value);setSaved(false);} else event.target.value = mockupType;}}>
        <option value="">{t("pricing_default_rule")}</option>
        {["tee","hoodie","cap","mug","tank","tote","reference"].map(type => <option key={type} value={type}>{t("mockup_" + type)}</option>)}
      </select>
    </label>
    {error && <p role="alert">{error}</p>}
    {saved && <p role="status">{t("pricing_saved")}</p>}
    {workshop && <PricingForm key={mockupType} workshop={workshop} t={t} mockupType={mockupType}
      onSaved={value => {setWorkshop(value);setSaved(true);}} />}
  </WorkspaceLayout>;
}
