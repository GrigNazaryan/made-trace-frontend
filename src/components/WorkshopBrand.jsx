import { useState } from "react";

export default function WorkshopBrand({ workshop }) {
  const [failed, setFailed] = useState(null);
  const hasColor = /^#[0-9a-f]{6}$/i.test(workshop.brandColor || "");
  const logo = workshop.logoUrl;
  return <span className={`workshop-brand-badge${logo && failed !== logo ? " has-logo" : ""}`}
    style={hasColor ? {"--workshop-brand-color":workshop.brandColor} : undefined}>
    {logo && failed !== logo
      ? <img src={logo} alt="" onError={() => setFailed(logo)} />
      : <span>{workshop.initials || workshop.name.slice(0, 2).toUpperCase()}</span>}
  </span>;
}

export function workshopBrandStyle(workshop) {
  return /^#[0-9a-f]{6}$/i.test(workshop.brandColor || "")
    ? {"--workshop-brand-color":workshop.brandColor} : undefined;
}
