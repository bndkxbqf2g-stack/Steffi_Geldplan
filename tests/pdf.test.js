import test from "node:test";
import assert from "node:assert/strict";
import { detectReportMonth, parseTimeReportText, parseWageLine, payoutMonth, readPdfText, splitLines, textItemsToLines } from "../lib/pdf.js";

test("Text wird in saubere Zeilen geteilt", () => {
  assert.deepEqual(splitLines("A\n\n B\r\nC "), ["A", "B", "C"]);
});

test("PDF.js Textbausteine werden anhand ihrer Position wieder zu Zeilen zusammengesetzt", () => {
  const items = [
    {str:"12,50",transform:[1,0,0,1,170,700]},
    {str:"Nacht",transform:[1,0,0,1,80,700]},
    {str:"5010",transform:[1,0,0,1,30,700]},
    {str:"Monat: 07/2026",transform:[1,0,0,1,30,720]}
  ];
  assert.deepEqual(textItemsToLines(items), ["Monat: 07/2026", "5010 Nacht 12,50"]);
});

test("Abrechnungsmonat wird erkannt und +2 Monate zugeordnet", () => {
  assert.deepEqual(detectReportMonth("Abrechnungsmonat: 07/2026"), { year: 2026, month: 7 });
  assert.equal(payoutMonth(2026, 7), "2026-09");
});

test("Monat kann aus eindeutigem Datumsbereich eines Zeitnachweises erkannt werden", () => {
  assert.deepEqual(detectReportMonth("Zeitraum 01.08.2026 bis 31.08.2026"), {year:2026, month:8});
  assert.equal(detectReportMonth("31.08.2026 bis 01.09.2026"), null);
});

test("bekannte Lohnart mit eindeutig einer Zahl wird übernommen", () => {
  const item = parseWageLine("5010 Nacht 12,50");
  assert.equal(item.code, "5010");
  assert.equal(item.type, "night");
  assert.equal(item.hours, 12.5);
  assert.equal(item.status, "ok");
});

test("explizite Stundenangabe hat Vorrang vor anderen Zahlen", () => {
  const item = parseWageLine("5010 Nacht 12,50 Std. 4,58 57,25");
  assert.equal(item.hours, 12.5);
  assert.equal(item.status, "ok");
});

test("Lohnabrechnungszeile wird nur bei rechnerisch passendem Satz sicher erkannt", () => {
  const item = parseWageLine("5010 Nachtarbeit LSG 1,35 4,58 6,18");
  assert.equal(item.hours, 1.35);
  assert.equal(item.status, "ok");
  const unsafe = parseWageLine("5010 Nacht 12,50 4,00 50,00");
  assert.equal(unsafe.hours, null);
  assert.equal(unsafe.status, "review");
});

test("mehrdeutige Zahlen werden weiterhin nicht geraten", () => {
  const item = parseWageLine("5010 Nacht 12,50 3,11 88,00");
  assert.equal(item.hours, null);
  assert.equal(item.status, "review");
});

test("5211 und 5212 benötigen keinen erfundenen Stundenwert", () => {
  assert.deepEqual(parseWageLine("5211 Wechselschichtzulage"), {code:"5211",type:"wechsel",line:"5211 Wechselschichtzulage",hours:0,status:"ok"});
  assert.deepEqual(parseWageLine("5212 Schichtzulage"), {code:"5212",type:"schicht",line:"5212 Schichtzulage",hours:0,status:"ok"});
});

test("unbekannte 5xxx-Lohnart wird zur Prüfung markiert", () => {
  const report = parseTimeReportText("Abrechnungsmonat: 08/2026\n5999 Unbekannt 2,00");
  assert.equal(report.unknownCodes.length, 1);
  assert.equal(report.unknownCodes[0].code, "5999");
  assert.equal(report.needsReview, true);
});

test("mehrere unbekannte Codes in einer Zeile werden vollständig markiert", () => {
  const report = parseTimeReportText("Monat: 08/2026\n5998 X 1 5999 Y 2");
  assert.deepEqual(report.unknownCodes.map(x=>x.code), ["5998","5999"]);
});

test("5211 und 5212 gleichzeitig werden als Konflikt markiert", () => {
  const report = parseTimeReportText("Abrechnungsmonat: 08/2026\n5211 Wechselschicht\n5212 Schicht");
  assert.equal(report.wechsel, true);
  assert.equal(report.schicht, true);
  assert.equal(report.needsReview, true);
  assert.match(report.conflict, /5211/);
});

test("echter UKW-Zeitnachweis: Kopfzeile mit deutschem Monatskürzel wird erkannt", () => {
  const text = "Z E I T N A C H W E I S 80030991 Mitarbeiter Aug 26\nerstellt am: 02.09.2026\n15.06.2025 31.12.9999 ZBFD";
  assert.deepEqual(detectReportMonth(text), {year:2026, month:8});
  assert.equal(parseTimeReportText(text).payoutMonth, "2026-10");
});

test("echte UKW-Zeitlohnzeilen mit Doppelpunkt lesen Anzahl am Zeilenende", () => {
  assert.equal(parseWageLine("11.08.2026 21:00 21:42 3A10 5010: Nachtarbeit 0,70").hours, .70);
  assert.equal(parseWageLine("01.08.2026 13:00 14:12 3A14 5014: Sa 13-20 Uhr 0,64 E 1,20").hours, 1.20);
  assert.equal(parseWageLine("02.08.2026 06:00 10:00 3A24 5024: Sonntagsarbeit 25% 4,00").hours, 4.00);
  assert.equal(parseWageLine("20.07.2026 24:00 25:15 3A11 5011: Nacht Beginn v.0:00 1,25").hours, 1.25);
});

test("5162 aus echtem UKW-Zeitnachweis ist bekannte §21-Folgeposition", () => {
  const item = parseWageLine("01.04.2026 3B62 5162:Durchsch.§21TVL-Folg 1,00");
  assert.equal(item.code, "5162");
  assert.equal(item.type, "average21Followup");
  assert.equal(item.hours, 1);
  assert.equal(item.status, "ok");
});

test("echter Juli-Zeitnachweis: Spätdienst-Nachtanteile und zwei Nachtdienste ergeben 21,40 Nachtstunden", () => {
  const text = [
    "Z E I T N A C H W E I S 80030991 Mitarbeiter Jul 26",
    "02.07.2026 21:00 21:42 3A10 5010: Nachtarbeit 0,70",
    "03.07.2026 21:00 21:42 3A10 5010: Nachtarbeit 0,70",
    "06.07.2026 21:00 21:42 3A10 5010: Nachtarbeit 0,70",
    "07.07.2026 21:00 21:42 3A10 5010: Nachtarbeit 0,70",
    "13.07.2026 21:00 21:42 3A10 5010: Nachtarbeit 0,70",
    "18.07.2026 13:00 14:12 3A14 5014: Sa 13-20 Uhr 0,64 E 1,20",
    "19.07.2026 06:00 10:00 3A24 5024: Sonntagsarbeit 25% 4,00",
    "19.07.2026 10:30 14:12 3A24 5024: Sonntagsarbeit 25% 3,70",
    "20.07.2026 21:15 24:00 3A10 5010: Nachtarbeit 2,75",
    "20.07.2026 24:00 25:15 3A11 5011: Nacht Beginn v.0:00 1,25",
    "20.07.2026 25:45 28:00 3A10 5010: Nachtarbeit 2,25",
    "20.07.2026 28:00 30:00 3A10 5010: Nachtarbeit 2,00",
    "21.07.2026 21:15 24:00 3A10 5010: Nachtarbeit 2,75",
    "21.07.2026 24:00 25:15 3A11 5011: Nacht Beginn v.0:00 1,25",
    "21.07.2026 25:45 28:00 3A10 5010: Nachtarbeit 2,25",
    "21.07.2026 28:00 30:00 3A10 5010: Nachtarbeit 2,00",
    "28.07.2026 21:00 21:42 3A10 5010: Nachtarbeit 0,70",
    "29.07.2026 21:00 21:42 3A10 5010: Nachtarbeit 0,70",
    "31.07.2026 3C12 5212: SchiZ§43 1,00"
  ].join("\n");
  const r=parseTimeReportText(text);
  const sum=code=>r.items.filter(i=>i.code===code).reduce((a,i)=>a+(Number(i.hours)||0),0);
  assert.equal(sum("5010"),18.9);
  assert.equal(sum("5011"),2.5);
  assert.equal(Math.round((sum("5010")+sum("5011"))*100)/100,21.4);
  assert.equal(sum("5014"),1.2);
  assert.equal(sum("5024"),7.7);
  assert.equal(r.schicht,true);
  assert.equal(r.wechsel,false);
  assert.equal(r.payoutMonth,"2026-09");
});

test("echter August-Zeitnachweis: Summen und Wechselschicht werden korrekt erkannt", () => {
  const text = [
    "Z E I T N A C H W E I S 80030991 Mitarbeiter Aug 26",
    "01.08.2026 13:00 14:12 3A14 5014: Sa 13-20 Uhr 0,64 E 1,20",
    "02.08.2026 06:00 10:00 3A24 5024: Sonntagsarbeit 25% 4,00",
    "02.08.2026 10:30 14:12 3A24 5024: Sonntagsarbeit 25% 3,70",
    "11.08.2026 21:00 21:42 3A10 5010: Nachtarbeit 0,70",
    "12.08.2026 21:00 21:42 3A10 5010: Nachtarbeit 0,70",
    "13.08.2026 21:00 21:42 3A10 5010: Nachtarbeit 0,70",
    "31.08.2026 3C11 5211: WechS§43 1,00",
    "31.08.2026 21:00 21:42 3A10 5010: Nachtarbeit 0,70"
  ].join("\n");
  const r = parseTimeReportText(text);
  const sum = code => r.items.filter(i=>i.code===code).reduce((a,i)=>a+i.hours,0);
  assert.deepEqual(r.month, {year:2026,month:8});
  assert.equal(r.payoutMonth, "2026-10");
  assert.equal(sum("5010"), 2.8);
  assert.equal(sum("5014"), 1.2);
  assert.equal(sum("5024"), 7.7);
  assert.equal(r.wechsel, true);
  assert.equal(r.schicht, false);
});


test("angehängte UKW-Zeitnachweise März, April und Mai werden zuverlässig erkannt", () => {
  const reports = [
    {
      text: "Z E I T N A C H W E I S 80030991 Mitarbeiter Mrz 26\n" +
        "09.03.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45\n" +
        "10.03.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45\n" +
        "11.03.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45\n" +
        "23.03.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45\n" +
        "24.03.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45\n" +
        "25.03.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45\n" +
        "30.03.2026 3B61 5161: Durchschnitt §21 TV 1,00\n" +
        "31.03.2026 3B61 5161: Durchschnitt §21 TV 1,00\n" +
        "31.03.2026 3C12 5212: SchiZ§43 1,00",
      month: {year:2026, month:3}, payoutMonth:"2026-05", count:9, night:2.7
    },
    {
      text: "Z E I T N A C H W E I S 80030991 Mitarbeiter Apr 26\n" +
        "01.04.2026 3B62 5162:Durchsch.§21TVL-Folg 1,00\n" +
        "02.04.2026 3B62 5162:Durchsch.§21TVL-Folg 1,00\n" +
        "13.04.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45\n" +
        "14.04.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45\n" +
        "15.04.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45\n" +
        "30.04.2026 3C12 5212: SchiZ§43 1,00",
      month: {year:2026, month:4}, payoutMonth:"2026-06", count:6, night:1.35
    },
    {
      text: "Z E I T N A C H W E I S 80030991 Mitarbeiter Mai 26\n" +
        "11.05.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45\n" +
        "12.05.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45\n" +
        "13.05.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45\n" +
        "26.05.2026 3B61 5161: Durchschnitt §21 TV 1,00\n" +
        "27.05.2026 3B61 5161: Durchschnitt §21 TV 1,00\n" +
        "28.05.2026 3B61 5161: Durchschnitt §21 TV 1,00\n" +
        "29.05.2026 3B61 5161: Durchschnitt §21 TV 1,00\n" +
        "31.05.2026 3C12 5212: SchiZ§43 1,00",
      month: {year:2026, month:5}, payoutMonth:"2026-07", count:8, night:1.35
    }
  ];
  for (const expected of reports) {
    const report = parseTimeReportText(expected.text);
    assert.deepEqual(report.month, expected.month);
    assert.equal(report.payoutMonth, expected.payoutMonth);
    assert.equal(report.items.length, expected.count);
    assert.equal(report.needsReview, false);
    assert.equal(report.items.filter(item => item.code === "5010").reduce((sum,item) => sum + item.hours, 0), expected.night);
    assert.equal(report.items.some(item => item.code === "5212"), true);
  }
});


test("Safari-Dateien ohne File.arrayBuffer werden per FileReader eingelesen", async () => {
  const previousReader = globalThis.FileReader;
  const previousPdfjs = globalThis.pdfjsLib;
  const hadReader = Object.prototype.hasOwnProperty.call(globalThis, "FileReader");
  const hadPdfjs = Object.prototype.hasOwnProperty.call(globalThis, "pdfjsLib");
  const bytes = new Uint8Array([1, 2, 3]).buffer;

  globalThis.FileReader = class {
    readAsArrayBuffer(file) {
      this.result = file.payload;
      this.onload();
    }
  };
  globalThis.pdfjsLib = {
    GlobalWorkerOptions: {},
    getDocument({ data }) {
      assert.deepEqual([...data], [1, 2, 3]);
      return {
        promise: Promise.resolve({
          numPages: 1,
          getPage: async () => ({
            getTextContent: async () => ({ items: [{ str: "5010 Nachtarbeit 1,00 Std." }] })
          })
        })
      };
    }
  };

  try {
    const result = await readPdfText({ payload: bytes });
    assert.equal(result.text, "5010 Nachtarbeit 1,00 Std.");
    assert.equal(result.pages, 1);
    assert.equal(result.needsOcr, false);
  } finally {
    if (hadReader) globalThis.FileReader = previousReader;
    else delete globalThis.FileReader;
    if (hadPdfjs) globalThis.pdfjsLib = previousPdfjs;
    else delete globalThis.pdfjsLib;
  }
});

test("Safari-Zeitnachweise nutzen FileReader als Fallback und behalten PDF-Seitenumbrüche", async () => {
  const previousReader = globalThis.FileReader;
  const previousPdfjs = globalThis.pdfjsLib;
  const hadReader = Object.prototype.hasOwnProperty.call(globalThis, "FileReader");
  const hadPdfjs = Object.prototype.hasOwnProperty.call(globalThis, "pdfjsLib");
  const bytes = new Uint8Array([1, 2, 3]).buffer;

  globalThis.FileReader = class {
    readAsArrayBuffer(file) {
      this.result = file.payload;
      this.onload();
    }
  };
  globalThis.pdfjsLib = {
    GlobalWorkerOptions: {},
    getDocument({ data }) {
      assert.deepEqual([...data], [1, 2, 3]);
      return {
        promise: Promise.resolve({
          numPages: 2,
          getPage: async pageNo => ({
            getTextContent: async () => ({
              items: [{ str: pageNo === 1 ? "Zeitnachweis April 2026" : "5010 Nachtarbeit 1,00 Std." }]
            })
          })
        })
      };
    }
  };

  try {
    const withoutArrayBuffer = await readPdfText({ payload: bytes });
    const rejectedArrayBuffer = await readPdfText({
      payload: bytes,
      arrayBuffer: async () => { throw new Error("Null is not an object"); }
    });
    for (const result of [withoutArrayBuffer, rejectedArrayBuffer]) {
      assert.equal(result.text, "Zeitnachweis April 2026\n5010 Nachtarbeit 1,00 Std.");
      assert.equal(result.pages, 2);
      assert.equal(result.needsOcr, false);
    }
  } finally {
    if (hadReader) globalThis.FileReader = previousReader;
    else delete globalThis.FileReader;
    if (hadPdfjs) globalThis.pdfjsLib = previousPdfjs;
    else delete globalThis.pdfjsLib;
  }
});


test('Neue UKW-Codes 5026, 5030 und 5034 werden erkannt',()=>{
  const text=['11.07.2026 20:00 21:00 5Q34 5034: Sa 20-21 Uhr 0,64 E 1,00','12.07.2026 21:00 21:42 3A26 5026: Sonntag und Nacht 0,70','15.08.2026 06:00 10:00 3A30 5030: Feiertagszuschlag 4,00'].join('\n');
  const report=parseTimeReportText('Z E I T N A C H W E I S Mitarbeiter Jul 26\n'+text);
  assert.equal(report.unknownCodes.length,0);
  assert.deepEqual(report.items.map(item=>item.type),['saturdayEvening','sundayNight','holiday']);
  assert.equal(report.needsReview,true);
});
