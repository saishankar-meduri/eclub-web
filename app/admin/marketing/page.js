"use client";
import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { isMarketingDomain } from "../../../lib/constants";
import AdminGate from "../../../components/AdminGate";
import MarketingEmail from "../../../components/recruitment/MarketingEmail";

export default function Page() {
  return <AdminGate roles={["superadmin", "domainHead"]}>{(auth) => <Panel auth={auth} />}</AdminGate>;
}

function Panel({ auth }) {
  const isSuper = auth.profile.role === "superadmin";
  const [allowed, setAllowed] = useState(isSuper ? true : null); // null = still checking
  const [domains, setDomains] = useState([]);

  useEffect(() => {
    if (isSuper) return;
    const id = auth.profile.domainId;
    if (!id) return setAllowed(false);
    getDoc(doc(db, "domains", id))
      .then((s) => setAllowed(isMarketingDomain(id, s.data()?.name)))
      .catch(() => setAllowed(isMarketingDomain(id, "")));
  }, [isSuper, auth.profile.domainId]);

  useEffect(() => {
    if (!allowed) return;
    const q = isSuper ? collection(db, "domains") : query(collection(db, "domains"), where("open", "==", true));
    getDocs(q)
      .then((s) => setDomains(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, [allowed, isSuper]);

  return (
    <>
      <div className="rc-row">
        <h1>Marketing emails</h1>
        <span className="rc-muted">{auth.user.email} ({auth.profile.role})</span>
        <a className="rc-btn ghost" href={isSuper ? "/admin/superadmin" : "/admin/recruitment"}>Back</a>
        <button className="rc-btn ghost" onClick={auth.signOut}>Sign out</button>
      </div>
      {allowed === null && <p className="rc-muted">Loading…</p>}
      {allowed === false && <p className="rc-err">Only superadmins and the Social Media and Marketing head can send marketing emails.</p>}
      {allowed && <MarketingEmail auth={auth} domains={domains} />}
    </>
  );
}
