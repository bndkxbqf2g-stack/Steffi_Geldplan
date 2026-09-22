export const DEFAULT_FIXED_COSTS=Object.freeze([
  {id:'miete',name:'Miete',amount:685.00},
  {id:'lebensmittel',name:'Lebensmittel',amount:200.00},
  {id:'deka',name:'Deka Sparplan',amount:115.00},
  {id:'deutschlandticket',name:'Deutschlandticket',amount:63.00},
  {id:'auto-backup',name:'Auto-Backup',amount:60.00},
  {id:'urlaub-backup',name:'Urlaub-Backup',amount:60.00},
  {id:'fitnessstudio',name:'Fitnessstudio',amount:60.00},
  {id:'strom',name:'Strom',amount:39.00},
  {id:'kfw-zinsen',name:'KfW-Zinsen',amount:33.15},
  {id:'gemuesebox',name:'Gemüsebox',amount:27.00},
  {id:'gothaer',name:'Gothaer Versicherung',amount:19.00},
  {id:'internet',name:'Internet',amount:17.50},
  {id:'gez-haftpflicht',name:'GEZ / Haftpflicht (Rücklage)',amount:12.00},
  {id:'amazon',name:'Amazon',amount:8.99},
  {id:'kontofuehrung',name:'Kontoführung',amount:8.00},
  {id:'chatgpt',name:'ChatGPT',amount:7.99},
  {id:'hausrat',name:'Hausratversicherung',amount:3.00},
  {id:'icloud',name:'iCloud',amount:2.99},
  {id:'netflix',name:'Netflix',amount:2.59}
]);

export function normalizeFixedCosts(value){
  if(value==null)return DEFAULT_FIXED_COSTS.map(x=>({...x}));
  if(!Array.isArray(value))return [];
  return value.filter(Boolean).map((item,i)=>({id:item.id||`fix-${i}`,name:String(item.name||'Fixkosten').trim()||'Fixkosten',amount:Math.max(0,Number(item.amount)||0)}));
}
export function totalFixedCosts(value){return normalizeFixedCosts(value).reduce((sum,item)=>sum+item.amount,0);}
export function addFixedCost(value,item={}){const list=normalizeFixedCosts(value);return [...list,{id:item.id||`${Date.now()}-${Math.random()}`,name:String(item.name||'Neue Fixkosten'),amount:Math.max(0,Number(item.amount)||0)}];}
export function updateFixedCost(value,id,patch={}){return normalizeFixedCosts(value).map(item=>item.id===id?{...item,...patch,amount:patch.amount===undefined?item.amount:Math.max(0,Number(patch.amount)||0),name:patch.name===undefined?item.name:(String(patch.name).trim()||'Fixkosten')}:item);}
export function removeFixedCost(value,id){return normalizeFixedCosts(value).filter(item=>item.id!==id);}
