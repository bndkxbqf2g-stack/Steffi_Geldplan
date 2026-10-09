# Module 01–30
Budget, Cycle, Salary, UI, lokale Recovery.

- `lib/payslip.js`: Parser und Prognose-vs.-Ist-Vergleich für Bezügemitteilungen.

### `lib/salary-ui.js`
Verantwortlich für den Gehaltsprognose-Fluss Zeitnachweis → erkannte Zeitlohnarten → Brutto/Netto → Auszahlungsmonat. Ältere gespeicherte Forecast-Modelle werden aus ihren gespeicherten Zeitnachweispositionen einmalig mit den aktuellen Regeln neu aufgebaut, bevor Übersicht und Payroll-Check rendern. `salary-payslip-ui.js` ergänzt den Upload echter Bezügemitteilungen und stößt Soll-/Ist-, Rückrechnungs-, offenen Nettoabgleich sowie die kontrollierte Payroll-Lernhistorie an. Berechnungen bleiben in `salary.js` / `salary-net-effects.js`, PDF-Parsing in `pdf.js` / `payslip.js`.

### `lib/budget-ui.js`
Budget-, Bargeld- und Buchungs-UI; Fachlogik bleibt in Budget/Cycle/Storage.

### `lib/savings-ui.js`
UI für Sparpositionen und Sparraten.

### `lib/ui.js`
Kleine gemeinsame DOM-/Format-/Navigation-Helfer.


### `lib/fixed-costs.js` / `lib/fixed-costs-ui.js`
Kleine, getrennte Fixkostenlogik und Verwaltung. Die Lohnbuchung liest ausschließlich die gespeicherte Summe. Die UI verwendet kompakte Karten, eine dreiteilige Zusammenfassung und einklappbare einmalige Anpassungen für den nächsten Lohnzyklus.

### `lib/history-ui.js`
Übersicht, Kontoverlauf, Monatsvergleich und Abhebungsanzeige. Keine eigene Fachberechnung.

### `lib/maintenance-ui.js`
Backup/Restore, Service-Worker-Registrierung und Updateprüfung.
## Step 16
- `tests/simulation.test.js`: kompletter Monatszyklus als Integrations-/Simulationstest
- `lib/cycle.js`: `isWithdrawalDay()` für Sonntagsregel


### Versionierung
`config/version.js` enthält die sichtbare App-Version. Die Version wird in der Kopfzeile angezeigt. Ein Test stellt sicher, dass HTML- und Service-Worker-Version dazu passen.

### Zyklusaktivierung
Der aktive Budgetzyklus wird in `budget-ui.js` aus der letzten tatsächlichen `salary`-Transaktion abgeleitet. `cycle.js` liefert weiterhin reine Datums-/Abschnittsberechnungen und startet selbst keinen produktiven Zyklus.

- `lib/cycle.js`: enthält ab v0.20.0 den vollständigen landesweiten bayerischen Feiertagskalender für die Lohntermin-Berechnung.

- `lib/pdf.js` (v0.21.1): rekonstruiert PDF-Zeilen anhand der PDF.js-Koordinaten, erkennt eindeutige Zeiträume und extrahiert Stunden nur aus sicheren/prüfbaren Mustern.

### `lib/statistics.js`
Reine Statistikfunktionen für Monatswerte, Transaktionssummen und Sparentwicklung. Keine DOM- oder Storage-Abhängigkeit.

- `lib/theme-ui.js` – Theme-Modus (System/Hell/Dunkel), Meta-Theme-Color und Header-Schalter.

- `lib/storage.js`: Schema-7-Migration, defensive Normalisierung und Datumsvalidierung; speichert Budget, Prognosen, Bezügemitteilungen und Payroll-Lernhistorie lokal.
- `lib/maintenance-ui.js`: Backup v7 inklusive Payroll-Lernhistorie, Validierung und rückrollbarer Restore.
- `lib/payroll-learning.js`: kontrollierter Soll-/Ist-Lernabgleich. Komponenten aus aktueller Abrechnung und passenden späteren Rückrechnungen werden zusammengeführt; Beobachtungen erhöhen die Vertrauensstufe. Tarif-, Steuer-, SV- und VBL-Grundlagen werden nicht automatisch überschrieben; eine Pfändungsberechnung ist nicht Bestandteil dieser Variante.
- `lib/payroll-learning-calibration.js`: leitet aus sauberen, brutto-stimmigen Soll-/Ist-Monaten eine konservative Netto-Auszahlungskalibrierung ab. Erst ab zwei stabilen Beobachtungen wird sie auf zukünftige Prognosen angewandt; Monate mit Rückrechnung, Brutto- oder Komponentenfehlern werden ausgeschlossen.


### `lib/payroll-control.js` / `lib/payroll-control-ui.js`
Periodenbezogene Gehaltskontrolle. Verknüpft gespeicherte Zeitnachweis-Prognosen mit tatsächlichen Bezügemitteilungen und späteren Rückrechnungsperioden. Offene Ansprüche bleiben dem ursprünglichen Abrechnungsmonat zugeordnet. Keine Budgetwirkung.

### `lib/payroll-monthly-control.js`
Reine Aggregationslogik für eine Kontrollkachel je tatsächlichem bzw. erwarteten Zahlungsmonat. Trennungen von Leistungsmonat, regulärem Auszahlungsmonat und tatsächlichem Zahlungsmonat bleiben erhalten. Variable Bezüge werden nach steuerfrei/steuerpflichtig getrennt summiert; Rückrechnungen werden dedupliziert dem Ursprung zugeordnet. Unsichere Einzelpositionen werden nicht geschätzt und beeinflussen den Status „Abrechnung ausstehend“ nicht.

### `lib/salary-month-payout.js`
Reine periodenbezogene Aggregation: November-Gesamtnetto = reguläre Auszahlung aus ausgewähltem Zeitnachweis plus separat prognostizierte netto-Jahressonderzahlung. Eine tatsächliche November-Bezügemitteilung enthält bereits die Sonderzahlung und wird nicht doppelt addiert. Bei nicht verfügbaren Steuer-/Netto-Daten wird die Gesamtsumme als offen ausgewiesen. Andere Monate bleiben unverändert.
