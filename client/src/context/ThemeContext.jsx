import {createContext,useContext,useEffect,useLayoutEffect,useMemo,useState} from 'react';
import {
  DEFAULT_MODE,DEFAULT_THEME,MODE_STORAGE_KEY,THEME_STORAGE_KEY,
  applyThemeAttributes,isThemeId,readThemePreferences,themes,
} from '../themeConfig';

const ThemeContext=createContext(null);

export function ThemeProvider({children}){
  const [preferences,setPreferences]=useState(readThemePreferences);
  const {themeId,mode}=preferences;

  useLayoutEffect(()=>{applyThemeAttributes(themeId,mode);},[themeId,mode]);
  useEffect(()=>{
    try{
      localStorage.setItem(THEME_STORAGE_KEY,themeId);
      localStorage.setItem(MODE_STORAGE_KEY,mode);
    }catch{}
  },[themeId,mode]);
  useEffect(()=>{
    const onStorage=(event)=>{
      if([THEME_STORAGE_KEY,MODE_STORAGE_KEY].includes(event.key))setPreferences(readThemePreferences());
    };
    window.addEventListener('storage',onStorage);
    return ()=>window.removeEventListener('storage',onStorage);
  },[]);

  const value=useMemo(()=>({
    themeId,mode,theme:themes[themeId]||themes[DEFAULT_THEME],
    setTheme:(id)=>{if(isThemeId(id))setPreferences(prev=>({...prev,themeId:id}));},
    setMode:(nextMode)=>{if(nextMode==='dark'||nextMode==='light')setPreferences(prev=>({...prev,mode:nextMode}));},
    toggleMode:()=>setPreferences(prev=>({...prev,mode:prev.mode==='dark'?'light':'dark'})),
    reset:()=>setPreferences({themeId:DEFAULT_THEME,mode:DEFAULT_MODE}),
  }),[themeId,mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(){
  const ctx=useContext(ThemeContext);
  if(!ctx)throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
