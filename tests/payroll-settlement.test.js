import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePaidPayrollAdjustments} from '../lib/payroll-settlement.js';
import {buildPayrollMonthlyControls} from '../lib/payroll-monthly-control.js';

const slip=(periods,priorAdjustment)=>({
  month:'2026-11',totalGross:1000,payout:750,needsReview:false,
  priorAdjustment,hasPriorAdjustment:true,components:{hasVariableDetail:false},
  retroPeriods:periods
});

test('two historical periods reconcile with documented VBL, without net duplication',()=>{
  const result=summarizePaidPayrollAdjustments(slip([
    {month:'2026-08',totalGross:90,legalNet:67,vbl:2,vblDocumented:true,components:{night:90}},
    {month:'2026-09',totalGross:40,legalNet:25,vbl:1,vblDocumented:true,components:{shift:40}}
  ],89),1130);
  assert.equal(result.netReconciled,true);
  assert.deepEqual(result.rows.map(row=>row.net),[65,24]);
  assert.equal(result.reconciledNet,89);
  assert.equal(result.grossIncludingRetro,1130);
  assert.equal(result.grossOutsideForecast,0);
});

test('missing VBL never fabricates retro net; only documented zero is valid',()=>{
  const undocumented=summarizePaidPayrollAdjustments(slip([
    {month:'2026-08',totalGross:60,legalNet:45,vbl:0}
  ],45));
  assert.equal(undocumented.netReconciled,false);
  assert.equal(undocumented.rows[0].net,null);
  assert.equal(undocumented.needsReview,true);
  const zero=summarizePaidPayrollAdjustments(slip([
    {month:'2026-08',totalGross:60,legalNet:45,vbl:0,vblDocumented:true}
  ],45));
  assert.equal(zero.netReconciled,true);
  assert.equal(zero.rows[0].net,45);
});

test('one-cent reconciliation is allowed, two cents must be reviewed',()=>{
  const periods=[{month:'2026-08',totalGross:60,legalNet:45,vbl:2,vblDocumented:true}];
  assert.equal(summarizePaidPayrollAdjustments(slip(periods,43.01)).netReconciled,true);
  assert.equal(summarizePaidPayrollAdjustments(slip(periods,43.02)).netReconciled,false);
});

const forecast={
  reportMonth:'2026-09',payoutMonth:'2026-11',
  totalGross:1100,baselinePayout:600,payout:670,
  components:{fixed:{basePay:1000,careAllowance:0,universityAllowance:0},night:100,shift:0,unpriced:[]}
};

test('paid surcharges remain historically visible with exactly zero open',()=>{
  const retro={month:'2026-09',totalGross:100,legalNet:75,vbl:5,vblDocumented:true,components:{night:100}};
  const [month]=buildPayrollMonthlyControls({
    forecasts:[forecast],
    payslips:[slip([retro],70)],
    limit:3
  });
  assert.equal(month.paymentMonth,'2026-11');
  assert.equal(month.paidRetroNet,70);
  assert.equal(month.netEffect.open,0);
  assert.equal(month.totalSurcharges.open,0);
  assert.equal(month.totalNet,750);
  assert.equal(month.status,'settled');
  assert.equal(month.forecasts[0].paidRetroNet,70);
});

test('partially paid claim is gross-open but never assigned an invented net',()=>{
  const retro={month:'2026-09',totalGross:40,legalNet:31,vbl:2,vblDocumented:true,components:{night:40}};
  const [month]=buildPayrollMonthlyControls({forecasts:[forecast],payslips:[slip([retro],29)],limit:3});
  assert.equal(month.paidRetroNet,29);
  assert.equal(month.totalSurcharges.open,60);
  assert.equal(month.netEffect.open,null);
  assert.equal(month.totalNet,750);
  assert.equal(month.status,'partial');
});

test('§21 gross in actual periods is not silently treated as unpaid surcharge',()=>{
  const retro={
    month:'2026-09',totalGross:115,legalNet:81,vbl:5,vblDocumented:true,
    components:{night:100,average21:15}
  };
  const [month]=buildPayrollMonthlyControls({forecasts:[forecast],payslips:[slip([retro],76)],limit:3});
  assert.equal(month.totalSurcharges.open,0);
  assert.equal(month.settlement.average21Gross,15);
  assert.equal(month.settlement.grossOutsideForecast,15);
  assert.equal(month.netEffect.open,0);
});

test('unverifiable retro net never masquerades as a confirmed paid amount',()=>{
  const retro={month:'2026-09',totalGross:100,legalNet:75,vbl:null,components:{night:100}};
  const [month]=buildPayrollMonthlyControls({forecasts:[forecast],payslips:[slip([retro],70)],limit:3});
  assert.equal(month.paidRetroNet,null);
  assert.equal(month.status,'review');
  assert.equal(month.netEffect.open,0);
});
