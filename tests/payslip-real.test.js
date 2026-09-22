import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePayslipText,comparePayslip} from '../lib/payslip.js';

const APRIL=`Aktuelle Abrechnungsperiode
Abrechnungsmonat : 04/2026
Bezüge: KR8 / 5
Tabellenentgelt LSGZ 4.226,92
Pflegezulage (AT Uni WÜ) LSGZ 90,00
Universitätszulage Pflege LSGZ 163,51
Gesamtbrutto 4.480,43
Gesetzliches Netto 2.827,98
ZV-Uml. Regelentg. AN 81,10-
Nachverrechnung aus Vorm. 123,44
Summe Pfändung/Abtretung 137,49-
Überweisung 2.732,83`;
const JUNE=`Aktuelle Abrechnungsperiode
Abrechnungsmonat : 06/2026
Bezüge: KR8 / 5
Tabellenentgelt LSGZ 4.226,92
Pflegezulage (AT Uni WÜ) LSGZ 90,00
Universitätszulage Pflege LSGZ 163,51
Gesamtbrutto 4.480,43
Gesetzliches Netto 2.827,98
ZV-Uml. Regelentg. AN 81,10-
Nachverrechnung aus Vorm. 9,91
Summe Pfändung/Abtretung 109,49-
Überweisung 2.647,30`;
const JULY=`Aktuelle Abrechnungsperiode
Abrechnungsmonat : 07/2026
Bezüge: KR8 / 5
Tabellenentgelt LSGZ 4.226,92
Pflegezulage (AT Uni WÜ) LSGZ 90,00
Universitätszulage Pflege LSGZ 163,51
Gesamtbrutto 4.480,43
Gesetzliches Netto 2.827,98
ZV-Uml. Regelentg. AN 81,10-
Nachverrechnung aus Vorm. 66,76
Summe Pfändung/Abtretung 112,94-
Überweisung 2.700,70`;
const AUGUST=`Aktuelle Abrechnungsperiode
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
Überweisung 2.664,98`;
const FEB=`Aktuelle Abrechnungsperiode
Abrechnungsmonat : 02/2026
Bezüge: KR8 / 5
Tabellenentgelt LSGZ 4.111,79
Pflegezulage (AT Uni WÜ) LSGZ 90,00
Universitätszulage Pflege LSGZ 159,06
Gesamtbrutto 4.360,85
Gesetzliches Netto 2.728,47
Überweisung 2.776,07`;

test('echte Abrechnungen April bis August bestätigen den aktuellen KR8/5-Festbezug',()=>{
  for(const txt of [APRIL,JUNE,JULY,AUGUST]){
    const p=parsePayslipText(txt);
    assert.equal(p.tariffGroup,'KR8');assert.equal(p.level,5);
    assert.equal(p.basePay,4226.92);assert.equal(p.careAllowance,90);assert.equal(p.universityAllowance,163.51);
    assert.equal(p.totalGross,4480.43);assert.equal(p.legalNet,2827.98);assert.equal(p.vbl,81.10);
  }
});

test('Nachverrechnungen werden separat erkannt statt als Prognosefehler behandelt',()=>{
  const a=parsePayslipText(AUGUST);
  assert.equal(a.priorAdjustment,11.04);assert.equal(a.hasPriorAdjustment,true);
  const c=comparePayslip({totalGross:4480.43,legalNet:2827.98,garnishment:120.94,payout:2625.94},a);
  assert.equal(c.status,'adjusted');
  assert.equal(c.rows.find(r=>r.key==='payout').comparable,false);
  assert.equal(c.maxAbsDiff,0);
});

test('ältere Tarifperiode Februar wird erkannt und nicht mit April-Festbezug verwechselt',()=>{
  const p=parsePayslipText(FEB);
  assert.equal(p.basePay,4111.79);assert.equal(p.universityAllowance,159.06);assert.equal(p.totalGross,4360.85);
});
