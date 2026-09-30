import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPayrollLearningCalibration,learnedPayoutForForecast} from '../lib/payroll-learning-calibration.js';

function snapshot(month,payoutDifference,{grossConfirmed=true,prior=false,componentMismatch=false}={}){
  return {
    payoutMonth:month,
    hasPriorAdjustment:prior,
    rows:[
      {key:'night',comparable:true,confirmed:!componentMismatch},
      {key:'shift',comparable:true,confirmed:true}
    ],
    totals:[
      {key:'totalGross',comparable:true,confirmed:grossConfirmed,difference:grossConfirmed?0:50},
      {key:'taxTotal',comparable:true,confirmed:false,difference:-2},
      {key:'socialTotal',comparable:true,confirmed:false,difference:1},
      {key:'legalNet',comparable:true,confirmed:false,difference:1},
      {key:'vbl',comparable:true,confirmed:false,difference:.2},
      {key:'garnishment',comparable:!prior,confirmed:false,difference:prior?null:0},
      {key:'payout',comparable:!prior,confirmed:false,difference:prior?null:payoutDifference}
    ]
  };
}

test('zwei stabile saubere Abrechnungen aktivieren eine lernende Auszahlungskalibrierung',()=>{
  const history=[snapshot('2026-10',-4),snapshot('2026-11',-6)];
  const result=buildPayrollLearningCalibration(history);
  assert.equal(result.payout.observations,2);
  assert.equal(result.payout.applicable,true);
  assert.equal(result.payout.adjustment,-5);
  assert.equal(result.payout.confidence,'stabil');

  const forecast={payout:2808.94,needsReview:false,components:{unpriced:[],springInVblUnverified:false}};
  const learned=learnedPayoutForForecast(forecast,history);
  assert.equal(learned.applied,true);
  assert.equal(learned.payout,2803.94);
});

test('ein einzelner Monat wird beobachtet aber noch nicht automatisch auf Zukunftsprognosen angewandt',()=>{
  const history=[snapshot('2026-10',-5)];
  const learned=learnedPayoutForForecast({payout:2808.94,components:{unpriced:[]}},history);
  assert.equal(learned.observations,1);
  assert.equal(learned.applied,false);
  assert.equal(learned.payout,2808.94);
});

test('Monate mit Bruttoabweichung oder variabler Lohnartabweichung verunreinigen die Kalibrierung nicht',()=>{
  const history=[
    snapshot('2026-09',-189.56,{grossConfirmed:false}),
    snapshot('2026-10',-100,{componentMismatch:true}),
    snapshot('2026-11',-4),
    snapshot('2026-12',-6)
  ];
  const result=buildPayrollLearningCalibration(history);
  assert.equal(result.payout.observations,2);
  assert.equal(result.payout.adjustment,-5);
});

test('Nachverrechnungsmonate werden nicht als Auszahlungskalibrierung gelernt',()=>{
  const history=[
    snapshot('2026-10',50,{prior:true}),
    snapshot('2026-11',-4),
    snapshot('2026-12',-6)
  ];
  const result=buildPayrollLearningCalibration(history);
  assert.equal(result.payout.observations,2);
  assert.equal(result.payout.adjustment,-5);
});

test('offene Prüfpositionen verhindern die Anwendung einer sonst stabilen Kalibrierung',()=>{
  const history=[snapshot('2026-10',-4),snapshot('2026-11',-6)];
  const learned=learnedPayoutForForecast({
    payout:2808.94,
    needsReview:true,
    components:{unpriced:[{code:'5161'}]}
  },history);
  assert.equal(learned.applied,false);
  assert.equal(learned.payout,2808.94);
});
