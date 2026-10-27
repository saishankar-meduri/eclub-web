import { SITE } from '../lib/site';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <p className="footer-title">{SITE.name}</p>
          <p className="muted">{SITE.campus}</p>
        </div>
        <div className="footer-links">
          <a href={SITE.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href={SITE.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </div>
      </div>
    </footer>
  );
}
