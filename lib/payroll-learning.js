import {samePayrollMonth} from './payroll-month.js';
const money=value=>Math.round((Number(value)||0)*100)/100;
const FIXED=Object.freeze(['basePay','careAllowance','universityAllowance']);
const COMPONENTS=Object.freeze({
  night:{codes:['5010','5011'],tax:'steuerfrei'},
  saturday:{codes:['5014'],tax:'steuerpflichtig'},
  sunday:{codes:['5024'],tax:'steuerfrei'},
  holiday:{codes:[],tax:'steuerfrei'},
  shift:{codes:['5211','5212'],tax:'steuerpflichtig'},
  springIn:{codes:[],tax:'prüfen'}
});

function actualComponent(actual,key){
  const raw=actual?.components?.[key];
  if(raw==null||raw==='')return null;
  const value=Number(raw);
  return Number.isFinite(value)?money(value):null;
}
function expectedComponent(forecast,key){
  const value=Number(forecast?.components?.[key]);
  return Number.isFinite(value)?money(value):null;
}
function expectedFixed(forecast,key){
  const value=Number(forecast?.components?.fixed?.[key]??forecast?.[key]);
  return Number.isFinite(value)?money(value):null;
}
function actualMetric(actual,key){
  if(key==='taxTotal'){
    const parts=[actual?.wageTax,actual?.solidarity,actual?.churchTax].map(Number);
    return parts.every(Number.isFinite)?money(parts.reduce((a,b)=>a+b,0)):null;
  }
  if(key==='socialTotal'){
    const parts=[actual?.health,actual?.care,actual?.pension,actual?.unemployment].map(Number);
    return parts.every(Number.isFinite)?money(parts.reduce((a,b)=>a+b,0)):null;
  }
  if(key==='garnishableNet'){
    const legal=Number(actual?.legalNet),vbl=Number(actual?.vbl);
    const protectedParts=['night','sunday','holiday'].map(name=>Number(actual?.components?.[name])).filter(Number.isFinite);
    if(!Number.isFinite(legal)||!Number.isFinite(vbl)||!protectedParts.length)return null;
    return money(Math.max(0,legal-vbl-protectedParts.reduce((a,b)=>a+b,0)));
  }
  const value=Number(actual?.[key]);
  return Number.isFinite(value)?money(value):null;
}
function forecastMetric(forecast,key){
  if(key==='taxTotal'){
    const parts=[forecast?.wageTax,forecast?.solidarity,forecast?.churchTax].map(Number);
    return parts.every(Number.isFinite)?money(parts.reduce((a,b)=>a+b,0)):null;
  }
  if(key==='socialTotal'){
    const parts=[forecast?.health,forecast?.care,forecast?.pension,forecast?.unemployment].map(Number);
    return parts.every(Number.isFinite)?money(parts.reduce((a,b)=>a+b,0)):null;
  }
  const value=Number(forecast?.[key]);
  return Number.isFinite(value)?money(value):null;
}
function reportCodes(forecast,key){
  const allowed=new Set(COMPONENTS[key]?.codes||[]);
  return [...new Set((forecast?.reportItems||[]).map(item=>String(item?.code||'')).filter(code=>allowed.has(code)))];
}
function confidence(confirmations,observations){
  if(!observations)return 'unbekannt';
  if(confirmations>=3&&confirmations===observations)return 'verifiziert';
  if(confirmations>=2)return 'mehrfach bestätigt';
  if(confirmations>=1)return 'einmal bestätigt';
  return 'abweichend';
}

function finiteComponent(source,key){
  const raw=source?.components?.[key];
  if(raw==null||raw==='')return null;
  const value=Number(raw);
  return Number.isFinite(value)?money(value):null;
}
function learningComponentSource(forecast,actual,payslips=[]){
  const targets=[forecast?.reportMonth,forecast?.payoutMonth].filter(Boolean);
  const external=(Array.isArray(payslips)?payslips:[]).filter(item=>item&&item!==actual);
  const seen=new Set();
  const matchingRetros=(payslip,scope)=>{
    const out=[];
    for(const period of payslip?.retroPeriods||[]){
      if(!targets.some(target=>samePayrollMonth(period?.month,target)))continue;
      const key=[scope,payslip?.month,period?.month,period?.totalGross,JSON.stringify(period?.components||{})].join('|');
      if(seen.has(key))continue;
      seen.add(key);out.push(period);
    }
    return out;
  };
  const baseRetros=matchingRetros(actual,'base');
  const laterRetros=external.flatMap(payslip=>matchingRetros(payslip,'later'));
  if(!baseRetros.length&&!laterRetros.length)return {source:actual,label:'current',month:actual?.month||null};

  const keys=Object.keys(COMPONENTS);
  const currentHasDetail=Boolean(actual?.components?.hasVariableDetail)||keys.some(key=>finiteComponent(actual,key)!=null);
  const useCurrent=currentHasDetail&&!baseRetros.length;
  const sources=[...(useCurrent?[actual]:[]),...baseRetros,...laterRetros];
  const components={};
  for(const key of keys){
    const values=sources.map(source=>finiteComponent(source,key)).filter(value=>value!=null);
    components[key]=values.length?money(values.reduce((sum,value)=>sum+value,0)):null;
  }
  return {
    source:{components},
    label:useCurrent?'current+retro':'retro',
    month:forecast?.reportMonth||baseRetros[0]?.month||laterRetros[0]?.month||actual?.month||null
  };
}

export function buildPayrollLearningSnapshot({forecast,actual,payslips=[],tolerance=1}={}){
  if(!forecast?.payoutMonth||!actual?.month||!samePayrollMonth(forecast.payoutMonth,actual.month))return null;
  const componentContext=learningComponentSource(forecast,actual,payslips);
  const componentActual=componentContext.source;
  const rows=FIXED.map(key=>{
    const expected=expectedFixed(forecast,key),real=actualMetric(actual,key);
    const comparable=expected!=null&&real!=null,difference=comparable?money(real-expected):null;
    return {key,codes:[],tax:'steuerpflichtig',expected,actual:real,difference,comparable,confirmed:comparable&&Math.abs(difference)<=tolerance};
  }).filter(row=>row.expected!=null||row.actual!=null);
  for(const key of Object.keys(COMPONENTS)){
    const expected=expectedComponent(forecast,key);
    const real=actualComponent(componentActual,key);
    if(expected==null&&real==null)continue;
    const comparable=expected!=null&&real!=null;
    const difference=comparable?money(real-expected):null;
    rows.push({
      key,
      codes:reportCodes(forecast,key),
      tax:COMPONENTS[key].tax,
      expected,
      actual:real,
      difference,
      comparable,
      confirmed:comparable&&Math.abs(difference)<=tolerance
    });
  }
  const metricKeys=['totalGross','taxableGross','wageTax','solidarity','churchTax','taxTotal','health','care','pension','unemployment','socialTotal','legalNet','vbl','protectedPay','garnishableNet','garnishment','payout'];
  const totalFields=metricKeys.map(key=>{
    const predicted=forecastMetric(forecast,key),real=actualMetric(actual,key);
    const comparable=predicted!=null&&real!=null&&!(actual?.hasPriorAdjustment&&['garnishment','payout'].includes(key));
    return {key,predicted,actual:real,difference:comparable?money(real-predicted):null,comparable,confirmed:comparable&&Math.abs(real-predicted)<=tolerance};
  });
  return {
    id:`${forecast.payoutMonth}:${forecast.reportMonth||'unknown'}`,
    payoutMonth:forecast.payoutMonth,
    reportMonth:forecast.reportMonth||null,
    createdAt:new Date().toISOString(),
    rows,
    totals:totalFields,
    hasPriorAdjustment:Boolean(actual?.hasPriorAdjustment),
    componentSource:componentContext.label,
    componentSourceMonth:componentContext.month
  };
}

export function mergePayrollLearning(existing=[],snapshot){
  if(!snapshot)return Array.isArray(existing)?existing:[];
  const list=(Array.isArray(existing)?existing:[]).filter(item=>item?.id!==snapshot.id);
  list.push(snapshot);
  return list.sort((a,b)=>String(a.payoutMonth).localeCompare(String(b.payoutMonth))).slice(-36);
}

export function summarizePayrollLearning(history=[]){
  const summary={};
  for(const snapshot of Array.isArray(history)?history:[]){
    for(const row of snapshot?.rows||[]){
      const keys=row.codes?.length?row.codes:[row.key];
      for(const key of keys){
        const entry=summary[key]||{key,component:row.key,tax:row.tax,observations:0,confirmations:0,mismatches:0,lastDifference:null};
        if(row.comparable){
          entry.observations++;
          entry.lastDifference=row.difference;
          if(row.confirmed)entry.confirmations++;else entry.mismatches++;
        }
        summary[key]=entry;
      }
    }
  }
  return Object.values(summary).map(entry=>({...entry,confidence:confidence(entry.confirmations,entry.observations)}));
}

export function validateForecastWithLearning(forecast,history=[]){
  const learned=summarizePayrollLearning(history);
  const byCode=new Map(learned.map(item=>[item.key,item]));
  const warnings=[];
  for(const item of forecast?.reportItems||[]){
    const rule=byCode.get(String(item?.code||''));
    if(rule?.mismatches>0)warnings.push({code:String(item.code),confidence:rule.confidence,mismatches:rule.mismatches,message:'Historische Bezügemitteilungen wichen bei dieser Lohnart von der Prognose ab.'});
  }
  return {rules:learned,warnings,needsReview:warnings.length>0};
}
