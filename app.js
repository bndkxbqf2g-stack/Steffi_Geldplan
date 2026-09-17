const STORAGE_KEY='geldplan-v34-state';
const EUR=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'});
const pct=23.1/38.5;
const fixed=[
  ['Tabellenentgelt','2302.25'],
  ['Pflegezulage','54.00'],
  ['Vorweggewährung § 16 TV-L','233.90'],
  ['Universitätszulage Pflege','98.11'],
  ['Praxisanleiterzulage','54.89']
];
function el(id){return document.getElementById(id)}
function num(id){return Number(el(id)?.value)||0}
function eur(v){return EUR.format(Number(v)||0)}
function getState(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}}
function saveState(){const state={}; document.querySelectorAll('input,select').forEach(x=>{if(x.id){state[x.id]=x.type==='checkbox'?x.checked:x.value}}); localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function loadState(){const s=getState(); Object.entries(s).forEach(([id,v])=>{const x=el(id);if(!x)return;if(x.type==='checkbox')x.checked=!!v;else x.value=v})}
function renderFixed(){
  const wrap=el('fixedRows'); wrap.innerHTML='';
  fixed.forEach(([name,val])=>{const r=document.createElement('div');r.className='row';r.innerHTML=`<span>${name}</span><span class="v">${eur(Number(val))}</span>`;wrap.appendChild(r)});
  const gross=fixed.reduce((s, [,v])=>s+Number(v),0);el('fixedGross').textContent=eur(gross);el('dashBrutto').textContent=eur(gross);el('dashNetto').textContent=eur(num('lNettoBase'));el('dashPct').textContent=(pct*100).toFixed(1).replace('.',',')+' %';
  el('pctText').textContent=(pct*100).toFixed(1).replace('.',',')+' %';el('pctText2').textContent=(pct*100).toFixed(1).replace('.',',')+' %';
  el('wechselPart').textContent=eur(250*pct);el('shiftPart').textContent=eur(100*pct);
  el('nettoBaseOut').textContent=eur(num('lNettoBase'));
  const d=el('dashComponents');d.innerHTML='';fixed.forEach(([name,val])=>{const r=document.createElement('div');r.className='row';r.innerHTML=`<span>${name}</span><span class="v">${eur(Number(val))}</span>`;d.appendChild(r)});
}
function calcSalary(){
  const add=(el('useWechsel').checked?250*pct:0)+(el('useShift').checked?100*pct:0);
  el('netExtra').textContent=eur(add*num('lNetFactor'));
  el('planNetto').textContent=eur(num('lNettoBase')+add*num('lNetFactor'));
  const total=['vNight','vSunday','vHoliday','vSaturday','vOvertime','vOther'].reduce((s,id)=>s+num(id),0);el('variableTotal').textContent=eur(total);
}
function getExpenses(){try{return JSON.parse(localStorage.getItem('v34-expenses')||'[]')}catch{return[]}}
function saveExpenses(a){localStorage.setItem('v34-expenses',JSON.stringify(a))}
function renderExpenses(){
 const a=getExpenses();const w=el('expenseList');w.innerHTML='';
 a.forEach(x=>{const d=document.createElement('div');d.className='expense';d.innerHTML=`<input value="${escapeHtml(x.name)}" data-id="${x.id}" data-role="name"><input type="number" step=".01" value="${x.amount}" data-id="${x.id}" data-role="amount"><button class="danger" data-del="${x.id}">×</button>`;w.appendChild(d)});
 const total=a.reduce((s,x)=>s+Number(x.amount),0);el('expenseTotal').textContent=eur(total);el('bFix').value=total?total.toFixed(2):el('bFix').value;calcBudget();
}
function renderSpecials(){
 const a=getSpecials();const w=el('specialList');w.innerHTML='';
 a.sort((x,y)=>String(y.date).localeCompare(String(x.date))).forEach(x=>{const d=document.createElement('div');d.className='row';d.innerHTML=`<span><b>${eur(x.amount)}</b><br><span class="note">${x.date} · ${escapeHtml(x.category)}${x.text?' · '+escapeHtml(x.text):''}</span></span><button class="danger" data-special-del="${x.id}">Löschen</button>`;w.appendChild(d)});
 el('specialTotal').textContent=eur(a.reduce((s,x)=>s+Number(x.amount),0));calcBudget();
}
function getSpecials(){try{return JSON.parse(localStorage.getItem('v34-specials')||'[]')}catch{return[]}}
function saveSpecials(a){localStorage.setItem('v34-specials',JSON.stringify(a))}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function calcBudget(){const net=num('bNetto'),fix=getExpenses().reduce((s,x)=>s+Number(x.amount),0),save=num('bSave'),days=Math.max(1,num('bDays')),special=getSpecials().reduce((s,x)=>s+Number(x.amount),0);el('bRest').textContent=eur(net-fix);const rest=net-fix-save-special;el('bRestSave').textContent=eur(rest);el('bDay').textContent=eur(rest/days);const week=rest/days*7;el('bWeek').textContent=eur(week);const target=num('bTarget');el('bDiff').textContent=target?(week-target>=0?'+':'')+eur(week-target):'–';}
function calcSavings(){const m=num('saveMonths')||12;const items=[['Vacation','sVacationStart','sVacationRate','saveVacation'],['Car','sCarStart','sCarRate','saveCar'],['Other','sOtherStart','sOtherRate','saveOther']];let monthly=0,total=0;items.forEach(([,,rate,out])=>{monthly+=num(rate);});items.forEach(([,start,rate,out])=>{const value=num(start)+num(rate)*m;total+=value;el(out).textContent=eur(value)});el('saveMonthly').textContent=eur(monthly);el('saveForecast').textContent=eur(total)}
function calcAll(){renderFixed();calcSalary();calcBudget();calcSavings();saveState()}

document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));el(b.dataset.tab).classList.remove('hidden')}));

document.getElementById('addExpense').addEventListener('click',()=>{const name=el('expenseName').value.trim(),amount=num('expenseAmount');if(!name)return;const a=getExpenses();a.push({id:Date.now(),name,amount});saveExpenses(a);el('expenseName').value='';el('expenseAmount').value='';renderExpenses();saveState();});
el('expenseList').addEventListener('change',e=>{const id=Number(e.target.dataset.id);if(!id)return;const a=getExpenses();const item=a.find(x=>x.id===id);if(!item)return;if(e.target.dataset.role==='name')item.name=e.target.value;if(e.target.dataset.role==='amount')item.amount=Number(e.target.value)||0;saveExpenses(a);renderExpenses();saveState()});
el('expenseList').addEventListener('click',e=>{const id=Number(e.target.dataset.del);if(!id)return;saveExpenses(getExpenses().filter(x=>x.id!==id));renderExpenses();saveState()});
el('addSpecial').addEventListener('click',()=>{const amount=num('specialAmount');if(amount<=0)return;const a=getSpecials();a.push({id:Date.now(),amount,date:el('specialDate').value||new Date().toISOString().slice(0,10),category:el('specialCategory').value,text:el('specialText').value.trim()});saveSpecials(a);el('specialAmount').value='';el('specialText').value='';renderSpecials();saveState()});
el('specialList').addEventListener('click',e=>{const id=Number(e.target.dataset.specialDel);if(!id)return;saveSpecials(getSpecials().filter(x=>x.id!==id));renderSpecials();saveState()});

document.querySelectorAll('input,select').forEach(x=>x.addEventListener('input',calcAll));
document.getElementById('resetApp').addEventListener('click',()=>{if(confirm('Alle persönlichen Eingaben dieser App löschen?')){localStorage.removeItem(STORAGE_KEY);localStorage.removeItem('v34-expenses');localStorage.removeItem('v34-specials');location.reload()}});
document.getElementById('exportData').addEventListener('click',()=>{const payload={version:'v34',created:new Date().toISOString(),fields:getState(),expenses:getExpenses(),specials:getSpecials()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mein-geldplan-v34-daten.json';a.click();URL.revokeObjectURL(a.href)});
loadState();renderExpenses();renderSpecials();calcAll();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
