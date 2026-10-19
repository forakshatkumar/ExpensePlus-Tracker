import {useState} from 'react';
import {Bell,CheckCheck} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import Overlay from '../ui/Overlay';
export default function NotificationBell({items=[],onRead,onReadAll}){
  const [open,setOpen]=useState(false);
  const navigate=useNavigate();
  const unread=items.filter(item=>!item.readAt).length;
  return <>
    <button type="button" className="icon-button relative" aria-expanded={open} aria-haspopup="dialog" aria-label={`Notifications, ${unread} unread`} onClick={()=>setOpen(true)}>
      <Bell size={21}/>{unread>0&&<span className="absolute -right-1 -top-1 rounded-full bg-terracotta px-1 text-[10px] text-espresso">{unread>9?'9+':unread}</span>}
    </button>
    <Overlay title="Notifications" open={open} onClose={()=>setOpen(false)} compact>
      <div className="v31-notification-tools"><span className="text-xs text-muted">{unread?`${unread} unread`:'All caught up'}</span><button type="button" className="v31-link" onClick={()=>onReadAll?.()} disabled={!unread}><CheckCheck size={15}/> Mark all read</button></div>
      <div className="v31-notification-list">
        {items.length===0?<div className="v31-empty"><Bell size={22}/><p>You're all caught up.</p><span>Budget alerts will appear here.</span></div>:items.map(item=><button type="button" key={item.id} className={`v31-notification-item ${!item.readAt?'v31-notification-unread':''}`} onClick={()=>{if(!item.readAt)onRead?.(item.id);setOpen(false);navigate('/budgets');}}>
          <span className="v31-notification-heading"><strong>{item.title}</strong>{!item.readAt&&<span className="v31-unread-dot"/>}</span>
          <span className="v31-notification-text">{item.message}</span>
          {item.createdAt&&<time className="v31-notification-date" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</time>}
        </button>)}
      </div>
    </Overlay>
  </>;
}
