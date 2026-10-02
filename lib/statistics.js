const relevantTx = t => t && t.type !== 'base';
const monthKey = value => String(value || '').slice(0, 7);
const amount = value => Number(value) || 0;

export function transactionTotals(transactions = []) {
  return transactions.filter(relevantTx).reduce((out, t) => {
    const v = amount(t.amount);
    if (t.type === 'salary' || t.type === 'income') out.income += Math.max(0, v);
    if (t.type === 'expense' || t.type === 'fixedcost') out.expenses += Math.abs(v);
    if (t.type === 'withdrawal') out.withdrawals += Math.abs(v);
    return out;
  }, { income: 0, expenses: 0, withdrawals: 0 });
}

export function monthlyStatistics(transactions = [], savings = { allocations: [] }, limit = 6) {
  const tx = transactions.filter(relevantTx);
  const allocations = Array.isArray(savings?.allocations) ? savings.allocations.filter(a => a && !a.reversedAt) : [];
  const months = [...new Set([
    ...tx.map(t => monthKey(t.date)),
    ...allocations.map(a => monthKey(a.date))
  ].filter(Boolean))].sort().slice(-Math.max(1, Number(limit) || 6));

  return months.map(key => {
    const rows = tx.filter(t => monthKey(t.date) === key);
    const income = rows.filter(t => ['salary','income'].includes(t.type)).reduce((s,t) => s + Math.max(0, amount(t.amount)), 0);
    const expenses = rows.filter(t => ['expense','fixedcost'].includes(t.type)).reduce((s,t) => s + Math.abs(amount(t.amount)), 0);
    const withdrawals = rows.filter(t => t.type === 'withdrawal').reduce((s,t) => s + Math.abs(amount(t.amount)), 0);
    const saved = allocations.filter(a => monthKey(a.date) === key).reduce((s,a) => s + Math.max(0, amount(a.amount)), 0);
    return { month: key, income, expenses, withdrawals, saved, net: income - expenses };
  });
}

export function savingsStatistics(savings = { positions: [], allocations: [] }) {
  const positions = Array.isArray(savings?.positions) ? savings.positions : [];
  const allocations = Array.isArray(savings?.allocations) ? savings.allocations.filter(a => a && !a.reversedAt) : [];
  const byPosition = positions.map(position => ({
    id: position.id,
    name: position.name,
    deleted: Boolean(position.deletedAt),
    amount: allocations.filter(a => a.positionId === position.id).reduce((s,a) => s + Math.max(0, amount(a.amount)), 0)
  })).filter(item => item.amount > 0 || !item.deleted);
  return {
    total: allocations.reduce((s,a) => s + Math.max(0, amount(a.amount)), 0),
    byPosition
  };
}
