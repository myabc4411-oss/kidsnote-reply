/* 알림장 답장 도우미 - 서비스 워커
   - 앱 파일을 미리 저장해 오프라인에서도 열려요.
   - 같은 사이트의 GET 요청만 처리해요. (Gemini 등 외부 요청은 건드리지 않아요)
   - 앱을 고칠 때는 VERSION 숫자를 올리면 새 파일이 적용돼요. */
var VERSION = 'kdn-v1.0.0';
var CORE = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.webmanifest',
  'privacy.html',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(VERSION)
      .then(function(c){ return c.addAll(CORE.map(function(u){ return new Request(u, { cache:'reload' }); })); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){ return Promise.all(keys.filter(function(k){ return k!==VERSION; }).map(function(k){ return caches.delete(k); })); })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method!=='GET') return;
  var url = new URL(req.url);
  if(url.origin!==self.location.origin) return;

  // 페이지 이동: 네트워크 우선, 실패하면 저장본
  if(req.mode==='navigate'){
    e.respondWith(
      fetch(req).then(function(res){
        if(res && res.ok){ var copy = res.clone(); caches.open(VERSION).then(function(c){ c.put(req, copy); }); }
        return res;
      }).catch(function(){
        return caches.match(req, { ignoreSearch:true }).then(function(r){ return r || caches.match('index.html'); });
      })
    );
    return;
  }

  // 그 밖의 파일: 저장본을 바로 보여주고 뒤에서 최신으로 갱신
  e.respondWith(
    caches.match(req).then(function(cached){
      var net = fetch(req).then(function(res){
        if(res && res.ok){ var copy = res.clone(); caches.open(VERSION).then(function(c){ c.put(req, copy); }); }
        return res;
      }).catch(function(){ return cached; });
      return cached || net;
    })
  );
});
