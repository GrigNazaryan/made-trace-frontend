import { useEffect, useState } from "react";
import { useI18n, errorText } from "../lib/i18n/index.jsx";
import { Link } from "../router/HashRouter.jsx";
import { api, ApiError } from "../lib/api.js";

export default function Storefront({ id }) {
  const { t, formatMoney } = useI18n();
  const [workshop, setWorkshop] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setWorkshop(null);
    setError(null);
    api
      .storefront(id)
      .then((w) => !cancelled && setWorkshop(w))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setError(t("store_not_available"));
        else setError(errorText(t, err.code));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) {
    return (
      <div className="page narrow">
        <div className="empty">
          <strong>{error}</strong>
          <Link to="/directory" className="btn primary">
            {t("store_back")}
          </Link>
        </div>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="page">
        <p className="small">{t("common_loading")}</p>
      </div>
    );
  }

  const products = (workshop.products || []).filter((p) => p.published);

  return (
    <div className="page">
      <Link to="/directory" className="small">
        ← {t("dir_title")}
      </Link>

      <section className="card store-hero">
        <div>
          <span className="pill">
            {workshop.city}, {workshop.country}
          </span>
          <h1 style={{ fontSize: 38, marginTop: 20 }}>{workshop.name}</h1>
          <p>{workshop.about || workshop.description}</p>
          <div className="row wrap">
            {(workshop.services || []).map((s) => (
              <span className="chip" key={s}>
                {s}
              </span>
            ))}
          </div>
          <p className="small" style={{ marginTop: 18 }}>
            {workshop.serviceArea || workshop.city}
            {workshop.pickup ? ` · ${t("dir_pickup")}` : ""} · {workshop.currency}
          </p>
          {workshop.publicContact && (
            <div className="public-contact">
              {workshop.publicContact.email && (
                <a href={`mailto:${workshop.publicContact.email}`}>{workshop.publicContact.email}</a>
              )}
              {workshop.publicContact.phone && <span>{workshop.publicContact.phone}</span>}
              {workshop.publicContact.website && (
                <a href={workshop.publicContact.website} target="_blank" rel="noopener noreferrer">
                  {workshop.publicContact.website} ↗
                </a>
              )}
            </div>
          )}
          <div className="row wrap">
            <Link to={`/order/${workshop.id}`} className="btn primary">
              {t("store_start_order")} →
            </Link>
            <Link to="/my-orders" className="btn secondary">
              {t("store_track_order")}
            </Link>
          </div>
        </div>
        <div className="store-visual">
          <span className="hero-shape">{workshop.initials}</span>
        </div>
      </section>

      <section className="section">
        <h2>{t("store_products_title")}</h2>
        <p>{t("store_products_lead")}</p>
        {products.length === 0 ? (
          <div className="empty">
            <strong>{t("store_catalog_empty")}</strong>
          </div>
        ) : (
          <div className="products-grid">
            {products.map((p) => (
              <Link to={`/order/${workshop.id}`} className="card product-card" key={p.id}>
                <span className="eyebrow">{p.category}</span>
                <h3>{p.name}</h3>
                {p.description && <p className="small">{p.description}</p>}
                <p className="small">
                  {(p.sizes || []).join(" · ")}
                  <br />
                  {t("store_from")} {formatMoney(p.base, workshop.currency)}
                </p>
                <span className="btn soft small">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
