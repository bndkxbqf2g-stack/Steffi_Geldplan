import test from 'node:test';
import assert from 'node:assert/strict';
import {reportComponents} from '../lib/salary.js';

test('Samstag bleibt steuerpflichtig, Nacht und Sonntag steuerfrei',()=>{
  const c=reportComponents({items:[{code:'5010',hours:2},{code:'5014',hours:3},{code:'5024',hours:4}]});
  assert.equal(c.pay.night,9.16);
  assert.equal(c.pay.saturday,1.92);
  assert.equal(c.pay.sunday,22.92);
  assert.equal(c.taxFreePay,32.08);
  assert.equal(c.taxableExtra,1.92);
});

test('Wechselschichtzulage ist bei 60 Prozent anteilig',()=>{
  const c=reportComponents({items:[{code:'5211',hours:1}]});
  assert.equal(c.taxableExtra,150);
});
