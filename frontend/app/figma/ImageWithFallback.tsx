import { useEffect, useState } from "react";

type ImageWithFallbackProps = React.ImgHTMLAttributes<HTMLImageElement>;

const FALLBACK_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'%3E%3Crect width='1200' height='800' fill='%23e2e8f0'/%3E%3Cpath d='M240 560l160-160 120 120 120-120 320 320H240z' fill='%23cbd5e1'/%3E%3Ccircle cx='390' cy='300' r='70' fill='%2394a3b8'/%3E%3Ctext x='600' y='700' text-anchor='middle' fill='%23475569' font-family='Arial, sans-serif' font-size='42'%3ECertificate Preview%3C/text%3E%3C/svg%3E";

export function ImageWithFallback({ src, alt, ...props }: ImageWithFallbackProps) {
  const [currentSrc, setCurrentSrc] = useState(src ?? FALLBACK_SRC);

  useEffect(() => {
    setCurrentSrc(src ?? FALLBACK_SRC);
  }, [src]);

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      onError={() => setCurrentSrc(FALLBACK_SRC)}
    />
  );
}