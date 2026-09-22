var CACHE_NAME='mein-geldplan-freundin-v1.0.0';
var APP_SHELL=[
  './','./index.html','./app.js?v=1.0.0','./manifest.webmanifest','./icon.svg',
  './config/version.js','./config/salary-2026.js',
  './lib/ui.js','./lib/storage.js','./lib/theme-ui.js','./lib/cycle.js','./lib/budget.js','./lib/budget-ui.js',
  './lib/savings.js','./lib/savings-ui.js','./lib/fixed-costs.js','./lib/fixed-costs-ui.js','./lib/history-ui.js','./lib/statistics.js',
  './lib/maintenance-ui.js','./lib/salary.js','./lib/salary-ui.js','./lib/pdf.js','./lib/payslip.js'
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
  var appAsset=local&&(event.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('.js')||url.pathname.endsWith('/manifest.webmanifest'));
  if(appAsset){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(function(response){
      if(response&&response.status===200){var copy=response.clone();caches.open(CACHE_NAME).then(function(cache){cache.put(event.request,copy);});}
      return response;
    }).catch(function(){return caches.match(event.request).then(function(cached){return cached||caches.match('./index.html');});}));
    return;
  }
  event.respondWith(caches.match(event.request).then(function(cached){return cached||fetch(event.request);}));
});
