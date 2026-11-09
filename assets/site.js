/* Basem Madian Books — public site. Content lives in data.json (edited from admin.html). */
(function(){
"use strict";
var app=document.getElementById("app");
var S=null;

var T={
 en:{books:"Books",how:"How it works",about:"About",kicker:"Author · Pharmacist · Al-Azhar graduate",browse:"Browse the books",amzAuthor:"My books on Amazon",
  howTitle:"How the audio works",s1:"Find the QR code",s1p:"Books with audio have a QR code printed inside.",s2:"Scan it with your phone",s2p:"The camera opens that book's page here. No app to install.",s3:"Listen and repeat",s3p:"Slow the audio down to 0.75× while you learn, then speed it back up.",
  shelf:"The books",all:"All",tracks:function(n){return n+(n===1?" audio track":" audio tracks")},noAudio:"Audio coming soon",
  buy:"Get it on Amazon",sample:"Read a free sample",back:"All books",listen:"Audio",playAll:"Play all",speed:"Speed",aboutTitle:"About the author",contactTitle:"Get in touch",contactP:"Questions about a book, the audio, or bulk orders? Email me:",copy:"Copy email",copied:"Copied",scanHint:"Scan · Listen",notFound:"This book isn't here any more.",onYT:"Open on YouTube",bookN:"Book",loadErr:"The page couldn't load. Check your connection and refresh."},
 ar:{books:"الكتب",how:"إزاي تسمع",about:"عني",kicker:"مؤلف · صيدلي · خريج الأزهر",browse:"تصفّح الكتب",amzAuthor:"كتبي على أمازون",
  howTitle:"إزاي تشغّل الصوتيات",s1:"دوّر على كود QR",s1p:"الكتب اللي ليها صوتيات فيها كود QR مطبوع جوّه.",s2:"امسحه بكاميرا الموبايل",s2p:"هيفتح صفحة الكتاب هنا على طول، من غير ما تنزّل أي تطبيق.",s3:"اسمع وكرّر",s3p:"بطّئ الصوت لـ 0.75× وانت بتتعلم، وبعدين رجّعه لسرعته.",
  shelf:"الكتب",all:"الكل",tracks:function(n){return n+" مقطع صوتي"},noAudio:"الصوتيات قريبًا",
  buy:"اشتريه من أمازون",sample:"اقرأ عينة مجانية",back:"كل الكتب",listen:"الصوتيات",playAll:"تشغيل الكل",speed:"السرعة",aboutTitle:"عن المؤلف",contactTitle:"تواصل معايا",contactP:"عندك سؤال عن كتاب أو الصوتيات أو طلب كميات؟ ابعتلي على الإيميل:",copy:"انسخ الإيميل",copied:"اتنسخ",scanHint:"امسح · اسمع",notFound:"الكتاب ده مش موجود دلوقتي.",onYT:"افتح على YouTube",bookN:"كتاب",loadErr:"الصفحة ما حمّلتش. اتأكد من النت وحدّث الصفحة."}
};
var lang;
try{lang=localStorage.getItem("bm-lang")}catch(e){}
if(lang!=="ar"&&lang!=="en")lang=((navigator.language||"").slice(0,2)==="ar")?"ar":"en";
function t(k){return T[lang][k]}
function applyLang(){document.documentElement.lang=lang;document.documentElement.dir=lang==="ar"?"rtl":"ltr"}
applyLang();

function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function el(html){var d=document.createElement("div");d.innerHTML=html.trim();return d.firstChild}
function fmt(sec){if(!isFinite(sec))return"0:00";sec=Math.floor(sec);return Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0")}
function findBook(id){for(var i=0;i<S.books.length;i++)if(S.books[i].id===id)return S.books[i];return null}
function toast(msg){var x=el('<div class="toast" role="status">'+esc(msg)+'</div>');document.body.appendChild(x);setTimeout(function(){x.remove()},2600)}
function desc(b){return(lang==="ar"?(b.desc_ar||b.desc_en):(b.desc_en||b.desc_ar))||""}
function seriesList(){var m=[];S.books.forEach(function(b){if(b.series&&m.indexOf(b.series)<0)m.push(b.series)});return m}
function coverHTML(b){
  var c=esc(b.color||"#1F3A93");
  if(b.cover)return'<div class="cover" style="--c:'+c+'"><img src="'+esc(b.cover)+'" alt="'+esc(b.title)+'" loading="lazy"></div>';
  return'<div class="cover" style="--c:'+c+'" role="img" aria-label="'+esc(b.title)+'"><div class="gen"><div class="s">'+esc(b.series||"")+'</div>'+(b.num?'<div class="n">Book '+esc(b.num)+'</div>':'')+(b.tracks&&b.tracks.length?'<div class="ring"></div>':'')+'<div class="t">'+esc(b.title)+'</div><div class="a">'+esc(S.site.name)+'</div></div></div>';
}
var WAVE=[8,14,22,30,18,36,44,28,16,24,40,48,34,20,12,26,38,46,30,18,10,22,34,26,14,8];
function waveHTML(){return'<div class="wave" aria-hidden="true">'+WAVE.map(function(h,i){return'<i style="height:'+h+'px;animation-delay:'+(i*0.06).toFixed(2)+'s"></i>'}).join("")+'</div>'}

function ytList(u){if(!u)return"";var m=/[?&]list=([A-Za-z0-9_-]+)/.exec(u);return m?m[1]:""}
function currentBook(){
  var q=new URLSearchParams(location.search).get("b");
  if(q)return q;
  var h=location.hash.replace(/^#/,"");
  return h.indexOf("book-")===0?h.slice(5):null;
}
var filter="";
function render(){
  var id=currentBook();
  var html=headerHTML()+'<main>'+(id?bookHTML(id):homeHTML())+'</main>'+aboutHTML()+'<footer><div class="wrap">© '+new Date().getFullYear()+' '+esc(S.site.name)+'</div></footer>';
  app.innerHTML=html;
  wire(id);
  document.title=id&&findBook(id)?findBook(id).title+" · "+S.site.name:"Basem Madian Books";
  var h=location.hash.replace(/^#/,"");
  if(!id&&h&&document.getElementById(h))document.getElementById(h).scrollIntoView();
}
function headerHTML(){
  return'<header class="top"><div class="wrap"><a class="brand" href="./"><span class="mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"/></svg></span>'+esc(S.site.name)+'</a><nav><a class="hide-sm" href="./#books">'+t("books")+'</a><a class="hide-sm" href="./#how">'+t("how")+'</a><a class="hide-sm" href="#about">'+t("about")+'</a><button class="lang" id="langBtn" type="button">'+(lang==="ar"?"English":"عربي")+'</button></nav></div></header>';
}
function homeHTML(){
  var feat=S.books[0];
  var s='<section class="hero"><div class="wrap"><div><div class="label">'+t("kicker")+'</div><h1>'+esc(lang==="ar"?S.site.tagline_ar:S.site.tagline_en)+'</h1><p class="sub">'+esc(lang==="ar"?S.site.intro_ar:S.site.intro_en)+'</p><div class="ctas"><a class="btn btn-primary" href="#books">'+t("browse")+'</a>'+(S.site.amazonAuthor?'<a class="btn btn-ghost" href="'+esc(S.site.amazonAuthor)+'" target="_blank" rel="noopener">'+t("amzAuthor")+' ↗</a>':'')+'</div></div>';
  if(feat)s+='<div class="stage">'+coverHTML(feat)+'<div class="qr-tag"><span class="qrmini"></span><span>'+t("scanHint")+'</span></div>'+waveHTML()+'</div>';
  s+='</div></section>';
  s+='<section class="how" id="how"><div class="wrap"><h2 style="font-size:clamp(22px,3vw,30px)">'+t("howTitle")+'</h2><div class="steps"><div class="step"><b>1</b><h3>'+t("s1")+'</h3><p>'+t("s1p")+'</p></div><div class="step"><b>2</b><h3>'+t("s2")+'</h3><p>'+t("s2p")+'</p></div><div class="step"><b>3</b><h3>'+t("s3")+'</h3><p>'+t("s3p")+'</p></div></div></div></section>';
  var ser=seriesList();
  s+='<section class="shelf" id="books"><div class="wrap"><div class="shelf-head"><h2>'+t("shelf")+'</h2></div>';
  if(ser.length>1)s+='<div class="chips"><button class="chip" data-f="" aria-pressed="'+(filter===""?"true":"false")+'">'+t("all")+'</button>'+ser.map(function(x){return'<button class="chip" data-f="'+esc(x)+'" aria-pressed="'+(filter===x?"true":"false")+'">'+esc(x)+'</button>'}).join("")+'</div>';
  s+='<div class="grid">'+S.books.filter(function(b){return!filter||b.series===filter}).map(function(b){
    var n=(b.tracks||[]).length;
    return'<a class="card" href="?b='+encodeURIComponent(b.id)+'">'+coverHTML(b)+'<h3>'+esc(b.title)+'</h3><div class="meta">'+(n?'<span class="pill">♪ '+esc(t("tracks")(n))+'</span>':'<span class="pill none">'+t("noAudio")+'</span>')+'</div></a>'}).join("")+'</div></div></section>';
  return s;
}
function bookHTML(id){
  var b=findBook(id);
  var back='<a class="back" href="./#books">'+(lang==="ar"?"→":"←")+' '+t("back")+'</a>';
  if(!b)return'<section class="book"><div class="wrap">'+back+'<p>'+t("notFound")+'</p></div></section>';
  var tr=b.tracks||[];
  var s='<section class="book"><div class="wrap">'+back+'<div class="book-grid"><div>'+coverHTML(b)+'</div><div><div class="label">'+esc(b.series||"")+(b.num?' · '+t("bookN")+' '+esc(b.num):'')+'</div><h1>'+esc(b.title)+'</h1>'+(b.subtitle?'<p class="subt">'+esc(b.subtitle)+'</p>':'')+'<p class="desc">'+esc(desc(b))+'</p><div class="actions">'+(b.amazon?'<a class="btn btn-gold" href="'+esc(b.amazon)+'" target="_blank" rel="noopener">'+t("buy")+' ↗</a>':'')+(b.sample&&b.sample.file?'<a class="btn btn-ghost" href="'+esc(b.sample.file)+'" target="_blank" rel="noopener">'+t("sample")+'</a>':'')+'</div>';
  var list=ytList(b.youtube);
  if(list)s+='<div class="ytbox"><iframe src="https://www.youtube-nocookie.com/embed/videoseries?list='+encodeURIComponent(list)+'" title="'+esc(b.title)+'" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>';
  var hasFiles=tr.some(function(x){return x.file});
  s+='<div class="playlist"><header><h2>'+t("listen")+'</h2>'+(hasFiles?'<button class="btn btn-primary btn-sm" id="playAll" type="button">▶ '+t("playAll")+'</button>':'')+(b.youtube?'<a class="btn btn-ghost btn-sm" href="'+esc(b.youtube)+'" target="_blank" rel="noopener">'+t("onYT")+' ↗</a>':'')+'</header>';
  if(tr.length)s+=tr.map(function(x,i){
    if(x.yt)return'<a class="track" href="'+esc(x.yt)+'" target="_blank" rel="noopener" data-c="'+esc(x.id)+'"><span class="num">'+(i+1)+'</span><span class="tt">'+esc(x.title)+'</span><span class="d">YouTube ↗</span></a>';
    return'<button type="button" class="track'+(P.book===b.id&&P.i===i?' on':'')+'" data-i="'+i+'"><span class="num">'+(i+1)+'</span><span class="tt">'+esc(x.title)+'</span><span class="d">'+(x.dur?fmt(x.dur):'▶')+'</span></button>'}).join("");
  else if(!list)s+='<div class="empty">'+t("noAudio")+'</div>';
  s+='</div></div></div></div></section>';
  return s;
}
function aboutHTML(){
  return'<section class="about" id="about"><div class="wrap"><div><div class="label">'+t("about")+'</div><h2 style="margin:8px 0 14px">'+t("aboutTitle")+'</h2><p>'+esc(lang==="ar"?S.site.bio_ar:S.site.bio_en)+'</p></div><div class="contact" id="contact"><h3 style="font-size:20px;margin-bottom:8px">'+t("contactTitle")+'</h3><p style="margin:0 0 10px;color:var(--muted)">'+t("contactP")+'</p><p class="em" id="emailTxt">'+esc(S.site.email)+'</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" id="copyEmail" type="button">'+t("copy")+'</button><a class="btn btn-ghost btn-sm" href="mailto:'+esc(S.site.email)+'">✉</a></div></div></div></section>';
}
function wire(id){
  document.getElementById("langBtn").onclick=function(){lang=lang==="ar"?"en":"ar";try{localStorage.setItem("bm-lang",lang)}catch(e){}applyLang();render();renderPlayer()};
  app.querySelectorAll(".chip").forEach(function(c){c.onclick=function(){filter=c.getAttribute("data-f");render()}});
  var ce=document.getElementById("copyEmail");
  if(ce)ce.onclick=function(){var n=document.getElementById("emailTxt");try{navigator.clipboard.writeText(S.site.email).then(function(){toast(t("copied"))},function(){sel(n)})}catch(e){sel(n)}};
  var pa=document.getElementById("playAll");
  if(pa)pa.onclick=function(){playTrack(id,0)};
  app.querySelectorAll("button.track").forEach(function(b){b.onclick=function(){var i=+b.getAttribute("data-i");if(P.book===id&&P.i===i)toggle();else playTrack(id,i)}});
}
function sel(n){var r=document.createRange();r.selectNodeContents(n);var s=getSelection();s.removeAllRanges();s.addRange(r)}

/* player */
var audio=new Audio();audio.preload="metadata";
var P={book:null,i:-1,rate:1},playerEl=null;
function playTrack(bookId,i){
  var b=findBook(bookId);if(!b||!b.tracks[i])return;
  P.book=bookId;P.i=i;audio.src=b.tracks[i].file;audio.playbackRate=P.rate;
  audio.play().catch(function(){});renderPlayer();markTracks();
}
function toggle(){if(audio.paused)audio.play().catch(function(){});else audio.pause()}
function step(d){var b=findBook(P.book);if(!b)return;var n=P.i+d;if(n>=0&&n<b.tracks.length)playTrack(P.book,n)}
audio.addEventListener("ended",function(){step(1)});
["play","pause","timeupdate"].forEach(function(e){audio.addEventListener(e,updPlayer)});
audio.addEventListener("loadedmetadata",function(){
  var b=findBook(P.book);
  if(b&&b.tracks[P.i]&&!b.tracks[P.i].dur&&isFinite(audio.duration)){b.tracks[P.i].dur=Math.round(audio.duration);var r=app.querySelector('.track[data-i="'+P.i+'"] .d');if(r)r.textContent=fmt(audio.duration)}
  updPlayer();
});
function markTracks(){app.querySelectorAll(".track").forEach(function(x){x.classList.toggle("on",currentBook()===P.book&&+x.getAttribute("data-i")===P.i)})}
function renderPlayer(){
  if(!P.book)return;
  var b=findBook(P.book),tr=b&&b.tracks[P.i];if(!tr)return;
  if(playerEl)playerEl.remove();
  playerEl=el('<div class="player" role="region" aria-label="Audio player"><div class="wrap"><button class="pbtn" id="pPlay" type="button" aria-label="Play or pause"></button><div class="prevnext" style="display:flex;gap:6px"><button class="pbtn alt" id="pPrev" type="button" aria-label="Previous">'+(lang==="ar"?"⏭":"⏮")+'</button><button class="pbtn alt" id="pNext" type="button" aria-label="Next">'+(lang==="ar"?"⏮":"⏭")+'</button></div><div class="pinfo"><div class="pt">'+esc(tr.title)+' · <span style="color:var(--muted);font-weight:400">'+esc(b.title)+'</span></div><div class="pbar"><span id="pCur">0:00</span><input id="pSeek" type="range" min="0" max="1000" value="0" aria-label="Seek"><span id="pDur">0:00</span></div></div><label style="display:flex;gap:6px;align-items:center;font-size:13px;color:var(--muted)"><span>'+t("speed")+'</span><select class="speed" id="pRate">'+[0.5,0.75,1,1.25,1.5].map(function(r){return'<option value="'+r+'"'+(r===P.rate?' selected':'')+'>'+r+'×</option>'}).join("")+'</select></label></div></div>');
  document.body.appendChild(playerEl);document.body.classList.add("has-player");
  playerEl.querySelector("#pPlay").onclick=toggle;
  playerEl.querySelector("#pPrev").onclick=function(){step(-1)};
  playerEl.querySelector("#pNext").onclick=function(){step(1)};
  playerEl.querySelector("#pRate").onchange=function(e){P.rate=+e.target.value;audio.playbackRate=P.rate};
  playerEl.querySelector("#pSeek").oninput=function(e){if(isFinite(audio.duration))audio.currentTime=audio.duration*e.target.value/1000};
  updPlayer();
}
function updPlayer(){
  document.body.classList.toggle("playing",!audio.paused);
  if(!playerEl)return;
  playerEl.querySelector("#pPlay").innerHTML=audio.paused?'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z"/></svg>':'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
  playerEl.querySelector("#pCur").textContent=fmt(audio.currentTime);
  playerEl.querySelector("#pDur").textContent=fmt(audio.duration);
  var sk=playerEl.querySelector("#pSeek");if(document.activeElement!==sk&&isFinite(audio.duration)&&audio.duration>0)sk.value=Math.round(audio.currentTime/audio.duration*1000);
}

function chapterRedirect(){
  var q=new URLSearchParams(location.search),bid=q.get("b"),cid=q.get("c");
  if(!bid||!cid)return false;
  var b=findBook(bid);if(!b)return false;
  var tr=(b.tracks||[]).filter(function(t){return t.id===cid})[0];
  if(tr&&tr.yt){location.replace(tr.yt);return true}
  return false;
}
fetch("data.json?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw r;return r.json()}).then(function(d){S=d;if(chapterRedirect())return;render();var c=new URLSearchParams(location.search).get("c");if(c){var b=findBook(currentBook());if(b){var i=(b.tracks||[]).map(function(t){return t.id}).indexOf(c);var row=app.querySelector('.track[data-i="'+i+'"]');if(row){row.classList.add("on");row.scrollIntoView({block:"center"})}}}}).catch(function(){app.innerHTML='<p style="padding:40px;text-align:center">'+esc(t("loadErr"))+'</p>'});
})();
