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
    if(forecast.paidRetroNet!=null)card.appendChild(row('Nachgezahlt netto für '+origin,eur(forecast.paidRetroNet),'tatsächliche Rückrechnungsperiode'));
  }
}

function renderNet(card,item,specialForMonth=null){
  const heading=document.createElement('div');
  heading.className='payroll-control-group';
  heading.textContent='Nettoeffekt';
  card.appendChild(heading);
  const net=item.netEffect||{};
  if(item.hasActualPayslip){
    card.appendChild(row('Nachzahlungen netto (bezahlt)',value(item.paidRetroNet),'Nur bei vollständigem Abgleich der Rückrechnungsperioden belegt'));
    card.appendChild(row('Noch offen netto',value(net.open),'0,00 € bedeutet: erfasste Zuschläge vollständig ausgeglichen'));
  }else{
    card.appendChild(row('Erwarteter Nettoeffekt Zuschläge',value(net.expected),'Prognose, nicht ausgezahlt'));
  }
  const totalLabel=item.hasActualPayslip?'Tatsächlich ausgezahlt netto':'Prognose Gesamtnetto inkl. Zuschlagswirkung';
  const combinedNet=item.totalNet==null?null:item.hasActualPayslip?item.actualPayout:
    specialForMonth&&specialForMonth.net==null?null:Number(item.totalNet)+(specialForMonth?.net||0);
  card.appendChild(row(totalLabel,value(combinedNet),item.hasActualPayslip?'Echte Bezügemitteilung, keine offenen Ansprüche addiert':'Prognose'));
  if(item.settlement?.rows?.length){
    for(const retro of item.settlement.rows){
      card.appendChild(row('Rückrechnung '+month(retro.month),value(retro.net),
        value(retro.gross)+' brutto · '+(retro.net==null?'Nettoaufteilung nicht bestätigt':'Netto nach belegter VBL')));
    }
    if(!item.settlement.netReconciled)card.appendChild(note('Bitte prüfen: Nettobeträge der Rückrechnungen sind nicht centgenau mit der gesamten Nachverrechnung abgestimmt oder Belege fehlen.','note payroll-alert'));
  }
  if(item.settlement?.average21Gross!=null)card.appendChild(row('Durchschnitt §21 TV-L (Ist)',value(item.settlement.average21Gross),'Aus Bezügemitteilung, nicht pauschal prognostiziert'));
  if(item.settlement?.grossOutsideForecast!=null&&Math.abs(item.settlement.grossOutsideForecast)>0.01){
    card.appendChild(row('Bruttoabweichung Ist zu Soll',value(item.settlement.grossOutsideForecast),'Zusätzliche bzw. abweichende Bezüge gesondert prüfen'));
  }
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
  const actualSpecial=payslips.find(item=>item?.month===annualForecast?.paymentMonth&&item?.payout!=null&&Number.isFinite(Number(item.payout)));
  const special=actualSpecial
    ?{...annualForecast,gross:actualSpecial.specialPaymentGross==null?null:Number(actualSpecial.specialPaymentGross),actual:true,net:null,needsReview:actualSpecial.specialPaymentGross==null}
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
    const expectedGross=item.expectedGross==null||specialForMonth&&specialForMonth.gross==null
      ?null:Number(item.expectedGross)+(specialForMonth?.gross||0);
    const projectedNet=item.hasActualPayslip?item.actualPayout:
      item.totalNet==null||specialForMonth&&specialForMonth.net==null
        ?null:Number(item.totalNet)+(specialForMonth?.net||0);
    const entries=[
      ['Soll-Brutto gesamt',expectedGross],
      [item.hasActualPayslip?'Tatsächliche Auszahlung':'Prognose Gesamtnetto',projectedNet],
      [item.hasActualPayslip?'Nachzahlungen netto (bezahlt)':'Nettoeffekt Zuschläge (Prognose)',item.hasActualPayslip?item.paidRetroNet:item.netEffect?.expected],
      [item.hasActualPayslip?'Noch offen netto':'Noch nicht abgerechnet',item.hasActualPayslip?item.netEffect?.open:null]
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
