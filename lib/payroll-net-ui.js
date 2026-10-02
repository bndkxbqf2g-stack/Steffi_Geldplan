const eur=value=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number.isFinite(Number(value))?Number(value):0);

function note(text,className='note'){
  const element=document.createElement('div');
  element.className=className;
  element.textContent=text;
  return element;
}

export function payrollNetEquation(data={}){
  const taxFree=Number(data.taxFreeNet);
  const taxable=Number(data.taxableNet);
  const total=Number(data.totalNet);
  if(![taxFree,taxable,total].every(Number.isFinite))return null;
  return {
    taxFree:Math.round(taxFree*100)/100,
    taxable:Math.round(taxable*100)/100,
    total:Math.round(total*100)/100,
    matches:Math.abs((taxFree+taxable)-total)<0.011
  };
}

function row(label,value,{strong=false,small=''}={}){
  const element=document.createElement('div');
  element.className='row';
  const left=document.createElement('span');
  if(strong){
    const title=document.createElement('b');
    title.textContent=label;
    left.appendChild(title);
  }else left.textContent=label;
  if(small){
    const detail=document.createElement('small');
    detail.textContent=small;
    left.appendChild(detail);
  }
  const right=document.createElement('span');
  right.className='v';
  right.textContent=value;
  element.append(left,right);
  return element;
}

export function appendPayrollNetBreakdown(card,item){
  const data=item?.netBreakdown;
  if(!card||!data||(data.taxFreeGross<=0&&data.taxableGross<=0&&data.totalNet==null))return;

  const heading=document.createElement('div');
  heading.className='payroll-control-group';
  heading.textContent='Nachzahlung netto';
  card.appendChild(heading);

  const summary=document.createElement('div');
  summary.className='mini-grid';
  for(const [label,value] of [
    ['Steuerfrei',data.taxFreeNet],
    ['Steuerpflichtig',data.taxableNet],
    ['Gesamt',data.totalNet]
  ]){
    const mini=document.createElement('div');
    mini.className='mini';
    const title=document.createElement('div');
    title.className='t';
    title.textContent=label;
    const amount=document.createElement('div');
    amount.className='n';
    amount.textContent=value==null?'–':eur(value);
    mini.append(title,amount);
    summary.appendChild(mini);
  }
  card.appendChild(summary);

  if(data.taxableGross>0){
    card.appendChild(row(
      'Steuerpflichtiger Rückstand',
      eur(data.taxableGross)+' brutto → '+(data.taxableNet==null?'–':eur(data.taxableNet)+' netto'),
      {small:'nach Steuer, SV, VBL und Pfändung'}
    ));
  }

  if(data.taxAndSvReduction!=null||data.vblDelta!=null||data.garnishmentDelta!=null){
    const parts=[];
    if(data.taxAndSvReduction!=null&&Math.abs(Number(data.taxAndSvReduction))>0.005)parts.push('Steuer/SV '+eur(data.taxAndSvReduction));
    if(data.vblDelta!=null&&Math.abs(Number(data.vblDelta))>0.005)parts.push('VBL '+eur(data.vblDelta));
    if(data.garnishmentDelta!=null&&Math.abs(Number(data.garnishmentDelta))>0.005)parts.push('Pfändung '+eur(data.garnishmentDelta));
    if(parts.length)card.appendChild(row('Zusätzliche Abzüge',parts.join(' · ')));
  }

  if(data.actualGarnishment!=null&&data.correctedGarnishment!=null){
    const delta=Number(data.garnishmentDelta)||0;
    card.appendChild(row(
      'Pfändung',
      eur(data.actualGarnishment)+' → '+eur(data.correctedGarnishment)+(Math.abs(delta)>0.005?' (+'+eur(delta)+')':''),
      {small:'Mehrpfändung ist im Netto bereits abgezogen.'}
    ));
  }

  if(data.shiftGross>0){
    const shiftType=data.shiftType||item.forecast?.components?.shiftType||'none';
    const shiftLabel=item.variableRows?.find(entry=>entry.key==='shift')?.label||(shiftType==='wechsel'?'Wechselschichtzulage':'Schichtzulage');
    card.appendChild(row(
      'davon '+shiftLabel,
      eur(data.shiftGross)+' brutto → '+(data.shiftNet==null?'–':eur(data.shiftNet)+' netto'),
      {small:'bereits im steuerpflichtigen Netto enthalten'}
    ));
  }

  const equation=payrollNetEquation(data);
  if(equation?.matches){
    card.appendChild(row(
      'Netto-Summe',
      eur(equation.taxFree)+' + '+eur(equation.taxable)+' = '+eur(equation.total),
      {strong:true}
    ));
  }

  if(data.correctedPayout!=null){
    const corrected=row(
      'Auszahlung nach Korrektur',
      eur(data.correctedPayout),
      {strong:true}
    );
    corrected.lastChild.classList.add('good');
    card.appendChild(corrected);
  }

  if(data.source==='legacy-summary-awaiting'){
    card.appendChild(note('Netto wird aus der aktuellen Abrechnung neu aufgebaut.','note payroll-alert'));
  }else if(data.source==='legacy-total'){
    card.appendChild(note('Für diesen alten Datensatz ist nur ein Gesamtwert sicher ableitbar.','note payroll-alert'));
  }
}

