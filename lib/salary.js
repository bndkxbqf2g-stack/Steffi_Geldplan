import { SALARY_2026 } from '../config/salary-2026.js';

const BMF_MODULE='https://cdn.jsdelivr.net/npm/lohnsteuerrechner@1.0.7/+esm';
let bmfPromise;
const money=v=>Math.round((Number(v)||0)*100)/100;

export function buildBmfInputs(taxableGross,config=SALARY_2026){
  const p=config.profile;
  return {LZZ:2,RE4:Math.round(taxableGross*100),STKL:p.taxClass,ZKF:p.childAllowance,KVZ:p.kvAdditionalRate,PVZ:p.childless?1:0,PVA:p.careChildDeductions,PVS:p.saxony?1:0,PKV:0,KRV:0,ALV:0};
}

export async function calculateWageTax(taxableGross,config=SALARY_2026){
  bmfPromise??=import(BMF_MODULE);
  const {calculate}=await bmfPromise;
  const out=calculate(2026,buildBmfInputs(taxableGross,config));
  const churchBase=(out.BK||0)/100;
  return {wageTax:(out.LSTLZZ||0)/100,solidarity:(out.SOLZLZZ||0)/100,churchTax:money(churchBase*config.profile.churchTaxRate),churchBase};
}

export function socialContributions(svGross,config=SALARY_2026){
  const s=config.social,bKv=Math.min(svGross,s.healthCareCap),bRv=Math.min(svGross,s.pensionUnemploymentCap);
  return {health:money(bKv*s.healthEmployee),care:money(bKv*s.careEmployee),pension:money(bRv*s.pensionEmployee),unemployment:money(bRv*s.unemploymentEmployee)};
}

export function vblSvAddon(vblGross,config=SALARY_2026){
  const s=config.social;
  const employerUmlage=money(Math.max(0,Number(vblGross)||0)*s.vblEmployerRate);
  if(employerUmlage<=0)return 0;
  const capped=Math.min(employerUmlage,s.vblSvThreshold);
  const equivalentGross=money(capped/s.vblEmployerRate);
  const baseAddon=money(Math.max(0,money(equivalentGross*s.vblSvPercent)-s.vblSvAllowance));
  const excess=money(Math.max(0,employerUmlage-s.vblSvThreshold));
  return money(baseAddon+excess);
}

export function vblEmployeeContribution(vblGross,config=SALARY_2026){
  return money(Math.max(0,Number(vblGross)||0)*config.social.vblEmployeeRate);
}

export function springInHourlyRate(config=SALARY_2026){
  const divisor=config.work.weeklyHours*config.work.monthFactor;
  return money((config.fixed.fullTimeBasePay??config.fixed.basePay)/divisor);
}

export function springInPay(entry={},config=SALARY_2026){
  const safeEntry=entry||{};
  const duties=Math.max(0,Math.floor(Number(safeEntry.duties)||0));
  const hours=Math.max(0,Number(safeEntry.hours)||0);
  const hourlyRate=springInHourlyRate(config);
  const premium=money(duties*config.springIn.basePremium);
  const hourly=money(hours*hourlyRate);
  return {duties,hours,hourlyRate,premium,hourly,total:money(premium+hourly)};
}

export function reportComponents(report,config=SALARY_2026){
  const hours={night:0,saturday:0,saturdayEvening:0,sunday:0,sundayNight:0,holiday:0,holidayWithoutTimeOff:0,holidayWithTimeOff:0};
  let holidayPay=0,average21Days=0,review=false;
  const unpriced=[];
  const items=Array.isArray(report?.items)?report.items:[];
  const hasWechsel=items.some(i=>i.code==='5211');
  const hasSchicht=items.some(i=>i.code==='5212');
  let shift='none',shiftPay=0;
  if(hasWechsel&&hasSchicht){
    shift='conflict';review=true;
    unpriced.push({code:'5211/5212',label:'Schicht-/Wechselschichtzulage',quantity:1,reason:'Beide Zulagencodes wurden gleichzeitig erkannt'});
  }else if(hasWechsel){
    shift='wechsel';
    const override=items.find(i=>i.code==='5211'&&Number.isFinite(Number(i.amountOverride)))?.amountOverride;
    shiftPay=override==null?config.shift.wechsel:config.shift.wechsel*Math.max(0,Math.min(1,Number(override)));
  }else if(hasSchicht){
    shift='schicht';
    const override=items.find(i=>i.code==='5212'&&Number.isFinite(Number(i.amountOverride)))?.amountOverride;
    shiftPay=override==null?config.shift.schicht:config.shift.schicht*Math.max(0,Math.min(1,Number(override)));
  }

  for(const i of items){
    if(i.code==='5211'||i.code==='5212')continue;
    if(i.code==='5161'||i.code==='5162'){
      average21Days+=Math.max(0,Number(i.hours)||0);
      review=true;
      unpriced.push({code:i.code,label:'Durchschnitt §21 TV-L',quantity:Math.max(0,Number(i.hours)||0),reason:'Betrag hängt vom individuellen Durchschnittsentgelt ab'});
      continue;
    }
    if(i.type==='holidayWithoutTimeOff'||i.type==='holidayWithTimeOff'){
      const holidayHours=Math.max(0,Number(i.hours)||0);
      const withoutTimeOff=i.type==='holidayWithoutTimeOff';
      const rate=withoutTimeOff?config.surcharges.holidayWithoutTimeOff:config.surcharges.holidayWithTimeOff;
      hours.holiday+=holidayHours;
      if(withoutTimeOff)hours.holidayWithoutTimeOff+=holidayHours;
      else hours.holidayWithTimeOff+=holidayHours;
      holidayPay+=holidayHours*rate;
      continue;
    }
    if(i.type==='holiday'){
      hours.holiday+=Math.max(0,Number(i.hours)||0);
      if(Number.isFinite(Number(i.amount))){holidayPay+=Number(i.amount);}
      else{
        review=true;
        unpriced.push({code:i.code,label:'Feiertagszuschlag',quantity:Math.max(0,Number(i.hours)||0),reason:'Zeitnachweis enthält keinen eindeutig berechenbaren Auszahlungsbetrag'});
      }
      continue;
    }
    if(i.hours==null){review=true;continue;}
    if(i.code==='5010'||i.code==='5011')hours.night+=Number(i.hours)||0;
    else if(i.code==='5014')hours.saturday+=Number(i.hours)||0;
    else if(i.code==='5034')hours.saturdayEvening+=Number(i.hours)||0;
    else if(i.code==='5024')hours.sunday+=Number(i.hours)||0;
    else if(i.code==='5026'){ const h=Number(i.hours)||0; hours.night+=h; hours.sunday+=h; hours.sundayNight+=h; }
  }

  const night=money(hours.night*config.surcharges.night);
  const saturday=money(hours.saturday*config.surcharges.saturday);
  const saturdayEvening=money(hours.saturdayEvening*config.surcharges.saturday);
  const sunday=money(hours.sunday*config.surcharges.sunday);
  holidayPay=money(holidayPay);
  const springIn=springInPay(report?.springIn,config);
  const taxFreePay=money(night+sunday+holidayPay+saturdayEvening);
  const taxableSurcharges=money(saturday);
  const taxableExtra=money(shiftPay+saturday+springIn.total);
  const vblEligibleExtra=money(shiftPay+saturday);
  const springInVblUnverified=springIn.total>0&&config.springIn.vblMode==='unverified';

  return {
    hours,
    average21Days,
    unpriced,
    pay:{night,saturday,saturdayEvening,sunday,holiday:holidayPay,shift:money(shiftPay),springIn:springIn.total},
    springIn,
    taxFreePay,
    taxableSurcharges,
    taxableExtra,
    vblEligibleExtra,
    garnishmentProtectedPay:taxFreePay,
    protectedPay:taxFreePay,
    shift,
    springInVblUnverified,
    needsReview:review||!!report?.needsReview||springInVblUnverified
  };
}

export function salaryForecastBreakdown(report,config=SALARY_2026){
  const c=reportComponents(report,config);
  const reportMonth=report?.month?`${report.month.year}-${String(report.month.month).padStart(2,'0')}`:null;
  const shiftLabel=c.shift==='wechsel'?'Wechselschichtzulage':c.shift==='schicht'?'Schichtzulage':c.shift==='conflict'?'Schicht-/Wechselschichtzulage: Konflikt':'Keine Schicht-/Wechselschichtzulage';
  return {
    reportMonth,
    payoutMonth:report?.payoutMonth||null,
    fixed:{basePay:config.fixed.basePay,careAllowance:config.fixed.careAllowance,universityAllowance:config.fixed.universityAllowance,practiceInstructorAllowance:config.fixed.practiceInstructorAllowance||0,gross:config.fixed.gross},
    shiftAllowance:{type:c.shift,label:shiftLabel,amount:c.pay.shift,taxable:c.pay.shift>0},
    timeSurcharges:[
      {key:'night',label:'Nachtarbeit',hours:c.hours.night,rate:config.surcharges.night,amount:c.pay.night,taxFree:true},
      {key:'saturday',label:'Samstagsarbeit 13–20 Uhr',hours:c.hours.saturday,rate:config.surcharges.saturday,amount:c.pay.saturday,taxFree:false},
      {key:'saturdayEvening',label:'Samstagsarbeit 20–21 Uhr',hours:c.hours.saturdayEvening,rate:config.surcharges.saturday,amount:c.pay.saturdayEvening,taxFree:true,classification:'employer-observed'},
      {key:'sunday',label:'Sonntagsarbeit',hours:c.hours.sunday,rate:config.surcharges.sunday,amount:c.pay.sunday,taxFree:true},
      {key:'holiday',label:'Feiertagsarbeit',hours:c.hours.holiday,rate:null,amount:c.pay.holiday,taxFree:true,withoutTimeOffHours:c.hours.holidayWithoutTimeOff,withTimeOffHours:c.hours.holidayWithTimeOff,rates:{withoutTimeOff:config.surcharges.holidayWithoutTimeOff,withTimeOff:config.surcharges.holidayWithTimeOff}}
    ],
    taxableAdditions:c.taxableExtra,
    taxableGross:money(config.fixed.gross+c.taxableExtra),
    taxFreeSurcharges:c.taxFreePay,
    totalGross:money(config.fixed.gross+c.taxableExtra+c.taxFreePay),
    unpriced:c.unpriced,
    needsReview:c.needsReview
  };
}

// Compatibility export for older stored-module imports. Steffi has no
// garnishment model; the value is deliberately always zero.
export function garnishment2026(){ return 0; }

export function calculateSalaryForecastCore(report,tax,config=SALARY_2026){
  const c=reportComponents(report,config);
  const taxableGross=money(config.fixed.gross+c.taxableExtra);
  const usesSteffiVblBasis=Number.isFinite(Number(config.social.zvSvAddonRate));
  const vblGross=usesSteffiVblBasis?taxableGross:money(config.fixed.gross+c.vblEligibleExtra);
  const svAddon=usesSteffiVblBasis?money(taxableGross*config.social.zvSvAddonRate):vblSvAddon(vblGross,config);
  const svGross=money(taxableGross+svAddon);
  const sv=socialContributions(svGross,config);
  const totalGross=money(taxableGross+c.taxFreePay);
  const legalNet=money(totalGross-tax.wageTax-tax.solidarity-tax.churchTax-sv.health-sv.care-sv.pension-sv.unemployment);
  const vbl=vblEmployeeContribution(vblGross,config);
  // Steffis Variante kennt keine Pfändungs-/Insolvenzberechnung.
  const garnishableNet=0;
  const garnishment=0;
  const payout=money(legalNet-vbl);
  return {totalGross,taxableGross,vblGross,svGross,svAddon,...tax,sv,legalNet,vbl,taxFreePay:c.taxFreePay,protectedPay:c.garnishmentProtectedPay,garnishableNet,garnishment,payout,components:c,needsReview:c.needsReview};
}

export async function calculateSalaryForecast(report,config=SALARY_2026){
  const c=reportComponents(report,config);
  const taxableGross=money(config.fixed.gross+c.taxableExtra);
  const tax=await calculateWageTax(taxableGross,config);
  return calculateSalaryForecastCore(report,tax,config);
}
