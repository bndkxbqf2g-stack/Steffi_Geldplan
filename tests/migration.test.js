import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBackupSnapshot,createBackupSnapshot} from '../lib/maintenance-ui.js';
import {APP_VERSION} from '../config/version.js';

test('alte Backup-Versionen bleiben importierbar',()=>{
  const v1=normalizeBackupSnapshot({version:1,transactions:[{amount:1}],cash:5,savings:{positions:[],allocations:[]}});
  assert.equal(v1.version,1);assert.equal(v1.cash,5);assert.deepEqual(v1.salaryForecasts,[]);assert.equal(v1.theme,'system');
});

test('zukünftige unbekannte Backup-Version wird abgewiesen',()=>{
  assert.throws(()=>normalizeBackupSnapshot({version:999}),/nicht unterstützt/);
});

test('Backup-Metadaten enthalten Schema- und App-Version',()=>{
  const snap=createBackupSnapshot();
  assert.equal(snap.version,3);assert.equal(snap.appVersion,APP_VERSION);assert.ok(Number.isInteger(snap.schemaVersion));
});
