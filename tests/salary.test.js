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
  assert.equal(Math.round(2833.19*SALARY_2026.social.vblEmployeeRate*100)/100,51.28);
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
  assert.equal(f.totalGross,2833.19);
  assert.equal(f.garnishment,0);
  assert.equal(f.payout,Number((f.legalNet-f.vbl).toFixed(2)));
});


test('Einspring-Stundenentgelt wird aus persönlicher KR-Stufe abgeleitet',()=>{
  assert.equal(springInHourlyRate(),26.69);
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
