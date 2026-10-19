import {Check,MonitorSmartphone,Moon,Palette,Sun} from 'lucide-react';
import {useTheme} from '../../context/ThemeContext';
import {themeList} from '../../themeConfig';

export default function ThemeAppearance(){
  const {themeId,mode,setTheme,toggleMode}=useTheme();
  return <section className="panel" aria-labelledby="theme-heading">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3"><Palette className="text-sage" size={22}/><h2 id="theme-heading" className="font-display text-2xl font-semibold tracking-tight">Theme &amp; appearance</h2></div>
        <p className="mt-2 text-sm leading-6 text-muted">Make the workspace your own. Every preset supports light and dark mode.</p>
      </div>
      <button type="button" role="switch" aria-checked={mode==='dark'} aria-label={`Dark mode ${mode==='dark'?'on':'off'}; toggle appearance`} className="ep-mode-switch shrink-0 self-start" onClick={toggleMode}>
        {mode==='dark'?<Moon size={16} aria-hidden="true"/>:<Sun size={16} aria-hidden="true"/>}
        <span className="text-sm font-semibold">{mode==='dark'?'Dark':'Light'}</span>
        <span className="ep-mode-switch-track" aria-hidden="true"><span className="ep-mode-switch-thumb"/></span>
      </button>
    </div>
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="Select application theme">
      {themeList.map(theme=>{
        const colors=theme.preview[mode];const selected=themeId===theme.id;
        return <label key={theme.id} className="ep-theme-swatch relative block cursor-pointer overflow-hidden p-3" data-selected={selected}>
          <input type="radio" name="appearance-theme" value={theme.id} checked={selected} onChange={()=>setTheme(theme.id)} className="sr-only" aria-label={theme.name}/>
          <div className="relative h-28 overflow-hidden rounded-xl border" style={{background:colors.background,borderColor:colors.accent+'44'}} aria-hidden="true">
            <div className="absolute inset-0 p-3 flex flex-col gap-2">
              <div className="h-3 w-1/2 rounded" style={{background:colors.foreground,opacity:.65}}/>
              <div className="flex flex-1 gap-2">
                <div className="flex-1 rounded-lg border p-2" style={{background:colors.surface,borderColor:colors.foreground+'20'}}>
                  <div className="h-1.5 w-10 rounded" style={{background:colors.foreground,opacity:.28}}/>
                  <div className="mt-2 h-3 w-4/5 rounded" style={{background:colors.foreground}}/>
                  <div className="mt-3 h-1.5 w-full rounded" style={{background:colors.foreground,opacity:.1}}><div className="h-full w-2/3 rounded" style={{background:colors.accent}}/></div>
                </div>
                <div className="w-12 rounded-lg border p-2" style={{background:colors.surface,borderColor:colors.foreground+'20'}}><div className="h-4 w-4 rounded-full" style={{background:colors.secondary}}/><div className="mt-2 h-1 w-full rounded" style={{background:colors.foreground,opacity:.2}}/></div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2">
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-cream">{theme.name}</span><span className="mt-1 block text-xs leading-5 text-muted">{theme.description}</span></span>
            {selected&&<span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-sage text-espresso"><Check size={14}/></span>}
          </div>
        </label>;
      })}
    </div>
    <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted"><MonitorSmartphone size={15}/><span>Saved automatically to this device. Your selection applies across every page.</span></div>
  </section>;
}
