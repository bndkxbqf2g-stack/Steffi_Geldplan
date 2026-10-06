import test from 'node:test';
import assert from 'node:assert/strict';
import {SALARY_2026,fixedGross} from '../config/salary-2026.js';
import {annualSpecialPaymentForecast,annualSpecialPaymentReferenceMonths} from '../lib/annual-special-payment.js';
import {expectedSalarySlots} from '../lib/history-ui.js';
import {parsePayslipComponents} from '../lib/payslip.js';

test('Jahressonderzahlung nutzt jährlich die TV-L-Referenzmonate Juli bis September',()=>{
  assert.deepEqual(annualSpecialPaymentReferenceMonths(2026),['2026-07','2026-08','2026-09']);
  const forecast=annualSpecialPaymentForecast({year:2026});
  assert.equal(forecast.rate,0.8814);
  assert.equal(forecast.averageEntitlementGross,fixedGross());
  assert.equal(forecast.gross,Math.round(fixedGross()*0.8814*100)/100);
  assert.equal(forecast.paymentMonth,'2026-11');
  assert.equal(forecast.source,'estimate');
  assert.equal(forecast.needsReview,true);
  assert.match(SALARY_2026.annualSpecialPayment.source,/TV-L §20/);
});

test('belegte Juli-September-Bezüge ersetzen die reine Fixgehalts-Schätzung',()=>{
  const forecast=annualSpecialPaymentForecast({
    year:2026,
    payslips:[
      {month:'2026-07',totalGross:3000},
      {month:'2026-08',totalGross:3100},
      {month:'2026-09',totalGross:3200}
    ]
  });
  assert.equal(forecast.source,'actual');
  assert.equal(forecast.averageEntitlementGross,3100);
  assert.equal(forecast.gross,Math.round(3100*0.8814*100)/100);
});

test('November-Sonderzahlung und November-Zeitnachweis bleiben getrennt',()=>{
  const slots=expectedSalarySlots({
    today:new Date(2026,9,5,10,0),
    forecasts:[
      {payoutMonth:'2026-11',reportMonth:'2026-09',payout:1700},
      {payoutMonth:'2027-01',reportMonth:'2026-11',payout:1800}
    ],
    annualSpecialPayment:{paymentMonth:'2026-11',gross:1000,net:500,source:'estimate',needsReview:true}
  });
  assert.deepEqual(slots.map(slot=>slot.payoutMonth),['2026-10','2026-11']);
  assert.equal(slots[1].payout,2200);
  assert.equal(slots[1].regularPayout,1700);
  assert.equal(slots[1].specialPayment.net,500);
});

test('Ist-Sonderzahlung wird nicht doppelt zur November-Auszahlung addiert',()=>{
  const slots=expectedSalarySlots({
    today:new Date(2026,9,5,10,0),
    payslips:[{month:'2026-11',payout:2700,specialPaymentGross:1000}],
    forecasts:[{payoutMonth:'2026-11',reportMonth:'2026-09',payout:1700}],
    annualSpecialPayment:{paymentMonth:'2026-11',gross:1000,net:500,source:'estimate',needsReview:true}
  });
  assert.equal(slots[1].status,'actual');
  assert.equal(slots[1].payout,2700);
  assert.equal(slots[1].specialPayment.actual,true);
  assert.equal(slots[1].specialPayment.net,null);
});

test('Bezügemitteilung erkennt Sonderzahlung TV-L als separates Ist-Element',()=>{
  const components=parsePayslipComponents('Sonderzahlung TVL masch. ELSGZ 2.500,00');
  assert.equal(components.specialPayment,2500);
});
