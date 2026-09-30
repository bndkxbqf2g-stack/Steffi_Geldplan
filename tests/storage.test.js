import test from "node:test";
import assert from "node:assert/strict";
import {
  getTransactions,
  saveTransactions,
  getCash,
  saveCash,
  clearBudgetStorage,
  getSavings,
  saveSavings,
  storageKeys
} from "../lib/storage.js";

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

test("Transaktionen werden unverändert gespeichert und geladen", () => {
  const storage = memoryStorage();
  const transactions = [{ id: 1, type: "income", amount: 100, date: "2026-09-30" }];
  assert.equal(saveTransactions(transactions, storage), true);
  assert.deepEqual(getTransactions(storage), transactions);
});

test("defekte Transaktionsdaten führen sicher zu einer leeren Liste", () => {
  const storage = memoryStorage({ [storageKeys.transactions]: "{kaputt" });
  assert.deepEqual(getTransactions(storage), []);
});

test("Bargeld wird nie negativ gespeichert", () => {
  const storage = memoryStorage();
  saveCash(-25, storage);
  assert.equal(getCash(storage), 0);
  saveCash(90.5, storage);
  assert.equal(getCash(storage), 90.5);
});

test("Sparpositionen werden gespeichert und geladen", () => {
  const storage = memoryStorage();
  const value = { positions: [{ id: "u", name: "Urlaub" }], allocations: [] };
  assert.equal(saveSavings(value, storage), true);
  assert.deepEqual(getSavings(storage), value);
});

test("Reset entfernt nur die Budget-Speicherwerte", () => {
  const storage = memoryStorage({
    [storageKeys.transactions]: "[]",
    [storageKeys.cash]: "90",
    [storageKeys.savings]: JSON.stringify({ positions: [], allocations: [] }),
    unrelated: "bleibt"
  });
  assert.equal(clearBudgetStorage(storage), true);
  assert.equal(storage.getItem(storageKeys.transactions), null);
  assert.equal(storage.getItem(storageKeys.cash), null);
  assert.equal(storage.getItem(storageKeys.savings), null);
  assert.equal(storage.getItem("unrelated"), "bleibt");
});

test('Gehaltsprognosen werden getrennt gespeichert', async()=>{
  const {getSalaryForecasts,saveSalaryForecasts,clearBudgetStorage,clearAllStorage}=await import('../lib/storage.js');
  const data=new Map();
  const store={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  saveSalaryForecasts([{payoutMonth:'2026-09',payout:2800}],store);
  assert.equal(getSalaryForecasts(store)[0].payout,2800);
  clearBudgetStorage(store);
  assert.equal(getSalaryForecasts(store).length,1);
  clearAllStorage(store);
  assert.equal(getSalaryForecasts(store).length,0);
});

test('speichert und lädt Bezügemitteilungen getrennt vom Budget', async () => {
  const { getPayslips, savePayslips } = await import('../lib/storage.js');
  const storage = memoryStorage();
  assert.equal(savePayslips([{ month:'2026-07', payout:2700.70 }], storage), true);
  assert.deepEqual(getPayslips(storage), [{ month:'2026-07', payout:2700.70 }]);
  assert.equal(storage.getItem(storageKeys.transactions), null);
});

test('Fixkosten werden getrennt gespeichert und geladen', async()=>{
  const {getFixedCosts,saveFixedCosts}=await import('../lib/storage.js');
  const storage=memoryStorage();
  const value=[{id:'miete',name:'Miete',amount:800}];
  assert.equal(saveFixedCosts(value,storage),true);
  assert.deepEqual(getFixedCosts(storage),value);
});


test("Budgetanker wird gespeichert und mit Budgetdaten gelöscht", async () => {
  const {getBudgetAnchor,saveBudgetAnchor,clearBudgetStorage}=await import('../lib/storage.js');
  const store=memoryStorage();
  assert.equal(getBudgetAnchor(store),'');
  assert.equal(saveBudgetAnchor('2026-09-22',store),true);
  assert.equal(getBudgetAnchor(store),'2026-09-22');
  clearBudgetStorage(store);
  assert.equal(getBudgetAnchor(store),'');
});

test('ungültige Datumswerte erzeugen keinen 1970-/NaN-Zustand', async()=>{
  const {getTransactions,getBudgetAnchor,isValidDateKey}=await import('../lib/storage.js');
  const store=memoryStorage({
    [storageKeys.transactions]:JSON.stringify([{type:'salary',amount:2800,date:'kaputt',text:'Lohn'}]),
    [storageKeys.budgetAnchor]:'1970-00-99'
  });
  assert.equal(isValidDateKey('2026-09-30'),true);
  assert.equal(isValidDateKey('2026-02-31'),false);
  assert.equal(getTransactions(store)[0].date,'');
  assert.equal(getBudgetAnchor(store),'');
});

test('Migration repariert alte Spar-IDs und defekte Speicherwerte', async()=>{
  const {migrateStorage,getSavings,getCash,DATA_SCHEMA_VERSION}=await import('../lib/storage.js');
  const store=memoryStorage({
    [storageKeys.cash]:'NaN',
    [storageKeys.savings]:JSON.stringify({positions:[{name:'Urlaub'}],allocations:[{positionId:'x',amount:'25',date:'2026-09-01'}]}),
    [storageKeys.budgetAnchor]:'kein-datum'
  });
  const result=migrateStorage(store);
  assert.equal(result.version,DATA_SCHEMA_VERSION);
  assert.equal(getCash(store),0);
  assert.match(getSavings(store).positions[0].id,/legacy-pos-/);
  assert.equal(store.getItem(storageKeys.budgetAnchor),null);
  assert.equal(store.getItem(storageKeys.schemaVersion),String(DATA_SCHEMA_VERSION));
});


test('vorgemerkter Lohn wird getrennt vom Giro gespeichert', async()=>{
  const {getPendingSalary,savePendingSalary,clearPendingSalary}=await import('../lib/storage.js');
  const storage=memoryStorage();
  const pending={id:'p1',amount:2700.70,text:'Lohn September',payoutDate:'2026-09-30',createdAt:'2026-09-15T10:00:00.000Z',status:'pending'};
  assert.equal(savePendingSalary(pending,storage),true);
  assert.deepEqual(getPendingSalary(storage),pending);
  assert.equal(storage.getItem(storageKeys.transactions),null);
  clearPendingSalary(storage);
  assert.equal(getPendingSalary(storage),null);
});


test('Erklärungspräferenz ist standardmäßig aktiv und bleibt gespeichert', async()=>{
  const {getShowExplanations,saveShowExplanations}=await import('../lib/storage.js');
  const storage=memoryStorage();
  assert.equal(getShowExplanations(storage),true);
  assert.equal(saveShowExplanations(false,storage),true);
  assert.equal(getShowExplanations(storage),false);
  assert.equal(saveShowExplanations(true,storage),true);
  assert.equal(getShowExplanations(storage),true);
});


test('Fixkosten-Ausnahmen werden getrennt gespeichert', async()=>{
  const {getFixedCostOverrides,saveFixedCostOverrides}=await import('../lib/storage.js');
  const storage=memoryStorage();
  const value=[{id:'2026-09-30:miete',fixedCostId:'miete',payoutDate:'2026-09-30',amount:500}];
  assert.equal(saveFixedCostOverrides(value,storage),true);
  assert.deepEqual(getFixedCostOverrides(storage),value);
  assert.equal(storage.getItem(storageKeys.fixedCosts),null);
});


test('Payroll-Lernhistorie wird getrennt gespeichert und bei Komplettreset gelöscht', async()=>{
  const {getPayrollLearning,savePayrollLearning,clearAllStorage}=await import('../lib/storage.js');
  const storage=memoryStorage();
  const history=[{id:'2026-09:2026-07',payoutMonth:'2026-09',rows:[{key:'shift',confirmed:true}]}];
  assert.equal(savePayrollLearning(history,storage),true);
  assert.deepEqual(getPayrollLearning(storage),history);
  assert.notEqual(storage.getItem(storageKeys.payrollLearning),null);
  clearAllStorage(storage);
  assert.deepEqual(getPayrollLearning(storage),[]);
});
