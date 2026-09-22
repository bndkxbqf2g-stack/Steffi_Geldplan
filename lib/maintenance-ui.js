import {getTransactions,saveTransactions,getCash,saveCash,getSavings,saveSavings,getSalaryForecasts,saveSalaryForecasts,getPayslips,savePayslips,getFixedCosts,saveFixedCosts,getBudgetAnchor,saveBudgetAnchor,getTheme,saveTheme,migrateStorage,DATA_SCHEMA_VERSION,storageKeys} from './storage.js';
import {APP_VERSION} from '../config/version.js';
import {$,notify,setButtonBusy} from './ui.js';

const VERSION=3;
function snapshot(){return {version:VERSION,schemaVersion:DATA_SCHEMA_VERSION,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),transactions:getTransactions(),cash:getCash(),savings:getSavings(),salaryForecasts:getSalaryForecasts(),payslips:getPayslips(),fixedCosts:getFixedCosts(),budgetAnchor:getBudgetAnchor(),theme:getTheme()};}
function normalizeBackup(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Ungültige Sicherungsdatei.');
  const version=Number(data.version||1);if(!Number.isFinite(version)||version<1||version>VERSION)throw new Error('Diese Sicherungsversion wird nicht unterstützt.');
  return {version,transactions:Array.isArray(data.transactions)?data.transactions:[],cash:Number.isFinite(Number(data.cash))?Math.max(0,Number(data.cash)):0,savings:data.savings&&typeof data.savings==='object'?data.savings:{positions:[],allocations:[]},salaryForecasts:Array.isArray(data.salaryForecasts)?data.salaryForecasts:[],payslips:Array.isArray(data.payslips)?data.payslips:[],fixedCosts:'fixedCosts'in data?(Array.isArray(data.fixedCosts)?data.fixedCosts:[]):null,budgetAnchor:typeof data.budgetAnchor==='string'?data.budgetAnchor:'',theme:['system','light','dark'].includes(data.theme)?data.theme:'system'};
}
function restore(data){
  const clean=normalizeBackup(data),store=typeof localStorage!=='undefined'?localStorage:null,previous=store?snapshot():null;
  try{
    if(!saveTransactions(clean.transactions)||!saveCash(clean.cash)||!saveSavings(clean.savings)||!saveSalaryForecasts(clean.salaryForecasts)||!savePayslips(clean.payslips))throw new Error('Speichern fehlgeschlagen.');
    if(clean.fixedCosts!==null&&!saveFixedCosts(clean.fixedCosts))throw new Error('Fixkosten konnten nicht gespeichert werden.');
    if(clean.budgetAnchor){if(!saveBudgetAnchor(clean.budgetAnchor))throw new Error('Ungültiger Budgetanker in der Sicherung.');}else if(store)store.removeItem(storageKeys.budgetAnchor);
    saveTheme(clean.theme);migrateStorage();
    return true;
  }catch(error){
    if(store&&previous){saveTransactions(previous.transactions);saveCash(previous.cash);saveSavings(previous.savings);saveSalaryForecasts(previous.salaryForecasts);savePayslips(previous.payslips);if(previous.fixedCosts!==null)saveFixedCosts(previous.fixedCosts);else store.removeItem(storageKeys.fixedCosts);if(previous.budgetAnchor)saveBudgetAnchor(previous.budgetAnchor);else store.removeItem(storageKeys.budgetAnchor);saveTheme(previous.theme);}
    throw error;
  }
}
function parseVersion(text){return text.match(/APP_VERSION\s*=\s*['\"]([^'\"]+)/)?.[1]||null;}
function waitForWorker(worker){return new Promise(resolve=>{if(!worker||worker.state==='activated'||worker.state==='redundant')return resolve();worker.addEventListener('statechange',()=>{if(worker.state==='activated'||worker.state==='redundant')resolve();});setTimeout(resolve,4000);});}
export function createMaintenanceUi(){
  function exportData(){const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`mein-geldplan-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);if($('backupStatus'))$('backupStatus').textContent='Sicherung erstellt.';notify('Sicherung erstellt.',{type:'success'});}
  async function importData(){const file=$('importFile')?.files?.[0];if(!file)return notify('Bitte zuerst eine Sicherungsdatei auswählen.',{type:'error'});try{restore(JSON.parse(await file.text()));if($('backupStatus'))$('backupStatus').textContent='Sicherung geprüft und wiederhergestellt. App wird neu geladen.';setTimeout(()=>location.reload(),300);}catch(e){if($('backupStatus'))$('backupStatus').textContent='Wiederherstellung fehlgeschlagen – vorhandene Daten wurden beibehalten.';notify(e.message||'Sicherung konnte nicht gelesen werden.',{type:'error'});}}
  async function initPwa(){if(!('serviceWorker'in navigator))return null;try{return await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'});}catch{return null;}}
  async function checkUpdate(){
    const status=$('updateStatus'),btn=$('updateBtn');if(btn)btn.classList.add('spinning');setButtonBusy(btn,true,'Suche nach Aktualisierung');if(status){status.style.display='block';status.textContent='Prüfe auf neue Version …';}
    try{const response=await fetch(`./config/version.js?check=${Date.now()}`,{cache:'no-store'}),remote=response.ok?parseVersion(await response.text()):null,reg=await initPwa();if(reg){await reg.update();if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});await waitForWorker(reg.installing||reg.waiting);}if(remote&&remote!==APP_VERSION){if(status)status.textContent=`Neue Version v${remote} gefunden – wird geladen …`;setTimeout(()=>location.reload(),250);return;}if(status)status.textContent=remote?`Aktuell: v${APP_VERSION}`:'Updateprüfung derzeit nicht möglich.';}catch{if(status)status.textContent='Offline – installierte Version bleibt verfügbar.';}finally{if(btn)btn.classList.remove('spinning');setButtonBusy(btn,false);}
  }
  async function init(){if($('exportBtn'))$('exportBtn').onclick=exportData;if($('importBtn'))$('importBtn').onclick=importData;if($('updateBtn'))$('updateBtn').onclick=checkUpdate;await initPwa();}
  return {init};
}
export {snapshot as createBackupSnapshot,restore as restoreBackupSnapshot,normalizeBackup as normalizeBackupSnapshot,parseVersion as parseRemoteVersion};
