/**
 * ExpensePlus theme registry. Add a new entry here and a matching
 * [data-theme="your-id"] selector in index.css to register a new preset.
 * The context persists the ID; individual components never own theme state.
 */
export const DEFAULT_THEME = 'dayform-neon';
export const DEFAULT_MODE = 'dark';
export const THEME_STORAGE_KEY = 'expenseplus-theme-preset';
export const MODE_STORAGE_KEY = 'expenseplus-theme-mode';

export const themes = {
  'dayform-neon': {
    id: 'dayform-neon', name: 'Dayform Neon', description: 'Matte charcoal, electric lime and quiet confidence.',
    preview: {
      dark: {background:'#121212',surface:'#202020',foreground:'#F5F5F5',accent:'#C4F56D',secondary:'#A78BFA'},
      light: {background:'#F8FAF7',surface:'#FFFFFF',foreground:'#171C1B',accent:'#4C7200',secondary:'#7451CE'},
    },
    chart: {
      dark: {accent:'#C4F56D',secondary:'#A78BFA',tertiary:'#60A5FA',text:'#A9A9B1',grid:'rgba(204,204,213,.12)',surface:'#202020'},
      light: {accent:'#4C7200',secondary:'#7451CE',tertiary:'#2563A9',text:'#65706C',grid:'rgba(55,68,62,.12)',surface:'#FFFFFF'},
    },
  },
  'earthy-warm': {
    id: 'earthy-warm', name: 'Earthy Warm', description: 'Calm, warm and editorial.',
    preview: {
      dark: {background:'#1A1715',surface:'#28231E',foreground:'#EDE3D5',accent:'#8BA888',secondary:'#D97A62'},
      light: {background:'#FDFBF7',surface:'#FFFFFF',foreground:'#28231E',accent:'#617F5B',secondary:'#B9654C'},
    },
    chart: {
      dark: {accent:'#A3BE9C',secondary:'#E49379',tertiary:'#E6BC7E',text:'#BEB3A5',grid:'rgba(190,179,165,.16)',surface:'#28231E'},
      light: {accent:'#617F5B',secondary:'#B9654C',tertiary:'#A97732',text:'#766C60',grid:'rgba(92,82,70,.13)',surface:'#FFFFFF'},
    },
  },
  'cyber-glass': {
    id:'cyber-glass', name:'Cyber Glass', description:'Glassy, luminous and futuristic.',
    preview: {
      dark: {background:'#090F16',surface:'#15222D',foreground:'#ECFAF9',accent:'#57F0D5',secondary:'#FF8290'},
      light: {background:'#EDF8FA',surface:'#FFFFFF',foreground:'#162932',accent:'#007F78',secondary:'#CB486D'},
    },
    chart: {
      dark: {accent:'#57F0D5',secondary:'#FF8290',tertiary:'#91A8FF',text:'#AFD2D4',grid:'rgba(140,221,218,.16)',surface:'#15222D'},
      light: {accent:'#007F78',secondary:'#CB486D',tertiary:'#5861DA',text:'#4B6671',grid:'rgba(17,80,91,.14)',surface:'#FFFFFF'},
    },
  },
  'gen-z-minimal': {
    id:'gen-z-minimal', name:'Gen Z Minimal', description:'Bold, crisp and unapologetic.',
    preview: {
      dark: {background:'#101010',surface:'#1B1B1B',foreground:'#F6F7F4',accent:'#CCFF00',secondary:'#FF8B82'},
      light: {background:'#FFFFFF',surface:'#F6F6F3',foreground:'#151515',accent:'#CCFF00',secondary:'#FF847A'},
    },
    chart: {
      dark: {accent:'#CCFF00',secondary:'#FF8B82',tertiary:'#AB9AFF',text:'#CACBC4',grid:'rgba(247,248,242,.18)',surface:'#1B1B1B'},
      light: {accent:'#537200',secondary:'#C5433C',tertiary:'#6556C0',text:'#54554D',grid:'rgba(25,25,25,.14)',surface:'#F6F6F3'},
    },
  },
};

export const themeList = Object.values(themes);
export const isThemeId = id => Object.prototype.hasOwnProperty.call(themes,id);
export const getChartTheme = (id,mode) => (themes[id]||themes[DEFAULT_THEME]).chart[mode==='light'?'light':'dark'];

export function readThemePreferences(){
  try{
    const savedTheme=localStorage.getItem(THEME_STORAGE_KEY);
    const savedMode=localStorage.getItem(MODE_STORAGE_KEY);
    // Migrate the old Settings preference without changing existing users' modes.
    const legacyMode=localStorage.getItem('expenseplus-theme');
    return {
      themeId:isThemeId(savedTheme)?savedTheme:DEFAULT_THEME,
      mode:savedMode==='light'||savedMode==='dark'?savedMode:legacyMode==='light'?'light':DEFAULT_MODE,
    };
  }catch{return {themeId:DEFAULT_THEME,mode:DEFAULT_MODE};}
}

export function applyThemeAttributes(themeId,mode){
  if(typeof document==='undefined')return;
  const root=document.documentElement;
  const safeTheme=isThemeId(themeId)?themeId:DEFAULT_THEME;
  const safeMode=mode==='light'?'light':'dark';
  root.dataset.theme=safeTheme;
  root.dataset.mode=safeMode;
  root.classList.toggle('light-theme',safeMode==='light');
  root.style.colorScheme=safeMode;
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',themes[safeTheme].preview[safeMode].background);
}
