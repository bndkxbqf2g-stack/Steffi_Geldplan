function nextSundayDate(fromDate) {
  const d = new Date(fromDate || new Date());
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (7 - base.getDay()) % 7;
  const target = new Date(base);
  target.setDate(base.getDate() + (diff === 0 ? 7 : diff));
  return target;
}

function calculateCycleBudget(giroBalance) {
  const giro = Number(giroBalance) || 0;
  const cycleDays = 7;
  return {
    cycleDays,
    day: giro / cycleDays,
    week: giro,
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
