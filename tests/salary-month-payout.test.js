import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {calculateDisplayedMonthPayout} from '../lib/salary-month-payout.js';

test('September-Zeitnachweis erscheint im November inklusive Jahressonderzahlung als Gesamtnetto',async()=>{
  let input;
  const result=await calculateDisplayedMonthPayout({
    payoutMonth:'2026-11', regularNet:2364.18,
    forecasts:[{reportMonth:'2026-09',payoutMonth:'2026-11',totalGross:3343.96,components:{springIn:450}}],
    specialNetCalculator:async args=>{input=args.forecast;return {payout:1180.21,needsReview:true};}
  });
  assert.equal(input.paymentMonth,'2026-11');
  assert.equal(input.referenceMonths[2].gross,2893.96);
  assert.equal(result.regularNet,2364.18);
  assert.equal(result.specialNet,1180.21);
  assert.equal(result.totalNet,3544.39);
  assert.equal(result.kind,'forecast');
  assert.equal(result.needsReview,true);
});

test('Nicht-November addiert keine Jahressonderzahlung und ruft keinen Zuschlagsrechner auf',async()=>{
  const result=await calculateDisplayedMonthPayout({
    payoutMonth:'2026-10',regularNet:2150,
    specialNetCalculator:async()=>{throw new Error('darf nicht aufgerufen werden');}
  });
  assert.equal(result.totalNet,2150);
  assert.equal(result.specialGross,null);
  assert.equal(result.kind,'regular');
});

test('November Ist-Bezügemitteilung enthält Sonderzahlung schon und wird nicht doppelt addiert',async()=>{
  const result=await calculateDisplayedMonthPayout({
    payoutMonth:'2026-11',regularNet:2364.18,
    payslips:[{month:'2026-11',payout:3760,specialPaymentGross:2500}],
    specialNetCalculator:async()=>{throw new Error('Netto-Ist darf nicht neu berechnet werden');}
  });
  assert.equal(result.kind,'actual');
  assert.equal(result.totalNet,3760);
  assert.equal(result.specialGross,2500);
  assert.equal(result.specialNet,null);
});

test('Fehlende Sonderzahlungs-Nettoermittlung erzeugt keine irreführende November-Gesamtsumme',async()=>{
  const result=await calculateDisplayedMonthPayout({
    payoutMonth:'2026-11',regularNet:2364.18,
    specialNetCalculator:async()=>{throw new Error('Offline-BMF');}
  });
  assert.equal(result.kind,'unavailable');
  assert.equal(result.regularNet,2364.18);
  assert.equal(result.totalNet,null);
  assert.ok(result.specialGross>0);
});

test('November-Regel arbeitet jahrübergreifend mit Referenzmonaten des Auszahlungsjahres',async()=>{
  let year;
  const result=await calculateDisplayedMonthPayout({
    payoutMonth:'2027-11',regularNet:2000,
    specialNetCalculator:async({forecast})=>{year=forecast.referenceMonths.map(entry=>entry.month);return {payout:900};}
  });
  assert.deepEqual(year,['2027-07','2027-08','2027-09']);
  assert.equal(result.totalNet,2900);
});

test('Detailprognose zeigt November inklusive separater Netto-Sonderzahlung und Gesamtsumme',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const ui=fs.readFileSync(new URL('../lib/salary-ui.js',import.meta.url),'utf8');
  for(const id of ['pPayoutLabel','pPayoutDetailLabel','pNovemberBreakdown','pRegularPayout','pSpecialGross','pSpecialNet','pNovemberStatus'])assert.ok(html.includes(`id="${id}"`));
  assert.ok(ui.includes('renderTotalForPaymentMonth(forecast.payoutMonth,learned.payout)'));
  assert.ok(ui.includes('renderTotalForPaymentMonth(report.payoutMonth,learned.payout)'));
  assert.ok(ui.includes("set('pPayout','Noch offen')"));
});
