import {useCallback,useEffect,useRef,useState} from 'react';
import {Outlet,useLocation,useOutletContext} from 'react-router-dom';
import {Plus} from 'lucide-react';
import {useAuth} from '../../context/AuthContext';
import {api,apiBinary} from '../../lib/api';
import {useOnlineStatus} from '../pwa/PWAProvider';
import {categoryEmoji,categoryLabels} from '../../lib/format';
import Sidebar from './Sidebar';
import MobileDrawer from './MobileDrawer';
import Topbar from './Topbar';
import ExpenseModal from '../expenses/ExpenseModal';
import Toast from '../ui/Toast';
export function useAppData(){ return useOutletContext(); }
const builtInCategories = Object.entries(categoryLabels).map(([id,name])=>({id,name,emoji:categoryEmoji[id]}));
const empty={profile:null,transactions:[],streak:null,categories:builtInCategories};
export default function AppLayout(){
  const {user}=useAuth();
  const online=useOnlineStatus();
  const [notifications,setNotifications]=useState([]);
  const wasOnline=useRef(true);
  const [avatarUrl,setAvatarUrl]=useState('');
  const avatarRef=useRef('');
  const {pathname}=useLocation();
  const [data,setData]=useState(empty);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [toast,setToast]=useState(null);
  useEffect(()=>{
    try{document.documentElement.classList.toggle('light-theme',localStorage.getItem('expenseplus-theme')==='light');}
    catch{document.documentElement.classList.remove('light-theme');}
  },[]);
  const [collapsed,setCollapsed]=useState(()=>{
    try{const stored=localStorage.getItem('expenseplus-sidebar-collapsed');return stored!==null?stored==='true':window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches;}catch{return false;}
  });
  const [drawerOpen,setDrawerOpen]=useState(false);
  const [expense,setExpense]=useState(null); // null = closed, {edit:null|transaction} = open
  const menuRef=useRef(null);
  const previousFocusRef=useRef(null);
  const notify=useCallback((message,kind='success')=>setToast({message,kind}),[]);
  const closeDrawer=useCallback(()=>setDrawerOpen(false),[]);
  const closeExpense=useCallback(()=>{setExpense(null);previousFocusRef.current?.focus?.();},[]);
  const openExpense=useCallback((edit=null)=>{previousFocusRef.current=document.activeElement;closeDrawer();setExpense({edit});},[closeDrawer]);
  const refreshProfile=useCallback(async()=>{const r=await api('/api/user/profile');setData(prev=>({...prev,profile:r.profile}));return r.profile;},[]);
  const refreshTransactions=useCallback(async()=>{const r=await api('/api/transactions');setData(prev=>({...prev,transactions:r.transactions}));return r.transactions;},[]);
  const refreshStreak=useCallback(async()=>{const r=await api('/api/streaks');setData(prev=>({...prev,streak:r}));return r;},[]);
  const refreshCategories=useCallback(async()=>{const r=await api('/api/categories');setData(prev=>({...prev,categories:r.categories||builtInCategories}));return r.categories||builtInCategories;},[]);
  const refreshNotifications=useCallback(async()=>{const r=await api('/api/notifications');setNotifications(r.notifications||[]);return r.notifications;},[]);
  const markNotificationRead=useCallback(async(id)=>{try{await api(`/api/notifications/${id}/read`,{method:'PATCH'});await refreshNotifications();}catch(e){notify(e.message,'error');}},[refreshNotifications,notify]);
  const markNotificationsRead=useCallback(async()=>{try{await api('/api/notifications/read-all',{method:'POST'});await refreshNotifications();}catch(e){notify(e.message,'error');}},[refreshNotifications,notify]);
  const refreshAvatar=useCallback(async()=>{
    const blob=await apiBinary('/api/user/avatar').catch(error=>{if(!/No custom avatar|404/.test(error.message))console.warn('Avatar:',error.message);return null;});
    const url=blob?URL.createObjectURL(blob):'';
    if(avatarRef.current)URL.revokeObjectURL(avatarRef.current);
    avatarRef.current=url;setAvatarUrl(url);
  },[]);
  useEffect(()=>()=>{if(avatarRef.current)URL.revokeObjectURL(avatarRef.current);},[]);
  useEffect(()=>{
    if(avatarRef.current)URL.revokeObjectURL(avatarRef.current);
    avatarRef.current='';setAvatarUrl('');setNotifications([]);
  },[user?.uid]);
  useEffect(()=>{if(data.profile?.hasCustomAvatar)refreshAvatar();else{if(avatarRef.current)URL.revokeObjectURL(avatarRef.current);avatarRef.current='';setAvatarUrl('');}},[data.profile?.hasCustomAvatar,refreshAvatar,user?.uid]);
  useEffect(()=>{if(data.profile&&online)refreshNotifications().catch(error=>console.warn('Notifications:',error.message));},[data.profile?.createdAt,online,refreshNotifications]);
  useEffect(()=>{if(online&&!wasOnline.current){refreshAll().catch(error=>notify(error.message,'error'));}wasOnline.current=online;},[online]);
  const refreshAll=useCallback(async()=>{
    const [p,t,s,c]=await Promise.all([
      api('/api/user/profile'), api('/api/transactions'), api('/api/streaks'),
      // A category lookup failure must not block the dashboard and other data.
      api('/api/categories').catch(error=>{console.warn('Could not load category names:',error);return {categories:builtInCategories};})
    ]);
    setData({profile:p.profile,transactions:t.transactions,streak:s,categories:c.categories||builtInCategories});
  },[]);
  const refreshAfterExpense=useCallback(()=>Promise.all([refreshTransactions(),refreshStreak(),refreshCategories(),refreshNotifications()]),[refreshTransactions,refreshStreak,refreshCategories,refreshNotifications]);
  useEffect(()=>{let active=true;setLoading(true);refreshAll().then(()=>{if(active)setError('');}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[refreshAll,user?.uid]);
  useEffect(()=>{try{localStorage.setItem('expenseplus-sidebar-collapsed',String(collapsed));}catch{}},[collapsed]);
  useEffect(()=>{closeDrawer();},[pathname,closeDrawer]);
  const displayProfile=data.profile?{...data.profile,profilePicture:avatarUrl||data.profile.profilePicture}:null;
  const context={...data,avatarUrl,refreshProfile,refreshAvatar,refreshTransactions,refreshStreak,refreshCategories,refreshAll,refreshAfterExpense,refreshNotifications,notify,openExpense};
  return <div className={`ep-app-shell ${collapsed?'ep-app-collapsed':''}`}>
    <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} profile={displayProfile} user={user}/>
    <MobileDrawer open={drawerOpen} onClose={closeDrawer} returnFocusRef={menuRef} profile={displayProfile} user={user}/>
    <div className="ep-app-content">
      <Topbar onMenu={()=>setDrawerOpen(true)} drawerOpen={drawerOpen} menuRef={menuRef} onAdd={()=>openExpense()} notifications={notifications} onRead={markNotificationRead} onReadAll={markNotificationsRead}/>
      <main className="ep-main" id="main-content">
        {loading?<div className="space-y-5" role="status"><div className="skeleton h-20 max-w-md"/><div className="grid gap-5 md:grid-cols-2"><div className="skeleton h-64"/><div className="skeleton h-64"/></div></div>
          :error&&!data.profile?<section className="panel mx-auto max-w-lg text-center"><h2 className="font-display text-2xl">Couldn't load your workspace</h2><p className="subtext">{error}</p><button className="btn-primary mt-6" onClick={()=>{setLoading(true);refreshAll().then(()=>setError('')).catch(e=>setError(e.message)).finally(()=>setLoading(false));}}>Try again</button></section>
          :<Outlet context={context}/>}
      </main>
      <footer className="px-6 pb-8 text-center text-xs text-muted">ExpensePlus ✦ Track smarter. Spend wiser.</footer>
    </div>
    <button aria-label="Add an expense" className="ep-fab" onClick={()=>openExpense()} disabled={!online} title={!online?"Reconnect before adding expenses":"Add expense"}><Plus size={25}/></button>
    {expense&&<ExpenseModal key={expense.edit?.id||'new'} edit={expense.edit} onClose={closeExpense} notify={notify} onSaved={refreshAfterExpense} categories={data.categories} onCategoriesChanged={refreshCategories} transactions={data.transactions} monthlyBudget={data.profile?.monthlyBudget||0} online={online}/>}
    <Toast toast={toast} onClose={()=>setToast(null)}/>
  </div>;
}
