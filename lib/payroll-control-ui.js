import {getSalaryForecasts,getPayslips} from './storage.js';
import {buildPayrollMonthlyControls,payrollMonthlyStatusLabel} from './payroll-monthly-control.js';

const $=id=>document.getElementById(id);
const eur=value=>Number.isFinite(Number(value))?new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(value)):'–';
const month=value=>{
  const raw=String(value||'');
  const parts=raw.split('-');
  return parts.length===2?parts[1]+'/'+parts[0]:raw||'–';
};
const value=amount=>amount==null?'–':eur(amount);
const statusClass=status=>status==='ok'||status==='settled'?'good':status==='open'||status==='partial'?'red':'warn';

function note(text,className='note'){
  const element=document.createElement('div');
  element.className=className;
  element.textContent=text;
  return element;
}

function row(label,content,small=''){
  const element=document.createElement('div');
  element.className='row';
  const left=document.createElement('span');
  left.textContent=label;
  if(small){
    const detail=document.createElement('small');
    detail.textContent=small;
    left.appendChild(detail);
  }
  const right=document.createElement('span');
  right.className='v';
  right.textContent=content;
  element.append(left,right);
  return element;
}

function metricRow(label,metric){
  const expected=value(metric?.expected);
  const considered=value(metric?.considered);
  const open=value(metric?.open);
  return row(label,expected+' / '+considered+' / '+open,'erwartet / berücksichtigt / offen');
}

function monthTitle(item){
  const title=item.paymentMonth?month(item.paymentMonth):'Unbekannter Zahlungsmonat';
  return 'Auszahlungsmonat '+title;
}

function renderOrigins(card,item){
  const heading=document.createElement('div');
  heading.className='payroll-control-group';
  heading.textContent='Herkunft je Leistungsmonat';
  card.appendChild(heading);
  if(!item.forecasts?.length){
    card.appendChild(note('Für diesen Zahlungsmonat liegt noch kein passender Zeitnachweis vor.','note payroll-alert'));
    return;
  }
  for(const forecast of item.forecasts){
    const origin=month(forecast.originMonth);
    const regular=month(forecast.regularPayoutMonth);
    const actual=item.actualPaymentMonth?month(item.actualPaymentMonth):'ausstehend';
    const detail='Leistung '+origin+' · regulär '+regular+' · tatsächlich '+actual;
    const gross=forecast.expectedGross==null?'Brutto offen':eur(forecast.expectedGross)+' Soll-Brutto';
    const surcharge=forecast.expectedSurcharges>0.005?' · '+eur(forecast.expectedSurcharges)+' Zuschläge':'';
    card.appendChild(row('Leistungsmonat '+origin,gross+surcharge,detail+' · '+forecast.source));
  }
}

function renderNet(card,item){
  const heading=document.createElement('div');
  heading.className='payroll-control-group';
  heading.textContent='Nettoeffekt';
  card.appendChild(heading);
  const net=item.netEffect||{};
  const effectLabel=net.status==='berechnet'?'Tatsächlich berechneter Nettoeffekt':net.status==='prognostiziert'?'Geschätzter Nettoeffekt':'Nettoeffekt offen';
  card.appendChild(row(effectLabel,value(net.open??net.expected??null),'erwartet / offen'));
  const totalLabel=item.hasActualPayslip?'Gesamtnetto inkl. Zuschlags- und Nachzahlungswirkung':'Prognose Gesamtnetto inkl. Zuschlagswirkung';
  card.appendChild(row(totalLabel,value(item.totalNet),item.netEffectStatus==='berechnet'?'Bezügemitteilung plus offene Netto-Wirkung':'aus Prognosewerten'));
}

function renderReviewRows(card,item){
  if(!item.reviewRows?.length)return;
  const heading=document.createElement('div');
  heading.className='payroll-control-group';
  heading.textContent='Unsichere Positionen';
  card.appendChild(heading);
  for(const review of item.reviewRows){
    const detail=review.quantity==null?'':String(review.quantity);
    card.appendChild(note(review.status+' · '+review.label+(detail?' · '+detail:'')+' · '+review.reason,'note payroll-alert'));
  }
}

function renderHints(card,item){
  const hints=(item.hints||[]).filter(text=>!String(text).startsWith('UNSICHER/PRÜFEN'));
  for(const hint of hints)card.appendChild(note(hint,'note payroll-retro-note'));
}

export function renderPayrollControl(){
  const wrap=$('payrollControlList');
  const statusElement=$('payrollControlStatus');
  if(!wrap)return;
  const controls=buildPayrollMonthlyControls({
    forecasts:getSalaryForecasts(),
    payslips:getPayslips(),
    limit:3
  });
  wrap.innerHTML='';
  if(!controls.length){
    wrap.appendChild(note('Noch keine gemeinsame Soll-/Ist-Grundlage. Zeitnachweis und Bezügemitteilung einlesen.','empty'));
    if(statusElement)statusElement.textContent='Noch keine vollständige Gehaltskontrolle möglich.';
    return;
  }
  const open=controls.filter(item=>item.status==='open'||item.status==='partial').length;
  const review=controls.filter(item=>item.status==='review').length;
  if(statusElement){
    statusElement.textContent=open
      ?open+' Zahlungsmonat(e) mit offenem Anspruch.'
      :review
        ?'Die letzten Zahlungsmonate enthalten Positionen zur Prüfung.'
        :'Die letzten Zahlungsmonate sind vollständig prüfbar bzw. ausgeglichen.';
  }
  for(const item of controls){
    const card=document.createElement('div');
    card.className='payroll-control-card';
    const head=document.createElement('div');
    head.className='payroll-control-head';
    const title=document.createElement('div');
    const strong=document.createElement('b');
    strong.textContent=monthTitle(item);
    const sub=document.createElement('span');
    sub.textContent=item.regularPayoutMonths?.length
      ?'Regulär '+item.regularPayoutMonths.map(month).join(' · ')
      :'Zahlungsmonat';
    title.append(strong,sub);
    const badge=document.createElement('span');
    badge.className='badge '+statusClass(item.status);
    badge.textContent=payrollMonthlyStatusLabel(item.status);
    head.append(title,badge);
    card.appendChild(head);

    const grid=document.createElement('div');
    grid.className='mini-grid';
    const entries=[
      ['Soll-Brutto gesamt',item.expectedGross],
      [item.hasActualPayslip?'Tatsächliche Auszahlung':'Prognose Gesamtnetto',item.hasActualPayslip?item.actualPayout:item.totalNet],
      [item.hasActualPayslip?'Gesamtnetto inkl. offen':'Nettoeffekt geschätzt',item.hasActualPayslip?item.totalNet:item.netEffect?.expected]
    ];
    for(const entry of entries){
      const mini=document.createElement('div');
      mini.className='mini';
      const label=document.createElement('div');
      label.className='t';
      label.textContent=entry[0];
      const amount=document.createElement('div');
      amount.className='n';
      amount.textContent=value(entry[1]);
      mini.append(label,amount);
      grid.appendChild(mini);
    }
    card.appendChild(grid);

    card.appendChild(row('Auszahlungsmonat',month(item.paymentMonth),item.actualPaymentMonth?'tatsächliche Bezügemitteilung vorhanden':'Abrechnung ausstehend'));
    card.appendChild(row('Soll-Brutto',value(item.gross?.expected),'festes Monatsentgelt nur einmal angesetzt'));
    card.appendChild(metricRow('Gesamtzuschläge',item.totalSurcharges));
    card.appendChild(metricRow('Steuerfreie Zuschläge',item.taxFree));
    card.appendChild(metricRow('Steuerpflichtige Zuschläge',item.taxable));
    renderNet(card,item);
    renderOrigins(card,item);
    renderReviewRows(card,item);
    renderHints(card,item);
    wrap.appendChild(card);
  }
}
