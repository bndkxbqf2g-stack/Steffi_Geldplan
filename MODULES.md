# Module 01–30
Budget, Cycle, Salary, UI, Insolvenz.

- `lib/payslip.js`: Parser und Prognose-vs.-Ist-Vergleich für Bezügemitteilungen.

### `lib/salary-ui.js`
Verantwortlich für UI-Rendering und Benutzeraktionen rund um Gehaltsprognose, Zeitnachweis und Bezügemitteilungsvergleich. Berechnungen bleiben in `salary.js`, PDF-Parsing in `pdf.js`/`payslip.js`.

### `lib/budget-ui.js`
Budget-, Bargeld- und Buchungs-UI; Fachlogik bleibt in Budget/Cycle/Storage.

### `lib/savings-ui.js`
UI für Sparpositionen und Sparraten.

### `lib/ui.js`
Kleine gemeinsame DOM-/Format-/Navigation-Helfer.


### `lib/fixed-costs.js` / `lib/fixed-costs-ui.js`
Kleine, getrennte Fixkostenlogik und Verwaltung. Die Lohnbuchung liest ausschließlich die gespeicherte Summe.

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

- `lib/storage.js`: Schema-3-Migration, defensive Normalisierung und Datumsvalidierung.
- `lib/maintenance-ui.js`: Backup v3, Validierung und rückrollbarer Restore.
