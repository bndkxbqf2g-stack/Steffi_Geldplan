import {getSalaryForecasts,saveSalaryForecasts,getPayslips,savePayslips,getPayrollLearning,savePayrollLearning,getPendingSalary,getTransactions,savePendingSalary,clearPendingSalary} from './storage.js';
import {readPdfText} from './pdf.js';
import {parsePayslipDocument} from './payslip.js';
import {samePayrollMonth} from './payroll-month.js';
import {plannedPaydayForDate,dateOnly} from './cycle.js';
import {createPendingSalary} from './pending-salary.js';
import {retroForForecast} from './payroll-control.js';
import {payrollForecastActualPaymentMonth} from './payroll-monthly-control.js';
import {calculateOutstandingNetEffects} from './salary-net-effects.js?v=0.99.71';
import {renderPayrollControl} from './payroll-control-ui-v2.js';
import {buildPayrollLearningSnapshot,mergePayrollLearning} from './payroll-learning.js';
import {notify} from './ui.js';
const $=id=>document.getElementById(id);
let payslipChanged=()=>{};
let pendingSalaryChanged=()=>{};
const monthLabel=value=>{if(!value)return '–';const [year,month]=String(value).split('-').map(Number);return new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(new Date(year,month-1,1));};
const dayKey=value=>{const d=dateOnly(value);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const moneyLabel=value=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(value));
const dateLabel=value=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(String(value)+'T00:00:00'));
export function pendingSalaryFromPayslip(actual,{existing=null,transactions=[],today=new Date()}={}){
  const month=String(actual?.month||''),match=month.match(/^(20\d{2})-(0[1-9]|1[0-2])$/);
  const amount=Number(actual?.payout);
  if(!match||actual?.payout==null||!Number.isFinite(amount)||amount<=0)return {status:'unavailable',month};
  const payoutDate=dayKey(plannedPaydayForDate(new Date(Number(match[1]),Number(match[2])-1,1)));
  if(payoutDate<dayKey(today))return {status:'past',payoutDate,month};
  if((Array.isArray(transactions)?transactions:[]).some(item=>item?.type==='salary'&&String(item?.date||'').slice(0,7)===month)){
    return {status:'already-booked',payoutDate,month,clearExisting:existing?.payoutDate===payoutDate};
  }
  if(existing&&existing.payoutDate!==payoutDate)return {status:'conflict',payoutDate,month,existingPayoutDate:existing.payoutDate};
  const pending=createPendingSalary({
    id:existing?.id||'payslip-'+month,
    amount,
    text:'Lohn laut Bezügemitteilung '+monthLabel(month),
    createdAt:today,
    payoutDate
  });
  return pending?{status:'scheduled',pending,payoutDate,month}:{status:'unavailable',payoutDate,month};
}
export function autoScheduleImportedPayslips(actuals,{pending=getPendingSalary(),transactions=getTransactions(),today=new Date(),save=savePendingSalary,clear=clearPendingSalary}={}){
  const outcomes=(Array.isArray(actuals)?actuals:[]).map(actual=>pendingSalaryFromPayslip(actual,{existing:pending,transactions,today}));
  const scheduled=outcomes.filter(item=>item.status==='scheduled').sort((a,b)=>a.payoutDate.localeCompare(b.payoutDate))[0];
  if(scheduled)return save(scheduled.pending)?{...scheduled,changed:true}:{...scheduled,status:'save-failed'};
  const stale=outcomes.find(item=>item.status==='already-booked'&&item.clearExisting);
  if(stale)return clear()?{...stale,changed:true}:{...stale,status:'clear-failed'};
  return outcomes.find(item=>item.status==='conflict')||outcomes.find(item=>item.status==='already-booked')||outcomes.find(item=>item.status==='past')||{status:'unavailable'};
}
function storePayslip(actual){
  if(!actual?.month)return;
  const list=getPayslips().filter(item=>!samePayrollMonth(item?.month,actual.month));
  list.push(actual);list.sort((a,b)=>String(a.month).localeCompare(String(b.month)));
  if(!savePayslips(list.slice(-18)))throw new Error('Bezügemitteilung konnte nicht dauerhaft gespeichert werden.');
}
export function buildUpdatedPayrollLearning(forecasts=[],payslips=[],history=[]){
  let next=Array.isArray(history)?history:[];
  for(const forecast of Array.isArray(forecasts)?forecasts:[]){
    const actual=(Array.isArray(payslips)?payslips:[]).find(item=>samePayrollMonth(item?.month,forecast?.payoutMonth));
    if(!actual)continue;
    const snapshot=buildPayrollLearningSnapshot({forecast,actual,payslips});
    if(!snapshot)continue;
    const previous=next.find(item=>item?.id===snapshot.id);
    if(previous){
      const {createdAt:_old,...oldData}=previous;
      const {createdAt:_new,...newData}=snapshot;
      if(JSON.stringify(oldData)===JSON.stringify(newData))continue;
    }
    next=mergePayrollLearning(next,snapshot);
  }
  return next;
}
function refreshPayrollLearning(){
  const current=getPayrollLearning();
  const next=buildUpdatedPayrollLearning(getSalaryForecasts(),getPayslips(),current);
  if(JSON.stringify(next)!==JSON.stringify(current)&&!savePayrollLearning(next))throw new Error('Payroll-Lernhistorie konnte nicht dauerhaft gespeichert werden.');
  return next;
}
export async function refreshPayrollChecks(){
  const forecasts=getSalaryForecasts(),payslips=getPayslips();let changed=false;
  for(const forecast of forecasts){
    const actualPaymentMonth=payrollForecastActualPaymentMonth(forecast,payslips);
    if(actualPaymentMonth&&forecast.actualPaymentMonth!==actualPaymentMonth){
      forecast.actualPaymentMonth=actualPaymentMonth;
      changed=true;
    }
    const actual=payslips.find(item=>samePayrollMonth(item?.month,forecast?.payoutMonth));
    if(!actual)continue;
    try{
      const effects=await calculateOutstandingNetEffects(forecast,actual,retroForForecast(payslips,forecast));
      if(JSON.stringify(forecast.actualNetEffects)!==JSON.stringify(effects)||forecast.actualNetEffectsVersion!==6){
        forecast.actualNetEffects=effects||null;forecast.actualNetEffectsVersion=6;changed=true;
      }
    }catch(error){console.error('[salary-payslip-effects]',forecast?.payoutMonth,error);}
  }
  if(changed&&!saveSalaryForecasts(forecasts))throw new Error('Gehaltsprognose konnte nach dem Abgleich nicht gespeichert werden.');
  refreshPayrollLearning();
  renderPayrollControl();
}
export async function importPayslips(){
  const input=$('payslipFiles'),status=$('payslipStatus'),files=input?.files?Array.from(input.files):[];
  if(!files.length){notify('Bitte mindestens eine Bezügemitteilung auswählen.',{type:'error'});return;}
  if(status)status.textContent='Bezügemitteilung wird gelesen …';
  const imported=[],errors=[];
  for(const file of files){
    try{
      const read=await readPdfText(file);
      if(read.needsOcr){errors.push(file.name+': kein sicherer PDF-Text');continue;}
      const actual=parsePayslipDocument(read.text);
      if(!actual.month){errors.push(file.name+': Abrechnungsmonat nicht erkannt');continue;}
      storePayslip(actual);imported.push(actual);
    }catch(error){errors.push(file.name+': '+(error?.message||'nicht auswertbar'));}
  }
  const pendingResult=imported.length?autoScheduleImportedPayslips(imported):null;
  if(pendingResult?.changed)pendingSalaryChanged();
  await refreshPayrollChecks();
  if(status){
    const months=imported.map(item=>monthLabel(item.month)).join(', '),retros=imported.reduce((sum,item)=>sum+(item.retroPeriods?.length||0),0);
    const pendingMessage=pendingResult?.status==='scheduled'?` · Lohn ${moneyLabel(pendingResult.pending.amount)} für ${dateLabel(pendingResult.payoutDate)} vorgemerkt`:pendingResult?.status==='conflict'?` · Nicht vorgemerkt: Eine andere Vormerkung für ${dateLabel(pendingResult.existingPayoutDate)} besteht bereits`:pendingResult?.status==='already-booked'?` · Lohn für ${monthLabel(pendingResult.month)} ist bereits gebucht; keine zweite Vormerkung angelegt`:pendingResult?.status==='past'?` · Keine Vormerkung angelegt: Auszahlungstag ${dateLabel(pendingResult.payoutDate)} liegt bereits zurück`:pendingResult?.status==='save-failed'?` · Bezügemitteilung ist gespeichert, aber die Lohnvormerkung konnte nicht gespeichert werden`:pendingResult?.status==='clear-failed'?` · Bereits gebuchter Lohn erkannt; veraltete Vormerkung konnte nicht entfernt werden`:pendingResult?.status==='unavailable'&&imported.length?' · Überweisungsbetrag oder Abrechnungsmonat nicht sicher erkannt; keine Vormerkung angelegt':'';
    status.textContent=imported.length?`Eingelesen: ${months}${retros?` · ${retros} Rückrechnung(en) erkannt`:''}${errors.length?' · einzelne Dateien bitte prüfen':''}.${pendingMessage}`:'Keine Bezügemitteilung konnte sicher ausgewertet werden.';
  }
  if(imported.length){payslipChanged();notify(pendingResult?.status==='scheduled'?`Bezügemitteilung abgeglichen; Lohn ${moneyLabel(pendingResult.pending.amount)} für ${dateLabel(pendingResult.payoutDate)} vorgemerkt.`:'Bezügemitteilung wurde mit der Prognose gegengerechnet.',{type:'success'});}
  else notify(errors[0]||'Bezügemitteilung konnte nicht ausgewertet werden.',{type:'error'});
}
export function initSalaryPayslipUi({onChange,onPendingSalaryChange}={}){
  payslipChanged=typeof onChange==='function'?onChange:()=>{};
  pendingSalaryChanged=typeof onPendingSalaryChange==='function'?onPendingSalaryChange:()=>{};
  if($('payslipBtn'))$('payslipBtn').onclick=importPayslips;
  renderPayrollControl();void refreshPayrollChecks();
}
