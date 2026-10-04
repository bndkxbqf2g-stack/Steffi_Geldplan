## Unreleased — Monatsbezogene Lohnkontrolle

- Prognosen werden je Leistungsmonat gespeichert; regulärer Auszahlungsmonat und tatsächlicher Zahlungsmonat bleiben getrennt.
- Mehrere Leistungsmonate werden je Zahlungsmonat in genau einer Kontrollkachel zusammengefasst.
- Festes Monatsentgelt wird in einer Sammelkachel nur einmal angesetzt; Zuschläge und Rückrechnungen werden je Ursprungs-Leistungsmonat zugeordnet.
- Erwartete, bereits berücksichtigte und offene Gesamt-, steuerfreie und steuerpflichtige Zuschläge sowie Nettoeffekte werden getrennt ausgewiesen.
- Unsichere Einzelpositionen bleiben als „UNSICHER/PRÜFEN“ sichtbar und setzen eine ausstehende Abrechnung nicht fälschlich auf „Bitte prüfen“.

## v0.99.64 — Bargeldabhebung verschiebt Budgetabschnitt korrekt

- Bargeldabhebungen sind jederzeit möglich und bleiben Giro→Bargeld-Transfers ohne Ausgabe.
- Der Budgetanker wird aus der letzten Abhebung bestimmt: Werktag → kommender Sonntag, Sonntag → darauffolgender Sonntag.
- Budgetabschnitte bleiben vollständig Sonntag–Samstag; der tatsächliche Lohntag begrenzt den letzten Abschnitt.
- Regressionstests für Werktags-/Sonntagsabhebungen, Folgewoche, Lohntag, Grenztage und Giro/Bargeld/​Ausgaben-Trennung ergänzt.

## v0.99.64 — Steffi-Lohnarten 5034/5026/5030

- UKW-Lohnarten 5026, 5030 und 5034 werden erkannt.
- 5026 wird als Sonntag/Nacht steuerfrei ausgewertet.
- 5034 wird nach dem belegten UKW-Abrechnungsmuster (Juni/Juli 2026) als steuerfrei behandelt; die Abweichung zur allgemeinen §3b-Standardbewertung bleibt als arbeitgeber-/Lohnartenbesonderheit dokumentiert.
- 5030 bleibt ohne eindeutigen Freizeitausgleich als prüfpflichtige Feiertagsposition offen.
- Grundlage: § 3b EStG und Lohnsteuer-Hinweise 2026.

# v0.99.59

- Zeitnachweisimport auf iOS/Safari nutzt FileReader, wenn File.arrayBuffer fehlt, fehlschlägt oder keine Bytes liefert.
- PDF-Seitenumbrüche bleiben echte Zeilenumbrüche; Importfehler nennen jetzt die betroffene Verarbeitungsstufe.
- Regressionstests prüfen Safari-Fallback, fehlerhaftes arrayBuffer, Seitenumbrüche sowie anonymisierte März-/April-/Mai-Zeitnachweise.
- Gemeinsame Fehlerdiagnose für alle App-Funktionen in DEBUGGING.md dokumentiert.
- Steffis Gehaltsgrundlagen, Fixkosten, Pfändungsausschluss und gespeicherte lokale Daten bleiben unverändert.

# Steffis Variante – Übernahme der aktuellen Hauptversion

- Aktuelle Budget-, Prognose-, Bezügemitteilungs-, Recovery- und Payroll-Kontrolllogik übernommen.
- Steffis eigene Fixkosten, lokalen `freundinGeldplan...`-Schlüssel und bisherigen Daten bleiben erhalten.
- Steffis persönliche Lohnbasis (60 %, KR8/Stufe 6, AOK Bayern, kinderlos) bleibt maßgeblich.
- Pfändungsberechnung und Cloud-Sicherung sind in dieser Variante nicht aktiv.

# v0.99.50

- Budget: Der tatsächliche Bargeld-Abhebebetrag ist frei wählbar; das Wochenbudget dient nur noch als Orientierung.
- Service-Worker-Cache erhöht, damit die korrigierte Budget-Oberfläche auf mobilen Geräten sicher aktualisiert wird.

# v0.99.49

- Die Soll-/Ist-Karte verwendet bei offenen Monaten für „Netto-Differenz“ jetzt denselben aktuell berechneten offenen Nettoanspruch wie der Bereich „Nachzahlung netto“. Ein alter reiner Forecast-minus-Ist-Wert (z. B. −189,56 €) kann damit nicht mehr parallel zu einem abweichenden offenen Nettoanspruch (z. B. 168,57 €) stehen.
- Der Nachzahlungsübertrag in den Folgemonat verwendet weiterhin exakt denselben offenen Nettoanspruch; obere Differenz, Nachzahlung netto und Übertrag bleiben dadurch konsistent.
- Übersicht „Erwartete Löhne“: Sobald eine echte Bezügemitteilung für den Monat vorliegt, wird die tatsächliche Auszahlung gezeigt statt der alten Prognose.
- Automatische Payroll-Lernkalibrierung ergänzt: Nach mindestens zwei sauberen, brutto-stimmigen Soll-/Ist-Monaten wird ein stabiler beobachteter Netto-Prognosefehler auf zukünftige Auszahlungen angewandt.
- Monate mit Rückrechnungen, Bruttoabweichungen oder abweichenden variablen Lohnarten werden nicht als Kalibrierungsbasis verwendet.
- Steuer-, SV-, VBL-, Pfändungs- und Auszahlungsabweichungen werden weiterhin im Lernsnapshot gegengeprüft; die festen Tarif-/Rechenregeln werden nicht still überschrieben.
- Gehaltsprognose, Payroll-Karte und Übersicht verwenden die Lernkalibrierung für zukünftige Monate konsistent; nach Bezügemitteilungs-Upload aktualisiert sich die Übersicht sofort.
- Regressionstests sichern den 168,57-€-Anzeige-Fall, tatsächliche Auszahlung in der Übersicht, stabile Zwei-Monats-Kalibrierung und Ausschluss fehlerhafter/Rückrechnungsmonate.

# v0.99.48

- Alte gespeicherte Gehaltsprognosen werden bei vorhandenem Zeitnachweis einmalig mit den aktuellen Rechenregeln neu aufgebaut. Dadurch bleibt z. B. ein alter September-Wert wie 2.847,50 € nicht mehr in Übersicht und Soll-/Ist-Karte stehen, wenn die aktuelle Berechnung 2.831,13 € ergibt.
- Der Neuaufbau aktualisiert gleichzeitig Baseline, Nettoeffekte und gespeicherte Einzelkomponenten; die anschließende Bezügemitteilungsprüfung berechnet daraus den aktuellen offenen Nettoanspruch neu.
- Die Übersicht „Erwartete Löhne“ liest damit denselben aktuellen gespeicherten Prognosewert wie der Gehaltsbereich.
- Wiederholte identische §21-Prüfpositionen werden in der Gehaltskontrolle zu einer Zeile mit aufsummierter Menge zusammengefasst.
- Fixkostenansicht neu gestaltet: kompakte Zusammenfassung für monatliche Fixkosten, nächsten Lohntag und nächsten Zyklus; modernere Einzelkarten; einmalige Pausen/Reduzierungen einklappbar; optimierte iPhone-Darstellung.
- Regressionstests sichern die Migration einer alten September-Prognose auf 2.831,13 €, die Übersichtsanzeige, die §21-Zusammenfassung und die neue Fixkostenstruktur.

# v0.99.47

- Fehlende bzw. nicht auslesbare Einzelkomponenten einer Bezügemitteilung werden im Payroll-Learning nicht mehr still als 0,00 € interpretiert.
- Nur tatsächlich vorhandene Zahlenwerte werden als Beobachtung in den Soll-/Ist-Lernabgleich aufgenommen.
- Eine ausdrücklich ausgewiesene 0 bleibt weiterhin ein echter vergleichbarer Wert.
- Dadurch erzeugen unvollständig aufgeschlüsselte Bezügemitteilungen keine falschen Abweichungswarnungen für Nacht-, Wochenend- oder Schichtbestandteile.
- Regressionstests sichern den Unterschied zwischen „unbekannt“ und „explizit 0“ ab.

# v0.99.46

- Payroll-Learning berücksichtigt jetzt auch passende Rückrechnungsperioden aus späteren Bezügemitteilungen.
- Rückrechnungen können den ursprünglichen Leistungsmonat oder den ursprünglichen Auszahlungsmonat referenzieren und werden für den Lernabgleich zugeordnet.
- Bereits im Auszahlungsmonat gezahlte Teilkomponenten und spätere Rückrechnungen werden komponentenweise addiert, bevor Soll und Ist bewertet werden.
- Damit kann eine später vollständig nachgezahlte Lohnart als bestätigt gelernt werden, statt dauerhaft als Abweichung stehenzubleiben.
- Doppelte Rückrechnungsperioden werden im Lernabgleich dedupliziert; feste Rechenregeln bleiben weiterhin unverändert.
- Regressionstests sichern spätere Rückrechnung, Teilzahlung plus Rückrechnung und den vollständigen Workflow.

# v0.99.45

- Kontrollierte Payroll-Lernhistorie wieder an den aktuellen Bezügemitteilungs-Workflow angeschlossen.
- Jeder passende Soll-/Ist-Abgleich aus Zeitnachweis-Prognose und echter Bezügemitteilung aktualisiert die vorhandenen Lern-Snapshots.
- Unveränderte Soll-/Ist-Daten erzeugen keine unnötigen neuen Lernstände oder Speicher-Schreibvorgänge.
- Die Lernhistorie bleibt rein prüfend: Tarif-, Steuer-, SV- und Pfändungsregeln werden nicht automatisch überschrieben.
- Neue Regressionstests sichern Erzeugung, Aktualisierung ohne Duplikat und Verhalten ohne passende Prognose.

# v0.99.44

- Bezügemitteilungs-Upload wieder in den neu aufgebauten Gehaltsbereich integriert.
- Jede echte Abrechnung wird automatisch mit der passenden Zeitnachweis-Prognose gegengerechnet: Prognose-Auszahlung, tatsächliche Auszahlung, Netto-Differenz, Soll-/Ist-Brutto und offener Anspruch.
- Fehlende Zuschläge werden netto getrennt: steuerfreie Nacht-/Sonntag-/Feiertagsanteile sowie steuerpflichtige Samstag- und Schicht-/Wechselschichtzulagen inklusive Steuer/SV/VBL/Pfändung.
- Offene Netto-Nachzahlungen werden beim nächsten noch nicht abgerechneten Prognosemonat als „Nachzahlung aus Vormonat“ zusätzlich zur regulären Prognose ausgewiesen.
- Spätere Rückrechnungen können sowohl den ursprünglichen Leistungsmonat als auch den ursprünglichen Auszahlungsmonat referenzieren; beide Varianten werden erkannt und nicht doppelt gezählt.
- Teilnachzahlungen mit eindeutig aufgeschlüsselten Komponenten reduzieren den noch offenen Nettoanspruch; unklare Sammelrückrechnungen werden weiterhin nicht geraten.
- Die Gehaltsansicht zeigt maximal die drei neuesten Prognosen/Checks gleichzeitig.
- Reale LfF-Bezeichnungen „Schichtzul.mtl.“ und „Wechselschichtzul.“ werden erkannt.

# v0.99.43

- Offizielle UKW-Pflegetabelle 2026 für KR8 / Berechnungsstufe 3 ergänzt.
- Feiertagsarbeit: 30,94 € je Stunde ohne Freizeitausgleich und 8,02 € je Stunde mit Freizeitausgleich.
- 24. und 31. Dezember ab 6 Uhr sind mit 8,02 € je Stunde als Tarifgrundlage hinterlegt.
- Feiertagszeilen mit ausdrücklich genanntem „ohne FA/FZA“ bzw. „mit FA/FZA“ können aus Zeitnachweisen berechnet werden, auch wenn der interne Lohnartcode noch nicht separat dokumentiert ist.
- Unklare Feiertagszeilen werden weiterhin nicht geraten, sondern als „Bitte prüfen“ behandelt.
- Regressionstests sichern beide Feiertagsvarianten und den Nicht-Raten-Fall ab.

# v0.99.42

- Gehaltsprognose im ersten Schritt komplett auf den Zeitnachweis zurückgeführt: Upload → erkannte Zeitlohnarten → Zulagen/Zuschläge → steuerpflichtiges Brutto → Netto/Pfändung → voraussichtliche Auszahlung.
- 5211 setzt einmalig 250,00 € Wechselschichtzulage, 5212 einmalig 100,00 € Schichtzulage; ohne Code wird keine Zulage ergänzt. Doppelte gleiche Codes werden nicht doppelt bezahlt, 5211+5212 gleichzeitig wird als Konflikt markiert.
- Feste Bezüge bleiben separat sichtbar: 4.226,92 € Grundentgelt + 90,00 € Pflegezulage + 163,51 € Universitätszulage = 4.480,43 € festes steuerpflichtiges Brutto.
- Nacht-, Samstag-, Sonntag- und Feiertagspositionen werden getrennt dargestellt; steuerfreie und steuerpflichtige Zusatzbestandteile bleiben getrennt.
- Leistungsmonat und Auszahlungsmonat werden klar getrennt; aktuell gilt weiterhin Leistungsmonat + 2 Monate.
- Alte Bezügemitteilungs-/Gehaltskontroll- und Einspring-Bedienelemente sind aus der Gehaltsprognose entfernt, damit der Neuaufbau zunächst nur die gewünschte Prognose abbildet.
- Regressionstests sichern Juli sowie die realen März-/April-/Mai-Zeitnachweisstrukturen ab.

# v0.99.40

- Cloud-Anmeldung fordert Supabase jetzt mit der produktiven GitHub-Pages-URL als Redirect an, statt den Projektstandard localhost:3000 zu verwenden.
- Magic-Link-Rückleitungen können die Supabase-Sitzung direkt aus dem URL-Fragment übernehmen und die Cloud-Anmeldung in der App abschließen.
- Regressionstests sichern Produktions-Redirect und Magic-Link-Callback ab.
- Für Supabase Auth muss die produktive GitHub-Pages-URL zusätzlich in der Redirect-Allowlist des Projekts eingetragen sein.

# v0.99.39

- Private Cloud-Sicherung über ein eigenes Supabase-Projekt ergänzt.
- Anmeldung erfolgt per E-Mail/Einmalcode; Cloud-Daten sind durch Auth und Row Level Security strikt an das jeweilige Benutzerkonto gebunden.
- Budget-, Giro-/Bargeld-, Fixkosten-, Spar-, Gehaltsprognose-, Bezügemitteilungs- und Payroll-Lerndaten können automatisch versioniert in der Cloud gesichert werden.
- Bei leerem lokalem Zustand und vorhandener Cloud-Sicherung wird nach erfolgreicher Anmeldung automatisch die letzte Sicherung wiederhergestellt.
- Manuelles „Jetzt sichern“ und „Cloud-Sicherung wiederherstellen“ ergänzt.
- Cloud-Snapshots werden per SHA-256 dedupliziert; reine Export-Zeitstempel erzeugen keine unnötigen neuen Versionen.
- Die bestehende lokale IndexedDB-Recovery bleibt zusätzlich aktiv; Cloud-Backup ist damit die geräteunabhängige zweite Schutzebene.
- Vollständiger lokaler Reset meldet auch die Cloud-Sitzung ab, löscht aber die geschützten Cloud-Backups nicht automatisch.
- Cloud- und Recovery-Module sind in Offline-App-Shell und Regressionstests abgesichert.

# v0.99.38

- Zusätzliche lokale Recovery-Ebene über IndexedDB ergänzt. Sie liegt getrennt vom bisherigen localStorage und wird fortlaufend aus dem aktuellen App-Zustand aktualisiert.
- Wenn der primäre lokale Zustand leer ist, aber eine sinnvolle Recovery-Sicherung vorhanden ist, kann die App diese beim Start automatisch wiederherstellen.
- Ein absichtlicher Komplett-Reset löscht auch die Recovery-Sicherung, damit gelöschte Daten nicht ungewollt zurückkehren.
- Leere/frische Installationen überschreiben keine vorhandene sinnvolle Recovery-Sicherung.
- Recovery-Module sind Teil des Offline-App-Shells und werden durch Regressionstests abgesichert.
- Dies ist eine zusätzliche lokale Schutzschicht; eine geräteunabhängige Cloud-Sicherung bleibt als nächster Schritt vorgesehen.

# v0.99.37

- Gehaltskontrolle ordnet Rückrechnungsperioden jetzt dem ursprünglichen Zeitnachweismonat (reportMonth) zu, nicht dem späteren Auszahlungsmonat.
- Reale LfF-Rückrechnungslogik wie Zeitnachweis Mai → Rückrechnung 05/2026 in einer späteren Bezügemitteilung wird damit korrekt erkannt.
- Bestehende Regressionstests wurden auf die tatsächliche Periodenlogik korrigiert; zusätzlicher Test sichert Mai-Zeitnachweis → Juli-Auszahlung → Rückrechnung Mai.
- Änderungen wurden ausschließlich auf dem Stabilitätsbranch entwickelt und erst nach grüner CI zur Veröffentlichung vorbereitet.
- v0.99.36 bleibt als separater Release-Branch erhalten und kann jederzeit wiederhergestellt werden.

# v0.99.36

- Stabilisierung nach Datenverlust/PWA-Neuinstallation.
- Backup-Import unterscheidet jetzt korrekt zwischen „Fixkosten unbekannt/nicht enthalten“ und „Fixkosten absichtlich leer“. Ein Recovery-Backup mit `fixedCosts: null` leert die vorhandenen Fixkosten nicht mehr.
- Gehaltsprognosen, Bezügemitteilungen und Payroll-Lernhistorie dürfen Speicherfehler nicht mehr still verschlucken. Ein fehlgeschlagener Local-Storage-Schreibvorgang wird nun als Fehler sichtbar.
- Die Stabilisierung wurde zuerst auf einem separaten Branch geprüft und anschließend als eigener Release-Kandidat gesichert.

# v0.99.35

- Payroll-Learning nutzt für variable Bezüge jetzt die passende Rückrechnungsperiode des ursprünglichen Zeitnachweismonats, statt nur die aktuelle Abrechnungsperiode zu betrachten.
- Dadurch können spätere Nachzahlungen aus Bezügemitteilungen tatsächlich zum zugehörigen Zeitnachweis zurücklernen.
- Rückrechnungen eines anderen Monats werden ausdrücklich nicht als Lernquelle verwendet.
- Reale August- und September-2026-Abrechnungswerte sind als Regressionstests hinterlegt; August prüft zusätzlich die Juni-Rückrechnung.
- Die Lernlogik bleibt kontrolliert: Abweichende historische Werte erzeugen Prüfsignale und überschreiben keine festen Tarif-/Steuer-/SV-/Pfändungsregeln.

# v0.99.34

- Tagesaudit aller Änderungen vom 25.09.2026 gegen den aktuellen Main-Stand durchgeführt und Versions-/Dokumentationsdrift bereinigt.
- MODULES und README auf Datenschema 7, Backup-Version 7 und die kontrollierte Payroll-Lernhistorie aktualisiert.
- Die App warnt im Bereich „Daten sichern“ jetzt ausdrücklich davor, die iPhone-Home-Bildschirm-App/PWA ohne vorherige Sicherung zu löschen oder neu anzulegen.
- Der Bezügemitteilungs-Import erklärt jetzt sichtbar, dass passende Soll-/Ist-Werte in die kontrollierte Lernprüfung einfließen, ohne feste Tarif-, Steuer-, SV- oder Pfändungsregeln zu überschreiben.
- payroll-learning.js ist jetzt ausdrücklich Bestandteil des Offline-App-Shell-Regressionstests.
- Das neue apple-touch-icon.png wird vom Service Worker mit gecacht, damit die neue iPhone-Verknüpfung konsistent mit dem aktuellen App-Stand ausgeliefert wird.
- Die bereits in v0.99.33 eingeführte Payroll-Lernlogik bleibt unverändert: Bestätigungen erhöhen Vertrauen, Abweichungen erzeugen Prüfsignale und ändern keine Rechenregeln automatisch.

# v0.99.33

- Zeitnachweise und Bezügemitteilungen bilden jetzt automatisch eine kontrollierte Payroll-Lernhistorie.
- Soll- und Ist-Komponenten werden je Auszahlungsmonat abgeglichen; bestätigte und abweichende Zusammenhänge werden getrennt gespeichert.
- Wiederholte Bestätigungen erhöhen die Vertrauensstufe bis „verifiziert“. Abweichungen werden nur als Warnsignal gelernt und überschreiben keine Tarif-, Steuer-, SV- oder Pfändungsregeln.
- Bereits vorhandene Prognosen und Bezügemitteilungen werden beim Start rückwirkend in die Lernhistorie aufgenommen.
- Die Lernhistorie wird lokal gespeichert, in Backups aufgenommen und beim vollständigen Reset entfernt.
- Regressionstests sichern Monatsabgleich, Deduplizierung, Vertrauensstufen und Abweichungswarnungen ab.

# v0.99.32

- September und der Übertrag in Oktober verwenden jetzt ausschließlich die pfändungsbereinigte Netto-Nachzahlung von 173,19 € statt veralteter 189,88 €.
- Gespeicherte Nettoeffekte vor Berechnungsstand 5 werden bei vorhandener echter Bezügemitteilung nicht mehr angezeigt; die App baut sie automatisch neu auf.
- Oktober addiert offene Nachzahlungen nur zur möglichen Auszahlung, nicht zum regulären Monats-Soll.
- Monatskacheln wurden gestrafft: ausstehende Monate zeigen nur Soll-Brutto und reguläre Auszahlung, erledigte Monate keine unnötigen Einzelzeilen, offene/auffällige Monate nur relevante Details.
- Nachzahlungsdarstellung zeigt kompakt steuerfrei, steuerpflichtig, Gesamt, zusätzliche Abzüge, Pfändungsänderung, Schichtzulage und korrigierte Auszahlung.
- Teilrückrechnungen ohne sicher berechenbaren Rest-Nettoeffekt werden nicht als geratenes Netto in Folgemonate übertragen.
- Tests decken Waiting/OK/Open/Partial/Review, September→Oktober-Übertrag, Mehrfachüberträge und Schutz vor alten 189,88-€-Werten ab.

# v0.99.31

- September-Nachberechnung berücksichtigt jetzt ausdrücklich das höhere pfändbare Netto des korrigierten Monats und berechnet die Pfändung neu.
- Referenz September 2026: pfändbares Netto 2.746,88 € → 2.801,94 €, Pfändung 88,94 € → 112,94 € (+24,00 €).
- Korrigiertes gesetzliches Netto 3.026,99 €, VBL 82,92 € und Auszahlung 2.831,13 €; Netto-Nachzahlung gegenüber 2.657,94 € beträgt 173,19 €.
- Steuerpflichtiger Rückstand: 100,77 € brutto − 43,89 € Steuer/SV − 1,82 € zusätzliche VBL − 24,00 € zusätzliche Pfändung = 31,06 € netto.
- Zusammen mit 142,13 € steuerfreien Zuschlägen ergibt sich 173,19 € Netto-Nachzahlung; die Schichtzulage ist darin bereits enthalten.
- Gehaltskontrolle benennt die Felder nun eindeutig als Soll-Brutto, Abgerechnet-Brutto und Brutto fehlt; veraltete parallele Netto-Schätzwerte werden unterdrückt.
- Teilrückrechnungen können die ursprüngliche volle Netto-Nachzahlung nicht mehr erneut als offenen Übertrag verwenden.
- Gespeicherte Ist-Nettoeffekte werden auf Berechnungsstand 4 neu aufgebaut; Pfändungs-, VBL- und Netto-Abhängigkeiten sind sichtbar nachvollziehbar.
- Release-Test verwendet die zentrale App-Version statt eigener fest codierter Versionswerte.

# v0.99.30

- Netto-Nachzahlung zeigt die Addition jetzt ausdrücklich als „steuerfrei netto + steuerpflichtig netto = gesamte Korrektur netto“.
- Schicht-/Wechselschichtzulage wird als „davon“-Position gekennzeichnet, weil ihr Nettoeffekt bereits in den steuerpflichtigen Rückständen enthalten ist und nicht ein zweites Mal addiert werden darf.
- Der verbleibende steuerpflichtige Rest wird separat innerhalb derselben Gesamtsumme gezeigt, wenn er eindeutig berechenbar ist.
- Zeitzuschläge werden als Kontrollwert gekennzeichnet, weil diese Quersumme sich mit den bereits dargestellten Steuergruppen überschneidet.
- Regressionstest sichert für September 2026: 142,13 € steuerfrei + 31,06 € steuerpflichtig = 173,19 € Netto-Nachzahlung; 30,64 € Schichtzulage sind Bestandteil der 31,06 €.

# v0.99.29

- Nachzahlungsüberträge verwenden im Hinweis jetzt den tatsächlichen Zielmonat statt eines fest codierten Oktober-Texts.
- Wandert ein offener Anspruch z. B. nach November, lautet der Hinweis entsprechend „Reguläres Soll für November 2026 bleibt unverändert“.
- Regressionstest sichert Oktober und November als unterschiedliche Zielmonate ab.

# v0.99.28

- Offene Netto-Nachzahlungen werden im nächsten noch nicht abgerechneten Auszahlungsmonat zusätzlich angezeigt.
- Für September 2026 erscheint die offene Korrektur damit bereits im Oktober-Block als eigener Übertrag.
- Die reguläre Oktober-Prognose bleibt unverändert; zusätzlich wird eine mögliche Auszahlung inklusive offener Nachzahlung gezeigt.
- Sobald eine tatsächliche Rückrechnung erkannt wurde, verschwindet der offene Übertrag automatisch bzw. wandert bei weiter ausstehender Zahlung zum nächsten noch nicht abgerechneten Monat.

# v0.99.27

- Der Legacy-September-Fallback wurde aus dem synchronen Renderpfad entkoppelt und benötigt keine zusätzliche salary-net-effects-Modulverkettung mehr.
- Die Rückrechnung wird direkt aus Soll-Brutto, Soll-Netto, pfändbarem Soll-Netto und der echten Bezügemitteilung aufgebaut.
- Die Gehaltskontrolle bleibt sichtbar, selbst wenn eine einzelne Netto-Rückrechnung mit alten Daten scheitert; statt einer leeren Karte erscheint ein konkreter Hinweis.
- Der bestehende September-Regressionsfall für 142,13 € steuerfrei, 31,06 € steuerpflichtig netto und 30,64 € Nettoeffekt der 100-Euro-Schichtzulage bleibt grün.

# v0.99.26

- Alte September-Prognosen können die Netto-Rückrechnung jetzt vollständig lokal aus gespeicherten Soll-Werten und der echten Bezügemitteilung berechnen.
- Der Legacy-Fallback benötigt für diese Kontrolle keinen erneuten externen Steuerrechner-Import.
- Für September 2026 werden 142,13 € steuerfreie Zuschläge und 100,77 € steuerpflichtige Rückstände rekonstruiert.
- Der steuerpflichtige Nettoeffekt beträgt 31,06 €, davon entfallen 30,64 € auf die 100,00 € Schichtzulage und 0,42 € auf 0,77 € Samstagszuschlag.
- Die erwartete Netto-Korrektur beträgt damit 173,19 €; ausgehend von 2.657,94 € tatsächlicher Auszahlung ergibt sich 2.831,13 €.

# v0.99.25

- Netto-Rückrechnungen werden als Differenzmodell auf die tatsächliche Auszahlung der eingelesenen Bezügemitteilung aufgesetzt.
- Ein Cent-genauer Gleichlauf zwischen Modell-Netto/VBL/Pfändung und echter Abrechnung ist nicht mehr Voraussetzung für die Berechnung.
- Für die Aktivierung reichen nun reine Festbezüge ohne Nachverrechnung bzw. bereits ausgewiesene variable Bezüge sowie ein zum Festbrutto passendes Ist-Brutto.
- Alte September-Datensätze werden erneut migriert, damit 100,00 € Schichtzulage und 0,77 € Samstag aus den 100,77 € steuerpflichtigem Rückstand auch tatsächlich netto berechnet werden.

# v0.99.24

- Alte September-Prognosen ohne Einzelkomponenten werden aus den gespeicherten Summen in steuerfreie Zuschläge und steuerpflichtige Bestandteile migriert.
- Bei 100,77 € steuerpflichtigem Rückstand wird unter der damaligen Modelllogik 5212 Schichtzulage 100,00 € plus 0,77 € Samstag rekonstruiert; eine 250-Euro-Wechselschichtzulage ist dabei ausgeschlossen.
- Der Nettoeffekt der Schichtzulage wird separat gegen die tatsächlich eingelesene aktuelle Bezügemitteilung berechnet.
- Bereits gespeicherte v0.99.23-Ist-Effekte werden neu aufgebaut; die veraltete Aufforderung zum erneuten Einlesen entfällt, wenn die Legacy-Daten eindeutig rekonstruierbar sind.

# v0.99.23

- Rückrechnungen verwenden die tatsächlich eingelesene Bezügemitteilung als verifizierte Netto-Basis, sofern diese der Kernabrechnung entspricht.
- Die 100-Euro-Schichtzulage wird separat als Szenario „aktuelle Abrechnung + nur Schichtzulage“ berechnet, statt als marginaler Effekt nach anderen Zuschlägen.
- Schicht-/Wechselschicht-Nettoeffekte werden nicht mehr als „nicht berechenbar“ ausgegeben, wenn die aktuelle Abrechnung und der Zeitnachweis eine eindeutige Berechnung erlauben.
- Gesamtnachzahlung und Einzelkomponenten bleiben getrennt: Gesamtkorrektur = alle fehlenden Bezüge; Schichtzulage netto = isolierter Differenzbetrag zur aktuellen Abrechnung.

# v0.99.22

- Legacy-Forecasts ohne Einzelkomponenten verwenden wieder die damalige Pfändungssemantik; die VBL wird nicht fälschlich ein zweites Mal aus dem steuerfreien Anteil herausgerechnet.
- Alte Nettoeffekte werden mit der aktuellen BMF-/SV-/VBL-/Pfändungslogik neu berechnet, statt die veraltete Soll-Auszahlung weiterzuverwenden.
- Der echte Juli-Zeitnachweis ist als Regression abgesichert: 21,40 Nachtstunden inklusive sieben Spätdienstanteilen à 0,70 h sowie der beiden Nachtdienste.
- Juli 2026 ergibt 142,13 € steuerfreie Zuschläge und 100,77 € steuerpflichtige variable Bezüge; der Referenz-Nettoeffekt beträgt 189,88 €.

# v0.99.21

- Alte Gehaltsprognosen können die steuerfreie und steuerpflichtige Nachzahlung jetzt aus gespeicherten Brutto-, Netto- und Pfändungswerten rekonstruieren.
- Bei vollständig fehlenden variablen Bezügen wird ein steuerfreier Anteil nicht mehr fälschlich als 0,00 € angezeigt.
- Die Netto-Nachzahlung bleibt auf die tatsächlich eingelesene Auszahlung bezogen; einzelne Lohnarten benötigen nur dann einen erneuten Zeitnachweis, wenn deren Detailaufteilung angezeigt werden soll.

# v0.99.20

- Neu eingelesene Zeitnachweise speichern die erkannten Lohnarten-Codes dauerhaft im Forecast.
- 5211/5212 bestimmen damit auch nach Reload eindeutig Wechsel-/Schichtzulage.
- Die komponentengenaue Nettoaufteilung bleibt nach Reload erhalten.

# v0.99.19

- Gehaltskontrolle rekonstruiert bei älteren Kontrollkarten die gespeicherten Zeitnachweis-Komponenten, statt nur Soll minus Ist als Gesamtfallback zu zeigen.
- Steuerfreie Rückstände werden netto separat gezeigt; steuerpflichtige Rückstände brutto mit Nettoeffekt.
- Zeitzuschläge werden brutto und netto zusammengefasst; 5211/5212 bestimmt weiterhin ausschließlich die im Zeitnachweis gespeicherte Wechsel-/Schichtzulage.
- September-Beispiel mit 142,13 € steuerfrei, 100,77 € steuerpflichtig, 142,90 € Zeitzuschlägen und 100 € Schichtzulage ist als Regressionstest abgesichert.

# v0.99.18

- Erwartete Nachzahlung wird bei alten Datensätzen notfalls direkt aus Soll-Auszahlung minus tatsächlicher Ist-Auszahlung abgeleitet.
- Dadurch bleibt der Netto-Nachzahlungsblock sichtbar, auch wenn der alte Forecast weder Einzelkomponenten noch baselinePayout gespeichert hat.

# v0.99.17

- Behebt den Renderfehler, durch den die berechnete Netto-Nachzahlung nicht in der Gehaltskontrollkarte erschien.
- Der Netto-Breakdown wird jetzt direkt beim Erzeugen jeder Karte berechnet und angehängt.

# v0.99.16

- Alte Gehaltsprognosen zeigen die erwartete Netto-Nachzahlung jetzt sichtbar, auch wenn gespeicherte Einzelbestandteile fehlen.
- Die korrigierte Auszahlung wird aus tatsächlicher Auszahlung plus gespeichertem Nettoeffekt angezeigt.
- Eine fehlende Detailaufteilung wird ausdrücklich als Alt-Daten-Grenze gekennzeichnet statt den gesamten Nachzahlungsblock auszublenden.

# v0.99.15

- Gehaltskontrolle nutzt die tatsächlich eingelesene Monatsabrechnung als sichtbare Basis der erwarteten Nachzahlung.
- Steuerpflichtige Rückstände werden ausdrücklich brutto → Nettoeffekt dargestellt; steuerfreie Zuschläge separat netto.
- Schicht-/Wechselschicht bleibt aus dem im Zeitnachweis erkannten 5212-/5211-Code.

# v0.99.14

- Gehaltskontrolle benennt die offene Netto-Korrektur sichtbar als erwartete Nachzahlung.
- Die erwartete Auszahlung nach Korrektur zeigt klar, dass sie aus aktueller Auszahlung plus Netto-Nachzahlung entsteht.

# v0.99.13

- Bereits gespeicherte Gehaltsprognosen ohne `netEffects` werden beim Start aus ihren vorhandenen Einzelbestandteilen nachberechnet.
- Für den September-Fall ist damit kein erneuter Import des Juli-Zeitnachweises mehr nötig, sofern die Einzelbestandteile bereits gespeichert sind.
- Die Nachberechnung verwendet dieselbe BMF-/SV-/VBL-/Pfändungslogik wie ein neuer Zeitnachweis und erfindet bei unvollständigen oder ungeklärten Bestandteilen keine Werte.

# v0.99.12

- Gehaltskontrolle trennt offene Rückstände zusätzlich in steuerfrei netto und steuerpflichtig netto.
- Zeitzuschläge sowie Schicht-/Wechselschichtzulage erhalten nach erneutem Zeitnachweis-Import eigene Nettoeffekte.
- Voraussichtliche Netto-Nachzahlung und korrigierte Auszahlung werden auf Basis der aktuellen Bezügemitteilung angezeigt.
- VBL-Arbeitnehmeranteil wird vor Anwendung der Pfändungstabelle aus dem pfändbaren Netto herausgerechnet.
- Festbezugs-Referenz 2026: 2.657,94 € Auszahlung, 88,94 € Pfändung, sofern keine Nachverrechnung vorliegt.
- Alte Prognosen bleiben lesbar; für die exakte Detailaufteilung genügt ein erneutes Einlesen des betreffenden Zeitnachweises.

# v0.99.11

- VBL-SV-Hinzurechnungsbetrag 2026 nach der VBL-Systematik statt linearem Näherungsfaktor.
- Eigene VBL-Bemessungsgrundlage: bekannte VBL-pflichtige Bestandteile werden getrennt vom steuer-/SV-pflichtigen Brutto geführt.
- Einspringprämie bleibt steuer- und SV-pflichtig, wird bis zu einer echten Referenzabrechnung aber nicht ungeprüft in die VBL-Basis aufgenommen und als prüfpflichtig markiert.
- §21-Durchschnittspositionen 5161/5162 werden nicht mehr nur still ignoriert, sondern als nicht automatisch berechenbare Bestandteile im Kontrolltool ausgewiesen.
- Feiertagsbezüge werden auf Bezügemitteilungen separat erkannt; ohne eindeutig berechenbaren Zeitnachweis-Betrag wird nicht geraten.
- Nacht/Sonntag bleiben steuer-/SV-frei, Samstag und Schicht-/Wechselschichtzulage steuer-/SV-pflichtig.

# v0.99.10

- Regressionen aus dem neuen Gehaltskontrolltool behoben.
- Prognosemonate ohne vorhandene Bezügemitteilung führen nicht mehr zum Absturz.
- Aggregierte Rückrechnungen gleichen auch kleine Einzelpositionen korrekt aus.
- CI ist jetzt dauerhaft aktiv und prüft JavaScript-Syntax sowie die vollständige Node-Test-Suite nach jedem Push und Pull Request.

# v0.99.9

- Hotfix: Gehalts-/Kontrollmodule können den Start der Budget-App nicht mehr blockieren.
- Budget, Übersicht, Fixkosten, Sparen und Verlauf werden vollständig initialisiert und gerendert, bevor der Gehaltsbereich separat geladen wird.
- Fehler im Gehaltsbereich werden abgefangen; die Kern-App bleibt dabei weiter benutzbar und zeigt ihre gespeicherten Beträge.
- Regressionstest stellt sicher, dass salary-ui nicht mehr als statische Startabhängigkeit eingebunden ist.

# v0.99.8

- Neues Gehaltskontrolltool: Zeitnachweis-Soll gegen tatsächliche Bezügemitteilung.
- Feste Bezüge, Zeit-/Wochenendzuschläge und Schicht-/Wechselschichtzulage werden komponentenweise geprüft.
- Fehlende variable Bezüge werden bei stimmigen festen Bezügen rechnerisch als offener Anspruch ausgewiesen.
- Rückrechnungs-Perioden aus späteren Bezügemitteilungen werden dem ursprünglichen Abrechnungsmonat zugeordnet.
- Offene Bruttodifferenzen werden durch spätere Rückrechnungen reduziert bzw. als erledigt markiert.
- Bei eindeutig zuordenbarer einzelner Rückrechnung wird auch deren tatsächlicher Nettoeffekt angezeigt; davor zeigt die App den prognostizierten Nettoeffekt.
- Budgetlogik bleibt vollständig getrennt und unverändert.
- Steuerlogik bleibt: Nacht/Sonntag steuerfrei, Samstag sowie Schicht-/Wechselschichtzulage steuerpflichtig.

# v0.99.7

- Einzelne Fixkosten können für genau den nächsten Lohnzyklus einmalig pausiert oder reduziert werden.
- Normale Fixkostenbeträge bleiben unverändert; die Ausnahme wird separat mit dem nächsten Auszahlungstag gespeichert.
- Beim automatischen Lohneingang wird die einmalig angepasste Fixkostensumme verwendet und die Ausnahme anschließend verbraucht.
- Im darauffolgenden Lohnzyklus gelten automatisch wieder die normalen Fixkosten.
- Fixkosten-Seite zeigt normalen Monatsbetrag, nächsten Auszahlungstag und die einmalig wirksame Gesamtsumme.
- Vorgemerkte-Lohn-Vorschau berücksichtigt die einmaligen Fixkostenänderungen sofort.
- Einmalige Fixkosten-Ausnahmen sind Bestandteil von Backup/Restore.

# v0.99.6

- Sparziel-Schnellzugriff scrollt nur noch zur Sparsektion und fokussiert kein Eingabefeld mehr; die iPhone-Tastatur öffnet sich dadurch nicht automatisch.
- Refresh-/Update-Button frei oben rechts in die Seite integriert.
- Separate weiße Kopfzeile vollständig entfernt.
- Update-Status erscheint bei Bedarf als kleine schwebende Statusfläche neben dem Refresh-Button.
- Navigation und Seiteninhalt an die fehlende Kopfzeile angepasst.

# v0.99.5

- Übersicht vereinfacht: „Dein aktueller Plan“, „Diese Lohnperiode“ und „Letzte Bewegungen“ entfernt.
- Schnellzugriff direkt unter die erste Übersichtskachel verschoben.
- Neue Kachel „Erwartete Löhne“ für die nächsten zwei anstehenden Auszahlungsmonate.
- Fehlt der zugehörige Zeitnachweis, zeigt die Übersicht statt eines Betrags „Ausstehend“.
- Nach dem Einlesen eines Zeitnachweises aktualisiert sich die Übersicht sofort mit dem berechneten Auszahlungsbetrag.
- Bereits gebuchter aktueller Lohntag wird aus der Zwei-Monats-Vorschau herausgeschoben; angezeigt werden dann die beiden folgenden Auszahlungsmonate.
- „Lohn sofort buchen“ vollständig entfernt; Lohn läuft nur noch über die Vormerkung und automatische Buchung am Auszahlungstag.

# v0.99.4

- Kopfzeile auf den Refresh-Button reduziert.
- Versionsanzeige und Darstellungsumschalter nach „Mehr“ verschoben.
- Neuer persistenter Schalter „Erklärungen anzeigen“ unter „Mehr“.
- Erklärende Hinweise unter den Kacheln lassen sich global ausblenden; Status- und Fehlermeldungen bleiben sichtbar.
- Darstellungspräferenz wird in Datensicherungen aufgenommen.

# v0.99.3

- Bekannten Auszahlungsbetrag aus der Lohnabrechnung vor dem Lohntag vormerken.
- Vormerkung beeinflusst Giro, Tagesbudget und Wochenbudget vor dem Auszahlungstag nicht.
- Automatische Buchung ab 00:00 Uhr am letzten Arbeitstag des Monats; bei geschlossener App rückwirkend beim nächsten Öffnen mit korrektem Buchungsdatum.
- Fixkosten werden beim automatischen Lohnstart genau einmal abgezogen.
- Vormerkung kann bis zum Auszahlungstag geändert oder gelöscht werden.
- Übersicht zeigt den vorgemerkten Betrag und eine klar gekennzeichnete Vorschau für den Auszahlungstag.
- Doppelbuchungsschutz über eindeutige Vormerkungs-ID.

# v0.99.2

- Persönliche Fixkosten aktualisiert.
- Neue Fixkostensumme: 2.160,31 €.
- Einmalige Migration ersetzt den bisherigen Fixkostenstand beim Update; spätere manuelle Änderungen bleiben erhalten.

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
