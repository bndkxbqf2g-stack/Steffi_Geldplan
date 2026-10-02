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
  assert.match(APP_VERSION,/^\d+\.\d+\.\d+$/);
  assert.ok(html.includes(`id="appVersion">v${APP_VERSION}`));
  assert.ok(html.includes(`app.js?v=${APP_VERSION}`));
  assert.ok(sw.includes(`mein-geldplan-steffi-v${APP_VERSION}`));
  assert.ok(sw.includes(`app.js?v=${APP_VERSION}`));
});

test('Gehaltsmodule verwenden nach einem PWA-Update dieselbe neue Modul-URL',()=>{
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const ui=fs.readFileSync(path.join(root,'lib/salary-ui.js'),'utf8');
  const effects=fs.readFileSync(path.join(root,'lib/salary-net-effects.js'),'utf8');
  const breakdown=fs.readFileSync(path.join(root,'lib/payroll-net-breakdown.js'),'utf8');
  const payslipUi=fs.readFileSync(path.join(root,'lib/salary-payslip-ui.js'),'utf8');
  const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
  assert.ok(app.includes(`./lib/salary-ui.js?v=${APP_VERSION}`));
  for(const source of [ui,effects,breakdown])assert.ok(source.includes(`./salary.js?v=${APP_VERSION}`));
  assert.ok(ui.includes(`./salary-net-effects.js?v=${APP_VERSION}`));
  assert.ok(ui.includes(`./salary-payslip-ui.js?v=${APP_VERSION}`));
  assert.ok(payslipUi.includes(`./salary-net-effects.js?v=${APP_VERSION}`));
  for(const url of [`./lib/salary-ui.js?v=${APP_VERSION}`,`./lib/salary.js?v=${APP_VERSION}`,`./lib/salary-net-effects.js?v=${APP_VERSION}`,`./lib/salary-payslip-ui.js?v=${APP_VERSION}`])assert.ok(sw.includes(url));
});
