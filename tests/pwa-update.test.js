import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseRemoteVersion} from '../lib/maintenance-ui.js';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');

test('Remote-Version wird aus version.js erkannt',()=>assert.equal(parseRemoteVersion("export const APP_VERSION = '0.26.0';"),'0.26.0'));
test('Update-Button umgeht HTTP- und Service-Worker-Cache',()=>{const s=fs.readFileSync(path.join(root,'lib/maintenance-ui.js'),'utf8');assert.match(s,/cache:'no-store'/);assert.match(s,/updateViaCache:'none'/);assert.match(s,/reg\.update\(\)/);assert.match(s,/location\.reload\(\)/);});
test('Service Worker hält alle lokalen Kernmodule offline vor',()=>{const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');for(const f of ['lib/budget-ui.js','lib/savings-ui.js','lib/fixed-costs-ui.js','lib/history-ui.js','lib/maintenance-ui.js','lib/salary-ui.js','lib/storage.js','config/salary-2026.js'])assert.match(sw,new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));});
test('Service Worker unterstützt sofortige Aktivierung und Offline-Fallback',()=>{const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');assert.match(sw,/SKIP_WAITING/);assert.match(sw,/self\.skipWaiting/);assert.match(sw,/caches\.match\(event\.request\)/);});
