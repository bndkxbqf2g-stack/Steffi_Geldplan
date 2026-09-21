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
  const day = giro / remaining;

  return {
    cycleDays,
    day,
    week: day * cycleDays,
    cycleLabel: cycleDays === 7 ? '7 Tage' : `${cycleDays} Tage`
  };
}

function calculateSundayWithdrawal(giroBalance, daysRemaining) {
  return calculateCycleBudget(giroBalance, daysRemaining).week;
}

function applyWithdrawal(giroBalance, actualWithdrawal) {
  const giro = Number(giroBalance) || 0;
  const withdrawal = Math.max(0, Number(actualWithdrawal) || 0);

  if (withdrawal > giro) {
    throw new RangeError('Die Abhebung darf das Giroguthaben nicht übersteigen.');
  }

  return giro - withdrawal;
}

if (typeof module !== 'undefined') {
  module.exports = {
    nextSundayDate,
    calculateCycleBudget,
    calculateSundayWithdrawal,
    applyWithdrawal
  };
}