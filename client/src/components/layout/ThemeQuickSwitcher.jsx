import {useEffect,useRef,useState} from 'react';
import {Check,ChevronDown,Moon,Palette,Sun} from 'lucide-react';
import {Link,useLocation} from 'react-router-dom';
import {useTheme} from '../../context/ThemeContext';
import {themeList} from '../../themeConfig';

/** Theme controls available from every app page. Full previews live in Settings. */
export default function ThemeQuickSwitcher(){
  const [open,setOpen]=useState(false);
  const wrap=useRef(null);
  const firstOption=useRef(null);
  const trigger=useRef(null);
  const {pathname}=useLocation();
  const {themeId,mode,setTheme,setMode}=useTheme();

  useEffect(()=>{setOpen(false);},[pathname]);
  useEffect(()=>{
    if(!open)return;
    const handlePointer=(event)=>{if(wrap.current&&!wrap.current.contains(event.target))setOpen(false);};
    const handleKey=(event)=>{
      if(event.key==='Escape'){
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown',handlePointer);
    document.addEventListener('keydown',handleKey);
    firstOption.current?.focus();
    return ()=>{
      document.removeEventListener('pointerdown',handlePointer);
      document.removeEventListener('keydown',handleKey);
    };
  },[open]);

  return <div ref={wrap} className="relative shrink-0">
    <button
      ref={trigger}
      type="button"
      className="ep-theme-trigger icon-button"
      aria-label={`Change theme. Current theme: ${themeList.find(t=>t.id===themeId)?.name||'Dayform Neon'}, ${mode} mode`}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-controls="ep-theme-quick-menu"
      title="Change theme"
      onClick={()=>setOpen(value=>!value)}
    >
      <Palette size={20} aria-hidden="true"/>
      <ChevronDown className="hidden sm:block" size={13} aria-hidden="true"/>
    </button>
    {open&&<section id="ep-theme-quick-menu" className="ep-theme-quick-menu" role="dialog" aria-label="Quick theme selection">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-cream">Change theme</p>
          <p className="mt-1 text-xs text-muted">Pick your workspace vibe.</p>
        </div>
        <Palette size={18} className="text-sage" aria-hidden="true"/>
      </div>
      <div className="mt-4 space-y-1" role="group" aria-label="Themes">
        {themeList.map((theme,index)=>{
          const preview=theme.preview[mode];
          const selected=themeId===theme.id;
          return <button
            key={theme.id}
            ref={index===0?firstOption:undefined}
            type="button"
            className="ep-theme-option"
            aria-pressed={selected}
            onClick={()=>{setTheme(theme.id);setOpen(false);trigger.current?.focus();}}
          >
            <span className="ep-theme-color-preview" aria-hidden="true" style={{background:preview.background,borderColor:preview.foreground+'40'}}>
              <span style={{background:preview.accent}}/><span style={{background:preview.secondary}}/>
            </span>
            <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold">{theme.name}</span>
            {selected&&<Check size={17} className="text-sage" aria-hidden="true"/>}
          </button>;
        })}
      </div>
      <div className="ep-theme-mode-row mt-3 border-t border-line pt-3">
        <span className="text-xs font-semibold text-muted">Appearance</span>
        <div className="ep-theme-mode-options" role="group" aria-label="Appearance mode">
          <button type="button" aria-pressed={mode==='light'} onClick={()=>setMode('light')}><Sun size={15} aria-hidden="true"/> Light</button>
          <button type="button" aria-pressed={mode==='dark'} onClick={()=>setMode('dark')}><Moon size={15} aria-hidden="true"/> Dark</button>
        </div>
      </div>
      <Link className="mt-3 block text-center text-xs font-semibold text-sage hover:underline" to="/settings" onClick={()=>setOpen(false)}>More appearance settings →</Link>
    </section>}
  </div>;
}
