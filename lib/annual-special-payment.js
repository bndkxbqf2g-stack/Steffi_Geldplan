import {SALARY_2026,fixedGross} from '../config/salary-2026.js';
import {calculateSupplementaryWageTax,socialContributions,vblEmployeeContribution,vblSvAddon} from './salary.js';

const money=value=>Math.round((Number(value)||0)*100)/100;
const knownNumber=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value));
const monthKey=(year,month)=>`${year}-${String(month).padStart(2,'0')}`;

function sourceValue(source,key,fallback=null){
  return knownNumber(source?.[key])?Number(source[key]):fallback;
}

function forecastEntitlement(forecast,config){
  // A UKW 5706 premium is not verified as eligible for the §20 assessment.
  // Keep it outside the base estimate until the actual employer treatment is known.
  const provisionalPremium=Math.max(0,Number(forecast?.components?.springIn)||0);
  if(knownNumber(forecast?.totalGross))return money(Math.max(0,Number(forecast.totalGross)-provisionalPremium));
  const fixed=knownNumber(forecast?.baselineGross)?money(forecast.baselineGross):fixedGross(config);
  const effects=forecast?.components;
  if(!effects)return fixed;
  const variable=['night','saturday','saturdayEvening','sunday','holiday','shift'];
  if(variable.some(key=>!knownNumber(effects[key])))return fixed;
  return money(fixed+variable.reduce((sum,key)=>sum+Number(effects[key]),0));
}

function forecastTaxableEntitlement(forecast,entitlement){
  const provisionalPremium=Math.max(0,Number(forecast?.components?.springIn)||0);
  if(knownNumber(forecast?.taxableGross))return money(Math.max(0,Number(forecast.taxableGross)-provisionalPremium));
  if(knownNumber(forecast?.baselineGross)&&knownNumber(forecast?.netEffects?.taxableGross)){
    return money(Math.max(0,Number(forecast.baselineGross)+Number(forecast.netEffects.taxableGross)-provisionalPremium));
  }
  return money(entitlement);
}

function socialBasis(taxableGross,vblGross,config){
  const rate=Number(config.social?.zvSvAddonRate);
  if(Number.isFinite(rate))return money(taxableGross+taxableGross*rate);
  return money(taxableGross+vblSvAddon(vblGross??taxableGross,config));
}

export function annualSpecialPaymentReferenceMonths(year=new Date().getFullYear(),config=SALARY_2026){
  return (config.annualSpecialPayment?.referenceMonths||[7,8,9]).map(month=>monthKey(year,month));
}

export function annualSpecialPaymentForecast({year=new Date().getFullYear(),payslips=[],forecasts=[],config=SALARY_2026}={}){
  const annual=config.annualSpecialPayment||{};
  const references=annualSpecialPaymentReferenceMonths(year,config);
  const safePayslips=Array.isArray(payslips)?payslips:[];
  const safeForecasts=Array.isArray(forecasts)?forecasts:[];
  const observations=references.map(month=>{
    const actual=safePayslips.find(entry=>entry?.month===month&&knownNumber(entry?.totalGross));
    const forecast=safeForecasts.find(entry=>entry?.reportMonth===month);
    if(forecast){
      const gross=forecastEntitlement(forecast,config);
      const unpriced=Array.isArray(forecast.components?.unpriced)?forecast.components.unpriced:[];
      const assessmentUncertain=(Number(forecast.components?.springIn)||0)>0||unpriced.some(item=>['5016','5372','5388','5706'].includes(item.code));
      return {month,source:'forecast',gross,taxableGross:forecastTaxableEntitlement(forecast,gross),svGross:sourceValue(forecast,'svGross'),vblGross:sourceValue(forecast,'vblGross'),assessmentUncertain};
    }
    if(actual){
      const gross=money(Math.max(0,Number(actual.totalGross)-(Number(actual.specialPaymentGross)||0)));
      return {month,source:'actual',gross,taxableGross:knownNumber(actual.taxableGross)?money(actual.taxableGross):gross,svGross:sourceValue(actual,'svGross'),vblGross:sourceValue(actual,'vblGross')};
    }
    const gross=fixedGross(config);
    return {month,source:'estimate',gross,taxableGross:gross,svGross:null,vblGross:null};
  });
  const averageEntitlementGross=money(observations.reduce((sum,item)=>sum+item.gross,0)/Math.max(1,observations.length));
  const averageTaxableGross=money(observations.reduce((sum,item)=>sum+item.taxableGross,0)/Math.max(1,observations.length));
  const svValues=observations.map(item=>item.svGross).filter(knownNumber);
  const vblValues=observations.map(item=>item.vblGross).filter(knownNumber);
  const sourceSet=new Set(observations.map(item=>item.source));
  const source=sourceSet.has('estimate')?'estimate':sourceSet.size>1?'mixed':sourceSet.has('actual')?'actual':'forecast';
  return {
    year,
    paymentMonth:monthKey(year,annual.paymentMonth??11),
    rate:Number(annual.rate??0),
    referenceMonths:observations,
    averageEntitlementGross,
    averageTaxableGross,
    averageSvGross:svValues.length===observations.length?money(svValues.reduce((sum,value)=>sum+value,0)/svValues.length):null,
    averageVblGross:vblValues.length===observations.length?money(vblValues.reduce((sum,value)=>sum+value,0)/vblValues.length):null,
    gross:money(averageEntitlementGross*Number(annual.rate??0)),
    source,
    needsReview:source==='estimate'||source==='mixed'||observations.some(item=>item.assessmentUncertain),
    vblEligible:annual.vblEligible!==false
  };
}

export async function calculateAnnualSpecialPaymentNet({forecast,config=SALARY_2026}={}){
  if(!forecast||!knownNumber(forecast.gross))return null;
  const gross=money(forecast.gross);
  const regularTaxableGross=money(forecast.averageTaxableGross??forecast.averageEntitlementGross??fixedGross(config));
  const regularVblGross=money(forecast.averageVblGross??forecast.averageEntitlementGross??fixedGross(config));
  const tax=await calculateSupplementaryWageTax(gross,regularTaxableGross*12,config);
  const regularBasis=socialBasis(regularTaxableGross,regularVblGross,config);
  const specialVblGross=forecast.vblEligible?gross:0;
  const beforeSv=socialContributions(regularBasis,config);
  const afterSv=socialContributions(money(regularBasis+socialBasis(gross,specialVblGross,config)),config);
  const socialDelta={
    health:money(afterSv.health-beforeSv.health),
    care:money(afterSv.care-beforeSv.care),
    pension:money(afterSv.pension-beforeSv.pension),
    unemployment:money(afterSv.unemployment-beforeSv.unemployment)
  };
  const vbl=vblEmployeeContribution(specialVblGross,config);
  const payout=money(gross-tax.wageTax-tax.solidarity-tax.churchTax-socialDelta.health-socialDelta.care-socialDelta.pension-socialDelta.unemployment-vbl);
  return {gross,...tax,socialDelta,vbl,payout,needsReview:Boolean(forecast.needsReview||!forecast.vblEligible)};
}
