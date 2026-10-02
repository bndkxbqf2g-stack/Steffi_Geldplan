const DB_NAME='freundin-geldplan-recovery';
const DB_VERSION=1;
const STORE='snapshots';
const LATEST='latest';

const arrays=value=>Array.isArray(value)?value:[];

export function hasMeaningfulRecoveryData(snapshot={}){
  if(!snapshot||typeof snapshot!=='object')return false;
  if(Number(snapshot.cash)>0.005)return true;
  if(arrays(snapshot.transactions).length)return true;
  if(arrays(snapshot.salaryForecasts).length)return true;
  if(arrays(snapshot.payslips).length)return true;
  if(arrays(snapshot.payrollLearning).length)return true;
  if(snapshot.pendingSalary&&typeof snapshot.pendingSalary==='object')return true;
  const savings=snapshot.savings||{};
  if(arrays(savings.positions).length||arrays(savings.allocations).length)return true;
  return false;
}

export function shouldRecoverPrimary(primary={},recovery={}){
  return !hasMeaningfulRecoveryData(primary)&&hasMeaningfulRecoveryData(recovery);
}

function openDb(indexedDBRef=globalThis.indexedDB){
  return new Promise((resolve,reject)=>{
    if(!indexedDBRef)return resolve(null);
    const request=indexedDBRef.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Recovery-Speicher konnte nicht geöffnet werden.'));
  });
}

export async function saveRecoverySnapshot(snapshot,indexedDBRef=globalThis.indexedDB){
  if(!hasMeaningfulRecoveryData(snapshot))return false;
  const db=await openDb(indexedDBRef);if(!db)return false;
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put({...snapshot,recoverySavedAt:new Date().toISOString()},LATEST);
    tx.oncomplete=()=>{db.close();resolve(true);};
    tx.onerror=()=>{const error=tx.error;db.close();reject(error||new Error('Recovery-Sicherung fehlgeschlagen.'));};
  });
}

export async function loadRecoverySnapshot(indexedDBRef=globalThis.indexedDB){
  const db=await openDb(indexedDBRef);if(!db)return null;
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly');
    const request=tx.objectStore(STORE).get(LATEST);
    request.onsuccess=()=>resolve(request.result||null);
    request.onerror=()=>reject(request.error||new Error('Recovery-Sicherung konnte nicht gelesen werden.'));
    tx.oncomplete=()=>db.close();
  });
}

export async function clearRecoverySnapshot(indexedDBRef=globalThis.indexedDB){
  const db=await openDb(indexedDBRef);if(!db)return false;
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(LATEST);
    tx.oncomplete=()=>{db.close();resolve(true);};
    tx.onerror=()=>{const error=tx.error;db.close();reject(error||new Error('Recovery-Sicherung konnte nicht gelöscht werden.'));};
  });
}

let timer=null;
export function scheduleRecoverySnapshot(snapshot,{delay=250,indexedDBRef=globalThis.indexedDB}={}){
  if(!hasMeaningfulRecoveryData(snapshot))return;
  if(timer)clearTimeout(timer);
  timer=setTimeout(()=>{timer=null;saveRecoverySnapshot(snapshot,indexedDBRef).catch(error=>console.warn('[recovery-backup]',error));},delay);
}
