const assert = require('node:assert/strict');
const { nextSundayDate, calculateCycleBudget, computeCashRefillTarget } = require('./logic.js');

const today = new Date('2026-09-21T12:00:00');
assert.equal(nextSundayDate(today).getDay(), 0, 'Nächstes Datum muss ein Sonntag sein.');
assert.equal(calculateCycleBudget(210, 7).day, 30, 'Tagessatz für volle 7 Tage muss Giro / 7 sein.');
assert.equal(calculateCycleBudget(210, 7).week, 210, 'Wochensatz für volle 7 Tage muss das komplette Giro-Guthaben sein.');
assert.equal(calculateCycleBudget(210, 10).day, 21, 'Tagessatz für 10 Tage muss Giro / verbleibende Tage sein.');
assert.equal(calculateCycleBudget(210, 10).week, 147, 'Wochensatz muss auf den 7-Tage-Block pro rata begrenzt werden.');
assert.equal(calculateCycleBudget(210, 3).day, 70, 'Im letzten Abschnitt muss nach verbleibenden Tagen aufgeteilt werden.');
assert.equal(calculateCycleBudget(210, 3).week, 210, 'Im letzten Abschnitt gilt der komplette verbleibende Zyklus.');
assert.equal(computeCashRefillTarget(50, 120), 70, 'Bargeld wird bis zum Ziel ergänzt.');
assert.equal(computeCashRefillTarget(200, 120), 0, 'Wenn zu viel Bargeld da ist, bleibt das Ziel unverändert.');
console.log('budget-logic tests passed');
