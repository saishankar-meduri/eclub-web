import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container section">
      <h1>Page not found</h1>
      <p className="muted">That page doesn&apos;t exist or isn&apos;t published yet.</p>
      <p><Link href="/events" className="text-link">Go to events</Link></p>
    </div>
  );
}
