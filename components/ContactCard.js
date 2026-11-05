import "./team-card.css";
import { optimize } from "../lib/images";

const httpsOnly = (u) => (/^https:\/\/\S+$/i.test(u || "") ? u : "");

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.76 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
  </svg>
);
const LinkedinIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

export default function ContactCard({ contact, isCoordinator = false }) {
  const { name = "", designation, email, linkedin, github, photo_url } = contact;
  const initials =
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "EC";
  const photo = httpsOnly(photo_url);
  const gh = httpsOnly(github);
  const li = httpsOnly(linkedin);

  return (
    <article className={`team-card${isCoordinator ? " team-card-lead" : ""}`}>
      <div className="team-photo">
        {photo ? <img src={optimize(photo, 420)} alt={name} loading="lazy" /> : <span aria-hidden="true">{initials}</span>}
      </div>
      <h3 className="team-name">{name}</h3>
      {designation && <p className="team-role">{designation}</p>}

      {(gh || li || email) && (
        <div className="team-links">
          {gh && <a className="team-link" href={gh} target="_blank" rel="noopener noreferrer" aria-label={`${name} on GitHub`}><GithubIcon /></a>}
          {li && <a className="team-link" href={li} target="_blank" rel="noopener noreferrer" aria-label={`${name} on LinkedIn`}><LinkedinIcon /></a>}
          {email && <a className="team-link" href={`mailto:${email}`} aria-label={`Email ${name}`}><MailIcon /></a>}
        </div>
      )}
    </article>
  );
}
