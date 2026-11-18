import ClassicIcon from "./ClassicIcon.jsx";
import ProductPreview from "./ProductPreview.jsx";
import { useI18n } from "../lib/i18n/index.jsx";
import { Link } from "../router/HashRouter.jsx";

export default function StoreProductCard({ product, currency, color = product.colors?.[0], orderTo, previewAction = false }) {
  const { t, formatMoney } = useI18n();
  const Card = orderTo ? Link : "article";
  return <Card {...(orderTo ? { to: orderTo } : {})} className="card product-card classic-store-product">
    <ProductPreview product={product} color={color} />
    <span className="eyebrow">{product.category}</span>
    <h3>{product.name}</h3>
    {product.description && <p className="small">{product.description}</p>}
    <p className="small">
      {product.sizes?.length > 0 && <>{product.sizes.join(" · ")}<br /></>}
      {t("store_from")} {formatMoney(product.base, currency)}
    </p>
    {(orderTo || previewAction) && <span className="btn soft small">
      <ClassicIcon name="box" />{t("store_start_order")} →
    </span>}
  </Card>;
}
