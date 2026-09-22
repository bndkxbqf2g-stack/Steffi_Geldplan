# v1.0.0 – persönliche Variante

- Basis: stabiler Stand v0.99.1 der Haupt-App.
- Eigene Stammdaten KR8, Zahlstufe 6, 60 %.
- AOK Bayern, Steuerklasse I, keine Kirche, keine Kinder.
- Keine Pfändungs-/Privatinsolvenzberechnung.
- Eigene Fixkosten 1.424,21 €.
- Separater Local-Storage-Namespace.

# v0.99.1
- Sparbereich vereinfacht: nur noch Zweck, Betrag und Sparverlauf; keine separate Sparziel-Verwaltung mehr.
- Bestehende Zwecke werden intern automatisch wiederverwendet; neue Zwecke automatisch angelegt.
- Aktive Sparbuchungen können im Verlauf weiterhin freigegeben werden.
- Gehaltsprognose auf kleinen iPhone-Breiten responsiver gemacht; lange Werte brechen sauber um.
- Abrechnungsvergleich in mobile, mehrzeilige Prognose/Abrechnung/Abweichung-Darstellung umgebaut.
- Zeitlohnarten im UI deutsch beschriftet; 5211/5212 werden als monatliche Zulage statt 0,00 h angezeigt.
- Prognosegrafik kompakter und klarer dargestellt.

# Changelog

## v0.99.1 – Release Candidate
- Keine neuen Fachfunktionen.
- Gesamtcheck für Repo-Root, PWA-Versionierung, Service Worker und Test-Suite.
- Release-Candidate-Stand für den Praxistest auf GitHub Pages/iPhone.

## v0.99.1 – UX & Fehlerzustände
- Nicht-blockierende Statusmeldungen statt vieler Browser-Alerts.
- Update-Button zeigt einen echten Busy-Zustand und verhindert Doppelklicks während der Prüfung.
- Leere Listen und mobile Touch-Ziele klarer dargestellt.
- Safe-Area-Abstand für iPhone/PWA verbessert.
- Keine Änderung an Budget-, Spar- oder Gehaltsformeln.


## v0.28.0 – End-to-End-Absicherung
- kompletter Budgetzyklus als Integrationsfluss abgesichert: Lohn, Fixkosten, Sonntag-Abhebung, Sparrate, Giro-Ausgabe, verkürzter Schlussabschnitt und neuer Lohn
- Statistik prüft dabei, dass Bargeldabhebungen keine Ausgaben sind
- Zeitnachweis -> Prognose -> Bezügemitteilung als zusammenhängender Integrationspfad getestet
- Nachverrechnungen beeinflussen Pfändung/Auszahlung weiterhin nicht als Prognosefehler
- keine fachliche Änderung an Budget- oder Gehaltsformeln

## v0.27.0 – Datenintegrität & Migration
- automatische, idempotente Migration lokaler Alt-Daten auf Schema 3
- ungültige Datumswerte können keinen 1970-/NaN-Zustand mehr erzeugen
- Transaktionen, Bargeld, Sparziele, Fixkosten und Historien werden beim Lesen defensiv normalisiert
- Backup-Format v3 mit App-/Schema-Version und Theme
- Restore prüft Backups vor dem Schreiben und behält vorhandene Daten bei, wenn die Wiederherstellung fehlschlägt
- alte Backup-Versionen 1/2 bleiben kompatibel; unbekannte zukünftige Versionen werden abgewiesen


## v0.26.0 – Premium-UI & Dark Mode
- Drei Darstellungsmodi: System, Hell und Dunkel; Umschaltung direkt im Header.
- Theme-Präferenz wird lokal gespeichert und folgt im Systemmodus automatisch iOS/macOS.
- Karten, Navigation, Buttons, Eingaben und Charts auf einen ruhigeren Apple/N26-inspirierten Glass-Look vereinheitlicht.
- Safe-Area, mobile Header-Abstände und Touch-Ziele verbessert.
- Budget-, Spar-, Statistik- und Gehaltsberechnungen unverändert.

## v0.22.0
- Gehaltsprognose gegen echte 2026-Bezügemitteilungen validiert.
- Nachverrechnungen werden getrennt erkannt und verfälschen den Prognosevergleich nicht mehr.
- Tarifgruppe, Stufe und feste Entgeltbestandteile werden aus Bezügemitteilungen erkannt.
- Reine Kernabrechnung KR8/5 (ab 04/2026) als Regressionstest hinterlegt.

## v0.21.1
- Step 21 Praxisvalidierung mit echten UKW-Zeitnachweisen März, April, Mai, Juli und August 2026.
- UKW-Kopfzeilen mit Monatskürzeln (Mrz/Apr/Mai/Jul/Aug) werden sicher erkannt.
- Lohnart-Codes mit Doppelpunkt (z. B. 5010:, 5211:) werden korrekt gelesen.
- Bei echten Zeitnachweiszeilen wird die Spalte Anzahl am Zeilenende verwendet; Zahlen in Bezeichnungen wie „Sa 13-20 Uhr 0,64 E“ oder „25%“ werden nicht mit Stunden verwechselt.
- 5162 „Durchsch.§21TVL-Folg“ als bekannte §21-Folgeposition ergänzt.
- Reale Validierung: März→Mai, April→Juni, Mai→Juli, Juli→September, August→Oktober.
- Budget- und Sparlogik unverändert.

## v0.21.0
- Step 21: Zeitnachweis-PDF-Import für reale PDF-Strukturen gehärtet.
- PDF.js-Textbausteine werden anhand ihrer Koordinaten wieder zu Zeilen zusammengesetzt; Lohnarten gehen dadurch nicht mehr in einem Seiten-Fließtext verloren.
- Monat kann zusätzlich aus einem eindeutigen Datumsbereich erkannt werden; Auszahlung bleibt +2 Monate.
- Stunden werden nur aus eindeutigen Angaben, expliziten Std./h-Werten oder rechnerisch verifizierbaren UKW-Lohnzeilen übernommen; bei Mehrdeutigkeit weiterhin „Bitte prüfen“.
- 5211/5212 werden allein durch den Code als Wechsel-/Schichtzulage erkannt, ohne erfundene Stunden.
- Unbekannte 5xxx-Codes werden vollständig zur Prüfung markiert.
- OCR bleibt weiterhin nur Fallback/Prüffall; es wird nichts geraten.
- Hinweis: Die technische Importlogik ist vorbereitet und getestet. Eine abschließende Validierung gegen einen echten UKW-Zeitnachweis benötigt noch ein solches Original-PDF.

## v0.20.0
- Kalenderlogik für Bayern vervollständigt: Heilige Drei Könige, Fronleichnam und Allerheiligen ergänzt.
- Landesweite bayerische Feiertage zentral testbar gemacht.
- Zusätzliche Tests für Feiertage und normale Werktage ergänzt.

# Changelog

## v0.99.1 – Release Candidate
- Keine neuen Fachfunktionen.
- Gesamtcheck für Repo-Root, PWA-Versionierung, Service Worker und Test-Suite.
- Release-Candidate-Stand für den Praxistest auf GitHub Pages/iPhone.

## v0.18.4
- „Nächste Abhebung“ zeigt den kommenden Sonntag.
- Liegt der nächste Lohntag vor diesem Sonntag, wird stattdessen der Lohntag angezeigt.
- Budgetberechnung aus v0.18.3 bleibt unverändert.

## v0.18.3
- Bugfix: Im laufenden Altbestand vor dem nächsten Lohn wird das Giro-Budget nicht mehr für die bereits durch Bargeld abgedeckten Tage bis Samstag berechnet.
- Tages- und Wochenbudget beziehen sich auf den nächsten Abhebungssonntag und dessen Budgetabschnitt bis Samstag bzw. bis zum Tag vor dem Lohneingang.
- Beispiel 22.09.2026: 8 Tage bis Lohn bleiben sichtbar; Budgetbasis ist 27.09.–29.09. (3 Tage).
- Bargeld bleibt vollständig außerhalb der Tages-/Wochenbudget-Berechnung und reduziert nur die zusätzlich mögliche Abhebung.

## v0.1.0
- Modulstruktur angelegt

## Step 9 – PDF/Zeitnachweis
- `lib/pdf.js`: PDF-Text lazy laden und Zeitlohnarten streng erkennen.
- PDF.js wird erst beim Import geladen.
- Unklare Werte/unbekannte Codes werden als „Bitte prüfen“ markiert.
- `tests/pdf.test.js`: Parser, Monatszuordnung, Konflikte und Nicht-Raten abgesichert.

## Step 10 – Salary / Brutto-Netto
- `lib/salary.js` kapselt Gehaltsprognose, Sozialversicherung und Pfändung.
- Lohnsteuer/Soli: BMF-PAP 2026 über lazy geladenes, auf Version 1.0.7 fixiertes `lohnsteuerrechner`-Modul.
- BKK-firmus-/SV-Profil und Beitragsbemessungsgrenzen 2026 zentral in `config/salary-2026.js`.
- VBL-Arbeitnehmeranteil und ZV-SV-Hinzubetrag an Bezügemitteilung 07/2026 kalibriert.
- Pfändung 2026 für zwei Unterhaltspflichten aus der amtlichen Tabelle abgebildet.
- Alte Näherungsformel aus `app.js` entfernt.

## Step 11
- Salary-UI an `lib/salary.js` angebunden und Prognoseverlauf gespeichert.
- Pfändungslogik 2026 gegen amtliche Tabelle abgesichert.
- Nacht-/Sonntagszuschläge getrennt von Samstag/Schicht behandelt.
- Samstag und Schicht bleiben steuer-/pfändungspflichtig; Nacht/Sonntag werden separat geschützt ausgewiesen.
- Prognosehistorie bleibt strikt vom Budget getrennt.

## Step 12
- Bezügemitteilungen als PDF einlesen
- aktuelle Abrechnungsperiode von Rückrechnungen trennen
- Prognose mit Gesamtbrutto, gesetzlichem Netto, Pfändung und Auszahlung vergleichen
- reale Abrechnungen getrennt vom Budget speichern

## Step 13 – Salary/PDF UI ausgelagert
- Gehalts-, Zeitnachweis- und Bezügemitteilungs-UI aus `app.js` nach `lib/salary-ui.js` verschoben.
- `app.js` von 322 auf 205 Zeilen reduziert.
- Keine Fachlogik geändert.
- PWA-Version auf v51 erhöht.
- Neue UI-Helfertests ergänzt.

## Step 14 – Budget/UI Cleanup
- Budget-/Bargeld-UI nach `lib/budget-ui.js` ausgelagert.
- Spar-UI nach `lib/savings-ui.js` ausgelagert.
- Gemeinsame UI-Helfer in `lib/ui.js`.
- `app.js` auf Initialisierung/Verkabelung reduziert.
- Tote Sparziel-/Monats-Helfer aus `app.js` entfernt.
- PWA-Version auf v52 erhöht.


## Step 15 – Integritätscheck / sichtbare Funktionen wieder angebunden
- Fixkosten-Verwaltung wieder funktionsfähig und persistent; alter Gesamtwert 2.156 € wird als kompatibler Standard übernommen.
- Lohnbuchung nutzt jetzt die tatsächlich verwaltete Fixkostensumme statt eines versteckten Hardcodes.
- Kontostandkorrektur wieder angebunden.
- Übersicht, letzter Verlauf, kompletter Verlauf, Monatsvergleich und Monatsgrafik wieder angebunden.
- Backup/Restore der lokalen App-Daten wieder angebunden.
- Service Worker wird wieder registriert; Update-Button prüft auf neue Versionen.
- PWA-Cache auf v53 erhöht.
- Integritätstest prüft alle sichtbaren Aktionsbuttons.
## Step 16 – Vollständiger Budgetzyklus-Simulationstest
- kompletter Zyklus 30.09.–30.10.2026 als End-to-End-Test ergänzt
- Bargeldrest, freiwillig kleinere Abhebung, Sparrate, Kartenausgabe und neuer Lohn geprüft
- Wochenabhebung ist nun ausschließlich am Sonntag des aktiven Abschnitts möglich
- PWA-Cache auf v54 angehoben
- 62/62 Tests bestanden


## v0.18.0 – Step 18
- Neuer Budgetzyklus startet nur noch durch eine tatsächliche Lohnbuchung.
- Erreichen des erwarteten Lohndatums allein erzeugt keinen neuen Zyklus mehr.
- Ohne aktiven Lohnzyklus werden Tages-/Wochenbudget nicht künstlich berechnet.
- Sichtbare Versionsnummer in der Kopfzeile nach „Privat auf diesem Gerät“.
- Service-Worker-/Asset-Version auf v0.18.0 vereinheitlicht.
- Neue Tests für Lohnaktivierung, ausbleibenden Folgelohn und Versionskonsistenz.

## v0.19.0
- Sparpositionen können umbenannt werden.
- Sparpositionen können gelöscht werden; aktive Reservierungen werden dabei wieder freigegeben.
- Einzelne Sparraten können rückgängig gemacht und wieder für das Budget freigegeben werden.
- Rückgängig gemachte Sparraten bleiben intern als Historie erhalten, zählen aber nicht mehr als reserviertes Geld.

## v0.23.0
- Einspringprämie ergänzt: 150 € je Einspringdienst plus Einspringstunden × persönliches Stundenentgelt.
- Persönliches Stundenentgelt wird aus hinterlegtem Tabellenentgelt, Wochenarbeitszeit und Monatsfaktor abgeleitet.
- Normale Nacht-/Wochenend-/Schichtzuschläge bleiben ausschließlich im Zeitnachweis, damit nichts doppelt gezählt wird.
- Steuer-/SV-/Pfändungsbehandlung der Einspringprämie bleibt bis zur ersten echten Referenzabrechnung als prüfpflichtige Annahme markiert.

## v0.24.0 – Step 24
- Leichtgewichtige Statistik ohne Chart-Framework ergänzt.
- Einnahmen, echte Giro-Ausgaben, Bargeldabhebungen und aktuell reservierte Sparbeträge werden getrennt ausgewiesen.
- Monatsvergleich zeigt Einnahmen, Ausgaben und Sparreservierungen der letzten Monate.
- Sparentwicklung wird je Sparposition dargestellt; rückgängig gemachte Sparraten werden nicht gezählt.
- Abhebungen bleiben Transfers Giro → Bargeld und werden ausdrücklich nicht als Verbrauch gewertet.

## v0.26.0
- PWA-Updateprüfung lädt `version.js` explizit ohne Cache und zeigt den tatsächlichen Prüfstatus.
- Service-Worker-Registrierung nutzt `updateViaCache: none`, aktiviert neue Worker sofort und lädt bei neuer Version neu.
- Lokale Kernmodule werden als App-Shell vorgehalten, damit Budget, Verlauf und gespeicherte Daten nach einem erfolgreichen Online-Start auch offline öffnen können.
- App-Assets bleiben network-first mit Cache-Fallback, damit GitHub-Pages-Updates nicht an alten JS-Dateien hängen bleiben.
