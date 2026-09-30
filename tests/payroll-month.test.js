import test from 'node:test';
import assert from 'node:assert/strict';
import {payrollMonthKey,samePayrollMonth} from '../lib/payroll-month.js';

test('alte Monatsformate werden für Prognose und Abrechnung gleich behandelt',()=>{
  assert.equal(payrollMonthKey('09/2026'),'2026-09');
  assert.equal(payrollMonthKey('2026-09'),'2026-09');
  assert.equal(samePayrollMonth('09/2026','2026-09'),true);
});
