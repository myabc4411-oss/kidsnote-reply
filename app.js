(function(){
'use strict';

var APP_VERSION = '1.1.1';
var DEFAULT_MODEL = 'gemini-3.8-flash';
var $ = function(id){ return document.getElementById(id); };
var state = { tone:'warm', len:'2', emoji:'1' };

/* =========================================================
   저장소 (localStorage 실패해도 앱은 동작)
   ========================================================= */
function store(k, v){ try{ localStorage.setItem('kdn_'+k, v); }catch(e){} }
function load(k){ try{ return localStorage.getItem('kdn_'+k) || ''; }catch(e){ return ''; } }
function wipeAll(){
  try{
    var keys = [];
    for(var i=0;i<localStorage.length;i++){ var k = localStorage.key(i); if(k && k.indexOf('kdn_')===0) keys.push(k); }
    keys.forEach(function(k){ localStorage.removeItem(k); });
  }catch(e){}
}

/* =========================================================
   토스트
   ========================================================= */
function toast(msg){
  var t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(function(){ t.classList.remove('show'); }, 2000);
}

/* =========================================================
   화면 전환 + 뒤로가기 (history API)
   home → result / settings 로 들어갈 때만 기록을 쌓고,
   뒤로가기는 항상 한 단계 위(home)로 돌아가요.
   ========================================================= */
var TITLES = { home:'알림장 답장 도우미', result:'답장 고르기', settings:'설정' };
var cur = 'home';
var scrollPos = {};

function show(s){
  scrollPos[cur] = window.pageYOffset || 0;
  cur = s;
  ['home','result','settings'].forEach(function(n){ $('screen-'+n).hidden = (n!==s); });
  $('homeBar').hidden = (s!=='home');
  $('title').textContent = TITLES[s];
  $('backBtn').classList.toggle('vis-hidden', s==='home');
  $('gearBtn').classList.toggle('vis-hidden', s==='settings');
  window.scrollTo(0, scrollPos[s] || 0);
}
function nav(s){
  if(s===cur) return;
  try{ history.pushState({ s:s }, ''); }catch(e){}
  show(s);
}
function goBack(){
  if(cur==='home') return;
  // 기록이 쌓여 있으면 뒤로, 아니면(직접 진입 등) 홈으로 직접 이동
  if(history.state && history.state.s && history.state.s!=='home'){ history.back(); }
  else { show('home'); }
}
window.addEventListener('popstate', function(e){
  var s = (e.state && e.state.s) || 'home';
  show(s);
});
try{ history.replaceState({ s:'home' }, ''); }catch(e){}

$('backBtn').addEventListener('click', goBack);
$('gearBtn').addEventListener('click', function(){ nav('settings'); });

/* =========================================================
   설정/옵션 UI
   ========================================================= */
function syncChips(){
  [].forEach.call(document.querySelectorAll('#toneRow .chip'), function(b){ b.classList.toggle('on', b.dataset.v===state.tone); });
  [].forEach.call(document.querySelectorAll('#lenRow .chip'), function(b){ b.classList.toggle('on', b.dataset.v===state.len); });
  [].forEach.call(document.querySelectorAll('#emojiRow .chip'), function(b){ b.classList.toggle('on', b.dataset.v===state.emoji); });
}
$('toneRow').addEventListener('click', function(e){
  var b = e.target.closest('.chip'); if(!b) return;
  state.tone = b.dataset.v; store('tone', state.tone); syncChips();
});
$('lenRow').addEventListener('click', function(e){
  var b = e.target.closest('.chip'); if(!b) return;
  state.len = b.dataset.v; store('len', state.len); syncChips();
});
$('emojiRow').addEventListener('click', function(e){
  var b = e.target.closest('.chip'); if(!b) return;
  state.emoji = b.dataset.v; store('emoji', state.emoji); syncChips();
});

['child','teacher','apikey','model'].forEach(function(id){
  $(id).addEventListener('input', function(){ store(id, $(id).value.trim()); });
});
$('pwToggle').addEventListener('click', function(){
  var inp = $('apikey'); var showing = inp.type==='text';
  inp.type = showing ? 'password' : 'text';
  $('pwToggle').textContent = showing ? '보기' : '숨김';
});

/* 알림장 초안 보존 */
var draftT;
$('note').addEventListener('input', function(){
  clearTimeout(draftT);
  draftT = setTimeout(function(){ store('draft', $('note').value); }, 400);
});
$('clearBtn').addEventListener('click', function(){ $('note').value=''; store('draft',''); $('note').focus(); });

/* 데이터 삭제 (두 번 눌러야 삭제) */
var wipeArmed = false, wipeT;
$('wipeBtn').addEventListener('click', function(){
  if(!wipeArmed){
    wipeArmed = true; $('wipeBtn').textContent = '한 번 더 누르면 모두 삭제돼요';
    wipeT = setTimeout(function(){ wipeArmed=false; $('wipeBtn').textContent='저장된 데이터 모두 지우기'; }, 3500);
    return;
  }
  clearTimeout(wipeT); wipeArmed=false; $('wipeBtn').textContent='저장된 데이터 모두 지우기';
  wipeAll();
  ['child','teacher','apikey','model','note','memo'].forEach(function(id){ $(id).value=''; });
  state.tone='warm'; state.len='2'; state.emoji='1'; syncChips();
  toast('저장된 데이터를 모두 지웠어요');
});

/* =========================================================
   앱 설치 안내
   ========================================================= */
var deferredPrompt = null;
function isStandalone(){
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone===true;
}
function isIOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent); }
function updateInstallUI(){
  var standalone = isStandalone();
  var canPrompt = !!deferredPrompt;
  var ios = isIOS() && !standalone;
  $('installRow').hidden = standalone || !(canPrompt || ios);
  $('installBtn2').hidden = !canPrompt;
  $('iosHint').hidden = !ios;
  var dismissed = load('noinstall')==='1';
  var showBanner = !standalone && !dismissed && (canPrompt || ios);
  $('installBanner').hidden = !showBanner;
  $('installBtn').hidden = !canPrompt;
  $('installMsg').textContent = canPrompt ? '홈 화면에 설치하면 앱처럼 바로 열려요.' : '공유 버튼(□↑) → "홈 화면에 추가"로 앱처럼 쓸 수 있어요.';
}
window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); deferredPrompt = e; updateInstallUI(); });
window.addEventListener('appinstalled', function(){ deferredPrompt = null; updateInstallUI(); toast('앱이 설치됐어요'); });
function doInstall(){
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(function(){ deferredPrompt = null; updateInstallUI(); }, function(){});
}
$('installBtn').addEventListener('click', doInstall);
$('installBtn2').addEventListener('click', doInstall);
$('installClose').addEventListener('click', function(){ store('noinstall','1'); updateInstallUI(); });

/* =========================================================
   한글 조사 / 유틸
   ========================================================= */
function hasBatchim(w){
  var c = w.charCodeAt(w.length-1);
  if(c<0xAC00 || c>0xD7A3) return false;
  return ((c-0xAC00)%28)!==0;
}
function eulReul(w){ return w + (hasBatchim(w) ? '을' : '를'); }
function childRef(name){ return hasBatchim(name) ? name+'이' : name; }  // 건행 -> 건행이, 지아 -> 지아
function rnd(n){ return Math.floor(Math.random()*n); }
function pick(arr){ return arr[rnd(arr.length)]; }
function shuffle(a){ a = a.slice(); for(var i=a.length-1;i>0;i--){ var j=rnd(i+1); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function fill(s, c){
  return s.replace(/\{(\w+)\}/g, function(_, k){ return c[k]!==undefined ? c[k] : ''; });
}

/* =========================================================
   기본 문구(오프라인)
   ========================================================= */
var FOODS = ['오징어','불고기','소고기','돼지고기','닭고기','치킨','생선','새우','계란','두부','고구마','감자','과일','딸기','귤','사과','바나나','수박','포도','미역국','카레','짜장','볶음밥','국수','우동','떡','빵','우유','요거트'];

var OPEN = {
  warm:[ '{t}, 오늘도 {n}의 하루를 이렇게 자세히 전해 주셔서 정말 감사해요.',
         '{t}~ 매일 {n} 이야기를 정성껏 써 주셔서 항상 감사드려요.',
         '{t}, 따뜻한 알림장 잘 읽었어요. 덕분에 {n}의 하루가 눈에 그려져요.' ],
  polite:[ '안녕하세요, {t}. 오늘도 {n}의 하루를 자세히 알려 주셔서 감사합니다.',
           '{t}, 알림장 잘 확인했습니다. 늘 세심하게 살펴 주셔서 감사드립니다.',
           '안녕하세요, {t}. 정성스러운 알림장 감사합니다.' ],
  friendly:[ '{t}~ 오늘도 알림장 감사해요! 읽는 내내 웃음이 났어요 😊',
             '{t}, 알림장 보고 하루 피로가 싹 풀렸어요! 감사해요 😊',
             '{t}~ 오늘 {n} 이야기 들으니 너무 반가워요! 감사해요 😊' ],
  short:[ '{t}, 알림장 잘 읽었어요. 감사합니다!',
          '{t}, 오늘도 감사합니다 😊',
          '{t}, 늘 감사드려요.' ]
};

function closings(tone, isFri, isWeekend){
  if(isWeekend){
    return { warm:['편안하고 행복한 주말 보내세요 💛'], polite:['편안한 주말 보내시길 바랍니다.'], friendly:['주말 잘 보내세요~ 😊'], short:['좋은 하루 보내세요!'] }[tone];
  }
  if(isFri){
    return {
      warm:['{t}도 주말 푹 쉬시고 행복한 시간 보내세요 💛','한 주 동안 고생 많으셨어요. 즐거운 주말 보내세요 😊'],
      polite:['한 주 동안 수고 많으셨습니다. 편안한 주말 보내세요.','늘 감사드립니다. 즐거운 주말 보내세요.'],
      friendly:['주말 잘 보내세요~ 월요일에 또 만나요 😊','한 주 고생 많으셨어요~ 주말엔 푹 쉬세요 💛'],
      short:['즐거운 주말 보내세요!','주말 잘 보내세요 😊']
    }[tone];
  }
  return {
    warm:['{t}도 오늘 하루 고생 많으셨어요. 늘 감사드려요 💛','내일도 잘 부탁드려요. 항상 감사해요 😊'],
    polite:['오늘도 수고 많으셨습니다. 늘 감사드립니다.','내일도 잘 부탁드립니다.'],
    friendly:['내일도 잘 부탁드려요~ 😊','오늘도 고생 많으셨어요~ 💛'],
    short:['내일도 잘 부탁드려요!','오늘도 감사합니다 😊']
  }[tone];
}

/* 주제 감지 (우선순위 순) */
var TOPICS = [
  { key:'health', re:/감기|기침|콧물|컨디션|아프|투약|병원|다쳤|상처|열이|열도|미열|발열|약을/ ,
    lines:[ '컨디션까지 세심하게 살펴 주셔서 정말 감사해요. 집에서도 {n} 잘 살펴볼게요.',
            '알려 주신 내용 잘 확인했어요. 집에서도 {n} 상태를 꼼꼼히 챙기겠습니다.' ] },
  { key:'notice', re:/준비물|가져|부탁|안내|공지|내일|다음 주|월요일|행사|제출|신청/ ,
    lines:[ '안내해 주신 내용 잘 확인했어요. 빠짐없이 챙겨 보낼게요.',
            '공지해 주신 내용 확인했습니다. 잘 준비해서 보내겠습니다.' ] },
  { key:'meal', re:/점심|간식|급식|반찬|식사|먹/ ,
    lines:[ '{food}맛있게 먹었다니 마음이 놓여요. 집에서도 한번 해 줘 봐야겠어요.',
            '{food}잘 먹었다는 얘기에 저도 흐뭇해졌어요.',
            '{nT} 밥도 맛있게 먹고 왔나 봐요. 챙겨 주셔서 감사해요.' ] },
  { key:'play', re:/놀이|놀았|놀이터|뛰|달리|게임|신체|율동/ ,
    lines:[ '신나게 뛰어놀았을 모습이 눈에 선해요.',
            '{nT} 오늘도 마음껏 놀았나 봐요. 집에 오면 뭐가 제일 재밌었는지 물어봐야겠어요.',
            '즐겁게 놀았다니 저도 덩달아 기분이 좋아져요.' ] },
  { key:'art', re:/그리|만들|미술|색칠|꾸미|공작|종이|찰흙/ ,
    lines:[ '직접 만들고 꾸몄다니 얼마나 열심히 했을지 궁금해요.',
            '{nT} 집에 와서 오늘 만든 이야기를 한참 들려줄 것 같아요.' ] },
  { key:'music', re:/노래|음악|악기|춤/ ,
    lines:[ '{nT} 집에 와서도 오늘 배운 노래를 흥얼거릴 것 같아요.',
            '노래하고 춤추는 시간이 즐거웠다니 다행이에요.' ] },
  { key:'outdoor', re:/산책|바깥|나들이|견학|소풍|밖에/ ,
    lines:[ '바깥 활동까지 챙겨 주셔서 감사해요. 많이 신나 했을 것 같아요.',
            '좋은 경험을 하게 해 주셔서 감사합니다.' ] },
  { key:'nap', re:/낮잠/ ,
    lines:[ '낮잠 시간까지 살뜰히 살펴 주셔서 감사해요.' ] },
  { key:'friend', re:/친구|함께|같이|사이좋/ ,
    lines:[ '친구들과 함께 어울리는 모습이 참 보기 좋아요.',
            '친구들과 즐겁게 지낸다니 감사하고 든든해요.' ] },
  { key:'emotion', re:/웃|행복|사랑스|귀여|신나|즐거/ ,
    lines:[ '환하게 웃었다는 얘기에 저도 미소가 지어졌어요.',
            '{nT} 선생님 덕분에 늘 웃으며 지내는 것 같아요.' ] }
];
var GENERIC = [ '{nT} 오늘도 선생님 덕분에 즐거운 하루를 보냈을 것 같아요.',
                '{n}의 하루를 이렇게 알 수 있어 정말 든든해요.',
                '선생님이 계셔서 안심하고 맡길 수 있어요.' ];

function detectFood(text){
  for(var i=0;i<FOODS.length;i++){ if(text.indexOf(FOODS[i])>-1) return FOODS[i]; }
  return '';
}

/* 문장마다 핵심 단어 뒤에 이모지 붙이기 */
var EMOJI_MAP = [
  [/알림장/, '📒'], [/감사/, '🙏'], [/주말/, '🎉'],
  [/점심|급식|식사|밥/, '🍚'], [/간식/, '🍪'], [/오징어/, '🦑'], [/불고기|소고기|돼지고기/, '🥩'],
  [/닭고기|치킨/, '🍗'], [/생선/, '🐟'], [/새우/, '🦐'], [/계란/, '🥚'], [/고구마/, '🍠'], [/감자/, '🥔'],
  [/과일/, '🍎'], [/딸기/, '🍓'], [/귤/, '🍊'], [/바나나/, '🍌'], [/수박/, '🍉'], [/포도/, '🍇'],
  [/빵/, '🍞'], [/우유/, '🥛'], [/국수|우동/, '🍜'], [/카레/, '🍛'], [/떡/, '🍡'],
  [/놀이터/, '🛝'], [/놀이|놀았|놀고|뛰어놀/, '🎈'], [/뛰|달리/, '🏃'],
  [/노래/, '🎵'], [/음악/, '🎶'], [/춤/, '💃'], [/그림|그렸|그리는|그리기|미술|색칠/, '🎨'], [/만들|꾸미|공작/, '✂️'],
  [/산책|나들이/, '🚶'], [/소풍/, '🧺'], [/견학/, '🚌'], [/낮잠/, '😴'],
  [/감기|콧물|기침/, '🤧'], [/미열|발열|열이|열도/, '🌡️'], [/병원/, '🏥'], [/투약|약을/, '💊'],
  [/친구/, '👫'], [/웃/, '😊'], [/행복/, '💛'], [/사랑/, '❤️']
];
var EMOJI_RE = /\p{Extended_Pictographic}/u;
function emojiSentence(s){
  if(!s || EMOJI_RE.test(s)) return s;
  var best = null;
  for(var i=0;i<EMOJI_MAP.length;i++){
    var m = EMOJI_MAP[i][0].exec(s);
    if(m && (best===null || m.index<best.idx)) best = { idx:m.index, len:m[0].length, e:EMOJI_MAP[i][1] };
  }
  if(!best) return s;
  var end = best.idx + best.len;
  while(end < s.length && !/[\s.,!?~…]/.test(s[end])) end++;
  return s.slice(0,end) + best.e + s.slice(end);
}
function emojify(text){
  return text.split('\n').map(function(line){
    return line.split(/(?<=[.!?~…])\s+/).map(emojiSentence).join(' ');
  }).join('\n');
}

function templateReplies(note, o){
  var n = o.child ? childRef(o.child) : '우리 아이';
  var ctx = { n:n, nT:(o.child ? n+'는' : '우리 아이는'), t:o.teacher || '선생님', food:'' };
  var emo = function(s){ return o.emoji==='0' ? s : emojify(s); };
  var food = detectFood(note);
  if(food) ctx.food = eulReul(food) + ' ';

  var found = TOPICS.filter(function(tp){ return tp.re.test(note); });
  if(!found.length) found = [{ key:'generic', lines:GENERIC }];

  var d = new Date().getDay();
  var isFri = d===5, isWeekend = (d===0||d===6);
  var want = parseInt(o.len,10) || 2;
  if(o.tone==='short') want = 1;

  var opens = shuffle(OPEN[o.tone]);
  var closes = shuffle(closings(o.tone, isFri, isWeekend));
  var out = [];
  for(var i=0;i<3;i++){
    var rot = found.slice(i % found.length).concat(found.slice(0, i % found.length));
    var parts = [];
    for(var k=0;k<rot.length && parts.length<want;k++){
      var line = pick(rot[k].lines);
      parts.push(emo(fill(line, ctx).replace(/\s+/g,' ').trim()));
    }
    if(parts.length<want && found[0].key!=='generic'){
      parts.push(emo(fill(pick(GENERIC), ctx)));
    }
    var txt = emo(fill(opens[i % opens.length], ctx));
    if(parts.length) txt += '\n' + parts.join(' ');
    if(o.memo) txt += '\n' + o.memo.replace(/\s+$/,'');
    txt += '\n' + emo(fill(closes[i % closes.length], ctx));
    out.push(txt);
  }
  return out;
}

/* =========================================================
   Gemini
   ========================================================= */
function buildPrompt(note, o){
  var toneMap = { warm:'따뜻하고 다정하게', polite:'정중하고 단정하게', friendly:'친근하고 밝게', short:'아주 짧고 간단하게' };
  var lenMap = { '1':'2~3문장', '2':'4~5문장', '3':'6~8문장' };
  var days = ['일','월','화','수','목','금','토'];
  var d = new Date().getDay();
  var len = o.tone==='short' ? '1~2문장' : lenMap[o.len];
  return [
    '당신은 어린이집/유치원 학부모를 돕는 글쓰기 도우미입니다.',
    '아래는 선생님이 알림장에 쓴 글입니다. 학부모가 선생님께 보낼 답장 문구를 서로 다르게 3가지 작성하세요.',
    '',
    '[규칙]',
    '- 반드시 한국어 존댓말(해요체 또는 합니다체)로 씁니다.',
    '- 말투: ' + toneMap[o.tone] + '. 길이: ' + len + '.',
    '- 알림장에 나온 구체적인 내용(활동, 음식, 아이의 모습 등) 1~2가지를 자연스럽게 언급합니다.',
    '- 선생님의 정성과 수고에 대한 감사 표현을 넣습니다.',
    '- 알림장에 없는 사실, 아이의 병력·성격·가정 사정을 지어내지 않습니다.',
    o.emoji==='0'
      ? '- 이모지는 쓰지 않고, 과장되거나 낯간지러운 표현은 피합니다.'
      : '- 모든 문장마다 그 문장의 핵심 단어 바로 뒤에 어울리는 이모지를 1개씩 붙입니다. (예: "점심을🍚 맛있게 먹었다니 기뻐요.") 같은 이모지를 반복하지 말고, 낯간지러운 표현은 피합니다.',
    '- 3가지 답장은 첫 문장과 구성이 서로 달라야 합니다.',
    '- 오늘은 ' + days[d] + '요일입니다. 금요일이면 주말 인사를, 토·일이면 편안한 하루 인사를, 그 외에는 내일도 잘 부탁드린다는 식의 마무리를 사용하세요.',
    '',
    '[아이 이름] ' + (o.child || '(미입력: "우리 아이"로 표현)'),
    '[선생님 호칭] ' + (o.teacher || '선생님'),
    o.memo ? '[꼭 넣어야 할 말] ' + o.memo : '',
    '',
    '[선생님 알림장]',
    note,
    '',
    '[출력 형식] 다른 설명 없이 JSON 문자열 배열만 출력합니다. 예: ["답장1","답장2","답장3"]'
  ].filter(function(x,i,a){ return x!=='' || (a[i-1]!=='' ); }).join('\n');
}

function parseReplies(text){
  var s = String(text||'').trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
  var j = JSON.parse(s);
  if(j && !Array.isArray(j)){ j = j.replies || j.answers || Object.keys(j).map(function(k){ return j[k]; }); }
  if(!Array.isArray(j)) throw new Error('형식 오류');
  j = j.map(function(x){ return String(x).trim(); }).filter(Boolean);
  if(!j.length) throw new Error('빈 응답');
  return j.slice(0,3);
}

function geminiReplies(note, o){
  var model = o.model || DEFAULT_MODEL;
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
  var ctl = new AbortController();
  var timer = setTimeout(function(){ ctl.abort(); }, 25000);
  return fetch(url, {
    method:'POST',
    signal: ctl.signal,
    headers:{ 'Content-Type':'application/json', 'x-goog-api-key': o.apikey },
    body: JSON.stringify({
      contents:[{ role:'user', parts:[{ text: buildPrompt(note, o) }] }],
      generationConfig:{ responseMimeType:'application/json' }
    })
  }).then(function(r){
    clearTimeout(timer);
    return r.json().then(function(j){
      if(!r.ok){ throw new Error((j && j.error && j.error.message) ? j.error.message : ('HTTP '+r.status)); }
      var parts = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
      var txt = (parts||[]).map(function(p){ return p.text||''; }).join('');
      return parseReplies(txt);
    });
  }, function(err){ clearTimeout(timer); throw err; });
}

/* =========================================================
   결과 화면
   ========================================================= */
function copyText(text, ta){
  function fallback(){
    try{ ta.focus(); ta.select(); var ok = document.execCommand('copy'); ta.setSelectionRange(0,0); return ok; }catch(e){ return false; }
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    return navigator.clipboard.writeText(text).then(function(){ return true; }, function(){ return fallback(); });
  }
  return Promise.resolve(fallback());
}
function autosize(ta){ ta.style.height='auto'; ta.style.height=(ta.scrollHeight+4)+'px'; }

var lastClip = load('lastclip');
function norm(t){ return String(t||'').trim().slice(0,2000); }
function setLastClip(t){ lastClip = norm(t); store('lastclip', lastClip); }

function render(replies, mode, notice, srcNote){
  var nb = $('notice');
  nb.hidden = !notice; nb.textContent = notice || '';
  $('srcText').textContent = srcNote || '';
  var box = $('replies'); box.innerHTML = '';
  replies.forEach(function(r, i){
    var card = document.createElement('div'); card.className='card reply';
    var ta = document.createElement('textarea'); ta.value = r; ta.setAttribute('aria-label','답장 '+(i+1));
    ta.addEventListener('input', function(){ autosize(ta); });
    var bar = document.createElement('div'); bar.className='bar';
    var tag = document.createElement('span'); tag.className='tag'; tag.textContent = (mode==='ai' ? 'AI 문구 ' : '기본 문구 ') + (i+1);
    var cp = document.createElement('button'); cp.className='btn ghost'; cp.type='button'; cp.textContent='📋 복사';
    cp.addEventListener('click', function(){
      setLastClip(ta.value);  // 내가 복사한 답장을 다음 알림장으로 착각하지 않도록
      copyText(ta.value, ta).then(function(ok){
        if(ok){ try{ if(navigator.vibrate) navigator.vibrate(12); }catch(e){} }
        toast(ok ? '복사했어요! 키즈노트에 붙여넣기 하세요' : '복사가 막혀 있어요. 글을 길게 눌러 직접 복사해 주세요');
      });
    });
    bar.appendChild(tag); bar.appendChild(cp);
    card.appendChild(ta); card.appendChild(bar); box.appendChild(card);
  });
}
function sizeReplies(){ [].forEach.call(document.querySelectorAll('#replies textarea'), autosize); }

function goResult(){
  if(cur==='home'){ nav('result'); }
  window.scrollTo(0,0);
  setTimeout(sizeReplies, 0);
}

/* =========================================================
   답장 만들기
   ========================================================= */
var busy = false;
function generate(){
  if(busy) return;
  var note = $('note').value.trim();
  if(!note){ toast('선생님 알림장 내용을 먼저 붙여넣어 주세요'); $('note').focus(); return; }
  store('draft', $('note').value);
  var o = {
    tone: state.tone, len: state.len, emoji: state.emoji,
    child: load('child'), teacher: load('teacher'),
    apikey: load('apikey'), model: load('model'),
    memo: $('memo').value.trim()
  };
  var btn = $('genBtn'), again = $('againBtn');
  busy = true; btn.disabled = true; again.disabled = true; btn.textContent = '쓰는 중이에요…';
  function done(){ busy=false; btn.disabled=false; again.disabled=false; btn.textContent='✨ 답장 만들기'; }

  if(o.apikey){
    geminiReplies(note, o).then(function(rs){
      render(rs, 'ai', '', note); done(); goResult();
    }).catch(function(err){
      var why = (err && err.name==='AbortError') ? '응답이 너무 늦어요' : (err && err.message ? err.message : '알 수 없는 오류');
      if(String(why).length>90) why = String(why).slice(0,90)+'…';
      render(templateReplies(note, o), 'tpl', 'AI 연결에 실패해서(' + why + ') 기본 문구로 만들었어요. 설정에서 키와 모델 이름을 확인해 주세요.', note);
      done(); goResult();
    });
  } else {
    render(templateReplies(note, o), 'tpl', 'AI 키가 없어서 기본 문구로 만들었어요. 설정에서 Gemini 키를 넣으면 알림장 내용에 더 맞게 써 줘요.', note);
    done(); goResult();
  }
}
$('genBtn').addEventListener('click', generate);
$('againBtn').addEventListener('click', generate);

/* =========================================================
   클립보드 붙여넣기 (버튼을 눌렀을 때만 읽어요. 자동으로 읽지 않아요)
   ========================================================= */
function fromClipboard(auto){
  if(auto && cur==='settings') return;
  if(!(navigator.clipboard && navigator.clipboard.readText)){
    if(!auto) toast('이 환경에서는 자동 붙여넣기가 막혀 있어요. 입력칸을 길게 눌러 붙여넣어 주세요');
    return;
  }
  navigator.clipboard.readText().then(function(raw){
    var t = norm(raw);
    if(!t){ if(!auto) toast('복사된 글이 없어요'); return; }
    if(auto && (t.length < 20 || t === lastClip || t === norm($('note').value))) return;
    setLastClip(t);
    $('note').value = String(raw).trim();
    store('draft', $('note').value);
    toast('붙여넣었어요. 아래 "답장 만들기"를 눌러 주세요');
  }).catch(function(){
    if(!auto) toast('클립보드를 읽을 수 없어요. 입력칸을 길게 눌러 붙여넣어 주세요');
  });
}
$('pasteBtn').addEventListener('click', function(){ fromClipboard(false); });

/* =========================================================
   서비스 워커 (오프라인 / 설치)
   ========================================================= */
if('serviceWorker' in navigator){
  var hadController = !!navigator.serviceWorker.controller;
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js', { scope:'./' }).catch(function(){});
  });
  navigator.serviceWorker.addEventListener('controllerchange', function(){
    if(hadController){ toast('새 버전으로 업데이트됐어요'); }
    hadController = true;
  });
}

/* =========================================================
   시작
   ========================================================= */
(function init(){
  $('child').value = load('child');
  $('teacher').value = load('teacher');
  $('apikey').value = load('apikey');
  $('model').value = load('model');
  var t = load('tone'), l = load('len'), em = load('emoji');
  if(t) state.tone = t;
  if(l) state.len = l;
  if(em==='0' || em==='1') state.emoji = em;
  syncChips();
  var dr = load('draft'); if(dr) $('note').value = dr;
  $('verText').textContent = '알림장 답장 도우미 v' + APP_VERSION;
  show('home');
  updateInstallUI();
})();

})();
