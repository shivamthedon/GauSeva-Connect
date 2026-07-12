import { useState, useEffect, useMemo } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";

export function useAuth() {
  // Seed from currentUser if Firebase already restored session (cuts auth lag)
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = useState(() => !auth.currentUser);

  useEffect(() => {
    // If session already present, mark ready immediately
    if (auth.currentUser) {
      setUser(auth.currentUser);
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Memoize so the returned object keeps a stable reference across re-renders.
  const mappedUser = useMemo(
    () =>
      user
        ? {
            uid: user.uid,
            id: user.uid,
            email: user.email || "",
            displayName: user.displayName || "Gau Sevak",
            name: user.displayName || "Gau Sevak",
            phoneNumber: user.phoneNumber || "",
            photoURL: user.photoURL,
            imageUrl: user.photoURL,
          }
        : null,
    [user],
  );

  return {
    user: mappedUser,
    loading,
  };
}
