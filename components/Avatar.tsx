interface AvatarProps {
  src?: string | null;
  shape?: string;
  ring?: "none" | "normal" | "premium";
  size?: number;
}

export default function Avatar({ src, shape = "circle", ring = "none", size = 88 }: AvatarProps) {
  return (
    <div className={`avatar-wrapper avatar-shape-${shape}`}>
      {ring === "premium" && <div className="avatar-ring-pulse" />}
      {ring !== "none" && (
        <div className={`avatar-ring-shell ring-${ring}`}>
          <div className="avatar-ring-spin" />
        </div>
      )}
      <div className="avatar-ring-inner" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || "/assets/img/default-avatar.png"}
        alt="Avatar"
        className="avatar-img"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
