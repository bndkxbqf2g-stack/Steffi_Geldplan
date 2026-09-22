import test from "node:test";
import assert from "node:assert/strict";
import {
  lastWorkday,
  nextPaydayFrom,
  cycleSegments,
  calculateBudget,
  maxAdditionalWithdrawal,
  plannedPaydayForDate,
  nextWithdrawalOrPayday,
  bavariaPublicHolidays
} from "../lib/cycle.js";

const iso = d => d.toISOString().slice(0, 10);

test("30.09.2026 startet einen Zyklus bis 30.10.2026", () => {
  assert.equal(iso(lastWorkday(2026, 8)), "2026-09-30");
  assert.equal(iso(nextPaydayFrom("2026-09-30")), "2026-10-30");
});

test("Zyklus 30.09.-30.10.2026 wird in 4/7/7/7/5 Tage geteilt", () => {
  const segments = cycleSegments("2026-09-30", "2026-10-30");
  assert.deepEqual(
    segments.map(s => [iso(s.start), iso(s.end), s.days]),
    [
      ["2026-09-30", "2026-10-03", 4],
      ["2026-10-04", "2026-10-10", 7],
      ["2026-10-11", "2026-10-17", 7],
      ["2026-10-18", "2026-10-24", 7],
      ["2026-10-25", "2026-10-29", 5]
    ]
  );
});

test("am 04.10. werden 26 Resttage und 7 Tage Wochenbudget verwendet", () => {
  const result = calculateBudget({
    giro: 1820,
    segmentStart: "2026-10-04",
    nextPayday: "2026-10-30"
  });
  assert.equal(result.remainingDays, 26);
  assert.equal(result.segmentDays, 7);
  assert.equal(result.dailyBudget, 70);
  assert.equal(result.weeklyBudget, 490);
});

test("am letzten Sonntag 25.10. sind Tages- und Wochenbudget auf 5 Tage begrenzt", () => {
  const result = calculateBudget({
    giro: 350,
    segmentStart: "2026-10-25",
    nextPayday: "2026-10-30"
  });
  assert.equal(result.remainingDays, 5);
  assert.equal(result.segmentDays, 5);
  assert.equal(result.dailyBudget, 70);
  assert.equal(result.weeklyBudget, 350);
});

test("vorhandenes Bargeld reduziert nur die maximal mögliche zusätzliche Abhebung", () => {
  assert.equal(maxAdditionalWithdrawal(490, 90), 400);
  assert.equal(maxAdditionalWithdrawal(490, 490), 0);
  assert.equal(maxAdditionalWithdrawal(490, 550), 0);
});

test("Monatsende am Wochenende: letzter Werktag wird korrekt vorgezogen", () => {
  assert.equal(iso(lastWorkday(2027, 0)), "2027-01-29");
});

test("01.10.2026 gehört weiter zum am 30.09. gestarteten Zyklus", async () => {
  const { cycleForDate } = await import("../lib/cycle.js");
  const cycle = cycleForDate("2026-10-01");
  assert.equal(iso(cycle.payday), "2026-09-30");
  assert.equal(iso(cycle.nextPayday), "2026-10-30");
});

test("Budget bleibt innerhalb 30.09.-03.10. auf derselben Abschnittsbasis", async () => {
  const { budgetForDate } = await import("../lib/cycle.js");
  const a = budgetForDate({ giro: 2100, today: "2026-09-30" });
  const b = budgetForDate({ giro: 2100, today: "2026-10-01" });
  assert.equal(iso(a.segmentStart), "2026-09-30");
  assert.equal(iso(b.segmentStart), "2026-09-30");
  assert.equal(a.dailyBudget, 70);
  assert.equal(b.dailyBudget, 70);
  assert.equal(a.weeklyBudget, 280);
  assert.equal(b.weeklyBudget, 280);
});


test("geplanter Lohntag vor aktivem Zyklus ist der letzte Arbeitstag des aktuellen Monats", () => {
  assert.equal(iso(plannedPaydayForDate("2026-09-22")), "2026-09-30");
});

test("nach dem Monatslohntag zeigt die Planung den Folgemonat", () => {
  assert.equal(iso(plannedPaydayForDate("2026-10-31")), "2026-11-30");
});


test("nächste Abhebung ist der kommende Sonntag, wenn er vor dem Lohntag liegt", () => {
  assert.equal(iso(nextWithdrawalOrPayday(new Date("2026-09-22T12:00:00"), new Date("2026-09-30T00:00:00"))), "2026-09-27");
});

test("liegt der Lohntag vor dem kommenden Sonntag, wird der Lohntag als nächste Abhebung angezeigt", () => {
  assert.equal(iso(nextWithdrawalOrPayday(new Date("2026-09-28T12:00:00"), new Date("2026-09-30T00:00:00"))), "2026-09-30");
});


test("bayerische landesweite Feiertage 2026 sind vollständig im Kalender", () => {
  const holidays = bavariaPublicHolidays(2026);
  for (const day of [
    "2026-01-01", "2026-01-06", "2026-04-03", "2026-04-06",
    "2026-05-01", "2026-05-14", "2026-05-25", "2026-06-04",
    "2026-10-03", "2026-11-01", "2026-12-25", "2026-12-26"
  ]) assert.equal(holidays.has(day), true, `${day} fehlt`);
});

test("Heilige Drei Könige, Fronleichnam und Allerheiligen gelten nicht als Arbeitstage", async () => {
  const { isWorkday } = await import("../lib/cycle.js");
  assert.equal(isWorkday("2026-01-06"), false);
  assert.equal(isWorkday("2026-06-04"), false);
  assert.equal(isWorkday("2026-11-01"), false);
});

test("normale Werktage bleiben Arbeitstage", async () => {
  const { isWorkday } = await import("../lib/cycle.js");
  assert.equal(isWorkday("2026-01-07"), true);
  assert.equal(isWorkday("2026-06-05"), true);
});
