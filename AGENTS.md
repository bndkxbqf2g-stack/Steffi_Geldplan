# Arbeitsregeln für Steffi Geldplan

## Einstieg und Schutzgrenzen
- Prüfe vor jeder Änderung den aktuellen Branch, die GitHub-CI, den betroffenen Codepfad und die dazugehörigen Tests.
- Finanzdaten in der App bleiben lokal. Niemals produktive lokale Daten löschen, verändern, exportieren oder in Testausgaben übernehmen.
- Bei der Synchronisierung mit `mein-geldplan` nur ausdrücklich angeforderte, tatsächlich gemeinsame Änderungen übernehmen. Steffis eigene Gehaltsberechnung und Stammdaten, die eigenständigen Fixkosten, die fehlende Pfändungsberechnung und die lokalen Daten bleiben unverändert.
- Keine Cloud-Sicherung aktivieren oder konfigurieren, sofern dies nicht ausdrücklich beauftragt wird.
- Tests verwenden ausschließlich synthetische Daten.

## Änderungen und Veröffentlichung
- Arbeite auf einem Feature-Branch mit kleinen, nachvollziehbaren Änderungen. Öffne nach bestandenen Tests und CI einen Pull Request; merge oder release nur nach ausdrücklichem Auftrag.
- Änderungen an Importen, Datenhaltung oder UI mit passenden Regressionstests absichern.
- Aktualisiere bei einer Veröffentlichung App-Version, HTML und Service-Worker-Cache gemeinsam. Sage nur dann „behoben“, wenn die relevante Prüfung bestanden ist; kennzeichne nicht mögliche Geräteprüfungen als offen.
- Für Fehler aller App-Funktionen gilt [DEBUGGING.md](DEBUGGING.md): reproduzieren, Regressionstest, klein korrigieren, vollständige Tests/CI, sichtbare Prüfung und Fallnotiz.

## Arbeitskürzel
- **A — Autopilot:** vereinbarten Umfang mit Ursachenanalyse, Regressionstests und CI selbstständig erledigen; klare Folgefehler bis zu einem grünen Ergebnis beheben.
- **N — Normal:** begrenzter Entwicklungsblock mit passenden Tests.
- **Q — Qualitätssicherung:** benannten Bereich prüfen und nur belegte Fehler beheben.
- **U — Update:** Status und CI berichten, ohne Änderungen vorzunehmen.
