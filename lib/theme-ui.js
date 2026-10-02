import {getTheme,saveTheme} from './storage.js';
import {$} from './ui.js';

const ORDER=['system','light','dark'];
function systemDark(){return !!globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches;}
export function resolvedTheme(mode){return mode==='system'?(systemDark()?'dark':'light'):mode;}
export function applyTheme(mode){
  const resolved=resolvedTheme(mode);
  document.documentElement.dataset.theme=resolved;
  document.documentElement.dataset.themeMode=mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',resolved==='dark'?'#0b1220':'#f5f7fb');
  const btn=$('themeBtn');
  if(btn){btn.textContent=mode==='dark'?'☀︎':mode==='light'?'☾':'◐';btn.title=`Darstellung: ${mode==='system'?'System':mode==='dark'?'Dunkel':'Hell'}`;btn.setAttribute('aria-label',btn.title);}
}
export function initTheme(){
  let mode=getTheme();
  const set=(next)=>{mode=next;saveTheme(mode);applyTheme(mode);};
  applyTheme(mode);
  $('themeBtn')?.addEventListener('click',()=>set(ORDER[(ORDER.indexOf(mode)+1)%ORDER.length]));
  globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(mode==='system')applyTheme(mode);});
  return {getMode:()=>mode,setMode:set};
}
