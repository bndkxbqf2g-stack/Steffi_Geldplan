import {SALARY_2026} from '../config/salary-2026.js';
import {garnishment2026,vblEmployeeContribution} from './salary.js';

const money=value=>Math.round((Number(value)||0)*100)/100;
const sum=values=>money(values.reduce((total,value)=>total+(Number(value)||0),0));
const TIME_KEYS=new Set(['night','saturday','sunday','holiday']);

function storedActualFallbackEffects(forecast={},actual={},config=SALARY_2026){
  if(forecast?.components||actual?.hasPriorAdjustment||actual?.components?.hasVariableDetail)return null;
  const totalGross=Number(forecast?.totalGross);
  const legalNet=Number(forecast?.legalNet);
  const garnishableNet=Number(forecast?.garnishableNet);
  const actualGross=Number(actual?.totalGross);
  const actualLegalNet=Number(actual?.legalNet);
  const actualPayout=Number(actual?.payout);
  const actualVbl=Number(actual?.vbl);
  if(![totalGross,legalNet,garnishableNet,actualGross,actualLegalNet,actualPayout,actualVbl].every(Number.isFinite))return null;
  if(Math.abs(actualGross-config.fixed.gross)>1)return null;

  const grossGap=money(totalGross-actualGross);
  const taxFreeGross=money(legalNet-garnishableNet);
  const taxableGross=money(grossGap-taxFreeGross);
  if(grossGap<=0.005||taxFreeGross<0||taxableGross<=0.005)return null;

  const shiftGross=taxableGross>=config.shift.wechsel&&money(taxableGross-config.shift.wechsel)>=0
    ?config.shift.wechsel
    :taxableGross>=config.shift.schicht&&money(taxableGross-config.shift.schicht)>=0
      ?config.shift.schicht
      :0;
  const shiftType=shiftGross===config.shift.wechsel?'wechsel':shiftGross===config.shift.schicht?'schicht':'none';
  const saturdayGross=money(Math.max(0,taxableGross-shiftGross));
  if(saturdayGross>25.60)return null;

  const taxableLegalDelta=money(legalNet-actualLegalNet-taxFreeGross);
  if(taxableLegalDelta<0||taxableLegalDelta>taxableGross+0.02)return null;

  const scenario=(eligibleGross,protectedGross=0)=>{
    const eligible=money(Math.max(0,eligibleGross));
    const protectedPay=money(Math.max(0,protectedGross));
    const taxableShare=taxableGross>0?eligible/taxableGross:0;
    const legalDelta=money(protectedPay+taxableLegalDelta*taxableShare);
    const scenarioLegalNet=money(actualLegalNet+legalDelta);
    const scenarioVbl=money(actualVbl+vblEmployeeContribution(eligible,config));
    const garnishable=money(Math.max(0,scenarioLegalNet-scenarioVbl-protectedPay));
    const garnish=garnishment2026(garnishable,config.payroll.dependents);
    if(garnish==null)return null;
    const payout=money(scenarioLegalNet-scenarioVbl-garnish);
    return {
      payout,
      net:money(payout-actualPayout),
      legalNet:scenarioLegalNet,
      vbl:scenarioVbl,
      garnishableNet:garnishable,
      garnishment:garnish
    };
  };

  const full=scenario(taxableGross,taxFreeGross);
  const time=scenario(saturdayGross,taxFreeGross);
  const shift=scenario(shiftGross,0);
  if(!full||!time||!shift)return null;

  const actualGarnishment=Number.isFinite(Number(actual?.garnishment))
    ?money(actual.garnishment)
    :money(actualLegalNet-actualVbl-actualPayout);
  const actualGarnishableNet=money(actualLegalNet-actualVbl);

  return {
    complete:true,
    basis:'actual-payslip-stored-forecast',
    totalNet:full.net,
    taxFreeNet:taxFreeGross,
    timeGross:money(taxFreeGross+saturdayGross),
    timeNet:time.net,
    shiftGross:money(shiftGross),
    shiftType,
    shiftStandaloneNet:shift.net,
    shiftAfterTimeNet:money(full.payout-time.payout),
    actualPayout:money(actualPayout),
    correctedPayout:full.payout,
    actualGarnishment,
    correctedGarnishment:money(full.garnishment),
    garnishmentDelta:money(full.garnishment-actualGarnishment),
    actualGarnishableNet,
    correctedGarnishableNet:money(full.garnishableNet),
    actualVbl:money(actualVbl),
    correctedVbl:money(full.vbl),
    vblDelta:money(full.vbl-actualVbl),
    actualLegalNet:money(actualLegalNet),
    correctedLegalNet:money(full.legalNet),
    legalNetDelta:money(full.legalNet-actualLegalNet),
    reconstructed:true
  };
}

function legacySummarySplit(forecast={},actual={}){
  const totalGross=Number(forecast?.totalGross);
  const legalNet=Number(forecast?.legalNet);
  const garnishableNet=Number(forecast?.garnishableNet);
  const actualGross=Number(actual?.totalGross);
  if(![totalGross,legalNet,garnishableNet,actualGross].every(Number.isFinite))return null;
  if(Math.abs(actualGross-SALARY_2026.fixed.gross)>1)return null;
  if(Number(forecast?.springIn)>0||forecast?.needsReview)return null;
  const grossGap=money(totalGross-actualGross);
  if(grossGap<=0.005)return null;
  // Forecasts ohne Komponenten stammen aus der älteren Pfändungslogik:
  // garnishableNet = legalNet - steuerfreie Zuschläge (VBL wurde dort erst später abgezogen).
  const taxFree=money(legalNet-garnishableNet);
  if(taxFree<-0.02||taxFree>grossGap+0.02)return null;
  const taxFreeGross=money(Math.max(0,Math.min(grossGap,taxFree)));
  return {taxFreeGross,taxableGross:money(Math.max(0,grossGap-taxFreeGross))};
}

export function buildPayrollNetBreakdown({forecast,actual,variableRows=[],retro=[],estimatedNetImpact=null}={}){
  const openRows=variableRows.filter(row=>row.open!=null&&row.open>0.005);
  const legacySplit=!variableRows.length&&!retro.length?legacySummarySplit(forecast,actual):null;
  const taxFreeGross=legacySplit?.taxFreeGross??sum(openRows.filter(row=>row.tax==='steuerfrei').map(row=>row.open));
  const taxableGross=legacySplit?.taxableGross??sum(openRows.filter(row=>row.tax==='steuerpflichtig').map(row=>row.open));
  let timeGross=sum(openRows.filter(row=>TIME_KEYS.has(row.key)).map(row=>row.open));
  let shiftGross=sum(openRows.filter(row=>row.key==='shift').map(row=>row.open));
  const allVariableOpen=Boolean(
    variableRows.length &&
    variableRows.every(row=>row.open!=null&&Math.abs(row.open-row.expected)<=0.01) &&
    !retro.length
  );

  const hasActualPayslip=Boolean(actual&&actual.totalGross!=null&&actual.legalNet!=null&&actual.payout!=null);
  const fallbackEffects=storedActualFallbackEffects(forecast,actual,SALARY_2026);
  const storedActualEffects=forecast?.actualNetEffects||null;
  const storedActualEffectsCurrent=Number(forecast?.actualNetEffectsVersion)>=5?storedActualEffects:null;
  // Bei vorhandener echter Abrechnung niemals alte Forecast-Nettoeffekte oder
  // veraltete gespeicherte Ist-Effekte verwenden. Bis zum v5-Backfill ist
  // "noch nicht berechenbar" richtiger als ein alter Betrag ohne Mehrpfändung.
  const effects=storedActualEffectsCurrent||fallbackEffects||(!hasActualPayslip?forecast?.netEffects:null)||null;
  const actualEffects=String(effects?.basis||'').startsWith('actual-payslip');
  const forecastComponents=forecast?.components||{};
  const legacyDetailedRows=!variableRows.length&&Number(forecast?.totalGross)>0&&Number(actual?.totalGross)>0&&Number(forecast.totalGross)>Number(actual.totalGross)+0.005
    ?[
      ['night','Nachtzuschläge',forecastComponents.night,'steuerfrei'],['saturday','Samstagszuschläge',forecastComponents.saturday,'steuerpflichtig'],['sunday','Sonntagszuschläge',forecastComponents.sunday,'steuerfrei'],['holiday','Feiertagszuschläge',forecastComponents.holiday,'steuerfrei'],
      ['shift',forecastComponents.shiftType==='wechsel'?'Wechselschichtzulage':'Schichtzulage',forecastComponents.shift,'steuerpflichtig']
    ].filter(([, ,value])=>Number(value)>0.005).map(([key,label,value,tax])=>({key,label,expected:money(value),open:money(value),tax}))
    :[];
  if(legacyDetailedRows.length)return buildPayrollNetBreakdown({forecast,actual,variableRows:legacyDetailedRows,retro,estimatedNetImpact});
  const components=forecast?.components||{};
  const hasUnverified=Boolean(components.springInVblUnverified)||(Array.isArray(components.unpriced)&&components.unpriced.length>0);

  let totalNet=null;
  let timeNet=null;
  let shiftNet=null;
  let source='unavailable';

  if(effects?.basis==='actual-payslip-outstanding'&&effects?.complete){
    totalNet=Number.isFinite(Number(effects.totalNet))?money(effects.totalNet):null;
    timeNet=Number.isFinite(Number(effects.timeNet))?money(effects.timeNet):null;
    shiftNet=Number.isFinite(Number(effects.shiftStandaloneNet))?money(effects.shiftStandaloneNet):Number.isFinite(Number(effects.shiftAfterTimeNet))?money(effects.shiftAfterTimeNet):null;
    source='actual-payslip-outstanding';
  }else if(allVariableOpen&&effects?.complete){
    totalNet=Number.isFinite(Number(effects.totalNet))?money(effects.totalNet):null;
    timeNet=Number.isFinite(Number(effects.timeNet))?money(effects.timeNet):null;
    shiftNet=Number.isFinite(Number(effects.shiftStandaloneNet))?money(effects.shiftStandaloneNet):Number.isFinite(Number(effects.shiftAfterTimeNet))?money(effects.shiftAfterTimeNet):null;
    source=actualEffects?'actual-payslip-detailed':'detailed';
  }else if(legacySplit&&effects?.complete){
    totalNet=Number.isFinite(Number(effects.totalNet))?money(effects.totalNet):null;
    timeGross=Number.isFinite(Number(effects.timeGross))?money(effects.timeGross):timeGross;
    shiftGross=Number.isFinite(Number(effects.shiftGross))?money(effects.shiftGross):shiftGross;
    timeNet=Number.isFinite(Number(effects.timeNet))?money(effects.timeNet):null;
    shiftNet=Number.isFinite(Number(effects.shiftStandaloneNet))?money(effects.shiftStandaloneNet):null;
    source=actualEffects?'actual-payslip-summary':'legacy-summary-recalculated';
  }else if(legacySplit&&!effects){
    source='legacy-summary-awaiting';
  }else if(estimatedNetImpact!=null&&!hasActualPayslip&&!retro.length&&!hasUnverified&&(allVariableOpen||!variableRows.length)){
    totalNet=money(estimatedNetImpact);
    source='legacy-total';
  }else if(openRows.length===1&&openRows[0].tax==='steuerfrei'){
    totalNet=taxFreeGross;
    if(TIME_KEYS.has(openRows[0].key))timeNet=taxFreeGross;
    source='tax-free';
  }else if(openRows.length===1&&openRows[0].key==='shift'&&effects?.complete){
    totalNet=Number.isFinite(Number(effects.shiftStandaloneNet))?money(effects.shiftStandaloneNet):null;
    shiftNet=totalNet;
    source=actualEffects?'actual-payslip-detailed':'detailed';
  }

  const taxableNet=totalNet==null?null:money(totalNet-taxFreeGross);
  const actualTaxableBase=actual?.totalGross!=null?money(Number(actual.totalGross)):null;
  const actualTax=actualTaxableBase!=null&&actual?.legalNet!=null?money(actualTaxableBase-Number(actual.legalNet)):null;
  const actualBased=Boolean(actual?.payout!=null&&actual?.totalGross!=null&&actual?.legalNet!=null);
  const correctedPayout=retro.length
    ?null
    :actualEffects
      ?Number.isFinite(Number(effects?.correctedPayout))
        ?money(effects.correctedPayout)
        :actual?.payout!=null&&totalNet!=null&&!actual?.hasPriorAdjustment
          ?money(Number(actual.payout)+totalNet)
          :null
      :actual?.payout!=null&&totalNet!=null&&!actual?.hasPriorAdjustment
        ?money(Number(actual.payout)+totalNet)
        :null;
  const num=value=>Number.isFinite(Number(value))?money(value):null;
  const actualGarnishment=num(effects?.actualGarnishment??actual?.garnishment);
  const correctedGarnishment=num(effects?.correctedGarnishment);
  const garnishmentDelta=actualGarnishment!=null&&correctedGarnishment!=null
    ?money(correctedGarnishment-actualGarnishment)
    :num(effects?.garnishmentDelta);
  const actualGarnishableNet=num(effects?.actualGarnishableNet);
  const correctedGarnishableNet=num(effects?.correctedGarnishableNet);
  const actualVbl=num(effects?.actualVbl??actual?.vbl);
  const correctedVbl=num(effects?.correctedVbl);
  const vblDelta=actualVbl!=null&&correctedVbl!=null
    ?money(correctedVbl-actualVbl)
    :num(effects?.vblDelta);
  const actualLegalNet=num(effects?.actualLegalNet??actual?.legalNet);
  const correctedLegalNet=num(effects?.correctedLegalNet);
  const legalNetDelta=actualLegalNet!=null&&correctedLegalNet!=null
    ?money(correctedLegalNet-actualLegalNet)
    :num(effects?.legalNetDelta);
  const taxableLegalNetDelta=legalNetDelta!=null?money(legalNetDelta-taxFreeGross):null;
  const taxAndSvReduction=taxableLegalNetDelta!=null
    ?money(Math.max(0,taxableGross-taxableLegalNetDelta))
    :null;

  return {
    taxFreeGross,
    taxFreeNet:taxFreeGross,
    taxableGross,
    taxableNet,
    timeGross,
    timeNet,
    shiftGross,
    shiftNet,
    shiftType:effects?.shiftType||forecastComponents.shiftType||'none',
    totalNet,
    correctedPayout,
    actualBased,
    actualTaxableBase,
    actualTax,
    actualGarnishment,
    correctedGarnishment,
    garnishmentDelta,
    actualGarnishableNet,
    correctedGarnishableNet,
    actualVbl,
    correctedVbl,
    vblDelta,
    actualLegalNet,
    correctedLegalNet,
    legalNetDelta,
    taxableLegalNetDelta,
    taxAndSvReduction,
    source
  };
}
