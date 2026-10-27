'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import ThemeToggle from './ThemeToggle';

const LINKS = [
  ['/', 'Home'],
  ['/events', 'Events'],
  ['/announcements', 'Announcements'],
  ['/about', 'About'],
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="brand">
          <img src="/logo.jpg" alt="" width="36" height="36" />
          <span>E-Club PESU</span>
        </Link>
        <nav id="nav-links" className={`nav-links${open ? ' open' : ''}`} aria-label="Main">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          <button
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="nav-links"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>
    </header>
  );
}
