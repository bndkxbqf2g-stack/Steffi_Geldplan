function safeList(value) {
  return Array.isArray(value) ? value : [];
}

export function createSavingsPosition(name, id) {
  const clean = String(name || "").trim();
  if (!clean) throw new Error("Sparposition braucht einen Namen.");
  return {
    id: id || `${Date.now()}-${Math.random()}`,
    name: clean
  };
}

export function addSavingsPosition(data, position) {
  const current = normalizeSavings(data);
  if (current.positions.some((item) => item.id === position.id)) return current;
  return { ...current, positions: [...current.positions, position] };
}

export function renameSavingsPosition(data, positionId, name) {
  const clean = String(name || "").trim();
  if (!clean) throw new Error("Sparposition braucht einen Namen.");
  const current = normalizeSavings(data);
  if (!current.positions.some((item) => item.id === positionId && !item.deletedAt)) {
    throw new Error("Sparposition wurde nicht gefunden.");
  }
  return {
    ...current,
    positions: current.positions.map((item) => item.id === positionId ? { ...item, name: clean } : item)
  };
}

export function deleteSavingsPosition(data, positionId, date = "") {
  const current = normalizeSavings(data);
  const stamp = String(date || "gelöscht");
  if (!current.positions.some((item) => item.id === positionId && !item.deletedAt)) return current;
  return {
    positions: current.positions.map((item) => item.id === positionId ? { ...item, deletedAt: stamp } : item),
    allocations: current.allocations.map((item) => item.positionId === positionId && !item.reversedAt ? { ...item, reversedAt: stamp } : item)
  };
}

export function createSavingsAllocation({ positionId, amount, date, sourceSegmentStart, effectiveFrom, id } = {}) {
  const value = Number(amount);
  if (!positionId) throw new Error("Keine Sparposition gewählt.");
  if (!Number.isFinite(value) || value <= 0) throw new Error("Sparrate muss größer als 0 sein.");
  return {
    id: id || `${Date.now()}-${Math.random()}`,
    positionId,
    amount: value,
    date: date || "",
    sourceSegmentStart: sourceSegmentStart || "",
    effectiveFrom: effectiveFrom || ""
  };
}

export function addSavingsAllocation(data, allocation) {
  const current = normalizeSavings(data);
  const target = current.positions.find((item) => item.id === allocation.positionId && !item.deletedAt);
  if (!target) throw new Error("Sparposition wurde nicht gefunden.");
  return { ...current, allocations: [...current.allocations, allocation] };
}

export function reverseSavingsAllocation(data, allocationId, date = "") {
  const current = normalizeSavings(data);
  const stamp = String(date || "rückgängig");
  return {
    ...current,
    allocations: current.allocations.map((item) => item.id === allocationId && !item.reversedAt ? { ...item, reversedAt: stamp } : item)
  };
}

export function normalizeSavings(data) {
  const value = data && typeof data === "object" ? data : {};
  return {
    positions: safeList(value.positions).filter((item) => item && item.id && item.name),
    allocations: safeList(value.allocations)
      .filter((item) => item && item.positionId && Number(item.amount) > 0)
      .map((item, index) => item.id ? item : { ...item, id: `legacy-${index}-${item.positionId}-${item.date || ""}-${item.sourceSegmentStart || ""}` })
  };
}

export function activeSavingsPositions(data) {
  return normalizeSavings(data).positions.filter((item) => !item.deletedAt);
}

export function activeSavingsAllocations(data) {
  return normalizeSavings(data).allocations.filter((item) => !item.reversedAt);
}

export function totalSaved(data) {
  return activeSavingsAllocations(data).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export function savedForPosition(data, positionId) {
  return activeSavingsAllocations(data)
    .filter((item) => item.positionId === positionId)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export function savingsForSegment(data, segmentStartKey) {
  return activeSavingsAllocations(data)
    .filter((item) => item.sourceSegmentStart === segmentStartKey)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export function effectiveReservedSavings(data, segmentStartKey) {
  if (!segmentStartKey) return 0;
  return activeSavingsAllocations(data)
    .filter((item) => item.effectiveFrom && item.effectiveFrom <= segmentStartKey)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export function maxSavingsForSegment(weeklyBudget, cash, alreadySavedThisSegment = 0) {
  return Math.max(
    0,
    Number(weeklyBudget || 0) - Math.max(0, Number(cash || 0)) - Math.max(0, Number(alreadySavedThisSegment || 0))
  );
}
