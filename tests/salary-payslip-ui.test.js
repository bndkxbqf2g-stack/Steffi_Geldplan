import test from 'node:test';
import assert from 'node:assert/strict';
import {buildUpdatedPayrollLearning} from '../lib/salary-payslip-ui.js';

function forecast(){
  return {
    payoutMonth:'2026-09',
    reportMonth:'2026-07',
    totalGross:4723.33,
    legalNet:3026.99,
    vbl:82.92,
    garnishment:112.94,
    payout:2831.13,
    reportItems:[{code:'5010',hours:21.4},{code:'5024',hours:7.7},{code:'5212',hours:0}],
    components:{night:98.01,saturday:0,sunday:44.12,holiday:0,shift:100,shiftType:'schicht',springIn:0}
  };
}
function payslip(){
  return {
    month:'2026-09',
    totalGross:4723.33,
    legalNet:3026.99,
    vbl:82.92,
    garnishment:112.94,
    payout:2831.13,
    components:{night:98.01,saturday:0,sunday:44.12,holiday:0,shift:100,springIn:null}
  };
}

test('Bezügemitteilung aktualisiert die kontrollierte Payroll-Lernhistorie',()=>{
  const history=buildUpdatedPayrollLearning([forecast()],[payslip()],[]);
  assert.equal(history.length,1);
  assert.equal(history[0].payoutMonth,'2026-09');
  assert.equal(history[0].rows.find(row=>row.key==='night').confirmed,true);
  assert.equal(history[0].rows.find(row=>row.key==='shift').confirmed,true);
});

test('unveränderter Soll-Ist-Abgleich erzeugt keinen neuen Lernsnapshot',()=>{
  const first=buildUpdatedPayrollLearning([forecast()],[payslip()],[]);
  const second=buildUpdatedPayrollLearning([forecast()],[payslip()],first);
  assert.deepEqual(second,first);
});

test('Bezügemitteilung ohne passende Prognose verändert die Lernhistorie nicht',()=>{
  const history=[{id:'existing',payoutMonth:'2026-08'}];
  assert.deepEqual(buildUpdatedPayrollLearning([],[payslip()],history),history);
});


test('Workflow übernimmt spätere Rückrechnung in den passenden Lernsnapshot',()=>{
  const f=forecast();
  const base=payslip();
  base.components={night:null,saturday:null,sunday:null,holiday:null,shift:null,springIn:null,hasVariableDetail:false};
  const later={
    month:'2026-10',
    retroPeriods:[{month:'2026-07',components:{night:98.01,saturday:0,sunday:44.12,holiday:0,shift:100,springIn:null,hasVariableDetail:true}}]
  };
  const history=buildUpdatedPayrollLearning([f],[base,later],[]);
  assert.equal(history.length,1);
  assert.equal(history[0].componentSource,'retro');
  assert.equal(history[0].rows.find(row=>row.key==='night').confirmed,true);
  assert.equal(history[0].rows.find(row=>row.key==='shift').confirmed,true);
});
