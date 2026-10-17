import {createContext,useContext,useEffect,useState} from 'react';
import {useRegisterSW} from 'virtual:pwa-register/react';
import {Download,RefreshCw,WifiOff,X} from 'lucide-react';
const InstallContext=createContext({installed:false,prompt:null,install:async()=>false});
export const usePWAInstall=()=>useContext(InstallContext);
export function useOnlineStatus(){
  const [online,setOnline]=useState(()=>typeof navigator==='undefined'||navigator.onLine);
  useEffect(()=>{const on=()=>setOnline(true),off=()=>setOnline(false);window.addEventListener('online',on);window.addEventListener('offline',off);return()=>{window.removeEventListener('online',on);window.removeEventListener('offline',off);};},[]);
  return online;
}
export function PWAProvider({children}){
  const [prompt,setPrompt]=useState(null);
  const [installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true);
  useEffect(()=>{
    const capture=e=>{e.preventDefault();setPrompt(e);};
    const didInstall=()=>{setInstalled(true);setPrompt(null);};
    window.addEventListener('beforeinstallprompt',capture);
    window.addEventListener('appinstalled',didInstall);
    return()=>{window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',didInstall);};
  },[]);
  const install=async()=>{if(!prompt)return false;await prompt.prompt();const choice=await prompt.userChoice;setPrompt(null);return choice.outcome==='accepted';};
  return <InstallContext.Provider value={{prompt,installed,install}}>{children}<PWAAlerts/></InstallContext.Provider>;
}
function PWAAlerts(){
  const online=useOnlineStatus();
  const {needRefresh:[needRefresh,setNeedRefresh],updateServiceWorker}=useRegisterSW({onRegisterError:e=>console.error('PWA worker registration:',e)});
  return <>
    {!online&&<div className="ep-pwa-banner" role="status"><WifiOff size={17}/> You're offline. Live financial actions require an internet connection.</div>}
    {needRefresh&&<aside className="ep-pwa-update" role="status"><div><strong>ExpensePlus update ready</strong><p className="text-xs text-muted">Refresh after saving any open form.</p></div><button className="btn-primary !py-2" onClick={()=>{if(window.confirm('Reload ExpensePlus now? Save any unfinished changes first.'))updateServiceWorker(true);}}><RefreshCw size={15}/> Update</button><button className="icon-button" aria-label="Later" onClick={()=>setNeedRefresh(false)}><X size={16}/></button></aside>}
  </>;
}
export function InstallAppCard(){
  const {prompt,installed,install}=usePWAInstall();
  const [showHelp,setShowHelp]=useState(false);
  const isiOS=/iPhone|iPad|iPod/.test(navigator.userAgent);
  return <section className="panel"><div className="flex items-center gap-3"><Download className="text-sage"/><h2 className="font-display text-2xl">Take ExpensePlus everywhere</h2></div><p className="subtext">Install ExpensePlus for quick access and a distraction-free experience. Financial actions still need a connection.</p>
    {installed?<p className="mt-4 text-sage">✓ Installed app experience active</p>:prompt?<button type="button" className="btn-primary mt-5" onClick={install}><Download size={16}/> Install ExpensePlus</button>:<><button type="button" className="btn-outline mt-4" onClick={()=>setShowHelp(v=>!v)}>How to install</button>{showHelp&&<p className="mt-3 text-sm text-muted">{isiOS?'Open this site in Safari, use the Share menu, then choose Add to Home Screen.':'Use the Install App option in your browser’s address bar or menu (if available). Installation varies by browser.'}</p>}</>}
  </section>;
}
