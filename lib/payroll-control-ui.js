import {getSalaryForecasts,getPayslips} from './storage.js';
import {buildPayrollMonthlyControls,payrollMonthlyStatusLabel} from './payroll-monthly-control.js';
import {annualSpecialPaymentForecast,calculateAnnualSpecialPaymentNet} from './annual-special-payment.js';

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
  if(!annualSpecialPayment&&!actualSpecial){
    calculateAnnualSpecialPaymentNet({forecast:special}).then(net=>{
      if(net)renderPayrollControl({annualSpecialPayment:{...special,...net,net:net.payout}});
    }).catch(error=>console.error('[annual-special-payment-control]',error));
  }
}

function renderNet(card,item,specialForMonth=null){
  const heading=document.createElement('div');
  heading.className='payroll-control-group';
  heading.textContent='Nettoeffekt';
  card.appendChild(heading);
  const net=item.netEffect||{};
  const effectLabel=net.status==='berechnet'?'Tatsächlich berechneter Nettoeffekt':net.status==='prognostiziert'?'Geschätzter Nettoeffekt':'Nettoeffekt offen';
  card.appendChild(row(effectLabel,value(net.open??net.expected??null),'erwartet / offen'));
  const totalLabel=item.hasActualPayslip?'Gesamtnetto inkl. Zuschlags- und Nachzahlungswirkung':'Prognose Gesamtnetto inkl. Zuschlagswirkung';
  const combinedNet=item.hasActualPayslip?item.totalNet:Number(item.totalNet||0)+(specialForMonth?.net||0);
  card.appendChild(row(totalLabel,value(combinedNet),item.netEffectStatus==='berechnet'?'Bezügemitteilung plus offene Netto-Wirkung':'aus Prognosewerten'));
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

function renderAnnualOnlyCard(wrap,special){
  const card=document.createElement('div');
  card.className='payroll-control-card';
  const head=document.createElement('div');
  head.className='payroll-control-head';
  const title=document.createElement('div');
  const strong=document.createElement('b');
  strong.textContent='Auszahlungsmonat '+month(special.paymentMonth);
  const sub=document.createElement('span');
  sub.textContent='Jahressonderzahlung · Referenz Juli–September';
  title.append(strong,sub);
  const badge=document.createElement('span');
  badge.className='badge warn';
  badge.textContent=special.actual?'Ist-Abrechnung vorhanden':'Prognose';
  head.append(title,badge);
  card.appendChild(head);
  const gross=special.gross;
  const net=special.net;
  const grid=document.createElement('div');
  grid.className='mini-grid';
  for(const [label,amount] of [['Sonderzahlung brutto',gross],['Sonderzahlung netto',net]]){
    const mini=document.createElement('div');mini.className='mini';
    const t=document.createElement('div');t.className='t';t.textContent=label;
    const n=document.createElement('div');n.className='n';n.textContent=value(amount);
    mini.append(t,n);grid.appendChild(mini);
  }
  card.appendChild(grid);
  card.appendChild(row('Status',special.actual?'Bezügemitteilung mit Sonderzahlung erkannt':'Noch keine Bezügemitteilung · Betrag prognostiziert',special.source||''));
  card.appendChild(row('Bemessung',special.referenceMonths.map(item=>month(item.month)+' · '+value(item.gross)).join(' · ')));
  card.appendChild(note(special.needsReview?'Referenzmonat(e) fehlen; Fixentgelt-Schätzung bleibt als Prognose markiert.':'Referenzmonate vollständig belegt.','note payroll-alert'));
  wrap.appendChild(card);
}

export function renderPayrollControl({annualSpecialPayment=null}={}){

  const wrap=$('payrollControlList');
  const statusElement=$('payrollControlStatus');
  if(!wrap)return;
  const forecasts=getSalaryForecasts(),payslips=getPayslips();
  const controls=buildPayrollMonthlyControls({forecasts,payslips,limit:3});
  const annualForecast=annualSpecialPayment||annualSpecialPaymentForecast({year:new Date().getFullYear(),payslips,forecasts});
  const actualSpecial=payslips.find(item=>item?.month===annualForecast?.paymentMonth&&Number.isFinite(Number(item?.specialPaymentGross)));
  const special=actualSpecial
    ?{...annualForecast,gross:Number(actualSpecial.specialPaymentGross),actual:true,net:null,needsReview:false}
    :annualForecast;
  wrap.innerHTML='';
  if(!controls.length){
    if(special?.gross>0.005){
      renderAnnualOnlyCard(wrap,special);
      if(statusElement)statusElement.textContent='Jahressonderzahlung wird separat prognostiziert.';
      if(!annualSpecialPayment&&!actualSpecial)calculateAnnualSpecialPaymentNet({forecast:special}).then(net=>{if(net)renderPayrollControl({annualSpecialPayment:{...special,...net,net:net.payout}});}).catch(error=>console.error('[annual-special-payment-control]',error));
      return;
    }
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
    const specialForMonth=special?.paymentMonth===item.paymentMonth?special:null;
    const expectedGross=Number(item.expectedGross||0)+(specialForMonth?.gross||0);
    const projectedNet=item.hasActualPayslip?item.actualPayout:Number(item.totalNet||0)+(specialForMonth?.net||0);
    const totalNet=item.hasActualPayslip?item.totalNet:Number(item.totalNet||0)+(specialForMonth?.net||0);
    const entries=[
      ['Soll-Brutto gesamt',expectedGross],
      [item.hasActualPayslip?'Tatsächliche Auszahlung':'Prognose Gesamtnetto',projectedNet],
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
    card.appendChild(row('Soll-Brutto',value(expectedGross),'festes Monatsentgelt nur einmal angesetzt'+(specialForMonth?' · Jahressonderzahlung enthalten':'')));
    if(specialForMonth?.gross>0.005){
      card.appendChild(row(specialForMonth.actual?'Jahressonderzahlung (Ist)':'Jahressonderzahlung',specialForMonth.net!=null?value(specialForMonth.gross)+' brutto · '+value(specialForMonth.net)+' netto':value(specialForMonth.gross)+' brutto',specialForMonth.source||'Referenz Juli–September'));
    }
    card.appendChild(metricRow('Gesamtzuschläge',item.totalSurcharges));
    card.appendChild(metricRow('Steuerfreie Zuschläge',item.taxFree));
    card.appendChild(metricRow('Steuerpflichtige Zuschläge',item.taxable));
    renderNet(card,item,specialForMonth);
    renderOrigins(card,item);
    renderReviewRows(card,item);
    renderHints(card,item);
    wrap.appendChild(card);
  }
  if(!annualSpecialPayment&&!actualSpecial){
    calculateAnnualSpecialPaymentNet({forecast:special}).then(net=>{
      if(net)renderPayrollControl({annualSpecialPayment:{...special,...net,net:net.payout}});
    }).catch(error=>console.error('[annual-special-payment-control]',error));
  }
}
