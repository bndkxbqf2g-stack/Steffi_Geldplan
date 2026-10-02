export function $(id){return document.getElementById(id);}
export function num(id){const e=$(id);if(!e)return 0;const v=parseFloat(String(e.value||'').replace(',','.'));return Number.isFinite(v)?v:0;}
export function eur(value){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number.isFinite(value)?value:0);}
export function fmt(date){return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);}
export function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function cycleKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;}
export function openTab(id){document.querySelectorAll('.tab').forEach(item=>item.classList.toggle('active',item.dataset.tab===id));document.querySelectorAll('.view').forEach(view=>view.classList.toggle('hidden',view.id!==id));}
export function initTabs(){
  document.querySelectorAll('.tab').forEach((button)=>button.addEventListener('click',()=>{
    openTab(button.dataset.tab);
  }));
}

let noticeTimer=null;
export function notify(message,{type='info',timeout=2600}={}){
  const el=$('appNotice');
  if(!el){if(typeof alert==='function')alert(message);return;}
  if(noticeTimer)clearTimeout(noticeTimer);
  el.textContent=String(message||'');el.className=`app-notice ${type} show`;
  noticeTimer=setTimeout(()=>{el.className='app-notice';},timeout);
}
export function setButtonBusy(button,busy,label=''){
  if(!button)return;button.disabled=Boolean(busy);button.setAttribute('aria-busy',busy?'true':'false');
  if(label){if(busy){button.dataset.originalLabel=button.getAttribute('aria-label')||button.title||'';button.setAttribute('aria-label',label);button.title=label;}else if(button.dataset.originalLabel){button.setAttribute('aria-label',button.dataset.originalLabel);button.title=button.dataset.originalLabel;delete button.dataset.originalLabel;}}
}
