import {Link, useLocation} from 'react-router-dom';
import {Menu,Plus} from 'lucide-react';
import {Avatar} from './Sidebar';
import {pageTitles} from './navigation';
export default function Topbar({profile,user,onMenu,menuRef,onAdd,drawerOpen=false}){
  const {pathname}=useLocation();
  return <header className="ep-topbar">
    <div className="flex min-w-0 items-center gap-3">
      <button ref={menuRef} onClick={onMenu} aria-label="Open navigation menu" aria-controls="expenseplus-mobile-navigation" aria-expanded={drawerOpen} className="icon-button mobile-menu-trigger"><Menu size={22}/></button>
      <span className="whitespace-nowrap font-display text-[19px] text-cream md:hidden">Expense<span className="text-terracotta">Plus.</span></span>
      <div className="hidden md:block"><p className="text-[11px] uppercase tracking-[.19em] text-muted">Your money, in focus</p><h1 className="font-display text-[24px] leading-7 text-cream">{pageTitles[pathname]||'ExpensePlus'}</h1></div>
    </div>
    <div className="flex items-center gap-2 sm:gap-3">
      <button className="btn-primary !hidden !px-4 sm:!inline-flex" onClick={onAdd}><Plus size={17}/> Add expense</button>
      <Link to="/profile" className="flex items-center gap-2 rounded-full border border-line bg-card p-1 pr-1 sm:pr-3 transition hover:border-sage/60" aria-label="Go to profile">
        <Avatar user={user} profile={profile} size="h-9 w-9"/>
        <span className="hidden max-w-32 truncate text-sm text-cream lg:block">{profile?.name||user?.displayName||'Member'}</span>
      </Link>
    </div>
  </header>;
}
