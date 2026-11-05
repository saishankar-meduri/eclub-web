"use client";
import AdminGate from "../../../components/AdminGate";
import RecruitmentWindow from "../../../components/recruitment/RecruitmentWindow";

export default function Page() {
  return (
    <AdminGate roles={["superadmin"]}>
      {(auth) => (
        <>
          <div className="rc-row">
            <h1>Recruitment window</h1>
            <a className="rc-btn ghost" href="/admin/superadmin">Back</a>
            <button className="rc-btn ghost" onClick={auth.signOut}>Sign out</button>
          </div>
          <RecruitmentWindow />
        </>
      )}
    </AdminGate>
  );
}
