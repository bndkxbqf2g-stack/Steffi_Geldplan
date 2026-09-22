const money = v => Math.round((Number(v) || 0) * 100) / 100;

function deMoney(value) {
  if (value == null) return null;
  const n = Number(String(value).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? money(n) : null;
}

function currentPeriod(text = '') {
  return String(text).split(/Rückrechnungs-Periode/i)[0];
}

function firstAmount(text, label) {
  const re = new RegExp(label + '\\s+(-?\\d{1,3}(?:\\.\\d{3})*,\\d{2}|-?\\d+,\\d{2})(-)?', 'i');
  const m = String(text).match(re);
  if (!m) return null;
  const value = deMoney(m[1]);
  return m[2] ? -Math.abs(value) : value;
}

function firstInt(text, pattern) {
  const m = String(text).match(pattern);
  return m ? Number(m[1]) : null;
}

export function parsePayslipText(text = '') {
  const source = currentPeriod(text);
  const monthMatch = source.match(/Abrechnungsmonat\s*:\s*(0?[1-9]|1[0-2])\/(20\d{2})/i);
  const tariffMatch = source.match(/Bezüge:\s*([A-Z]{1,4}\d+)\s*\/\s*(\d+)/i);
  const month = monthMatch ? `${monthMatch[2]}-${String(monthMatch[1]).padStart(2, '0')}` : null;
  const garnishmentRaw = firstAmount(source, 'Summe\\s+Pfändung\\/Abtretung');
  const priorAdjustment = firstAmount(source, 'Nachverrechnung\\s+aus\\s+Vorm\\.');
  const result = {
    month,
    tariffGroup: tariffMatch?.[1] || null,
    level: tariffMatch ? Number(tariffMatch[2]) : null,
    basePay: firstAmount(source, 'Tabellenentgelt\\s+LSGZ'),
    careAllowance: firstAmount(source, 'Pflegezulage\\s+\\(AT\\s+Uni\\s+WÜ\\)\\s+LSGZ'),
    universityAllowance: firstAmount(source, 'Universitätszulage\\s+Pflege\\s+LSGZ'),
    totalGross: firstAmount(source, 'Gesamtbrutto'),
    legalNet: firstAmount(source, 'Gesetzliches\\s+Netto'),
    garnishment: garnishmentRaw == null ? null : Math.abs(garnishmentRaw),
    payout: firstAmount(source, 'Überweisung'),
    priorAdjustment: priorAdjustment == null ? 0 : priorAdjustment,
    wageTax: firstAmount(source, 'Lohnsteuer,?\\s+lfd\\.'),
    churchTax: firstAmount(source, 'Kirchensteuer,?\\s+lfd\\.'),
    health: firstAmount(source, 'Krankenversicherung,?\\s+lfd\\.'),
    pension: firstAmount(source, 'Rentenversicherung,?\\s+lfd\\.'),
    unemployment: firstAmount(source, 'Arbeitslosenvers\\.,?\\s+lfd\\.'),
    care: firstAmount(source, 'Pflegeversicherung,?\\s+lfd\\.'),
    vbl: Math.abs(firstAmount(source, 'ZV-Uml\\.\\s+Regelentg\\.\\s+AN') || 0),
    childAllowance: (() => {
      const m=source.match(/Steuerklasse[\s\S]{0,180}?Kinderfreibetr\.[\s\S]{0,100}?\b(\d+,\d)\b/i);
      return m ? Number(m[1].replace(',','.')) : null;
    })(),
    dependents: firstInt(source,/PV\s+Anzahl\s+Kinder\/Nachgew\.\s+Elterneigenschaft\s*\/\s*(\d+)\s*\//i)
  };
  const required = ['month', 'totalGross', 'legalNet', 'payout'];
  return { ...result, hasPriorAdjustment: Math.abs(result.priorAdjustment) > 0.005, needsReview: required.some(k => result[k] == null) };
}

export function comparePayslip(forecast, actual, tolerance = 1) {
  if (!forecast || !actual) return { status: 'review', rows: [], maxAbsDiff: null, hasPriorAdjustment:false };
  const adjusted = !!actual.hasPriorAdjustment;
  const fields = [
    ['totalGross', 'Gesamtbrutto', true],
    ['legalNet', 'Gesetzliches Netto', true],
    ['payout', 'Auszahlung', !adjusted]
  ];
  const rows = fields.map(([key, label, comparable]) => {
    const predicted = forecast[key];
    const real = actual[key];
    const difference = predicted == null || real == null || !comparable ? null : money(real - predicted);
    return { key, label, predicted, actual: real, difference, comparable, note: comparable ? null : 'durch Nachverrechnung beeinflusst' };
  });
  const diffs = rows.filter(r=>r.comparable).map(r => r.difference).filter(v => v != null).map(Math.abs);
  const maxAbsDiff = diffs.length ? money(Math.max(...diffs)) : null;
  let status = actual.needsReview || maxAbsDiff == null ? 'review' : maxAbsDiff <= tolerance ? 'ok' : 'different';
  if(status==='ok' && adjusted) status='adjusted';
  return { status, rows, maxAbsDiff, hasPriorAdjustment:adjusted, priorAdjustment:actual.priorAdjustment };
}
