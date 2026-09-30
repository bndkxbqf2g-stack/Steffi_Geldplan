import {samePayrollMonth} from './payroll-month.js';

const money=v=>Math.round((Number(v)||0)*100)/100;

function amount(value){return Number.isFinite(Number(value))?money(Number(value)):null;}
function sum(values){return money(values.reduce((s,v)=>s+(Number(v)||0),0));}
function aggregateReviewRows(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const key=[row?.code||'',row?.label||'',row?.reason||''].join('|');
    const previous=map.get(key);
    if(previous){
      previous.quantity=money((Number(previous.quantity)||0)+(Number(row?.quantity)||0));
      continue;
    }
    map.set(key,{...row,quantity:Number.isFinite(Number(row?.quantity))?money(row.quantity):row?.quantity});
  }
  return [...map.values()];
}
function monthLabel(value){
  if(!value)return '–';
  const [y,m]=String(value).split('-').map(Number);
  return new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));
}

export function forecastComponents(forecast={}){
  const c=forecast.components||{};
  const reportItems=Array.isArray(forecast.reportItems)?forecast.reportItems:[];
  const has=(code)=>reportItems.some(item=>item.code===code);
  const shiftType=has('5211')?'wechsel':has('5212')?'schicht':c.shiftType||'none';
  const fixed=c.fixed||{};
  return {
    basePay:amount(fixed.basePay),
    careAllowance:amount(fixed.careAllowance),
    universityAllowance:amount(fixed.universityAllowance),
    night:amount(c.night)||0,
    saturday:amount(c.saturday)||0,
    sunday:amount(c.sunday)||0,
    holiday:amount(c.holiday)||0,
    shift:amount(c.shift)||0,
    shiftType,
    springIn:amount(c.springIn)||0,
    average21Days:Number(c.average21Days)||0,
    unpriced:Array.isArray(c.unpriced)?c.unpriced:[],
    springInVblUnverified:Boolean(c.springInVblUnverified)
  };
}

function actualFixedTotal(actual){
  if(!actual)return null;
  const values=[actual.basePay,actual.careAllowance,actual.universityAllowance];
  if(values.some(v=>v==null))return null;
  return sum(values);
}

function expectedVariableRows(forecast={}){
  const c=forecastComponents(forecast);
  return [
    {key:'night',label:'Nachtzuschläge',expected:c.night,tax:'steuerfrei'},
    {key:'saturday',label:'Samstagszuschläge',expected:c.saturday,tax:'steuerpflichtig'},
    {key:'sunday',label:'Sonntagszuschläge',expected:c.sunday,tax:'steuerfrei'},
    {key:'holiday',label:'Feiertagszuschläge',expected:c.holiday,tax:'steuerfrei'},
    {key:'shift',label:c.shiftType==='wechsel'?'Wechselschichtzulage':'Schichtzulage',expected:c.shift,tax:'steuerpflichtig'},
    {key:'springIn',label:'Einspringprämie',expected:c.springIn,tax:'prüfen'}
  ].filter(row=>row.expected>0.005);
}

function componentActual(actual,key){
  const c=actual?.components||{};
  const value=amount(c[key]);
  return value==null?null:value;
}

export function retroForForecast(payslips,forecast={}){
  const targets=[forecast?.reportMonth,forecast?.payoutMonth].filter(Boolean);
  const hits=[],seen=new Set();
  for(const payslip of payslips||[]){
    for(const retro of payslip?.retroPeriods||[]){
      if(!targets.some(target=>samePayrollMonth(retro?.month,target)))continue;
      const key=[payslip?.month,retro?.month,retro?.totalGross,retro?.legalNet].join('|');
      if(seen.has(key))continue;
      seen.add(key);
      hits.push({...retro,paidWithMonth:payslip.month,combinedNetAdjustment:payslip.priorAdjustment||0,retroCount:(payslip.retroPeriods||[]).length});
    }
  }
  return hits;
}

export function buildPayrollControl({forecast,actual,payslips=[]}={}){
  if(!forecast?.payoutMonth)return null;
  const expectedGross=amount(forecast.totalGross);
  const actualGross=amount(actual?.totalGross);
  const fixedActual=actualFixedTotal(actual);
  const expectedRows=expectedVariableRows(forecast);
  const expectedVariable=sum(expectedRows.map(r=>r.expected));
  const actualVariableGross=actualGross!=null&&fixedActual!=null?money(actualGross-fixedActual):null;
  const retro=retroForForecast(payslips,forecast);
  const retroGross=sum(retro.map(r=>Number(r.totalGross)||0));
  const grossDifference=expectedGross!=null&&actualGross!=null?money(actualGross-expectedGross):null;
  const initialShortfall=grossDifference==null?null:money(Math.max(0,-grossDifference));
  const unexpectedCurrentOverpayment=grossDifference==null?0:money(Math.max(0,grossDifference));
  const remainingGross=initialShortfall==null?null:money(Math.max(0,initialShortfall-retroGross));
  const unexplainedOverCorrection=initialShortfall==null?0:money(Math.max(0,retroGross-initialShortfall));
  const inferAllVariableMissing=Boolean(
    actual&&
    actualGross!=null&&
    fixedActual!=null&&
    expectedVariable>0.005&&
    Math.abs(actualVariableGross||0)<=1&&
    Math.abs((expectedGross||0)-(actualGross||0)-expectedVariable)<=1
  );

  const retroComponentTotal=sum(retro.flatMap(r=>['night','saturday','sunday','holiday','shift','springIn'].map(key=>Number(r.components?.[key])||0)));
  const aggregateRetroSettles=Boolean(initialShortfall!=null&&initialShortfall>1&&remainingGross<=1&&retroGross>0&&Math.abs(retroComponentTotal)<=1);
  const variableRows=expectedRows.map(row=>{
    let real=componentActual(actual,row.key);
    if(real==null&&inferAllVariableMissing)real=0;
    const retroPaid=sum(retro.map(r=>Number(r.components?.[row.key])||0));
    let open=real==null?null:money(Math.max(0,row.expected-real-retroPaid));
    let status=open==null?'unknown':open<=1?'ok':retroPaid>0?'partial':'open';
    let retroAggregate=false;
    if(aggregateRetroSettles&&open!=null&&open>0.005){
      open=0;status='ok';retroAggregate=true;
    }
    return {...row,actual:real,retro:retroPaid,open,status,retroAggregate};
  });

  const fixedRows=[
    ['basePay','Grundentgelt',forecastComponents(forecast).basePay,actual?.basePay],
    ['careAllowance','Pflegezulage',forecastComponents(forecast).careAllowance,actual?.careAllowance],
    ['universityAllowance','Universitätszulage',forecastComponents(forecast).universityAllowance,actual?.universityAllowance]
  ].map(([key,label,expected,real])=>{
    const actualValue=amount(real);
    const difference=expected==null||actualValue==null?null:money(actualValue-expected);
    return {key,label,expected,actual:actualValue,difference,status:difference==null?'unknown':Math.abs(difference)<=1?'ok':'different'};
  });

  const estimatedNetImpact=forecast.baselinePayout!=null&&forecast.payout!=null
    ?money(Number(forecast.payout)-Number(forecast.baselinePayout))
    :null;
  const exactRetroNet=retro.length===1&&retro[0].retroCount===1&&Math.abs(Number(retro[0].combinedNetAdjustment)||0)>0.005
    ?money(Number(retro[0].combinedNetAdjustment))
    :null;

  let status='waiting';
  if(actual){
    if(unexpectedCurrentOverpayment>1||unexplainedOverCorrection>1)status='review';
    else if(remainingGross!=null&&remainingGross<=1)status=retroGross>0?'settled':'ok';
    else if(retroGross>0&&remainingGross>1)status='partial';
    else if(initialShortfall!=null&&initialShortfall>1)status='open';
    else status='review';
  }

  return {
    payoutMonth:forecast.payoutMonth,
    reportMonth:forecast.reportMonth||null,
    label:monthLabel(forecast.payoutMonth),
    status,
    expectedGross,
    actualGross,
    expectedPayout:amount(forecast.payout),
    actualPayout:amount(actual?.payout),
    payoutDifference:forecast?.payout!=null&&actual?.payout!=null&&!actual?.hasPriorAdjustment?money(Number(actual.payout)-Number(forecast.payout)):null,
    grossDifference,
    initialShortfall,
    unexpectedCurrentOverpayment,
    retroGross,
    remainingGross,
    unexplainedOverCorrection,
    estimatedNetImpact,
    exactRetroNet,
    fixedRows,
    variableRows,
    reviewRows:aggregateReviewRows([
      ...forecastComponents(forecast).unpriced,
      ...(forecastComponents(forecast).springInVblUnverified?[{code:'springInVbl',label:'Einspringprämie / VBL',quantity:forecastComponents(forecast).springIn,reason:'VBL-Pflicht ist noch nicht durch Referenzabrechnung verifiziert'}]:[])
    ]),
    retro,
    inferredMissingVariablePay:inferAllVariableMissing,
    hasPriorAdjustment:Boolean(actual?.hasPriorAdjustment),
    hasDetailedForecast:Boolean(forecast.components),
    needsReview:Boolean(forecast.needsReview||actual?.needsReview||variableRows.some(r=>r.status==='unknown')||fixedRows.some(r=>r.status==='unknown'))
  };
}

export function buildPayrollControlHistory({forecasts=[],payslips=[]}={}){
  return (forecasts||[])
    .map(forecast=>buildPayrollControl({
      forecast,
      actual:(payslips||[]).find(p=>samePayrollMonth(p?.month,forecast.payoutMonth))||null,
      payslips
    }))
    .filter(Boolean)
    .sort((a,b)=>String(b.payoutMonth).localeCompare(String(a.payoutMonth)));
}

export function payrollCarryoverRegularSollLabel(item={}){
  const label=item?.label||monthLabel(item?.payoutMonth);
  return 'Reguläres Soll für '+label+' bleibt unverändert';
}

export function payrollProjectedPayout(item={},incoming=[]){
  if(item?.actualPayout!=null||item?.expectedPayout==null)return null;
  const carryTotal=sum((incoming||[]).map(entry=>entry?.net));
  return carryTotal>0.005?money(Number(item.expectedPayout)+carryTotal):amount(item.expectedPayout);
}

export function payrollDisplayedNetDifference(item={},netBreakdown=null){
  const openNet=Number(netBreakdown?.totalNet);
  if(['open','partial','review'].includes(item?.status)&&Number.isFinite(openNet)&&openNet>0.005){
    return money(-openNet);
  }
  return amount(item?.payoutDifference);
}

export function payrollCardDisplay(item={}){
  const status=item?.status||'review';
  return {
    waiting:status==='waiting',
    detailed:['open','partial','review'].includes(status)
  };
}

export function buildPayrollCarryovers({controls=[],netByMonth={}}={}){
  const waiting=(controls||[])
    .filter(item=>item?.status==='waiting')
    .sort((a,b)=>String(a.payoutMonth).localeCompare(String(b.payoutMonth)));
  const result={};
  for(const source of controls||[]){
    if(!source||!['open','partial'].includes(source.status))continue;
    const net=Number(netByMonth?.[source.payoutMonth]);
    if(!Number.isFinite(net)||net<=0.005)continue;
    const target=waiting.find(item=>String(item.payoutMonth)>String(source.payoutMonth));
    if(!target)continue;
    (result[target.payoutMonth]??=[]).push({
      sourceMonth:source.payoutMonth,
      sourceLabel:source.label,
      net:money(net),
      gross:source.remainingGross==null?null:money(source.remainingGross)
    });
  }
  return result;
}

export function payrollControlStatusLabel(status){
  return ({waiting:'Abrechnung ausstehend',ok:'Stimmig',open:'Offen',partial:'Teilweise nachgezahlt',settled:'Erledigt',review:'Bitte prüfen'})[status]||'Bitte prüfen';
}


export function visiblePayrollControls(controls=[],limit=3){
  return (Array.isArray(controls)?controls:[]).slice(0,Math.max(0,Number(limit)||0));
}
