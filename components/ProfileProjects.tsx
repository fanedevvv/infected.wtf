export type ProfileProjectCard = {
  id: number;
  title: string;
  description: string | null;
  url: string | null;
  repoUrl: string | null;
  technologies: string | null;
  image: string | null;
};

// Approved projects shown under the profile card.
export default function ProfileProjects({ projects }: { projects: ProfileProjectCard[] }) {
  return (
    <section className="pc-section pp-section">
      <div className="pc-head">
        <h2>Projects <span className="pc-count">{projects.length}</span></h2>
      </div>
      <div className="pp-grid">
        {projects.map((pr) => (
          <article className="pp-card" key={pr.id}>
            {pr.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="pp-img" src={`/${pr.image}`} alt="" loading="lazy" />
            )}
            <div className="pp-body">
              <h3>{pr.title}</h3>
              {pr.description && <p>{pr.description}</p>}
              {pr.technologies && (
                <div className="pp-tech">
                  {pr.technologies.split(",").map((tech) => tech.trim()).filter(Boolean).map((tech) => <span key={tech}>{tech}</span>)}
                </div>
              )}
              {(pr.url || pr.repoUrl) && (
                <div className="pp-links">
                  {pr.url && <a href={pr.url} target="_blank" rel="noopener nofollow ugc">Visit ↗</a>}
                  {pr.repoUrl && <a href={pr.repoUrl} target="_blank" rel="noopener nofollow ugc">Source ↗</a>}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
