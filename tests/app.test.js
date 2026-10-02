import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');

test('app.js bleibt schlanker Einstiegspunkt',()=>{
  const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.ok(source.split(/\r?\n/).length<=45);
  assert.match(source,/createBudgetUi/);
  assert.match(source,/createSavingsUi/);
  assert.match(source,/initSalaryUi/);
  assert.match(source,/createFixedCostsUi/);
  assert.match(source,/createHistoryUi/);
  assert.match(source,/createMaintenanceUi/);
});

test('app.js enthält keine Fachformeln oder direkten localStorage-Zugriffe',()=>{
  const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.doesNotMatch(source,/localStorage/);
  assert.doesNotMatch(source,/weeklyBudget\s*[*/+-]/);
  assert.doesNotMatch(source,/dailyBudget\s*[*/+-]/);
});


test('Gehaltsmodul kann den Kernstart nicht mehr blockieren',()=>{
  const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.doesNotMatch(source,/^import\s+\{initSalaryUi\}\s+from/m);
  const firstRefresh=source.indexOf('refresh();');
  const salaryImport=source.indexOf("import('./lib/salary-ui.js')");
  assert.ok(firstRefresh>=0);
  assert.ok(salaryImport>firstRefresh);
  assert.match(source,/\.catch\(error=>\{console\.error\('\[salary-init\]'/);
});
