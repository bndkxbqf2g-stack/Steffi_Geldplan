import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {APP_VERSION} from '../config/version.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');

test('Release Candidate enthält alle Repo-Root-Kerndateien',()=>{
  for(const file of ['index.html','app.js','service-worker.js','manifest.webmanifest','package.json','config/version.js']){
    assert.ok(fs.existsSync(path.join(root,file)),`${file} fehlt`);
  }
  for(const dir of ['lib','config','tests']) assert.ok(fs.statSync(path.join(root,dir)).isDirectory(),`${dir}/ fehlt`);
});

test('Release Candidate hat keine zusätzliche Projektwurzel',()=>{
  assert.equal(fs.existsSync(path.join(root,'mein-geldplan-main')),false);
  assert.equal(fs.existsSync(path.join(root,'mein-geldplan')),false);
});

test('Release Candidate verwendet überall v1.0.0 für App und Cache',()=>{
  assert.equal(APP_VERSION,'1.0.0');
  assert.match(read('index.html'),/id="appVersion">v1\.0\.0/);
  assert.match(read('index.html'),/app\.js\?v=1\.0\.0/);
  assert.match(read('service-worker.js'),/mein-geldplan-freundin-v1\.0\.0/);
  assert.match(read('service-worker.js'),/app\.js\?v=1\.0\.0/);
});
