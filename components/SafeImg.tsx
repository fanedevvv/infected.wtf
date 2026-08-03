"use client";

export default function SafeImg({
  src,
  fallback = "/assets/img/default-avatar.png",
  alt = "",
  className,
}: {
  src: string | null;
  fallback?: string;
  alt?: string;
  className?: string;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src || fallback}
      alt={alt}
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallback;
      }}
    />
  );
}
