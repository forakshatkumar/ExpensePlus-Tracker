import {CheckCircle2,AlertCircle,X} from 'lucide-react';
export default function Toast({toast,onClose}){
  if(!toast)return null;
  return <div role={toast.kind==='error'?'alert':'status'} className={`toast ${toast.kind==='error'?'toast-error':''}`}><span>{toast.kind==='error'?<AlertCircle size={19}/>:<CheckCircle2 size={19}/>}</span><span className="flex-1 text-sm">{toast.message}</span><button aria-label="Dismiss notification" className="icon-button" onClick={onClose}><X size={16}/></button></div>;
}
