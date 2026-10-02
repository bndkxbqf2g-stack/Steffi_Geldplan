import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SALARY_2026} from '../config/salary-2026.js';

test('persönliche Variante enthält keine Pfändungsanzeige',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.equal(html.includes('Pfändung (2 Unterhaltspflichten)'),false);
  assert.equal(html.includes('Tarif-/Pfändungsgrundlagen'),false);
  assert.equal(SALARY_2026.payroll.garnishmentEnabled,false);
});
test('Local-Storage ist von der Haupt-App getrennt',()=>{
  const storage=fs.readFileSync(new URL('../lib/storage.js',import.meta.url),'utf8');
  assert.match(storage,/freundinGeldplanGiroTx/);
  assert.equal(storage.includes('const TX_KEY = "meinGeldplanGiroTx"'),false);
});
