import {plannedPaydayForDate,dateOnly} from './cycle.js';
import {createTransaction,appendTransaction,hasFixedCostForCycle} from './budget.js';
import {totalFixedCostsForPayout} from './fixed-cost-overrides.js';

function key(value){
  const d=dateOnly(value);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function cycleKey(value){return String(value||'').slice(0,7);}

export function createPendingSalary({id,amount,text='',createdAt=new Date(),payoutDate}={}){
  const value=Number(amount);
  if(!Number.isFinite(value)||value<=0)return null;
  const due=payoutDate?dateOnly(payoutDate):plannedPaydayForDate(createdAt);
  return {
    id:String(id||`pending-${Date.now()}`),
    amount:value,
    text:String(text||'').trim()||'Lohn',
    payoutDate:key(due),
    createdAt:new Date(createdAt).toISOString(),
    status:'pending'
  };
}

export function isPendingSalaryDue(pending,today=new Date()){
  return Boolean(pending&&pending.status==='pending'&&pending.payoutDate&&key(today)>=pending.payoutDate);
}

export function projectPendingSalary({pending,giro=0,cash=0,fixedCosts=[],fixedCostOverrides=[]}={}){
  if(!pending)return null;
  const fixed=totalFixedCostsForPayout(fixedCosts,fixedCostOverrides,pending.payoutDate);
  return {
    fixedCosts:fixed,
    salaryAfterFixedCosts:Number(pending.amount||0)-fixed,
    availableAfterPayout:Number(giro||0)+Number(cash||0)+Number(pending.amount||0)-fixed
  };
}

export function applyPendingSalary({pending,transactions=[],fixedCosts=[],fixedCostOverrides=[],today=new Date()}={}){
  const list=Array.isArray(transactions)?transactions.slice():[];
  if(!pending||!isPendingSalaryDue(pending,today))return {posted:false,transactions:list};
  if(list.some(item=>item?.type==='salary'&&item?.pendingSalaryId===pending.id)){
    return {posted:false,alreadyPosted:true,transactions:list};
  }
  const date=pending.payoutDate,cycle=cycleKey(date);
  let next=appendTransaction(list,createTransaction({
    id:`salary-${pending.id}`,
    amount:pending.amount,
    text:pending.text||'Lohn',
    type:'salary',
    date,
    meta:{cycle,pendingSalaryId:pending.id,automatic:true}
  }));
  const fixed=totalFixedCostsForPayout(fixedCosts,fixedCostOverrides,pending.payoutDate);
  if(fixed>0&&!hasFixedCostForCycle(next,cycle)){
    next=appendTransaction(next,createTransaction({
      id:`fixed-${pending.id}`,
      amount:-fixed,
      text:'Fixkosten automatisch abgezogen',
      type:'fixedcost',
      date,
      meta:{cycle,pendingSalaryId:pending.id,automatic:true}
    }));
  }
  return {posted:true,transactions:next,date,cycle,fixedCosts:fixed};
}
