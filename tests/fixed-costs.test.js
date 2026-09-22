import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FIXED_COSTS,normalizeFixedCosts,totalFixedCosts,addFixedCost,updateFixedCost,removeFixedCost} from '../lib/fixed-costs.js';

test('Standard-Fixkosten der persönlichen Variante ergeben 1424,21 Euro',()=>{
  assert.equal(DEFAULT_FIXED_COSTS.length,19);
  assert.equal(Number(totalFixedCosts().toFixed(2)),1424.21);
});
test('Fixkosten bleiben editierbar',()=>{
  let list=normalizeFixedCosts(); list=addFixedCost(list,{id:'x',name:'Test',amount:10});
  list=updateFixedCost(list,'x',{amount:12}); assert.equal(list.find(x=>x.id==='x').amount,12);
  list=removeFixedCost(list,'x'); assert.equal(list.some(x=>x.id==='x'),false);
});
