import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextFixedCostPayoutDate,
  setFixedCostOverride,
  removeFixedCostOverridesForPayout,
  effectiveFixedCosts,
  totalFixedCostsForPayout
} from '../lib/fixed-cost-overrides.js';

const fixed=[
  {id:'miete',name:'Miete',amount:750},
  {id:'ticket',name:'Ticket',amount:63}
];

test('Ausnahme zielt auf den nächsten noch nicht gebuchten Lohntag',()=>{
  const payout=nextFixedCostPayoutDate({today:new Date(2026,8,25,12,0),transactions:[]});
  assert.equal(payout.getFullYear(),2026);
  assert.equal(payout.getMonth(),8);
  assert.equal(payout.getDate(),30);
});

test('nach bereits gebuchtem Lohntag zielt die Ausnahme auf den Folgemonat',()=>{
  const payout=nextFixedCostPayoutDate({
    today:new Date(2026,8,30,12,0),
    transactions:[{type:'salary',date:'2026-09-30',amount:2700}]
  });
  assert.equal(payout.getFullYear(),2026);
  assert.equal(payout.getMonth(),9);
  assert.equal(payout.getDate(),30);
});

test('einzelne Fixkosten lassen sich für genau einen Lohntag pausieren',()=>{
  const overrides=setFixedCostOverride([],{fixedCostId:'ticket',payoutDate:'2026-09-30',amount:0,baseAmount:63});
  assert.equal(totalFixedCostsForPayout(fixed,overrides,'2026-09-30'),750);
  assert.equal(totalFixedCostsForPayout(fixed,overrides,'2026-10-30'),813);
});

test('einzelne Fixkosten lassen sich einmalig reduzieren ohne Grundbetrag zu verändern',()=>{
  const overrides=setFixedCostOverride([],{fixedCostId:'miete',payoutDate:'2026-09-30',amount:500,baseAmount:750});
  const effective=effectiveFixedCosts(fixed,overrides,'2026-09-30');
  assert.equal(effective.find(x=>x.id==='miete').amount,500);
  assert.equal(fixed.find(x=>x.id==='miete').amount,750);
  assert.equal(totalFixedCostsForPayout(fixed,overrides,'2026-09-30'),563);
});

test('Ausnahmen werden nach dem betroffenen Lohntag verbraucht',()=>{
  let overrides=setFixedCostOverride([],{fixedCostId:'miete',payoutDate:'2026-09-30',amount:500,baseAmount:750});
  overrides=setFixedCostOverride(overrides,{fixedCostId:'ticket',payoutDate:'2026-10-30',amount:0,baseAmount:63});
  const remaining=removeFixedCostOverridesForPayout(overrides,'2026-09-30');
  assert.equal(remaining.length,1);
  assert.equal(remaining[0].payoutDate,'2026-10-30');
  assert.equal(totalFixedCostsForPayout(fixed,remaining,'2026-10-30'),750);
});

test('eine Reduzierung kann den normalen Betrag nie erhöhen',()=>{
  const overrides=setFixedCostOverride([],{fixedCostId:'miete',payoutDate:'2026-09-30',amount:900,baseAmount:750});
  assert.deepEqual(overrides,[]);
});
