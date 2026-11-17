import { useEffect, useRef, useState } from "react";
import { garmentType, thumbnailSource, tintedThumbnail } from "../lib/mockups.js";

export default function ProductPreview({ product, color }) {
  const canvas = useRef(null);
  const [failedPhoto, setFailedPhoto] = useState(null);
  const type = garmentType(product);
  const photo = product.image;
  const isPrimaryColor = !color || color === product.colors?.[0];
  const showPhoto = photo && isPrimaryColor && failedPhoto !== photo;
  useEffect(() => {
    if (showPhoto || !canvas.current) return;
    const target = canvas.current;
    const context = target.getContext("2d");
    let current = true;
    tintedThumbnail(type, color).then(image => {
      if (!current) return;
      context.clearRect(0, 0, 240, 260);
      const scale = Math.min(target.width / image.width, target.height / image.height);
      const w = image.width * scale;
      const h = image.height * scale;
      context.drawImage(image, (target.width - w) / 2, (target.height - h) / 2, w, h);
    }).catch(() => {
      const fallback = new Image();
      fallback.onload = () => { if (current) context.drawImage(fallback, 0, 0, 240, 260); };
      fallback.src = thumbnailSource(type);
    });
    return () => { current = false; };
  }, [color, showPhoto, type]);

  return <div className="product-picture product-preview">
    {showPhoto
      ? <img src={photo} alt={product.name} loading="lazy" onError={() => setFailedPhoto(photo)} />
      : <canvas ref={canvas} width={240} height={260} role="img" aria-label={product.name + (color ? " · " + color : "")} />}
  </div>;
}
