import {useEffect,useState} from 'react';
import {Bell,ShieldAlert} from 'lucide-react';
import {api} from '../../lib/api';
import {useOnlineStatus} from '../pwa/PWAProvider';
const INITIAL={inAppBudgetAlerts:true,thresholds:[50,75,90,100],pushEnabled:false};
function toUint8Array(base64){const padding='='.repeat((4-base64.length%4)%4);const decoded=atob((base64+padding).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(decoded,c=>c.charCodeAt(0));}
export default function NotificationSettings({notify}){
  const [prefs,setPrefs]=useState(INITIAL);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [deviceSubscribed,setDeviceSubscribed]=useState(false);const [permission,setPermission]=useState(typeof Notification!=='undefined'?Notification.permission:'unsupported');
  const online=useOnlineStatus();
  const [vapidPublic,setVapidPublic]=useState(null);
  useEffect(()=>{api('/api/push/config').then(r=>setVapidPublic(r.publicKey||null)).catch(()=>{});},[]);
  useEffect(()=>{if('serviceWorker' in navigator)navigator.serviceWorker.getRegistration().then(r=>r?.pushManager?.getSubscription()).then(s=>setDeviceSubscribed(Boolean(s))).catch(()=>{});},[]);
  useEffect(()=>{api('/api/notifications/preferences').then(r=>setPrefs(r.preferences)).catch(e=>notify(e.message,'error')).finally(()=>setLoading(false));},[]);
  async function update(next){setSaving(true);try{const r=await api('/api/notifications/preferences',{method:'PUT',body:JSON.stringify(next)});setPrefs(r.preferences);notify('Notification preferences saved.');}catch(e){notify(e.message,'error');}finally{setSaving(false);}}
  async function togglePush(){
    setSaving(true);
    try{
      if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw new Error('Web Push is unavailable in this browser. In-app alerts still work.');
      // Ask permission inside the original user-click task, not after an API fetch.
      const permissionRequest=!deviceSubscribed?Notification.requestPermission():null;
      const registration=await navigator.serviceWorker.getRegistration();
      if(!registration?.active)throw new Error('Install or reload the PWA after its service worker is registered.');
      if(deviceSubscribed){
        const subscription=await registration.pushManager.getSubscription();
        if(subscription){await api('/api/push/unregister',{method:'DELETE',body:JSON.stringify({endpoint:subscription.endpoint})});await subscription.unsubscribe();}
        else await api('/api/notifications/preferences',{method:'PUT',body:JSON.stringify({pushEnabled:false})});
        setDeviceSubscribed(false);setPrefs(p=>({...p,pushEnabled:false}));notify('Notifications disabled on this device.');
      }else{
        const status=await permissionRequest;setPermission(status);
        if(status!=='granted')throw new Error('Notifications were not allowed. In-app budget alerts remain available.');
        const key=vapidPublic||(await api('/api/push/config')).publicKey;
        if(!key)throw new Error('Push requires VAPID keys on the backend. See the deployment guide.');
        let subscription=await registration.pushManager.getSubscription();
        if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:toUint8Array(key)});
        await api('/api/push/register',{method:'POST',body:JSON.stringify({subscription:subscription.toJSON()})});
        setDeviceSubscribed(true);setPrefs(p=>({...p,pushEnabled:true}));notify('Device notifications enabled.');
      }
    }catch(e){notify(e.message,'error');}finally{setSaving(false);}
  }
  return <section className="v31-subsettings"><div className="flex items-center gap-2"><Bell size={18} className="text-sage"/><h2 className="font-semibold text-base">Budget alerts</h2></div><p className="mt-2 text-xs text-muted">Choose the alerts that are useful to you.</p>
    {loading?<p className="mt-4 text-sm text-muted">Loading preferences…</p>:<div className="mt-5 space-y-4">
      <label className="flex items-center justify-between gap-3 text-sm">In-app budget alerts <input type="checkbox" className="h-5 w-5 accent-sage" checked={prefs.inAppBudgetAlerts} disabled={saving||!online} onChange={e=>update({inAppBudgetAlerts:e.target.checked})}/></label>
      <fieldset><legend className="field-label">Notify me at</legend><div className="mt-2 flex flex-wrap gap-4">{[50,75,90,100].map(value=><label key={value} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-sage" checked={prefs.thresholds.includes(value)} disabled={saving||!online} onChange={e=>update({thresholds:e.target.checked?[...prefs.thresholds,value]:prefs.thresholds.filter(v=>v!==value)})}/>{value}%</label>)}</div></fieldset>
      <div className="rounded-xl border border-line p-4"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold">Device notifications (optional)</p><p className="text-xs text-muted">Browser status: {permission}. Supported devices only.</p></div><button type="button" className="btn-outline !px-3 !py-2 text-xs" disabled={saving||!online} onClick={togglePush}>{deviceSubscribed?'Disable':'Enable'}</button></div><p className="mt-3 flex gap-2 text-xs text-muted"><ShieldAlert size={14}/> Some browsers, including iOS, require installing the PWA before device push works. In-app alerts work without permission.</p></div>
    </div>}
  </section>;
}
