import { useEffect, useMemo, useState } from "react";
import { useI18n, errorText } from "../lib/i18n/index.jsx";
import { Link, BackButton } from "../router/HashRouter.jsx";
import { api } from "../lib/api.js";

function WorkshopCard({ w, t }) {
  return (
    <article className="card studio-card">
      <Link to={`/workshops/${w.id}`} className={`studio-cover ${w.theme || "blue"}`} aria-label={w.name}>
        <span className="hero-shape">{w.initials}</span>
      </Link>
      <div className="studio-details">
        <span className="eyebrow">{w.city}</span>
        <h3>
          <Link to={`/workshops/${w.id}`}>{w.name}</Link>
        </h3>
        <p className="small">
          {w.city} · {w.country}
        </p>
        {w.description && <p>{w.description}</p>}
        <div className="row wrap">
          {(w.services || []).slice(0, 3).map((s) => (
            <span className="chip" key={s}>
              {s}
            </span>
          ))}
          {w.pickup && <span className="chip">{t("dir_pickup")}</span>}
        </div>
        <div className="row wrap card-actions">
          <Link to={`/workshops/${w.id}`} className="btn secondary small">
            {t("dir_view")}
          </Link>
          <Link to={`/order/${w.id}`} className="btn soft small">
            {t("dir_quote")} →
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function Directory() {
  const { t } = useI18n();
  const [workshops, setWorkshops] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [city, setCity] = useState("all");
  const [service, setService] = useState("all");

  useEffect(() => {
    let cancelled = false;
    api
      .directory()
      .then((rows) => !cancelled && setWorkshops(rows))
      .catch((err) => !cancelled && setError(errorText(t, err.code)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countries = useMemo(
    () => [...new Set((workshops || []).map((w) => w.country))].sort(),
    [workshops]
  );
  const cities = useMemo(
    () =>
      [...new Set((workshops || []).filter((w) => country === "all" || w.country === country).map((w) => w.city))].sort(),
    [workshops, country]
  );
  const services = useMemo(
    () => [...new Set((workshops || []).flatMap((w) => w.services || []))].sort(),
    [workshops]
  );

  const results = useMemo(() => {
    if (!workshops) return [];
    const needle = search.trim().toLowerCase();
    return workshops.filter((w) => {
      if (country !== "all" && w.country !== country) return false;
      if (city !== "all" && w.city !== city) return false;
      if (service !== "all" && !(w.services || []).includes(service)) return false;
      if (needle) {
        const haystack = `${w.name} ${w.city} ${(w.services || []).join(" ")}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [workshops, search, country, city, service]);

  return (
    <div className="page">
      <BackButton fallback="/" />
      <div className="request-title">
        <span className="eyebrow">{t("dir_eyebrow")}</span>
        <h1 className="directory-title">{t("dir_title")}</h1>
        <p>{t("dir_subtitle")}</p>
      </div>

      {error && (
        <div className="notice" role="alert">
          {error}
        </div>
      )}

      {!error && (
        <div className="directory-tools international-filters">
          <div className="field">
            <label htmlFor="directory-search">{t("dir_search_placeholder")}</label>
            <input
              id="directory-search"
              className="control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("dir_search_placeholder")}
            />
          </div>
          <div className="field">
            <label htmlFor="directory-country">{t("auth_company_country")}</label>
            <select id="directory-country" className="control" value={country} onChange={(e) => { setCountry(e.target.value); setCity("all"); }}>
              <option value="all">{t("dir_all_countries")}</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="directory-city">{t("auth_company_city")}</label>
            <select id="directory-city" className="control" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="all">{t("dir_all_cities")}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="directory-service">{t("dir_service_label")}</label>
            <select id="directory-service" className="control" value={service} onChange={(e) => setService(e.target.value)}>
              <option value="all">{t("dir_all_services")}</option>
              {services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {workshops === null && !error && <p className="small">{t("common_loading")}</p>}

      {workshops !== null && (
        <>
          <p className="small">{t("dir_count", { count: results.length })}</p>
          {results.length === 0 ? (
            <div className="empty">
              <strong>{t("dir_empty")}</strong>
            </div>
          ) : (
            <div className="grid">
              {results.map((w) => (
                <WorkshopCard w={w} t={t} key={w.id} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
