import {samePayrollMonth} from './payroll-month.js';

const money=value=>Math.round((Number(value)||0)*100)/100;
const finite=value=>Number.isFinite(Number(value));
const amount=value=>finite(value)?money(value):null;
const sum=values=>money((values||[]).reduce((total,value)=>total+(Number(value)||0),0));
const MONTH_RE=/^\d{4}-\d{2}$/;

export function normalizePayrollMonth(value){
  const raw=String(value||'').trim();
  if(MONTH_RE.test(raw))return raw;
  const match=raw.match(/^(0?[1-9]|1[0-2])\/(20\d{2})$/);
  return match?String(match[2])+'-'+String(match[1]).padStart(2,'0'):null;
}

function forecastRegularPayoutMonth(forecast={}){
  return normalizePayrollMonth(forecast.regularPayoutMonth||forecast.payoutMonth);
}

function forecastOriginMonth(forecast={}){
  return normalizePayrollMonth(forecast.originMonth||forecast.reportMonth);
}

function fixedTotal(forecast={}){
  const fixed=forecast.components?.fixed||{};
  const values=[fixed.basePay,fixed.careAllowance,fixed.universityAllowance];
  if(values.some(finite))return sum(values);
  if(finite(forecast.baselineGross))return amount(forecast.baselineGross);
  return null;
}

const VARIABLE_DEFINITIONS=[
  ['night','Nachtzuschläge','steuerfrei'],
  ['saturday','Samstagszuschläge','steuerpflichtig'],
  ['saturdayEvening','Samstagszuschläge 20–21 Uhr','steuerpflichtig'],
  ['sunday','Sonntagszuschläge','steuerfrei'],
  ['holiday','Feiertagszuschläge','steuerfrei'],
  ['shift','Schicht-/Wechselschichtzulage','steuerpflichtig'],
  ['springIn','Einspringprämie','unsicher']
];

function forecastVariableRows(forecast={}){
  const components=forecast.components||{};
  const shiftLabel=components.shiftType==='wechsel'?'Wechselschichtzulage':components.shiftType==='schicht'?'Schichtzulage':'Schicht-/Wechselschichtzulage';
  return VARIABLE_DEFINITIONS.map(([key,label,tax])=>{
    const value=amount(components[key]);
    if(value==null||value<=0.005)return null;
    return {key,label:key==='shift'?shiftLabel:label,expected:value,tax};
  }).filter(Boolean);
}

function reviewRows(forecast={}){
  const components=forecast.components||{};
  const rows=Array.isArray(components.unpriced)?components.unpriced:[];
  const result=[];
  const seen=new Set();
  for(const row of rows){
    const key=[row?.code,row?.label,row?.reason].join('|');
    if(seen.has(key))continue;
    seen.add(key);
    result.push({
      code:row?.code||null,
      label:row?.label||'Unklare Position',
      quantity:row?.quantity??null,
      reason:row?.reason||'Betrag ist nicht sicher automatisch berechenbar',
      status:'UNSICHER/PRÜFEN'
    });
  }
  if(components.springInVblUnverified){
    result.push({
      code:'springInVbl',
      label:'Einspringprämie / VBL',
      quantity:amount(components.springIn)||null,
      reason:'VBL-Pflicht ist noch nicht durch eine Abrechnung verifiziert',
      status:'UNSICHER/PRÜFEN'
    });
  }
  return result;
}

function retroMatchesForecast(retro,forecast={}){
  const candidates=[forecastOriginMonth(forecast),forecastRegularPayoutMonth(forecast)].filter(Boolean);
  return candidates.some(candidate=>samePayrollMonth(retro?.month,candidate));
}

function retroKey(payslip,retro){
  return [
    normalizePayrollMonth(retro?.month),
    amount(retro?.totalGross),
    JSON.stringify(retro?.components||{})
  ].join('|');
}

function matchingRetros(forecast,payslips=[]){
  const result=[],seen=new Set();
  for(const payslip of Array.isArray(payslips)?payslips:[]){
    for(const retro of Array.isArray(payslip?.retroPeriods)?payslip.retroPeriods:[]){
      if(!retroMatchesForecast(retro,forecast))continue;
      const key=retroKey(payslip,retro);
      if(seen.has(key))continue;
      seen.add(key);
      result.push({...retro,paidWithMonth:normalizePayrollMonth(payslip.month),source:'Bezügemitteilung'});
    }
  }
  return result.sort((a,b)=>String(a.paidWithMonth).localeCompare(String(b.paidWithMonth)));
}

function inferredPaymentMonth(forecast,payslips=[]){
  const explicit=normalizePayrollMonth(forecast.actualPaymentMonth||forecast.paymentMonth||forecast.paymentMonthOverride);
  if(explicit)return explicit;
  const regular=forecastRegularPayoutMonth(forecast);
  const direct=(payslips||[]).find(item=>samePayrollMonth(item?.month,regular));
  if(direct)return regular;
  const retro=matchingRetros(forecast,payslips).at(-1);
  return retro?.paidWithMonth||regular;
}

function componentValue(source,key){
  const value=source?.components?.[key];
  return finite(value)?money(value):null;
}

function addComponentTotals(target,source){
  for(const [key] of VARIABLE_DEFINITIONS){
    const value=componentValue(source,key);
    if(value!=null)target[key]=money((target[key]||0)+value);
  }
}

function hasComponentDetail(source={}){
  return Boolean(source?.components?.hasVariableDetail)||
    VARIABLE_DEFINITIONS.some(([key])=>componentValue(source,key)!=null);
}

function distinctMonths(values){
  return [...new Set((values||[]).map(normalizePayrollMonth).filter(Boolean))].sort();
}

function netProjection(forecasts){
  const first=forecasts.find(forecast=>finite(forecast?.baselinePayout));
  if(!first)return {expected:null,base:null,effect:null,status:'offen'};
  const base=amount(first.baselinePayout);
  const effects=forecasts.map(forecast=>{
    if(!finite(forecast?.payout)||!finite(forecast?.baselinePayout))return null;
    return money(Number(forecast.payout)-Number(forecast.baselinePayout));
  });
  if(effects.some(value=>value==null))return {expected:null,base,status:'offen',effect:null};
  return {expected:money(base+sum(effects)),base,effect:sum(effects),status:'prognostiziert'};
}

function groupKey(month){return normalizePayrollMonth(month)||'unknown';}

function buildMonthControl(paymentMonth,forecasts,payslips){
  const actual=(payslips||[]).find(item=>samePayrollMonth(item?.month,paymentMonth))||null;
  const regularPayoutMonths=distinctMonths(forecasts.map(forecastRegularPayoutMonth));
  const originMonths=distinctMonths(forecasts.map(forecastOriginMonth));
  const fixed=fixedTotal(forecasts[0]);
  const expectedRows=new Map();
  const uncertain=[];
  let fallbackGross=0;
  let fallbackGrossUsable=true;
  for(const forecast of forecasts){
    for(const row of forecastVariableRows(forecast)){
      const prior=expectedRows.get(row.key);
      expectedRows.set(row.key,prior?{...prior,expected:money(prior.expected+row.expected),label:row.label,tax:row.tax}:row);
    }
    uncertain.push(...reviewRows(forecast));
    if(finite(forecast.totalGross)){
      const rowTotal=sum(forecastVariableRows(forecast).map(row=>row.expected));
      const forecastFixed=fixedTotal(forecast);
      if(forecastFixed!=null)fallbackGross+=Math.max(0,Number(forecast.totalGross)-forecastFixed);
      else fallbackGross+=rowTotal;
      if(forecastFixed==null&&rowTotal<=0.005)fallbackGrossUsable=false;
    }
  }
  const rows=[...expectedRows.values()];
  const expectedVariable=sum(rows.map(row=>row.expected));
  const expectedGross=fixed!=null?money(fixed+expectedVariable):(fallbackGrossUsable?money(fallbackGross):null);
  const expectedTaxFree=sum(rows.filter(row=>row.tax==='steuerfrei').map(row=>row.expected));
  const expectedTaxable=sum(rows.filter(row=>row.tax==='steuerpflichtig').map(row=>row.expected));
  const retro=forecasts.flatMap(forecast=>matchingRetros(forecast,payslips));
  const uniqueRetro=[];
  const seenRetro=new Set();
  for(const item of retro){
    const key=[item.paidWithMonth,item.month,item.totalGross,JSON.stringify(item.components||{})].join('|');
    if(seenRetro.has(key))continue;
    seenRetro.add(key);uniqueRetro.push(item);
  }
  const considered={};
  let currentDetail=false;
  if(actual&&hasComponentDetail(actual)){
    currentDetail=true;
    addComponentTotals(considered,actual);
  }
  for(const item of uniqueRetro)addComponentTotals(considered,item);
  const currentGross=amount(actual?.totalGross);
  const retroGross=sum(uniqueRetro.map(item=>item.totalGross));
  const actualGross=currentGross==null?null:money(currentGross+retroGross);
  const inferredMissing=Boolean(
    actual&&fixed!=null&&currentGross!=null&&
    Math.abs(currentGross-fixed)<=1&&expectedVariable>0.005&&
    !currentDetail
  );
  const hasAnyConsidered=Object.keys(considered).length>0||inferredMissing;
  const consideredRows=rows.map(row=>{
    const value=hasAnyConsidered?(considered[row.key]??(inferredMissing?0:null)):null;
    const open=value==null?null:money(Math.max(0,row.expected-value));
    return {...row,considered:value,open};
  });
  const consideredTaxFree=sum(consideredRows.filter(row=>row.tax==='steuerfrei'&&row.considered!=null).map(row=>row.considered));
  const consideredTaxable=sum(consideredRows.filter(row=>row.tax==='steuerpflichtig'&&row.considered!=null).map(row=>row.considered));
  const openTaxFree=consideredRows.some(row=>row.tax==='steuerfrei'&&row.open==null)?null:money(expectedTaxFree-consideredTaxFree);
  const openTaxable=consideredRows.some(row=>row.tax==='steuerpflichtig'&&row.open==null)?null:money(expectedTaxable-consideredTaxable);
  const actualVariableGross=actualGross!=null&&fixed!=null?money(Math.max(0,actualGross-fixed)):null;
  const openGross=expectedGross!=null&&actualGross!=null?money(Math.max(0,expectedGross-actualGross)):null;
  const projection=netProjection(forecasts);
  const actualPayout=amount(actual?.payout);
  const estimatedOpenNet=actualPayout!=null&&projection.expected!=null&&openGross!=null&&openGross>0.005
    ?money(Math.max(0,projection.expected-actualPayout))
    :null;
  const totalNet=actualPayout!=null
    ?money(actualPayout+(estimatedOpenNet||0))
    :projection.expected;
  const hasOpen=Boolean(openGross!=null&&openGross>1)||consideredRows.some(row=>row.open!=null&&row.open>0.005);
  const unknownOpen=consideredRows.some(row=>row.open==null);
  let status='waiting';
  if(actual){
    if(actual.needsReview||unknownOpen)status='review';
    else if(hasOpen&&uniqueRetro.length)status='partial';
    else if(hasOpen)status='open';
    else if(uniqueRetro.length)status='settled';
    else status='ok';
  }
  const hints=[...new Set(uncertain.map(row=>row.status+': '+row.label+(row.reason?' · '+row.reason:'')))];
  if(!actual)hints.unshift('Abrechnung ausstehend · tatsächliche Auszahlung wird erst mit Bezügemitteilung angezeigt');
  if(uniqueRetro.length)hints.push(...uniqueRetro.map(item=>'Rückrechnung '+item.month+' wurde der ursprünglichen Leistung zugeordnet und nur einmal berücksichtigt'));
  return {
    paymentMonth,
    actualPaymentMonth:actual?normalizePayrollMonth(actual.month):null,
    regularPayoutMonth:regularPayoutMonths.length===1?regularPayoutMonths[0]:null,
    regularPayoutMonths,
    originMonths,
    status,
    statusLabel:status==='waiting'?'Abrechnung ausstehend':status==='review'?'Bitte prüfen':status==='partial'?'Teilweise nachgezahlt':status==='open'?'Offen':status==='settled'?'Erledigt':'Stimmig',
    expectedGross,
    actualGross,
    actualPayout,
    fixedMonthlyGross:fixed,
    expectedVariable,
    expectedTaxFree,
    expectedTaxable,
    consideredVariable:actualVariableGross,
    consideredTaxFree,
    consideredTaxable,
    openGross,
    openTaxFree,
    openTaxable,
    gross:{expected:expectedGross,considered:actualGross,open:openGross},
    totalSurcharges:{expected:expectedVariable,considered:actualVariableGross,open:openGross},
    taxFree:{expected:expectedTaxFree,considered:consideredTaxFree,open:openTaxFree},
    taxable:{expected:expectedTaxable,considered:consideredTaxable,open:openTaxable},
    netEffect:{
      expected:projection.effect,
      actual:actualPayout!=null&&projection.base!=null?money(actualPayout-projection.base):null,
      open:estimatedOpenNet,
      status:actualPayout!=null&&estimatedOpenNet!=null?'berechnet':projection.effect!=null?'prognostiziert':'offen'
    },
    expectedNet:projection.expected,
    totalNet,
    netEffectStatus:actualPayout!=null&&estimatedOpenNet!=null?'berechnet':projection.expected!=null?'prognostiziert':'offen',
    forecasts:forecasts.map(forecast=>({
      originMonth:forecastOriginMonth(forecast),
      reportMonth:forecastOriginMonth(forecast),
      regularPayoutMonth:forecastRegularPayoutMonth(forecast),
      paymentMonth,
      source:'Zeitnachweis / Prognose',
      expectedGross:amount(forecast.totalGross),
      expectedSurcharges:sum(forecastVariableRows(forecast).map(row=>row.expected)),
      expectedTaxFree:sum(forecastVariableRows(forecast).filter(row=>row.tax==='steuerfrei').map(row=>row.expected)),
      expectedTaxable:sum(forecastVariableRows(forecast).filter(row=>row.tax==='steuerpflichtig').map(row=>row.expected)),
      paymentSource:actual?'Bezügemitteilung '+normalizePayrollMonth(actual.month):'ausstehend'
    })),
    actualPayslip:actual?{
      month:normalizePayrollMonth(actual.month),
      source:'Bezügemitteilung',
      totalGross:actualGross,
      currentGross,
      retroGross,
      payout:actualPayout,
      priorAdjustment:amount(actual.priorAdjustment)||0
    }:null,
    retro:uniqueRetro,
    reviewRows:uncertain,
    hints,
    inferredMissingVariablePay:inferredMissing,
    needsReview:Boolean(status==='review'),
    hasActualPayslip:Boolean(actual)
  };
}

export function buildPayrollMonthlyControls({forecasts=[],payslips=[],limit=3}={}){
  const sourceForecasts=Array.isArray(forecasts)?forecasts.filter(item=>item&&typeof item==='object'):[];
  const sourcePayslips=Array.isArray(payslips)?payslips.filter(item=>item&&typeof item==='object'):[];
  const groups=new Map();
  for(const forecast of sourceForecasts){
    const paymentMonth=inferredPaymentMonth(forecast,sourcePayslips);
    const key=groupKey(paymentMonth);
    if(!groups.has(key))groups.set(key,{paymentMonth,forecasts:[],payslips:sourcePayslips});
    groups.get(key).forecasts.push(forecast);
  }
  for(const payslip of sourcePayslips){
    const paymentMonth=normalizePayrollMonth(payslip.month);
    const key=groupKey(paymentMonth);
    if(!groups.has(key))groups.set(key,{paymentMonth,forecasts:[],payslips:sourcePayslips});
  }
  return [...groups.values()]
    .filter(group=>group.paymentMonth)
    .map(group=>buildMonthControl(group.paymentMonth,group.forecasts,sourcePayslips))
    .sort((a,b)=>String(b.paymentMonth).localeCompare(String(a.paymentMonth)))
    .slice(0,Math.max(0,Number(limit)||0));
}

export function payrollMonthlyStatusLabel(status){
  return ({waiting:'Abrechnung ausstehend',ok:'Stimmig',open:'Offen',partial:'Teilweise nachgezahlt',settled:'Erledigt',review:'Bitte prüfen'})[status]||'Bitte prüfen';
}

export function payrollForecastStorageKey(forecast={}){
  return [forecastOriginMonth(forecast),forecastRegularPayoutMonth(forecast)].filter(Boolean).join(':');
}
