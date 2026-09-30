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
