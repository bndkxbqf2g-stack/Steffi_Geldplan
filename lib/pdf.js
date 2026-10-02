import { SALARY_2026 } from "../config/salary-2026.js";

const PDFJS_SOURCES = [
  {
    script: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    worker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
  },
  {
    script: "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js",
    worker: "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js"
  }
];
let pdfJsLoadPromise = null;

export function splitLines(text = "") {
  return String(text).replace(/\r/g, "\n").split(/\n+/).map(v => v.trim()).filter(Boolean);
}

export function textItemsToLines(items = [], yTolerance = 2.5) {
  const positioned = (items || []).map((item, index) => ({
    text: String(item?.str ?? "").trim(),
    x: Number(item?.transform?.[4] ?? index),
    y: Number(item?.transform?.[5] ?? 0)
  })).filter(i => i.text);
  if (!positioned.length) return [];

  const rows = [];
  for (const item of positioned.sort((a, b) => b.y - a.y || a.x - b.x)) {
    let row = rows.find(r => Math.abs(r.y - item.y) <= yTolerance);
    if (!row) {
      row = { y: item.y, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  }
  return rows.sort((a, b) => b.y - a.y).map(row => row.items.sort((a, b) => a.x - b.x).map(i => i.text).join(" ").replace(/\s+/g, " ").trim()).filter(Boolean);
}

export function payoutMonth(year, month, delay = SALARY_2026.payroll.payoutDelayMonths) {
  const d = new Date(year, month - 1 + delay, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_NAMES = Object.freeze({
  jan:1, feb:2, mrz:3, mär:3, maerz:3, apr:4, mai:5, jun:6, jul:7, aug:8, sep:9, okt:10, nov:11, dez:12
});

export function detectReportMonth(text = "") {
  const source = String(text);
  const header = source.match(/Z\s*E\s*I\s*T\s*N\s*A\s*C\s*H\s*W\s*E\s*I\s*S[\s\S]{0,180}?\b(Jan|Feb|Mrz|Mär|Maerz|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez)\s+(\d{2}|20\d{2})\b/i);
  if (header) {
    const month = MONTH_NAMES[header[1].toLowerCase()];
    const year = header[2].length === 2 ? 2000 + Number(header[2]) : Number(header[2]);
    if (month) return { year, month };
  }
  const patterns = [
    /(?:Abrechnungsmonat|Monat|Zeitraum)\s*[:\-]?\s*(0?[1-9]|1[0-2])[./-](20\d{2})/i,
    /(?:Abrechnungsmonat|Monat|Zeitraum)\s*[:\-]?\s*(20\d{2})[-/](0?[1-9]|1[0-2])/i,
    /(?:Abrechnungsmonat|Monat)\s*[:\-]?\s*(0?[1-9]|1[0-2])\s+(20\d{2})/i
  ];
  for (const pattern of patterns) {
    const m = source.match(pattern);
    if (!m) continue;
    if (m[1].length === 4) return { year: Number(m[1]), month: Number(m[2]) };
    return { year: Number(m[2]), month: Number(m[1]) };
  }

  // Zeitnachweise enthalten häufig nur einen Datumsbereich statt eines Felds "Monat".
  const dates = [...source.matchAll(/\b(?:0?[1-9]|[12]\d|3[01])[.\/-](0?[1-9]|1[0-2])[.\/-](20\d{2})\b/g)];
  if (dates.length) {
    const months = new Set(dates.map(m => `${m[2]}-${String(Number(m[1])).padStart(2, "0")}`));
    if (months.size === 1) {
      const [year, month] = [...months][0].split("-").map(Number);
      return { year, month };
    }
  }
  return null;
}

function decimal(s) {
  const n = Number(String(s).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function explicitHours(tail) {
  const m = String(tail).match(/(-?\d+(?:[.,]\d+)?)\s*(?:Std\.?|Stunden|h)\b/i);
  return m ? decimal(m[1]) : null;
}

function timeReportQuantity(source) {
  if (!/^\s*\d{2}\.\d{2}\.20\d{2}\b/.test(String(source))) return null;
  const m = String(source).match(/(-?\d+(?:[.,]\d+)?)\s*$/);
  return m ? decimal(m[1]) : null;
}

function explicitHolidayType(source) {
  const text=String(source);
  if(!/Feiertagsarbeit/i.test(text))return null;
  if(/ohne\s*(?:FA|FZA|Freizeitausgleich)|135\s*%/i.test(text))return "holidayWithoutTimeOff";
  if(/mit\s*(?:FA|FZA|Freizeitausgleich)|35\s*%/i.test(text))return "holidayWithTimeOff";
  return null;
}

function verifiedPayrollHours(values, code, config) {
  const rateByCode = {
    5010: config.surcharges.night,
    5011: config.surcharges.night,
    5014: config.surcharges.saturday,
    5024: config.surcharges.sunday
  };
  const rate = rateByCode[code];
  if (!rate || values.length < 3) return null;
  for (let i = 0; i <= values.length - 3; i++) {
    const [hours, shownRate, amount] = values.slice(i, i + 3);
    if (Math.abs(shownRate - rate) <= 0.01 && Math.abs(hours * shownRate - amount) <= 0.06) return hours;
  }
  return null;
}

export function parseWageLine(line, config = SALARY_2026) {
  const source = String(line);
  const match = source.match(/(?:^|\s)(5\d{3})(?=[:\s]|$)/);
  if (!match) return null;
  const code = match[1];
  const explicitHoliday=explicitHolidayType(source);
  const type = config.wageTypes[code]||explicitHoliday;
  if(!type)return null;
  const tail = source.slice(match.index + match[0].length).trim();
  const values = [...tail.matchAll(/-?\d+(?:[.,]\d+)?/g)].map(m => decimal(m[0])).filter(v => v !== null);

  // 5211/5212 werden allein durch das Vorhandensein des Codes eindeutig gesetzt.
  if (code === "5211" || code === "5212") {
    return { code, type, line: source.trim(), hours: 0, status: "ok" };
  }

  let hours = timeReportQuantity(source);
  if (hours === null) hours = explicitHours(tail);
  if (hours === null && values.length === 1) hours = values[0];
  if (hours === null) hours = verifiedPayrollHours(values, code, config);
  return {
    code,
    type,
    line: source.trim(),
    hours,
    status: hours === null || (code === "5030" && !explicitHoliday) ? "review" : "ok"
  };
}

export function parseTimeReportText(text, config = SALARY_2026) {
  const lines = splitLines(text);
  const items = lines.map(line => parseWageLine(line, config)).filter(Boolean);
  const unknownCodes = [];
  for (const line of lines) {
    const matches = [...line.matchAll(/(?:^|\s)(5\d{3})(?=[:\s]|$)/g)];
    for (const m of matches) {
      const recognizedHere=items.some(item=>item.code===m[1]&&item.line===line);
      if (!config.wageTypes[m[1]]&&!recognizedHere) unknownCodes.push({ code: m[1], line, status: "review" });
    }
  }
  const month = detectReportMonth(text);
  const hasConflict = items.some(i => i.code === "5211") && items.some(i => i.code === "5212");
  return {
    month,
    payoutMonth: month ? payoutMonth(month.year, month.month, config.payroll.payoutDelayMonths) : null,
    items,
    unknownCodes,
    wechsel: items.some(i => i.code === "5211"),
    schicht: items.some(i => i.code === "5212"),
    recognizedCount: items.length,
    needsReview: items.some(i => i.status === "review") || unknownCodes.length > 0 || hasConflict || !month,
    conflict: hasConflict ? "5211 und 5212 gleichzeitig erkannt" : null
  };
}

export async function ensurePdfJs() {
  const isReady = () => Boolean(globalThis.pdfjsLib && typeof globalThis.pdfjsLib.getDocument === "function");
  const configure = worker => {
    if (!globalThis.pdfjsLib?.GlobalWorkerOptions) throw new Error("Der PDF-Leser konnte nicht korrekt initialisiert werden.");
    globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc = worker;
    return globalThis.pdfjsLib;
  };
  if (isReady()) return configure(PDFJS_SOURCES[0].worker);
  if (typeof document === "undefined") throw new Error("PDF.js ist nur im Browser verfügbar.");
  if (pdfJsLoadPromise) return pdfJsLoadPromise;

  pdfJsLoadPromise = (async () => {
    let lastError = null;
    for (const source of PDFJS_SOURCES) {
      try {
        const existing = [...document.scripts].find(item => item.dataset.meinGeldplanPdfjs === "1" && item.dataset.source === source.script);
        const script = existing || Object.assign(document.createElement("script"), {
          src: source.script,
          async: true
        });
        script.dataset.meinGeldplanPdfjs = "1";
        script.dataset.source = source.script;
        if (!existing) document.head.appendChild(script);
        if (!isReady()) {
          await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Der PDF-Leser antwortet nicht.")), 15000);
            const cleanup = () => {
              clearTimeout(timer);
              script.removeEventListener("load", onload);
              script.removeEventListener("error", onerror);
            };
            const onload = () => { cleanup(); resolve(); };
            const onerror = () => { cleanup(); reject(new Error("PDF.js konnte nicht geladen werden.")); };
            script.addEventListener("load", onload, { once: true });
            script.addEventListener("error", onerror, { once: true });
            if (isReady()) { cleanup(); resolve(); }
          });
        }
        if (isReady()) return configure(source.worker);
      } catch (error) {
        lastError = error;
        document.querySelector('script[data-mein-geldplan-pdfjs="1"][data-source="' + source.script + '"]')?.remove();
      }
    }
    throw new Error(lastError?.message || "PDF.js konnte nicht geladen werden.");
  })();
  try {
    return await pdfJsLoadPromise;
  } finally {
    pdfJsLoadPromise = null;
  }
}
async function readFileArrayBuffer(file) {
  let arrayBufferError = null;
  if (typeof file.arrayBuffer === "function") {
    try {
      const result = await file.arrayBuffer();
      if (result instanceof ArrayBuffer && result.byteLength > 0) return result;
      arrayBufferError = new Error("File.arrayBuffer lieferte keine lesbaren Daten.");
    } catch (error) {
      arrayBufferError = error;
    }
  }

  if (typeof FileReader === "undefined") {
    const detail = arrayBufferError?.message ? " " + arrayBufferError.message : "";
    throw new Error("Dieser Browser kann PDF-Dateien nicht lesen." + detail);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      const detail = reader.error?.message || "unbekannter Fehler";
      const modernDetail = arrayBufferError?.message ? " (File.arrayBuffer: " + arrayBufferError.message + ")" : "";
      reject(new Error("FileReader konnte die Datei nicht lesen: " + detail + modernDetail));
    };
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer && reader.result.byteLength > 0) resolve(reader.result);
      else reject(new Error("Der Browser hat keine lesbaren PDF-Daten geliefert."));
    };
    try {
      reader.readAsArrayBuffer(file);
    } catch (error) {
      reject(new Error("FileReader konnte nicht gestartet werden: " + (error?.message || "unbekannter Fehler")));
    }
  });
}

export async function readPdfText(file) {
  if (!file) throw new Error("Keine PDF-Datei übergeben.");

  let pdfjs;
  try {
    pdfjs = await ensurePdfJs();
  } catch (error) {
    throw new Error("PDF-Leser konnte nicht gestartet werden: " + (error?.message || "unbekannter Fehler"));
  }

  let bytes;
  try {
    bytes = new Uint8Array(await readFileArrayBuffer(file));
  } catch (error) {
    throw new Error("Datei konnte nicht gelesen werden: " + (error?.message || "unbekannter Fehler"));
  }

  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data: bytes }).promise;
  } catch (error) {
    throw new Error("PDF konnte nicht geöffnet werden: " + (error?.message || "unbekannter Fehler"));
  }

  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    try {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      pages.push(textItemsToLines(content.items).join("\n").trim());
    } catch (error) {
      throw new Error("PDF-Seite " + pageNo + " konnte nicht gelesen werden: " + (error?.message || "unbekannter Fehler"));
    }
  }
  const text = pages.join("\n").trim();
  const usefulChars = text.replace(/\s/g, "").length;
  return { text, pages: pdf.numPages, needsOcr: usefulChars < 20, textQuality: usefulChars < 20 ? "none" : usefulChars < 80 ? "low" : "text" };
}
