import {SUPABASE_CONFIG} from '../config/supabase.js';
import {requireCloudSession} from './cloud-auth.js';

const CLOUD_SOURCE='steffi-webapp';

const moneylessJson=value=>JSON.stringify(value);
const utf8=value=>new TextEncoder().encode(value);

export function canonicalCloudSnapshot(snapshot={}){
  const {exportedAt,recoverySavedAt,...stable}=snapshot&&typeof snapshot==='object'?snapshot:{};
  return stable;
}

export async function snapshotHash(snapshot){
  const data=utf8(moneylessJson(canonicalCloudSnapshot(snapshot)));
  const digest=await crypto.subtle.digest('SHA-256',data);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
function authHeaders(session){
  return {'apikey':SUPABASE_CONFIG.publishableKey,'Authorization':`Bearer ${session.accessToken}`,'Content-Type':'application/json'};
}
async function parse(response){
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.error||`Cloud-Fehler ${response.status}`);
  return data;
}
export async function saveCloudSnapshot(snapshot,{source=CLOUD_SOURCE}={}){
  const session=await requireCloudSession();if(!session)throw new Error('Cloud-Sicherung ist nicht angemeldet.');
  const payloadHash=await snapshotHash(snapshot);
  const latest=await loadLatestCloudSnapshot({session,includePayload:false}).catch(()=>null);
  if(latest?.payload_hash===payloadHash)return {saved:false,duplicate:true,latest};
  const body={user_id:session.userId,snapshot_version:Number(snapshot?.version||1),app_version:String(snapshot?.appVersion||''),schema_version:Number(snapshot?.schemaVersion||0),payload:snapshot,payload_hash:payloadHash,source:CLOUD_SOURCE};
  const response=await fetch(`${SUPABASE_CONFIG.url}/rest/v1/finance_snapshots`,{method:'POST',headers:{...authHeaders(session),Prefer:'return=representation'},body:JSON.stringify(body)});
  const rows=await parse(response);return {saved:true,duplicate:false,latest:Array.isArray(rows)?rows[0]:rows};
}
export async function loadLatestCloudSnapshot({session=null,includePayload=true}={}){
  const active=session||await requireCloudSession();if(!active)throw new Error('Cloud-Sicherung ist nicht angemeldet.');
  const select=includePayload?'id,created_at,app_version,schema_version,payload,payload_hash':'id,created_at,app_version,schema_version,payload_hash';
  const url=`${SUPABASE_CONFIG.url}/rest/v1/finance_snapshots?select=${encodeURIComponent(select)}&source=eq.${encodeURIComponent(CLOUD_SOURCE)}&order=created_at.desc&limit=1`;
  const response=await fetch(url,{headers:authHeaders(active)});
  const rows=await parse(response);return Array.isArray(rows)&&rows.length?rows[0]:null;
}
let timer=null;
export function scheduleCloudSnapshot(snapshot,{delay=2500,onResult=()=>{},onError=()=>{}}={}){
  if(timer)clearTimeout(timer);
  timer=setTimeout(async()=>{timer=null;try{onResult(await saveCloudSnapshot(snapshot,{source:CLOUD_SOURCE}));}catch(error){onError(error);}},delay);
}
