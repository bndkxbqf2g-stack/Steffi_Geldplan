import {annualSpecialPaymentForecast,calculateAnnualSpecialPaymentNet} from './annual-special-payment.js';

const money=value=>Math.round(value*100)/100;
const amount=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?money(Number(value)):null;

/**
 * One amount for the selected payout month. November combines the regular
 * report-based forecast with the separate §20 TV-L annual payment; an actual
 * LfF payslip is already the complete transfer and must never be added twice.
 */
export async function calculateDisplayedMonthPayout({
  payoutMonth,
  regularNet,
  forecasts=[],
  payslips=[],
  specialNetCalculator=calculateAnnualSpecialPaymentNet
}={}){
  const regular=amount(regularNet);
  if(!/^\d{4}-11$/.test(String(payoutMonth||''))){
    return {kind:'regular',regularNet:regular,specialGross:null,specialNet:null,totalNet:regular,needsReview:false};
  }
  const year=Number(payoutMonth.slice(0,4));
  const special=annualSpecialPaymentForecast({year,forecasts,payslips});
  const actual=(Array.isArray(payslips)?payslips:[]).find(item=>item?.month===payoutMonth&&amount(item?.payout)!==null);
  if(actual){
    return {
      kind:'actual',
      regularNet:regular,
      specialGross:amount(actual.specialPaymentGross),
      specialNet:null,
      totalNet:amount(actual.payout),
      needsReview:false,
      reference:special
    };
  }
  try{
    const net=await specialNetCalculator({forecast:special});
    const specialNet=amount(net?.payout);
    return {
      kind:specialNet===null?'unavailable':'forecast',
      regularNet:regular,
      specialGross:amount(special.gross),
      specialNet,
      totalNet:regular===null||specialNet===null?null:money(regular+specialNet),
      needsReview:Boolean(special.needsReview||net?.needsReview),
      reference:special
    };
  }catch(_error){
    return {
      kind:'unavailable',
      regularNet:regular,
      specialGross:amount(special.gross),
      specialNet:null,
      totalNet:null,
      needsReview:true,
      reference:special
    };
  }
}
