
import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import {
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "firebase/auth";

import { auth, googleProvider } from "../lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
      },
      (error) => {
        console.error("Auth state error:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      return result.user;
    } catch (error) {
      console.error("Google Sign-In failed:", error.code, error);

      if (error.code === "auth/popup-blocked") {
        throw new Error(
          "Google popup was blocked. Allow popups for this website."
        );
      }

      if (error.code === "auth/unauthorized-domain") {
        throw new Error(
          "This Vercel domain is not authorized in Firebase."
        );
      }

      throw new Error(
        `${error.code || "Authentication error"}: ${error.message}`
      );
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be inside AuthProvider");
  }

  return context;
}
