import {useState} from 'react';
import {Navigate,useLocation} from 'react-router-dom';
import {ArrowRight,Check,ShieldCheck,Sparkles} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
export default function Login(){
  const {user,loading,login}=useAuth();
  const location=useLocation();
  const [error,setError]=useState('');
  const [working,setWorking]=useState(false);
  if(loading)return <div className="grid min-h-screen place-items-center" role="status">Preparing your workspace…</div>;
  if(user)return <Navigate to={location.state?.from||'/dashboard'} replace/>;
  async function signIn(){setWorking(true);setError('');try{await login();}catch(e){setError(e.message);}finally{setWorking(false);}}
  return <main className="v3-login">
    <div className="v3-login-content">
      <header className="v3-login-brand"><img src="/icons/icon-64.png" width="44" height="44" alt="" className="rounded-xl"/><span>expenseplus<span className="text-sage">.</span></span></header>
      <div className="v3-login-message"><p className="v3-overline">YOUR PERSONAL MONEY SPACE</p><h1>Understand your money.<br/><span>Feel more in control.</span></h1><p>Spend thoughtfully, see your patterns, and build better habits. A beautifully simple place to manage your everyday expenses.</p></div>
      <div className="v3-login-values"><span><Check size={16}/> Clear spending insights</span><span><Check size={16}/> Thoughtful budgets</span><span><Check size={16}/> Your data, your account</span></div>
      <p className="v3-login-foot">A little clarity, every day.</p>
    </div>
    <div className="v3-login-auth"><div className="v3-login-auth-card"><div className="v3-login-auth-mark"><Sparkles size={24}/></div><p className="v3-overline">WELCOME IN</p><h2>Let's get started.</h2><p>Sign in securely to continue to your ExpensePlus workspace.</p><button type="button" disabled={working} onClick={signIn} className="btn-primary v3-login-signin">{working?'Connecting…':'Continue with Google'}<ArrowRight size={17}/></button>{error&&<p role="alert" className="v3-form-error mt-4">{error}</p>}<div className="v3-login-security"><ShieldCheck size={16}/><span>Authenticated with Google. Your financial records remain separate from other accounts.</span></div></div></div>
  </main>;
}
