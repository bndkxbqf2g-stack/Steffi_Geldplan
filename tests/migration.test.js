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
  assert.equal(snap.version,7);assert.equal(snap.appVersion,APP_VERSION);assert.ok(Number.isInteger(snap.schemaVersion));
});

test('Backup enthält vorgemerkten Lohn getrennt von Transaktionen',()=>{
  const snap=createBackupSnapshot();
  assert.ok(Object.prototype.hasOwnProperty.call(snap,'pendingSalary'));
});

test('Backup enthält Darstellungspräferenz für Erklärungen',()=>{
  const snap=createBackupSnapshot();
  assert.equal(typeof snap.showExplanations,'boolean');
});

test('Backup enthält einmalige Fixkosten-Ausnahmen',()=>{
  const snap=createBackupSnapshot();
  assert.ok(Array.isArray(snap.fixedCostOverrides));
});

test('Backup enthält die Payroll-Lernhistorie',()=>{
  const snap=createBackupSnapshot();
  assert.ok(Array.isArray(snap.payrollLearning));
});

test('Recovery-Backup mit fixedCosts null überschreibt bestehende Fixkosten nicht mit leerer Liste',()=>{
  const clean=normalizeBackupSnapshot({version:7,transactions:[],cash:71.31,fixedCosts:null});
  assert.equal(clean.fixedCosts,null);
});

test('Explizit leere Fixkostenliste bleibt absichtliches Leeren',()=>{
  const clean=normalizeBackupSnapshot({version:7,transactions:[],cash:0,fixedCosts:[]});
  assert.deepEqual(clean.fixedCosts,[]);
});
