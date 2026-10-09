import {APP_VERSION} from './config/version.js';
import {clearAllStorage,migrateStorage} from './lib/storage.js';
import {createBudgetUi} from './lib/budget-ui.js';
import {createSavingsUi} from './lib/savings-ui.js';
import {createFixedCostsUi} from './lib/fixed-costs-ui.js';
import {createHistoryUi} from './lib/history-ui.js';
import {createMaintenanceUi} from './lib/maintenance-ui.js';
import {recoverLocalDataIfNeeded,scheduleCurrentRecoverySnapshot,saveCurrentRecoverySnapshot,clearRecoveryForReset} from './lib/recovery-bootstrap.js';
import {$,initTabs,notify} from './lib/ui.js';
import {initTheme} from './lib/theme-ui.js';
import {initPreferences} from './lib/preferences-ui.js';
let budgetUi,savingsUi,fixedCostsUi,historyUi;
const refresh=()=>{budgetUi.render();savingsUi.render();fixedCostsUi.render();historyUi.render();scheduleCurrentRecoverySnapshot();document.dispatchEvent(new Event('geldplan:data-changed'));};
async function resetApp(){
  if(!confirm('Wirklich alle gespeicherten Eingaben und Buchungen löschen?'))return;
  await clearRecoveryForReset();
  clearAllStorage();location.reload();
}
async function init(){
  const migration=migrateStorage();
  const recovered=await recoverLocalDataIfNeeded();
  if(migration.error){console.warn('[storage] Datenmigration konnte nicht vollständig ausgeführt werden.');setTimeout(()=>notify('Einige ältere Daten konnten nicht vollständig übernommen werden.',{type:'error',timeout:5000}),150);}
  if(recovered)setTimeout(()=>notify('Lokale Recovery-Sicherung wurde automatisch wiederhergestellt.',{type:'success',timeout:6000}),180);
  if($('appVersion'))$('appVersion').textContent=`v${APP_VERSION}`;
  initTheme();
  initPreferences();
  budgetUi=createBudgetUi({refresh});
  savingsUi=createSavingsUi({budgetUi,refresh});
  fixedCostsUi=createFixedCostsUi({refresh});
  historyUi=createHistoryUi({budgetUi});
  const maintenanceUi=createMaintenanceUi();
  budgetUi.init();savingsUi.init();fixedCostsUi.init();historyUi.init();maintenanceUi.init();initTabs();
  if($('resetBtn'))$('resetBtn').onclick=resetApp;
  document.querySelectorAll('input,select').forEach(el=>{el.addEventListener('input',refresh);el.addEventListener('change',refresh);});
  window.addEventListener('pagehide',()=>{void saveCurrentRecoverySnapshot();},{capture:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')void saveCurrentRecoverySnapshot();});
  refresh();
  import('./lib/cloud-backup-ui.js').then(({initCloudBackupUi})=>initCloudBackupUi()).catch(error=>console.error('[cloud-backup-init]',error));
  import('./lib/salary-ui.js?v=0.99.69')
    .then(async({initSalaryUi})=>{await initSalaryUi({onForecastChange:refresh});refresh();})
    .catch(error=>{console.error('[salary-init]',error);notify('Gehaltsbereich konnte nicht geladen werden. Budget und Übersicht bleiben verfügbar.',{type:'error',timeout:6000});});
  setInterval(refresh,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
