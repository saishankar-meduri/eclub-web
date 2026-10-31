import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page-shell">
      <section className="container ed-not-found">
        <span className="ed-eyebrow">404 · Not found</span>
        <h1 className="ed-page-title">This page doesn&apos;t exist.</h1>
        <p className="ed-page-sub">
          The link you followed may have moved, or the page hasn&apos;t been published yet.
        </p>
        <div className="ed-actions">
          <Link href="/" className="btn-pill-primary">
            Back to home <span className="btn-arrow" aria-hidden="true">→</span>
          </Link>
          <Link href="/events" className="btn-pill-secondary">
            Explore events
          </Link>
        </div>
      </section>
    </div>
  );
}
