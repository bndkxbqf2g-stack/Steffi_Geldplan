import {getTransactions,saveTransactions,getCash,saveCash,getSavings,getFixedCosts,getBudgetAnchor,saveBudgetAnchor} from './storage.js';
import {ensureBaseTransaction,getCurrentGiro,createTransaction,appendTransaction,hasFixedCostForCycle,getWithdrawalTotalForRange,getLatestSalaryTransaction} from './budget.js';
import {budgetForDate,maxAdditionalWithdrawal,isWithdrawalDay,nextPaydayFrom,plannedPaydayForDate,daysUntilPayday} from './cycle.js';
import {effectiveReservedSavings,savingsForSegment,totalSaved} from './savings.js';
import {totalFixedCosts} from './fixed-costs.js';
import {$,num,eur,fmt,dateKey,cycleKey,notify} from './ui.js';

export function calculateCurrentCycleBudget({giro,transactions,savings,today=new Date(),anchorDate=""}={}){
  const now=new Date(today),todayKey=dateKey(now);
  const salary=getLatestSalaryTransaction(transactions,todayKey);
  let payday,nextPayday,provisional=false;
  if(salary){
    payday=new Date(`${salary.date}T00:00:00`);
    nextPayday=nextPaydayFrom(payday);
  }else if(anchorDate){
    payday=new Date(`${String(anchorDate).slice(0,10)}T00:00:00`);
    nextPayday=plannedPaydayForDate(payday);
    provisional=true;
  }else{
    return {active:false,provisional:false,payday:null,nextPayday:null,segmentStart:null,segmentEnd:null,remainingDays:0,daysToPayday:0,segmentDays:0,dailyBudget:0,weeklyBudget:0};
  }
  if(provisional && now>=nextPayday){
    return {active:false,provisional:true,payday,nextPayday,segmentStart:null,segmentEnd:null,remainingDays:0,daysToPayday:0,segmentDays:0,dailyBudget:0,weeklyBudget:0};
  }
  let budgetDate=now;
  if(provisional){
    const anchor=new Date(payday);
    const daysToSunday=(7-anchor.getDay())%7;
    budgetDate=new Date(anchor);
    budgetDate.setDate(anchor.getDate()+daysToSunday);
  }
  const first=budgetForDate({giro,today:budgetDate,payday,nextPayday});
  if(!first.segmentStart)return {...first,active:false,provisional,daysToPayday:daysUntilPayday(now,nextPayday)};
  const start=dateKey(first.segmentStart),end=dateKey(first.segmentEnd);
  const withdrawals=getWithdrawalTotalForRange(transactions,start,end);
  const reserved=effectiveReservedSavings(savings,start);
  return {...budgetForDate({giro:Math.max(0,giro+withdrawals-reserved),today:budgetDate,payday,nextPayday}),active:true,provisional,daysToPayday:daysUntilPayday(now,nextPayday)};
}

export function createBudgetUi({refresh=()=>{}}={}){
  const txs=()=>getTransactions();
  const giro=()=>getCurrentGiro(txs());
  const cash=()=>getCash();
  const budget=()=>calculateCurrentCycleBudget({giro:giro(),transactions:txs(),savings:getSavings(),today:new Date(),anchorDate:getBudgetAnchor()});
  const book=(amount,text,type,meta)=>saveTransactions(appendTransaction(txs(),createTransaction({amount,text,type,date:dateKey(new Date()),meta})));

  function ensureBase(){const today=dateKey(new Date()),list=txs(),next=ensureBaseTransaction(list,{date:today});if(next.length!==list.length)saveTransactions(next);if(!getBudgetAnchor())saveBudgetAnchor(today);}
  function renderTransactions(){const list=$('giroTxList');if(!list)return;list.innerHTML='';const items=txs().filter(t=>t.type!=='base').slice().reverse();if(!items.length){list.innerHTML='<div class="note">Noch keine Kontobewegungen.</div>';return;}items.slice(0,12).forEach(t=>{const row=document.createElement('div');row.className='row';const left=document.createElement('span');left.textContent=`${t.date||''} · ${t.text||'Buchung'}`;const value=document.createElement('span');value.className='v';value.textContent=`${Number(t.amount)>=0?'+':''}${eur(Number(t.amount)||0)}`;row.append(left,value);list.appendChild(row);});}
  function renderBudget(){const c=cash(),g=giro(),b=budget(),available=g+c,reserved=totalSaved(getSavings()),planned=plannedPaydayForDate(new Date());if($('bCarryCash')&&document.activeElement!==$('bCarryCash'))$('bCarryCash').value=c.toFixed(2);if($('mainGiro'))$('mainGiro').textContent=eur(g);if($('mainCash'))$('mainCash').textContent=eur(c);if($('mainAvailable'))$('mainAvailable').textContent=eur(available);if($('mainSaved'))$('mainSaved').textContent=eur(reserved);if($('mainNextPay'))$('mainNextPay').textContent=b.active?fmt(b.nextPayday):`${fmt(planned)} (geplant)`;if($('mainDays'))$('mainDays').textContent=b.active?b.daysToPayday:'–';if($('mainDay'))$('mainDay').textContent=b.active?eur(b.dailyBudget):'–';if($('mainWeek'))$('mainWeek').textContent=b.active?eur(b.weeklyBudget):'–';if($('afterFixAvailable'))$('afterFixAvailable').textContent=eur(available);if($('giroCurrent'))$('giroCurrent').textContent=eur(g);if($('budgetNote'))$('budgetNote').textContent=b.segmentStart?`Budgetabschnitt ${fmt(b.segmentStart)}–${fmt(b.segmentEnd)} · ${b.daysToPayday} Tage bis zum nächsten Lohn. Tagesbudget-Basis: ${b.remainingDays} Finanzierungstage ab Abschnittsbeginn. Das Wochenbudget gilt nur für die ${b.segmentDays} Tage dieses Abschnitts.`:`Kein laufender Budgetabschnitt. Geplanter Lohntag: ${fmt(planned)}.`;}
  function renderSunday(){let c=cash();if($('bCarryCash')&&document.activeElement===$('bCarryCash')){const typed=num('bCarryCash');if(Math.abs(typed-c)>0.009){saveCash(typed);c=Math.max(0,typed);}}const g=giro(),b=budget(),segment=b.segmentStart?dateKey(b.segmentStart):'',saved=savingsForSegment(getSavings(),segment),max=maxAdditionalWithdrawal(b.weeklyBudget,c+saved);if($('sTotal'))$('sTotal').textContent=eur(g+c);if($('sGiro'))$('sGiro').textContent=eur(g);if($('sCash'))$('sCash').textContent=eur(c);if($('sSuggested'))$('sSuggested').textContent=eur(max);if($('sAfter'))$('sAfter').textContent=eur(g-num('sWithdrawAmount'));return {budget:b,max,cash:c,giro:g};}
  function addIncome(){const value=num('giroIncome');if(value<=0)return notify('Bitte einen positiven Zahlungseingang eingeben.',{type:'error'});book(value,$('giroText').value.trim()||'Zahlungseingang','income');$('giroIncome').value='';$('giroText').value='';refresh();}
  function addExpense(){const value=num('giroExpense');if(value<=0)return notify('Bitte einen positiven Ausgabebetrag eingeben.',{type:'error'});book(-value,$('giroText').value.trim()||'Ausgabe','expense');$('giroExpense').value='';$('giroText').value='';refresh();}
  function addSalary(){const value=num('salaryAmount');if(value<=0)return notify('Bitte den Nettolohn eingeben.',{type:'error'});const cycle=cycleKey(new Date()),fix=totalFixedCosts(getFixedCosts());book(value,$('salaryText').value.trim()||'Lohn','salary',{cycle});if(fix>0&&!hasFixedCostForCycle(txs(),cycle))book(-fix,'Fixkosten automatisch abgezogen','fixedcost',{cycle});$('salaryAmount').value='';$('salaryText').value='';refresh();}
  function withdraw(){const value=num('sWithdrawAmount'),g=giro(),c=cash(),state=renderSunday();if(!state.budget.active)return notify('Es ist kein aktiver Lohnzyklus vorhanden.',{type:'error'});if(!isWithdrawalDay(new Date(),state.budget.payday,state.budget.nextPayday))return notify('Die Wochenabhebung ist am Sonntag möglich.',{type:'error'});if(value<=0)return notify('Bitte einen Abhebebetrag eingeben.',{type:'error'});if(value>g)return notify('Der Abhebebetrag ist höher als dein Girokontostand.',{type:'error'});if(value>state.max+0.009)return notify(`Maximal zusätzlich abhebbar sind ${eur(state.max)}. Vorhandenes Bargeld zählt bereits zum Wochenbudget.`,{type:'error'});book(-value,'Bargeldabhebung','withdrawal');saveCash(c+value);if($('bCarryCash'))$('bCarryCash').value=cash().toFixed(2);$('sWithdrawAmount').value='';refresh();}
  function correctGiro(){const target=num('giroCorrection'),current=giro();if(target<0)return notify('Bitte einen gültigen Kontostand eingeben.',{type:'error'});const delta=target-current;if(Math.abs(delta)<0.005)return;if(!confirm(`Kontostand wirklich auf ${eur(target)} korrigieren?`))return;book(delta,'Kontostandkorrektur','correction');$('giroCorrection').value='';refresh();}
  function init(){ensureBase();if($('bCarryCash'))$('bCarryCash').value=cash().toFixed(2);if($('incomeBtn'))$('incomeBtn').onclick=addIncome;if($('expenseBtn'))$('expenseBtn').onclick=addExpense;if($('withdrawBtn'))$('withdrawBtn').onclick=withdraw;if($('salaryBtn'))$('salaryBtn').onclick=addSalary;if($('correctionBtn'))$('correctionBtn').onclick=correctGiro;}
  function render(){renderTransactions();renderBudget();renderSunday();}
  return {init,render,getBudget:budget,getGiro:giro,getCash:cash};
}
