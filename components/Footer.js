import Link from 'next/link';
import { SITE } from '../lib/site';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand-col">
            <div className="footer-brand-head">
              <img
                src="/logo.jpg"
                alt="E-Club PESU official mark"
                width="36"
                height="36"
                className="logo-badge-consistent"
              />
              <div>
                <p className="footer-title">{SITE.name}</p>
                <p className="footer-campus">{SITE.campus}</p>
              </div>
            </div>
            <p className="footer-tagline">{SITE.tagline}</p>
          </div>

          <div className="footer-nav-cols">
            <div className="footer-col">
              <span className="footer-col-label">Explore</span>
              <Link href="/">Home</Link>
              <Link href="/events">Events</Link>
              <Link href="/announcements">Announcements</Link>
              <Link href="/about">About</Link>
            </div>

            <div className="footer-col">
              <span className="footer-col-label">Participate</span>
              <Link href="/join">Join the club</Link>
              <Link href="/status">Application status</Link>
              <a href={SITE.instagram} target="_blank" rel="noopener noreferrer">
                Instagram <span aria-hidden="true">↗</span>
              </a>
              <a href={SITE.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {SITE.name} · PES University</span>
          <span>Dream. Hustle. Start.</span>
        </div>
      </div>
    </footer>
  );
}
