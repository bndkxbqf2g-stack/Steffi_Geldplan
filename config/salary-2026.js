export const SALARY_2026 = Object.freeze({
  tariff: Object.freeze({ group: "KR8", contractualLevel: 4, advanceLevels: 2, personalLevel: 6, surchargeLevel: 3 }),
  employment: Object.freeze({ factor: 0.60, percent: 60 }),
  fixed: Object.freeze({
    fullTimeBasePay: 4468.47,
    fullTimeCareAllowance: 90,
    fullTimeUniversityAllowance: 163.51,
    basePay: 2681.08,
    careAllowance: 54.00,
    universityAllowance: 98.11,
    gross: 2833.19
  }),
  surcharges: Object.freeze({
    hourlyBase: 22.92,
    night: 4.58,
    saturday: 0.64,
    sunday: 5.73
  }),
  shift: Object.freeze({
    fullTimeWechsel: 250,
    fullTimeSchicht: 100,
    wechsel: 150,
    schicht: 60
  }),
  payroll: Object.freeze({ garnishmentEnabled: false, payoutDelayMonths: 2 }),
  work: Object.freeze({ weeklyHours: 38.5, monthFactor: 4.348 }),
  springIn: Object.freeze({ basePremium: 150, taxMode: 'taxable-unverified' }),
  profile: Object.freeze({ taxClass: 1, childAllowance: 0, churchTaxRate: 0, kvAdditionalRate: 2.69, childless: true, careChildDeductions: 0, saxony: false, healthInsurance: 'AOK Bayern' }),
  social: Object.freeze({
    healthEmployee: 0.08645, careEmployee: 0.024, pensionEmployee: 0.093, unemploymentEmployee: 0.013,
    healthCareCap: 5812.50, pensionUnemploymentCap: 8450,
    vblEmployeeRate: 0.0181, zvSvAddonRate: 178.22 / 4480.43
  }),
  wageTypes: Object.freeze({
    5010: "night",
    5011: "nightBeforeMidnight",
    5014: "saturday",
    5024: "sunday",
    5161: "average21",
    5162: "average21Followup",
    5211: "wechsel",
    5212: "schicht"
  })
});

export function fixedGross(config = SALARY_2026) {
  return Number((config.fixed.basePay + config.fixed.careAllowance + config.fixed.universityAllowance).toFixed(2));
}
