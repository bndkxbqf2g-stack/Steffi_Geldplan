import {plannedPaydayForDate,nextPaydayFrom,dateOnly} from './cycle.js';
import {normalizeFixedCosts} from './fixed-costs.js';

function key(value){
  const d=dateOnly(value);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function sameDay(a,b){return String(a||'').slice(0,10)===String(b||'').slice(0,10);}

export function normalizeFixedCostOverrides(value){
  if(!Array.isArray(value))return [];
  return value.filter(Boolean).map((item,index)=>{
    const amount=Number(item.amount);
    return {
      id:String(item.id||`fixed-override-${index}`),
      fixedCostId:String(item.fixedCostId||''),
      payoutDate:String(item.payoutDate||'').slice(0,10),
      amount:Number.isFinite(amount)?Math.max(0,amount):0
    };
  }).filter(item=>item.fixedCostId&&/^\d{4}-\d{2}-\d{2}$/.test(item.payoutDate));
}

export function nextFixedCostPayoutDate({today=new Date(),transactions=[]}={}){
  let payout=plannedPaydayForDate(today);
  const payoutKey=key(payout);
  const alreadyBooked=(Array.isArray(transactions)?transactions:[]).some(
    item=>item?.type==='salary'&&sameDay(item.date,payoutKey)
  );
  if(alreadyBooked)payout=nextPaydayFrom(payout);
  return payout;
}

export function overrideFor(overrides,fixedCostId,payoutDate){
  const target=key(payoutDate);
  return normalizeFixedCostOverrides(overrides).find(
    item=>item.fixedCostId===String(fixedCostId)&&item.payoutDate===target
  )||null;
}

export function setFixedCostOverride(overrides,{fixedCostId,payoutDate,amount,baseAmount}={}){
  const list=normalizeFixedCostOverrides(overrides);
  const id=String(fixedCostId||''),target=key(payoutDate),base=Math.max(0,Number(baseAmount)||0);
  if(!id)return list;
  const next=Math.min(base,Math.max(0,Number(amount)||0));
  const filtered=list.filter(item=>!(item.fixedCostId===id&&item.payoutDate===target));
  if(next>=base)return filtered;
  return [...filtered,{id:`${target}:${id}`,fixedCostId:id,payoutDate:target,amount:next}];
}

export function removeFixedCostOverride(overrides,fixedCostId,payoutDate){
  const target=key(payoutDate),id=String(fixedCostId||'');
  return normalizeFixedCostOverrides(overrides).filter(item=>!(item.fixedCostId===id&&item.payoutDate===target));
}

export function removeFixedCostOverridesForPayout(overrides,payoutDate){
  const target=key(payoutDate);
  return normalizeFixedCostOverrides(overrides).filter(item=>item.payoutDate!==target);
}

export function effectiveFixedCosts(fixedCosts,overrides,payoutDate){
  const items=normalizeFixedCosts(fixedCosts),target=key(payoutDate),list=normalizeFixedCostOverrides(overrides);
  return items.map(item=>{
    const found=list.find(override=>override.fixedCostId===String(item.id)&&override.payoutDate===target);
    if(!found)return {...item};
    return {...item,amount:Math.min(item.amount,Math.max(0,found.amount)),normalAmount:item.amount,overridden:true};
  });
}

export function totalFixedCostsForPayout(fixedCosts,overrides,payoutDate){
  return effectiveFixedCosts(fixedCosts,overrides,payoutDate).reduce((sum,item)=>sum+item.amount,0);
}
