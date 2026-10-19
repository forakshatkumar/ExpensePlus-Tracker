import {NavLink,useLocation} from 'react-router-dom';
import {ChartNoAxesCombined,House,ListFilter,Menu,Target} from 'lucide-react';

const primary=[
  {to:'/dashboard',label:'Home',Icon:House},
  {to:'/history',label:'Activity',Icon:ListFilter},
  {to:'/budgets',label:'Budgets',Icon:Target},
  {to:'/analytics',label:'Insights',Icon:ChartNoAxesCombined},
];
export default function BottomNavigation({onMore,menuOpen=false,menuRef}){
  const {pathname}=useLocation();
  const moreSelected=!primary.some(({to})=>to===pathname);
  return <nav className="ep-bottom-nav" aria-label="Mobile bottom navigation">
    {primary.map(({to,label,Icon})=><NavLink key={to} to={to} end aria-label={label} className="ep-bottom-nav-item">
      <Icon size={21} strokeWidth={1.9} aria-hidden="true"/><span>{label}</span>
    </NavLink>)}
    <button ref={menuRef} type="button" className="ep-bottom-nav-item" aria-label="More navigation options" aria-pressed={menuOpen||moreSelected} aria-controls="expenseplus-mobile-navigation" aria-expanded={menuOpen} onClick={onMore}>
      <Menu size={21} strokeWidth={1.9} aria-hidden="true"/><span>More</span>
    </button>
  </nav>;
}
