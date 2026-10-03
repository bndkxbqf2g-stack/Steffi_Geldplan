import test from 'node:test';
import assert from 'node:assert/strict';
import {applyPaymentMonthOverride,applyPayrollPaymentOverride,DEFAULT_PAYROLL_PAYMENT_OVERRIDES,normalizePayrollPaymentOverride} from '../lib/payroll-payment-overrides.js';

test('Steffi nutzt ohne Ausnahme weiterhin die globale Standardverzögerung',()=>{
  const report=applyPayrollPaymentOverride({month:{year:2026,month:7},payoutMonth:'2026-09'});
  assert.deepEqual(DEFAULT_PAYROLL_PAYMENT_OVERRIDES,[]);
  assert.equal(report.plannedPayoutMonth,'2026-09');
  assert.equal(report.standardPayoutMonth,'2026-09');
  assert.equal(report.payoutMonth,'2026-09');
  assert.equal(report.paymentMonthOverride,undefined);
});

test('einmalige Übermittlungsverzögerung bleibt an Leistungsmonat und Planmonat gebunden',()=>{
  const report=applyPaymentMonthOverride(
    {month:{year:2026,month:7},payoutMonth:'2026-09'},
    {id:'test-delay',originMonth:'2026-07',plannedPaymentMonth:'2026-09',actualPaymentMonth:'2026-10',reason:'Testbeleg'}
  );
  assert.equal(report.plannedPayoutMonth,'2026-09');
  assert.equal(report.standardPayoutMonth,'2026-09');
  assert.equal(report.payoutMonth,'2026-10');
  assert.deepEqual(report.paymentMonthOverride,{
    id:'test-delay',originMonth:'2026-07',plannedPaymentMonth:'2026-09',actualPaymentMonth:'2026-10',oneTime:true,reason:'Testbeleg',source:null,recordedAt:null
  });
});

test('unvollständige oder rückwirkend gleiche Ausnahme wird nicht angewandt',()=>{
  assert.equal(normalizePayrollPaymentOverride({originMonth:'2026-07',plannedPaymentMonth:'2026-09'}),null);
  const report=applyPaymentMonthOverride(
    {month:{year:2026,month:7},payoutMonth:'2026-09'},
    {originMonth:'2026-07',plannedPaymentMonth:'2026-09',actualPaymentMonth:'2026-07'}
  );
  assert.equal(report.payoutMonth,'2026-09');
  assert.equal(report.paymentMonthOverride,undefined);
});
