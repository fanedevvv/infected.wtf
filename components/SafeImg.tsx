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
  return (
    // Arbitrary user uploads and remote avatars, with an onError fallback: next/image doesn't fit here.
    // eslint-disable-next-line @next/next/no-img-element
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
