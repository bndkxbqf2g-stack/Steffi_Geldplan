import {getFixedCosts,saveFixedCosts} from './storage.js';
import {normalizeFixedCosts,totalFixedCosts,addFixedCost,updateFixedCost,removeFixedCost} from './fixed-costs.js';
import {$,eur} from './ui.js';

export function createFixedCostsUi({refresh=()=>{}}={}){
  const get=()=>normalizeFixedCosts(getFixedCosts());
  const save=value=>saveFixedCosts(value);
  function render(){
    const list=$('fixItems'),items=get();if($('fixTotal'))$('fixTotal').textContent=eur(totalFixedCosts(items));if(!list)return;
    list.innerHTML='';items.forEach(item=>{const row=document.createElement('div');row.className='fix-item';
      const name=document.createElement('input');name.value=item.name;name.setAttribute('aria-label','Bezeichnung');
      const amount=document.createElement('input');amount.type='number';amount.step='.01';amount.min='0';amount.value=item.amount.toFixed(2);amount.setAttribute('aria-label','Betrag');
      const del=document.createElement('button');del.type='button';del.textContent='×';del.setAttribute('aria-label',`${item.name} löschen`);
      name.onchange=()=>{save(updateFixedCost(get(),item.id,{name:name.value}));refresh();};amount.onchange=()=>{save(updateFixedCost(get(),item.id,{amount:amount.value}));refresh();};del.onclick=()=>{save(removeFixedCost(get(),item.id));refresh();};
      row.append(name,amount,del);list.appendChild(row);
    });
  }
  function add(){save(addFixedCost(get()));refresh();}
  function init(){if(getFixedCosts()===null)save(get());if($('addFixBtn'))$('addFixBtn').onclick=add;}
  return {init,render,getTotal:()=>totalFixedCosts(get())};
}
