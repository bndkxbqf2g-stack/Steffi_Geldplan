const TX_KEY = "freundinGeldplanGiroTx";
const CASH_KEY = "freundinGeldplanCash";
const SAVINGS_KEY = "freundinGeldplanSavings";
const SALARY_KEY = "freundinGeldplanSalaryForecasts";
const PAYSLIP_KEY = "freundinGeldplanPayslips";
const FIXED_KEY = "freundinGeldplanFixedCosts";
const BUDGET_ANCHOR_KEY = "freundinGeldplanBudgetAnchor";
const THEME_KEY = "freundinGeldplanTheme";
const SCHEMA_KEY = "freundinGeldplanSchemaVersion";

export const DATA_SCHEMA_VERSION = 3;

function getStorage(storage) {
  if (storage) return storage;
  if (typeof globalThis !== "undefined" && globalThis.localStorage) return globalThis.localStorage;
  return null;
}

function json(raw, fallback) {
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function isValidDateKey(value) {
  const key = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const [y,m,d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function safeDate(value) { return isValidDateKey(value) ? String(value).slice(0,10) : ""; }
function safeArrayObjects(value) { return Array.isArray(value) ? value.filter(x => x && typeof x === "object" && !Array.isArray(x)) : []; }

function normalizeTransaction(item, index = 0) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const amount = Number(item.amount);
  const out = {
    ...item,
    id: item.id ?? `legacy-tx-${index}`,
    type: String(item.type || "transaction"),
    amount: Number.isFinite(amount) ? amount : 0,
    date: safeDate(item.date)
  };
  if (item.text != null) out.text = String(item.text);
  if (out.cycle != null) out.cycle = String(out.cycle);
  return out;
}

function normalizeSavings(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const positions = safeArrayObjects(source.positions).map((item,index) => ({
    ...item,
    id: String(item.id || `legacy-pos-${index}`),
    name: String(item.name || "Sparziel").trim() || "Sparziel",
    ...(item.deletedAt ? { deletedAt: String(item.deletedAt) } : {})
  }));
  const allocations = safeArrayObjects(source.allocations).map((item,index) => {
    const amount = Number(item.amount);
    return {
      ...item,
      id: String(item.id || `legacy-allocation-${index}`),
      positionId: String(item.positionId || ""),
      amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
      date: safeDate(item.date),
      sourceSegmentStart: safeDate(item.sourceSegmentStart),
      effectiveFrom: safeDate(item.effectiveFrom),
      ...(item.reversedAt ? { reversedAt: String(item.reversedAt) } : {})
    };
  }).filter(item => item.positionId && item.amount > 0);
  return { positions, allocations };
}

function normalizeFixedCostsValue(value) {
  if (value === null) return null;
  if (!Array.isArray(value)) return [];
  return safeArrayObjects(value).map((item,index) => {
    const amount = Number(item.amount);
    return {
      ...item,
      id: String(item.id || `fix-${index}`),
      name: String(item.name || "Fixkosten").trim() || "Fixkosten",
      amount: Number.isFinite(amount) ? Math.max(0, amount) : 0
    };
  });
}

export function getTransactions(storage) {
  const store = getStorage(storage); if (!store) return [];
  const value = json(store.getItem(TX_KEY) || "[]", []);
  return safeArrayObjects(value).map(normalizeTransaction).filter(Boolean);
}
export function saveTransactions(transactions, storage) {
  const store = getStorage(storage); if (!store) return false;
  try { store.setItem(TX_KEY, JSON.stringify(safeArrayObjects(transactions).map(normalizeTransaction).filter(Boolean))); return true; } catch { return false; }
}

export function getCash(storage) {
  const store = getStorage(storage); if (!store) return 0;
  const value = Number.parseFloat(store.getItem(CASH_KEY) || "0");
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
export function saveCash(value, storage) {
  const store = getStorage(storage); if (!store) return false;
  try { const safe = Number(value); store.setItem(CASH_KEY, String(Number.isFinite(safe) ? Math.max(0,safe) : 0)); return true; } catch { return false; }
}

export function getSavings(storage) {
  const store = getStorage(storage); if (!store) return { positions: [], allocations: [] };
  return normalizeSavings(json(store.getItem(SAVINGS_KEY) || "{}", {}));
}
export function saveSavings(value, storage) {
  const store = getStorage(storage); if (!store) return false;
  try { store.setItem(SAVINGS_KEY, JSON.stringify(normalizeSavings(value))); return true; } catch { return false; }
}

export function getBudgetAnchor(storage) {
  const store = getStorage(storage); if (!store) return "";
  try { return safeDate(store.getItem(BUDGET_ANCHOR_KEY)); } catch { return ""; }
}
export function saveBudgetAnchor(value, storage) {
  const store = getStorage(storage); if (!store) return false;
  const safe = safeDate(value); if (!safe) return false;
  try { store.setItem(BUDGET_ANCHOR_KEY, safe); return true; } catch { return false; }
}

export function getFixedCosts(storage) {
  const store = getStorage(storage); if (!store) return null;
  try { const raw = store.getItem(FIXED_KEY); return raw === null ? null : normalizeFixedCostsValue(json(raw, [])); } catch { return null; }
}
export function saveFixedCosts(value, storage) {
  const store = getStorage(storage); if (!store) return false;
  try { store.setItem(FIXED_KEY, JSON.stringify(normalizeFixedCostsValue(Array.isArray(value) ? value : []))); return true; } catch { return false; }
}

export function getSalaryForecasts(storage) {
  const store = getStorage(storage); if (!store) return [];
  return safeArrayObjects(json(store.getItem(SALARY_KEY) || "[]", []));
}
export function saveSalaryForecasts(value, storage) {
  const store = getStorage(storage); if (!store) return false;
  try { store.setItem(SALARY_KEY, JSON.stringify(safeArrayObjects(value))); return true; } catch { return false; }
}

export function getPayslips(storage) {
  const store = getStorage(storage); if (!store) return [];
  return safeArrayObjects(json(store.getItem(PAYSLIP_KEY) || "[]", []));
}
export function savePayslips(value, storage) {
  const store = getStorage(storage); if (!store) return false;
  try { store.setItem(PAYSLIP_KEY, JSON.stringify(safeArrayObjects(value))); return true; } catch { return false; }
}

export function getTheme(storage) {
  const store = getStorage(storage); if (!store) return "system";
  try { const value = String(store.getItem(THEME_KEY) || "system"); return ["system","light","dark"].includes(value) ? value : "system"; } catch { return "system"; }
}
export function saveTheme(value, storage) {
  const store = getStorage(storage); if (!store) return false;
  const safe = ["system","light","dark"].includes(value) ? value : "system";
  try { store.setItem(THEME_KEY, safe); return true; } catch { return false; }
}

export function migrateStorage(storage) {
  const store = getStorage(storage); if (!store) return { migrated:false, repaired:0, version:DATA_SCHEMA_VERSION };
  let repaired = 0;
  const before = key => store.getItem(key);
  const rewrite = (key, value) => { const next = JSON.stringify(value); if (before(key) !== next) { store.setItem(key,next); repaired++; } };
  try {
    rewrite(TX_KEY, getTransactions(store));
    const rawCash = before(CASH_KEY); const cash = String(getCash(store)); if (rawCash !== null && rawCash !== cash) { store.setItem(CASH_KEY,cash); repaired++; }
    if (before(SAVINGS_KEY) !== null) rewrite(SAVINGS_KEY, getSavings(store));
    if (before(SALARY_KEY) !== null) rewrite(SALARY_KEY, getSalaryForecasts(store));
    if (before(PAYSLIP_KEY) !== null) rewrite(PAYSLIP_KEY, getPayslips(store));
    if (before(FIXED_KEY) !== null) rewrite(FIXED_KEY, getFixedCosts(store) || []);
    const anchor = getBudgetAnchor(store); if (before(BUDGET_ANCHOR_KEY) !== null) { if (anchor) { if (before(BUDGET_ANCHOR_KEY) !== anchor) { store.setItem(BUDGET_ANCHOR_KEY,anchor); repaired++; } } else { store.removeItem(BUDGET_ANCHOR_KEY); repaired++; } }
    const theme = getTheme(store); if (before(THEME_KEY) !== null && before(THEME_KEY) !== theme) { store.setItem(THEME_KEY,theme); repaired++; }
    const previous = Number(before(SCHEMA_KEY) || 0); store.setItem(SCHEMA_KEY,String(DATA_SCHEMA_VERSION));
    return { migrated: previous !== DATA_SCHEMA_VERSION || repaired > 0, repaired, fromVersion: previous || 0, version: DATA_SCHEMA_VERSION };
  } catch {
    return { migrated:false, repaired, version:DATA_SCHEMA_VERSION, error:true };
  }
}

export function clearBudgetStorage(storage) {
  const store = getStorage(storage); if (!store) return false;
  try { [TX_KEY,CASH_KEY,SAVINGS_KEY,FIXED_KEY,BUDGET_ANCHOR_KEY].forEach(k=>store.removeItem(k)); return true; } catch { return false; }
}
export function clearAllStorage(storage) {
  const store = getStorage(storage); if (!store) return false;
  try { [TX_KEY,CASH_KEY,SAVINGS_KEY,SALARY_KEY,PAYSLIP_KEY,FIXED_KEY,BUDGET_ANCHOR_KEY,SCHEMA_KEY].forEach(k=>store.removeItem(k)); return true; } catch { return false; }
}

export const storageKeys = Object.freeze({
  transactions: TX_KEY, cash: CASH_KEY, savings: SAVINGS_KEY, salaryForecasts: SALARY_KEY,
  payslips: PAYSLIP_KEY, fixedCosts: FIXED_KEY, budgetAnchor: BUDGET_ANCHOR_KEY,
  theme: THEME_KEY, schemaVersion: SCHEMA_KEY
});
