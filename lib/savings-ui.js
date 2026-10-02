import {getSavings,saveSavings} from './storage.js';
import {createSavingsPosition,addSavingsPosition,createSavingsAllocation,addSavingsAllocation,reverseSavingsAllocation,activeSavingsPositions,savingsForSegment,maxSavingsForSegment} from './savings.js';
import {nextSegmentStart} from './cycle.js';
import {$,num,eur,dateKey,notify} from './ui.js';

export function createSavingsUi({budgetUi,refresh=()=>{}}={}){
  const today=()=>dateKey(new Date());
  const cleanName=value=>String(value||'').trim();
  const sameName=(a,b)=>a.localeCompare(b,'de',{sensitivity:'base'})===0;

  function render(){
    const data=getSavings(),list=$('savingsList');
    if(!list)return;
    const names=new Map((data.positions||[]).map(position=>[position.id,position.name]));
    const allocations=(data.allocations||[]).slice().reverse();
    list.innerHTML='';
    if(!allocations.length){list.innerHTML='<div class="empty">Noch nichts gespart.</div>';return;}
    allocations.forEach(allocation=>{
      const row=document.createElement('div');row.className='saving-history-row';
      const info=document.createElement('div');info.className='saving-history-info';
      const purpose=document.createElement('b');purpose.textContent=names.get(allocation.positionId)||'Sparen';
      const meta=document.createElement('span');meta.textContent=`${allocation.date||'ohne Datum'}${allocation.reversedAt?' · freigegeben':''}`;
      info.append(purpose,meta);
      const actions=document.createElement('div');actions.className='saving-history-actions';
      const amount=document.createElement('strong');amount.textContent=`${allocation.reversedAt?'':'+'}${eur(allocation.amount)}`;actions.appendChild(amount);
      if(!allocation.reversedAt){const undo=document.createElement('button');undo.type='button';undo.className='saving-action';undo.textContent='↩ Freigeben';undo.onclick=()=>undoAllocation(allocation);actions.appendChild(undo);}
      row.append(info,actions);list.appendChild(row);
    });
  }

  function ensurePosition(data,name){
    const existing=activeSavingsPositions(data).find(position=>sameName(position.name,name));
    if(existing)return {data,position:existing};
    const position=createSavingsPosition(name);
    return {data:addSavingsPosition(data,position),position};
  }

  function undoAllocation(allocation){
    if(!confirm(`${eur(allocation.amount)} wieder für dein Budget freigeben?`))return;
    saveSavings(reverseSavingsAllocation(getSavings(),allocation.id,today()));
    refresh();
  }

  function saveRate(){
    const amount=num('sSavingAmount'),purpose=cleanName($('sSavingPurpose')?.value),b=budgetUi.getBudget();
    if(!b.segmentStart)return notify('Kein aktiver Budgetabschnitt gefunden.',{type:'error'});
    if(!purpose)return notify('Bitte eingeben, wofür du sparst.',{type:'error'});
    if(amount<=0)return notify('Bitte einen positiven Sparbetrag eingeben.',{type:'error'});
    const segment=dateKey(b.segmentStart),current=getSavings(),already=savingsForSegment(current,segment),max=maxSavingsForSegment(b.weeklyBudget,budgetUi.getCash(),already);
    if(amount>max+0.009)return notify(`Für diesen Abschnitt kannst du maximal ${eur(max)} zusätzlich reservieren.`,{type:'error'});
    const next=nextSegmentStart(b.segmentStart,b.nextPayday)||b.nextPayday;
    try{
      const ensured=ensurePosition(current,purpose);
      const allocation=createSavingsAllocation({positionId:ensured.position.id,amount,date:today(),sourceSegmentStart:segment,effectiveFrom:dateKey(next)});
      saveSavings(addSavingsAllocation(ensured.data,allocation));
      $('sSavingPurpose').value='';$('sSavingAmount').value='';
      notify(`${eur(amount)} für „${purpose}“ reserviert.`,{type:'success'});refresh();
    }catch(error){notify(error.message||'Sparbetrag konnte nicht gespeichert werden.',{type:'error'});}
  }

  function init(){if($('savingRateBtn'))$('savingRateBtn').onclick=saveRate;}
  return {init,render};
}
