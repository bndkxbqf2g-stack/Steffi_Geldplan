import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {APP_VERSION} from '../config/version.js';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');

test('sichtbare App-Version und Service-Worker-Version stimmen überein',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
  assert.equal(APP_VERSION,'1.0.0');
  assert.match(html,new RegExp(`id="appVersion">v${APP_VERSION.replaceAll('.','\\.')}`));
  assert.match(html,new RegExp(`app\\.js\\?v=${APP_VERSION.replaceAll('.','\\.')}`));
  assert.match(sw,new RegExp(`mein-geldplan-freundin-v${APP_VERSION.replaceAll('.','\\.')}`));
  assert.match(sw,new RegExp(`app\\.js\\?v=${APP_VERSION.replaceAll('.','\\.')}`));
});
