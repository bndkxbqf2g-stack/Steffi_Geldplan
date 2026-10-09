import { getSalaryForecasts, saveSalaryForecasts, getPayrollLearning, getPayslips } from './storage.js';
import { calculateDisplayedMonthPayout } from './salary-month-payout.js';
import { SALARY_2026 } from '../config/salary-2026.js';
import { calculateSalaryForecast, salaryForecastBreakdown } from './salary.js?v=0.99.69';
import { calculateNetEffects } from './salary-net-effects.js?v=0.99.69';
import { initSalaryPayslipUi, refreshPayrollChecks } from './salary-payslip-ui.js?v=0.99.69';
import { renderPayrollControl } from './payroll-control-ui-v2.js';
import { readPdfText, parseTimeReportText, parseWageLine } from './pdf.js';
import { notify } from './ui.js';
import { learnedPayoutForForecast } from './payroll-learning-calibration.js';
import { payrollForecastStorageKey } from './payroll-monthly-control.js';

const $=id=>document.getElementById(id);
const eur=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number.isFinite(Number(v))?Number(v):0);
const FORECAST_MODEL=4;
let activeReport=null;
let activeForecast=null;
let forecastChanged=()=>{};
let payoutRenderSequence=0;

export function salaryMonthLabel(value){if(!value)return '–';const p=String(value).split('-');return p.length===2?`${p[1]}/${p[0]}`:value;}
export function salaryMonthName(value){
  const [year,month]=String(value||'').split('-').map(Number);
  if(!Number.isInteger(year)||!Number.isInteger(month))return '–';
  return new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(new Date(year,month-1,1));
}
export function comparisonLabel(status){return status==='ok'?'Prognose trifft Abrechnung':status==='adjusted'?'Kernwerte stimmen · Nachverrechnung vorhanden':status==='different'?'Abweichung erkannt':'Bitte prüfen';}
export function wageCodeLabel(code,type=null){if(type==='holidayWithoutTimeOff')return 'Feiertagsarbeit ohne Freizeitausgleich';if(type==='holidayWithTimeOff')return 'Feiertagsarbeit mit Freizeitausgleich';return ({'5010':'Nachtarbeit','5011':'Nachtarbeit (Beginn vor 0:00)','5014':'Samstagsarbeit 13–20 Uhr','5026':'Sonntag und Nacht','5030':'Feiertagszuschlag (Prüfung erforderlich)','5034':'Samstagsarbeit 20–21 Uhr','5024':'Sonntagsarbeit','5161':'Durchschnitt §21 TV-L','5162':'Durchschnitt §21 TV-L Folge','5211':'Wechselschichtzulage','5212':'Schichtzulage','5706':'Eingesprungene Dienste','5016':'Ausgeglichene Überstunden','5372':'Mehrarbeit','5388':'Überstunden ohne Zeitzuschlag'})[code]||'Unbekannt';}
export function wageQuantityLabel(item){if(item?.hours==null)return 'Bitte prüfen';if(item.code==='5211'||item.code==='5212')return 'monatlich';if(item.code==='5706')return `${Number(item.hours).toFixed(0)} Dienste`;if(item.code==='5161'||item.code==='5162')return `${Number(item.hours).toFixed(2)} Tg.`;return `${Number(item.hours).toFixed(2)} h`;}
export function salaryDisplayPayout(forecast,learning=[]){
  return learnedPayoutForForecast(forecast,learning);
}

export function selectSavedSalaryForecast(forecasts=[]){
  const forecast=(Array.isArray(forecasts)?forecasts:[])
    .filter(item=>item&&typeof item==='object')
    .slice()
    .sort((a,b)=>String(a.payoutMonth||'').localeCompare(String(b.payoutMonth||'')))
    .at(-1)||null;
  return {forecast,report:restoreReportFromForecast(forecast)};
}

export function restoreReportFromForecast(forecast){
  if(!forecast?.payoutMonth||!Array.isArray(forecast.reportItems)||!forecast.reportItems.length)return null;
  const [year,month]=String(forecast.reportMonth||'').split('-').map(Number);
  if(!Number.isInteger(year)||!Number.isInteger(month))return null;
  // Promote previously unknown UKW codes from saved reports after a parser upgrade.
  const recovered=(forecast.unknownCodes||[]).map(item=>parseWageLine(item.line||'')).filter(Boolean);
  return {
    month:{year,month},
    payoutMonth:String(forecast.payoutMonth),
    items:[...forecast.reportItems.map(item=>({...item})),...recovered],
    unknownCodes:Array.isArray(forecast.unknownCodes)?forecast.unknownCodes.filter(item=>!recovered.some(found=>found.line===item.line&&found.code===item.code)).map(item=>({...item})):[],
    needsReview:Boolean(forecast.needsReview),
    conflict:forecast.conflict||null,
    springIn:forecast.springIn||{duties:0,hours:0}
  };
}

function reportMonthKey(report){return report?.month?`${report.month.year}-${String(report.month.month).padStart(2,'0')}`:null;}
function shiftLabel(type){return type==='wechsel'?'Wechselschichtzulage':type==='schicht'?'Schichtzulage':type==='conflict'?'Schichtzulage: Konflikt':'Keine Schicht-/Wechselschichtzulage';}
function set(id,value){if($(id))$(id).textContent=value;}

function renderTotalForPaymentMonth(paymentMonth,regularNet){
  const sequence=++payoutRenderSequence;
  const november=/^\d{4}-11$/.test(String(paymentMonth||''));
  const section=$('pNovemberBreakdown');
  if(section)section.classList.toggle('hidden',!november);
  set('pRegularPayout',eur(regularNet));
  if(!november){
    set('pPayoutLabel','Voraussichtliche Auszahlung');
    set('pPayoutDetailLabel','Voraussichtliche Auszahlung');
    set('pPayout',eur(regularNet));set('pPayoutDetail',eur(regularNet));
    return;
  }
  // Do not display the regular net as if it were the complete November transfer.
  set('pPayoutLabel','November gesamt inkl. Sonderzahlung');
  set('pPayoutDetailLabel','November-Gesamtauszahlung inkl. Sonderzahlung');
  set('pPayout','Wird berechnet …');set('pPayoutDetail','Wird berechnet …');
  set('pSpecialGross','Wird berechnet …');set('pSpecialNet','Wird berechnet …');
  set('pNovemberStatus','§20-TV-L-Sonderzahlung wird separat zum regulären Netto berechnet.');
  void calculateDisplayedMonthPayout({
    payoutMonth:paymentMonth,
    regularNet,
    forecasts:getSalaryForecasts(),
    payslips:getPayslips()
  }).then(result=>{
    if(sequence!==payoutRenderSequence)return;
    set('pSpecialGross',result.specialGross==null?'Noch nicht belegt':eur(result.specialGross));
    set('pSpecialNet',result.kind==='actual'?'In Ist-Auszahlung enthalten (nicht separat beziffert)':result.specialNet==null?'Netto derzeit offen':eur(result.specialNet));
    if(result.kind==='actual'){
      set('pPayoutLabel','Tatsächliche November-Auszahlung');
      set('pPayoutDetailLabel','Tatsächliche November-Auszahlung (inkl. Sonderzahlung)');
      set('pPayout',eur(result.totalNet));set('pPayoutDetail',eur(result.totalNet));
      set('pNovemberStatus','Bezügemitteilung hat Vorrang. Die Jahressonderzahlung wird nicht erneut hinzuaddiert.');
    }else if(result.totalNet!==null){
      set('pPayout',eur(result.totalNet));set('pPayoutDetail',eur(result.totalNet));
      set('pNovemberStatus',result.needsReview?'Gesamtnetto ist eine Prognose. Referenzmonate und steuerliche Behandlung bitte mit Bezügemitteilung abgleichen.':'Gesamtnetto ist eine Prognose aus regulärem Netto und Netto-Jahressonderzahlung.');
    }else{
      set('pPayout','Noch offen');set('pPayoutDetail','Noch offen');
      set('pNovemberStatus','Reguläres Netto ist bekannt. Die Jahressonderzahlung konnte netto noch nicht berechnet werden; deshalb keine unvollständige Gesamtsumme.');
    }
  }).catch(error=>{
    if(sequence!==payoutRenderSequence)return;
    console.error('[salary-november-total]',error);
    set('pPayout','Noch offen');set('pPayoutDetail','Noch offen');
    set('pNovemberStatus','Die Jahressonderzahlung konnte nicht geladen werden. Der reguläre Nettobetrag bleibt separat sichtbar.');
  });
}

export function serializeSalaryForecast(report,f,baseline=null,netEffects=null){
  const c=f.components;
  return {
    forecastModel:FORECAST_MODEL,
    payoutMonth:report.payoutMonth,
    regularPayoutMonth:report.payoutMonth,
    reportMonth:reportMonthKey(report),
    originMonth:reportMonthKey(report),
    paymentMonth:null,
    actualPaymentMonth:null,
    totalGross:f.totalGross,
    taxableGross:f.taxableGross,
    wageTax:f.wageTax,
    solidarity:f.solidarity,
    churchTax:f.churchTax,
    health:f.sv?.health??null,
    care:f.sv?.care??null,
    pension:f.sv?.pension??null,
    unemployment:f.sv?.unemployment??null,
    legalNet:f.legalNet,
    vbl:f.vbl,
    protectedPay:f.protectedPay,
    garnishableNet:f.garnishableNet,
    garnishment:f.garnishment,
    payout:f.payout,
    baselineGross:baseline?.totalGross??null,
    baselineLegalNet:baseline?.legalNet??null,
    baselinePayout:baseline?.payout??null,
    netEffects,
    reportItems:(report.items||[]).map(item=>({code:item.code,type:item.type||null,hours:item.hours??null,amount:item.amount??null,status:item.status||null,line:item.line||null})),
    unknownCodes:(report.unknownCodes||[]).map(item=>({code:item.code,line:item.line||null,status:item.status||'review'})),
    conflict:report.conflict||null,
    needsReview:Boolean(f.needsReview),
    springIn:c.springIn,
    components:{
      fixed:{basePay:SALARY_2026.fixed.basePay,careAllowance:SALARY_2026.fixed.careAllowance,universityAllowance:SALARY_2026.fixed.universityAllowance},
      hours:{...c.hours},
      night:c.pay.night,
      saturday:c.pay.saturday,
      saturdayEvening:c.pay.saturdayEvening,
      sunday:c.pay.sunday,
      holiday:c.pay.holiday,
      shift:c.pay.shift,
      springIn:c.pay.springIn,
      shiftType:c.shift,
      average21Days:c.average21Days,
      unpriced:c.unpriced,
      springInVblUnverified:Boolean(c.springInVblUnverified)
    }
  };
}

function storeForecast(report,f,baseline=null,netEffects=null){
  if(!report?.payoutMonth)return;
  const storageKey=payrollForecastStorageKey({reportMonth:reportMonthKey(report),payoutMonth:report.payoutMonth});
  const list=getSalaryForecasts().filter(item=>payrollForecastStorageKey(item)!==storageKey);
  list.push(serializeSalaryForecast(report,f,baseline,netEffects));
  list.sort((a,b)=>String(a.payoutMonth).localeCompare(String(b.payoutMonth)));
  if(!saveSalaryForecasts(list.slice(-18)))throw new Error('Gehaltsprognose konnte nicht dauerhaft gespeichert werden.');
}

export async function refreshStoredSalaryForecasts({
  forecasts=getSalaryForecasts(),
  calculator=calculateSalaryForecast,
  effectsCalculator=calculateNetEffects,
  persist=saveSalaryForecasts
}={}){
  const input=Array.isArray(forecasts)?forecasts:[];
  const next=[];
  let changed=false;
  for(const stored of input){
    if(Number(stored?.forecastModel)>=FORECAST_MODEL){next.push(stored);continue;}
    const report=restoreReportFromForecast(stored);
    if(!report){next.push(stored);continue;}
    try{
      const baseline=await calculator({items:[],unknownCodes:[],needsReview:false});
      const recalculated=await calculator(report);
      const netEffects=await effectsCalculator(report,baseline,recalculated);
      next.push(serializeSalaryForecast(report,recalculated,baseline,netEffects));
      changed=true;
    }catch(error){
      console.error('[salary-refresh-stored]',stored?.payoutMonth,error);
      next.push(stored);
    }
  }
  next.sort((a,b)=>String(a?.payoutMonth||'').localeCompare(String(b?.payoutMonth||'')));
  if(changed&&!persist(next.slice(-18)))throw new Error('Gespeicherte Gehaltsprognosen konnten nicht auf die aktuellen Rechenregeln aktualisiert werden.');
  return {changed,forecasts:next.slice(-18)};
}

function renderStoredForecast(forecast){
  if(!forecast)return;
  const c=forecast.components||{};
  const fixed=c.fixed||SALARY_2026.fixed;
  const hours=c.hours||{};
  const taxFree=Number(forecast.protectedPay)||0;
  const taxableExtra=Math.max(0,(Number(forecast.taxableGross)||SALARY_2026.fixed.gross)-SALARY_2026.fixed.gross);
  set('rMonth',salaryMonthName(forecast.reportMonth));set('rPayoutMonth',salaryMonthName(forecast.payoutMonth));
  set('pBasePay',eur(fixed.basePay));set('pCareAllowance',eur(fixed.careAllowance));set('pUniversityAllowance',eur(fixed.universityAllowance));
  set('pShiftAllowance',`${shiftLabel(c.shiftType)} · ${eur(c.shift||0)}`);
  set('pSpringIn',`${Number(forecast.springIn?.duties||0)} Dienste · ${eur(c.springIn||0)} (150 €/Dienst bestätigt · VBL offen)`);
  set('pNight',`${Number(hours.night||0).toFixed(2)} h · ${eur(c.night||0)}`);
  set('pSaturday',`${Number(hours.saturday||0).toFixed(2)} h · ${eur(c.saturday||0)}`);
  set('pSunday',`${Number(hours.sunday||0).toFixed(2)} h · ${eur(c.sunday||0)}`);
  set('pHoliday',`${Number(hours.holiday||0).toFixed(2)} h · ${eur(c.holiday||0)}`);
  set('pTaxableExtra',eur(taxableExtra));set('pTaxableGross',eur(forecast.taxableGross));set('pTaxFree',eur(taxFree));set('pBrutto',eur(forecast.totalGross));
  set('pTax',eur((forecast.wageTax||0)+(forecast.churchTax||0)+(forecast.solidarity||0)));
  set('pSocial',eur((forecast.health||0)+(forecast.care||0)+(forecast.pension||0)+(forecast.unemployment||0)));
  const learned=salaryDisplayPayout(forecast,getPayrollLearning());
  set('pVbl',eur(forecast.vbl));set('pGarnish',eur(forecast.garnishment));set('pLegalNet',eur(forecast.legalNet));renderTotalForPaymentMonth(forecast.payoutMonth,learned.payout);
  const open=Array.isArray(c.unpriced)?c.unpriced:[];
  set('pOpenItems',open.length?open.map(item=>`${item.label}: ${item.quantity}`).join(' · '):'Keine offenen, unberechneten Positionen.');
  const learningNote=learned.applied?` · Lernkalibrierung ${learned.adjustment>=0?'+':'−'}${eur(Math.abs(learned.adjustment))} aus ${learned.observations} sauberen Abrechnungen.`:'';
  set('pReview',(forecast.needsReview?'Prognose erstellt. Einzelne Angaben sind noch als „Bitte prüfen“ markiert.':'Prognose vollständig aus den erkannten Zeitlohnarten berechnet.')+learningNote);
}

function renderCalculatedForecast(report,f){
  const b=salaryForecastBreakdown(report);
  set('rMonth',salaryMonthName(b.reportMonth));set('rPayoutMonth',salaryMonthName(b.payoutMonth));
  set('pBasePay',eur(b.fixed.basePay));set('pCareAllowance',eur(b.fixed.careAllowance));set('pUniversityAllowance',eur(b.fixed.universityAllowance));
  set('pShiftAllowance',`${b.shiftAllowance.label} · ${eur(b.shiftAllowance.amount)}`);
  set('pSpringIn',`${f.components.springIn.duties} Dienste · ${eur(f.components.pay.springIn)} (150 €/Dienst bestätigt · VBL offen)`);
  const byKey=Object.fromEntries(b.timeSurcharges.map(item=>[item.key,item]));
  const line=key=>`${Number(byKey[key]?.hours||0).toFixed(2)} h · ${eur(byKey[key]?.amount||0)}`;
  set('pNight',line('night'));set('pSaturday',line('saturday'));set('pSunday',line('sunday'));set('pHoliday',line('holiday'));
  set('pTaxableExtra',eur(b.taxableAdditions));set('pTaxableGross',eur(f.taxableGross));set('pTaxFree',eur(f.taxFreePay));set('pBrutto',eur(f.totalGross));
  const learned=salaryDisplayPayout(f,getPayrollLearning());
  set('pTax',eur(f.wageTax+f.churchTax+f.solidarity));set('pSocial',eur(f.sv.health+f.sv.care+f.sv.pension+f.sv.unemployment));set('pVbl',eur(f.vbl));set('pGarnish',eur(f.garnishment));set('pLegalNet',eur(f.legalNet));renderTotalForPaymentMonth(report.payoutMonth,learned.payout);
  set('pOpenItems',b.unpriced.length?b.unpriced.map(item=>`${item.label}: ${Number(item.quantity||0).toFixed(2)}`).join(' · '):'Keine offenen, unberechneten Positionen.');
  const notes=[];
  if(learned.applied)notes.push(`Lernkalibrierung ${learned.adjustment>=0?'+':'−'}${eur(Math.abs(learned.adjustment))} aus ${learned.observations} sauberen Abrechnungen`);
  if(report.conflict)notes.push(report.conflict);
  if(report.unknownCodes?.length)notes.push(`${report.unknownCodes.length} unbekannte Lohnart(en)`);
  if(b.unpriced.length)notes.push('Einzelpositionen ohne bestätigten Zahlbetrag sind gesondert zu prüfen');
  set('pReview',notes.length?`Prognose erstellt · Bitte prüfen: ${notes.join(' · ')}`:'Prognose vollständig aus dem Zeitnachweis berechnet.');
}

export async function renderSalaryForecast(){
  if(!activeReport){renderStoredForecast(activeForecast);return;}
  try{
    const f=await calculateSalaryForecast(activeReport);activeForecast=f;renderCalculatedForecast(activeReport,f);
  }catch(error){
    console.error('[salary-forecast]',error);
    const saved=getSalaryForecasts().find(item=>item.payoutMonth===activeReport?.payoutMonth);
    if(saved)renderStoredForecast(saved);
    set('pReview','Netto-Berechnung konnte aktuell nicht neu geladen werden. Gespeicherte Werte bleiben erhalten.');
  }
}

function renderReportDetails(report){
  const details=$('reportDetails');if(!details)return;
  const rows=[...(report?.items||[]),...(report?.unknownCodes||[])];
  details.innerHTML=rows.length?rows.map(item=>`<div class="row wage-row"><span>${item.code} · ${wageCodeLabel(item.code,item.type)}</span><span class="v wage-unit">${wageQuantityLabel(item)}</span></div>`).join(''):'<div class="empty">Keine Zeitlohnarten erkannt.</div>';
}

export function renderForecastHistory(){
  try{renderPayrollControl();}
  catch(error){
    console.error('[payroll-control-render]',error);
    const status=$('payrollControlStatus');
    const wrap=$('payrollControlList');
    if(status)status.textContent='Kontrollkarten konnten nicht geladen werden. Die gespeicherten Detailprognosen bleiben verfügbar.';
    if(wrap)wrap.replaceChildren();
  }
}

async function importTimeReports(){
  const input=$('timeReportFiles'),status=$('timeReportStatus'),preview=$('timeReportPreview');
  const files=input?.files?Array.from(input.files):[];
  if(!files.length){notify('Bitte mindestens einen Zeitnachweis auswählen.',{type:'error'});return;}
  if(status)status.textContent='Zeitnachweis wird gelesen …';
  const results=[];
  for(const file of files){
    let stage='PDF-Leser';
    try{
      const read=await readPdfText(file);
      if(read.needsOcr){results.push({file:file.name,error:'Kein sicherer PDF-Text erkannt.'});continue;}
      stage='Zeitnachweis-Parser';
      const report=parseTimeReportText(read.text);
      if(!report.month){results.push({file:file.name,error:'Leistungsmonat konnte nicht sicher erkannt werden.'});continue;}
      stage='Gehaltsberechnung';
      const baseline=await calculateSalaryForecast({items:[],unknownCodes:[],needsReview:false});
      const forecast=await calculateSalaryForecast(report);
      const netEffects=await calculateNetEffects(report,baseline,forecast);
      stage='Speichern';
      storeForecast(report,forecast,baseline,netEffects);results.push({file:file.name,report,forecast});
    }catch(error){console.error('[time-report-import]',error);results.push({file:file.name,error:stage+': '+(error?.message||'PDF konnte nicht ausgewertet werden.')});}
  }
  const valid=results.filter(result=>result.report&&result.forecast),selected=valid.at(-1);
  if(selected){activeReport=selected.report;activeForecast=selected.forecast;renderCalculatedForecast(selected.report,selected.forecast);renderReportDetails(selected.report);}
  const hasReview=valid.some(result=>result.report.needsReview||result.forecast.needsReview),hasErrors=results.some(result=>result.error);
  if(status)status.textContent=!valid.length?'Kein Zeitnachweis konnte sicher ausgewertet werden.':hasErrors||hasReview?'Prognose erstellt – einzelne Angaben bitte prüfen.':'Zeitnachweis ausgewertet und Prognose gespeichert.';
  if(preview){preview.classList.remove('hidden');preview.innerHTML=results.map(result=>result.error?`<div class="note"><b>${result.file}</b> · ${result.error}</div>`:`<div class="forecast-card"><div class="forecast-head"><b>${salaryMonthName(reportMonthKey(result.report))} → ${salaryMonthName(result.report.payoutMonth)}</b><span class="forecast-amount">${eur(result.forecast.payout)}</span></div><div class="note">${shiftLabel(result.forecast.components.shift)} ${eur(result.forecast.components.pay.shift)} · steuerfreie Zuschläge ${eur(result.forecast.taxFreePay)}</div></div>`).join('');}
  try{
    await refreshPayrollChecks();
    renderForecastHistory();forecastChanged();
  }catch(error){
    console.error('[time-report-import-ui]',error);
    if(status)status.textContent='Zeitnachweis wurde gelesen, aber die Anzeige konnte nicht aktualisiert werden: '+(error?.message||'unbekannter Fehler');
    notify('Zeitnachweis wurde gespeichert; die Anzeige konnte nicht aktualisiert werden.',{type:'error'});
    return;
  }
  if(valid.length)notify('Gehaltsprognose wurde neu berechnet.',{type:'success'});
}

export async function initSalaryUi({onForecastChange}={}){
  forecastChanged=typeof onForecastChange==='function'?onForecastChange:()=>{};
  const initial=selectSavedSalaryForecast(getSalaryForecasts());
  activeForecast=initial.forecast;activeReport=initial.report;
  renderForecastHistory();
  if(activeForecast)renderStoredForecast(activeForecast);
  if(activeReport)renderReportDetails(activeReport);
  if($('timeReportBtn'))$('timeReportBtn').onclick=importTimeReports;
  initSalaryPayslipUi({onChange:forecastChanged});

  // Show persisted values immediately. Rebuilding older forecast models is a
  // best-effort background task and must never hold up or erase the detail view.
  void refreshStoredSalaryForecasts().then(({forecasts})=>{
    const restored=selectSavedSalaryForecast(forecasts);
    activeForecast=restored.forecast;activeReport=restored.report;
    if(activeForecast)renderStoredForecast(activeForecast);
    if(activeReport)renderReportDetails(activeReport);
    renderForecastHistory();forecastChanged();
  }).catch(error=>console.error('[salary-restore-refresh]',error));
}
