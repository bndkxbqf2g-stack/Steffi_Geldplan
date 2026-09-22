import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('Einspring-UI enthält Anzahl, Stunden und persönlichen Stundensatz',()=>{
  for(const id of ['springInDuties','springInHours','springInHourlyRate','springInBtn','pSpringIn']) assert.match(html,new RegExp(`id="${id}"`));
});
