import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {LogOut,ShieldCheck} from 'lucide-react';
import ThemeAppearance from '../components/settings/ThemeAppearance';
import {useAuth} from '../context/AuthContext';
import {useAppData} from '../components/layout/AppLayout';
import {api} from '../lib/api';
import {InstallAppCard} from '../components/pwa/PWAProvider';
import NotificationSettings from '../components/notifications/NotificationSettings';
import PageHeader from '../components/ui/PageHeader';

export default function Settings(){
  const {notify}=useAppData();
  const {logout}=useAuth();
  const navigate=useNavigate();
  const [signingOut,setSigningOut]=useState(false);
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
  return <div className="v3-page v3-settings">
    <PageHeader eyebrow="YOUR WORKSPACE" title="Settings" description="A few thoughtful ways to make this yours."/>
    <ThemeAppearance/>
    <div className="v3-settings-grid">
      <div className="min-w-0"><NotificationSettings notify={notify}/></div>
      <div className="min-w-0"><InstallAppCard/></div>
    </div>
    <section className="panel v3-settings-account flex flex-wrap items-start justify-between gap-5"><div><div className="flex items-center gap-2"><ShieldCheck size={20} className="text-sage"/><h2 className="font-display text-2xl">Account & security</h2></div><p className="subtext">Your financial records are protected with Google Sign-In and authenticated API requests.</p><p className="mt-3 text-xs text-muted">Signing out also disconnects push notifications on this device where supported.</p></div><button type="button" className="btn-outline !border-terracotta/60 !text-terracotta hover:!bg-terracotta/10" onClick={signOut} disabled={signingOut}><LogOut size={17}/>{signingOut?'Signing out…':'Sign out'}</button></section>
  </div>;
}
