import {getFixedCosts,saveFixedCosts} from './storage.js';
import {normalizeFixedCosts,totalFixedCosts,addFixedCost,updateFixedCost,removeFixedCost} from './fixed-costs.js';
import {$,eur} from './ui.js';

function node(tag,className,text){
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(text!==undefined)element.textContent=text;
  return element;
}

export function createFixedCostsUi({refresh=()=>{}}={}){
  const get=()=>normalizeFixedCosts(getFixedCosts());
  const save=value=>saveFixedCosts(value);

  function renderSummary(items){
    const summary=$('fixSummary');
    if(!summary)return;
    summary.innerHTML='';
    const active=items.filter(item=>!item.paused);
    const paused=items.filter(item=>item.paused);
    const cards=[
      {label:'Aktiv pro Monat',value:eur(totalFixedCosts(items)),note:'Wird beim Lohnbuchen abgezogen.',primary:true,id:'fixTotal'},
      {label:'Aktive Positionen',value:String(active.length),note:active.length===1?'Wird berücksichtigt.':'Werden berücksichtigt.'},
      {label:'Pausiert',value:String(paused.length),note:paused.length?'Derzeit nicht abgezogen.':'Keine pausierten Positionen.'}
    ];
    for(const card of cards){
      const element=node('div',`fix-summary-card${card.primary?' fix-summary-primary':''}`);
      const label=node('span','label',card.label);
      const value=node('strong','',card.value);
      if(card.id)value.id=card.id;
      const note=node('small','',card.note);
      element.append(label,value,note);
      summary.appendChild(element);
    }
  }

  function renderItem(item){
    const card=node('article',`fix-item-card${item.paused?' is-paused':''}`);
    const row=node('div','fix-item');
    const identity=node('div','fix-item-identity');
    const icon=node('span','fix-item-icon',(String(item.name||'F').trim().slice(0,1)||'F').toLocaleUpperCase('de-DE'));
    icon.setAttribute('aria-hidden','true');

    const nameField=node('label','fix-field');
    nameField.appendChild(node('span','','Bezeichnung'));
    const name=node('input','fix-name-input');
    name.type='text';name.value=item.name;name.autocomplete='off';
    name.setAttribute('aria-label',`Bezeichnung für ${item.name}`);
    name.onchange=()=>{
      save(updateFixedCost(get(),item.id,{name:name.value}));
      refresh();
    };
    nameField.appendChild(name);
    identity.append(icon,nameField);

    const amountField=node('label','fix-field');
    amountField.appendChild(node('span','','Monatlicher Betrag'));
    const amount=node('input','fix-amount-input');
    amount.type='number';amount.step='.01';amount.min='0';amount.inputMode='decimal';amount.value=item.amount.toFixed(2);
    amount.setAttribute('aria-label',`Monatlicher Betrag für ${item.name} in Euro`);
    amountField.appendChild(amount);
    amount.onchange=()=>{
      save(updateFixedCost(get(),item.id,{amount:amount.value}));
      refresh();
    };

    const actions=node('div','fix-item-actions');
    const pause=node('button','fix-action-button fix-pause-button',item.paused?'Fortsetzen':'Pausieren');
    pause.type='button';
    pause.setAttribute('aria-label',`${item.name} ${item.paused?'fortsetzen':'pausieren'}`);
    pause.onclick=()=>{
      save(updateFixedCost(get(),item.id,{paused:!item.paused}));
      refresh();
    };
    const del=node('button','fix-action-button fix-delete','×');
    del.type='button';
    del.setAttribute('aria-label',`${item.name} löschen`);
    del.onclick=()=>{
      save(removeFixedCost(get(),item.id));
      refresh();
    };
    actions.append(pause,del);
    row.append(identity,amountField,actions);
    card.appendChild(row);
    return card;
  }

  function render(){
    const list=$('fixItems'),items=get();
    renderSummary(items);
    if(!list)return;
    list.innerHTML='';
    const active=items.filter(item=>!item.paused);
    const paused=items.filter(item=>item.paused);
    if(active.length){
      active.forEach(item=>list.appendChild(renderItem(item)));
    }else{
      list.appendChild(node('div','fix-item-empty','Noch keine aktiven Fixkosten. Füge eine Position hinzu oder setze eine pausierte fort.'));
    }
    if(paused.length){
      const group=node('details','fix-paused-group');
      const heading=node('summary','fix-paused-heading');
      heading.append(node('span','',`Pausiert · ${paused.length} ${paused.length===1?'Position':'Positionen'}`));
      heading.appendChild(node('span','fix-paused-caption','Derzeit nicht im Lohnabzug'));
      const pausedList=node('div','fix-list fix-paused-list');
      paused.forEach(item=>pausedList.appendChild(renderItem(item)));
      group.append(heading,pausedList);
      list.appendChild(group);
    }
  }

  function add(){save(addFixedCost(get()));refresh();}
  function init(){
    if(getFixedCosts()===null)save(get());
    for(const id of ['addFixBtn','addFixMobileBtn']){
      if($(id))$(id).onclick=add;
    }
  }
  return {init,render,getTotal:()=>totalFixedCosts(get())};
}
