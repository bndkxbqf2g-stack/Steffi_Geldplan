import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePayslipComponents,parsePayslipDocument} from '../lib/payslip.js';

test('LfF shorthand recognizes all requested types and keeps distinct shift classes',()=>{
  const components=parsePayslipComponents([
    'Nachtarbeit LSG 2,00 4,50 9,00',
    'Nachtarb.Beginn vor 0 Uhr LSG 3,00 4,50 13,50',
    'Wechselsch.mtl. LSGZ 1,00 150,00 150,00',
    'Wechselschichtzul.mtl. LSGZ 1,00 20,00 20,00',
    'Schichtzul.mtl. LSGZ 1,00 60,00 60,00',
    'Durchschnitt §21 TV-L LSGZ 2,00 7,00 14,00',
    'Durchschnitt-VM § 21 LSGZ 1,00 4,00 4,00',
    'Sonderzahlung TVL masch. ELSGZ 1.400,00'
  ].join('\n'));
  assert.equal(components.night,22.50);
  assert.equal(components.wechsel,170);
  assert.equal(components.schicht,60);
  assert.equal(components.shift,230);
  assert.equal(components.average21,18);
  assert.equal(components.specialPayment,1400);
});

test('synthetic payslip keeps original wages and period-specific VBL, not synthetic zeros',()=>{
  const payslip=parsePayslipDocument(`Aktuelle Abrechnungsperiode
Abrechnungsmonat : 11/2026
Gesamtbrutto 2.800,00
Gesetzliches Netto 2.000,00
ZV-Uml. Regelentg. AN 50,00-
Nachverrechnung aus Vorm. 84,00
Überweisung 2.034,00
Rückrechnungs-Periode
für Abrechnungsmonat : 08/2026
Nachtarbeit LSG 5,00 5,00 25,00
Nachtarb.Beginn vor 0 Uhr LSG 5,00 5,00 25,00
Durchschnitt-VM § 21 LSGZ 1,00 10,00 10,00
Gesamtbrutto 60,00
Gesetzliches Netto 62,00
ZV-Uml. Regelentg. AN 2,00-
Rückrechnungs-Periode
für Abrechnungsmonat : 09/2026
Schichtzul.mtl. LSGZ 1,00 50,00 50,00
Gesamtbrutto 50,00
Gesetzliches Netto 28,00
ZV-Uml. Regelentg. AN 4,00-`);
  assert.deepEqual(payslip.retroPeriods.map(period=>period.month),['2026-08','2026-09']);
  assert.equal(payslip.retroPeriods[0].components.night,50);
  assert.equal(payslip.retroPeriods[0].components.average21,10);
  assert.equal(payslip.retroPeriods[0].vblDocumented,true);
  assert.equal(payslip.retroPeriods[1].vbl,4);
  assert.ok(payslip.retroPeriods[0].originalWageLines.some(line=>line.includes('Nachtarb.Beginn')));
  assert.equal(parsePayslipDocument(`Abrechnungsmonat : 12/2026
Gesamtbrutto 1.000,00
Gesetzliches Netto 700,00
Überweisung 700,00
Rückrechnungs-Periode
für Abrechnungsmonat : 10/2026
Gesamtbrutto 20,00
Gesetzliches Netto 14,00`).retroPeriods[0].vbl,null);
});
