import {getTransactions,getSavings,getSalaryForecasts,getPayslips,getPayrollLearning} from './storage.js';
import {plannedPaydayForDate,nextPaydayFrom,nextWithdrawalOrPayday} from './cycle.js';
import {$,eur,fmt} from './ui.js';
import {transactionTotals,monthlyStatistics,savingsStatistics} from './statistics.js';
import {learnedPayoutForForecast} from './payroll-learning-calibration.js';
import {annualSpecialPaymentForecast,calculateAnnualSpecialPaymentNet} from './annual-special-payment.js';

const relevant=t=>t&&t.type!=='base';
function monthKey(t){return String(t.date||'').slice(0,7);}
function monthLabel(key){const [y,m]=key.split('-');return `${m}/${y}`;}
function monthKeyFromDate(value){const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function fullMonthLabel(key){const [y,m]=String(key).split('-').map(Number);return new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));}
function txRow(t){const row=document.createElement('div');row.className='row';const l=document.createElement('span');l.textContent=`${t.date||''} · ${t.text||'Buchung'}`;const v=document.createElement('span');v.className='v';v.textContent=`${Number(t.amount)>=0?'+':''}${eur(Number(t.amount)||0)}`;row.append(l,v);return row;}

export function expectedSalarySlots({today=new Date(),transactions=[],forecasts=[],payslips=[],learning=[],annualSpecialPayment=null}={}){
  let firstPayday=plannedPaydayForDate(today);
  const firstMonth=monthKeyFromDate(firstPayday);
  const salaryAlreadyBooked=(Array.isArray(transactions)?transactions:[]).some(t=>t?.type==='salary'&&String(t.date||'').slice(0,7)===firstMonth);
  if(salaryAlreadyBooked)firstPayday=nextPaydayFrom(firstPayday);
  const months=[monthKeyFromDate(firstPayday),monthKeyFromDate(nextPaydayFrom(firstPayday))];
  return months.map(payoutMonth=>{
    const forecast=(Array.isArray(forecasts)?forecasts:[]).find(f=>f?.payoutMonth===payoutMonth);
    const actual=(Array.isArray(payslips)?payslips:[]).find(p=>p?.month===payoutMonth);
    const learned=forecast?learnedPayoutForForecast(forecast,learning):null;
    const hasActual=Number.isFinite(Number(actual?.payout));
    const specialForMonth=annualSpecialPayment?.paymentMonth===payoutMonth?annualSpecialPayment:null;
    const actualIncludesSpecial=Boolean(hasActual&&Number.isFinite(Number(actual?.specialPaymentGross)));
    const specialNet=actualIncludesSpecial?0:(specialForMonth&&Number.isFinite(Number(specialForMonth.net))?Number(specialForMonth.net):0);
    const regularPayout=hasActual?Number(actual.payout):learned?.payout??null;
    return {
      payoutMonth,
      label:fullMonthLabel(payoutMonth),
      status:hasActual?'actual':forecast?'forecast':'outstanding',
      payout:regularPayout==null?null:money(regularPayout+specialNet),
      regularPayout,
      specialPayment:specialForMonth?{...specialForMonth,actual:actualIncludesSpecial,net:actualIncludesSpecial?null:(Number.isFinite(Number(specialForMonth.net))?Number(specialForMonth.net):null)}:null,
      rawPayout:forecast&&Number.isFinite(Number(forecast.payout))?Number(forecast.payout):null,
      reportMonth:forecast?.reportMonth||null,
      needsReview:Boolean(forecast?.needsReview||specialForMonth?.needsReview),
      learningApplied:Boolean(!hasActual&&learned?.applied),
      learningAdjustment:!hasActual&&learned?.applied?learned.adjustment:0
    };
  });
}

export function overviewAvailableAmount({budget={},giro=0,cash=0}={}){
  const total=Number(giro||0)+Number(cash||0);
  return budget.active?Number(budget.weeklyBudget||0):total;
}

export function createHistoryUi({budgetUi}={}){
  function renderExpectedSalaries(annualSpecialPayment=null){
    const wrap=$('ovExpectedSalaries');if(!wrap)return;
    const slots=expectedSalarySlots({today:new Date(),transactions:getTransactions(),forecasts:getSalaryForecasts(),payslips:getPayslips(),learning:getPayrollLearning(),annualSpecialPayment});
    wrap.innerHTML='';
    slots.forEach(slot=>{
      const row=document.createElement('div');row.className='expected-salary-row';
      const left=document.createElement('div');left.className='expected-salary-info';
      const title=document.createElement('strong');title.textContent=slot.label;
      const detail=document.createElement('span');detail.textContent=slot.status==='actual'
        ?'Bezügemitteilung vorhanden'
        :slot.status==='forecast'
          ?`Zeitnachweis ${slot.reportMonth?monthLabel(slot.reportMonth):'vorhanden'}${slot.learningApplied?' · lernkalibriert':''}${slot.needsReview?' · Bitte prüfen':''}`
          :'Zeitnachweis ausstehend';
      if(slot.specialPayment?.gross>0.005){
        detail.textContent+=` · Jahressonderzahlung ${eur(slot.specialPayment.gross)} brutto${slot.specialPayment.net!=null?' / '+eur(slot.specialPayment.net)+' netto':''}`;
      }
      left.append(title,detail);
      const value=document.createElement('div');value.className=`expected-salary-value ${slot.status==='outstanding'?'outstanding':'good'}`;
      value.textContent=slot.status==='outstanding'?'Ausstehend':eur(slot.payout);
      row.append(left,value);wrap.appendChild(row);
    });
  }
  function renderOverview(){
    const b=budgetUi.getBudget(),g=budgetUi.getGiro(),c=budgetUi.getCash(),available=overviewAvailableAmount({budget:b,giro:g,cash:c}),planned=plannedPaydayForDate(new Date());
    const vals={ovGiro:eur(g),ovCash:eur(c),ovAvailable:eur(available),ovCycle:b.active?`Budgetzyklus ${fmt(b.segmentStart)}–${fmt(b.segmentEnd)}`:'Kein aktiver Budgetzyklus',ovDaily:b.active?`Tagessatz ${eur(b.dailyBudget)}`:'Tagessatz –',ovNextPay:b.active?`Nächster Lohn ${fmt(b.nextPayday)}`:`Geplanter Lohn ${fmt(planned)}`};
    Object.entries(vals).forEach(([id,v])=>{if($(id))$(id).textContent=v;});
    if($('ovAvailableLabel'))$('ovAvailableLabel').textContent=b.active?'Wochenbudget':'Aktuell verfügbar';
    const payslips=getPayslips(),forecasts=getSalaryForecasts();
    const specialPaymentForecast=annualSpecialPaymentForecast({year:new Date().getFullYear(),payslips,forecasts});
    const actualSpecial=payslips.find(item=>item?.month===specialPaymentForecast.paymentMonth&&Number.isFinite(Number(item?.specialPaymentGross)));
    const specialPayment=actualSpecial
      ?{...specialPaymentForecast,gross:Number(actualSpecial.specialPaymentGross),actual:true,net:null,needsReview:false}
      :specialPaymentForecast;
    renderExpectedSalaries(specialPayment);
    if(!actualSpecial){
      calculateAnnualSpecialPaymentNet({forecast:specialPayment}).then(net=>{
        if(net)renderExpectedSalaries({...specialPayment,...net,net:net.payout});
      }).catch(error=>console.error('[annual-special-payment-overview]',error));
    }
    renderWithdrawalInfo(b);
  }
  function renderWithdrawalInfo(b){const today=new Date(),payday=b.nextPayday||plannedPaydayForDate(today),next=nextWithdrawalOrPayday(today,payday);const text=next?fmt(next):'–';const days=next?Math.max(0,Math.round((new Date(next.getFullYear(),next.getMonth(),next.getDate())-new Date(today.getFullYear(),today.getMonth(),today.getDate()))/86400000)):'–';if($('nextWithdrawalDate'))$('nextWithdrawalDate').textContent=text;if($('withdrawalDays'))$('withdrawalDays').textContent=days;}
  function renderHistory(){const tx=getTransactions().filter(relevant),savings=getSavings(),full=$('fullTxList');if(full){full.innerHTML='';const shown=tx.slice().reverse();if(!shown.length)full.innerHTML='<div class="note">Noch keine Kontobewegungen.</div>';else shown.forEach(t=>full.appendChild(txRow(t)));}
    const stats=monthlyStatistics(tx,savings,6),totals=transactionTotals(tx),savingStats=savingsStatistics(savings);
    const statVals={statIncome:eur(totals.income),statExpenses:eur(totals.expenses),statWithdrawals:eur(totals.withdrawals),statSaved:eur(savingStats.total)};Object.entries(statVals).forEach(([id,v])=>{if($(id))$(id).textContent=v;});
    const compare=$('monthlyCompare');if(compare){compare.innerHTML='';stats.forEach(m=>{const row=document.createElement('div');row.className='row';row.innerHTML=`<span>${monthLabel(m.month)}</span><span class="v">+${eur(m.income)} · −${eur(m.expenses)} · Sparen ${eur(m.saved)}</span>`;compare.appendChild(row);});if(!stats.length)compare.innerHTML='<div class="note">Noch keine Monatsdaten.</div>';}
    const chart=$('monthlyChart');if(chart){chart.innerHTML='';const max=Math.max(1,...stats.map(x=>Math.max(x.expenses,x.saved)));stats.forEach(x=>{const wrap=document.createElement('div');wrap.className='bar-wrap';wrap.innerHTML=`<div class="bar-value">${Math.round(x.expenses)} €</div><div class="bar" style="height:${Math.max(4,x.expenses/max*110)}px"></div><div class="bar-label">${monthLabel(x.month)}</div>`;chart.appendChild(wrap);});}
    const savingList=$('savingStats');if(savingList){savingList.innerHTML='';if(!savingStats.byPosition.length)savingList.innerHTML='<div class="note">Noch keine Sparpositionen mit reserviertem Betrag.</div>';else savingStats.byPosition.forEach(item=>{const row=document.createElement('div');row.className='row';row.innerHTML=`<span>${item.name}${item.deleted?' (gelöscht)':''}</span><span class="v">${eur(item.amount)}</span>`;savingList.appendChild(row);});}
  }
  function init(){}
  function render(){renderOverview();renderHistory();}
  return {init,render};
}
