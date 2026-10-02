import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPayrollLearningSnapshot,mergePayrollLearning,summarizePayrollLearning,validateForecastWithLearning} from '../lib/payroll-learning.js';

function forecast(month='2026-09'){
  return {
    payoutMonth:month,
    reportMonth:'2026-07',
    totalGross:4723.33,
    legalNet:3026.99,
    vbl:82.92,
    garnishment:112.94,
    payout:2831.13,
    reportItems:[
      {code:'5010',hours:18.9},{code:'5011',hours:2.5},{code:'5014',hours:1.2},{code:'5024',hours:7.7},{code:'5212',hours:0}
    ],
    components:{night:98.01,saturday:.77,sunday:44.12,holiday:0,shift:100,springIn:0}
  };
}
function payslip(month='2026-09'){
  return {
    month,totalGross:4723.33,legalNet:3026.99,vbl:82.92,garnishment:112.94,payout:2831.13,
    components:{night:98.01,saturday:.77,sunday:44.12,holiday:0,shift:100,springIn:null}
  };
}

test('Soll-Ist-Lernsnapshot vergleicht Zeitnachweis-Komponenten mit der echten Abrechnung',()=>{
  const result=buildPayrollLearningSnapshot({forecast:forecast(),actual:payslip()});
  assert.equal(result.payoutMonth,'2026-09');
  assert.equal(result.rows.find(row=>row.key==='night').confirmed,true);
  assert.deepEqual(result.rows.find(row=>row.key==='night').codes,['5010','5011']);
  assert.equal(result.rows.find(row=>row.key==='shift').codes[0],'5212');
  assert.equal(result.rows.find(row=>row.key==='shift').tax,'steuerpflichtig');
});

test('Lernhistorie ersetzt denselben Monatsabgleich statt doppelt zu zählen',()=>{
  const first=buildPayrollLearningSnapshot({forecast:forecast(),actual:payslip()});
  const second={...first,createdAt:'later'};
  const merged=mergePayrollLearning([first],second);
  assert.equal(merged.length,1);
  assert.equal(merged[0].createdAt,'later');
});

test('drei identische Bestätigungen ergeben verifiziert ohne Rechenregeln automatisch zu überschreiben',()=>{
  const history=['2026-09','2026-10','2026-11'].map((month,index)=>{
    const f=forecast(month);f.reportMonth=`2026-${String(7+index).padStart(2,'0')}`;
    const a=payslip(month);
    return buildPayrollLearningSnapshot({forecast:f,actual:a});
  });
  const rules=summarizePayrollLearning(history);
  const night=rules.find(rule=>rule.key==='5010');
  assert.equal(night.observations,3);
  assert.equal(night.confirmations,3);
  assert.equal(night.confidence,'verifiziert');
});

test('Abweichungen werden als Warnung gelernt und nicht still als neue Wahrheit übernommen',()=>{
  const actual=payslip();actual.components.shift=80;
  const history=[buildPayrollLearningSnapshot({forecast:forecast(),actual})];
  const check=validateForecastWithLearning(forecast(),history);
  assert.equal(check.needsReview,true);
  assert.equal(check.warnings.find(w=>w.code==='5212').mismatches,1);
});


test('Lernsnapshot prüft auch Steuer, SV, VBL, Pfändung und Auszahlung',()=>{
  const f=forecast();
  Object.assign(f,{
    taxableGross:4581.20,wageTax:683.58,solidarity:0,churchTax:34.04,
    health:384.56,care:71.01,pension:426.05,unemployment:59.56,
    vbl:82.92,protectedPay:142.13,garnishableNet:2801.94
  });
  f.components.fixed={basePay:4226.92,careAllowance:90,universityAllowance:163.51};
  const a=payslip();
  Object.assign(a,{
    basePay:4226.92,careAllowance:90,universityAllowance:163.51,
    wageTax:683.58,solidarity:0,churchTax:34.04,
    health:384.56,care:71.01,pension:426.05,unemployment:59.56
  });
  const result=buildPayrollLearningSnapshot({forecast:f,actual:a});
  assert.equal(result.rows.find(row=>row.key==='basePay').confirmed,true);
  assert.equal(result.totals.find(row=>row.key==='taxTotal').confirmed,true);
  assert.equal(result.totals.find(row=>row.key==='socialTotal').confirmed,true);
  assert.equal(result.totals.find(row=>row.key==='garnishableNet').actual,2801.94);
  assert.equal(result.totals.find(row=>row.key==='garnishment').confirmed,true);
  assert.equal(result.totals.find(row=>row.key==='payout').confirmed,true);
});


test('Lernlogik verwendet passende Rückrechnung für den ursprünglichen Zeitnachweismonat',()=>{
  const f=forecast('2026-07');
  f.reportMonth='2026-05';
  f.components.shift=100;
  const actual=payslip('2026-07');
  actual.retroPeriods=[{
    month:'2026-05',
    components:{night:6.18,saturday:null,sunday:null,holiday:null,shift:60,springIn:null}
  }];
  const result=buildPayrollLearningSnapshot({forecast:f,actual});
  assert.equal(result.componentSource,'retro');
  assert.equal(result.componentSourceMonth,'2026-05');
  assert.equal(result.rows.find(row=>row.key==='shift').actual,60);
  assert.equal(result.rows.find(row=>row.key==='shift').confirmed,false);
});

test('Rückrechnung eines anderen Monats wird nicht fälschlich als Lernquelle verwendet',()=>{
  const f=forecast('2026-08');
  f.reportMonth='2026-06';
  const actual=payslip('2026-08');
  actual.retroPeriods=[{month:'2026-05',components:{night:6.18,shift:60}}];
  const result=buildPayrollLearningSnapshot({forecast:f,actual});
  assert.equal(result.componentSource,'current');
  assert.equal(result.componentSourceMonth,'2026-08');
});


test('spätere Rückrechnung aus einer anderen Bezügemitteilung fließt in die Lernhistorie ein',()=>{
  const f=forecast('2026-09');
  f.reportMonth='2026-07';
  const actual=payslip('2026-09');
  actual.components={night:null,saturday:null,sunday:null,holiday:null,shift:null,springIn:null,hasVariableDetail:false};
  const later={
    month:'2026-10',
    retroPeriods:[{
      month:'2026-07',
      totalGross:242.90,
      components:{night:98.01,saturday:.77,sunday:44.12,holiday:0,shift:100,springIn:null,hasVariableDetail:true}
    }]
  };
  const result=buildPayrollLearningSnapshot({forecast:f,actual,payslips:[actual,later]});
  assert.equal(result.componentSource,'retro');
  assert.equal(result.componentSourceMonth,'2026-07');
  assert.equal(result.rows.find(row=>row.key==='night').actual,98.01);
  assert.equal(result.rows.find(row=>row.key==='night').confirmed,true);
  assert.equal(result.rows.find(row=>row.key==='shift').actual,100);
  assert.equal(result.rows.find(row=>row.key==='shift').confirmed,true);
});

test('Teilzahlung im Auszahlungsmonat plus spätere Rückrechnung wird für das Lernen addiert',()=>{
  const f=forecast('2026-09');
  f.reportMonth='2026-07';
  const actual=payslip('2026-09');
  actual.components={night:40,saturday:.77,sunday:20,holiday:0,shift:40,springIn:null,hasVariableDetail:true};
  const later={
    month:'2026-10',
    retroPeriods:[{
      month:'2026-07',
      components:{night:58.01,saturday:0,sunday:24.12,holiday:0,shift:60,springIn:null,hasVariableDetail:true}
    }]
  };
  const result=buildPayrollLearningSnapshot({forecast:f,actual,payslips:[actual,later]});
  assert.equal(result.componentSource,'current+retro');
  assert.equal(result.rows.find(row=>row.key==='night').actual,98.01);
  assert.equal(result.rows.find(row=>row.key==='sunday').actual,44.12);
  assert.equal(result.rows.find(row=>row.key==='shift').actual,100);
  assert.equal(result.rows.find(row=>row.key==='shift').confirmed,true);
});


test('fehlende Komponentenwerte werden nicht als echte Nullzahlung gelernt',()=>{
  const f=forecast('2026-09');
  const actual=payslip('2026-09');
  actual.components={night:null,saturday:null,sunday:null,holiday:null,shift:null,springIn:null,hasVariableDetail:false};
  const result=buildPayrollLearningSnapshot({forecast:f,actual});
  const night=result.rows.find(row=>row.key==='night');
  const shift=result.rows.find(row=>row.key==='shift');
  assert.equal(night.actual,null);
  assert.equal(night.comparable,false);
  assert.equal(night.confirmed,false);
  assert.equal(shift.actual,null);
  assert.equal(shift.comparable,false);
  assert.equal(shift.confirmed,false);
});

test('explizit ausgewiesene 0 bleibt eine echte vergleichbare Null',()=>{
  const f=forecast('2026-09');
  const actual=payslip('2026-09');
  actual.components={night:0,saturday:0,sunday:0,holiday:0,shift:0,springIn:null,hasVariableDetail:true};
  const result=buildPayrollLearningSnapshot({forecast:f,actual});
  const shift=result.rows.find(row=>row.key==='shift');
  assert.equal(shift.actual,0);
  assert.equal(shift.comparable,true);
  assert.equal(shift.confirmed,false);
});
