import {calculateSalaryForecast} from './salary.js';
import {SALARY_2026} from '../config/salary-2026.js';

const money=value=>Math.round((Number(value)||0)*100)/100;
const TIME_CODES=new Set(['5010','5011','5014','5024']);

function filteredReport(report,predicate){
  return {
    ...report,
    items:(report?.items||[]).filter(predicate),
    springIn:null,
    unknownCodes:[],
    needsReview:false
  };
}

export async function calculateNetEffects(report,baseline,full,calculator=calculateSalaryForecast){
  if(!report||!baseline||!full)return null;
  const isTime=item=>TIME_CODES.has(item.code)||String(item.type||'').startsWith('holiday');
  const isShift=item=>item.code==='5211'||item.code==='5212';

  const time=await calculator(filteredReport(report,isTime));
  const shiftOnly=await calculator(filteredReport(report,isShift));
  const timeShift=await calculator(filteredReport(report,item=>isTime(item)||isShift(item)));

  const baselineGarnishment=Number.isFinite(Number(baseline.garnishment))?money(baseline.garnishment):null;
  const correctedGarnishment=Number.isFinite(Number(full.garnishment))?money(full.garnishment):null;
  const garnishmentDelta=baselineGarnishment!=null&&correctedGarnishment!=null?money(correctedGarnishment-baselineGarnishment):null;
  const baselineGarnishableNet=Number.isFinite(Number(baseline.garnishableNet))?money(baseline.garnishableNet):null;
  const correctedGarnishableNet=Number.isFinite(Number(full.garnishableNet))?money(full.garnishableNet):null;
  const baselineVbl=Number.isFinite(Number(baseline.vbl))?money(baseline.vbl):null;
  const correctedVbl=Number.isFinite(Number(full.vbl))?money(full.vbl):null;
  const vblDelta=baselineVbl!=null&&correctedVbl!=null?money(correctedVbl-baselineVbl):null;
  const baselineLegalNet=Number.isFinite(Number(baseline.legalNet))?money(baseline.legalNet):null;
  const correctedLegalNet=Number.isFinite(Number(full.legalNet))?money(full.legalNet):null;
  const legalNetDelta=baselineLegalNet!=null&&correctedLegalNet!=null?money(correctedLegalNet-baselineLegalNet):null;

  return {
    complete:!(full.components.springIn.total>0)&&!(full.components.unpriced?.length),
    totalNet:money(full.payout-baseline.payout),
    taxFreeNet:money(full.taxFreePay),
    timeGross:money(full.components.pay.night+full.components.pay.saturday+full.components.pay.sunday+full.components.pay.holiday),
    timeNet:money(time.payout-baseline.payout),
    shiftGross:money(full.components.pay.shift),
    shiftType:full.components.shift||'none',
    shiftStandaloneNet:money(shiftOnly.payout-baseline.payout),
    shiftAfterTimeNet:money(timeShift.payout-time.payout),
    baselineGarnishment,
    correctedGarnishment,
    garnishmentDelta,
    baselineGarnishableNet,
    correctedGarnishableNet,
    baselineVbl,
    correctedVbl,
    vblDelta,
    baselineLegalNet,
    correctedLegalNet,
    legalNetDelta
  };
}


function legacyTaxableItems(taxableGross,config=SALARY_2026){
  const taxable=money(Math.max(0,Number(taxableGross)||0));
  const saturdayRate=Number(config.surcharges.saturday)||0;
  const maxPlausibleSaturdayHours=40;
  const candidates=[
    {code:'5211',amount:Number(config.shift.wechsel)||0,type:'wechsel'},
    {code:'5212',amount:Number(config.shift.schicht)||0,type:'schicht'}
  ].filter(entry=>entry.amount>0&&taxable+0.02>=entry.amount)
   .map(entry=>({...entry,residual:money(taxable-entry.amount)}))
   .filter(entry=>saturdayRate>0&&entry.residual/saturdayRate<=maxPlausibleSaturdayHours)
   .sort((a,b)=>a.residual-b.residual);
  const chosen=candidates[0]||null;
  const items=[];
  let saturdayGross=taxable;
  let shiftType='none';
  if(chosen){
    items.push({code:chosen.code,hours:null});
    saturdayGross=chosen.residual;
    shiftType=chosen.type;
  }
  if(saturdayGross>0.005&&saturdayRate>0)items.push({code:'5014',hours:saturdayGross/saturdayRate});
  return {items,shiftType,saturdayGross:money(saturdayGross),shiftGross:chosen?money(chosen.amount):0};
}

export function storedLegacySummaryReport(forecast,config=SALARY_2026){
  if(forecast?.components||forecast?.needsReview||Number(forecast?.springIn)>0)return null;
  const totalGross=Number(forecast?.totalGross);
  const legalNet=Number(forecast?.legalNet);
  const garnishableNet=Number(forecast?.garnishableNet);
  if(![totalGross,legalNet,garnishableNet].every(Number.isFinite))return null;
  const grossGap=money(totalGross-config.fixed.gross);
  const taxFreeGross=money(legalNet-garnishableNet);
  const taxableGross=money(grossGap-taxFreeGross);
  if(grossGap<=0.005||taxFreeGross<-0.02||taxableGross<-0.02)return null;
  const items=[];
  if(taxFreeGross>0.005)items.push({code:'legacy-taxfree',type:'holiday',hours:0,amount:taxFreeGross});
  const taxable=legacyTaxableItems(taxableGross,config);
  items.push(...taxable.items);
  return {
    items,
    unknownCodes:[],
    needsReview:false,
    legacySummary:true,
    inferredShiftType:taxable.shiftType,
    inferredShiftGross:taxable.shiftGross,
    inferredSaturdayGross:taxable.saturdayGross
  };
}

export function storedForecastReport(forecast,config=SALARY_2026){
  const c=forecast?.components;
  if(!c||Number(c.springIn)>0||(Array.isArray(c.unpriced)&&c.unpriced.length))return null;
  const items=[];
  const addHours=(code,amount,rate)=>{
    const value=Math.max(0,Number(amount)||0);
    if(value>0&&rate>0)items.push({code,hours:value/rate});
  };
  addHours('5010',c.night,config.surcharges.night);
  addHours('5014',c.saturday,config.surcharges.saturday);
  addHours('5024',c.sunday,config.surcharges.sunday);
  if(Number(c.holiday)>0)items.push({code:'holiday-stored',type:'holiday',hours:0,amount:Number(c.holiday)});
  if(Number(c.shift)>0){
    if(c.shiftType==='wechsel')items.push({code:'5211',hours:null});
    else if(c.shiftType==='schicht')items.push({code:'5212',hours:null});
    else return null;
  }
  return {items,unknownCodes:[],needsReview:false};
}

function reportFromForecast(forecast,config=SALARY_2026){
  const items=Array.isArray(forecast?.reportItems)?forecast.reportItems.filter(item=>item?.code):[];
  if(items.length)return {items:items.map(item=>({...item})),unknownCodes:[],needsReview:false};
  return storedForecastReport(forecast,config)||storedLegacySummaryReport(forecast,config);
}

function closeEnough(a,b,tolerance=1){
  return Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<=tolerance;
}

export async function calculateActualBasedForecastNetEffects(forecast,actual,config=SALARY_2026,calculator=calculateSalaryForecast){
  if(!forecast||!actual)return null;
  if(actual?.components?.hasVariableDetail)return null;
  const report=reportFromForecast(forecast,config);
  if(!report)return null;

  const baseline=await calculator({items:[],unknownCodes:[],needsReview:false},config);
  // Für die Rückrechnung dient die echte Bezügemitteilung als Auszahlungssockel.
  // Das Modell muss deshalb nicht dieselben absoluten Netto-/VBL-/Pfändungswerte treffen.
  // Entscheidend ist nur: reine Festbezüge, keine Nachverrechnung, keine bereits
  // ausgewiesenen variablen Bezüge und dass das Ist-Brutto dem Festbrutto entspricht.
  if(!closeEnough(actual.totalGross,config.fixed.gross))return null;
  if(!Number.isFinite(Number(actual.payout)))return null;

  const full=await calculator(report,config);
  const effects=await calculateNetEffects(report,baseline,full,(entry)=>calculator(entry,config));
  if(!effects)return null;
  const actualGarnishment=Number.isFinite(Number(actual.garnishment))
    ?money(actual.garnishment)
    :Number.isFinite(Number(actual.legalNet))&&Number.isFinite(Number(actual.vbl))&&Number.isFinite(Number(actual.payout))
      ?money(Number(actual.legalNet)-Number(actual.vbl)-Number(actual.payout))
      :null;
  const modelGarnishmentDelta=Number.isFinite(Number(effects.garnishmentDelta))?money(effects.garnishmentDelta):null;
  const correctedGarnishment=actualGarnishment!=null&&modelGarnishmentDelta!=null
    ?money(actualGarnishment+modelGarnishmentDelta)
    :effects.correctedGarnishment;
  const actualGarnishableNet=Number.isFinite(Number(actual.legalNet))&&Number.isFinite(Number(actual.vbl))
    ?money(Number(actual.legalNet)-Number(actual.vbl))
    :null;
  const modelGarnishableDelta=Number.isFinite(Number(effects.correctedGarnishableNet))&&Number.isFinite(Number(effects.baselineGarnishableNet))
    ?money(Number(effects.correctedGarnishableNet)-Number(effects.baselineGarnishableNet))
    :null;
  const correctedGarnishableNet=actualGarnishableNet!=null&&modelGarnishableDelta!=null
    ?money(actualGarnishableNet+modelGarnishableDelta)
    :effects.correctedGarnishableNet;
  const actualVbl=Number.isFinite(Number(actual.vbl))?money(actual.vbl):effects.baselineVbl;
  const correctedVbl=actualVbl!=null&&Number.isFinite(Number(effects.vblDelta))
    ?money(actualVbl+Number(effects.vblDelta))
    :effects.correctedVbl;
  const actualLegalNet=Number.isFinite(Number(actual.legalNet))?money(actual.legalNet):effects.baselineLegalNet;
  const correctedLegalNet=actualLegalNet!=null&&Number.isFinite(Number(effects.legalNetDelta))
    ?money(actualLegalNet+Number(effects.legalNetDelta))
    :effects.correctedLegalNet;

  return {
    ...effects,
    basis:'actual-payslip',
    actualPayout:money(actual.payout),
    modelBaselinePayout:money(baseline.payout),
    correctedPayout:money(Number(actual.payout)+Number(effects.totalNet||0)),
    actualGarnishment,
    correctedGarnishment,
    garnishmentDelta:actualGarnishment!=null&&correctedGarnishment!=null?money(correctedGarnishment-actualGarnishment):modelGarnishmentDelta,
    actualGarnishableNet,
    correctedGarnishableNet,
    actualVbl,
    correctedVbl,
    vblDelta:actualVbl!=null&&correctedVbl!=null?money(correctedVbl-actualVbl):effects.vblDelta,
    actualLegalNet,
    correctedLegalNet,
    legalNetDelta:actualLegalNet!=null&&correctedLegalNet!=null?money(correctedLegalNet-actualLegalNet):effects.legalNetDelta
  };
}

export async function calculateStoredForecastNetEffects(forecast,config=SALARY_2026){
  if(forecast?.netEffects&&forecast?.components)return forecast.netEffects;
  if(forecast?.netEffects&&forecast?.netEffectsSource==='legacy-summary-current-rules')return forecast.netEffects;
  const report=storedForecastReport(forecast,config)||storedLegacySummaryReport(forecast,config);
  if(!report)return null;
  const baseline=await calculateSalaryForecast({items:[],unknownCodes:[],needsReview:false},config);
  const full=await calculateSalaryForecast(report,config);
  return calculateNetEffects(report,baseline,full);
}


function componentKey(item={}){
  if(item.code==='5010'||item.code==='5011')return 'night';
  if(item.code==='5014')return 'saturday';
  if(item.code==='5024')return 'sunday';
  if(item.code==='5211'||item.code==='5212')return 'shift';
  if(String(item.type||'').startsWith('holiday'))return 'holiday';
  return null;
}
function scenarioReportFromForecast(forecast={},ratios={}){
  const items=[];
  for(const original of forecast?.reportItems||[]){
    const key=componentKey(original);
    if(!key)continue;
    const ratio=Math.max(0,Math.min(1,Number(ratios[key]??1)));
    if(ratio<=0.000001)continue;
    if(key==='shift'){items.push({...original,hours:original.hours??0,amountOverride:ratio});continue;}
    const next={...original};
    if(Number.isFinite(Number(next.hours)))next.hours=Number(next.hours)*ratio;
    if(Number.isFinite(Number(next.amount)))next.amount=Number(next.amount)*ratio;
    items.push(next);
  }
  return {items,unknownCodes:[],needsReview:false};
}
function componentTotals(source={}){
  return {night:Math.max(0,Number(source?.night)||0),saturday:Math.max(0,Number(source?.saturday)||0),sunday:Math.max(0,Number(source?.sunday)||0),holiday:Math.max(0,Number(source?.holiday)||0),shift:Math.max(0,Number(source?.shift)||0)};
}
function addTotals(a,b){
  const out={};for(const key of ['night','saturday','sunday','holiday','shift'])out[key]=money((Number(a?.[key])||0)+(Number(b?.[key])||0));return out;
}
export async function calculateOutstandingNetEffects(forecast,actual,retro=[],config=SALARY_2026,calculator=calculateSalaryForecast){
  if(!forecast||!actual||!Array.isArray(forecast?.reportItems)||!forecast.reportItems.length)return null;
  const expected=componentTotals(forecast.components||{});
  if(money(Object.values(expected).reduce((sum,value)=>sum+value,0))<=0.005)return null;
  let currentPaid=null;
  if(actual?.components?.hasVariableDetail)currentPaid=componentTotals(actual.components);
  else if(Number.isFinite(Number(actual?.totalGross))&&Math.abs(Number(actual.totalGross)-config.fixed.gross)<=1)currentPaid=componentTotals({});
  else return null;
  let retroPaid=componentTotals({});
  for(const period of retro||[]){
    const c=period?.components||{};
    const hasDetail=Boolean(c.hasVariableDetail)||['night','saturday','sunday','holiday','shift'].some(key=>Number.isFinite(Number(c[key])));
    if(!hasDetail&&Math.abs(Number(period?.totalGross)||0)>0.005)return null;
    retroPaid=addTotals(retroPaid,componentTotals(c));
  }
  const paid=addTotals(currentPaid,retroPaid);
  const ratiosFor=totals=>Object.fromEntries(Object.keys(expected).map(key=>[key,expected[key]>0?Math.max(0,Math.min(1,(Number(totals[key])||0)/expected[key])):0]));
  const currentRatios=ratiosFor(currentPaid),paidRatios=ratiosFor(paid),fullRatios=Object.fromEntries(Object.keys(expected).map(key=>[key,expected[key]>0?1:0]));
  const baseline=await calculator({items:[],unknownCodes:[],needsReview:false},config);
  const currentScenario=await calculator(scenarioReportFromForecast(forecast,currentRatios),config);
  const paidScenario=await calculator(scenarioReportFromForecast(forecast,paidRatios),config);
  const full=await calculator(scenarioReportFromForecast(forecast,fullRatios),config);
  const open=Object.fromEntries(Object.keys(expected).map(key=>[key,money(Math.max(0,expected[key]-Math.min(expected[key],paid[key]||0)))]));
  const taxFreeGross=money(open.night+open.sunday+open.holiday),taxableGross=money(open.saturday+open.shift);
  const timeRatios={...paidRatios};for(const key of ['night','saturday','sunday','holiday'])timeRatios[key]=fullRatios[key];
  const timeScenario=await calculator(scenarioReportFromForecast(forecast,timeRatios),config);
  const shiftScenario=await calculator(scenarioReportFromForecast(forecast,{...paidRatios,shift:fullRatios.shift}),config);
  return {
    complete:true,basis:'actual-payslip-outstanding',
    totalNet:money(full.payout-paidScenario.payout),taxFreeNet:taxFreeGross,taxableGross,
    timeGross:money(open.night+open.saturday+open.sunday+open.holiday),timeNet:money(timeScenario.payout-paidScenario.payout),
    shiftGross:open.shift,shiftType:forecast?.components?.shiftType||full.components?.shift||'none',
    shiftStandaloneNet:money(shiftScenario.payout-paidScenario.payout),shiftAfterTimeNet:money(full.payout-timeScenario.payout),
    actualPayout:money(actual.payout),correctedPayout:retro?.length?null:money(Number(actual.payout)+Number(full.payout-currentScenario.payout)),
    actualGarnishment:Number.isFinite(Number(actual.garnishment))?money(actual.garnishment):null,
    correctedGarnishment:Number.isFinite(Number(actual.garnishment))?money(Number(actual.garnishment)+Number(full.garnishment-currentScenario.garnishment)):null,
    garnishmentDelta:money(full.garnishment-paidScenario.garnishment),
    actualVbl:Number.isFinite(Number(actual.vbl))?money(actual.vbl):null,
    correctedVbl:Number.isFinite(Number(actual.vbl))?money(Number(actual.vbl)+Number(full.vbl-currentScenario.vbl)):null,
    vblDelta:money(full.vbl-paidScenario.vbl),
    actualLegalNet:Number.isFinite(Number(actual.legalNet))?money(actual.legalNet):null,
    correctedLegalNet:Number.isFinite(Number(actual.legalNet))?money(Number(actual.legalNet)+Number(full.legalNet-currentScenario.legalNet)):null,
    legalNetDelta:money(full.legalNet-paidScenario.legalNet),openComponents:open,modelBaselinePayout:money(baseline.payout)
  };
}
