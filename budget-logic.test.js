const assert = require('node:assert/strict');
const { nextSundayDate, calculateCycleBudget, computeCashRefillTarget } = require('./logic.js');

const today = new Date('2026-09-21T12:00:00');
assert.equal(nextSundayDate(today).getDay(), 0, 'Nächstes Datum muss ein Sonntag sein.');
assert.equal(calculateCycleBudget(210).day, 30, 'Tagessatz für 7 Tage muss 210 / 7 sein.');
assert.equal(calculateCycleBudget(210).week, 210, 'Wochensatz für 7 Tage muss das komplette Giro-Guthaben sein.');
assert.equal(computeCashRefillTarget(50, 120), 70, 'Bargeld wird bis zum Ziel ergänzt.');
assert.equal(computeCashRefillTarget(200, 120), 0, 'Wenn zu viel Bargeld da ist, bleibt das Ziel unverändert.');
console.log('budget-logic tests passed');
