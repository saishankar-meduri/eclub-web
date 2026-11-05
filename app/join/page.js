"use client";
import JoinForm from "./JoinForm";
import { useRecruitmentWindow, RecruitmentBanner, RecruitmentClosed } from "../../components/RecruitmentTimer";

// Thin gate in front of the application form. The real form lives in ./JoinForm.js.
// (Firestore rules also reject applications outside the window, so this is not just cosmetic.)
export default function JoinPage() {
  const win = useRecruitmentWindow();
  if (win.state === "loading") return <div style={{ minHeight: "60vh" }} />;
  if (win.state === "before" || win.state === "closed") return <RecruitmentClosed win={win} />;
  return (
    <>
      <RecruitmentBanner win={win} />
      <JoinForm />
    </>
  );
}
