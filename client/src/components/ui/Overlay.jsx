import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
/** One accessible, viewport-fixed surface for mobile sheets and desktop dialogs. */
export default function Overlay({title,open,onClose,children,compact=false}){
  const surface=useRef(null);const lastFocus=useRef(null);const closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{
    if(!open)return;
    lastFocus.current=document.activeElement;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    surface.current?.querySelector('[data-overlay-close]')?.focus({preventScroll:true});
    function onKey(event){
      if(event.key==='Escape'){event.preventDefault();closeRef.current();}
      if(event.key==='Tab'){
        const nodes=[...surface.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')||[]];
        if(!nodes.length)return;
        if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes.at(-1).focus();}
        else if(!event.shiftKey&&document.activeElement===nodes.at(-1)){event.preventDefault();nodes[0].focus();}
      }
    }
    document.addEventListener('keydown',onKey);
    return ()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',onKey);lastFocus.current?.focus?.({preventScroll:true});};
  },[open]);
  if(!open)return null;
  return createPortal(<div className="v31-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section ref={surface} className={`v31-overlay-panel ${compact?'v31-overlay-compact':''}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="v31-overlay-grip" aria-hidden="true"/>
      <div className="v31-overlay-header"><h2>{title}</h2><button type="button" className="icon-button" data-overlay-close onClick={onClose} aria-label={`Close ${title}`}><X size={19}/></button></div>
      <div className="v31-overlay-content">{children}</div>
    </section>
  </div>,document.body);
}
