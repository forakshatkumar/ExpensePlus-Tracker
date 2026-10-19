import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins:[react(),tailwindcss(),VitePWA({
    strategies:'injectManifest',
    srcDir:'src', filename:'sw.js',
    registerType:'prompt',
    injectRegister:null,
    injectManifest:{maximumFileSizeToCacheInBytes:4*1024*1024},
    manifest:{
      name:'ExpensePlus — Smart Expense Tracker',short_name:'ExpensePlus',
      description:'Track smarter. Spend wiser. Anywhere.',start_url:'/',scope:'/',
      display:'standalone',background_color:'#121212',theme_color:'#121212',lang:'en-IN',
      categories:['finance','productivity'],
      icons:[
        {src:'/icons/icon-192.png',sizes:'192x192',type:'image/png'},
        {src:'/icons/icon-512.png',sizes:'512x512',type:'image/png'},
        {src:'/icons/icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'},
      ],
    },
  })],
  server:{port:5173},
});
