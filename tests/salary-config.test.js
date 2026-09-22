import test from "node:test";
import assert from "node:assert/strict";
import { SALARY_2026, fixedGross } from "../config/salary-2026.js";

test("KR8 Zahlstufe 6 und 60 Prozent sind korrekt hinterlegt", () => {
  assert.equal(SALARY_2026.tariff.group, "KR8");
  assert.equal(SALARY_2026.tariff.contractualLevel, 4);
  assert.equal(SALARY_2026.tariff.advanceLevels, 2);
  assert.equal(SALARY_2026.tariff.personalLevel, 6);
  assert.equal(SALARY_2026.employment.percent, 60);
  assert.equal(SALARY_2026.fixed.fullTimeBasePay, 4468.47);
  assert.equal(SALARY_2026.fixed.basePay, 2681.08);
  assert.equal(SALARY_2026.fixed.careAllowance, 54);
  assert.equal(SALARY_2026.fixed.universityAllowance, 98.11);
  assert.equal(fixedGross(), 2833.19);
});

test("KR8-Zeitzuschläge bleiben trotz Teilzeit ungekürzt", () => {
  assert.equal(SALARY_2026.tariff.surchargeLevel, 3);
  assert.equal(SALARY_2026.surcharges.night, 4.58);
  assert.equal(SALARY_2026.surcharges.saturday, 0.64);
  assert.equal(SALARY_2026.surcharges.sunday, 5.73);
});

test("monatliche Schichtzulagen sind mit 60 Prozent hinterlegt", () => {
  assert.equal(SALARY_2026.shift.wechsel,150);
  assert.equal(SALARY_2026.shift.schicht,60);
});

test("Steuer, AOK Bayern und keine Pfändung sind zentral konfiguriert", () => {
  assert.equal(SALARY_2026.profile.taxClass,1);
  assert.equal(SALARY_2026.profile.childAllowance,0);
  assert.equal(SALARY_2026.profile.churchTaxRate,0);
  assert.equal(SALARY_2026.profile.kvAdditionalRate,2.69);
  assert.equal(SALARY_2026.profile.childless,true);
  assert.equal(SALARY_2026.profile.healthInsurance,'AOK Bayern');
  assert.equal(SALARY_2026.payroll.garnishmentEnabled,false);
});
