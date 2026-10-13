// Pure, document-based reconciliation. No budget writes, no fabricated net amounts.
const known = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const cents = value => Math.round(Number(value) * 100);
const euros = value => cents(value) / 100;

export function summarizePaidPayrollAdjustments(payslip, expectedGross = null) {
  if (!payslip || !Array.isArray(payslip.retroPeriods)) return null;
  const periods = payslip.retroPeriods;
  const grossRetro = periods.every(period => known(period?.totalGross))
    ? euros(periods.reduce((sum, period) => sum + Number(period.totalGross), 0))
    : null;
  const grossIncludingRetro = known(payslip.totalGross) && grossRetro !== null
    ? euros(Number(payslip.totalGross) + grossRetro)
    : null;
  const grossOutsideForecast = known(expectedGross) && grossIncludingRetro !== null
    ? euros(grossIncludingRetro - Number(expectedGross))
    : null;
  const candidates = periods.map(period => {
    // Legacy data can carry a synthetic zero. Treat it as unknown unless the
    // original slip explicitly documented zero VBL.
    const documentedVbl = period?.vblDocumented === true ||
      (period?.vblDocumented == null && known(period?.vbl) && Number(period.vbl) !== 0);
    const legalNet = known(period?.legalNet) ? euros(period.legalNet) : null;
    const vbl = documentedVbl && known(period?.vbl) ? euros(period.vbl) : null;
    const candidate = legalNet !== null && vbl !== null ? euros(legalNet - vbl) : null;
    return {
      month: period?.month || null,
      gross: known(period?.totalGross) ? euros(period.totalGross) : null,
      legalNet, vbl, candidate,
      average21Gross: known(period?.components?.average21) ? euros(period.components.average21) : null,
      source: 'Bezügemitteilung / Rückrechnungsperiode'
    };
  });
  const priorAdjustment = known(payslip.priorAdjustment) &&
    (payslip.hasPriorAdjustment === true || cents(payslip.priorAdjustment) !== 0)
    ? euros(payslip.priorAdjustment)
    : null;
  const sumKnown = candidates.length > 0 && candidates.every(row => row.candidate !== null && row.month);
  const candidateTotal = sumKnown ? euros(candidates.reduce((sum, row) => sum + row.candidate, 0)) : null;
  const netReconciled = priorAdjustment !== null && candidateTotal !== null &&
    Math.abs(cents(priorAdjustment) - cents(candidateTotal)) <= 1;
  const average21Rows = candidates.filter(row => row.average21Gross !== null);
  const average21Gross = average21Rows.length
    ? euros(average21Rows.reduce((sum, row) => sum + row.average21Gross, 0))
    : null;

  return {
    rows: candidates.map(({candidate, ...row}) => ({...row, net: netReconciled ? candidate : null})),
    grossRetro, grossIncludingRetro, grossOutsideForecast, priorAdjustment,
    reconciledNet: netReconciled ? candidateTotal : null,
    netReconciled, average21Gross,
    needsReview: candidates.length > 0 && !netReconciled
  };
}
