(function(){
function $(id){return document.getElementById(id);} 
function num(id){var e=$(id);if(!e)return 0;var v=parseFloat(String(e.value||"").replace(",","."));return Number.isFinite(v)?v:0;}
function eur(v){return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(Number.isFinite(v)?v:0);}
function fmt(d){return new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(d);}
function dateKey(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function addDays(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x;}
function easter(y){var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da);}
function holidays(y){var e=easter(y),a=[dateKey(new Date(y,0,1)),dateKey(new Date(y,0,6)),dateKey(new Date(y,4,1)),dateKey(new Date(y,9,3)),dateKey(new Date(y,10,1)),dateKey(new Date(y,11,25)),dateKey(new Date(y,11,26))];[-2,1,39,50,60].forEach(function(n){a.push(dateKey(addDays(e,n)));});return a;}
function isBankDay(d){return d.getDay()!==0&&d.getDay()!==6&&holidays(d.getFullYear()).indexOf(dateKey(d))===-1;}
function lastBankDay(y,m){var d=new Date(y,m+1,0);while(d.getMonth()===m&&!isBankDay(d))d.setDate(d.getDate()-1);d.setHours(20,30,0,0);return d;}
function nextLastBankDayAfter(d){var y=d.getFullYear(),m=d.getMonth()+1;if(m>11){m=0;y++;}return lastBankDay(y,m);}
function upcomingPayDate(){var now=new Date(),d=lastBankDay(now.getFullYear(),now.getMonth());return now<=d?d:lastBankDay(now.getFullYear(),now.getMonth()+1);}
function txs(){try{var a=JSON.parse(localStorage.getItem("meinGeldplanGiroTx")||"[]");return Array.isArray(a)?a:[];}catch(e){return[];}}
function saveTx(a){try{localStorage.setItem("meinGeldplanGiroTx",JSON.stringify(a));}catch(e){}}
function ensureBase(){var a=txs();if(!a.some(function(t){return t.type==="base";})){a.unshift({id:"base",type:"base",amount:0,date:dateKey(new Date()),text:"Ausgangskontostand"});saveTx(a);}}
function base(){var t=txs().find(function(x){return x.type==="base";});return t?Number(t.amount)||0:0;}
function currentGiro(){return base()+txs().filter(function(t){return t.type!=="base";}).reduce(function(s,t){return s+(Number(t.amount)||0);},0);}
function cashBalance(){try{var v=parseFloat(localStorage.getItem("meinGeldplanCash")||"0");return Number.isFinite(v)?Math.max(0,v):0;}catch(e){return 0;}}
function saveCash(v){try{localStorage.setItem("meinGeldplanCash",String(Math.max(0,Number(v)||0)));}catch(e){}}
function latestSalary(){var a=txs().filter(function(t){return t.type==="salary";});if(!a.length)return null;return a[a.length-1];}
function activeCycleKey(){
 var s=latestSalary();
 return s?String(s.cycle||('salary-'+s.id)):'pre-salary-'+dateKey(new Date());
}
function currentCyclePayDate(){
 var s=latestSalary(), upcoming=upcomingPayDate();
 if(!s)return upcoming;
 var sd=new Date((s.date||dateKey(new Date()))+'T20:30:00');
 var next=nextLastBankDayAfter(sd);
 return new Date()<sd?sd:next;
}
function nextPayDateForCycle(){
 var s=latestSalary();
 if(!s)return upcomingPayDate();
 var d=new Date((s.date||dateKey(new Date()))+'T20:30:00');
 return nextLastBankDayAfter(d);
}
function daysBetweenDates(from,to){var a=new Date(from.getFullYear(),from.getMonth(),from.getDate()),b=new Date(to.getFullYear(),to.getMonth(),to.getDate());return Math.max(0,Math.round((b-a)/86400000));}
function remainingPayDays(){
 var now=new Date(), pay=currentCyclePayDate();
 return Math.max(1,daysBetweenDates(now,pay));
}
function lastWithdrawal(){var a=txs().filter(function(t){return t.type==='withdrawal';});return a.length?a[a.length-1]:null;}
function nextWithdrawalDate(){
 var today=new Date();
 var dow=today.getDay();
 var delta=(7-dow)%7;
 // Sonntag selbst bedeutet: der aktuelle 7-Tage-Zyklus endet am nächsten Sonntag.
 return addDays(new Date(today.getFullYear(),today.getMonth(),today.getDate()),delta===0?7:delta);
}
function daysUntilNextWithdrawal(){
 var n=nextWithdrawalDate();
 return n?daysBetweenDates(new Date(),n):7;
}
function currentCycleDaysLeft(){
 return Math.max(1,daysUntilNextWithdrawal());
}
function weeklyGiroBudget(){
 var giro=currentGiro();
 return {day:giro/7,week:giro,cycleDays:7};
}
function daysToFollowingSundayFrom(d){
 var dow=d.getDay(),delta=(7-dow)%7;
 return delta===0?7:delta;
}
function firstWithdrawalSuggested(available){
 var payDays=remainingPayDays(), t=new Date(), days=daysToFollowingSundayFrom(t);
 return payDays>0?Math.max(0,available/payDays*Math.min(days,payDays)):0;
}
function regularWithdrawalSuggested(available){
 var payDays=remainingPayDays();
 return payDays>0?Math.max(0,available/payDays*Math.min(7,payDays)):Math.max(0,available);
}
var DEFAULT_FIX=[
 {id:"gemuese",name:"Gemüsebox",amount:27},
 {id:"konto",name:"Kontoführung",amount:8},
 {id:"miete",name:"Miete",amount:685},
 {id:"auto-backup",name:"Auto Backup",amount:60},
 {id:"lebensmittel",name:"Lebensmittel",amount:200},
 {id:"urlaub-backup",name:"Urlaub Backup",amount:60},
 {id:"d-ticket",name:"D-Ticket",amount:63},
 {id:"netflix",name:"Netflix",amount:2.50},
 {id:"kfw",name:"KfW-Zinsen",amount:33.15},
 {id:"gothaer",name:"Gothaer Versicherung",amount:19},
 {id:"gez-haftpflicht",name:"GEZ / Haftpflicht Rücklage",amount:12},
 {id:"hausrat",name:"Hausratversicherung",amount:3},
 {id:"deka",name:"Deka Sparplan",amount:115},
 {id:"fitness",name:"Fitnessstudio",amount:60},
 {id:"internet",name:"Internet",amount:17.50},
 {id:"strom",name:"Strom",amount:39},
 {id:"chatgpt",name:"ChatGPT",amount:7.99},
 {id:"amazon",name:"Amazon",amount:8.99},
 {id:"icloud",name:"iCloud",amount:2.99}
];
function sameOldDefault(a){return Array.isArray(a)&&a.length===4&&Number(a[0].amount)===60&&String(a[1].name)==="Apple Speicher"&&Number(a[1].amount)===1&&String(a[2].name)==="Kontoführung"&&Number(a[2].amount)===6&&Number(a[3].amount)===2089;}
function fixItems(){try{var raw=localStorage.getItem("meinGeldplanFixItems");var a=raw?JSON.parse(raw):null;if(sameOldDefault(a)){var migrated=DEFAULT_FIX.map(function(x){return {id:x.id,name:x.name,amount:x.amount};});saveFixItems(migrated);return migrated;}if(Array.isArray(a)&&a.length)return a;}catch(e){}return DEFAULT_FIX.map(function(x){return {id:x.id,name:x.name,amount:x.amount};});}
function saveFixItems(a){try{localStorage.setItem("meinGeldplanFixItems",JSON.stringify(a));}catch(e){}}
function fixTotal(){return fixItems().reduce(function(s,x){return s+(Number(x.amount)||0);},0);}
function renderFixItems(){var box=$("fixItems");if(!box)return;var a=fixItems();box.innerHTML="";a.forEach(function(item,idx){var wrap=document.createElement("div");wrap.className="fix-item";var amount=Number(item.amount)||0;wrap.innerHTML='<input class="fix-name" data-idx="'+idx+'" type="text" value="'+String(item.name).replace(/&/g,"&amp;").replace(/"/g,"&quot;")+'"><input class="fix-amount" data-idx="'+idx+'" type="number" step=".01" min="0" value="'+(amount?amount.toFixed(2):'')+'"><button type="button" class="removeFix" data-idx="'+idx+'">×</button>';box.appendChild(wrap);});
 box.querySelectorAll("input").forEach(function(el){el.addEventListener("input",function(){var i=Number(el.dataset.idx),arr=fixItems();if(!arr[i])return;if(el.classList.contains("fix-name"))arr[i].name=el.value;else arr[i].amount=numValue(el.value);saveFixItems(arr);var total=arr.reduce(function(s,x){return s+(Number(x.amount)||0);},0);if($("fixTotal"))$("fixTotal").textContent=eur(total);});});
 box.querySelectorAll(".removeFix").forEach(function(btn){btn.addEventListener("click",function(){var arr=fixItems();arr.splice(Number(btn.dataset.idx),1);saveFixItems(arr);renderFixItems();refresh();});});
 var total=fixTotal();if($("fixTotal"))$("fixTotal").textContent=eur(total);if($("monthlyFix")){if(document.activeElement!==$("monthlyFix"))$("monthlyFix").value=total.toFixed(2);}
}
function numValue(v){var n=parseFloat(String(v).replace(",","."));return Number.isFinite(n)?n:0;}
function addFixItem(){var a=fixItems();a.push({id:"f"+Date.now()+Math.random(),name:"Neue Fixkosten",amount:0});saveFixItems(a);renderFixItems();}
function bookTransaction(amount,text,type,meta){var a=txs(),t={id:Date.now()+Math.random(),type:type,amount:amount,date:dateKey(new Date()),text:text};if(meta)Object.keys(meta).forEach(function(k){t[k]=meta[k];});a.push(t);saveTx(a);return t;}

function updateBudget(){
 var giro=currentGiro(),cash=cashBalance(),available=giro+cash,payDays=remainingPayDays(),nextPay=currentCyclePayDate(),nextW=nextWithdrawalDate();
 var daysW=currentCycleDaysLeft();
 var cycleBudget=weeklyGiroBudget();
 if($('mainGiro'))$('mainGiro').textContent=eur(giro);
 if($('mainCash'))$('mainCash').textContent=eur(cash);
 if($('mainAvailable'))$('mainAvailable').textContent=eur(available);
 if($('mainNextPay'))$('mainNextPay').textContent=fmt(nextPay)+' 20:30';
 if($('mainDays'))$('mainDays').textContent=daysW;
 if($('mainDay'))$('mainDay').textContent=eur(cycleBudget.day);
 if($('mainWeek'))$('mainWeek').textContent=eur(cycleBudget.week);
 if($('budgetNote'))$('budgetNote').textContent='Tagessatz und Wochensatz basieren nur auf dem aktuellen Girokontostand und gelten für den nächsten 7-Tage-Zyklus bis zum nächsten Sonntag. Zusatzausgaben und Bargeldabhebungen werden separat gebucht und verringern das Girokonto jeweils nur dann, wenn sie erfasst werden.';
 renderFixItems();
}
function savingsEntries(){
 try{var a=JSON.parse(localStorage.getItem('meinGeldplanSavings')||'[]');return Array.isArray(a)?a:[];}catch(e){return[];}
}
function saveSavings(a){try{localStorage.setItem('meinGeldplanSavings',JSON.stringify(a));}catch(e){}}
function totalSavings(){return savingsEntries().reduce(function(sum,entry){return sum + (Number(entry.amount)||0);},0);}
function renderSavings(){
 var box=$('savingsList');
 if(!box)return;
 var a=savingsEntries().slice().reverse();
 if(!a.length){box.innerHTML='<div class="empty">Noch keine Sparbuchungen.</div>';return;}
 var rows='';
 a.forEach(function(entry){rows+='<div class="row"><span><span class="badge neutral">Sparen</span> '+esc(entry.text||'Wöchentlicher Sparbetrag')+'<br><span class="note">'+esc(entry.date||'')+'</span></span><span class="v good">+'+eur(Number(entry.amount)||0)+'</span></div>'});
 box.innerHTML=rows;
 if($('savingsTotal'))$('savingsTotal').textContent=eur(totalSavings());
}
function renderTx(){
 var a=txs().filter(function(t){return t.type!=='base';}).slice().reverse();
 ["fullTxList","ovRecent"].forEach(function(id){var list=$(id);if(!list)return;list.innerHTML="";var arr=id==="ovRecent"?a.slice(0,5):a;
  if(!arr.length){list.innerHTML='<div class="empty">Noch keine Kontobewegungen.</div>';return;}
  arr.forEach(function(t){var r=document.createElement("div");r.className="row";var l=document.createElement("span");var typeLabel=t.type==="salary"?"Lohn":t.type==="income"?"Eingang":t.type==="expense"?"Ausgabe":t.type==="fixedcost"?"Fixkosten":t.type==="withdrawal"?"Abhebung":t.type==="saving"?"Sparen":"Korrektur";var badge=t.type==="expense"||t.type==="fixedcost"||t.type==="saving"?"badge red":t.type==="salary"||t.type==="income"?"badge green":"badge neutral";l.innerHTML='<span class="'+badge+'">'+typeLabel+'</span> '+esc(t.text||"Buchung")+'<br><span class="note">'+esc(t.date||"")+'</span>';var v=document.createElement("span");v.className="v"+(Number(t.amount)<0?' red':' good');v.textContent=(Number(t.amount)>=0?"+":"")+eur(Number(t.amount)||0);r.appendChild(l);r.appendChild(v);list.appendChild(r);});
 });
}

function monthlyStats(){
 var map={};function bucket(k){if(!map[k])map[k]={income:0,expenses:0,fixed:0,net:0,count:0};return map[k];}
 txs().forEach(function(t){if(t.type==="base")return;var d=new Date((t.date||dateKey(new Date()))+'T12:00:00'),key=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"),b=bucket(key),amt=Number(t.amount)||0;b.count++;
  if(t.type==="salary"||t.type==="income")b.income+=Math.max(0,amt);
  if(t.type==="expense")b.expenses+=Math.abs(Math.min(0,amt));
  if(t.type==="fixedcost")b.fixed+=Math.abs(Math.min(0,amt));
  if(t.type!=="withdrawal")b.net+=amt;
 });
 return Object.keys(map).sort().map(function(k){return {key:k,data:map[k]};});
}
function renderMonthlyCompare(){
 var box=$("monthlyCompare");if(!box)return;var arr=monthlyStats();if(!arr.length){box.innerHTML='<div class="empty">Noch keine Monatsdaten vorhanden.</div>';return;}
 var last=arr[arr.length-1],prev=arr.length>1?arr[arr.length-2]:null;
 function card(label,cur,old){var delta=old==null?null:cur-old,cls=delta==null?'':delta>0?' good':delta<0?' red':'',ds=delta==null?'–':(delta>0?'+':'')+eur(delta);return '<div class="kpi"><div class="label">'+label+'</div><div class="value">'+eur(cur)+'</div>'+(delta==null?'':'<div class="note '+cls+'">vs. Vormonat '+ds+'</div>')+'</div>';}
 box.innerHTML='<div class="forecast-card"><div class="forecast-head"><span><b>'+esc(formatMonth(Number(last.key.slice(0,4)),Number(last.key.slice(5))-1))+'</b></span><span class="badge neutral">Aktueller Monat</span></div><div class="kpi-grid" style="margin-top:10px">'+card('Einnahmen',last.data.income,prev?prev.data.income:null)+card('Zusätzliche Ausgaben',last.data.expenses,prev?prev.data.expenses:null)+card('Fixkosten',last.data.fixed,prev?prev.data.fixed:null)+card('Nettoveränderung',last.data.net,prev?prev.data.net:null)+'</div></div>';
 if(prev)box.innerHTML+='<div class="forecast-card"><div class="forecast-head"><span><b>'+esc(formatMonth(Number(prev.key.slice(0,4)),Number(prev.key.slice(5))-1))+'</b></span><span class="badge neutral">Vormonat</span></div><div class="note">Einnahmen '+eur(prev.data.income)+' · zusätzliche Ausgaben '+eur(prev.data.expenses)+' · Fixkosten '+eur(prev.data.fixed)+' · Nettoveränderung '+eur(prev.data.net)+'</div></div>';
}
function renderMonthlyChart(){
 var box=$("monthlyChart");if(!box)return;var arr=monthlyStats().slice(-6);if(!arr.length){box.innerHTML='<div class="empty">Noch keine Monatsdaten.</div>';return;}var max=Math.max.apply(null,arr.map(function(x){return Math.max(x.data.income,x.data.expenses+x.data.fixed,1);}));
 box.innerHTML=arr.map(function(x){var y=Number(x.key.slice(0,4)),m=Number(x.key.slice(5))-1,d=x.data,h=Math.max(5,Math.round((Math.max(d.income,d.expenses+d.fixed)/max)*125));return '<div class="bar-wrap"><div class="bar-value">'+eur(d.net)+'</div><div class="bar" title="Einnahmen '+eur(d.income)+' · Ausgaben '+eur(d.expenses+d.fixed)+'" style="height:'+h+'px"></div><div class="bar-label">'+monthName(m).slice(0,3)+' '+String(y).slice(2)+'</div></div>';}).join('');
}
function renderOverview(){
 var giro=currentGiro(),cash=cashBalance(),available=giro+cash,payDays=remainingPayDays(),next=nextWithdrawalDate(),cycle=activeCycleKey();
 var cycleBudget=weeklyGiroBudget();
 var cycleExp=txs().filter(function(t){return t.type==='expense'&&t.cycle===cycle;}).reduce(function(s,t){return s+Math.abs(Number(t.amount)||0);},0);
 if($("ovAvailable"))$("ovAvailable").textContent=eur(available);if($("ovGiro"))$("ovGiro").textContent=eur(giro);if($("ovCash"))$("ovCash").textContent=eur(cash);if($("ovNextPay"))$("ovNextPay").textContent='Nächster Lohn: '+fmt(currentCyclePayDate());if($("ovPayDays"))$("ovPayDays").textContent=payDays+' Tage';if($("ovDay"))$("ovDay").textContent=eur(cycleBudget.day);if($("ovWeek"))$("ovWeek").textContent=eur(cycleBudget.week);if($("ovNextWithdraw"))$("ovNextWithdraw").textContent=fmt(next);if($("ovFix"))$("ovFix").textContent=eur(fixTotal());if($("ovCycleExpenses"))$("ovCycleExpenses").textContent=eur(cycleExp);if($("ovCashKpi"))$("ovCashKpi").textContent=eur(cash);if($("ovSalaryCount"))$("ovSalaryCount").textContent=txs().filter(function(t){return t.type==='salary';}).length;
 var s=latestSalary(),pct=0;if(s){var sd=new Date((s.date||dateKey(new Date()))+'T12:00:00'),pd=currentCyclePayDate(),total=Math.max(1,daysBetweenDates(sd,pd)),elapsed=Math.max(0,Math.min(total,daysBetweenDates(sd,new Date())));pct=(elapsed/total)*100;}if($("ovProgress"))$("ovProgress").style.width=pct.toFixed(1)+'%';if($("ovProgressText"))$("ovProgressText").textContent=Math.round(pct)+' % vergangen';
}
function openTab(name){document.querySelectorAll('.tab').forEach(function(x){x.classList.toggle('active',x.dataset.tab===name);});document.querySelectorAll('.view').forEach(function(v){v.classList.add('hidden');});var t=$(name);if(t)t.classList.remove('hidden');if(name==='verlauf'){renderTx();renderMonthlyCompare();renderMonthlyChart();}if(name==='prognose'){renderForecastTable();renderPayslipComparison();}}
function exportData(){
 var filename='mein-geldplan-backup-'+dateKey(new Date())+'.json',data={app:'Mein Geldplan',version:36,exportedAt:new Date().toISOString(),giroTransactions:txs(),cash:cashBalance(),fixItems:fixItems(),savings:savingsEntries(),timeReports:loadReports(),payslips:loadPayslips(),exactCalculation:loadExactCalculation()},blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);if($("backupStatus"))$("backupStatus").textContent='Sicherung erstellt: '+filename;
}
function importData(){var inp=$("importFile");if(!inp||!inp.files||!inp.files[0]){alert('Bitte zuerst eine Sicherungsdatei auswählen.');return;}var file=inp.files[0],reader=new FileReader();reader.onload=function(){try{var data=JSON.parse(reader.result);if(!data||!Array.isArray(data.giroTransactions)||!Array.isArray(data.fixItems)||!Array.isArray(data.timeReports))throw new Error('Ungültige Sicherungsdatei.');if(!confirm('Gespeicherte App-Daten wirklich durch diese Sicherung ersetzen?'))return;localStorage.setItem('meinGeldplanGiroTx',JSON.stringify(data.giroTransactions));localStorage.setItem('meinGeldplanCash',String(Math.max(0,Number(data.cash)||0)));localStorage.setItem('meinGeldplanFixItems',JSON.stringify(data.fixItems));localStorage.setItem('meinGeldplanSavings',JSON.stringify(Array.isArray(data.savings)?data.savings:[]));localStorage.setItem('meinGeldplanTimeReports',JSON.stringify(data.timeReports));localStorage.setItem('meinGeldplanPayslips',JSON.stringify(Array.isArray(data.payslips)?data.payslips:[]));localStorage.setItem('meinGeldplanExactCalculation',JSON.stringify(data.exactCalculation&&typeof data.exactCalculation==='object'?data.exactCalculation:{}));if($("backupStatus"))$("backupStatus").textContent='Daten erfolgreich wiederhergestellt. Die App wird neu geladen.';setTimeout(function(){location.reload();},500);}catch(e){alert('Wiederherstellung fehlgeschlagen: '+e.message);}};reader.readAsText(file);}

function renderCycleExpenses(){var list=$("cycleExpenseList");if(!list)return;list.innerHTML="";var c=activeCycleKey();var a=txs().filter(function(t){return t.type==="expense"&&t.cycle===c;}).slice().reverse();if(!a.length){list.innerHTML='<div class="note">Keine zusätzlichen Ausgaben im laufenden Lohnzyklus.</div>';return;}var total=0;a.forEach(function(t){total+=Math.abs(Number(t.amount)||0);var r=document.createElement("div");r.className="row";var l=document.createElement("span");l.textContent=(t.date||"")+" · "+(t.text||"Ausgabe");var v=document.createElement("span");v.className="v red";v.textContent=eur(Math.abs(Number(t.amount)||0));r.appendChild(l);r.appendChild(v);list.appendChild(r);});var rr=document.createElement("div");rr.className="row";rr.innerHTML='<span><b>Zusätzliche Ausgaben im Zyklus</b></span><span class="v">'+eur(total)+'</span>';list.appendChild(rr);}
function addIncome(){var v=num("giroIncome");if(v<=0){alert("Bitte einen positiven Zahlungseingang eingeben.");return;}bookTransaction(v,$("giroText").value.trim()||"Zahlungseingang","income",{cycle:activeCycleKey()});$("giroIncome").value="";$("giroText").value="";refresh();}
function fixedCostAlreadyBooked(cycle){return txs().some(function(t){return t.type==="fixedcost"&&t.cycle===cycle;});}
function addSalary(){
 var v=num('salaryAmount');
 if(v<=0){alert('Bitte den Nettolohn eingeben.');return;}
 var now=new Date(),cycle='salary-'+dateKey(now),fix=fixTotal();
 bookTransaction(v,$('salaryText').value.trim()||'Lohn','salary',{cycle:cycle});
 if(fix>0&&!fixedCostAlreadyBooked(cycle))bookTransaction(-fix,'Fixkosten automatisch abgezogen','fixedcost',{cycle:cycle});
 $('salaryAmount').value='';$('salaryText').value='';refresh();
}
function addExpense(){var v=num("giroExpense");if(v<=0){alert("Bitte einen positiven Ausgabebetrag eingeben.");return;}bookTransaction(-v,$("giroText").value.trim()||"Ausgabe","expense",{cycle:activeCycleKey()});$("giroExpense").value="";$("giroText").value="";refresh();}
function addSaving(){var v=num("weeklySaveAmount");if(v<=0){alert("Bitte einen positiven Sparbetrag eingeben.");return;}var text=$("weeklySaveText").value.trim()||"Wöchentliches Sparen";var entries=savingsEntries();entries.push({id:String(Date.now()+Math.random()),amount:v,date:dateKey(new Date()),text:text});saveSavings(entries);bookTransaction(-v,text,"saving",{cycle:activeCycleKey()});$("weeklySaveAmount").value="";$("weeklySaveText").value="";refresh();}
function withdraw(){var v=num("sWithdrawAmount"),g=currentGiro();if(v<=0){alert("Bitte einen Abhebebetrag eingeben.");return;}if(v>g){alert("Der Abhebebetrag ist höher als dein Girokontostand.");return;}bookTransaction(-v,"Bargeldabhebung","withdrawal",{cycle:activeCycleKey()});saveCash(cashBalance()+v);$("sWithdrawAmount").value="";refresh();}
function sunday(){
 var konto=currentGiro(),cash=cashBalance(),available=konto+cash,pay=remainingPayDays();
 var cycleBudget=weeklyGiroBudget();
 var suggested=cycleBudget.week;
 var next=nextWithdrawalDate();
 if($('bCarryCash')&&document.activeElement!==$('bCarryCash'))$('bCarryCash').value=cash>0?cash.toFixed(2):'';
 if($('sTotal'))$('sTotal').textContent=eur(available);
 if($('sGiro'))$('sGiro').textContent=eur(konto);
 if($('sCash'))$('sCash').textContent=eur(cash);
 if($('sSuggested'))$('sSuggested').textContent=eur(suggested);
 if($('sAfter'))$('sAfter').textContent=eur(konto-num('sWithdrawAmount'));
 if($('nextWithdrawalDate'))$('nextWithdrawalDate').textContent=next?fmt(next):'–';
 if($('withdrawalDays'))$('withdrawalDays').textContent=daysUntilNextWithdrawal();
 if($('withdrawalHint'))$('withdrawalHint').textContent='Der 7-Tage-Zyklus gilt für das aktuelle Giroguthaben und wird bis zum nächsten Sonntag geführt. Bargeld und Sparen bleiben separat sichtbar und beeinflussen das Girokonto nur über eine Buchung.';
}
// Historisch aus den hochgeladenen Bezügemitteilungen kalibriert.
// Wir verwenden das tatsächlich ausgewiesene Regel-Netto als Basis und
// schätzen nur die variablen Zeitbezüge. Das ist stabiler als ein grober
// Brutto->Netto-Faktor.
var PAYROLL_CALIBRATION={
  employmentRate:0.60,
  effectiveFullTimeSalary:4468.47,
  fixedAllowancesFromOct:207.00,
  // Dokumentierte laufende Abrechnung Juni bis August 2026:
  // KR 8 / Stufe 3 bei 60 % + Pflegezulage + Vorweggewährung + Universitätszulage + Praxisanleiterzulage.
  documentedCurrent:{gross:2743.15,legalNet:1933.37},
  // Ab 01.10.2026: tarifliche Stufe 4, Vorweggewährung +2 => effektive Berechnungsstufe 6.
  // Tabellenentgelt KR 8 / Stufe 6: 4.468,47 € Vollzeit -> 2.681,08 € bei 60 %.
  // Feste Zulagen aus den vorliegenden Abrechnungen: Pflege 54,00 € + Uni 98,11 € + Praxisanleitung 54,89 €.
  fromOct2026:{gross:0,legalNet:1991.00},
  // Historisch kalibrierter Nettanteil für variable steuer-/SV-pflichtige Bestandteile.
  taxableExtraNetRate:0.482,
  average21Rate:7.63,
  nightSurchargeRate:4.58,
  sundaySurchargeRate:5.73,
  saturdayRate:0.64
};
PAYROLL_CALIBRATION.fromOct2026.gross=Math.round((PAYROLL_CALIBRATION.effectiveFullTimeSalary*PAYROLL_CALIBRATION.employmentRate+PAYROLL_CALIBRATION.fixedAllowancesFromOct)*100)/100;
var PAYROLL_PROFILE={
  employer:'Uniklinik Würzburg',
  tariff:'KR 8',
  contractualStep:'Stufe 4',
  effectiveStep:'Stufe 6',
  advanceSteps:2,
  taxClass:'I',
  churchTax:false,
  children:0,
  healthInsurance:'AOK Bayern',
  garnishment:false,
  insolvency:false
};
function estimatedRegularNetFromGross(gross){
  if(!(gross>0))return 0;
  return gross*(PAYROLL_CALIBRATION.documentedCurrent.legalNet/PAYROLL_CALIBRATION.documentedCurrent.gross);
}
function payrollBaseForReport(rep){
  var pm=payoutMonthFor(Number(rep.year)||0,Number(rep.month)||0);
  var idx=pm.year*12+pm.month, oct2026=2026*12+9;
  if(idx>=oct2026)return {gross:PAYROLL_CALIBRATION.fromOct2026.gross,legalNet:PAYROLL_CALIBRATION.fromOct2026.legalNet,historical:false};
  return {gross:PAYROLL_CALIBRATION.documentedCurrent.gross,legalNet:PAYROLL_CALIBRATION.documentedCurrent.legalNet,historical:true};
}


var reportStore=[];
var lastParsedReport=null;
var MONTHS={Jan:0,Feb:1,"Mär":2,Mar:2,Apr:3,Mai:4,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Okt:9,Oct:9,Nov:10,Dez:11,Dec:11};
function loadReports(){try{var a=JSON.parse(localStorage.getItem('meinGeldplanTimeReports')||'[]');return Array.isArray(a)?a:[];}catch(e){return[];}}
function saveReports(a){reportStore=a;try{localStorage.setItem('meinGeldplanTimeReports',JSON.stringify(a));}catch(e){}}
function loadPayslips(){try{var a=JSON.parse(localStorage.getItem('meinGeldplanPayslips')||'[]');return Array.isArray(a)?a:[];}catch(e){return[];}}
function savePayslips(a){try{localStorage.setItem('meinGeldplanPayslips',JSON.stringify(a));}catch(e){}}
function loadExactCalculation(){try{var v=JSON.parse(localStorage.getItem('meinGeldplanExactCalculation')||'{}');return v&&typeof v==='object'?v:{};}catch(e){return {};}}
function saveExactCalculation(v){try{localStorage.setItem('meinGeldplanExactCalculation',JSON.stringify(v));}catch(e){}}
function recalculateExactNet(){
 var gross=num('calcGross'),taxFree=num('calcTaxFree'),tax=num('calcTax'),health=num('calcHealth'),care=num('calcCare'),pension=num('calcPension'),unemployment=num('calcUnemployment'),other=num('calcOther'),deductions=tax+health+care+pension+unemployment+other,net=gross+taxFree-deductions;
 if($('calcGrossOut'))$('calcGrossOut').textContent=eur(gross+taxFree);
 if($('calcDeductionsOut'))$('calcDeductionsOut').textContent=eur(deductions);
 if($('calcNetOut'))$('calcNetOut').textContent=eur(net);
}
function initExactCalculator(){
 var ids=['calcGross','calcTaxFree','calcTax','calcHealth','calcCare','calcPension','calcUnemployment','calcOther'],saved=loadExactCalculation();
 ids.forEach(function(id){var el=$(id);if(!el)return;if(saved[id]!=null)el.value=saved[id];el.addEventListener('input',function(){var values=loadExactCalculation();ids.forEach(function(key){var field=$(key);if(field)values[key]=field.value;});saveExactCalculation(values);recalculateExactNet();});});
 recalculateExactNet();
}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function parseMoney(v){return parseFloat(String(v||'').replace(/\./g,'').replace(',','.'))||0;}
function monthName(m){return ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'][m];}
function payoutMonthFor(y,m){var d=new Date(y,m,1);d.setMonth(d.getMonth()+2);return {year:d.getFullYear(),month:d.getMonth()};}
function formatMonth(y,m){return monthName(m)+' '+y;}
function reportMonthFromLines(lines){
  for(var i=0;i<Math.min(lines.length,18);i++){
    var s=lines[i];
    var m=s.match(/\b(Jan|Feb|Mär|Mar|Apr|Mai|May|Jun|Jul|Aug|Sep|Okt|Oct|Nov|Dez|Dec)\s+(\d{2})\b/i);
    if(m){var key=m[1].replace(/^\s+|\s+$/g,'');var mo=MONTHS[key[0].toUpperCase()+key.slice(1)] ; if(mo==null){var lk=key[0].toUpperCase()+key.slice(1);mo=MONTHS[lk];} if(mo!=null)return {year:2000+Number(m[2]),month:mo};
    }
  }
  return null;
}
function groupPdfText(items){
  var arr=items.filter(function(x){return x.str&&x.str.trim();}).map(function(x){return {str:x.str.trim(),x:x.transform[4],y:x.transform[5]};});
  arr.sort(function(a,b){return b.y-a.y||a.x-b.x;});
  var groups=[];
  arr.forEach(function(it){var g=groups.find(function(z){return Math.abs(z.y-it.y)<2.5;});if(!g){g={y:it.y,items:[]};groups.push(g);}g.items.push(it);});
  groups.sort(function(a,b){return b.y-a.y;});
  return groups.map(function(g){g.items.sort(function(a,b){return a.x-b.x;});return g.items.map(function(i){return i.str;}).join(' ');});
}
function normalizeReportLine(s){return s.replace(/\s+/g,' ').trim();}
function codeDescription(code){
 var m={
  '5010':'Nachtarbeit (20 %)','5011':'Nacht Beginn vor 0:00 (Nachtarbeit)','5014':'Samstag 13–20 Uhr, 0,64 €/h','5024':'Sonntagsarbeit 25 %','5161':'Durchschnitt § 21 TV-L','5211':'Wechselschichtzulage §43','5212':'Schichtzulage §43','3A10':'Nachtarbeit Zeitlohnart','3A11':'Nacht Beginn vor 0:00','3A14':'Samstag 13–20 Uhr','3B61':'Durchschnitt §21 TV-L','3C11':'Wechselschichtzulage §43','3C12':'Schichtzulage §43'};
 return m[code]||null;
}
function parseTimeReports(lines){
 var month=reportMonthFromLines(lines);if(!month)throw new Error('Abrechnungsmonat konnte nicht erkannt werden.');
 var idx=-1;for(var i=0;i<lines.length;i++){if(/Zeitlohnarten\s*\(täglich\)/i.test(lines[i])){idx=i;break;}}
 if(idx<0)throw new Error('Der Abschnitt „Zeitlohnarten (täglich)“ wurde nicht gefunden.');
 var rows=[];for(var j=idx+1;j<lines.length;j++){
   var s=normalizeReportLine(lines[j]); if(!s||/^Abwesenheitskontingente/i.test(s))break;
   var dm=s.match(/^(\d{2}\.\d{2}\.\d{4})\s+(.*)$/);if(!dm)continue;
   var rest=dm[2];
   var m=rest.match(/^(?:(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+)?([A-Z0-9]{4})\s+(\d{4}):?\s*(.*?)\s+(-?\d+(?:[,.]\d+)?)$/i);
   if(!m)continue;
   var code=m[4],shortCode=m[3],label=m[5],qty=parseMoney(m[6]);
   rows.push({date:dm[1],from:m[1]||'',to:m[2]||'',code:code,shortCode:shortCode,label:label,qty:qty,description:codeDescription(code)||codeDescription(shortCode)||'Unbekannte Zeitlohnart'});
 }
 if(!rows.length)throw new Error('Keine abrechnungsrelevanten Zeitlohnarten erkannt.');
 return {year:month.year,month:month.month,rows:rows};
}
function extractShiftSummary(lines){
 var counts={F1:0,S1:0,N5:0,Nx:0,Z1:0,other:0};
 lines.forEach(function(s){var m=s.match(/^\d{2}\s+[A-Za-zÄÖÜäöü]+\s+(F1|S1|N5|Nx|Z1)\b/);if(m)counts[m[1]]++;else if(/^\d{2}\s+[A-Za-zÄÖÜäöü]+\s+/.test(s)&&/\d{4}/.test(s))counts.other++;});
 return counts;
}
function protectedSurchargeCalc(rows){
 var nightHours=0,sunHours=0,saturdayHours=0,saturdayPay=0;
 rows.forEach(function(r){
   if(r.code==='5010'||r.code==='5011')nightHours+=Number(r.qty)||0;
   else if(r.code==='5024')sunHours+=Number(r.qty)||0;
   else if(r.code==='5014'){var q=Number(r.qty)||0;saturdayHours+=q;saturdayPay+=q*PAYROLL_CALIBRATION.saturdayRate;}
 });
 return {
   nightHours:nightHours,
   sunHours:sunHours,
   saturdayHours:saturdayHours,
   nightPay:nightHours*PAYROLL_CALIBRATION.nightSurchargeRate,
   sundayPay:sunHours*PAYROLL_CALIBRATION.sundaySurchargeRate,
   saturdayPay:saturdayPay
 };
}
function allowanceFromRows(rows){var wech=rows.some(function(r){return r.code==='5211'||r.label.toLowerCase().indexOf('wech')>=0;});var schi=rows.some(function(r){return r.code==='5212'||r.label.toLowerCase().indexOf('schiz')>=0;});return {wech:wech,schi:schi};}
function estimateNetFromGross(gross){
 var refGross=2743.15+150; // documented 60% base plus possible Wechselschichtzulage
 var refNet=1933.37;
 if(gross<=0)return 0;
 return gross*(refNet/refGross);
}
function einspringHourlyRate(year,month){
  // Für Einspringen gilt bis einschließlich September 2026 KR 8 / Stufe 5,
  // ab Oktober 2026 effektiv KR 8 / Stufe 6.
  var y=Number(year)||0,m=Number(month)||0;
  var fullTimeMonthly=(y>2026||(y===2026&&m>=9))?4468.47:4226.92;
  return fullTimeMonthly/(38.5*4.348);
}
function einspringFromRows(rep){
  var matches=rep.rows.filter(function(r){
    var text=(String(r.label||'')+' '+String(r.description||'')).toLowerCase();
    return /einspring|eingesprungen/.test(text);
  });
  var hours=matches.reduce(function(s,r){return s+Math.max(0,Number(r.qty)||0);},0);
  var count=matches.filter(function(r){return (Number(r.qty)||0)>0;}).length;
  return {
    count:count,
    hours:hours,
    hourlyRate:einspringHourlyRate(rep.year,rep.month),
    premium:count*150,
    hourlyPay:hours*einspringHourlyRate(rep.year,rep.month),
    gross:count*150+hours*einspringHourlyRate(rep.year,rep.month)
  };
}
function reportVariableExtras(rep,a,p){
 var shiftAllowance=a.wech?90:(a.schi?36:0);
 var avgUnits=rep.rows.filter(function(r){return r.code==='5161';}).reduce(function(s,r){return s+(Number(r.qty)||0);},0);
 var averagePay=avgUnits*PAYROLL_CALIBRATION.average21Rate;
 var eins=einspringFromRows(rep);
 var taxableExtrasGross=shiftAllowance+p.saturdayPay+averagePay+eins.gross;
 return {shiftAllowance:shiftAllowance,averageUnits:avgUnits,averagePay:averagePay,einspring:eins,taxableExtrasGross:taxableExtrasGross};
}
function calculateReportForecast(rep){
 var p=protectedSurchargeCalc(rep.rows),a=allowanceFromRows(rep.rows),base=payrollBaseForReport(rep),v=reportVariableExtras(rep,a,p);
 var taxableExtraNet=v.taxableExtrasGross*PAYROLL_CALIBRATION.taxableExtraNetRate;
 var protected=p.nightPay+p.sundayPay;
 var estimatedNet=base.legalNet+taxableExtraNet+protected;
 var pm=payoutMonthFor(rep.year,rep.month);
 return {
  report:rep,payoutYear:pm.year,payoutMonth:pm.month,
  baseGross:base.gross,baseLegalNet:base.legalNet,
  taxableGross:base.gross+v.taxableExtrasGross,
  taxableExtrasGross:v.taxableExtrasGross,taxableExtraNet:taxableExtraNet,
  netBase:estimatedNet,protected:protected,
  payout:estimatedNet,shiftAllowance:v.shiftAllowance,
  averageUnits:v.averageUnits,averagePay:v.averagePay,einspring:v.einspring,
  allowanceType:a.wech?'Wechselschichtzulage §43':a.schi?'Schichtzulage §43':'keine aus Zeitlohnarten',p:p
 };
}
function renderReportDetails(rep,forecast){
 var box=$('reportDetails');if(!box)return;var rows=rep.rows.map(function(r){var q=(Number(r.qty)||0).toFixed(2).replace('.',',');return '<div class="row"><span>'+esc(r.date)+' · '+esc(r.label)+'<br><span class="note">'+esc(r.code+' / '+r.shortCode)+' · '+esc(r.description)+'</span></span><span class="v">'+q+' h</span></div>';}).join('');
 box.innerHTML=rows||'<div class="note">Keine Details.</div>';
 if($('rMonth'))$('rMonth').textContent=formatMonth(rep.year,rep.month);
 if($('rPayoutMonth'))$('rPayoutMonth').textContent=formatMonth(forecast.payoutYear,forecast.payoutMonth);
 if($('pBrutto'))$('pBrutto').textContent=eur(forecast.taxableGross);
 if($('pNettoBasis'))$('pNettoBasis').textContent=eur(forecast.netBase);
  if($('pBaseNet'))$('pBaseNet').textContent=eur(forecast.baseLegalNet);
 if($('pVariableNet'))$('pVariableNet').textContent=eur(forecast.taxableExtraNet);
   if($('pPayout'))$('pPayout').textContent=eur(forecast.payout);
 if($('pShiftAllowance'))$('pShiftAllowance').textContent=forecast.shiftAllowance?eur(forecast.shiftAllowance)+' · '+forecast.allowanceType:forecast.allowanceType;
 if($('pSurcharges'))$('pSurcharges').textContent=eur(forecast.protected+forecast.p.saturdayPay+forecast.averagePay+forecast.einspring.gross);
 if($('pEinspring'))$('pEinspring').textContent=forecast.einspring.count?forecast.einspring.count+' Dienst(e) · '+forecast.einspring.hours.toFixed(2)+' h · '+eur(forecast.einspring.gross)+' brutto': 'kein Einspringen erkannt';
 if($('pShiftSummary'))$('pShiftSummary').textContent=forecast.p.nightHours.toFixed(2)+' h Nacht · '+forecast.p.sunHours.toFixed(2)+' h Sonntag · '+forecast.p.saturdayHours.toFixed(2)+' h Samstag · Ø §21 '+forecast.averageUnits.toFixed(2)+' · geschützte Zuschläge '+eur(forecast.protected);
}
function renderForecastTable(){
 var box=$('forecastTableWrap');if(!box)return;var arr=reportStore.slice().sort(function(a,b){return (a.year*12+a.month)-(b.year*12+b.month);});if(!arr.length){box.innerHTML='<div class="empty">Noch kein Zeitnachweis eingelesen.</div>';return;}
 box.innerHTML=arr.map(function(rep){var f=calculateReportForecast(rep);return '<div class="forecast-card"><div class="forecast-head"><span><b>'+esc(formatMonth(rep.year,rep.month))+'</b><br><span class="note">Auszahlung: '+esc(formatMonth(f.payoutYear,f.payoutMonth))+'</span></span><span class="badge '+(f.shiftAllowance?'green':'neutral')+'">'+esc(f.allowanceType)+'</span></div><div class="mini-grid"><div class="mini"><div class="t">Netto</div><div class="n">'+eur(f.netBase)+'</div></div><div class="mini"><div class="t">Auszahlung</div><div class="n good">'+eur(f.payout)+'</div></div></div></div>';}).join('');renderForecastChart(arr);
}
function renderForecastChart(arr){var box=$("forecastChart");if(!box)return;if(!arr.length){box.innerHTML='<div class="empty">Noch keine Prognosen.</div>';return;}var vals=arr.map(function(r){return calculateReportForecast(r).payout;}),max=Math.max.apply(null,vals.concat([1]));box.innerHTML=arr.map(function(rep){var f=calculateReportForecast(rep),h=Math.max(5,Math.round((f.payout/max)*125));return '<div class="bar-wrap"><div class="bar-value">'+eur(f.payout)+'</div><div class="bar" style="height:'+h+'px" title="'+esc(formatMonth(rep.year,rep.month))+' → '+esc(formatMonth(f.payoutYear,f.payoutMonth))+'"></div><div class="bar-label">'+monthName(rep.month).slice(0,3)+'</div></div>';}).join('');}
function checkForUpdate(){
 var button=$('updateBtn'),status=$('updateStatus');
 if(button)button.classList.add('spinning');
 if(status){status.textContent='Suche nach Aktualisierung …';status.style.display='block';}
 if(!('serviceWorker' in navigator)){
  if(status)status.textContent='Diese lokale Vorschau kann nicht online aktualisiert werden.';
  if(button)button.classList.remove('spinning');
  return;
 }
 var timeout=new Promise(function(_,reject){setTimeout(function(){reject(new Error('timeout'));},5000);});
 Promise.race([navigator.serviceWorker.getRegistration('./').then(function(reg){return reg||navigator.serviceWorker.register('./sw.js');}),timeout]).then(function(reg){
  return reg.update();
 }).then(function(){
  if(status)status.textContent='Aktualisierung geprüft. App wird neu geladen …';
  if(navigator.serviceWorker.controller){
   setTimeout(function(){if(!window.__appReloadedForUpdate){window.__appReloadedForUpdate=true;location.reload();}},300);
  }else{
   if(button)button.classList.remove('spinning');
   if(status)status.textContent='Die App ist aktuell.';
  }
 }).catch(function(){
  if(status)status.textContent='Aktualisierung konnte nicht geprüft werden. Bitte Internetverbindung prüfen.';
  if(button)button.classList.remove('spinning');
  setTimeout(function(){if(status)status.style.display='none';},3500);
 });
}
function ensurePdfJs(){if(!window.pdfjsLib)throw new Error('PDF-Bibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen.');window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';return window.pdfjsLib;}
async function readPdfLines(file){var pdfjs=await ensurePdfJs(),buf=await file.arrayBuffer(),pdf=await pdfjs.getDocument({data:buf}).promise,lines=[];for(var p=1;p<=pdf.numPages;p++){var page=await pdf.getPage(p),tc=await page.getTextContent();lines=lines.concat(groupPdfText(tc.items));}return lines;}
async function importTimeReports(){var files=$('timeReportFiles')&&$('timeReportFiles').files,status=$('timeReportStatus');if(!files||!files.length){alert('Bitte mindestens einen Zeitnachweis als PDF auswählen.');return;}status.textContent='Zeitnachweis wird ausgelesen …';$('timeReportBtn').disabled=true;var ok=0,errors=[];
 try{for(var i=0;i<files.length;i++){try{var lines=await readPdfLines(files[i]),rep=parseTimeReports(lines);rep.id=rep.year+'-'+String(rep.month+1).padStart(2,'0');rep.sourceName=files[i].name;rep.importedAt=new Date().toISOString();var existing=reportStore.findIndex(function(x){return x.id===rep.id;});if(existing>=0)reportStore[existing]=rep;else reportStore.push(rep);ok++;lastParsedReport=rep;}catch(e){errors.push(files[i].name+': '+e.message);}}
 saveReports(reportStore);if(lastParsedReport){var f=calculateReportForecast(lastParsedReport);renderReportDetails(lastParsedReport,f);}renderForecastTable();var preview=$('timeReportPreview');if(preview){preview.classList.remove('hidden');preview.innerHTML='<div class="note"><b>'+ok+' Zeitnachweis(e) übernommen.</b>'+(errors.length?'<br>'+errors.map(esc).join('<br>'):'')+'</div>';}
 status.textContent=errors.length?'Import abgeschlossen; einige Dateien konnten nicht vollständig verarbeitet werden.':'Import abgeschlossen. Zeitlohnarten und Zuschläge wurden berechnet.';
 }catch(e){status.textContent='Import fehlgeschlagen: '+e.message;} $('timeReportBtn').disabled=false;}
function showLatestForecast(){reportStore=loadReports();renderForecastTable();if(!lastParsedReport&&reportStore.length){lastParsedReport=reportStore[reportStore.length-1];renderReportDetails(lastParsedReport,calculateReportForecast(lastParsedReport));}}
function payslipMonthFromLines(lines){
 var month=reportMonthFromLines(lines);if(month)return month;
 for(var i=0;i<Math.min(lines.length,40);i++){
  var full=lines[i].match(/\b(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(20\d{2})\b/i);
  if(full){var names=['januar','februar','märz','april','mai','juni','juli','august','september','oktober','november','dezember'];return {year:Number(full[2]),month:names.indexOf(full[1].toLowerCase())};}
  var m=lines[i].match(/\b(0?[1-9]|1[0-2])[./-](20\d{2})\b/);if(m)return {year:Number(m[2]),month:Number(m[1])-1};
 }
 return null;
}
function parsePayslip(lines){
 var month=payslipMonthFromLines(lines);if(!month)throw new Error('Abrechnungsmonat der Bezügemitteilung konnte nicht erkannt werden.');
 function amountAfterLabel(patterns){
  for(var i=0;i<lines.length;i++)if(patterns.some(function(pattern){return pattern.test(lines[i]);})){
   var values=String(lines[i]).match(/-?\d{1,3}(?:\.\d{3})*,\d{2}/g)||[];if(values.length)return parseMoney(values[values.length-1]);
   if(i+1<lines.length){values=String(lines[i+1]).match(/-?\d{1,3}(?:\.\d{3})*,\d{2}/g)||[];if(values.length)return parseMoney(values[values.length-1]);}
  }
  return null;
 }
 var actual={year:month.year,month:month.month,gross:amountAfterLabel([/Gesamtbrutto/i,/Bruttoentgelt/i]),net:amountAfterLabel([/gesetzliches Netto/i,/gesetzl\.?\s*Netto/i]),payout:amountAfterLabel([/Auszahlungsbetrag/i,/Auszahlung/i,/Überweisungsbetrag/i])};
 if(actual.gross==null&&actual.net==null&&actual.payout==null)throw new Error('Keine sicheren Abrechnungswerte erkannt.');
 return actual;
}
function signedMoney(value){return value==null?'–':(value>=0?'+':'')+eur(value);}
function renderPayslipComparison(){
 var box=$('payslipComparison');if(!box)return;var payslips=loadPayslips(),html=[];
 payslips.slice().sort(function(a,b){return (a.year*12+a.month)-(b.year*12+b.month);}).forEach(function(actual){
  var match=reportStore.map(function(rep){return calculateReportForecast(rep);}).find(function(f){return f.payoutYear===actual.year&&f.payoutMonth===actual.month;});
  var body='<div class="forecast-card"><div class="forecast-head"><b>Echte Abrechnung: '+esc(formatMonth(actual.year,actual.month))+'</b><span class="badge '+(match?'green':'neutral')+'">'+(match?'Prognose zugeordnet':'Keine passende Prognose')+'</span></div>';
  if(match){
   body+='<div class="row"><span>Gesamtbrutto</span><span class="v">'+eur(match.taxableGross)+' → '+(actual.gross==null?'–':eur(actual.gross))+' <span class="note">('+signedMoney(actual.gross==null?null:actual.gross-match.taxableGross)+')</span></span></div>';
   body+='<div class="row"><span>Netto</span><span class="v">'+eur(match.netBase)+' → '+(actual.net==null?'–':eur(actual.net))+' <span class="note">('+signedMoney(actual.net==null?null:actual.net-match.netBase)+')</span></span></div>';
   body+='<div class="row"><span>Auszahlung</span><span class="v">'+eur(match.payout)+' → '+(actual.payout==null?'–':eur(actual.payout))+' <span class="note">('+signedMoney(actual.payout==null?null:actual.payout-match.payout)+')</span></span></div>';
  }else body+='<div class="note">Es wurde noch kein Zeitnachweis gefunden, dessen Auszahlung diesem Monat zugeordnet ist.</div>';
  html.push(body+'</div>');
 });
 box.innerHTML=html.join('')||'<div class="note">Noch keine echte Lohnabrechnung verglichen.</div>';
}
async function importPayslips(){
 var files=$('payslipFiles')&&$('payslipFiles').files,status=$('payslipStatus');if(!files||!files.length){alert('Bitte mindestens eine Bezügemitteilung als PDF auswählen.');return;}
 status.textContent='Bezügemitteilung wird ausgelesen …';$('payslipBtn').disabled=true;var payslips=loadPayslips(),ok=0,errors=[];
 try{for(var i=0;i<files.length;i++)try{var actual=parsePayslip(await readPdfLines(files[i]));actual.id=actual.year+'-'+String(actual.month+1).padStart(2,'0');actual.sourceName=files[i].name;actual.importedAt=new Date().toISOString();var existing=payslips.findIndex(function(x){return x.id===actual.id;});if(existing>=0)payslips[existing]=actual;else payslips.push(actual);ok++;}catch(e){errors.push(files[i].name+': '+e.message);}
 savePayslips(payslips);renderPayslipComparison();status.textContent=errors.length?'Vergleich abgeschlossen; einige Dateien konnten nicht verarbeitet werden.':'Abrechnung erfolgreich verglichen.';
 }catch(e){status.textContent='Import fehlgeschlagen: '+e.message;}$('payslipBtn').disabled=false;
}
function correctGiro(){var target=num("giroCorrection");if(target<0){alert("Bitte einen gültigen Kontostand eingeben.");return;}var current=currentGiro(),delta=target-current;if(Math.abs(delta)<0.005){$("giroCorrection").value="";alert("Der Kontostand entspricht bereits dem eingegebenen Wert.");return;}bookTransaction(delta,"Kontostand korrigiert","correction",{target:target,cycle:activeCycleKey()});$("giroCorrection").value="";refresh();}
function resetApp(){if(!confirm("Wirklich alle gespeicherten Eingaben und Buchungen löschen?"))return;["meinGeldplanGiroTx","meinGeldplanCash","meinGeldplanFixItems","meinGeldplanMonthlyFix","meinGeldplanTimeReports","meinGeldplanPayslips","meinGeldplanExactCalculation","meinGeldplanSavings"].forEach(function(k){localStorage.removeItem(k);});location.reload();}
function refresh(){renderTx();renderCycleExpenses();renderSavings();updateBudget();sunday();renderOverview();if($('giroCurrent'))$('giroCurrent').textContent=eur(currentGiro());showLatestForecast();renderPayslipComparison();if(!$('verlauf').classList.contains('hidden')){renderMonthlyCompare();renderMonthlyChart();}}
function setDefaultMonth(){if($("pMonth")&&!$("pMonth").value){var d=new Date();$("pMonth").value=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}}
function init(){
 ensureBase();reportStore=loadReports();setDefaultMonth();renderFixItems();initExactCalculator();
 if($('bCarryCash'))$('bCarryCash').value=cashBalance()>0?cashBalance().toFixed(2):'';
 if($('incomeBtn'))$('incomeBtn').onclick=addIncome;if($('expenseBtn'))$('expenseBtn').onclick=addExpense;if($('saveBtn'))$('saveBtn').onclick=addSaving;if($('withdrawBtn'))$('withdrawBtn').onclick=withdraw;if($('salaryBtn'))$('salaryBtn').onclick=addSalary;if($('resetBtn'))$('resetBtn').onclick=resetApp;if($('timeReportBtn'))$('timeReportBtn').onclick=importTimeReports;if($('payslipBtn'))$('payslipBtn').onclick=importPayslips;if($('correctionBtn'))$('correctionBtn').onclick=correctGiro;if($('addFixBtn'))$('addFixBtn').onclick=addFixItem;if($('exportBtn'))$('exportBtn').onclick=exportData;if($('importBtn'))$('importBtn').onclick=importData;if($('updateBtn'))$('updateBtn').onclick=checkForUpdate;
 if($('openHistoryBtn'))$('openHistoryBtn').onclick=function(){openTab('verlauf');};
 document.querySelectorAll('input,select').forEach(function(el){if(el.classList.contains('fix-name')||el.classList.contains('fix-amount')||el.id==='importFile'||el.id==='timeReportFiles')return;el.addEventListener('input',function(){if(el.id==='bCarryCash')saveCash(num('bCarryCash'));refresh();});el.addEventListener('change',function(){if(el.id==='bCarryCash')saveCash(num('bCarryCash'));refresh();});});
 document.querySelectorAll('.tab').forEach(function(b){b.addEventListener('click',function(){openTab(b.dataset.tab);});});
 document.addEventListener('focusin',function(e){if(e.target.matches('input[type="number"]')&&Number(e.target.value)===0)e.target.value='';});
 openTab('uebersicht');refresh();setInterval(refresh,60000);document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh();});
 if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(function(){});navigator.serviceWorker.addEventListener('controllerchange',function(){if(!window.__appReloadedForUpdate){window.__appReloadedForUpdate=true;location.reload();}});}
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
