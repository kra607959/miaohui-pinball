import { assets } from './precache.js';
const prefix=`miaohui:${self.registration.scope}:`;
const cacheName=prefix+'v1.0.0';
const entry=new URL('./index.html',self.registration.scope).href;
const known=new Set(assets.map(path=>new URL(path,self.registration.scope).href));

// 等旧网页关完再接管；不在玩家打台时跳到新版本。
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(assets)));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(prefix)&&key!==cacheName).map(key=>caches.delete(key)))));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url),base=new URL(self.registration.scope);
  if(url.origin!==base.origin)return;
  const navigation=event.request.mode==='navigate'&&(url.pathname===base.pathname||url.pathname===new URL(entry).pathname);
  if(!navigation&&!known.has(url.href))return;
  event.respondWith(caches.open(cacheName).then(async cache=>(await cache.match(navigation?entry:event.request))??fetch(event.request)));
});
