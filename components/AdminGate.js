"use client";
import { useAuth } from "../lib/useAuth";

export default function AdminGate({ roles, allow = () => true, children }) {
  const a = useAuth();
  if (a.loading) return <div className="container section rc"><p className="rc-muted">Loading…</p></div>;
  if (!a.user)
    return (
      <div className="container section rc">
        <div className="rc-card">
          <p>Sign in to continue.</p>
          <button className="rc-btn" onClick={a.signIn}>Sign in with Google</button>
        </div>
      </div>
    );
  if (!a.profile || !roles.includes(a.profile.role) || !allow(a.profile))
    return (
      <div className="container section rc">
        <div className="rc-card">
          <p>{a.user.email} does not have access to this page.</p>
          <button className="rc-btn" onClick={a.signOut}>Sign out</button>
        </div>
      </div>
    );
  return <div className="container section rc">{children(a)}</div>;
}
