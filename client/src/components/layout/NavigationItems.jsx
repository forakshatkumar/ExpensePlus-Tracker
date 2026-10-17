import {NavLink} from 'react-router-dom';
import {navigation} from './navigation';
export default function NavigationItems({collapsed=false, onNavigate}) {
  return <nav aria-label="Primary navigation" className="flex flex-col gap-1.5">
    {navigation.map(({to,label,Icon})=><NavLink key={to} to={to} onClick={onNavigate} title={collapsed?label:undefined} aria-label={collapsed?label:undefined} className={({isActive})=>`nav-item ${isActive?'nav-item-active':''} ${collapsed?'justify-center':''}`}>
      <Icon size={19} strokeWidth={1.8} aria-hidden="true"/><span className={collapsed?'sr-only':''}>{label}</span>
    </NavLink>)}
  </nav>;
}
