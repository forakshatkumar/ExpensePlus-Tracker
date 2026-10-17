import {useCallback,useEffect,useRef,useState} from 'react';
import {Outlet,useLocation,useOutletContext} from 'react-router-dom';
import {Plus} from 'lucide-react';
import {useAuth} from '../../context/AuthContext';
import {api} from '../../lib/api';
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
  const {pathname}=useLocation();
  const [data,setData]=useState(empty);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [toast,setToast]=useState(null);
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
  const refreshAll=useCallback(async()=>{
    const [p,t,s,c]=await Promise.all([
      api('/api/user/profile'), api('/api/transactions'), api('/api/streaks'),
      // A category lookup failure must not block the dashboard and other data.
      api('/api/categories').catch(error=>{console.warn('Could not load category names:',error);return {categories:builtInCategories};})
    ]);
    setData({profile:p.profile,transactions:t.transactions,streak:s,categories:c.categories||builtInCategories});
  },[]);
  const refreshAfterExpense=useCallback(()=>Promise.all([refreshTransactions(),refreshStreak(),refreshCategories()]),[refreshTransactions,refreshStreak,refreshCategories]);
  useEffect(()=>{let active=true;setLoading(true);refreshAll().then(()=>{if(active)setError('');}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[refreshAll,user?.uid]);
  useEffect(()=>{try{localStorage.setItem('expenseplus-sidebar-collapsed',String(collapsed));}catch{}},[collapsed]);
  useEffect(()=>{closeDrawer();},[pathname,closeDrawer]);
  const context={...data,refreshProfile,refreshTransactions,refreshStreak,refreshCategories,refreshAll,refreshAfterExpense,notify,openExpense};
  return <div className={`ep-app-shell ${collapsed?'ep-app-collapsed':''}`}>
    <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} profile={data.profile} user={user}/>
    <MobileDrawer open={drawerOpen} onClose={closeDrawer} returnFocusRef={menuRef} profile={data.profile} user={user}/>
    <div className="ep-app-content">
      <Topbar profile={data.profile} user={user} onMenu={()=>setDrawerOpen(true)} drawerOpen={drawerOpen} menuRef={menuRef} onAdd={()=>openExpense()}/>
      <main className="ep-main" id="main-content">
        {loading?<div className="space-y-5" role="status"><div className="skeleton h-20 max-w-md"/><div className="grid gap-5 md:grid-cols-2"><div className="skeleton h-64"/><div className="skeleton h-64"/></div></div>
          :error&&!data.profile?<section className="panel mx-auto max-w-lg text-center"><h2 className="font-display text-2xl">Couldn't load your workspace</h2><p className="subtext">{error}</p><button className="btn-primary mt-6" onClick={()=>{setLoading(true);refreshAll().then(()=>setError('')).catch(e=>setError(e.message)).finally(()=>setLoading(false));}}>Try again</button></section>
          :<Outlet context={context}/>}
      </main>
      <footer className="px-6 pb-8 text-center text-xs text-muted">ExpensePlus ✦ Track smarter. Spend wiser.</footer>
    </div>
    <button aria-label="Add an expense" title="Add expense" className="ep-fab" onClick={()=>openExpense()}><Plus size={25}/></button>
    {expense&&<ExpenseModal key={expense.edit?.id||'new'} edit={expense.edit} onClose={closeExpense} notify={notify} onSaved={refreshAfterExpense} categories={data.categories} onCategoriesChanged={refreshCategories}/>}
    <Toast toast={toast} onClose={()=>setToast(null)}/>
  </div>;
}
