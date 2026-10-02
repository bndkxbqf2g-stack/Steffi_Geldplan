import {SUPABASE_CONFIG} from '../config/supabase.js';

const SESSION_KEY='freundinGeldplan.cloudSession.v1';
const nowSeconds=()=>Math.floor(Date.now()/1000);

export function normalizeCloudSession(value){
  if(!value||typeof value!=='object')return null;
  const accessToken=String(value.accessToken||'');
  const refreshToken=String(value.refreshToken||'');
  const expiresAt=Number(value.expiresAt);
  const userId=String(value.userId||'');
  const email=String(value.email||'');
  if(!accessToken||!refreshToken||!Number.isFinite(expiresAt)||!userId)return null;
  return {accessToken,refreshToken,expiresAt,userId,email};
}

export function loadCloudSession(storage=globalThis.localStorage){
  try{return normalizeCloudSession(JSON.parse(storage?.getItem(SESSION_KEY)||'null'));}catch{return null;}
}
export function saveCloudSession(session,storage=globalThis.localStorage){
  const clean=normalizeCloudSession(session);if(!clean||!storage)return false;
  try{storage.setItem(SESSION_KEY,JSON.stringify(clean));return true;}catch{return false;}
}
export function clearCloudSession(storage=globalThis.localStorage){
  try{storage?.removeItem(SESSION_KEY);return true;}catch{return false;}
}
function headers(token){
  return {'apikey':SUPABASE_CONFIG.publishableKey,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})};
}
async function jsonResponse(response){
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.msg||data?.message||data?.error_description||data?.error||`HTTP ${response.status}`);
  return data;
}
export function cloudRedirectUrl(locationRef=globalThis.location){
  const origin=String(locationRef?.origin||'');
  const path=String(locationRef?.pathname||'/');
  return origin?origin+path:'';
}

export async function requestCloudOtp(email){
  const clean=String(email||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean))throw new Error('Bitte eine gültige E-Mail-Adresse eingeben.');
  const redirect=cloudRedirectUrl();
  const endpoint=redirect?`${SUPABASE_CONFIG.url}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`:`${SUPABASE_CONFIG.url}/auth/v1/otp`;
  const response=await fetch(endpoint,{method:'POST',headers:headers(),body:JSON.stringify({email:clean,create_user:true})});
  await jsonResponse(response);return clean;
}
export async function verifyCloudOtp(email,token){
  const clean=String(email||'').trim().toLowerCase(),code=String(token||'').trim();
  if(!/^\d{6}$/.test(code))throw new Error('Bitte den 6-stelligen Code eingeben.');
  const response=await fetch(`${SUPABASE_CONFIG.url}/auth/v1/verify`,{method:'POST',headers:headers(),body:JSON.stringify({email:clean,token:code,type:'email'})});
  const data=await jsonResponse(response);
  const user=data.user||{};
  const session=normalizeCloudSession({
    accessToken:data.access_token,refreshToken:data.refresh_token,
    expiresAt:nowSeconds()+Number(data.expires_in||3600),userId:user.id,email:user.email||clean
  });
  if(!session)throw new Error('Anmeldung konnte nicht gespeichert werden.');
  saveCloudSession(session);return session;
}
export async function refreshCloudSession(session=loadCloudSession()){
  const clean=normalizeCloudSession(session);if(!clean)return null;
  if(clean.expiresAt>nowSeconds()+60)return clean;
  const response=await fetch(`${SUPABASE_CONFIG.url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:headers(),body:JSON.stringify({refresh_token:clean.refreshToken})});
  const data=await jsonResponse(response);
  const user=data.user||{};
  const next=normalizeCloudSession({
    accessToken:data.access_token,refreshToken:data.refresh_token||clean.refreshToken,
    expiresAt:nowSeconds()+Number(data.expires_in||3600),userId:user.id||clean.userId,email:user.email||clean.email
  });
  if(!next)throw new Error('Cloud-Sitzung konnte nicht erneuert werden.');
  saveCloudSession(next);return next;
}
export async function requireCloudSession(){
  const session=loadCloudSession();if(!session)return null;
  try{return await refreshCloudSession(session);}catch{clearCloudSession();return null;}
}
export {SESSION_KEY};


export function sessionFromAuthRedirect(locationRef=globalThis.location){
  const hash=String(locationRef?.hash||'').replace(/^#/,'');
  if(!hash)return null;
  const params=new URLSearchParams(hash);
  const accessToken=params.get('access_token')||'';
  const refreshToken=params.get('refresh_token')||'';
  const expiresIn=Number(params.get('expires_in')||0);
  if(!accessToken||!refreshToken)return null;
  const payloadPart=accessToken.split('.')[1]||'';
  let payload={};
  try{
    const base64=payloadPart.replace(/-/g,'+').replace(/_/g,'/');
    const padded=base64+'='.repeat((4-base64.length%4)%4);
    payload=JSON.parse(atob(padded));
  }catch{}
  const userId=String(payload.sub||'');
  const email=String(payload.email||'');
  const expiresAt=Number(payload.exp)||(nowSeconds()+Math.max(60,expiresIn||3600));
  if(!userId)return null;
  return normalizeCloudSession({accessToken,refreshToken,expiresAt,userId,email});
}

export function adoptAuthRedirectSession(locationRef=globalThis.location,historyRef=globalThis.history){
  const session=sessionFromAuthRedirect(locationRef);
  if(!session)return null;
  saveCloudSession(session);
  try{
    historyRef?.replaceState?.(null,'',String(locationRef.pathname||'/')+String(locationRef.search||''));
  }catch{}
  return session;
}
