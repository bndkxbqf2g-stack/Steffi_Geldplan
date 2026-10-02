const money=value=>Math.round((Number(value)||0)*100)/100;
const VARIABLE_KEYS=new Set(['night','saturday','sunday','holiday','shift','springIn']);

function median(values=[]){
  const sorted=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);
  if(!sorted.length)return null;
  const middle=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
}

function cleanGrossMatch(snapshot={}){
  const gross=(snapshot.totals||[]).find(row=>row?.key==='totalGross');
  if(!gross?.comparable||!gross.confirmed)return false;
  const componentMismatch=(snapshot.rows||[]).some(row=>VARIABLE_KEYS.has(row?.key)&&row?.comparable&&!row?.confirmed);
  return !componentMismatch;
}

function metricDifferences(history=[],key){
  const values=[];
  for(const snapshot of Array.isArray(history)?history:[]){
    if(!cleanGrossMatch(snapshot))continue;
    const metric=(snapshot.totals||[]).find(row=>row?.key===key);
    if(!metric?.comparable||!Number.isFinite(Number(metric.difference)))continue;
    if(snapshot?.hasPriorAdjustment&&['garnishment','payout'].includes(key))continue;
    values.push(Number(metric.difference));
  }
  return values;
}

function metricSummary(history,key,{minObservations=2,maxSpread=15}={}){
  const values=metricDifferences(history,key);
  const center=median(values);
  const spread=values.length?Math.max(...values)-Math.min(...values):null;
  const applicable=values.length>=minObservations&&spread<=maxSpread;
  return {
    key,
    observations:values.length,
    adjustment:center==null?0:money(center),
    spread:spread==null?null:money(spread),
    applicable,
    confidence:values.length>=3&&spread<=2?'verifiziert':applicable?'stabil':values.length?'beobachtung':'unbekannt'
  };
}

export function buildPayrollLearningCalibration(history=[],options={}){
  const payout=metricSummary(history,'payout',options);
  const metrics=['taxTotal','socialTotal','legalNet','vbl','garnishment','payout']
    .map(key=>metricSummary(history,key,options));
  return {payout,metrics};
}

export function learnedPayoutForForecast(forecast={},history=[],options={}){
  const raw=Number(forecast?.payout);
  if(!Number.isFinite(raw))return {rawPayout:null,payout:null,adjustment:0,applied:false,observations:0,confidence:'unbekannt'};
  const calibration=buildPayrollLearningCalibration(history,options).payout;
  const hasOpenReview=Boolean(
    forecast?.needsReview ||
    forecast?.components?.springInVblUnverified ||
    (Array.isArray(forecast?.components?.unpriced)&&forecast.components.unpriced.length)
  );
  const applied=calibration.applicable&&!hasOpenReview;
  return {
    rawPayout:money(raw),
    payout:applied?money(raw+calibration.adjustment):money(raw),
    adjustment:applied?calibration.adjustment:0,
    learnedAdjustment:calibration.adjustment,
    applied,
    observations:calibration.observations,
    spread:calibration.spread,
    confidence:calibration.confidence
  };
}
