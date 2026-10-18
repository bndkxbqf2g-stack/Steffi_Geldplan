import test from 'node:test';
import assert from 'node:assert/strict';
import {buildUpdatedPayrollLearning,autoScheduleImportedPayslips,pendingSalaryFromPayslip} from '../lib/salary-payslip-ui.js';

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

test('Bezügemitteilung merkt den bestätigten Überweisungsbetrag für den geplanten Zahltag vor',()=>{
  let saved=null;
  const result=autoScheduleImportedPayslips([{month:'2026-10',payout:2831.13}],{
    pending:null,transactions:[],today:new Date(2026,9,14),save:value=>{saved=value;return true;}
  });
  assert.equal(result.status,'scheduled');
  assert.equal(saved.amount,2831.13);
  assert.equal(saved.payoutDate,'2026-10-30');
  assert.equal(saved.id,'payslip-2026-10');
  assert.equal(result.changed,true);
});

test('erneuter Import aktualisiert dieselbe manuelle Vormerkung statt eine zweite anzulegen',()=>{
  let saved=null;
  const pending={id:'manual-existing',amount:2700,text:'Lohn',payoutDate:'2026-10-30',status:'pending'};
  const result=autoScheduleImportedPayslips([{month:'2026-10',payout:2831.13}],{
    pending,transactions:[],today:new Date(2026,9,14),save:value=>{saved=value;return true;}
  });
  assert.equal(result.status,'scheduled');
  assert.equal(saved.id,'manual-existing');
  assert.equal(saved.amount,2831.13);
  assert.equal(saved.payoutDate,'2026-10-30');
});

test('ältere Bezügemitteilungen erzeugen keine rückwirkende Vormerkung',()=>{
  let saved=false;
  const result=autoScheduleImportedPayslips([{month:'2026-09',payout:2831.13}],{
    pending:null,transactions:[],today:new Date(2026,9,14),save:()=>{saved=true;return true;}
  });
  assert.equal(result.status,'past');
  assert.equal(saved,false);
});

test('fehlender oder nicht positiver Überweisungsbetrag bleibt ohne Vormerkung',()=>{
  assert.equal(pendingSalaryFromPayslip({month:'2026-10',payout:null}).status,'unavailable');
  assert.equal(pendingSalaryFromPayslip({month:'2026-10',payout:0}).status,'unavailable');
  assert.equal(pendingSalaryFromPayslip({month:'2026/10',payout:2831.13}).status,'unavailable');
});

test('eine bestehende Vormerkung für einen anderen Zahltag wird nicht überschrieben',()=>{
  let saved=false;
  const result=autoScheduleImportedPayslips([{month:'2026-10',payout:2831.13}],{
    pending:{id:'other',amount:1000,payoutDate:'2026-11-30'},
    transactions:[],today:new Date(2026,9,14),save:()=>{saved=true;return true;}
  });
  assert.equal(result.status,'conflict');
  assert.equal(saved,false);
});

test('bereits gebuchter Lohn verhindert eine zweite Vormerkung und entfernt nur die zugehörige alte',()=>{
  let saved=false,cleared=false;
  const result=autoScheduleImportedPayslips([{month:'2026-10',payout:2831.13}],{
    pending:{id:'payslip-2026-10',amount:2831.13,payoutDate:'2026-10-30'},
    transactions:[{type:'salary',date:'2026-10-30',amount:2831.13}],
    today:new Date(2026,9,14),save:()=>{saved=true;return true;},clear:()=>{cleared=true;return true;}
  });
  assert.equal(result.status,'already-booked');
  assert.equal(result.changed,true);
  assert.equal(saved,false);
  assert.equal(cleared,true);
});

test('bereits gebuchter Lohn löscht keine Vormerkung für einen anderen Monat',()=>{
  let cleared=false;
  const result=autoScheduleImportedPayslips([{month:'2026-10',payout:2831.13}],{
    pending:{id:'next-month',amount:2700,payoutDate:'2026-11-30'},
    transactions:[{type:'salary',date:'2026-10-30',amount:2831.13}],
    today:new Date(2026,9,14),clear:()=>{cleared=true;return true;}
  });
  assert.equal(result.status,'already-booked');
  assert.equal(cleared,false);
});

test('fehlgeschlagene Vormerkungsspeicherung wird als Fehler zurückgegeben',()=>{
  const result=autoScheduleImportedPayslips([{month:'2026-10',payout:2831.13}],{
    pending:null,transactions:[],today:new Date(2026,9,14),save:()=>false
  });
  assert.equal(result.status,'save-failed');
});
