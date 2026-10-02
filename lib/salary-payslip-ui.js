import {getSalaryForecasts,saveSalaryForecasts,getPayslips,savePayslips,getPayrollLearning,savePayrollLearning} from './storage.js';
import {readPdfText} from './pdf.js';
import {parsePayslipDocument} from './payslip.js';
import {samePayrollMonth} from './payroll-month.js';
import {retroForForecast} from './payroll-control.js';
import {calculateOutstandingNetEffects} from './salary-net-effects.js';
import {renderPayrollControl} from './payroll-control-ui-v2.js';
import {buildPayrollLearningSnapshot,mergePayrollLearning} from './payroll-learning.js';
import {notify} from './ui.js';
const $=id=>document.getElementById(id);
let payslipChanged=()=>{};
const monthLabel=value=>{if(!value)return '–';const [year,month]=String(value).split('-').map(Number);return new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(new Date(year,month-1,1));};
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
  await refreshPayrollChecks();
  if(status){
    const months=imported.map(item=>monthLabel(item.month)).join(', '),retros=imported.reduce((sum,item)=>sum+(item.retroPeriods?.length||0),0);
    status.textContent=imported.length?`Eingelesen: ${months}${retros?` · ${retros} Rückrechnung(en) erkannt`:''}${errors.length?' · einzelne Dateien bitte prüfen':''}.`:'Keine Bezügemitteilung konnte sicher ausgewertet werden.';
  }
  if(imported.length){payslipChanged();notify('Bezügemitteilung wurde mit der Prognose gegengerechnet.',{type:'success'});}
  else notify(errors[0]||'Bezügemitteilung konnte nicht ausgewertet werden.',{type:'error'});
}
export function initSalaryPayslipUi({onChange}={}){
  payslipChanged=typeof onChange==='function'?onChange:()=>{};
  if($('payslipBtn'))$('payslipBtn').onclick=importPayslips;
  renderPayrollControl();void refreshPayrollChecks();
}
