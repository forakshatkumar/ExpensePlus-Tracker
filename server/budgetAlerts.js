// Server-authoritative monthly budget alerts. This module never receives a user ID from a client.
const THRESHOLDS = [50,75,90,100,101];
export const DEFAULT_PREFERENCES = { inAppBudgetAlerts:true, thresholds:[50,75,90,100], pushEnabled:false };
export function normalizePreferences(raw={}) {
  return {
    inAppBudgetAlerts: raw.inAppBudgetAlerts !== false,
    thresholds: Array.isArray(raw.thresholds) ? [...new Set(raw.thresholds.filter(v=>[50,75,90,100].includes(v)))].sort((a,b)=>a-b) : [...DEFAULT_PREFERENCES.thresholds],
    pushEnabled: raw.pushEnabled === true,
  };
}
export function findThreshold(spentCents,budgetRupees,preference=DEFAULT_PREFERENCES) {
  if (!Number.isFinite(budgetRupees)||budgetRupees<=0) return null;
  const p=normalizePreferences(preference);
  if(!p.inAppBudgetAlerts)return null;
  const percent=spentCents/(budgetRupees*100)*100;
  if(percent>100)return 101;
  const eligible=p.thresholds.filter(t=>percent>=t);
  return eligible.length?eligible.at(-1):null;
}
export function budgetMessage(threshold,spentCents,budgetRupees) {
  const used=Math.round(spentCents/100);
  const remaining=Math.max(0,Math.round(budgetRupees-used));
  if(threshold===101)return {title:'Monthly budget exceeded',message:'Your spending is above your monthly budget. Review your budget for details.'};
  if(threshold===100)return {title:'Monthly budget reached',message:'You have reached your monthly budget.'};
  if(threshold===90)return {title:'Budget almost used',message:`Only ₹${remaining.toLocaleString('en-IN')} remains in your monthly budget.`};
  if(threshold===75)return {title:'Approaching your budget',message:'You have used at least 75% of your monthly budget.'};
  return {title:'Halfway through your budget',message:'You have used at least 50% of your monthly budget.'};
}
// Deterministic notification ID + Firestore create() prevents duplicated alerts across simultaneous requests.
export async function checkBudgetAlerts({db,admin,userDoc,month,sendPush}) {
  if(!/^\d{4}-\d{2}$/.test(month))return [];
  const [profileSnap,prefsSnap,expenses]=await Promise.all([
    userDoc.get(),userDoc.collection('settings').doc('notifications').get(),
    userDoc.collection('expenses').where('date','>=',`${month}-01`).where('date','<',`${month}-32`).get(),
  ]);
  const budget=Number(profileSnap.data()?.monthlyBudget);
  const prefs=normalizePreferences(prefsSnap.data());
  const total=expenses.docs.reduce((sum,d)=>sum+(Number(d.data().amountCents)||0),0);
  const threshold=findThreshold(total,budget,prefs);
  if(threshold===null)return [];
  const ref=userDoc.collection('notifications').doc(`budget-${month}-${threshold}`);
  const {title,message}=budgetMessage(threshold,total,budget);
  try {
    await ref.create({type:'budget',title,message,createdAt:admin.firestore.FieldValue.serverTimestamp(),readAt:null,metadata:{month,threshold},dedupeKey:`budget-${month}-${threshold}`});
  }catch(error){if(error.code===6||error.code==='already-exists')return [];throw error;}
  // Push delivery is best effort; it never blocks successfully persisted financial data.
  if(prefs.pushEnabled&&sendPush){try{await sendPush(userDoc,{title,message,url:'/budgets'});}catch(error){console.error('Push delivery failed:',error.message);}}
  return [{id:ref.id,title,message}];
}
