const DEFAULT_BASE = 0;

export function getBaseAmount(transactions, fallback = DEFAULT_BASE) {
  const list = Array.isArray(transactions) ? transactions : [];
  const base = list.find((item) => item && item.type === "base");
  const value = Number(base?.amount);
  return Number.isFinite(value) ? value : fallback;
}

export function getCurrentGiro(transactions, fallback = DEFAULT_BASE) {
  const list = Array.isArray(transactions) ? transactions : [];
  return getBaseAmount(list, fallback) + list
    .filter((item) => item && item.type !== "base")
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export function ensureBaseTransaction(transactions, options = {}) {
  const list = Array.isArray(transactions) ? transactions.slice() : [];
  if (list.some((item) => item && item.type === "base")) return list;

  const amount = Number.isFinite(Number(options.amount)) ? Number(options.amount) : DEFAULT_BASE;
  const date = options.date || "";
  return [{
    id: "base",
    type: "base",
    amount,
    date,
    text: options.text || "Startkontostand"
  }, ...list];
}

export function createTransaction({ amount, text, type, date, id, meta } = {}) {
  const transaction = {
    id: id ?? `${Date.now()}-${Math.random()}`,
    type: type || "transaction",
    amount: Number(amount) || 0,
    date: date || "",
    text: text || "Buchung"
  };

  if (meta && typeof meta === "object") {
    Object.assign(transaction, meta);
  }
  return transaction;
}

export function appendTransaction(transactions, transaction) {
  const list = Array.isArray(transactions) ? transactions.slice() : [];
  list.push(transaction);
  return list;
}

export function hasFixedCostForCycle(transactions, cycle) {
  const list = Array.isArray(transactions) ? transactions : [];
  return list.some((item) => item && item.type === "fixedcost" && item.cycle === cycle);
}


export function getLatestSalaryTransaction(transactions, upToDate = "9999-12-31") {
  const list = Array.isArray(transactions) ? transactions : [];
  const limit = String(upToDate || "9999-12-31").slice(0, 10);
  return list
    .filter((item) => item && item.type === "salary" && item.date && item.date <= limit)
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .at(-1) || null;
}

export function getLastWithdrawal(transactions) {
  const list = (Array.isArray(transactions) ? transactions : [])
    .filter((item) => item && item.type === "withdrawal");
  return list.length ? list[list.length - 1] : null;
}

export function getWithdrawalTotalForRange(transactions, startKey, endKey) {
  const list = Array.isArray(transactions) ? transactions : [];
  return list
    .filter((item) => item && item.type === "withdrawal" && item.date >= startKey && item.date <= endKey)
    .reduce((sum, item) => sum + Math.abs(Number(item.amount) || 0), 0);
}

export const budgetDefaults = Object.freeze({
  baseAmount: DEFAULT_BASE
});
