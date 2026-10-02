import test from "node:test";
import assert from "node:assert/strict";
import {
  createSavingsPosition,
  addSavingsPosition,
  createSavingsAllocation,
  addSavingsAllocation,
  savedForPosition,
  savingsForSegment,
  effectiveReservedSavings,
  maxSavingsForSegment,
  totalSaved,
  renameSavingsPosition,
  deleteSavingsPosition,
  reverseSavingsAllocation,
  activeSavingsPositions
} from "../lib/savings.js";

test("Sparpositionen und Sparraten werden getrennt verwaltet", () => {
  const position = createSavingsPosition("Urlaub", "urlaub");
  let data = addSavingsPosition(null, position);
  data = addSavingsAllocation(data, createSavingsAllocation({
    id: "a1",
    positionId: "urlaub",
    amount: 100,
    date: "2026-10-04",
    sourceSegmentStart: "2026-10-04",
    effectiveFrom: "2026-10-11"
  }));
  assert.equal(savedForPosition(data, "urlaub"), 100);
  assert.equal(totalSaved(data), 100);
});

test("Sparrate zählt im laufenden Abschnitt gegen das Wochenmaximum", () => {
  const data = {
    positions: [{ id: "urlaub", name: "Urlaub" }],
    allocations: [{ positionId: "urlaub", amount: 100, sourceSegmentStart: "2026-10-04", effectiveFrom: "2026-10-11" }]
  };
  assert.equal(savingsForSegment(data, "2026-10-04"), 100);
  assert.equal(maxSavingsForSegment(490, 390, 0), 100);
  assert.equal(maxSavingsForSegment(490, 390, 100), 0);
});

test("Sparrate reduziert erst ab dem folgenden Budgetabschnitt die Budgetbasis", () => {
  const data = {
    positions: [{ id: "urlaub", name: "Urlaub" }],
    allocations: [{ positionId: "urlaub", amount: 100, sourceSegmentStart: "2026-10-04", effectiveFrom: "2026-10-11" }]
  };
  assert.equal(effectiveReservedSavings(data, "2026-10-04"), 0);
  assert.equal(effectiveReservedSavings(data, "2026-10-11"), 100);
  assert.equal(effectiveReservedSavings(data, "2026-10-18"), 100);
});

test("Sparposition kann umbenannt werden", () => {
  const data = { positions: [{ id: "urlaub", name: "Urlaub" }], allocations: [] };
  const changed = renameSavingsPosition(data, "urlaub", "Sommerurlaub");
  assert.equal(activeSavingsPositions(changed)[0].name, "Sommerurlaub");
});

test("Einzelne Sparrate kann rückgängig gemacht und freigegeben werden", () => {
  const data = {
    positions: [{ id: "urlaub", name: "Urlaub" }],
    allocations: [{ id: "a1", positionId: "urlaub", amount: 100, sourceSegmentStart: "2026-10-04", effectiveFrom: "2026-10-11" }]
  };
  const changed = reverseSavingsAllocation(data, "a1", "2026-10-12");
  assert.equal(totalSaved(changed), 0);
  assert.equal(savedForPosition(changed, "urlaub"), 0);
  assert.equal(effectiveReservedSavings(changed, "2026-10-18"), 0);
  assert.equal(changed.allocations[0].reversedAt, "2026-10-12");
});

test("Löschen einer Sparposition gibt alle aktiven Reservierungen frei", () => {
  const data = {
    positions: [{ id: "auto", name: "Auto" }],
    allocations: [
      { id: "a1", positionId: "auto", amount: 40, sourceSegmentStart: "2026-10-04", effectiveFrom: "2026-10-11" },
      { id: "a2", positionId: "auto", amount: 60, sourceSegmentStart: "2026-10-11", effectiveFrom: "2026-10-18" }
    ]
  };
  const changed = deleteSavingsPosition(data, "auto", "2026-10-19");
  assert.equal(activeSavingsPositions(changed).length, 0);
  assert.equal(totalSaved(changed), 0);
  assert.ok(changed.positions[0].deletedAt);
  assert.ok(changed.allocations.every(item => item.reversedAt));
});

test("Gelöschte Sparposition nimmt keine neue Sparrate an", () => {
  const data = deleteSavingsPosition({ positions: [{ id: "x", name: "Alt" }], allocations: [] }, "x", "2026-10-19");
  assert.throws(() => addSavingsAllocation(data, createSavingsAllocation({ id: "a", positionId: "x", amount: 10 })), /nicht gefunden/);
});
