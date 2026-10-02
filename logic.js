function nextSundayDate(fromDate) {
  const d = new Date(fromDate || new Date());
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (7 - base.getDay()) % 7;
  const target = new Date(base);
  target.setDate(base.getDate() + (diff === 0 ? 7 : diff));
  return target;
}

function calculateCycleBudget(giroBalance, daysRemaining, daysUntilNextWithdrawal) {
  const giro = Number(giroBalance) || 0;
  const remaining = Math.max(1, Number(daysRemaining) || 1);
  const untilWithdrawal = Number.isFinite(Number(daysUntilNextWithdrawal))
    ? Math.max(1, Number(daysUntilNextWithdrawal))
    : null;
  const usesWithdrawalWindow = untilWithdrawal !== null && untilWithdrawal < remaining;
  const baseDays = usesWithdrawalWindow ? Math.max(1, remaining - untilWithdrawal) : remaining;
  const cycleDays = Math.min(7, baseDays);
  const day = baseDays > 0 ? giro / baseDays : 0;
  return {
    baseDays,
    cycleDays,
    day,
    week: baseDays > 0 ? day * cycleDays : 0,
    cycleLabel: cycleDays + ' Tage',
    usesWithdrawalWindow
  };
}

function computeCashRefillTarget(currentCash, targetAmount) {
  const current = Number(currentCash) || 0;
  const target = Number(targetAmount) || 0;
  if (target <= 0) return 0;
  return Math.max(0, target - current);
}

if (typeof module !== 'undefined') {
  module.exports = {
    nextSundayDate,
    calculateCycleBudget,
    computeCashRefillTarget
  };
}
