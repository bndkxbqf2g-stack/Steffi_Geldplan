const money = v => Math.round((Number(v) || 0) * 100) / 100;

function deMoney(value) {
  if (value == null) return null;
  const raw=String(value).trim();
  const negative=/-$/.test(raw)||/^-/.test(raw);
  const cleaned=raw.replace(/^-|-$|\s|€/g,'').replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? money(negative?-Math.abs(n):n) : null;
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

function lastAmountOnLine(line=''){
  const matches=[...String(line).matchAll(/-?\d{1,3}(?:\.\d{3})*,\d{2}-?|-?\d+,\d{2}-?/g)];
  return matches.length?deMoney(matches.at(-1)[0]):null;
}

function sumMatchingLines(text,predicate){
  let found=false,total=0;
  for(const raw of String(text||'').split(/\r?\n/)){
    const line=raw.trim();
    if(!line||!predicate(line))continue;
    const value=lastAmountOnLine(line);
    if(value==null)continue;
    found=true;total+=value;
  }
  return found?money(total):null;
}

export function parsePayslipComponents(text=''){
  const night=sumMatchingLines(text,line=>/\b5010\b|\b5011\b|Nachtarbeit|Nachtzusch/i.test(line));
  const saturday=sumMatchingLines(text,line=>/\b5014\b|Samstags?(?:arbeit|zuschlag)?/i.test(line));
  const sunday=sumMatchingLines(text,line=>/\b5024\b|Sonntags?(?:arbeit|zuschlag)?/i.test(line));
  const holiday=sumMatchingLines(text,line=>/Feiertag|Feiertagsarbeit|Feiertagszuschlag/i.test(line));
  const wechsel=sumMatchingLines(text,line=>/\b5211\b|Wechselschicht(?:zul(?:age|\.)?)?/i.test(line));
  const schicht=sumMatchingLines(text,line=>!/Wechselschicht/i.test(line)&&(/\b5212\b|Schichtzul(?:age|\.)?|SchiZ/i.test(line)));
  const springIn=sumMatchingLines(text,line=>/Einspring/i.test(line));
  const shift=wechsel!=null||schicht!=null?money((wechsel||0)+(schicht||0)):null;
  return {night,saturday,sunday,holiday,shift,springIn,wechsel,schicht,hasVariableDetail:[night,saturday,sunday,holiday,shift,springIn].some(v=>v!=null)};
}

function parseMonth(text=''){
  const m=String(text).match(/(?:für\s+)?Abrechnungsmonat\s*:\s*(0?[1-9]|1[0-2])\/(20\d{2})/i);
  return m?`${m[2]}-${String(m[1]).padStart(2,'0')}`:null;
}

function parsePeriod(text='',{retro=false}={}){
  const source=String(text);
  const tariffMatch = source.match(/Bezüge:\s*([A-Z]{1,4}\d+)\s*\/\s*(\d+)/i);
  const garnishmentRaw = firstAmount(source, 'Summe\\s+Pfändung\\/Abtretung');
  const priorAdjustment = firstAmount(source, 'Nachverrechnung\\s+aus\\s+Vorm\\.');
  const components=parsePayslipComponents(source);
  const result = {
    month:parseMonth(source),
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
    solidarity: firstAmount(source, 'Solidaritätszuschlag,?\\s+lfd\\.'),
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
    dependents: firstInt(source,/PV\s+Anzahl\s+Kinder\/Nachgew\.\s+Elterneigenschaft\s*\/\s*(\d+)\s*\//i),
    components
  };
  const required=retro?['month','totalGross']:['month','totalGross','legalNet','payout'];
  return {...result,hasPriorAdjustment:Math.abs(result.priorAdjustment)>0.005,needsReview:required.some(k=>result[k]==null)};
}

export function parseRetroPeriods(text=''){
  const parts=String(text).split(/Rückrechnungs-Periode/i).slice(1);
  return parts.map(part=>parsePeriod(part,{retro:true})).filter(period=>period.month);
}

export function parsePayslipText(text = '') {
  return parsePeriod(currentPeriod(text),{retro:false});
}

export function parsePayslipDocument(text=''){
  const current=parsePayslipText(text);
  return {...current,retroPeriods:parseRetroPeriods(text)};
}

export function comparePayslip(forecast, actual, tolerance = 1) {
  if (!forecast || !actual) return { status: 'review', rows: [], maxAbsDiff: null, hasPriorAdjustment:false };
  const adjusted = !!actual.hasPriorAdjustment;
  const fields = [
    ['totalGross', 'Gesamtbrutto', true],
    ['legalNet', 'Gesetzliches Netto', true],
    ['garnishment', 'Pfändung', !adjusted],
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
