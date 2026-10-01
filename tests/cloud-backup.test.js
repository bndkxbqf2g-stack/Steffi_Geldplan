import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCloudSession,cloudRedirectUrl,sessionFromAuthRedirect} from '../lib/cloud-auth.js';
import {snapshotHash,canonicalCloudSnapshot} from '../lib/cloud-backup.js';

test('Cloud-Sitzung akzeptiert nur vollständige Zugangsdaten',()=>{
  assert.equal(normalizeCloudSession(null),null);
  assert.equal(normalizeCloudSession({accessToken:'a'}),null);
  assert.deepEqual(normalizeCloudSession({accessToken:'a',refreshToken:'r',expiresAt:123,userId:'u',email:'x@y.de'}),{accessToken:'a',refreshToken:'r',expiresAt:123,userId:'u',email:'x@y.de'});
});

test('Snapshot-Hash ist stabil und reagiert auf Datenänderung',async()=>{
  const a=await snapshotHash({cash:85,transactions:[]});
  const b=await snapshotHash({cash:85,transactions:[]});
  const c=await snapshotHash({cash:84,transactions:[]});
  assert.equal(a,b);
  assert.notEqual(a,c);
  assert.equal(a.length,64);
});


test('volatile Exportzeit ändert den Cloud-Deduplizierungs-Hash nicht',async()=>{
  const a=await snapshotHash({cash:85,exportedAt:'2026-09-25T18:00:00Z'});
  const b=await snapshotHash({cash:85,exportedAt:'2026-09-25T19:00:00Z'});
  assert.equal(a,b);
  assert.deepEqual(canonicalCloudSnapshot({cash:85,exportedAt:'x'}),{cash:85});
});


test('Cloud-Redirect verwendet die produktive GitHub-Pages-URL statt localhost',()=>{
  assert.equal(
    cloudRedirectUrl({origin:'https://bndkxbqf2g-stack.github.io',pathname:'/Steffi_Geldplan/'}),
    'https://bndkxbqf2g-stack.github.io/mein-geldplan/'
  );
});

test('Magic-Link-Redirect kann Supabase-Sitzung aus URL-Fragment übernehmen',()=>{
  const header=Buffer.from(JSON.stringify({alg:'none'})).toString('base64url');
  const payload=Buffer.from(JSON.stringify({sub:'user-1',email:'m@example.de',exp:2000000000})).toString('base64url');
  const accessToken=`${header}.${payload}.`;
  const session=sessionFromAuthRedirect({hash:`#access_token=${accessToken}&refresh_token=refresh-1&expires_in=3600`});
  assert.equal(session.userId,'user-1');
  assert.equal(session.email,'m@example.de');
  assert.equal(session.refreshToken,'refresh-1');
});
