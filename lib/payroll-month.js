export function payrollMonthKey(value){
  const raw=String(value??'').trim();
  let match=raw.match(/^(20\d{2})[-/.](0?[1-9]|1[0-2])$/);
  if(match)return `${match[1]}-${String(Number(match[2])).padStart(2,'0')}`;
  match=raw.match(/^(0?[1-9]|1[0-2])[/.](20\d{2})$/);
  return match?`${match[2]}-${String(Number(match[1])).padStart(2,'0')}`:null;
}

export function samePayrollMonth(left,right){
  const a=payrollMonthKey(left),b=payrollMonthKey(right);
  return Boolean(a&&b&&a===b);
}

export function addPayrollMonths(value,offset=0){
  const key=payrollMonthKey(value);
  const amount=Number(offset);
  if(!key||!Number.isInteger(amount))return null;
  const [year,month]=key.split('-').map(Number);
  const date=new Date(year,month-1+amount,1);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
}

export function plannedPayoutMonthForForecast(forecast={}){
  return payrollMonthKey(forecast?.plannedPayoutMonth||forecast?.standardPayoutMonth||forecast?.payoutMonth);
}

export function effectivePayoutMonthForForecast(forecast={}){
  return payrollMonthKey(forecast?.payoutMonth||forecast?.plannedPayoutMonth||forecast?.standardPayoutMonth);
}

export function payrollForecastKey(forecast={}){
  const objectMonth=forecast?.month&&Number.isInteger(Number(forecast.month.year))&&Number.isInteger(Number(forecast.month.month))
    ?`${forecast.month.year}-${String(forecast.month.month).padStart(2,'0')}`
    :null;
  const report=payrollMonthKey(forecast?.reportMonth||forecast?.originMonth||objectMonth)||'unknown';
  const payout=effectivePayoutMonthForForecast(forecast)||'unknown';
  return `${report}:${payout}`;
}

export function payrollForecastOriginKey(forecast={}){
  const objectMonth=forecast?.month&&Number.isInteger(Number(forecast.month.year))&&Number.isInteger(Number(forecast.month.month))
    ?`${forecast.month.year}-${String(forecast.month.month).padStart(2,'0')}`
    :null;
  return payrollMonthKey(forecast?.reportMonth||forecast?.originMonth||objectMonth)||'unknown';
}
