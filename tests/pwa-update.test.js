import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseRemoteVersion} from '../lib/maintenance-ui.js';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');

test('Remote-Version wird aus version.js erkannt',()=>assert.equal(parseRemoteVersion("export const APP_VERSION = '0.26.0';"),'0.26.0'));
test('Update-Button umgeht HTTP- und Service-Worker-Cache',()=>{const s=fs.readFileSync(path.join(root,'lib/maintenance-ui.js'),'utf8');assert.match(s,/cache:'no-store'/);assert.match(s,/updateViaCache:'none'/);assert.match(s,/reg\.update\(\)/);assert.match(s,/location\.reload\(\)/);});
test('Update-Button lädt nach einer aktivierten Worker-Aktualisierung neu',()=>{const s=fs.readFileSync(path.join(root,'lib/maintenance-ui.js'),'utf8');assert.match(s,/workerChanged/);assert.match(s,/Aktuelle Version wird geladen/);});
test('Service Worker hält alle lokalen Kernmodule offline vor',()=>{const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');for(const f of ['lib/budget-ui.js','lib/savings-ui.js','lib/fixed-costs-ui.js','lib/fixed-cost-overrides.js','lib/history-ui.js','lib/maintenance-ui.js','lib/preferences-ui.js','lib/pending-salary.js','lib/payroll-control.js','lib/payroll-control-ui.js','lib/payroll-control-ui-v2.js','lib/payroll-net-breakdown.js','lib/payroll-net-ui.js','lib/payroll-learning.js','lib/salary-net-effects.js','lib/salary-ui.js','lib/storage.js','config/salary-2026.js'])assert.match(sw,new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));});
test('Service Worker unterstützt sofortige Aktivierung und Offline-Fallback',()=>{const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');assert.match(sw,/SKIP_WAITING/);assert.match(sw,/self\.skipWaiting/);assert.match(sw,/caches\.match\(event\.request\)/);});


test('iPhone-Home-Screen-Icon ist verlinkt und offline im App-Shell enthalten',()=>{const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');assert.match(html,/apple-touch-icon\.png/);assert.match(sw,/apple-touch-icon\.png/);});


test('Recovery- und Cloud-Module sind Teil des Offline-App-Shells',()=>{
  const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
  for(const file of ['lib/recovery-store.js','lib/recovery-bootstrap.js','lib/preferences-ui.js','lib/cloud-auth.js','lib/cloud-backup.js','lib/cloud-backup-ui.js','config/supabase.js']){
    assert.match(sw,new RegExp(file.replaceAll('.','\\.')));
  }
  assert.match(sw,/cloud-backup/);
  assert.match(sw,/supabase/);
});

test('PWA sichert den aktuellen Stand beim Verlassen sofort in Recovery',()=>{
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const recovery=fs.readFileSync(path.join(root,'lib/recovery-bootstrap.js'),'utf8');
  assert.match(app,/pagehide/);
  assert.match(app,/saveCurrentRecoverySnapshot/);
  assert.match(recovery,/delay:0/);
});
