import test from 'node:test';
import assert from 'node:assert/strict';
import { salaryMonthLabel, comparisonLabel } from '../lib/salary-ui.js';

test('salary month label formatiert YYYY-MM als MM/YYYY',()=>assert.equal(salaryMonthLabel('2026-09'),'09/2026'));
test('comparison label unterscheidet Treffer, Abweichung und Prüfung',()=>{
  assert.equal(comparisonLabel('ok'),'Prognose trifft Abrechnung');
  assert.equal(comparisonLabel('different'),'Abweichung erkannt');
  assert.equal(comparisonLabel('review'),'Bitte prüfen');
});
test('comparison label kennzeichnet Nachverrechnung ohne falschen Prognosefehler',()=>assert.equal(comparisonLabel('adjusted'),'Kernwerte stimmen · Nachverrechnung vorhanden'));
