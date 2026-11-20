import Link from "next/link";

export type CrewTagInfo = { tag: string; color: string; name?: string } | null | undefined;

/**
 * A name with its nameplate (animated plate behind it) and crew tag. Used wherever a name is shown — profiles,
 * comments, the leaderboard, crew pages — so collectibles are visible across the whole site.
 * `children` replaces the plain name (e.g. a name with its text effect).
 */
export default function NameTag({
  name, nameplate, crew, linkCrew = true, className = "", children,
}: {
  name?: string;
  nameplate?: string | null;
  crew?: CrewTagInfo;
  linkCrew?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const label = children ?? <span className="nt-name">{name}</span>;
  const crewChip = crew ? (
    linkCrew ? (
      <Link href={`/g/${crew.tag}`} className="nt-crew" style={{ ["--crew" as string]: crew.color }} title={crew.name ? `Group: ${crew.name}` : "Group"}>{crew.tag}</Link>
    ) : (
      <span className="nt-crew" style={{ ["--crew" as string]: crew.color }} title={crew.name ? `Group: ${crew.name}` : "Group"}>{crew.tag}</span>
    )
  ) : null;
  return (
    <span className={`nt ${className}`}>
      {nameplate ? <span className={`np np--${nameplate}`}>{label}</span> : label}
      {crewChip}
    </span>
  );
}
