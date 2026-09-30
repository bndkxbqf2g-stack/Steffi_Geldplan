import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('v0.99.2 exposes accessible global status notice',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="appNotice"/);
  assert.match(html,/aria-live="polite"/);
});

test('update button has an accessible label',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="updateBtn"[^>]*aria-label="Auf neue Version prüfen"/);
});


test('refresh control is integrated without a separate header bar',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/<header[\s>]/);
  assert.match(html,/class="page-refresh"/);
  assert.match(html,/id="updateBtn"[^>]*aria-label="Auf neue Version prüfen"/);
  assert.match(html,/id="explanationsToggle"/);
  assert.match(html,/id="themeBtn"/);
});


test('Sparziel-Schnellzugriff öffnet keine Tastatur',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/data-quick-target="savingsSection"/);
  assert.match(html,/id="savingsSection"/);
  assert.doesNotMatch(html,/data-quick-focus="sSavingPurpose"/);
  assert.match(html,/button\.dataset\.quickTarget/);
});
