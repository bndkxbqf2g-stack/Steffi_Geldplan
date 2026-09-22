import { getSalaryForecasts, saveSalaryForecasts, getPayslips, savePayslips } from './storage.js';
import { SALARY_2026 } from '../config/salary-2026.js';
import { calculateSalaryForecast, springInHourlyRate } from './salary.js';
import {notify} from './ui.js';

const $=id=>document.getElementById(id);
const eur=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number.isFinite(v)?v:0);
let activeReport=null;

export function salaryMonthLabel(value){if(!value)return '–';const p=String(value).split('-');return p.length===2?`${p[1]}/${p[0]}`:value;}
export function comparisonLabel(status){return status==='ok'?'Prognose trifft Abrechnung':status==='adjusted'?'Kernwerte stimmen · Nachverrechnung vorhanden':status==='different'?'Abweichung erkannt':'Bitte prüfen';}
export function wageCodeLabel(code){return ({'5010':'Nachtarbeit','5011':'Nachtarbeit (Beginn vor 0:00)','5014':'Samstagsarbeit','5024':'Sonntagsarbeit','5161':'Durchschnitt §21 TV-L','5162':'Durchschnitt §21 TV-L Folge','5211':'Wechselschichtzulage','5212':'Schichtzulage'})[code]||'Unbekannt';}
export function wageQuantityLabel(item){if(item.hours==null)return 'Bitte prüfen';if(item.code==='5211'||item.code==='5212')return 'monatlich';if(item.code==='5161'||item.code==='5162')return `${item.hours.toFixed(2)} Tg.`;return `${item.hours.toFixed(2)} h`;}

function storeForecast(report,f){
  if(!report?.payoutMonth)return;
  const list=getSalaryForecasts().filter(x=>x.payoutMonth!==report.payoutMonth);
  list.push({payoutMonth:report.payoutMonth,reportMonth:report.month?`${report.month.year}-${String(report.month.month).padStart(2,'0')}`:null,totalGross:f.totalGross,legalNet:f.legalNet,payout:f.payout,needsReview:f.needsReview,springIn:f.components.springIn});
  list.sort((a,b)=>String(a.payoutMonth).localeCompare(String(b.payoutMonth)));
  saveSalaryForecasts(list.slice(-18));
}
function storePayslip(actual){
  if(!actual?.month)return;
  const list=getPayslips().filter(x=>x.month!==actual.month);
  list.push(actual);list.sort((a,b)=>String(a.month).localeCompare(String(b.month)));
  savePayslips(list.slice(-18));
}
function renderPayslipComparison(actual,comparison){
  const wrap=$('payslipComparison'),status=$('payslipStatus');if(!wrap||!actual){if(wrap)wrap.innerHTML='';return;}
  if(status)status.textContent=`${salaryMonthLabel(actual.month)} · ${comparisonLabel(comparison?.status)}`;
  const rows=comparison?.rows||[];
  wrap.innerHTML=`<div class="forecast-card"><div class="forecast-head"><b>${salaryMonthLabel(actual.month)}</b><span class="forecast-amount">${eur(actual.payout||0)}</span></div>${rows.map(r=>{const d=r.note?r.note:(r.difference==null?'–':`${r.difference>0?'+':''}${eur(r.difference)}`);return `<div class="comparison-row"><span class="comparison-label">${r.label}</span><div class="comparison-values"><span>Prognose ${eur(r.predicted||0)}</span><span>Abrechnung ${eur(r.actual||0)}</span><strong>${d}</strong></div></div>`;}).join('')}${comparison?.hasPriorAdjustment?`<div class="note">Nachverrechnung aus Vormonaten: ${eur(comparison.priorAdjustment)}. Die Auszahlung wird deshalb nicht als Prognosefehler gewertet.</div>`:''}${comparison?.maxAbsDiff!=null?`<div class="note">Größte vergleichbare Abweichung: ${eur(comparison.maxAbsDiff)}</div>`:'<div class="note">Keine passende Prognose gefunden.</div>'}</div>`;
}
async function importPayslips(){
  const input=$('payslipFiles'),status=$('payslipStatus'),files=input?.files?Array.from(input.files):[];
  if(!files.length){notify('Bitte mindestens eine Bezügemitteilung auswählen.',{type:'error'});return;}
  status.textContent='Bezügemitteilung wird gelesen …';
  try{
    const pdf=await import('./pdf.js'),mod=await import('./payslip.js');let last=null,lastComparison=null;const forecasts=getSalaryForecasts();
    for(const file of files){const read=await pdf.readPdfText(file);if(read.needsOcr){status.textContent='Kein sicherer PDF-Text erkannt – bitte prüfen.';continue;}const actual=mod.parsePayslipText(read.text);storePayslip(actual);const forecast=forecasts.find(f=>f.payoutMonth===actual.month);last=actual;lastComparison=forecast?mod.comparePayslip(forecast,actual):{status:'review',rows:[],maxAbsDiff:null};}
    renderPayslipComparison(last,lastComparison);
  }catch(error){status.textContent='Bezügemitteilung konnte nicht ausgewertet werden.';notify(error.message||'Bezügemitteilung konnte nicht ausgewertet werden.',{type:'error'});}
}
export function renderForecastHistory(){
  const list=getSalaryForecasts(),wrap=$('forecastTableWrap'),chart=$('forecastChart');
  if(wrap)wrap.innerHTML=!list.length?'<div class="empty">Noch kein Zeitnachweis eingelesen.</div>':list.slice().reverse().map(f=>`<div class="forecast-card"><div class="forecast-head"><b>${salaryMonthLabel(f.payoutMonth)}</b><span class="forecast-amount">${eur(f.payout)}</span></div><div class="mini-grid two"><div class="mini"><div class="t">Brutto</div><div class="n">${eur(f.totalGross)}</div></div><div class="mini"><div class="t">Netto</div><div class="n">${eur(f.legalNet)}</div></div></div>${f.needsReview?'<div class="note">Bitte prüfen</div>':''}</div>`).join('');
  if(chart){if(!list.length){chart.innerHTML='<div class="empty">Noch keine Prognosen.</div>';return;}const max=Math.max(...list.map(f=>f.payout||0))||1;chart.innerHTML=list.slice(-8).map(f=>`<div class="forecast-chart-row"><span>${salaryMonthLabel(f.payoutMonth)}</span><div class="forecast-chart-track"><div class="forecast-chart-fill" style="width:${Math.max(3,Math.round((f.payout/max)*100))}%"></div></div><span class="forecast-chart-value">${eur(f.payout)}</span></div>`).join('');}
}
export async function renderSalaryForecast(){
  if($('pBasePay'))$('pBasePay').textContent=eur(SALARY_2026.fixed.basePay);if($('springInHourlyRate'))$('springInHourlyRate').textContent=eur(springInHourlyRate());if($('pCareAllowance'))$('pCareAllowance').textContent=eur(SALARY_2026.fixed.careAllowance);if($('pUniversityAllowance'))$('pUniversityAllowance').textContent=eur(SALARY_2026.fixed.universityAllowance);if(!activeReport)return;
  try{
    const f=await calculateSalaryForecast(activeReport),set=(id,v)=>{if($(id))$(id).textContent=v;};
    set('pBrutto',eur(f.totalGross));set('pNettoBasis',eur(f.legalNet));set('pLegalNet',eur(f.legalNet));set('pProtected',eur(f.protectedPay));set('pSurcharges',eur(f.protectedPay+f.components.taxableExtra));set('pPayout',eur(f.payout));set('pPayoutDetail',eur(f.payout));set('pVariableNet',eur(f.components.taxableExtra));set('pTaxFree',eur(f.taxFreePay));set('pSaturday',eur(f.components.pay.saturday));set('pSpringIn',eur(f.components.springIn.total));set('pTax',eur(f.wageTax+f.churchTax+f.solidarity));set('pSocial',eur(f.sv.health+f.sv.care+f.sv.pension+f.sv.unemployment));set('pVbl',eur(f.vbl));set('pShiftSummary',`${f.components.hours.night.toFixed(2)} h Nacht · ${f.components.hours.saturday.toFixed(2)} h Samstag · ${f.components.hours.sunday.toFixed(2)} h Sonntag · ${f.components.shift==='wechsel'?'Wechselschicht':f.components.shift==='schicht'?'Schicht':'keine Schichtzulage'}${f.components.springIn.total?` · Einspringen ${eur(f.components.springIn.total)}`:''}${f.needsReview?' · Bitte prüfen':''}`);
  }catch(error){if($('timeReportStatus'))$('timeReportStatus').textContent='Netto-Berechnung konnte nicht geladen werden.';console.error('[salary]',error);}
}
async function importTimeReports(){
  const input=$('timeReportFiles'),status=$('timeReportStatus'),preview=$('timeReportPreview'),details=$('reportDetails'),files=input?.files?Array.from(input.files):[];
  if(!files.length){notify('Bitte mindestens einen Zeitnachweis auswählen.',{type:'error'});return;}status.textContent='PDF wird gelesen …';
  try{
    const pdf=await import('./pdf.js'),reports=[];
    for(const file of files){const read=await pdf.readPdfText(file);reports.push(read.needsOcr?{file:file.name,ocr:true}:{file:file.name,report:pdf.parseTimeReportText(read.text)});}
    status.textContent=reports.some(r=>r.ocr||r.report?.needsReview)?'Eingelesen – bitte markierte Angaben prüfen.':'Zeitnachweis erfolgreich eingelesen.';
    const first=reports.find(r=>r.report);activeReport=first?first.report:null;
    if(activeReport){if($('rMonth')&&activeReport.month)$('rMonth').textContent=`${String(activeReport.month.month).padStart(2,'0')}/${activeReport.month.year}`;if($('rPayoutMonth'))$('rPayoutMonth').textContent=activeReport.payoutMonth||'–';await renderSalaryForecast();try{const f=await calculateSalaryForecast(activeReport);storeForecast(activeReport,f);renderForecastHistory();}catch(error){console.error('[salary-history]',error);}}
    if(preview){preview.classList.remove('hidden');preview.innerHTML=reports.map(r=>r.ocr?`<div class="note"><b>${r.file}</b>: Kein sicherer PDF-Text erkannt – OCR/Prüfung erforderlich.</div>`:`<div class="row"><span>${r.file} · ${r.report.month?`${String(r.report.month.month).padStart(2,'0')}/${r.report.month.year}`:'Monat unbekannt'}</span><span class="v">${r.report.needsReview?'Bitte prüfen':'OK'}</span></div>`).join('');}
    if(details)details.innerHTML=reports.flatMap(r=>r.report?r.report.items.concat(r.report.unknownCodes):[]).map(i=>`<div class="row wage-row"><span>${i.code} · ${wageCodeLabel(i.code)}</span><span class="v wage-unit">${wageQuantityLabel(i)}</span></div>`).join('')||'<div class="empty">Keine Zeitlohnarten erkannt.</div>';
  }catch(error){status.textContent='PDF konnte nicht ausgewertet werden.';notify(error.message||'PDF konnte nicht ausgewertet werden.',{type:'error'});}
}

async function applySpringIn(){
  if(!activeReport){notify('Bitte zuerst einen Zeitnachweis auswählen.',{type:'error'});return;}
  const duties=Math.max(0,Math.floor(Number($('springInDuties')?.value)||0));
  const hours=Math.max(0,Number($('springInHours')?.value)||0);
  activeReport={...activeReport,springIn:{duties,hours}};
  await renderSalaryForecast();
  try{const f=await calculateSalaryForecast(activeReport);storeForecast(activeReport,f);renderForecastHistory();}catch(error){console.error('[spring-in]',error);}
  if($('springInStatus'))$('springInStatus').textContent=(!duties&&!hours)?'Keine Einspringprämie angesetzt.':`${duties} Einspringdienst(e), ${hours.toFixed(2)} h übernommen.`;
}

export function initSalaryUi(){
  renderSalaryForecast();renderForecastHistory();
  if($('timeReportBtn'))$('timeReportBtn').onclick=importTimeReports;
  if($('payslipBtn'))$('payslipBtn').onclick=importPayslips;
  if($('springInBtn'))$('springInBtn').onclick=applySpringIn;
}
