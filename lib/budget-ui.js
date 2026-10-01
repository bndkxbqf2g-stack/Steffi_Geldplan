import {getTransactions,saveTransactions,getCash,saveCash,getSavings,getFixedCosts,getFixedCostOverrides,saveFixedCostOverrides,getPendingSalary,savePendingSalary,clearPendingSalary,getBudgetAnchor,saveBudgetAnchor} from './storage.js';
import {ensureBaseTransaction,getCurrentGiro,createTransaction,appendTransaction,getLatestSalaryTransaction,isSalaryTransaction} from './budget.js';
import {budgetForDate,cycleForDate,maxAdditionalWithdrawal,nextPaydayFrom,plannedPaydayForDate,daysUntilPayday,dateOnly} from './cycle.js';
import {effectiveReservedSavings,savingsForSegment,totalSaved} from './savings.js';
import {createPendingSalary,applyPendingSalary,projectPendingSalary} from './pending-salary.js';
import {removeFixedCostOverridesForPayout} from './fixed-cost-overrides.js';
import {$,num,eur,fmt,dateKey,notify} from './ui.js';

export function calculateCurrentCycleBudget({giro,transactions,savings,today=new Date(),anchorDate=""}={}){
  const now=dateOnly(today),todayKey=dateKey(now);
  const salary=getLatestSalaryTransaction(transactions,todayKey);
  let payday,nextPayday,provisional=false;
  if(salary){payday=isSalaryTransaction(salary)?dateOnly(salary.date):cycleForDate(salary.date).payday;nextPayday=nextPaydayFrom(payday);}
  else if(anchorDate){payday=dateOnly(String(anchorDate).slice(0,10));nextPayday=plannedPaydayForDate(payday);provisional=true;}
  else{return {active:false,provisional:false,payday:null,nextPayday:null,segmentStart:null,segmentEnd:null,remainingDays:0,daysToPayday:0,segmentDays:0,dailyBudget:0,weeklyBudget:0};}
  if(provisional && now>=nextPayday)return {active:false,provisional:true,payday,nextPayday,segmentStart:null,segmentEnd:null,remainingDays:0,daysToPayday:0,segmentDays:0,dailyBudget:0,weeklyBudget:0};
  let budgetDate=now;
  if(provisional){const anchor=new Date(payday),daysToSunday=(7-anchor.getDay())%7;budgetDate=new Date(anchor);budgetDate.setDate(anchor.getDate()+daysToSunday);}
  const first=budgetForDate({giro,today:budgetDate,payday,nextPayday});
  if(!first.segmentStart)return {...first,active:false,provisional,daysToPayday:daysUntilPayday(now,nextPayday)};
  const start=dateKey(first.segmentStart),end=dateKey(first.segmentEnd);
  const reserved=effectiveReservedSavings(savings,start);
  return {...budgetForDate({giro:Math.max(0,giro-reserved),today:budgetDate,payday,nextPayday}),active:true,provisional,daysToPayday:daysUntilPayday(now,nextPayday)};
}

export function createBudgetUi({refresh=()=>{}}={}){
  const txs=()=>getTransactions(),giro=()=>getCurrentGiro(txs()),cash=()=>getCash();
  const budget=()=>calculateCurrentCycleBudget({giro:giro(),transactions:txs(),savings:getSavings(),today:new Date(),anchorDate:getBudgetAnchor()});
  const book=(amount,text,type,meta,date=dateKey(new Date()))=>saveTransactions(appendTransaction(txs(),createTransaction({amount,text,type,date,meta})));
  let pendingTimer=null;

  function ensureBase(){const today=dateKey(new Date()),list=txs(),next=ensureBaseTransaction(list,{date:today});if(next.length!==list.length)saveTransactions(next);if(!getBudgetAnchor())saveBudgetAnchor(today);}
  function processPendingSalary(now=new Date()){
    const pending=getPendingSalary();if(!pending)return false;
    const result=applyPendingSalary({pending,transactions:txs(),fixedCosts:getFixedCosts(),fixedCostOverrides:getFixedCostOverrides(),today:now});
    if(result.alreadyPosted){saveFixedCostOverrides(removeFixedCostOverridesForPayout(getFixedCostOverrides(),pending.payoutDate));clearPendingSalary();return false;}
    if(!result.posted)return false;
    if(!saveTransactions(result.transactions))return false;
    saveFixedCostOverrides(removeFixedCostOverridesForPayout(getFixedCostOverrides(),pending.payoutDate));
    clearPendingSalary();
    notify(`Vorgemerkter Lohn ${eur(pending.amount)} wurde für den ${fmt(new Date(`${pending.payoutDate}T00:00:00`))} automatisch gebucht.`,{type:'success',timeout:5000});
    return true;
  }
  function schedulePending(){
    if(pendingTimer)clearTimeout(pendingTimer);
    const pending=getPendingSalary();if(!pending)return;
    const due=new Date(`${pending.payoutDate}T00:00:00`).getTime(),wait=due-Date.now();
    if(wait<=0){if(processPendingSalary())refresh();return;}
    pendingTimer=setTimeout(()=>{if(processPendingSalary())refresh();schedulePending();},Math.min(wait,2147483647));
  }
  function renderTransactions(){const list=$('giroTxList');if(!list)return;list.innerHTML='';const items=txs().filter(t=>t.type!=='base').slice().reverse();if(!items.length){list.innerHTML='<div class="note">Noch keine Kontobewegungen.</div>';return;}items.slice(0,12).forEach(t=>{const row=document.createElement('div');row.className='row';const left=document.createElement('span');left.textContent=`${t.date||''} · ${t.text||'Buchung'}`;const value=document.createElement('span');value.className='v';value.textContent=`${Number(t.amount)>=0?'+':''}${eur(Number(t.amount)||0)}`;row.append(left,value);list.appendChild(row);});}
  function renderPending(){
    const pending=getPendingSalary(),g=giro(),c=cash(),fix=getFixedCosts(),card=$('ovPendingSalaryCard');
    if(card)card.classList.toggle('hidden',!pending);
    if(!pending){
      if($('pendingSalaryStatus'))$('pendingSalaryStatus').textContent=`Noch kein Lohn vorgemerkt. Nächster geplanter Auszahlungstag: ${fmt(plannedPaydayForDate(new Date()))}.`;
      if($('pendingSalaryDate'))$('pendingSalaryDate').textContent=fmt(plannedPaydayForDate(new Date()));
      if($('pendingSalaryProjection'))$('pendingSalaryProjection').textContent='–';
      if($('pendingSalaryDeleteBtn'))$('pendingSalaryDeleteBtn').classList.add('hidden');
      if($('pendingSalaryBtn'))$('pendingSalaryBtn').textContent='Lohn vormerken';
      return;
    }
    const due=new Date(`${pending.payoutDate}T00:00:00`),projection=projectPendingSalary({pending,giro:g,cash:c,fixedCosts:fix,fixedCostOverrides:getFixedCostOverrides()});
    if($('pendingSalaryAmount')&&document.activeElement!==$('pendingSalaryAmount'))$('pendingSalaryAmount').value=pending.amount.toFixed(2);
    if($('pendingSalaryText')&&document.activeElement!==$('pendingSalaryText'))$('pendingSalaryText').value=pending.text;
    if($('pendingSalaryDate'))$('pendingSalaryDate').textContent=fmt(due);
    if($('pendingSalaryProjection'))$('pendingSalaryProjection').textContent=eur(projection.availableAfterPayout);
    if($('pendingSalaryStatus'))$('pendingSalaryStatus').textContent=`${eur(pending.amount)} für ${fmt(due)} vorgemerkt. Bis dahin beeinflusst dieser Betrag dein aktuelles Budget nicht.`;
    if($('pendingSalaryBtn'))$('pendingSalaryBtn').textContent='Vormerkung aktualisieren';
    if($('pendingSalaryDeleteBtn'))$('pendingSalaryDeleteBtn').classList.remove('hidden');
    if($('ovPendingAmount'))$('ovPendingAmount').textContent=eur(pending.amount);
    if($('ovPendingDate'))$('ovPendingDate').textContent=fmt(due);
    if($('ovPendingAvailable'))$('ovPendingAvailable').textContent=eur(projection.availableAfterPayout);
  }
  function renderBudget(){const c=cash(),g=giro(),b=budget(),available=g+c,reserved=totalSaved(getSavings()),planned=plannedPaydayForDate(new Date());if($('bCarryCash')&&document.activeElement!==$('bCarryCash'))$('bCarryCash').value=c.toFixed(2);if($('mainGiro'))$('mainGiro').textContent=eur(g);if($('mainCash'))$('mainCash').textContent=eur(c);if($('mainAvailable'))$('mainAvailable').textContent=eur(available);if($('mainSaved'))$('mainSaved').textContent=eur(reserved);if($('mainNextPay'))$('mainNextPay').textContent=b.active?fmt(b.nextPayday):`${fmt(planned)} (geplant)`;if($('mainDays'))$('mainDays').textContent=b.active?b.daysToPayday:'–';if($('mainDay'))$('mainDay').textContent=b.active?eur(b.dailyBudget):'–';if($('mainWeek'))$('mainWeek').textContent=b.active?eur(b.weeklyBudget):'–';if($('afterFixAvailable'))$('afterFixAvailable').textContent=eur(available);if($('giroCurrent'))$('giroCurrent').textContent=eur(g);if($('budgetNote'))$('budgetNote').textContent=b.segmentStart?`Budgetabschnitt ${fmt(b.segmentStart)}–${fmt(b.segmentEnd)} · ${b.daysToPayday} Tage bis zum nächsten Lohn. Tagesbudget-Basis: ${b.remainingDays} Finanzierungstage ab Abschnittsbeginn. Das Wochenbudget gilt nur für die ${b.segmentDays} Tage dieses Abschnitts.`:`Kein laufender Budgetabschnitt. Geplanter Lohntag: ${fmt(planned)}.`;}
  function renderSunday(){let c=cash();if($('bCarryCash')&&document.activeElement===$('bCarryCash')){const typed=num('bCarryCash');if(Math.abs(typed-c)>0.009){saveCash(typed);c=Math.max(0,typed);}}const g=giro(),b=budget(),segment=b.segmentStart?dateKey(b.segmentStart):'',saved=savingsForSegment(getSavings(),segment),max=maxAdditionalWithdrawal(b.weeklyBudget,c+saved);if($('sTotal'))$('sTotal').textContent=eur(g+c);if($('sGiro'))$('sGiro').textContent=eur(g);if($('sCash'))$('sCash').textContent=eur(c);if($('sSuggested'))$('sSuggested').textContent=b.active?eur(b.weeklyBudget):'–';if($('sAfter'))$('sAfter').textContent=eur(g-num('sWithdrawAmount'));return {budget:b,max,cash:c,giro:g};}
  function addIncome(){const value=num('giroIncome');if(value<=0)return notify('Bitte einen positiven Zahlungseingang eingeben.',{type:'error'});book(value,$('giroText').value.trim()||'Zahlungseingang','income');$('giroIncome').value='';$('giroText').value='';refresh();}
  function addSalary(){const value=num('giroIncome');if(value<=0)return notify('Bitte einen positiven Lohnbetrag eingeben.',{type:'error'});book(value,$('giroText').value.trim()||'Lohn','salary');$('giroIncome').value='';$('giroText').value='';refresh();}
  function addExpense(){const value=num('giroExpense');if(value<=0)return notify('Bitte einen positiven Ausgabebetrag eingeben.',{type:'error'});book(-value,$('giroText').value.trim()||'Ausgabe','expense');$('giroExpense').value='';$('giroText').value='';refresh();}
  function savePending(){
    const value=num('pendingSalaryAmount');if(value<=0)return notify('Bitte den bekannten Auszahlungsbetrag eingeben.',{type:'error'});
    const existing=getPendingSalary(),pending=createPendingSalary({id:existing?.id,amount:value,text:$('pendingSalaryText')?.value.trim()||'Lohn',createdAt:new Date(),payoutDate:existing?.payoutDate});
    if(!pending||!savePendingSalary(pending))return notify('Vormerkung konnte nicht gespeichert werden.',{type:'error'});
    notify(`Lohn für ${fmt(new Date(`${pending.payoutDate}T00:00:00`))} vorgemerkt.`,{type:'success'});schedulePending();refresh();
  }
  function deletePending(){const pending=getPendingSalary();if(!pending)return;if(!confirm('Vorgemerkten Lohn wirklich löschen?'))return;clearPendingSalary();if($('pendingSalaryAmount'))$('pendingSalaryAmount').value='';if($('pendingSalaryText'))$('pendingSalaryText').value='';if($('pendingSalaryBtn'))$('pendingSalaryBtn').textContent='Lohn vormerken';schedulePending();refresh();}
  function withdraw(){const state=renderSunday(),value=num('sWithdrawAmount'),g=state.giro,c=state.cash;if(value<=0)return notify('Bitte einen positiven Abhebebetrag eingeben.',{type:'error'});if(value>g)return notify('Der Abhebebetrag ist höher als dein Girokontostand.',{type:'error'});book(-value,'Bargeldabhebung','withdrawal');saveCash(c+value);if($('bCarryCash'))$('bCarryCash').value=cash().toFixed(2);$('sWithdrawAmount').value='';refresh();}
  function correctGiro(){const target=num('giroCorrection'),current=giro();if(target<0)return notify('Bitte einen gültigen Kontostand eingeben.',{type:'error'});const delta=target-current;if(Math.abs(delta)<0.005)return;if(!confirm(`Kontostand wirklich auf ${eur(target)} korrigieren?`))return;book(delta,'Kontostandkorrektur','correction');$('giroCorrection').value='';refresh();}
  function init(){ensureBase();processPendingSalary();if($('bCarryCash'))$('bCarryCash').value=cash().toFixed(2);if($('incomeBtn'))$('incomeBtn').onclick=addIncome;if($('salaryBtn'))$('salaryBtn').onclick=addSalary;if($('expenseBtn'))$('expenseBtn').onclick=addExpense;if($('withdrawBtn'))$('withdrawBtn').onclick=withdraw;if($('pendingSalaryBtn'))$('pendingSalaryBtn').onclick=savePending;if($('pendingSalaryDeleteBtn'))$('pendingSalaryDeleteBtn').onclick=deletePending;if($('correctionBtn'))$('correctionBtn').onclick=correctGiro;schedulePending();}
  function render(){processPendingSalary();renderTransactions();renderBudget();renderSunday();renderPending();}
  return {init,render,getBudget:budget,getGiro:giro,getCash:cash,processPendingSalary};
}
