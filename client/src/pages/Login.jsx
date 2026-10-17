import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ArrowRight, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";
export default function Login() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  if (loading) return <div className="grid min-h-screen place-items-center">Loading…</div>;
  if (user) return <Navigate to={location.state?.from || "/dashboard"} replace/>;
  async function signIn() { setWorking(true); setError(""); try { await login(); } catch (e) { setError(e.message); } finally { setWorking(false); } }
  return <main className="grid min-h-screen place-items-center px-4 py-10"><div className="panel w-full max-w-lg space-y-8 p-8 md:p-12"><div className="inline-flex items-center gap-2 font-display text-xl"><span className="grid h-9 w-9 place-items-center rounded-xl bg-sage text-espresso"><Wallet size={19}/></span>Expense<span className="text-terracotta">Plus.</span></div><div><p className="eyebrow">A calmer kind of money management</p><h1 className="mt-3 font-display text-5xl leading-tight">Your money,<br/><span className="text-sage">in a better place.</span></h1><p className="subtext">See the patterns, shape the habits, celebrate the progress. All in one beautiful place.</p></div><div><button disabled={working} onClick={signIn} className="btn-primary w-full">{working ? "Connecting…" : "Continue with Google"}<ArrowRight size={17}/></button>{error && <p role="alert" className="mt-4 text-sm text-terracotta">{error}</p>}</div><p className="text-xs text-muted">ExpensePlus uses Google Authentication to protect your financial records.</p></div></main>;
}
