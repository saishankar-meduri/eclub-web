import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "../../../../lib/firebaseAdmin";
import RegisterForm from "../../../../components/events/RegisterForm";

export const dynamic = "force-dynamic"; // open/closed depends on the current time
export const metadata = { title: "Event registration" };

const fmt = (d) =>
  d.toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" });

export default async function RegisterPage({ params }) {
  const { slug } = await params;
  const db = adminDb();
  const snap = await db.doc(`events/${slug}`).get();
  if (!snap.exists || !snap.data().published) notFound();
  const ev = snap.data();

  const deadline = ev.reg_deadline?.toDate?.() ?? null;
  let closed = null;
  if (ev.status === "past") closed = "This event has ended.";
  else if (!ev.reg_enabled) closed = "Registrations are not open for this event yet.";
  else if (deadline && deadline.getTime() < Date.now()) closed = "The registration deadline has passed.";

  let questions = [];
  if (!closed) {
    const qs = await db.collection(`events/${slug}/questions`).orderBy("order").get();
    questions = qs.docs.map((d) => {
      const q = d.data();
      return { id: d.id, label: q.label, type: q.type, options: q.options || [], required: !!q.required };
    });
  }

  const event = {
    slug,
    title: ev.title,
    fee: Number(ev.fee) || 0,
    reg_type: ev.reg_type === "team" ? "team" : "individual",
    team_size: Number(ev.team_size) || 1,
  };

  return (
    <div className="container section rc">
      <p className="rc-muted"><Link href={`/events/${slug}`}>← Back to event</Link></p>
      <h1>Register: {ev.title}</h1>
      <p className="rc-muted">
        {ev.date?.toDate && <>{fmt(ev.date.toDate())}{ev.venue ? ` · ${ev.venue}` : ""}</>}
        {deadline && !closed && <><br />Registration closes {fmt(deadline)}</>}
      </p>
      {closed ? (
        <div className="rc-card"><p>{closed}</p></div>
      ) : (
        <RegisterForm event={event} questions={questions} />
      )}
    </div>
  );
}
