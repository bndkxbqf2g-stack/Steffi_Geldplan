function nextSundayDate(fromDate) {
  const d = new Date(fromDate || new Date());
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (7 - base.getDay()) % 7;
  const target = new Date(base);
  target.setDate(base.getDate() + (diff === 0 ? 7 : diff));
  return target;
}

function calculateCycleBudget(giroBalance, daysRemaining) {
  const giro = Number(giroBalance) || 0;
  const remaining = Math.max(1, Number(daysRemaining) || 1);
  const cycleDays = Math.min(7, remaining);
  const day = remaining > 0 ? giro / remaining : 0;
  return {
    cycleDays,
    day,
    week: remaining > 0 ? day * cycleDays : 0,
    cycleLabel: '7 Tage'
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
