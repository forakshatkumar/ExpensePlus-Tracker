import {useEffect, useRef} from 'react';
import {Link} from 'react-router-dom';
import {X} from 'lucide-react';
import NavigationItems from './NavigationItems';
import {Avatar,Brand} from './Sidebar';
export default function MobileDrawer({open,onClose,profile,user,returnFocusRef}) {
  const ref=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const prev=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const handleKey=e=>{
      if(e.key==='Escape'){e.preventDefault();onClose();}
      if(e.key==='Tab'){
        const nodes=[...ref.current.querySelectorAll('a[href],button:not([disabled])')];
        if(!nodes.length)return;
        if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus();}
        else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus();}
      }
    };
    document.addEventListener('keydown',handleKey);
    ref.current?.querySelector('button')?.focus();
    const mq=window.matchMedia('(min-width: 768px)');
    const closeAtLarge=()=>{if(mq.matches)onClose();};
    mq.addEventListener('change',closeAtLarge);
    return ()=>{document.body.style.overflow=prev;document.removeEventListener('keydown',handleKey);mq.removeEventListener('change',closeAtLarge);returnFocusRef?.current?.focus();};
  },[open,onClose,returnFocusRef]);
  return <div className={`ep-drawer-wrap ${open?'ep-drawer-open':''}`} aria-hidden={!open}>
    <div className="ep-drawer-backdrop" onClick={onClose}/>
    <aside ref={ref} id="expenseplus-mobile-navigation" role="dialog" aria-modal="true" aria-label="Mobile navigation" inert={!open} className="ep-mobile-drawer">
      <div className="flex items-center justify-between mb-9"><Brand/><button onClick={onClose} aria-label="Close menu" className="icon-button"><X size={21}/></button></div>
      <NavigationItems onNavigate={onClose}/>
      <Link to="/profile" onClick={onClose} className="mt-auto flex items-center gap-3 border-t border-line pt-5"><Avatar user={user} profile={profile}/><div className="min-w-0"><p className="truncate text-sm font-semibold">{profile?.name||user?.displayName||'Member'}</p><p className="text-xs text-muted">Profile & settings ↗</p></div></Link>
    </aside>
  </div>;
}
