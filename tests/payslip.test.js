import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePayslipText, parsePayslipDocument, parsePayslipComponents, comparePayslip } from '../lib/payslip.js';

const JULY = `Aktuelle Abrechnungsperiode
Abrechnungsmonat : 07/2026
Brutto:
Gesamtbrutto 4.480,43
Gesetzliche Abzüge:
Lohnsteuer, lfd. 662,58
Kirchensteuer, lfd. 32,99
Krankenversicherung, lfd. 390,86
Rentenversicherung, lfd. 433,25
Arbeitslosenvers., lfd. 60,56
Pflegeversicherung, lfd. 72,21
Netto:
Gesetzliches Netto 2.827,98
sonstige Be- und Abzüge:
ZV-Uml. Regelentg. AN 81,10-
Summe Pfändung/Abtretung 112,94-
Gesamtbetrag:
Überweisung 2.700,70
Rückrechnungs-Periode
für Abrechnungsmonat : 06/2026
Gesamtbrutto 60,00`;

test('liest reale Juli-Abrechnung ohne Rückrechnung zu vermischen', () => {
  const p = parsePayslipText(JULY);
  assert.equal(p.month, '2026-07');
  assert.equal(p.totalGross, 4480.43);
  assert.equal(p.legalNet, 2827.98);
  assert.equal(p.garnishment, 112.94);
  assert.equal(p.payout, 2700.70);
  assert.equal(p.vbl, 81.10);
  assert.equal(p.needsReview, false);
});

test('erkennt fehlende Pflichtwerte als Bitte prüfen', () => {
  assert.equal(parsePayslipText('Abrechnungsmonat : 07/2026').needsReview, true);
});

test('vergleicht Prognose mit echter Abrechnung', () => {
  const actual = parsePayslipText(JULY);
  const c = comparePayslip({totalGross:4480.43,legalNet:2827.98,garnishment:112.94,payout:2700.70}, actual);
  assert.equal(c.status, 'ok');
  assert.equal(c.maxAbsDiff, 0);
});

test('meldet relevante Abweichungen', () => {
  const actual = parsePayslipText(JULY);
  const c = comparePayslip({totalGross:4500,legalNet:2800,garnishment:100,payout:2700}, actual);
  assert.equal(c.status, 'different');
  assert.ok(c.maxAbsDiff > 1);
});


test('liest Rückrechnungsperioden mit variablen Bezügen getrennt aus',()=>{
  const doc=parsePayslipDocument(`Aktuelle Abrechnungsperiode
Abrechnungsmonat : 10/2026
Bezüge: KR8 / 5
Tabellenentgelt LSGZ 4.226,92
Pflegezulage (AT Uni WÜ) LSGZ 90,00
Universitätszulage Pflege LSGZ 163,51
Gesamtbrutto 4.480,43
Gesetzliches Netto 2.827,98
Nachverrechnung aus Vorm. 155,20
Überweisung 2.855,90
Rückrechnungs-Periode
für Abrechnungsmonat : 09/2026
5010 Nachtarbeit 98,01
5014 Samstagsarbeit 0,77
5024 Sonntagsarbeit 44,12
5212 Schichtzulage 100,00
Gesamtbrutto 242,90`);
  assert.equal(doc.month,'2026-10');
  assert.equal(doc.priorAdjustment,155.20);
  assert.equal(doc.retroPeriods.length,1);
  const retro=doc.retroPeriods[0];
  assert.equal(retro.month,'2026-09');
  assert.equal(retro.totalGross,242.90);
  assert.equal(retro.components.night,98.01);
  assert.equal(retro.components.saturday,0.77);
  assert.equal(retro.components.sunday,44.12);
  assert.equal(retro.components.shift,100);
});

test('fehlende variable Lohnzeilen bleiben unbekannt statt erfunden',()=>{
  const c=parsePayslipComponents('Gesamtbrutto 4.480,43');
  assert.equal(c.hasVariableDetail,false);
  assert.equal(c.night,null);
  assert.equal(c.shift,null);
});


const AUGUST = `Aktuelle Abrechnungsperiode
Abrechnungsmonat : 08/2026
Bezüge: KR8 / 5
Tabellenentgelt LSGZ 4.226,92
Pflegezulage (AT Uni WÜ) LSGZ 90,00
Universitätszulage Pflege LSGZ 163,51
Gesamtbrutto 4.480,43
Gesetzliches Netto 2.827,98
ZV-Uml. Regelentg. AN 81,10-
Nachverrechnung aus Vorm. 11,04
Summe Pfändung/Abtretung 92,94-
Überweisung 2.664,98
Rückrechnungs-Periode
für Abrechnungsmonat : 06/2026
Nachtarbeit LSG 1,35 4,58 6,18
Durchschnitt-VM § 21 LSGZ 7,00 1,44 10,08
Steuerfrei §3b EStG 6,18
Gesamtbrutto 16,26
Gesetzliches Netto 11,22
ZV-Uml. Regelentg. AN 0,18-`;

const SEPTEMBER = `Aktuelle Abrechnungsperiode
Abrechnungsmonat : 09/2026
Bezüge: KR8 / 5
Tabellenentgelt LSGZ 4.226,92
Pflegezulage (AT Uni WÜ) LSGZ 90,00
Universitätszulage Pflege LSGZ 163,51
Gesamtbrutto 4.480,43
Gesetzliches Netto 2.827,98
ZV-Uml. Regelentg. AN 81,10-
Summe Pfändung/Abtretung 88,94-
Überweisung 2.657,94`;

test('liest reale August-Abrechnung samt Juni-Rückrechnung',()=>{
  const doc=parsePayslipDocument(AUGUST);
  assert.equal(doc.month,'2026-08');
  assert.equal(doc.payout,2664.98);
  assert.equal(doc.priorAdjustment,11.04);
  assert.equal(doc.garnishment,92.94);
  assert.equal(doc.retroPeriods.length,1);
  assert.equal(doc.retroPeriods[0].month,'2026-06');
  assert.equal(doc.retroPeriods[0].totalGross,16.26);
  assert.equal(doc.retroPeriods[0].legalNet,11.22);
  assert.equal(doc.retroPeriods[0].components.night,6.18);
});

test('liest reale September-Abrechnung ohne erfundene Nachverrechnung',()=>{
  const doc=parsePayslipDocument(SEPTEMBER);
  assert.equal(doc.month,'2026-09');
  assert.equal(doc.totalGross,4480.43);
  assert.equal(doc.legalNet,2827.98);
  assert.equal(doc.garnishment,88.94);
  assert.equal(doc.payout,2657.94);
  assert.equal(doc.priorAdjustment,0);
  assert.equal(doc.retroPeriods.length,0);
});


test('reale LfF-Schreibweise Schichtzul.mtl. wird als Schichtzulage erkannt',()=>{
  const c=parsePayslipComponents('Schichtzul.mtl. §43TV-L LSGZ 1,00 60,00 60,00');
  assert.equal(c.schicht,60);
  assert.equal(c.shift,60);
  assert.equal(c.hasVariableDetail,true);
});

test('reale LfF-Schreibweise Wechselschichtzul. wird erkannt',()=>{
  const c=parsePayslipComponents('Wechselschichtzul.mtl. §43TV-L LSGZ 1,00 250,00 250,00');
  assert.equal(c.wechsel,250);
  assert.equal(c.shift,250);
});
