import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedSalarySlots} from '../lib/history-ui.js';

test('nächste zwei Auszahlungsmonate zeigen vorhandenen Forecast und fehlenden Zeitnachweis',()=>{
  const slots=expectedSalarySlots({
    today:new Date(2026,8,25,10,0),
    transactions:[],
    forecasts:[{payoutMonth:'2026-09',reportMonth:'2026-07',payout:2679.45}]
  });
  assert.deepEqual(slots.map(x=>x.payoutMonth),['2026-09','2026-10']);
  assert.equal(slots[0].status,'forecast');
  assert.equal(slots[0].payout,2679.45);
  assert.equal(slots[1].status,'outstanding');
  assert.equal(slots[1].payout,null);
});

test('nach Einlesen des fehlenden Zeitnachweises wird der zweite Monat zum Forecast',()=>{
  const slots=expectedSalarySlots({
    today:new Date(2026,8,25,10,0),
    transactions:[],
    forecasts:[
      {payoutMonth:'2026-09',reportMonth:'2026-07',payout:2679.45},
      {payoutMonth:'2026-10',reportMonth:'2026-08',payout:2815.82}
    ]
  });
  assert.equal(slots[1].status,'forecast');
  assert.equal(slots[1].payout,2815.82);
});

test('am bereits gebuchten Lohntag beginnt die Vorschau mit dem Folgemonat',()=>{
  const slots=expectedSalarySlots({
    today:new Date(2026,8,30,8,0),
    transactions:[{type:'salary',date:'2026-09-30',amount:2700}],
    forecasts:[]
  });
  assert.deepEqual(slots.map(x=>x.payoutMonth),['2026-10','2026-11']);
});
