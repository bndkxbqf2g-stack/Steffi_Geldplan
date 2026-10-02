import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPayrollControl,buildPayrollControlHistory,buildPayrollCarryovers,payrollCarryoverRegularSollLabel,payrollCardDisplay,payrollProjectedPayout,payrollDisplayedNetDifference,retroForForecast,visiblePayrollControls} from '../lib/payroll-control.js';

const forecast={
  payoutMonth:'2026-09',
  reportMonth:'2026-07',
  totalGross:4723.33,
  payout:2845.20,
  baselinePayout:2700.70,
  needsReview:false,
  components:{
    fixed:{basePay:4226.92,careAllowance:90,universityAllowance:163.51},
    night:98.01,
    saturday:0.77,
    sunday:44.12,
    shift:100,
    shiftType:'schicht',
    springIn:0
  }
};

const september={
  month:'2026-09',
  basePay:4226.92,
  careAllowance:90,
  universityAllowance:163.51,
  totalGross:4480.43,
  payout:2700.70,
  hasPriorAdjustment:false,
  needsReview:false,
  components:{night:null,saturday:null,sunday:null,shift:null,springIn:null,hasVariableDetail:false},
  retroPeriods:[]
};

test('fehlende Juli-Zuschläge sind in September rechnerisch nachvollziehbar',()=>{
  const control=buildPayrollControl({forecast,actual:september,payslips:[september]});
  assert.equal(control.status,'open');
  assert.equal(control.inferredMissingVariablePay,true);
  assert.equal(control.initialShortfall,242.90);
  assert.equal(control.remainingGross,242.90);
  assert.equal(Math.round(control.variableRows.reduce((sum,row)=>sum+row.expected,0)*100)/100,242.90);
  assert.equal(control.variableRows.find(row=>row.key==='shift').tax,'steuerpflichtig');
  assert.equal(control.variableRows.find(row=>row.key==='night').tax,'steuerfrei');
  assert.equal(control.variableRows.find(row=>row.key==='saturday').tax,'steuerpflichtig');
});

test('spätere Rückrechnung gleicht den alten Abrechnungsmonat aus',()=>{
  const october={
    month:'2026-10',
    totalGross:4480.43,
    payout:2855.90,
    priorAdjustment:155.20,
    hasPriorAdjustment:true,
    retroPeriods:[{
      month:'2026-07',
      totalGross:242.90,
      components:{night:98.01,saturday:0.77,sunday:44.12,shift:100,springIn:null}
    }]
  };
  const control=buildPayrollControl({forecast,actual:september,payslips:[september,october]});
  assert.equal(control.status,'settled');
  assert.equal(control.remainingGross,0);
  assert.equal(control.retroGross,242.90);
  assert.equal(control.exactRetroNet,155.20);
  assert.equal(control.variableRows.every(row=>row.open===0),true);
});

test('aggregierte Rückrechnung kann Gesamtanspruch ausgleichen ohne Komponenten zu erfinden',()=>{
  const october={
    month:'2026-10',
    priorAdjustment:150,
    retroPeriods:[{month:'2026-07',totalGross:242.90,components:{night:null,saturday:null,sunday:null,shift:null,springIn:null}}]
  };
  const control=buildPayrollControl({forecast,actual:september,payslips:[september,october]});
  assert.equal(control.status,'settled');
  assert.equal(control.remainingGross,0);
  assert.equal(control.variableRows.every(row=>row.retroAggregate===true),true);
});

test('Historie bleibt nach Auszahlungsmonat sortiert',()=>{
  const list=buildPayrollControlHistory({
    forecasts:[forecast,{...forecast,payoutMonth:'2026-10'}],
    payslips:[september]
  });
  assert.deepEqual(list.map(x=>x.payoutMonth),['2026-10','2026-09']);
});


test('Forecast ohne Bezügemitteilung bleibt kontrollierbar',()=>{
  const control=buildPayrollControl({forecast:{...forecast,payoutMonth:'2026-10'},actual:null,payslips:[]});
  assert.equal(control.status,'waiting');
  assert.equal(control.actualGross,null);
  assert.equal(control.remainingGross,null);
});

test('5211/5212 aus gespeichertem Zeitnachweis bestimmt Zulagenart',()=>{
  const wechsel=buildPayrollControl({
    forecast:{...forecast,components:{...forecast.components,shiftType:'none'},reportItems:[{code:'5211'}]},
    actual:null,
    payslips:[]
  });
  const schicht=buildPayrollControl({
    forecast:{...forecast,components:{...forecast.components,shiftType:'none'},reportItems:[{code:'5212'}]},
    actual:null,
    payslips:[]
  });
  assert.equal(wechsel.variableRows.find(row=>row.key==='shift').label,'Wechselschichtzulage');
  assert.equal(schicht.variableRows.find(row=>row.key==='shift').label,'Schichtzulage');
});

test('offene September-Nachzahlung wird dem nächsten ausstehenden Monat Oktober zugeordnet',()=>{
  const controls=[
    {payoutMonth:'2026-10',label:'Oktober 2026',status:'waiting',remainingGross:null},
    {payoutMonth:'2026-09',label:'September 2026',status:'open',remainingGross:242.90}
  ];
  const carry=buildPayrollCarryovers({controls,netByMonth:{'2026-09':173.19}});
  assert.deepEqual(carry,{
    '2026-10':[{
      sourceMonth:'2026-09',
      sourceLabel:'September 2026',
      net:173.19,
      gross:242.90
    }]
  });
  assert.equal(Math.round((2773.72+carry['2026-10'][0].net)*100)/100,2946.91);
});

test('erledigte Nachzahlung wird nicht mehr in einen Folgemonat übertragen',()=>{
  const controls=[
    {payoutMonth:'2026-10',label:'Oktober 2026',status:'waiting',remainingGross:null},
    {payoutMonth:'2026-09',label:'September 2026',status:'settled',remainingGross:0}
  ];
  assert.deepEqual(buildPayrollCarryovers({controls,netByMonth:{'2026-09':173.19}}),{});
});

test('offener Anspruch wandert zum nächsten noch nicht abgerechneten Monat',()=>{
  const controls=[
    {payoutMonth:'2026-11',label:'November 2026',status:'waiting',remainingGross:null},
    {payoutMonth:'2026-10',label:'Oktober 2026',status:'ok',remainingGross:0},
    {payoutMonth:'2026-09',label:'September 2026',status:'open',remainingGross:242.90}
  ];
  const carry=buildPayrollCarryovers({controls,netByMonth:{'2026-09':173.19}});
  assert.equal(carry['2026-11'][0].sourceMonth,'2026-09');
  assert.equal(carry['2026-10'],undefined);
});


test('Hinweis zum Nachzahlungsübertrag nennt den tatsächlichen Zielmonat',()=>{
  assert.equal(
    payrollCarryoverRegularSollLabel({payoutMonth:'2026-10',label:'Oktober 2026'}),
    'Reguläres Soll für Oktober 2026 bleibt unverändert'
  );
  assert.equal(
    payrollCarryoverRegularSollLabel({payoutMonth:'2026-11',label:'November 2026'}),
    'Reguläres Soll für November 2026 bleibt unverändert'
  );
});


test('Monatskacheln zeigen nur bei offenen oder zu prüfenden Monaten Details',()=>{
  assert.deepEqual(payrollCardDisplay({status:'waiting'}),{waiting:true,detailed:false});
  assert.deepEqual(payrollCardDisplay({status:'ok'}),{waiting:false,detailed:false});
  assert.deepEqual(payrollCardDisplay({status:'settled'}),{waiting:false,detailed:false});
  assert.deepEqual(payrollCardDisplay({status:'open'}),{waiting:false,detailed:true});
  assert.deepEqual(payrollCardDisplay({status:'partial'}),{waiting:false,detailed:true});
  assert.deepEqual(payrollCardDisplay({status:'review'}),{waiting:false,detailed:true});
});

test('Oktober-Auszahlung addiert die korrigierte September-Nachzahlung genau einmal',()=>{
  const october={payoutMonth:'2026-10',status:'waiting',expectedPayout:2773.72,actualPayout:null};
  const incoming=[{sourceMonth:'2026-09',sourceLabel:'September 2026',gross:242.90,net:173.19}];
  assert.equal(payrollProjectedPayout(october,incoming),2946.91);
});

test('Vorhandene Oktober-Abrechnung wird nicht mit einem offenen Übertrag überschrieben',()=>{
  const october={payoutMonth:'2026-10',status:'ok',expectedPayout:2773.72,actualPayout:2760};
  const incoming=[{sourceMonth:'2026-09',net:173.19}];
  assert.equal(payrollProjectedPayout(october,incoming),null);
});

test('mehrere offene Vormonate werden im nächsten ausstehenden Monat netto summiert',()=>{
  const controls=[
    {payoutMonth:'2026-11',label:'November 2026',status:'waiting',remainingGross:null},
    {payoutMonth:'2026-10',label:'Oktober 2026',status:'open',remainingGross:50},
    {payoutMonth:'2026-09',label:'September 2026',status:'open',remainingGross:242.90}
  ];
  const carry=buildPayrollCarryovers({controls,netByMonth:{'2026-09':173.19,'2026-10':25}});
  assert.equal(carry['2026-11'].length,2);
  assert.equal(Math.round(carry['2026-11'].reduce((sum,item)=>sum+item.net,0)*100)/100,198.19);
});

test('Teilrückrechnung ohne sicher berechneten Rest-Nettoeffekt wird nicht geraten übertragen',()=>{
  const controls=[
    {payoutMonth:'2026-10',label:'Oktober 2026',status:'waiting',remainingGross:null},
    {payoutMonth:'2026-09',label:'September 2026',status:'partial',remainingGross:100}
  ];
  assert.deepEqual(buildPayrollCarryovers({controls,netByMonth:{}}),{});
});


test('Rückrechnungen werden dem ursprünglichen Zeitnachweismonat statt dem Auszahlungsmonat zugeordnet',()=>{
  const forecast={
    payoutMonth:'2026-07',
    reportMonth:'2026-05',
    totalGross:4552.37,
    payout:2735,
    components:{
      fixed:{basePay:4226.92,careAllowance:90,universityAllowance:163.51},
      night:6.18,saturday:0,sunday:0,holiday:0,shift:60,shiftType:'schicht',springIn:0,
      average21Days:4,unpriced:[]
    },
    reportItems:[{code:'5010'},{code:'5212'}]
  };
  const actual={
    month:'2026-07',
    totalGross:4480.43,
    payout:2700.70,
    basePay:4226.92,careAllowance:90,universityAllowance:163.51,
    components:{}
  };
  const payslips=[{
    ...actual,
    retroPeriods:[{
      month:'2026-05',
      totalGross:71.94,
      components:{night:6.18,shift:60}
    }]
  }];
  const result=buildPayrollControl({forecast,actual,payslips});
  assert.equal(result.retroGross,71.94);
  assert.equal(result.variableRows.find(row=>row.key==='night').retro,6.18);
  assert.equal(result.variableRows.find(row=>row.key==='shift').retro,60);
});


test('Rückrechnung darf Leistungsmonat oder ursprünglichen Auszahlungsmonat referenzieren',()=>{
  const payslips=[
    {month:'2026-10',retroPeriods:[{month:'2026-09',totalGross:100,components:{shift:100}}]},
    {month:'2026-11',retroPeriods:[{month:'2026-07',totalGross:142.90,components:{night:98.01,saturday:.77,sunday:44.12}}]}
  ];
  const hits=retroForForecast(payslips,{reportMonth:'2026-07',payoutMonth:'2026-09'});
  assert.deepEqual(hits.map(x=>x.month),['2026-09','2026-07']);
});

test('sichtbar bleiben maximal die drei neuesten Prognosen oder Checks',()=>{
  const controls=[{payoutMonth:'2026-12'},{payoutMonth:'2026-11'},{payoutMonth:'2026-10'},{payoutMonth:'2026-09'}];
  assert.deepEqual(visiblePayrollControls(controls,3).map(x=>x.payoutMonth),['2026-12','2026-11','2026-10']);
});

test('Soll-Ist-Karte weist die Netto-Auszahlungsdifferenz aus',()=>{
  const control=buildPayrollControl({forecast:{...forecast,payout:2831.13},actual:{...september,payout:2657.94},payslips:[september]});
  assert.equal(control.payoutDifference,-173.19);
});


test('mehrere gleiche §21-Prüfpositionen werden zu einer übersichtlichen Zeile zusammengefasst',()=>{
  const control=buildPayrollControl({
    forecast:{
      payoutMonth:'2026-10',
      reportMonth:'2026-08',
      totalGross:4480.43,
      payout:2657.94,
      components:{
        fixed:{basePay:4226.92,careAllowance:90,universityAllowance:163.51},
        unpriced:[
          {code:'5161',label:'Durchschnitt §21 TV-L',quantity:1,reason:'Betrag hängt vom individuellen Durchschnittsentgelt ab'},
          {code:'5161',label:'Durchschnitt §21 TV-L',quantity:1,reason:'Betrag hängt vom individuellen Durchschnittsentgelt ab'},
          {code:'5161',label:'Durchschnitt §21 TV-L',quantity:1,reason:'Betrag hängt vom individuellen Durchschnittsentgelt ab'}
        ]
      }
    },
    actual:null,
    payslips:[]
  });
  assert.equal(control.reviewRows.length,1);
  assert.equal(control.reviewRows[0].quantity,3);
});


test('Netto-Differenz verwendet bei offenem Monat den berechneten offenen Nettoanspruch',()=>{
  assert.equal(
    payrollDisplayedNetDifference({status:'open',payoutDifference:-189.56},{totalNet:168.57}),
    -168.57
  );
});

test('Netto-Differenz fällt ohne sichere Nachberechnung auf die reine Auszahlungsdifferenz zurück',()=>{
  assert.equal(
    payrollDisplayedNetDifference({status:'open',payoutDifference:-189.56},null),
    -189.56
  );
});
