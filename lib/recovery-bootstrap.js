import {createBackupSnapshot,restoreBackupSnapshot} from './maintenance-ui.js';
import {loadRecoverySnapshot,shouldRecoverPrimary,scheduleRecoverySnapshot,clearRecoverySnapshot} from './recovery-store.js';

export async function recoverLocalDataIfNeeded(){
  try{
    const primary=createBackupSnapshot();
    const recovery=await loadRecoverySnapshot();
    if(!shouldRecoverPrimary(primary,recovery))return false;
    restoreBackupSnapshot(recovery);
    return true;
  }catch(error){
    console.warn('[recovery-restore]',error);
    return false;
  }
}

export function scheduleCurrentRecoverySnapshot(){
  scheduleRecoverySnapshot(createBackupSnapshot());
}

// The iPhone can tear down a standalone PWA immediately after it leaves the
// foreground. Keep a synchronous-to-call-site async path for lifecycle hooks
// so the latest payroll and budget state is persisted before that happens.
export async function saveCurrentRecoverySnapshot(){
  try{return await scheduleRecoverySnapshot(createBackupSnapshot(),{delay:0});}
  catch(error){console.warn('[recovery-flush]',error);return false;}
}

export async function clearRecoveryForReset(){
  return clearRecoverySnapshot().catch(()=>false);
}
