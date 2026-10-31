'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SITE } from '../lib/site';
import ThemeToggle from './ThemeToggle';
import ProfileButton from './ProfileButton';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/announcements', label: 'Announcements' },
  { href: '/about', label: 'About' },
  { href: '/join', label: 'Join' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onPointerDown(e) {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const isActive = (href) =>
    href === '/' ? pathname === '/' : Boolean(pathname?.startsWith(href));

  return (
    <header ref={headerRef} className="nav">
      <div className="nav-wide">
        <Link href="/" className="brand">
          <span className="brand-name">{SITE.name}</span>
        </Link>

        <div className="nav-right">
          <nav
            id="nav-links"
            className={`nav-pill${open ? ' open' : ''}`}
            aria-label="Main"
          >
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="nav-pill-link"
                aria-current={isActive(href) ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
            <ThemeToggle className="nav-theme-btn" />
          </nav>

          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="nav-links"
            onClick={() => setOpen((o) => !o)}
          >
            <span>{open ? 'Close' : 'Menu'}</span>
          </button>

          <ProfileButton />
        </div>
      </div>
    </header>
  );
}
