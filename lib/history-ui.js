import {getTransactions,getFixedCosts,getSavings} from './storage.js';
import {totalFixedCosts} from './fixed-costs.js';
import {plannedPaydayForDate,nextWithdrawalOrPayday} from './cycle.js';
import {$,eur,fmt,dateKey,openTab} from './ui.js';
import {transactionTotals,monthlyStatistics,savingsStatistics} from './statistics.js';

const relevant=t=>t&&t.type!=='base';
function monthKey(t){return String(t.date||'').slice(0,7);}
function monthLabel(key){const [y,m]=key.split('-');return `${m}/${y}`;}
function txRow(t){const row=document.createElement('div');row.className='row';const l=document.createElement('span');l.textContent=`${t.date||''} · ${t.text||'Buchung'}`;const v=document.createElement('span');v.className='v';v.textContent=`${Number(t.amount)>=0?'+':''}${eur(Number(t.amount)||0)}`;row.append(l,v);return row;}

export function createHistoryUi({budgetUi}={}){
  function renderOverview(){const b=budgetUi.getBudget(),g=budgetUi.getGiro(),c=budgetUi.getCash(),tx=getTransactions(),items=tx.filter(relevant),available=g+c,planned=plannedPaydayForDate(new Date());
    const vals={ovGiro:eur(g),ovCash:eur(c),ovAvailable:eur(available),ovNextPay:b.active?`Nächster Lohn ${fmt(b.nextPayday)}`:`Geplanter Lohn ${fmt(planned)}`,ovPayDays:b.active?b.daysToPayday:'–',ovDay:b.active?eur(b.dailyBudget):'–',ovWeek:b.active?eur(b.weeklyBudget):'–',ovFix:eur(totalFixedCosts(getFixedCosts())),ovCashKpi:eur(c),ovSalaryCount:tx.filter(t=>t.type==='salary').length};Object.entries(vals).forEach(([id,v])=>{if($(id))$(id).textContent=v;});if($('ovAvailableLabel'))$('ovAvailableLabel').textContent=b.active?'Verfügbar bis zum nächsten Lohn':'Aktuell verfügbar';
    const start=b.payday?dateKey(b.payday):'',end=b.nextPayday?dateKey(b.nextPayday):'';const extra=tx.filter(t=>t.type==='expense'&&t.date>=start&&t.date<end).reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);if($('ovCycleExpenses'))$('ovCycleExpenses').textContent=eur(extra);
    const recent=$('ovRecent');if(recent){recent.innerHTML='';const shown=items.slice().reverse().slice(0,5);if(!shown.length)recent.innerHTML='<div class="note">Noch keine Kontobewegungen.</div>';else shown.forEach(t=>recent.appendChild(txRow(t)));}
    renderWithdrawalInfo(b);
  }
  function renderWithdrawalInfo(b){const today=new Date(),payday=b.nextPayday||plannedPaydayForDate(today),next=nextWithdrawalOrPayday(today,payday);const text=next?fmt(next):'–';const days=next?Math.max(0,Math.round((new Date(next.getFullYear(),next.getMonth(),next.getDate())-new Date(today.getFullYear(),today.getMonth(),today.getDate()))/86400000)):'–';['ovNextWithdraw','nextWithdrawalDate'].forEach(id=>{if($(id))$(id).textContent=text;});if($('withdrawalDays'))$('withdrawalDays').textContent=days;}
  function renderHistory(){const tx=getTransactions().filter(relevant),savings=getSavings(),full=$('fullTxList');if(full){full.innerHTML='';const shown=tx.slice().reverse();if(!shown.length)full.innerHTML='<div class="note">Noch keine Kontobewegungen.</div>';else shown.forEach(t=>full.appendChild(txRow(t)));}
    const stats=monthlyStatistics(tx,savings,6),totals=transactionTotals(tx),savingStats=savingsStatistics(savings);
    const statVals={statIncome:eur(totals.income),statExpenses:eur(totals.expenses),statWithdrawals:eur(totals.withdrawals),statSaved:eur(savingStats.total)};Object.entries(statVals).forEach(([id,v])=>{if($(id))$(id).textContent=v;});
    const compare=$('monthlyCompare');if(compare){compare.innerHTML='';stats.forEach(m=>{const row=document.createElement('div');row.className='row';row.innerHTML=`<span>${monthLabel(m.month)}</span><span class="v">+${eur(m.income)} · −${eur(m.expenses)} · Sparen ${eur(m.saved)}</span>`;compare.appendChild(row);});if(!stats.length)compare.innerHTML='<div class="note">Noch keine Monatsdaten.</div>';}
    const chart=$('monthlyChart');if(chart){chart.innerHTML='';const max=Math.max(1,...stats.map(x=>Math.max(x.expenses,x.saved)));stats.forEach(x=>{const wrap=document.createElement('div');wrap.className='bar-wrap';wrap.innerHTML=`<div class="bar-value">${Math.round(x.expenses)} €</div><div class="bar" style="height:${Math.max(4,x.expenses/max*110)}px"></div><div class="bar-label">${monthLabel(x.month)}</div>`;chart.appendChild(wrap);});}
    const savingList=$('savingStats');if(savingList){savingList.innerHTML='';if(!savingStats.byPosition.length)savingList.innerHTML='<div class="note">Noch keine Sparpositionen mit reserviertem Betrag.</div>';else savingStats.byPosition.forEach(item=>{const row=document.createElement('div');row.className='row';row.innerHTML=`<span>${item.name}${item.deleted?' (gelöscht)':''}</span><span class="v">${eur(item.amount)}</span>`;savingList.appendChild(row);});}
  }
  function init(){if($('openHistoryBtn'))$('openHistoryBtn').onclick=()=>openTab('verlauf');}
  function render(){renderOverview();renderHistory();}
  return {init,render};
}
