import {getSalaryForecasts,getPayslips,getPayrollLearning} from './storage.js';
import {buildPayrollControlHistory,buildPayrollCarryovers,payrollCarryoverRegularSollLabel,payrollCardDisplay,payrollProjectedPayout,payrollDisplayedNetDifference,payrollControlStatusLabel,visiblePayrollControls} from './payroll-control.js';
import {buildPayrollNetBreakdown} from './payroll-net-breakdown.js';
import {appendPayrollNetBreakdown} from './payroll-net-ui.js';
import {learnedPayoutForForecast} from './payroll-learning-calibration.js';

const $=id=>document.getElementById(id);
const eur=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number.isFinite(Number(v))?Number(v):0);
const value=v=>v==null?'–':eur(v);
const month=value=>{
  if(!value)return '–';
  const parts=String(value).split('-');
  return parts.length===2?parts[1]+'/'+parts[0]:String(value);
};
const badgeClass=status=>status==='ok'||status==='settled'?'good':status==='open'?'red':'warn';

function line(label,expected,actual,status,detail=''){
  const row=document.createElement('div');row.className='payroll-control-line';
  const a=document.createElement('span');a.textContent=label;
  if(detail){const small=document.createElement('small');small.textContent=detail;a.appendChild(small);}
  const b=document.createElement('span');b.textContent='Soll brutto '+value(expected);
  const c=document.createElement('span');c.textContent='Ist brutto '+(actual==null?'nicht eindeutig':value(actual));
  const d=document.createElement('strong');d.className=status==='ok'?'good':status==='open'||status==='different'?'red':'warn';
  d.textContent=status==='ok'?'✓':status==='different'?'Abweichung':status==='open'?'offen':'prüfen';
  row.append(a,b,c,d);return row;
}

function note(text,className='note'){
  const el=document.createElement('div');el.className=className;el.textContent=text;return el;
}

export function renderPayrollControl(){
  const wrap=$('payrollControlList'),status=$('payrollControlStatus');
  if(!wrap)return;
  const forecasts=getSalaryForecasts();
  const payslips=getPayslips();
  const learning=getPayrollLearning();
  const allControls=buildPayrollControlHistory({forecasts,payslips});
  const controls=visiblePayrollControls(allControls,3);
  const netContexts=new Map();
  const netByMonth={};
  for(const control of controls){
    const forecast=forecasts.find(entry=>entry.payoutMonth===control.payoutMonth);
    const actual=payslips.find(entry=>entry.month===control.payoutMonth)||{payout:control.actualPayout,hasPriorAdjustment:control.hasPriorAdjustment};
    const fallbackNetImpact=control.expectedPayout!=null&&control.actualPayout!=null&&control.remainingGross>0.005?Math.max(0,control.expectedPayout-control.actualPayout):null;
    try{
      const netBreakdown=buildPayrollNetBreakdown({forecast,actual,variableRows:control.variableRows,retro:control.retro,estimatedNetImpact:control.estimatedNetImpact??fallbackNetImpact});
      netContexts.set(control.payoutMonth,{forecast,actual,netBreakdown,error:null});
      if(Number.isFinite(Number(netBreakdown.totalNet))&&Number(netBreakdown.totalNet)>0.005)netByMonth[control.payoutMonth]=Number(netBreakdown.totalNet);
    }catch(error){
      console.error('[payroll-net-build]',control.payoutMonth,error);
      netContexts.set(control.payoutMonth,{forecast,actual,netBreakdown:null,error});
    }
  }
  const carryovers=buildPayrollCarryovers({controls,netByMonth});
  wrap.innerHTML='';
  if(!controls.length){
    wrap.appendChild(note('Noch keine gemeinsame Soll-/Ist-Grundlage. Zeitnachweis und Bezügemitteilung einlesen.','empty'));
    if(status)status.textContent='Noch keine vollständige Gehaltskontrolle möglich.';
    return;
  }
  const open=controls.filter(item=>item.status==='open'||item.status==='partial').length;
  const review=controls.filter(item=>item.status==='review'||item.needsReview).length;
  if(status)status.textContent=open?open+' der letzten drei Monate mit offenem Anspruch.':review?'Die letzten drei Monate enthalten Positionen zur Prüfung.':'Die letzten drei Prognosen/Checks sind vollständig prüfbar bzw. ausgeglichen.';

  for(const item of controls){
    const context=netContexts.get(item.payoutMonth);
    const forecast=context?.forecast;
    const netBreakdown=context?.netBreakdown;
    const learnedProjection=forecast?learnedPayoutForForecast(forecast,learning):null;
    const displayedExpectedPayout=item.status==='waiting'&&learnedProjection?.payout!=null?learnedProjection.payout:item.expectedPayout;
    const displayedNetDifference=payrollDisplayedNetDifference(item,netBreakdown);
    const card=document.createElement('div');card.className='payroll-control-card';
    const head=document.createElement('div');head.className='payroll-control-head';
    const title=document.createElement('div');const strong=document.createElement('b');strong.textContent=item.label;
    const sub=document.createElement('span');sub.textContent=item.reportMonth?'Zeitnachweis '+month(item.reportMonth)+' → Auszahlungsmonat':'Auszahlungsmonat';title.append(strong,sub);
    const badge=document.createElement('span');badge.className='badge '+badgeClass(item.status);badge.textContent=payrollControlStatusLabel(item.status);
    head.append(title,badge);card.appendChild(head);

    const display=payrollCardDisplay(item);
    const grid=document.createElement('div');grid.className='mini-grid';
    const summaryEntries=display.waiting
      ?[['Soll-Brutto',item.expectedGross],['Prognose Auszahlung',displayedExpectedPayout]]
      :[['Prognose Auszahlung',item.expectedPayout],['Tatsächlich ausgezahlt',item.actualPayout],['Netto-Differenz',displayedNetDifference]];
    for(const entry of summaryEntries){
      const mini=document.createElement('div');mini.className='mini';
      const t=document.createElement('div');t.className='t';t.textContent=entry[0];
      const n=document.createElement('div');n.className='n';n.textContent=value(entry[1]);
      if(entry[0]==='Netto-Differenz'&&Number(entry[1])<-1)n.classList.add('red');
      if(entry[0]==='Netto-Differenz'&&Number(entry[1])>1)n.classList.add('good');
      mini.append(t,n);grid.appendChild(mini);
    }
    card.appendChild(grid);

    if(!display.waiting){
      const grossRow=document.createElement('div');grossRow.className='row';
      const grossLabel=document.createElement('span');grossLabel.textContent='Brutto Soll / Ist / offen';
      const grossValue=document.createElement('span');grossValue.className='v';
      grossValue.textContent=value(item.expectedGross)+' / '+value(item.actualGross)+' / '+value(item.remainingGross);
      grossRow.append(grossLabel,grossValue);card.appendChild(grossRow);
      if(item.hasPriorAdjustment)card.appendChild(note('Die tatsächliche Auszahlung enthält eine Nachverrechnung aus Vormonaten. Die App trennt diese von der Kontrolle des regulären Monats.','note payroll-retro-note'));
    }

    const incoming=carryovers[item.payoutMonth]||[];
    if(incoming.length){
      const cg=document.createElement('div');cg.className='payroll-control-group';cg.textContent='Nachzahlung aus Vormonat';card.appendChild(cg);
      for(const carry of incoming){
        const r=document.createElement('div');r.className='row';
        const l=document.createElement('span');l.textContent=carry.sourceLabel;
        if(carry.gross!=null){
          const small=document.createElement('small');small.textContent=eur(carry.gross)+' brutto offen';l.appendChild(small);
        }
        const v=document.createElement('span');v.className='v good';v.textContent='+'+eur(carry.net)+' netto';
        r.append(l,v);card.appendChild(r);
      }
      const projected=payrollProjectedPayout({...item,expectedPayout:displayedExpectedPayout},incoming);
      if(projected!=null){
        const r=document.createElement('div');r.className='row';
        const l=document.createElement('span');const b=document.createElement('b');b.textContent='Auszahlung inkl. Nachzahlung';l.appendChild(b);
        const small=document.createElement('small');small.textContent=payrollCarryoverRegularSollLabel(item);l.appendChild(small);
        const v=document.createElement('span');v.className='v good';v.textContent=eur(projected);
        r.append(l,v);card.appendChild(r);
      }
    }

    if(display.waiting&&learnedProjection?.applied){
      const sign=learnedProjection.adjustment>=0?'+':'−';
      card.appendChild(note(`Lernkalibrierung aktiv: ${learnedProjection.observations} saubere Abrechnungen · Auszahlung ${sign}${eur(Math.abs(learnedProjection.adjustment))} gegenüber dem Rechenmodell.`,'note'));
    }else if(display.waiting&&learnedProjection?.observations===1){
      card.appendChild(note('Lernbasis: 1 saubere Bezügemitteilung. Ab 2 stabilen Soll-/Ist-Monaten kann die Auszahlung automatisch kalibriert werden.','note'));
    }
    const learned=learning.find(entry=>entry?.payoutMonth===item.payoutMonth);
    if(learned){
      const checks=[...(learned.rows||[]),...(learned.totals||[])].filter(entry=>entry?.comparable);
      const confirmed=checks.filter(entry=>entry.confirmed).length;
      const mismatches=checks.filter(entry=>!entry.confirmed).length;
      card.appendChild(note(
        mismatches
          ? `Lernprüfung: ${confirmed} Werte bestätigt, ${mismatches} Abweichung(en) erkannt. Berechnungsregeln werden dadurch nicht automatisch überschrieben.`
          : `Lernprüfung: ${confirmed} Soll-/Ist-Werte durch die Bezügemitteilung bestätigt.`,
        mismatches?'note payroll-alert':'note'
      ));
    }
    if(item.inferredMissingVariablePay)card.appendChild(note('Die festen Bezüge stimmen; die Bruttodifferenz entspricht den erwarteten variablen Bezügen. Die fehlenden Zuschläge/Zulage sind damit rechnerisch nachvollziehbar.','note payroll-alert'));
    if(netBreakdown){
      if(!item.hasDetailedForecast&&!['actual-payslip-summary','legacy-summary-recalculated'].includes(netBreakdown.source))card.appendChild(note('Für die komponentengenaue Kontrolle diesen Zeitnachweis einmal neu einlesen. Ältere gespeicherte Prognosen enthalten noch keine Einzelbestandteile.','note payroll-alert'));
      appendPayrollNetBreakdown(card,{...item,netBreakdown});
    }else if(context?.error){
      card.appendChild(note('Die Netto-Rückrechnung konnte für diesen Monat nicht geladen werden. Die Brutto-Kontrolle bleibt sichtbar.','note payroll-alert'));
    }

    if(display.detailed){
      const fixedIssues=item.fixedRows.filter(row=>row.status!=='ok');
      if(fixedIssues.length){
        const fg=document.createElement('div');fg.className='payroll-control-group';fg.textContent='Feste Bezüge';card.appendChild(fg);
        fixedIssues.forEach(row=>card.appendChild(line(row.label,row.expected,row.actual,row.status)));
      }

      const variableIssues=item.variableRows.filter(row=>row.status!=='ok'||row.retro>0||row.retroAggregate);
      if(variableIssues.length){
        const vg=document.createElement('div');vg.className='payroll-control-group';vg.textContent='Offene variable Bezüge';card.appendChild(vg);
        variableIssues.forEach(row=>{
          const el=line(row.label,row.expected,row.actual,row.status,row.tax);
          if(row.retro>0){
            const retro=document.createElement('em');retro.textContent='Rückrechnung +'+eur(row.retro);el.children[2].appendChild(retro);
          }else if(row.retroAggregate){
            const retro=document.createElement('em');retro.textContent='durch Gesamt-Rückrechnung ausgeglichen';el.children[2].appendChild(retro);
          }
          if(row.open!=null&&row.open>1)el.lastChild.textContent=eur(row.open)+' brutto offen';
          card.appendChild(el);
        });
      }
    }
    if(item.reviewRows?.length){
      const rg=document.createElement('div');rg.className='payroll-control-group';rg.textContent='Noch nicht automatisch berechenbar';card.appendChild(rg);
      item.reviewRows.forEach(row=>card.appendChild(note(row.label+(row.quantity?': '+row.quantity:'')+' · '+row.reason,'note payroll-alert')));
    }

    item.retro.forEach(r=>card.appendChild(note('Rückrechnung in '+month(r.paidWithMonth)+' für '+month(r.month)+': '+value(r.totalGross)+' Brutto'+(r.retroCount>1?' · zusammen mit weiteren Rückrechnungen':'')+'.','note payroll-retro-note')));

    if(item.exactRetroNet!=null){
      const row=document.createElement('div');row.className='row';
      const l=document.createElement('span');l.textContent='Tatsächlicher Nettoeffekt der Rückrechnung';
      const v=document.createElement('span');v.className='v good';v.textContent=eur(item.exactRetroNet);row.append(l,v);card.appendChild(row);
    }else if(item.retro.length&&item.status==='settled'){
      card.appendChild(note('Der Nettoeffekt ist in der aktuellen Bezügemitteilung nicht eindeutig diesem einen Altmonat zuordenbar. Die App zeigt deshalb keinen geratenen Nettobetrag.','note'));
    }else if(item.estimatedNetImpact!=null&&netBreakdown?.totalNet==null){
      const row=document.createElement('div');row.className='row';
      const l=document.createElement('span');l.textContent='Geschätzter Nettoeffekt des Soll-Zuschlags';
      const v=document.createElement('span');v.className='v';v.textContent=eur(item.estimatedNetImpact);row.append(l,v);card.appendChild(row);
    }

    if(item.unexpectedCurrentOverpayment>1)card.appendChild(note('Das Ist-Brutto liegt '+eur(item.unexpectedCurrentOverpayment)+' über dem berechneten Soll. Bitte zusätzliche oder unbekannte Bezüge prüfen.','note payroll-alert'));
    if(item.unexplainedOverCorrection>1)card.appendChild(note('Die Rückrechnung übersteigt die zuvor offene Bruttodifferenz um '+eur(item.unexplainedOverCorrection)+'. Bitte weitere Rückrechnungspositionen prüfen.','note payroll-alert'));
    wrap.appendChild(card);
  }
}
