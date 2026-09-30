import {getShowExplanations,saveShowExplanations} from './storage.js';
import {$} from './ui.js';

const STATUS_IDS=new Set(['updateStatus','pendingSalaryStatus','timeReportStatus','payslipStatus','springInStatus','backupStatus']);

function markExplanations(){
  document.querySelectorAll('.note').forEach((el)=>{
    if(!STATUS_IDS.has(el.id))el.classList.add('explanation');
  });
}
export function applyExplanationPreference(show){
  document.documentElement.dataset.explanations=show?'on':'off';
  const toggle=$('explanationsToggle');
  if(toggle)toggle.checked=Boolean(show);
}
export function initPreferences(){
  markExplanations();
  let show=getShowExplanations();
  applyExplanationPreference(show);
  const toggle=$('explanationsToggle');
  toggle?.addEventListener('change',()=>{
    show=Boolean(toggle.checked);
    saveShowExplanations(show);
    applyExplanationPreference(show);
  });
  return {getShowExplanations:()=>show,setShowExplanations:(value)=>{show=Boolean(value);saveShowExplanations(show);applyExplanationPreference(show);}};
}
