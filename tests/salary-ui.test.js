import test from 'node:test';
import assert from 'node:assert/strict';
import { salaryMonthLabel, comparisonLabel, restoreReportFromForecast, refreshStoredSalaryForecasts, salaryDisplayPayout } from '../lib/salary-ui.js';

test('salary month label formatiert YYYY-MM als MM/YYYY',()=>assert.equal(salaryMonthLabel('2026-09'),'09/2026'));
test('comparison label unterscheidet Treffer, Abweichung und Prüfung',()=>{
  assert.equal(comparisonLabel('ok'),'Prognose trifft Abrechnung');
  assert.equal(comparisonLabel('different'),'Abweichung erkannt');
  assert.equal(comparisonLabel('review'),'Bitte prüfen');
});
test('comparison label kennzeichnet Nachverrechnung ohne falschen Prognosefehler',()=>assert.equal(comparisonLabel('adjusted'),'Kernwerte stimmen · Nachverrechnung vorhanden'));
test('gespeicherte Prognose kann nach PWA-Neustart wieder als Zeitnachweis aktiviert werden',()=>{
  const report=restoreReportFromForecast({payoutMonth:'2026-09',reportMonth:'2026-07',reportItems:[{code:'5010',type:'night',hours:21.4,amount:null}],needsReview:false,springIn:{duties:0,hours:0}});
  assert.deepEqual(report.month,{year:2026,month:7});
  assert.equal(report.payoutMonth,'2026-09');
  assert.equal(report.items[0].code,'5010');
});

test('alte gespeicherte September-Prognose wird einmalig mit aktuellen Regeln neu aufgebaut',async()=>{
  const stale={
    forecastModel:2,
    payoutMonth:'2026-09',
    reportMonth:'2026-07',
    payout:2847.50,
    totalGross:4723.33,
    reportItems:[
      {code:'5010',hours:21.4},
      {code:'5014',hours:1.2},
      {code:'5024',hours:7.7},
      {code:'5212',hours:0}
    ],
    unknownCodes:[],
    needsReview:false
  };
  const baseline={
    totalGross:4480.43,taxableGross:4480.43,wageTax:662.58,solidarity:0,churchTax:32.99,
    sv:{health:390.86,care:72.21,pension:433.25,unemployment:60.56},
    legalNet:2827.98,vbl:81.10,protectedPay:0,garnishableNet:2746.88,garnishment:88.94,payout:2657.94,
    components:{hours:{night:0,saturday:0,sunday:0,holiday:0},pay:{night:0,saturday:0,sunday:0,holiday:0,shift:0},shift:'none',average21Days:0,unpriced:[],springIn:{duties:0,hours:0,total:0},springInVblUnverified:false}
  };
  const current={
    totalGross:4723.33,taxableGross:4581.20,wageTax:683.58,solidarity:0,churchTax:34.04,
    sv:{health:384.56,care:71.01,pension:426.05,unemployment:59.56},
    legalNet:3026.99,vbl:82.92,protectedPay:142.13,garnishableNet:2801.94,garnishment:112.94,payout:2831.13,
    needsReview:false,
    components:{
      hours:{night:21.4,saturday:1.2,sunday:7.7,holiday:0},
      pay:{night:98.01,saturday:.77,sunday:44.12,holiday:0,shift:100},
      shift:'schicht',average21Days:0,unpriced:[],springIn:{duties:0,hours:0,total:0},springInVblUnverified:false
    }
  };
  const saved=[];
  const result=await refreshStoredSalaryForecasts({
    forecasts:[stale],
    calculator:async report=>(report.items||[]).length?current:baseline,
    effectsCalculator:async()=>({complete:true,totalNet:173.19}),
    persist:value=>{saved.push(...value);return true;}
  });
  assert.equal(result.changed,true);
  assert.equal(saved.length,1);
  assert.equal(saved[0].forecastModel,3);
  assert.equal(saved[0].payout,2831.13);
  assert.equal(saved[0].baselinePayout,2657.94);
  assert.equal(saved[0].netEffects.totalNet,173.19);
});

test('aktuelle Prognose wird nicht bei jedem App-Start erneut gespeichert',async()=>{
  let persisted=false;
  const current={forecastModel:3,payoutMonth:'2026-09',reportMonth:'2026-07',payout:2831.13};
  const result=await refreshStoredSalaryForecasts({
    forecasts:[current],
    calculator:async()=>{throw new Error('darf nicht neu rechnen');},
    persist:()=>{persisted=true;return true;}
  });
  assert.equal(result.changed,false);
  assert.equal(persisted,false);
  assert.equal(result.forecasts[0],current);
});


test('Gehaltsprognose kann stabile Lernhistorie auf zukünftige Auszahlung anwenden',()=>{
  const learning=['2026-07','2026-08'].map((month,index)=>({
    payoutMonth:month,
    hasPriorAdjustment:false,
    rows:[{key:'night',comparable:true,confirmed:true}],
    totals:[
      {key:'totalGross',comparable:true,confirmed:true,difference:0},
      {key:'payout',comparable:true,confirmed:false,difference:index===0?-4:-6}
    ]
  }));
  const result=salaryDisplayPayout({
    payout:2808.94,
    needsReview:false,
    components:{unpriced:[],springInVblUnverified:false}
  },learning);
  assert.equal(result.applied,true);
  assert.equal(result.payout,2803.94);
});
