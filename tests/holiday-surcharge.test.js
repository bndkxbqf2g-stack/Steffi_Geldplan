import test from 'node:test';
import assert from 'node:assert/strict';
import {SALARY_2026} from '../config/salary-2026.js';
import {parseTimeReportText,parseWageLine} from '../lib/pdf.js';
import {reportComponents,salaryForecastBreakdown} from '../lib/salary.js';

test('UKW-Pflegetabelle 2026 enthält die recherchierten Feiertagswerte für KR8 Stufe 3',()=>{
  assert.equal(SALARY_2026.surcharges.holidayWithoutTimeOff,30.94);
  assert.equal(SALARY_2026.surcharges.holidayWithTimeOff,8.02);
  assert.equal(SALARY_2026.surcharges.dec24And31,8.02);
});

test('explizite Feiertagsarbeit ohne Freizeitausgleich wird auch bei unbekanntem internem Code sicher erkannt',()=>{
  const line='15.07.2026 06:00 13:42 3A35 5035: Feiertagsarbeit ohne FZA 7,70';
  const item=parseWageLine(line);
  assert.equal(item.type,'holidayWithoutTimeOff');
  assert.equal(item.hours,7.7);
  const report=parseTimeReportText('Z E I T N A C H W E I S 80030991 Mitarbeiter Jul 26\n'+line);
  assert.equal(report.unknownCodes.length,0);
  const c=reportComponents(report);
  assert.equal(c.pay.holiday,238.24);
  assert.equal(c.taxFreePay,238.24);
});

test('explizite Feiertagsarbeit mit Freizeitausgleich wird mit 8,02 Euro je Stunde berechnet',()=>{
  const line='15.07.2026 06:00 13:42 3A38 5038: Feiertagsarbeit mit FZA 7,70';
  const report=parseTimeReportText('Z E I T N A C H W E I S 80030991 Mitarbeiter Jul 26\n'+line);
  const c=reportComponents(report);
  assert.equal(c.pay.holiday,61.75);
  const b=salaryForecastBreakdown(report);
  assert.equal(b.timeSurcharges.find(x=>x.key==='holiday').withTimeOffHours,7.7);
});

test('unklar bezeichnete unbekannte Feiertags-Lohnart wird weiterhin nicht geraten',()=>{
  const line='15.07.2026 06:00 13:42 3A34 5034: Feiertagsarbeit 7,70';
  assert.equal(parseWageLine(line),null);
  const report=parseTimeReportText('Z E I T N A C H W E I S 80030991 Mitarbeiter Jul 26\n'+line);
  assert.equal(report.unknownCodes.length,1);
  assert.equal(report.needsReview,true);
});
