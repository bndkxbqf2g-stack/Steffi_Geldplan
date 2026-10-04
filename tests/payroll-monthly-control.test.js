import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPayrollMonthlyControls,normalizePayrollMonth,payrollForecastStorageKey} from '../lib/payroll-monthly-control.js';

const baseForecast={
  totalGross:1000,
  baselinePayout:600,
  payout:600,
  components:{fixed:{basePay:1000,careAllowance:0,universityAllowance:0},night:0,shift:0,unpriced:[]}
};

test('normalisiert Monatswerte ohne persönliche Konfiguration',()=>{
  assert.equal(normalizePayrollMonth('09/2026'),'2026-09');
  assert.equal(normalizePayrollMonth('2026-09'),'2026-09');
  assert.equal(payrollForecastStorageKey({reportMonth:'2026-07',payoutMonth:'2026-09'}),'2026-07:2026-09');
});

test('fasst mehrere Leistungsmonate im tatsächlichen Zahlungsmonat zusammen und setzt Festentgelt nur einmal an',()=>{
  const forecasts=[
    {...baseForecast,reportMonth:'2026-07',payoutMonth:'2026-09',paymentMonth:'2026-10',totalGross:1100,payout:650,components:{...baseForecast.components,night:100}},
    {...baseForecast,reportMonth:'2026-08',payoutMonth:'2026-10',totalGross:1050,payout:625,components:{...baseForecast.components,shift:50,shiftType:'schicht'}}
  ];
  const payslips=[{
    month:'2026-10',totalGross:1150,payout:675,needsReview:false,
    components:{night:null,shift:50,hasVariableDetail:true},
    retroPeriods:[{month:'2026-07',totalGross:100,components:{night:100}}]
  }];
  const [control]=buildPayrollMonthlyControls({forecasts,payslips,limit:3});
  assert.equal(control.paymentMonth,'2026-10');
  assert.deepEqual(control.originMonths,['2026-07','2026-08']);
  assert.deepEqual(control.regularPayoutMonths,['2026-09','2026-10']);
  assert.equal(control.fixedMonthlyGross,1000);
  assert.equal(control.expectedGross,1150);
  assert.equal(control.actualGross,1150);
  assert.equal(control.totalSurcharges.expected,150);
  assert.equal(control.totalSurcharges.considered,150);
  assert.equal(control.totalSurcharges.open,0);
  assert.equal(control.taxFree.expected,100);
  assert.equal(control.taxable.expected,50);
  assert.equal(control.taxFree.open,0);
  assert.equal(control.taxable.open,0);
  assert.equal(control.status,'settled');
  assert.equal(control.totalNet,675);
  assert.equal(control.forecasts.length,2);
});

test('konkrete Verzögerung verschiebt nur den betroffenen Leistungsmonat',()=>{
  const forecasts=[
    {...baseForecast,reportMonth:'2026-07',payoutMonth:'2026-09',paymentMonth:'2026-10',totalGross:1100,payout:650,components:{...baseForecast.components,night:100}},
    {...baseForecast,reportMonth:'2026-08',payoutMonth:'2026-10',totalGross:1050,payout:625,components:{...baseForecast.components,shift:50}}
  ];
  const controls=buildPayrollMonthlyControls({forecasts,payslips:[],limit:5});
  assert.deepEqual(controls.map(item=>item.paymentMonth),['2026-10']);
  assert.deepEqual(controls[0].regularPayoutMonths,['2026-09','2026-10']);
  assert.equal(controls[0].status,'waiting');
  assert.equal(controls[0].statusLabel,'Abrechnung ausstehend');
  assert.equal(controls[0].actualPayout,null);
  assert.equal(controls[0].netEffect.status,'prognostiziert');
});

test('ohne Bezügemitteilung wird kein tatsächliches Null-Netto vorgetäuscht',()=>{
  const controls=buildPayrollMonthlyControls({
    forecasts:[{...baseForecast,reportMonth:'2026-08',payoutMonth:'2026-10',totalGross:1050,payout:625,components:{...baseForecast.components,shift:50}}],
    payslips:[],
    limit:3
  });
  assert.equal(controls[0].status,'waiting');
  assert.equal(controls[0].actualPaymentMonth,null);
  assert.equal(controls[0].actualPayout,null);
  assert.equal(controls[0].totalNet,625);
  assert.match(controls[0].hints[0],/Abrechnung ausstehend/);
});

test('unsichere Einzelposition bleibt sichtbar, setzt einen ausstehenden Monat aber nicht auf Bitte prüfen',()=>{
  const controls=buildPayrollMonthlyControls({
    forecasts:[{...baseForecast,reportMonth:'2026-08',payoutMonth:'2026-10',totalGross:1050,payout:625,needsReview:true,components:{...baseForecast.components,shift:50,unpriced:[{code:'5161',label:'Durchschnitt §21 TV-L',quantity:1,reason:'Betrag unbekannt'}]}}],
    payslips:[],
    limit:3
  });
  assert.equal(controls[0].status,'waiting');
  assert.equal(controls[0].reviewRows[0].status,'UNSICHER/PRÜFEN');
  assert.match(controls[0].hints[1],/UNSICHER\/PRÜFEN/);
});

test('identische Rückrechnung wird bei wiederholter Übermittlung nur einmal berücksichtigt',()=>{
  const forecast={...baseForecast,reportMonth:'2026-07',payoutMonth:'2026-09',totalGross:1100,payout:650,components:{...baseForecast.components,night:100}};
  const duplicate={month:'2026-07',totalGross:100,components:{night:100}};
  const controls=buildPayrollMonthlyControls({
    forecasts:[forecast],
    payslips:[
      {month:'2026-10',totalGross:1000,payout:600,components:{hasVariableDetail:false},retroPeriods:[duplicate]},
      {month:'2026-11',totalGross:1000,payout:600,components:{hasVariableDetail:false},retroPeriods:[duplicate]}
    ],
    limit:3
  });
  const october=controls.find(item=>item.paymentMonth==='2026-10');
  assert.equal(october.retro.length,1);
  assert.equal(october.totalSurcharges.considered,100);
  assert.equal(october.totalSurcharges.open,0);
});
