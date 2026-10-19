import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ArrowLeft,Bell,Check,ChevronRight,Download,LogOut,Moon,Palette,Sun,UserRound} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {useAppData} from '../components/layout/AppLayout';
import {useTheme} from '../context/ThemeContext';
import {themeList} from '../themeConfig';
import {api} from '../lib/api';
import {usePWAInstall} from '../components/pwa/PWAProvider';
import NotificationSettings from '../components/notifications/NotificationSettings';
import PageHeader from '../components/ui/PageHeader';
function Row({Icon,label,value,onClick,danger=false,disabled=false}){
  return <button type="button" className={`v31-settings-row ${danger?'v31-settings-danger':''}`} onClick={onClick} disabled={disabled}>
    <span className="v31-settings-icon"><Icon size={19}/></span><span className="v31-settings-label">{label}</span>{value&&<span className="v31-settings-value">{value}</span>}<ChevronRight size={17} aria-hidden="true" className="v31-settings-chevron"/>
  </button>;
}
function Group({label,children}){return <section className="v31-settings-group"><h2>{label}</h2><div className="v31-settings-list">{children}</div></section>;}
export default function Settings(){
  const {notify}=useAppData();const {logout}=useAuth();const navigate=useNavigate();
  const {themeId,setTheme,mode,setMode}=useTheme();const {prompt,installed,install}=usePWAInstall();
  const [panel,setPanel]=useState('');const [signingOut,setSigningOut]=useState(false);
  const [installHelp,setInstallHelp]=useState(false);
  const [alertsEnabled,setAlertsEnabled]=useState(null);
  useEffect(()=>{let active=true;api('/api/notifications/preferences').then(r=>{if(active)setAlertsEnabled(Boolean(r.preferences?.inAppBudgetAlerts));}).catch(()=>{});return()=>{active=false;};},[panel]);
  async function signOut(){
    if(signingOut)return;setSigningOut(true);
    try{
      if('serviceWorker'in navigator){try{const reg=await navigator.serviceWorker.getRegistration();const sub=await reg?.pushManager?.getSubscription();if(sub){await api('/api/push/unregister',{method:'DELETE',body:JSON.stringify({endpoint:sub.endpoint})}).catch(()=>{});await sub.unsubscribe();}}catch(e){console.warn('Could not unsubscribe push:',e);}}
      await logout();navigate('/login',{replace:true});
    }catch(e){notify(e.message,'error');setSigningOut(false);}
  }
  async function installApp(){if(prompt){try{await install();}catch(e){notify(e.message,'error');}}else setInstallHelp(v=>!v);}
  const themeName=themeList.find(t=>t.id===themeId)?.name||'Dayform Neon';
  return <div className="v3-page v31-settings-page">
    {panel?<div className="v31-settings-detail">
      <button className="v31-back-button" type="button" onClick={()=>setPanel('')}><ArrowLeft size={17}/> Settings</button>
      <h1 className="v31-settings-detail-title">{panel==='theme'?'Choose theme':'Notifications'}</h1>
      {panel==='theme'?<div className="v31-settings-list" role="radiogroup" aria-label="Theme">
        {themeList.map(theme=><button key={theme.id} type="button" role="radio" aria-checked={themeId===theme.id} className="v31-settings-row" onClick={()=>{setTheme(theme.id);setPanel('');}}><span className="v31-settings-label">{theme.name}</span>{themeId===theme.id&&<Check size={19} className="text-sage"/>}</button>)}
      </div>:<NotificationSettings notify={notify}/>}
    </div>:<>
      <PageHeader eyebrow="PREFERENCES" title="Settings" description="A little more your way."/>
      <Group label="Appearance">
        <Row Icon={Palette} label="Theme" value={themeName} onClick={()=>setPanel('theme')}/>
        <div className="v31-settings-row"><span className="v31-settings-icon">{mode==='dark'?<Moon size={19}/>:<Sun size={19}/>}</span><span className="v31-settings-label">Appearance</span><div className="v31-segment" role="group" aria-label="Appearance mode"><button type="button" aria-pressed={mode==='light'} onClick={()=>setMode('light')}>Light</button><button type="button" aria-pressed={mode==='dark'} onClick={()=>setMode('dark')}>Dark</button></div></div>
      </Group>
      <Group label="Preferences"><Row Icon={Bell} label="Notifications" value={alertsEnabled===null?undefined:alertsEnabled?'On':'Off'} onClick={()=>setPanel('notifications')}/></Group>
      <Group label="Application"><Row Icon={Download} label="Install ExpensePlus" value={installed?'Installed':undefined} onClick={installApp} disabled={installed}/>{installHelp&&<p className="v31-settings-help">{(/iPhone|iPad|iPod/.test(navigator.userAgent))?'Open in Safari, tap Share, then Add to Home Screen.':'Open your browser menu and select Install App if available.'}</p>}</Group>
      <Group label="Account"><Row Icon={UserRound} label="Profile" onClick={()=>navigate('/profile')}/><Row Icon={LogOut} label={signingOut?'Signing out…':'Sign out'} danger disabled={signingOut} onClick={signOut}/></Group>
    </>}
  </div>;
}
