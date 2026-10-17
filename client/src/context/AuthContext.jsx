import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, (next) => { setUser(next); setLoading(false); }), []);
  const login = async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch (error) {
      if (error.code === "auth/popup-blocked") return signInWithRedirect(auth, googleProvider);
      throw error;
    }
  };
  return <AuthContext.Provider value={{ user, loading, login, logout: () => signOut(auth) }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be inside AuthProvider");
  return context;
}
