import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('v1.0.0 exposes accessible global status notice',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="appNotice"/);
  assert.match(html,/aria-live="polite"/);
});

test('update button has an accessible label',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="updateBtn"[^>]*aria-label="Auf neue Version prüfen"/);
});
