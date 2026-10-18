import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,CalendarDays,Camera,Edit3,Mail,Save,ShieldCheck,UserRound,X} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {useAppData} from '../components/layout/AppLayout';
import {api} from '../lib/api';
import {dateToday,inr} from '../lib/format';
import {useOnlineStatus} from '../components/pwa/PWAProvider';
import AvatarUploader from '../components/profile/AvatarUploader';

const DEFAULT_BIO='B.Tech CSE student at ABES Engineering College | Building clean, mindful web experiences';

export default function Profile(){
  const {profile,avatarUrl,transactions,streak,refreshProfile,refreshAvatar,notify}=useAppData();
  const {user}=useAuth();
  const online=useOnlineStatus();
  const [editing,setEditing]=useState(false);
  const [displayName,setDisplayName]=useState(profile?.name||user?.displayName||'');
  const [bio,setBio]=useState(profile?.bio??DEFAULT_BIO);
  const [picture,setPicture]=useState(profile?.profilePicture||'');
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    if(!editing){setDisplayName(profile?.name||user?.displayName||'');setBio(profile?.bio??DEFAULT_BIO);setPicture(profile?.profilePicture||'');}
  },[profile?.name,profile?.bio,profile?.profilePicture,user?.displayName,editing]);
  const name=profile?.name||user?.displayName||'ExpensePlus member';
  const pictureSrc=avatarUrl||profile?.profilePicture||user?.photoURL;
  const month=dateToday().slice(0,7);
  const thisMonth=transactions.filter(t=>t.date?.startsWith(month)).reduce((s,t)=>s+(t.amountCents||0),0)/100;
  const achievements=[5,10,15,20,30].filter(n=>n<=(streak?.highestStreak||0)).length;
  const highlights=[['Recorded expenses',transactions.length],['Spent this month',inr(thisMonth)],['Longest streak',`${streak?.highestStreak||0} days`],['Badges earned',`${achievements}/5`]];
  function cancel(){setEditing(false);setDisplayName(profile?.name||user?.displayName||'');setBio(profile?.bio??DEFAULT_BIO);setPicture(profile?.profilePicture||'');}
  async function save(e){
    e.preventDefault();setSaving(true);
    try{
      await api('/api/user/profile',{method:'PUT',body:JSON.stringify({name:displayName.trim(),bio,profilePicture:picture})});
      await refreshProfile();setEditing(false);notify('Profile updated successfully.');
    }catch(error){notify(error.message,'error');}
    finally{setSaving(false);}
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">A little more about you</p><h1 className="page-heading">Your profile <span className="text-sage">✦</span></h1><p className="subtext">Your details, your journey, and the highlights that matter.</p></div>
      {!editing&&<button type="button" className="btn-primary" onClick={()=>setEditing(true)}><Edit3 size={17}/> Edit profile</button>}
    </div>
    <section className="panel relative overflow-hidden">
      <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-sage/10 blur-3xl"/>
      <div className="relative flex flex-wrap items-center gap-6">
        {pictureSrc?<img src={pictureSrc} className="h-28 w-28 rounded-[28px] border-2 border-sage/40 object-cover shadow-lg" alt={`${name}'s avatar`} referrerPolicy="no-referrer"/>:<div className="grid h-28 w-28 place-items-center rounded-[28px] bg-sage/15 text-sage"><UserRound size={43}/></div>}
        <div className="min-w-0 flex-1"><p className="eyebrow">ExpensePlus member</p><h2 className="mt-2 break-words font-display text-3xl sm:text-4xl">{name}</h2>
          <p className="mt-2 flex items-center gap-2 break-all text-sm text-muted"><Mail size={15} className="shrink-0"/>{profile?.email||user?.email||'Email unavailable'}</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-cream/80">{profile?.bio??DEFAULT_BIO}</p>
        </div>
      </div>
    </section>
    {editing&&<section className="panel" id="profile-edit" aria-label="Edit profile">
      <div className="flex items-center justify-between gap-2"><h2 className="font-display text-2xl">Edit your details</h2><button type="button" aria-label="Cancel editing" onClick={cancel} className="icon-button"><X size={20}/></button></div>
      <p className="subtext">Change your name, bio, and profile picture. Settings are managed separately.</p>
      <form onSubmit={save} className="mt-5 space-y-5">
        <div><label htmlFor="profile-name" className="field-label">Display name</label><input id="profile-name" className="field" maxLength={80} required value={displayName} onChange={e=>setDisplayName(e.target.value)}/></div>
        <div><label htmlFor="profile-bio" className="field-label">About you</label><textarea id="profile-bio" className="field min-h-28 resize-y" maxLength={300} value={bio} onChange={e=>setBio(e.target.value)}/><p className="mt-2 text-right text-xs text-muted">{bio.length}/300</p></div>
        <div className="rounded-2xl border border-line p-4"><h3 className="flex items-center gap-2 font-semibold"><Camera size={17} className="text-sage"/> Profile picture</h3><AvatarUploader profile={profile} user={user} refreshProfile={refreshProfile} refreshAvatar={refreshAvatar} notify={notify}/>
        <div className="mt-4"><label htmlFor="picture-url" className="field-label">Or use an HTTPS picture URL</label><input id="picture-url" className="field" type="url" value={picture} placeholder="https://example.com/avatar.jpg" onChange={e=>setPicture(e.target.value)}/><p className="mt-2 text-xs text-muted">Leave blank to use your Google account image when no custom photo is uploaded.</p></div></div>
        <div className="flex flex-wrap gap-3"><button type="submit" className="btn-primary" disabled={saving||!online}><Save size={17}/>{saving?'Saving…':'Save changes'}</button><button type="button" className="btn-outline" onClick={cancel} disabled={saving}>Cancel</button></div>
      </form>
    </section>}
    <section className="panel"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Little wins add up</p><h2 className="mt-2 font-display text-2xl">Your highlights</h2></div><Link to="/analytics" className="inline-flex items-center gap-1 text-sm text-sage">View insights <ArrowUpRight size={16}/></Link></div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{highlights.map(([label,value])=><div key={label} className="rounded-2xl border border-line/70 bg-espresso p-4 sm:p-5"><p className="text-xs text-muted">{label}</p><p className="mt-3 break-words font-display text-xl sm:text-2xl">{value}</p></div>)}</div>
    </section>
    <section className="panel"><div className="flex items-center gap-2 text-sage"><ShieldCheck size={19}/><h2 className="font-display text-xl text-cream">Your account</h2></div>
      <p className="mt-3 flex items-center gap-2 text-sm text-muted"><ShieldCheck size={16}/> Signed in securely with Google</p>
      <p className="mt-2 flex items-center gap-2 text-sm text-muted"><CalendarDays size={16}/>{profile?.createdAt?`Member since ${new Date(profile.createdAt).toLocaleDateString('en-IN',{month:'long',year:'numeric'})}`:'Your account details are stored securely.'}</p>
      <p className="mt-4 text-sm text-muted">Looking for theme, notifications, app installation, or sign out? <Link to="/settings" className="font-semibold text-sage underline underline-offset-4">Open Settings</Link>.</p>
    </section>
  </div>;
}
