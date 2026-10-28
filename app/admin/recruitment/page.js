"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import AdminGate from "../../../components/AdminGate";
import DomainSettings from "../../../components/recruitment/DomainSettings";
import QuestionsEditor from "../../../components/recruitment/QuestionsEditor";
import Applicants from "../../../components/recruitment/Applicants";

export default function Page() {
  return <AdminGate roles={["superadmin", "domainHead"]}>{(auth) => <Panel auth={auth} />}</AdminGate>;
}

function Panel({ auth }) {
  const isSuper = auth.profile.role === "superadmin";
  const [domains, setDomains] = useState([]);
  const [domainId, setDomainId] = useState(isSuper ? "" : auth.profile.domainId);
  const [tab, setTab] = useState("applicants");

  useEffect(() => {
    if (!isSuper) return;
    getDocs(collection(db, "domains")).then((s) => {
      const list = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDomains(list);
      const want = new URLSearchParams(window.location.search).get("domain");
      setDomainId(list.find((d) => d.id === want)?.id || list[0]?.id || "");
    });
  }, [isSuper]);

  return (
    <>
      <div className="rc-row">
        <h1>Recruitment</h1>
        <span className="rc-muted">{auth.user.email} ({auth.profile.role})</span>
        <button className="rc-btn ghost" onClick={auth.signOut}>Sign out</button>
      </div>
      {isSuper && (
        <select value={domainId} onChange={(e) => setDomainId(e.target.value)}>
          {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      )}
      {!domainId ? (
        <p className="rc-muted">No domain assigned to your account yet. Ask the superadmin.</p>
      ) : (
        <>
          <div className="rc-tabs">
            {[["applicants", "Applicants"], ["questions", "Questions"], ["settings", "Domain settings"]].map(([k, l]) => (
              <button key={k} className={`rc-btn ${tab === k ? "" : "ghost"}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          {tab === "applicants" && <Applicants key={domainId} domainId={domainId} auth={auth} />}
          {tab === "questions" && <QuestionsEditor key={domainId} domainId={domainId} />}
          {tab === "settings" && <DomainSettings key={domainId} domainId={domainId} />}
        </>
      )}
    </>
  );
}
