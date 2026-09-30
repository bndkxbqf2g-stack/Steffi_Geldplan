import test from 'node:test';
import assert from 'node:assert/strict';
import {hasMeaningfulRecoveryData,shouldRecoverPrimary} from '../lib/recovery-store.js';

test('leerer lokaler Stand gilt nicht als sinnvolle Recovery-Basis',()=>{
  assert.equal(hasMeaningfulRecoveryData({cash:0,transactions:[],salaryForecasts:[],payslips:[],payrollLearning:[],savings:{positions:[],allocations:[]}}),false);
});

test('Budget- oder Lohndaten gelten als sinnvolle Recovery-Basis',()=>{
  assert.equal(hasMeaningfulRecoveryData({cash:85}),true);
  assert.equal(hasMeaningfulRecoveryData({salaryForecasts:[{payoutMonth:'2026-09'}]}),true);
  assert.equal(hasMeaningfulRecoveryData({payslips:[{month:'2026-09'}]}),true);
});

test('Recovery wird nur bei leerem Primärspeicher ausgelöst',()=>{
  const recovery={cash:85,transactions:[{id:'x'}]};
  assert.equal(shouldRecoverPrimary({cash:0,transactions:[]},recovery),true);
  assert.equal(shouldRecoverPrimary({cash:20,transactions:[]},recovery),false);
});
