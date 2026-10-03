import {addPayrollMonths,payrollMonthKey} from './payroll-month.js';

const DEFAULT_DELAY_MONTHS=2;

// Steffi-geldplan has no prefilled exception. An exception exists only when
// an explicitly supplied, traceable record passes validation.
export const DEFAULT_PAYROLL_PAYMENT_OVERRIDES=Object.freeze([]);

function reportMonthKey(report={}){
  if(report?.month&&Number.isInteger(Number(report.month.year))&&Number.isInteger(Number(report.month.month))){
    return `${report.month.year}-${String(report.month.month).padStart(2,'0')}`;
  }
  return payrollMonthKey(report?.reportMonth||report?.originMonth);
}

function text(value){
  const clean=String(value??'').trim();
  return clean||null;
}

export function normalizePayrollPaymentOverride(input={}){
  const originMonth=payrollMonthKey(input?.originMonth||input?.reportMonth);
  const plannedPaymentMonth=payrollMonthKey(input?.plannedPaymentMonth||input?.plannedPayoutMonth||input?.standardPayoutMonth);
  const actualPaymentMonth=payrollMonthKey(input?.actualPaymentMonth||input?.actualPayoutMonth);
  if(!originMonth||!plannedPaymentMonth||!actualPaymentMonth||originMonth===actualPaymentMonth)return null;
  return {
    id:text(input.id)||`${originMonth}:${plannedPaymentMonth}:${actualPaymentMonth}`,
    originMonth,
    plannedPaymentMonth,
    actualPaymentMonth,
    oneTime:input.oneTime!==false,
    reason:text(input.reason)||'Einmalige, belegte Abweichung vom geplanten Auszahlungsmonat',
    source:text(input.source)||null,
    recordedAt:text(input.recordedAt)||null
  };
}

function normalizedOverrides(overrides){
  const list=Array.isArray(overrides)?overrides:[overrides];
  return list.map(normalizePayrollPaymentOverride).filter(Boolean);
}

export function applyPaymentMonthOverride(report={},override=null){
  const originMonth=reportMonthKey(report);
  const plannedPayoutMonth=payrollMonthKey(
    report?.plannedPayoutMonth||report?.standardPayoutMonth||report?.payoutMonth||addPayrollMonths(originMonth,DEFAULT_DELAY_MONTHS)
  );
  const candidate=normalizePayrollPaymentOverride(override||report?.paymentMonthOverride||{});
  const matches=candidate&&originMonth&&candidate.originMonth===originMonth&&candidate.plannedPaymentMonth===plannedPayoutMonth;
  const paymentMonthOverride=matches?candidate:null;
  return {
    ...report,
    plannedPayoutMonth,
    standardPayoutMonth:plannedPayoutMonth,
    payoutMonth:paymentMonthOverride?.actualPaymentMonth||payrollMonthKey(report?.payoutMonth)||plannedPayoutMonth,
    ...(paymentMonthOverride?{paymentMonthOverride}:{})
  };
}

export function applyPayrollPaymentOverride(report={},overrides=DEFAULT_PAYROLL_PAYMENT_OVERRIDES){
  const originMonth=reportMonthKey(report);
  const plannedPayoutMonth=payrollMonthKey(report?.plannedPayoutMonth||report?.standardPayoutMonth||report?.payoutMonth||addPayrollMonths(originMonth,DEFAULT_DELAY_MONTHS));
  const override=normalizedOverrides(overrides).find(item=>item.originMonth===originMonth&&item.plannedPaymentMonth===plannedPayoutMonth);
  return applyPaymentMonthOverride(report,override);
}
