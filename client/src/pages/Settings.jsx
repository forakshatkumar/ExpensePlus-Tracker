import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {LogOut,Moon,ShieldCheck,Sun} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {useAppData} from '../components/layout/AppLayout';
import {api} from '../lib/api';
import {InstallAppCard} from '../components/pwa/PWAProvider';
import NotificationSettings from '../components/notifications/NotificationSettings';

export default function Settings(){
  const {notify}=useAppData();
  const {logout}=useAuth();
  const navigate=useNavigate();
  const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('expenseplus-theme')==='light'?'light':'dark';}catch{return 'dark';}});
  const [signingOut,setSigningOut]=useState(false);
  useEffect(()=>{document.documentElement.classList.toggle('light-theme',theme==='light');try{localStorage.setItem('expenseplus-theme',theme);}catch{}},[theme]);
  async function signOut(){
    setSigningOut(true);
    try{
      if('serviceWorker' in navigator){
        try{
          const registration=await navigator.serviceWorker.getRegistration();
          const subscription=await registration?.pushManager?.getSubscription();
          if(subscription){try{await api('/api/push/unregister',{method:'DELETE',body:JSON.stringify({endpoint:subscription.endpoint})});}catch(error){console.warn('Could not unregister push:',error.message);}await subscription.unsubscribe();}
        }catch(error){console.warn('Could not unsubscribe this device:',error.message);}
      }
      await logout();navigate('/login',{replace:true});
    }catch(error){notify(error.message,'error');}
    finally{setSigningOut(false);}
  }
  return <div className="space-y-6">
    <div><p className="eyebrow">Make it yours</p><h1 className="page-heading">Settings <span className="text-sage">✦</span></h1><p className="subtext">Set the mood, stay informed, and manage your app experience.</p></div>
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="panel"><div className="flex items-center gap-3"><Sun size={21} className="text-sage"/><h2 className="font-display text-2xl">Appearance</h2></div><p className="subtext">Choose the look that works best for you. Your preference stays on this device.</p>
        <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={()=>setTheme('dark')} aria-pressed={theme==='dark'} className={`btn-outline !rounded-xl ${theme==='dark'?'!border-sage !text-sage':''}`}><Moon size={17}/> Dark</button><button type="button" onClick={()=>setTheme('light')} aria-pressed={theme==='light'} className={`btn-outline !rounded-xl ${theme==='light'?'!border-sage !text-sage':''}`}><Sun size={17}/> Light</button></div>
      </section>
      <InstallAppCard/>
    </div>
    <NotificationSettings notify={notify}/>
    <section className="panel flex flex-wrap items-start justify-between gap-5"><div><div className="flex items-center gap-2"><ShieldCheck size={20} className="text-sage"/><h2 className="font-display text-2xl">Account & security</h2></div><p className="subtext">Your financial records are protected with Google Sign-In and authenticated API requests.</p><p className="mt-3 text-xs text-muted">Signing out also disconnects push notifications on this device where supported.</p></div><button type="button" className="btn-outline !border-terracotta/60 !text-terracotta hover:!bg-terracotta/10" onClick={signOut} disabled={signingOut}><LogOut size={17}/>{signingOut?'Signing out…':'Sign out'}</button></section>
  </div>;
}
