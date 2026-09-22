import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCurrentCycleBudget} from '../lib/budget-ui.js';

test('Budget-UI hält Abhebung im laufenden Abschnitt neutral',()=>{
  const result=calculateCurrentCycleBudget({
    giro:1520,
    transactions:[{type:'salary',amount:2100,date:'2026-09-30'},{type:'withdrawal',amount:-300,date:'2026-10-04'}],
    savings:{positions:[],allocations:[]},
    today:new Date('2026-10-04T12:00:00')
  });
  assert.equal(result.dailyBudget,70);
  assert.equal(result.weeklyBudget,490);
});

test('Reservierte Sparrate wirkt erst ab effectiveFrom auf das Girobudget',()=>{
  const result=calculateCurrentCycleBudget({
    giro:1520,
    transactions:[{type:'salary',amount:2100,date:'2026-09-30'},{type:'withdrawal',amount:-300,date:'2026-10-04'}],
    savings:{positions:[{id:'u',name:'Urlaub'}],allocations:[{positionId:'u',amount:100,sourceSegmentStart:'2026-10-04',effectiveFrom:'2026-10-11'}]},
    today:new Date('2026-10-11T12:00:00')
  });
  assert.equal(result.remainingDays,19);
  assert.equal(Number(result.dailyBudget.toFixed(2)),74.74);
});


test('laufender Altbestand nutzt festen Budgetanker bis zum kommenden Lohn',()=>{
  const result=calculateCurrentCycleBudget({
    giro:71.31,
    transactions:[{type:'base',amount:71.31,date:'2026-09-22'}],
    savings:{positions:[],allocations:[]},
    today:new Date('2026-09-22T12:00:00'),
    anchorDate:'2026-09-22'
  });
  assert.equal(result.active,true);
  assert.equal(result.provisional,true);
  assert.equal(result.daysToPayday,8);
  assert.equal(result.remainingDays,3);
  assert.equal(result.segmentDays,3);
  assert.equal(result.segmentStart.toISOString().slice(0,10),'2026-09-27');
  assert.equal(Number(result.dailyBudget.toFixed(2)),23.77);
  assert.equal(Number(result.weeklyBudget.toFixed(2)),71.31);
});

test('Budgetanker bleibt innerhalb des Abschnitts stabil und rechnet Sonntag neu',()=>{
  const args={giro:80,transactions:[{type:'base',amount:80,date:'2026-09-22'}],savings:{positions:[],allocations:[]},anchorDate:'2026-09-22'};
  const wed=calculateCurrentCycleBudget({...args,today:new Date('2026-09-23T12:00:00')});
  assert.equal(wed.daysToPayday,7);
  assert.equal(wed.remainingDays,3);
  assert.equal(wed.segmentDays,3);
  assert.equal(Number(wed.dailyBudget.toFixed(2)),26.67);
  assert.equal(wed.weeklyBudget,80);
  const sun=calculateCurrentCycleBudget({...args,today:new Date('2026-09-27T12:00:00')});
  assert.equal(sun.daysToPayday,3);
  assert.equal(sun.remainingDays,3);
  assert.equal(sun.segmentDays,3);
  assert.equal(Number(sun.dailyBudget.toFixed(2)),26.67);
  assert.equal(sun.weeklyBudget,80);
});

test('ab Lohntag startet der Budgetanker keinen neuen Zyklus automatisch',()=>{
  const result=calculateCurrentCycleBudget({giro:80,transactions:[{type:'base',amount:80,date:'2026-09-22'}],savings:{positions:[],allocations:[]},today:new Date('2026-09-30T12:00:00'),anchorDate:'2026-09-22'});
  assert.equal(result.active,false);
  assert.equal(result.segmentStart,null);
});

test('Lohnbuchung aktiviert den Zyklus und fehlender Folgelohn startet keinen neuen automatisch',()=>{
  const transactions=[{type:'salary',amount:2100,date:'2026-09-30'}];
  const active=calculateCurrentCycleBudget({giro:2100,transactions,savings:{positions:[],allocations:[]},today:new Date('2026-10-04T12:00:00')});
  assert.equal(active.active,true);
  assert.equal(active.segmentDays,7);
  const expired=calculateCurrentCycleBudget({giro:500,transactions,savings:{positions:[],allocations:[]},today:new Date('2026-10-30T12:00:00')});
  assert.equal(expired.active,false);
  assert.equal(expired.segmentStart,null);
});
