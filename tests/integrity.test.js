import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const allJs=['app.js',...fs.readdirSync(path.join(root,'lib')).filter(x=>x.endsWith('.js')).map(x=>`lib/${x}`)].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');

test('sichtbare Aktionsbuttons sind im JavaScript verdrahtet',()=>{
  ['incomeBtn','expenseBtn','correctionBtn','withdrawBtn','savingRateBtn','salaryBtn','openHistoryBtn','addFixBtn','timeReportBtn','payslipBtn','exportBtn','importBtn','updateBtn','resetBtn'].forEach(id=>assert.match(allJs,new RegExp(id),id));
});

test('PWA Service Worker wird wieder registriert',()=>assert.match(allJs,/serviceWorker\.register/));

test('Lohnbuchung nutzt verwaltete Fixkosten statt alten 2156-Hardcode',()=>{
  const source=fs.readFileSync(path.join(root,'lib/budget-ui.js'),'utf8');
  assert.match(source,/totalFixedCosts\(getFixedCosts\(\)\)/);
  assert.doesNotMatch(source,/\|\|2156/);
});
