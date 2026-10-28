"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export function useAuth() {
  const [state, set] = useState({ loading: true, user: null, profile: null });
  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        if (!user) return set({ loading: false, user: null, profile: null });
        let profile = null;
        try {
          const s = await getDoc(doc(db, "users", user.email.toLowerCase()));
          profile = s.exists() ? s.data() : null;
        } catch {}
        set({ loading: false, user, profile });
      }),
    []
  );
  return {
    ...state,
    signIn: () => signInWithPopup(auth, new GoogleAuthProvider()),
    signOut: () => signOut(auth),
    token: () => auth.currentUser.getIdToken(),
  };
}
