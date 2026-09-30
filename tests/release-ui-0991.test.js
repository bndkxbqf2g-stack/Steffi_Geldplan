import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const savingsUi=fs.readFileSync(new URL('../lib/savings-ui.js',import.meta.url),'utf8');
const salaryUi=fs.readFileSync(new URL('../lib/salary-ui.js',import.meta.url),'utf8');

test('Sparen ist auf Zweck + Betrag + Verlauf reduziert',()=>{
  assert.match(html,/id="sSavingPurpose"/);
  assert.match(html,/id="sSavingAmount"/);
  assert.match(html,/id="savingRateBtn"[^>]*>Sparen</);
  assert.match(html,/Sparverlauf/);
  assert.doesNotMatch(html,/id="sSavingPosition"/);
  assert.doesNotMatch(html,/id="savingPositionBtn"/);
  assert.doesNotMatch(html,/Max\. zusätzliche Sparrate/);
  assert.match(savingsUi,/ensurePosition/);
  assert.match(savingsUi,/Freigeben/);
});

test('Gehaltsansicht verbindet Prognose, Bezügemitteilung und die letzten drei Checks',()=>{
  assert.match(html,/#prognose \.row \.v/);
  assert.match(html,/id="pTaxableGross"/);
  assert.match(html,/id="pShiftAllowance"/);
  assert.match(html,/id="pPayoutDetail"/);
  assert.match(html,/id="payslipBtn"/);
  assert.match(html,/id="payrollControlList"/);
  assert.match(html,/Letzte 3 Prognosen \/ Checks/);
});

test('Zeitlohnarten werden deutsch und Zulagen ohne Stundenwert dargestellt',()=>{
  assert.match(salaryUi,/5010':'Nachtarbeit/);
  assert.match(salaryUi,/5211':'Wechselschichtzulage/);
  assert.match(salaryUi,/5212':'Schichtzulage/);
  assert.match(salaryUi,/return 'monatlich'/);
});
