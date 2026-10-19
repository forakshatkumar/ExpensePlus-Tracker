import {useLocation} from 'react-router-dom';
import {Plus,ChevronRight} from 'lucide-react';
import {pageTitles} from './navigation';
import NotificationBell from '../notifications/NotificationBell';
import ThemeQuickSwitcher from './ThemeQuickSwitcher';
export default function Topbar({onAdd,notifications=[],onRead,onReadAll}){
  const {pathname}=useLocation();
  return <header className="ep-topbar">
    <div className="v3-topbar-location" aria-label="Current workspace location">
      <img src="/icons/icon-64.png" alt="" width="36" height="36" className="v3-topbar-brandmark"/>
      <span className="v3-topbar-brand">expenseplus<span className="text-sage">.</span></span>
      <ChevronRight size={15} className="v3-topbar-divider" aria-hidden="true"/>
      <span className="v3-topbar-page">{pageTitles[pathname]||'Workspace'}</span>
    </div>
    <div className="flex items-center gap-1.5 sm:gap-2.5">
      <ThemeQuickSwitcher/>
      <NotificationBell items={notifications} onRead={onRead} onReadAll={onReadAll}/>
      <button className="btn-primary !hidden !px-4 md:!inline-flex" onClick={onAdd} title="Add expense (N)"><Plus size={17}/> Add expense</button>
    </div>
  </header>;
}
