import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('Gehaltsprognose bleibt ohne Einspring-Altlast und ergänzt den Abrechnungscheck',()=>{
  for(const id of ['timeReportFiles','timeReportBtn','pTaxableGross','pShiftAllowance','pNight','pSaturday','pSunday','pHoliday','pPayoutDetail']) assert.match(html,new RegExp(`id="${id}"`));
  for(const id of ['springInDuties','springInHours','springInBtn']) assert.doesNotMatch(html,new RegExp(`id="${id}"`));
  assert.match(html,/id="payslipBtn"/);
});
