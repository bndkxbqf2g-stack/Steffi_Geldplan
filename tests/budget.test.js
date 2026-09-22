import test from "node:test";
import assert from "node:assert/strict";
import {
  getBaseAmount,
  getCurrentGiro,
  ensureBaseTransaction,
  createTransaction,
  appendTransaction,
  hasFixedCostForCycle,
  getLastWithdrawal
} from "../lib/budget.js";

test("Startkontostand wird korrekt erkannt", () => {
  assert.equal(getBaseAmount([{ type: "base", amount: 153.30 }]), 153.30);
});

test("Giro ergibt Startkontostand plus alle Buchungen", () => {
  const tx = [
    { type: "base", amount: 100 },
    { type: "income", amount: 50 },
    { type: "expense", amount: -20 }
  ];
  assert.equal(getCurrentGiro(tx), 130);
});

test("Startbuchung wird nur einmal ergänzt", () => {
  const first = ensureBaseTransaction([], { amount: 200, date: "2026-09-30" });
  const second = ensureBaseTransaction(first, { amount: 999, date: "2026-10-01" });
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(second[0].amount, 200);
});

test("Transaktion wird ohne Mutation an Liste angehängt", () => {
  const original = [{ type: "base", amount: 100 }];
  const tx = createTransaction({ amount: -25, type: "expense", text: "Einkauf", date: "2026-09-30", id: "x" });
  const result = appendTransaction(original, tx);
  assert.equal(original.length, 1);
  assert.equal(result.length, 2);
  assert.equal(result[1].amount, -25);
});

test("Fixkosten werden pro Zyklus erkannt", () => {
  const tx = [{ type: "fixedcost", amount: -500, cycle: "2026-09" }];
  assert.equal(hasFixedCostForCycle(tx, "2026-09"), true);
  assert.equal(hasFixedCostForCycle(tx, "2026-10"), false);
});

test("Letzte Bargeldabhebung wird korrekt gefunden", () => {
  const tx = [
    { type: "withdrawal", amount: -100, date: "2026-09-20" },
    { type: "expense", amount: -10, date: "2026-09-21" },
    { type: "withdrawal", amount: -200, date: "2026-09-27" }
  ];
  assert.equal(getLastWithdrawal(tx).date, "2026-09-27");
});

test("Abhebungen eines Abschnitts können für die Budgetbasis neutralisiert werden", async () => {
  const { getWithdrawalTotalForRange } = await import("../lib/budget.js");
  const transactions = [
    { type: "withdrawal", amount: -300, date: "2026-10-04" },
    { type: "expense", amount: -50, date: "2026-10-05" },
    { type: "withdrawal", amount: -20, date: "2026-10-11" }
  ];
  assert.equal(getWithdrawalTotalForRange(transactions, "2026-10-04", "2026-10-10"), 300);
});

import {getLatestSalaryTransaction} from '../lib/budget.js';

test('letzte tatsächliche Lohnbuchung wird als Zyklusstart ermittelt',()=>{
  const list=[
    {type:'salary',date:'2026-09-30',amount:2000},
    {type:'income',date:'2026-10-10',amount:50},
    {type:'salary',date:'2026-10-30',amount:2100}
  ];
  assert.equal(getLatestSalaryTransaction(list,'2026-10-29').date,'2026-09-30');
  assert.equal(getLatestSalaryTransaction(list,'2026-10-30').date,'2026-10-30');
  assert.equal(getLatestSalaryTransaction([], '2026-10-30'),null);
});
