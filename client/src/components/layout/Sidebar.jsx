import {Link,NavLink} from 'react-router-dom';
import {ChevronLeft, ChevronRight, UserRound, Settings2} from 'lucide-react';
import NavigationItems from './NavigationItems';
export function Avatar({profile,user,size='h-9 w-9'}){
  const pic=profile?.profilePicture||user?.photoURL;
  const name=profile?.name||user?.displayName||'Member';
  return pic?<img className={`${size} shrink-0 rounded-full border border-sage/30 object-cover`} src={pic} alt="" referrerPolicy="no-referrer"/>:<span className={`${size} grid shrink-0 place-items-center rounded-full bg-sage/20 text-sage`}><UserRound size={19}/></span>;
}
export function Brand({compact=false}){
  return <Link to="/dashboard" aria-label="ExpensePlus Dashboard" title={compact?'ExpensePlus':undefined} className={`flex items-center ${compact?'justify-center':'gap-3'} text-cream`}>
    <img src="/icons/icon-192.png" width="44" height="44" alt="" className="h-11 w-11 shrink-0 rounded-2xl object-cover"/>
    {!compact&&<span className="whitespace-nowrap font-display text-[22px] font-semibold">Expense<span className="text-terracotta">Plus.</span></span>}
  </Link>;
}
export default function Sidebar({collapsed,setCollapsed,profile,user}) {
  return <aside className={`ep-sidebar ${collapsed?'ep-sidebar-collapsed':''}`} aria-label="Application sidebar">
    <div className="flex items-center justify-between gap-2 px-2 py-2"><Brand compact={collapsed}/>{!collapsed&&<button type="button" onClick={()=>setCollapsed(true)} className="icon-button" aria-label="Collapse sidebar" title="Collapse sidebar"><ChevronLeft size={18}/></button>}</div>
    {collapsed&&<button type="button" className="icon-button my-4 self-center" aria-label="Expand sidebar" title="Expand sidebar" onClick={()=>setCollapsed(false)}><ChevronRight size={18}/></button>}
    {!collapsed&&<p className="my-5 px-4 text-[10px] font-bold uppercase tracking-[.2em] text-muted">Your workspace</p>}
    <div className={collapsed?'mt-8':'mt-1'}><NavigationItems collapsed={collapsed}/></div>
    <div className="mt-auto space-y-2 border-t border-line/80 pt-4">
      <NavLink to="/settings" title={collapsed?'Settings':undefined} aria-label={collapsed?'Settings':undefined} className={({isActive})=>`nav-item ${isActive?'nav-item-active':''} ${collapsed?'justify-center':''}`}>
        <Settings2 size={19} strokeWidth={1.8}/><span className={collapsed?'sr-only':''}>Settings</span>
      </NavLink>
      <Link to="/profile" title={collapsed?'Profile':undefined} aria-label={collapsed?'Profile':undefined} className={`flex items-center rounded-2xl p-2.5 transition hover:bg-card-soft ${collapsed?'justify-center':'gap-3'}`}>
        <Avatar profile={profile} user={user}/>
        {!collapsed&&<div className="min-w-0"><p className="truncate text-sm font-semibold text-cream">{profile?.name||user?.displayName||'Member'}</p><p className="text-xs text-muted">View profile ↗</p></div>}
      </Link>
    </div>
  </aside>;
}
