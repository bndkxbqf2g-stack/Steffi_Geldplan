import {createBackupSnapshot,restoreBackupSnapshot} from './maintenance-ui.js';
import {hasMeaningfulRecoveryData} from './recovery-store.js';
import {requestCloudOtp,verifyCloudOtp,requireCloudSession,clearCloudSession,adoptAuthRedirectSession} from './cloud-auth.js';
import {saveCloudSnapshot,loadLatestCloudSnapshot,scheduleCloudSnapshot} from './cloud-backup.js';
import {$,notify,setButtonBusy} from './ui.js';

const fmt=value=>value?new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'–';
let signedIn=false;

function setStatus(text){if($('cloudStatus'))$('cloudStatus').textContent=text;}
function showSignedIn(session,latest=null){
  signedIn=Boolean(session);
  if($('cloudSignedOut'))$('cloudSignedOut').classList.toggle('hidden',signedIn);
  if($('cloudSignedIn'))$('cloudSignedIn').classList.toggle('hidden',!signedIn);
  if($('cloudAccount'))$('cloudAccount').textContent=session?.email||'angemeldet';
  if($('cloudLatest'))$('cloudLatest').textContent=latest?.created_at?fmt(latest.created_at):'Noch keine Cloud-Sicherung';
}
async function refreshCloudState(){
  const session=await requireCloudSession();
  if(!session){showSignedIn(null);setStatus('Nicht angemeldet. Lokale Daten bleiben unverändert.');return null;}
  const latest=await loadLatestCloudSnapshot({session}).catch(()=>null);
  showSignedIn(session,latest);
  setStatus(latest?.created_at?`Letzte Cloud-Sicherung: ${fmt(latest.created_at)}`:'Angemeldet · noch keine Cloud-Sicherung.');
  return {session,latest};
}
async function afterLogin(session){
  const latest=await loadLatestCloudSnapshot({session}).catch(()=>null);
  const local=createBackupSnapshot();
  if(!hasMeaningfulRecoveryData(local)&&latest?.payload&&hasMeaningfulRecoveryData(latest.payload)){
    restoreBackupSnapshot(latest.payload);
    notify('Cloud-Sicherung wurde wiederhergestellt.',{type:'success',timeout:6000});
    setTimeout(()=>location.reload(),350);return;
  }
  if(hasMeaningfulRecoveryData(local))await saveCloudSnapshot(local,{source:'login'});
  await refreshCloudState();
}
async function sendCode(){
  const btn=$('cloudSendCode'),email=$('cloudEmail')?.value;
  setButtonBusy(btn,true,'Code wird gesendet');
  try{
    const clean=await requestCloudOtp(email);
    if($('cloudEmail'))$('cloudEmail').value=clean;
    if($('cloudOtpWrap'))$('cloudOtpWrap').classList.remove('hidden');
    setStatus('Anmeldecode wurde per E-Mail angefordert.');
  }catch(error){setStatus(error.message);notify(error.message,{type:'error'});}
  finally{setButtonBusy(btn,false);}
}
async function verifyCode(){
  const btn=$('cloudVerifyCode');
  setButtonBusy(btn,true,'Anmeldung läuft');
  try{
    const session=await verifyCloudOtp($('cloudEmail')?.value,$('cloudOtp')?.value);
    setStatus('Angemeldet. Sichere vorhandene Daten …');
    await afterLogin(session);
  }catch(error){setStatus(error.message);notify(error.message,{type:'error'});}
  finally{setButtonBusy(btn,false);}
}
async function manualSave(){
  const btn=$('cloudSaveNow');setButtonBusy(btn,true,'Sichere');
  try{
    const snapshot=createBackupSnapshot();
    if(!hasMeaningfulRecoveryData(snapshot))throw new Error('Keine sinnvollen lokalen Daten zum Sichern vorhanden.');
    const result=await saveCloudSnapshot(snapshot,{source:'manual'});
    setStatus(result.duplicate?'Cloud-Sicherung ist bereits aktuell.':'Cloud-Sicherung wurde erstellt.');
    await refreshCloudState();
  }catch(error){setStatus(error.message);notify(error.message,{type:'error'});}
  finally{setButtonBusy(btn,false);}
}
async function manualRestore(){
  const btn=$('cloudRestore');setButtonBusy(btn,true,'Lade Sicherung');
  try{
    const latest=await loadLatestCloudSnapshot();
    if(!latest?.payload)throw new Error('Keine Cloud-Sicherung vorhanden.');
    if(!confirm(`Cloud-Sicherung vom ${fmt(latest.created_at)} wiederherstellen? Aktuelle lokale Daten werden ersetzt.`))return;
    restoreBackupSnapshot(latest.payload);
    notify('Cloud-Sicherung wiederhergestellt.',{type:'success'});
    setTimeout(()=>location.reload(),350);
  }catch(error){setStatus(error.message);notify(error.message,{type:'error'});}
  finally{setButtonBusy(btn,false);}
}
function signOut(){
  clearCloudSession();showSignedIn(null);setStatus('Abgemeldet. Cloud-Daten bleiben geschützt gespeichert.');
}
function onDataChanged(){
  if(!signedIn)return;
  const snapshot=createBackupSnapshot();
  if(!hasMeaningfulRecoveryData(snapshot))return;
  scheduleCloudSnapshot(snapshot,{onResult:result=>{if(result?.saved)setStatus(`Automatisch gesichert: ${fmt(new Date())}`);},onError:error=>console.warn('[cloud-backup]',error)});
}
export function initCloudBackupUi(){
  const redirected=adoptAuthRedirectSession();
  if(redirected){
    setStatus('E-Mail-Link bestätigt. Cloud-Anmeldung wird abgeschlossen …');
    void afterLogin(redirected);
  }
  if($('cloudSendCode'))$('cloudSendCode').onclick=sendCode;
  if($('cloudVerifyCode'))$('cloudVerifyCode').onclick=verifyCode;
  if($('cloudSaveNow'))$('cloudSaveNow').onclick=manualSave;
  if($('cloudRestore'))$('cloudRestore').onclick=manualRestore;
  if($('cloudSignOut'))$('cloudSignOut').onclick=signOut;
  document.addEventListener('geldplan:data-changed',onDataChanged);
  void refreshCloudState();
}
