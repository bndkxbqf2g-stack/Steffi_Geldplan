# Steffis Geldplan

Lokale Budget-, Lohn- und Prognose-App für Steffi. Alle eingegebenen Daten werden im Browser auf dem jeweiligen Gerät gespeichert.

## Wichtige Regeln

- Der nächste Lohn wird am letzten Banktag des Monats berechnet. Die Kalenderlogik berücksichtigt bundesweite Feiertage sowie die in Bayern landesweit geltenden Feiertage Heilige Drei Könige, Fronleichnam und Allerheiligen.
- Beim Buchen eines Lohns beginnt ein neuer Lohnzyklus. Die verwalteten Fixkosten werden innerhalb desselben Zyklus nur einmal automatisch abgezogen.
- Die App berechnet keine Pfändung. Die Auszahlung basiert auf dem gesetzlichen Netto abzüglich VBL.
- Die Fixkosten gehören zu Steffis eigener Variante und werden beim Versionsabgleich nicht durch Standardwerte ersetzt.
- Die bestehenden lokalen Daten und die `freundinGeldplan...`-Speicherschlüssel bleiben erhalten; es findet keine Übernahme in die Daten der Haupt-App statt.
- Zeitnachweise bleiben lokal; die PDF-Bibliothek wird erst beim PDF-Import vom CDN geladen.
- Die Gehaltsprognose wird aus dem hochgeladenen Zeitnachweis erzeugt. Feste Bezüge, Schicht-/Wechselschichtzulage und Zeitzuschläge werden getrennt ausgewiesen; der Auszahlungsmonat folgt Leistungsmonat + 2 Monate. Gespeicherte ältere Prognosen mit vorhandenem Zeitnachweis werden beim App-Start einmalig auf die aktuellen Rechenregeln aktualisiert, damit Übersicht und Gehaltskontrolle denselben Auszahlungswert verwenden.
- Echte Bezügemitteilungen können anschließend hochgeladen werden. Die App vergleicht Soll und Ist, berechnet offene Netto-Nachzahlungen und führt spätere Rückrechnungen dem betroffenen Prognosemonat zu. Maximal die drei neuesten Prognosen/Checks bleiben gleichzeitig sichtbar.
- Jeder passende Soll-/Ist-Abgleich aktualisiert zusätzlich die Payroll-Lernhistorie. Spätere Rückrechnungen aus Folgemonaten werden dem ursprünglichen Zeitnachweis-/Auszahlungsmonat zugerechnet; Teilzahlungen im aktuellen Monat und spätere Rückrechnungen werden für den Komponentenabgleich zusammengeführt. Fehlende, nicht auslesbare Einzelkomponenten gelten dabei nicht als 0,00 €, sondern bleiben unbekannt. Abweichungen werden als Prüfsignal gespeichert. Die hinterlegten Steu­er-, SV-, VBL- und Tarifgrundlagen werden nicht still überschrieben.

## Daten

Unter **Mehr** können alle lokalen Daten als JSON-Datei gesichert und später wiederhergestellt werden. Vor dem Zurücksetzen, Löschen der Home-Bildschirm-App/PWA oder einer Neuinstallation unbedingt eine Sicherung erstellen. Die Finanzdaten liegen sonst nur im lokalen Browser-/PWA-Speicher und können beim Entfernen der Installation verloren gehen.

## Version v0.18.0
Ab v0.18.0 startet ein Budgetzyklus erst mit einer tatsächlich gebuchten Lohnzahlung. Das erwartete Lohndatum allein aktiviert keinen neuen Zyklus. Die aktuelle Version steht sichtbar in der Kopfzeile hinter „Privat auf diesem Gerät“.


### v0.20.0
Die Lohntermin-Kalenderlogik berücksichtigt die landesweiten gesetzlichen Feiertage in Bayern.

### v0.21.1
Zeitnachweis-Import: positionsbasierte PDF-Zeilenrekonstruktion, sichere Stundenextraktion, Datumsbereich-Erkennung und robuste Lohncode-Prüfung. Eine echte UKW-Zeitnachweis-PDF bleibt für die abschließende Praxisvalidierung erforderlich.

### Statistik
Der Verlauf trennt echte Ausgaben, Bargeldabhebungen und Sparreservierungen. Abhebungen sind Transfers und werden nicht als Verbrauch gezählt; rückgängig gemachte Sparraten werden aus der Sparstatistik entfernt.


## Datenintegrität (v0.28.0)
Beim Start werden lokale Alt-Daten defensiv auf Schema 3 migriert. Ungültige Datumswerte werden nicht als Datum interpretiert. Backups tragen App- und Schema-Version und werden vor dem Restore validiert.


## Datenintegrität aktuell
Aktueller lokaler Datenschema-Stand: 7. Backups verwenden Sicherungsversion 7 und enthalten auch die Payroll-Lernhistorie.

- Die Fixkostenansicht zeigt reguläre Monatsfixkosten, den nächsten Lohnzyklus und einmalige Anpassungen kompakt in Karten; Einzelanpassungen sind einklappbar.

- In der Übersicht ersetzt eine vorhandene Bezügemitteilung die reine September-/Monatsprognose durch die tatsächliche Auszahlung. Zukünftige Monate können eine stabile lernende Auszahlungskalibrierung verwenden.
