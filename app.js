import {APP_VERSION} from './config/version.js';
import {clearAllStorage,migrateStorage} from './lib/storage.js';
import {createBudgetUi} from './lib/budget-ui.js';
import {createSavingsUi} from './lib/savings-ui.js';
import {createFixedCostsUi} from './lib/fixed-costs-ui.js';
import {createHistoryUi} from './lib/history-ui.js';
import {createMaintenanceUi} from './lib/maintenance-ui.js';
import {initSalaryUi} from './lib/salary-ui.js';
import {$,initTabs,notify} from './lib/ui.js';
import {initTheme} from './lib/theme-ui.js';

let budgetUi,savingsUi,fixedCostsUi,historyUi;
const refresh=()=>{budgetUi.render();savingsUi.render();fixedCostsUi.render();historyUi.render();};

function resetApp(){
  if(!confirm('Wirklich alle gespeicherten Eingaben und Buchungen löschen?'))return;
  clearAllStorage();location.reload();
}
function init(){
  const migration=migrateStorage();
  if(migration.error){console.warn('[storage] Datenmigration konnte nicht vollständig ausgeführt werden.');setTimeout(()=>notify('Einige ältere Daten konnten nicht vollständig übernommen werden.',{type:'error',timeout:5000}),150);}
  if($('appVersion'))$('appVersion').textContent=`v${APP_VERSION}`;
  initTheme();
  budgetUi=createBudgetUi({refresh});
  savingsUi=createSavingsUi({budgetUi,refresh});
  fixedCostsUi=createFixedCostsUi({refresh});
  historyUi=createHistoryUi({budgetUi});
  const maintenanceUi=createMaintenanceUi();
  budgetUi.init();savingsUi.init();fixedCostsUi.init();historyUi.init();maintenanceUi.init();initSalaryUi();initTabs();
  if($('resetBtn'))$('resetBtn').onclick=resetApp;
  document.querySelectorAll('input,select').forEach(el=>{el.addEventListener('input',refresh);el.addEventListener('change',refresh);});
  refresh();setInterval(refresh,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
