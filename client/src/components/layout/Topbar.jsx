import {useLocation} from 'react-router-dom';
import {Plus} from 'lucide-react';
import {pageTitles} from './navigation';
import NotificationBell from '../notifications/NotificationBell';
export default function Topbar({onAdd,notifications=[],onRead,onReadAll}){
  const {pathname}=useLocation();
  return <header className="ep-topbar">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex min-w-0 items-center gap-3 md:hidden">
        <img src="/icons/icon-64.png" alt="" width="38" height="38" className="h-9 w-9 rounded-xl object-cover"/>
        <span className="truncate font-display text-[19px] font-semibold tracking-tight text-cream">{pageTitles[pathname]||'ExpensePlus'}</span>
      </div>
      <div className="hidden md:block"><p className="text-[11px] uppercase tracking-[.19em] text-muted">Your money, in focus</p><h1 className="font-display text-[24px] font-semibold leading-7 tracking-tight text-cream">{pageTitles[pathname]||'ExpensePlus'}</h1></div>
    </div>
    <div className="flex items-center gap-2 sm:gap-3">
      <NotificationBell items={notifications} onRead={onRead} onReadAll={onReadAll}/>
      <button className="btn-primary !hidden !px-4 sm:!inline-flex" onClick={onAdd}><Plus size={17}/> Add expense</button>
    </div>
  </header>;
}
