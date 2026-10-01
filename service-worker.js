var CACHE_NAME='mein-geldplan-steffi-v0.99.55';
var APP_SHELL=[
  './','./index.html','./design-refresh.css?v=7','./app.js?v=0.99.55','./manifest.webmanifest','./icon.svg','./apple-touch-icon.png',
  './config/version.js','./config/salary-2026.js','./lib/cloud-backup-ui.js','./lib/cloud-backup.js','./lib/cloud-auth.js','./config/supabase.js',
  './lib/ui.js','./lib/storage.js','./lib/theme-ui.js','./lib/cycle.js','./lib/budget.js','./lib/budget-ui.js',
  './lib/savings.js','./lib/savings-ui.js','./lib/fixed-costs.js','./lib/fixed-cost-overrides.js','./lib/fixed-costs-ui.js','./lib/history-ui.js','./lib/statistics.js',
  './lib/maintenance-ui.js','./lib/recovery-store.js','./lib/recovery-bootstrap.js','./lib/preferences-ui.js','./lib/pending-salary.js','./lib/payroll-control.js','./lib/payroll-control-ui.js','./lib/payroll-control-ui-v2.js','./lib/payroll-net-breakdown.js','./lib/payroll-net-ui.js','./lib/payroll-learning.js','./lib/payroll-learning-calibration.js','./lib/salary-payslip-ui.js','./lib/salary.js','./lib/salary-net-effects.js','./lib/salary-ui.js','./lib/pdf.js','./lib/payslip.js'
];

self.addEventListener('install',function(event){
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache){return cache.addAll(APP_SHELL);}));
  self.skipWaiting();
});

self.addEventListener('activate',function(event){
  event.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(key){return key!==CACHE_NAME;}).map(function(key){return caches.delete(key);}));
  }));
  self.clients.claim();
});

self.addEventListener('message',function(event){
  if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',function(event){
  if(event.request.method!=='GET')return;
  var url=new URL(event.request.url);
  var local=url.origin===self.location.origin;
  var appAsset=local&&(event.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('.js')||url.pathname.endsWith('.css')||url.pathname.endsWith('/manifest.webmanifest'));
  if(appAsset){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(function(response){
      if(response&&response.status===200){var copy=response.clone();caches.open(CACHE_NAME).then(function(cache){cache.put(event.request,copy);});}
      return response;
    }).catch(function(){return caches.match(event.request).then(function(cached){return cached||caches.match('./index.html');});}));
    return;
  }
  event.respondWith(caches.match(event.request).then(function(cached){return cached||fetch(event.request);}));
});
