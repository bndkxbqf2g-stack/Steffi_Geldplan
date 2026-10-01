# Fehlerbehebung für alle App-Funktionen

Dieses Vorgehen gilt für Fehler in jeder Funktion der App, nicht nur für den Gehaltsimport.

## Ablauf

1. **Ist-Zustand festhalten.** Erfasse die genaue Fehlermeldung, App-Version, Gerät/Betriebssystem, Browser oder PWA sowie die Schritte, die zum Fehler führen. Trenne erwartetes und tatsächliches Verhalten.
2. **Den betroffenen Pfad verfolgen.** Prüfe aktuellen Code, Zuständigkeit des Moduls, bestehende Tests und den CI-Stand. Folge dem tatsächlichen Datenfluss; übernimm keine frühere Vermutung als bestätigte Ursache.
3. **Fehler reproduzieren.** Verwende nach Möglichkeit dieselben Eingaben lokal. Sind diese privat, behandle sie nur lokal und nimm sie nicht in Repository, Logs, Screenshots oder CI-Artefakte auf. Andernfalls erstelle eine synthetische Regressionseingabe mit gleicher Struktur.
4. **Regressionstest zuerst.** Schreibe einen Test, der den Fehler vor der Korrektur nachweist, und prüfe, dass er nach der Änderung besteht.
5. **Minimal korrigieren.** Ändere nur den betroffenen Pfad. Bei Synchronisierung zwischen Apps nur wirklich gemeinsame Logik übernehmen; app-spezifische Regeln, Konfigurationen und lokale Daten bleiben getrennt.
6. **Vollständig prüfen.** Führe gezielte Tests, die gesamte Testsuite, Syntaxprüfung und CI aus. UI-Fehler zusätzlich in der betroffenen Ansicht und auf dem relevanten Gerät/Browser prüfen. Eine erfolgreich gestartete Prüfung ist noch kein grünes Ergebnis.
7. **Version und Veröffentlichung prüfen.** Bei PWA-/Service-Worker-Änderungen App-Version, HTML und Cache-Namen gemeinsam aktualisieren. Die neue Version in der veröffentlichten App sichtbar bestätigen.
8. **Ergebnis protokollieren.** Notiere Symptom, bestätigte Ursache, Regressionstest, Änderung, CI/Release-Status und noch offene Geräteprüfungen. Wenn die echte Umgebung nicht geprüft werden konnte, den Fehler nicht als endgültig behoben bezeichnen.

## Schutzregeln

- Keine echten Finanz-, Personal- oder Gesundheitsdaten in Tests, Git, CI, Debug-Ausgaben oder Screenshots ablegen.
- Keine Nutzerdaten löschen, überschreiben, exportieren oder in ein anderes Repository übertragen.
- Unbekannte Werte unbekannt lassen. Fehlerdiagnosen dürfen keine fachlichen Beträge oder Regeln verändern.
- Eine Synchronisierung zwischen Repositories ändert keine projektspezifischen Fixkosten-, Gehalts-, Steuer-, Pfändungs- oder Speichereinstellungen.

## Fallnotiz: iOS-Zeitnachweisimport

Die angehängten März-, April- und Mai-Zeitnachweise enthalten maschinenlesbaren PDF-Text. Der Textparser erkennt die Monate, Lohnarten und Mengen in einer lokalen Prüfung. Das beweist noch nicht, dass der iPhone-PDF-Leser selbst funktioniert.

Zu prüfen und mit Regressionen abzusichern sind:
- Datei-Bytes über `File.arrayBuffer()`; fehlt die API oder schlägt sie fehl, `FileReader` als Fallback verwenden.
- PDF-Seitenumbrüche als echte Zeilenumbrüche erhalten, damit Monatskopf und Lohnarten anschließend getrennt geparst werden.
- Fehlerstufe in der UI sichtbar machen: PDF-Leser, Dateilesen, PDF öffnen, Seite/Text lesen, Parser, Gehaltsberechnung oder Speichern.
- Finale iPhone-/PWA-Prüfung erst nach Aktualisierung der sichtbaren App-Version bestätigen.

Status dieser Fallnotiz: Struktur und Parser der Beispielnachweise sind geprüft; die ursprüngliche iPhone-Fehlermeldung „Null is not an object“ wurde in der echten iPhone-PWA noch nicht reproduziert.