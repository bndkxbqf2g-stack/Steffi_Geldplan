import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBmfInputs,socialContributions,reportComponents,garnishment2026,springInHourlyRate,springInPay} from '../lib/salary.js';
import {SALARY_2026} from '../config/salary-2026.js';

test('BMF-Profil entspricht dem neuen Profil',()=>{
  const i=buildBmfInputs(2833.19);assert.equal(i.STKL,1);assert.equal(i.ZKF,0);assert.equal(i.KVZ,2.69);assert.equal(i.PVZ,1);assert.equal(i.PVA,0);
});
test('Sozialversicherung nutzt AOK Bayern und Kinderlosenzuschlag',()=>{
  const sv=socialContributions(2945.87);
  assert.equal(sv.health,254.67);assert.equal(sv.care,70.70);
});
test('Zeitlohnarten werden getrennt berechnet',()=>{
  const c=reportComponents({items:[{code:'5010',hours:2},{code:'5024',hours:3},{code:'5211',hours:1}]});
  assert.equal(c.protectedPay,26.35);assert.equal(c.taxableExtra,150);assert.equal(c.shift,'wechsel');
});
test('VBL und SV-Hinzubetrag bleiben tariflich kalibriert',()=>{
  assert.equal(Math.round(2888.08*SALARY_2026.social.vblEmployeeRate*100)/100,52.27);
});

test("Wechselschicht wird durch Code 5211 auch ohne Stundenwert berücksichtigt", () => {
  const c=reportComponents({items:[{code:'5211',hours:null,status:'ok'}],needsReview:false});
  assert.equal(c.pay.shift,150);
  assert.equal(c.shift,'wechsel');
});

test("Schichtzulage wird durch Code 5212 auch ohne Stundenwert berücksichtigt", () => {
  const c=reportComponents({items:[{code:'5212',hours:null,status:'ok'}],needsReview:false});
  assert.equal(c.pay.shift,60);
  assert.equal(c.shift,'schicht');
});

import {calculateSalaryForecastCore} from '../lib/salary.js';

test('reiner Festbezug reproduziert die echte 2026-Kernabrechnung',()=>{
  const f=calculateSalaryForecastCore({items:[]},{wageTax:662.58,solidarity:0,churchTax:32.99,churchBase:0});
  assert.equal(f.totalGross,2888.08);
  assert.equal(f.garnishment,0);
  assert.equal(f.payout,Number((f.legalNet-f.vbl).toFixed(2)));
});


test('Einspring-Stundenentgelt wird aus persönlicher KR-Stufe abgeleitet',()=>{
  assert.equal(springInHourlyRate(),26.69);
});

test('Null-Einspringdaten brechen die Gehaltsberechnung nicht',()=>{
  assert.deepEqual(springInPay(null),{duties:0,hours:0,hourlyRate:26.69,premium:0,hourly:0,total:0});
  assert.equal(reportComponents({items:[],springIn:null}).pay.springIn,0);
});

test('Einspringprämie besteht aus 150 Euro je Dienst plus Stundenentgelt',()=>{
  assert.deepEqual(springInPay({duties:1,hours:7.7}),{duties:1,hours:7.7,hourlyRate:26.69,premium:150,hourly:205.51,total:355.51});
});

test('Einspringen wird einmalig als steuerpflichtiger Zusatzlohn ergänzt',()=>{
  const c=reportComponents({items:[{code:'5010',hours:2}],springIn:{duties:1,hours:7.7}});
  assert.equal(c.pay.springIn,355.51);
  assert.equal(c.taxableExtra,355.51);
  assert.equal(c.taxFreePay,9.16);
  assert.equal(c.needsReview,true);
});

import {calculateNetEffects} from '../lib/salary-net-effects.js';

test('Zeitnachweis-Nettoeffekt übergibt keine Null-Einspringdaten an Teilberechnungen',async()=>{
  const tax={wageTax:0,solidarity:0,churchTax:0};
  const report={items:[{code:'5010',hours:1},{code:'5212',hours:0}],unknownCodes:[],needsReview:false};
  const baseline=calculateSalaryForecastCore({items:[]},tax);
  const full=calculateSalaryForecastCore(report,tax);
  const seen=[];
  const effects=await calculateNetEffects(report,baseline,full,entry=>{
    seen.push(entry.springIn);
    return calculateSalaryForecastCore(entry,tax);
  });
  assert.equal(seen.length,3);
  assert.ok(seen.every(entry=>entry?.duties===0&&entry?.hours===0));
  assert.equal(effects.totalNet,Number((full.payout-baseline.payout).toFixed(2)));
});


test('5026 zählt zugleich als Nacht- und Sonntagszeit',()=>{
  const c=reportComponents({items:[{code:'5026',type:'sundayNight',hours:.7}]});
  assert.equal(c.hours.night,.7);
  assert.equal(c.hours.sunday,.7);
  assert.equal(c.pay.night,3.21);
  assert.equal(c.pay.sunday,4.01);
});

test('Neue UKW-Lohnarten werden fachlich getrennt behandelt',()=>{
  const c=reportComponents({items:[{code:'5034',type:'saturdayEvening',hours:1},{code:'5026',type:'sundayNight',hours:.7},{code:'5030',type:'holiday',hours:4}]});
  assert.equal(c.pay.saturdayEvening,.64);
  assert.equal(c.pay.sunday,4.01);
  assert.equal(c.taxableExtra,0);
  assert.equal(c.taxFreePay,4.65);
  assert.equal(c.needsReview,true);
  assert.equal(c.unpriced[0].code,'5030');
});
