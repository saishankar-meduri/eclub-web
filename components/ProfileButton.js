'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

let sdkPromise = null;
function loadAuthSdk() {
  if (!sdkPromise) {
    sdkPromise = Promise.all([
      import('../lib/firebase'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]).then(([fb, authMod, fsMod]) => ({
      auth: fb.auth,
      db: fb.db,
      onAuthStateChanged: authMod.onAuthStateChanged,
      signInWithPopup: authMod.signInWithPopup,
      GoogleAuthProvider: authMod.GoogleAuthProvider,
      signOut: authMod.signOut,
      doc: fsMod.doc,
      getDoc: fsMod.getDoc,
    }));
  }
  return sdkPromise;
}

export default function ProfileButton() {
  const pathname = usePathname();
  const [authState, setAuthState] = useState({ user: null, profile: null });
  const [open, setOpen] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);
  const [hintSelected, setHintSelected] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Defer Firebase Auth & Firestore initialization until after initial UI paint
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;
    let idleId;
    let timerId;

    const startAuth = () => {
      loadAuthSdk()
        .then((sdk) => {
          if (cancelled || !sdk) return;
          unsubscribe = sdk.onAuthStateChanged(sdk.auth, async (user) => {
            if (cancelled) return;
            if (!user) {
              setAuthState({ user: null, profile: null });
              return;
            }
            let profile = null;
            try {
              const snap = await sdk.getDoc(sdk.doc(sdk.db, 'users', user.email.toLowerCase()));
              profile = snap.exists() ? snap.data() : null;
            } catch {}
            if (!cancelled) setAuthState({ user, profile });
          });
        })
        .catch(() => {});
    };

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(startAuth, { timeout: 360 });
    } else {
      timerId = window.setTimeout(startAuth, 180);
    }

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
      if (idleId && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timerId) window.clearTimeout(timerId);
    };
  }, []);

  // Listen for local status-check selection hint when signed out
  useEffect(() => {
    function syncHint() {
      try {
        setHintSelected(sessionStorage.getItem('eclub-selected-hint') === '1');
      } catch {}
    }
    syncHint();
    window.addEventListener('eclub-tier-change', syncHint);
    return () => window.removeEventListener('eclub-tier-change', syncHint);
  }, []);

  // Fetch verified selection/admin tier when signed in
  useEffect(() => {
    let cancelled = false;
    if (!authState.user) {
      setServerInfo(null);
      return;
    }
    (async () => {
      try {
        const idToken = await authState.user.getIdToken();
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json().catch(() => null);
        if (!cancelled && data) setServerInfo(data);
      } catch {
        if (!cancelled) setServerInfo(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authState.user]);

  // Close popover on Escape or outside click
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
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

  const role = authState.profile?.role || serverInfo?.role;
  const domainId = authState.profile?.domainId || serverInfo?.domainId;
  const isAdmin = role === 'superadmin' || role === 'domainHead';
  const isSelected =
    !isAdmin &&
    (serverInfo?.tier === 'selected' ||
      authState.profile?.selected === true ||
      (!authState.user && hintSelected));

  const tier = isAdmin ? 'admin' : isSelected ? 'selected' : 'normal';
  const tierLabel =
    tier === 'admin'
      ? role === 'superadmin'
        ? 'Superadmin'
        : 'Admin'
      : tier === 'selected'
        ? 'Selected'
        : authState.user
          ? 'Member'
          : 'Guest';

  return (
    <div ref={wrapRef} className="profile-wrap">
      <button
        type="button"
        className={`profile-btn-rect profile-tier-${tier}`}
        onClick={() => {
          loadAuthSdk().catch(() => {});
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Account (${tierLabel})`}
        title={`Account · ${tierLabel}`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="3.6" />
          <path d="M5.2 19.6c1.5-3.1 3.9-4.6 6.8-4.6s5.3 1.5 6.8 4.6" />
        </svg>
      </button>

      {open && (
        <div className="profile-popover" role="dialog" aria-label="Account menu">
          {authState.user ? (
            <>
              <div className="profile-pop-head">
                <div className="profile-pop-identity">
                  <span className="profile-pop-name">
                    {authState.user.displayName || authState.user.email?.split('@')[0]}
                  </span>
                  <span className="profile-pop-email">{authState.user.email}</span>
                </div>
                <span className={`profile-tier-badge badge-tier-${tier}`}>{tierLabel}</span>
              </div>

              {tier === 'selected' && serverInfo?.shortlistedDomains?.length > 0 && (
                <p className="profile-pop-note">
                  Shortlisted for <strong>{serverInfo.shortlistedDomains.join(', ')}</strong>
                </p>
              )}

              <div className="profile-pop-links">
                {isAdmin && (
                  <>
                    {role === 'superadmin' && (
                      <Link href="/admin/superadmin" onClick={() => setOpen(false)}>
                        Superadmin console <span aria-hidden="true">→</span>
                      </Link>
                    )}
                    <Link href="/admin/recruitment" onClick={() => setOpen(false)}>
                      Recruitment panel <span aria-hidden="true">→</span>
                    </Link>
                    {(role === 'superadmin' || domainId === 'events') && (
                      <>
                        <Link href="/admin/events" onClick={() => setOpen(false)}>
                          Manage events <span aria-hidden="true">→</span>
                        </Link>
                        <Link href="/admin/announcements" onClick={() => setOpen(false)}>
                          Manage announcements <span aria-hidden="true">→</span>
                        </Link>
                      </>
                    )}
                  </>
                )}

                {!isAdmin && (
                  <>
                    <Link href="/status" onClick={() => setOpen(false)}>
                      Application status <span aria-hidden="true">→</span>
                    </Link>
                    <Link href="/join" onClick={() => setOpen(false)}>
                      Apply to a domain <span aria-hidden="true">→</span>
                    </Link>
                  </>
                )}
              </div>

              <button
                type="button"
                className="profile-pop-btn profile-pop-signout"
                onClick={async () => {
                  try {
                    const sdk = await loadAuthSdk();
                    await sdk.signOut(sdk.auth);
                  } catch {}
                  setOpen(false);
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="profile-pop-head">
                <div className="profile-pop-identity">
                  <span className="profile-pop-name">Account</span>
                  <span className="profile-pop-email">Sign in to view your role or status</span>
                </div>
                <span className={`profile-tier-badge badge-tier-${tier}`}>{tierLabel}</span>
              </div>

              <button
                type="button"
                className="profile-pop-btn profile-pop-signin"
                onClick={async () => {
                  try {
                    const sdk = await loadAuthSdk();
                    await sdk.signInWithPopup(sdk.auth, new sdk.GoogleAuthProvider());
                    setOpen(false);
                  } catch {}
                }}
              >
                Sign in with Google
              </button>

              <div className="profile-pop-links">
                <Link href="/status" onClick={() => setOpen(false)}>
                  Check application status <span aria-hidden="true">→</span>
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
