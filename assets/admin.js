/* لوحة التحكم — بتعدّل data.json وبترفع الملفات على GitHub مباشرة من المتصفح. */
(function(){
"use strict";
var root=document.getElementById("root");
var API="https://api.github.com";
var cfg=null,S=null,dataSha=null,dirty=false,toDelete=[];

/* ---------- helpers ---------- */
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function el(h){var d=document.createElement("div");d.innerHTML=h.trim();return d.firstChild}
function rid(){return Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3)}
function slug(s){var x=String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50);return x||("book-"+rid())}
function ext(n){var m=/\.([a-z0-9]+)$/i.exec(n||"");return m?m[1].toLowerCase():""}
function fmt(s){if(!isFinite(s)||!s)return"";s=Math.round(s);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function toast(m){var x=el('<div class="toast" role="status">'+esc(m)+'</div>');document.body.appendChild(x);setTimeout(function(){x.remove()},3200)}
function findBook(id){for(var i=0;i<S.books.length;i++)if(S.books[i].id===id)return S.books[i];return null}
function loadCfg(){try{return JSON.parse(localStorage.getItem("bm-gh")||"null")}catch(e){return null}}
function saveCfg(c){try{localStorage.setItem("bm-gh",JSON.stringify(c))}catch(e){}}
function guessRepo(){
  var h=location.hostname,m=/^([a-z0-9-]+)\.github\.io$/i.exec(h);
  if(!m)return{owner:"",repo:""};
  var seg=location.pathname.split("/").filter(Boolean)[0];
  if(seg&&!/\.html$/.test(seg))return{owner:m[1],repo:seg};
  return{owner:m[1],repo:m[1]+".github.io"};
}
function siteBase(){
  var u=(S&&S.site.siteUrl)||"";
  if(!u&&cfg){var o=cfg.owner.toLowerCase();u=(cfg.repo.toLowerCase()===o+".github.io")?"https://"+o+".github.io/":"https://"+o+".github.io/"+cfg.repo+"/"}
  u=u.replace(/[?#].*$/,"");if(u&&!/\/$/.test(u))u+="/";
  return u;
}
function bookLink(id){var b=siteBase();return b?b+"?b="+encodeURIComponent(id):""}
function markDirty(){dirty=true;renderSaveBar()}
window.addEventListener("beforeunload",function(e){if(dirty){e.preventDefault();e.returnValue=""}});

/* ---------- GitHub API ---------- */
function encPath(p){return p.split("/").map(encodeURIComponent).join("/")}
function gh(method,path,body){
  return fetch(API+"/repos/"+encodeURIComponent(cfg.owner)+"/"+encodeURIComponent(cfg.repo)+(path==null?"":"/contents/"+encPath(path)),{
    method:method,cache:"no-store",
    headers:{"Authorization":"Bearer "+cfg.token,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},
    body:body?JSON.stringify(body):undefined
  }).then(function(r){
    if(r.status===404&&method==="GET")return null;
    if(!r.ok)return r.json().catch(function(){return{}}).then(function(j){throw{status:r.status,message:j.message||""}});
    return r.status===204?{}:r.json();
  });
}
function ghErr(e){
  var s=e&&e.status;
  if(s===401)return"التوكن غلط أو انتهت صلاحيته. اعمل توكن جديد من GitHub وحطه تاني.";
  if(s===403)return"التوكن مالوش صلاحية الكتابة. اتأكد إنك اخترت Contents: Read and write للمستودع ده.";
  if(s===404)return"المستودع مش موجود أو التوكن مش شايفه. راجع اسم المستخدم واسم المستودع.";
  if(s===409||s===422)return"فيه تعديل أحدث على GitHub. حدّث الصفحة وجرّب تاني.";
  if(s===413)return"الملف كبير أوي. خلّي ملفات الصوت أقل من 25 ميجا.";
  if(!s)return"مفيش اتصال بـ GitHub. اتأكد من النت.";
  return"GitHub رجّع خطأ ("+s+") "+(e.message||"");
}
function b64utf8(str){var bytes=new TextEncoder().encode(str),bin="";for(var i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(bin)}
function utf8b64(b64){var bin=atob(b64.replace(/\s/g,"")),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new TextDecoder().decode(u)}
function fileB64(f){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(String(r.result).split(",")[1])};r.onerror=rej;r.readAsDataURL(f)})}

/* ---------- screens ---------- */
function setupScreen(err){
  var g=guessRepo(),c=cfg||{};
  root.innerHTML='<h1 style="margin-bottom:8px">ربط لوحة التحكم بـ GitHub</h1><p style="color:var(--muted);max-width:60ch;margin:0 0 20px">الخطوة دي بتتعمل مرة واحدة بس على كل جهاز. التوكن بيتحفظ في المتصفح ده بس، ومحدش غيرك بيشوفه.</p>'+
  '<div class="panel">'+(err?'<div class="note warn">'+esc(err)+'</div>':'')+
  '<div class="row2"><label class="fld"><span>اسم المستخدم على GitHub</span><input id="cOwner" type="text" class="ltr" value="'+esc(c.owner||g.owner)+'" autocomplete="off"></label><label class="fld"><span>اسم المستودع (Repository)</span><input id="cRepo" type="text" class="ltr" value="'+esc(c.repo||g.repo)+'" autocomplete="off"><small>غالبًا: اسمك.github.io</small></label></div>'+
  '<label class="fld"><span>التوكن (Token)</span><input id="cTok" type="text" class="ltr" value="" placeholder="github_pat_..." autocomplete="off"><small>اعمله من <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">صفحة التوكنات في GitHub</a>. الخطوات تحت.</small></label>'+
  '<div><button class="btn btn-primary" id="cGo" type="button">اتصال</button></div></div>'+
  helpHTML(true);
  document.getElementById("cGo").onclick=function(){
    var o=document.getElementById("cOwner").value.trim(),r=document.getElementById("cRepo").value.trim(),tk=document.getElementById("cTok").value.trim();
    if(!o||!r||!tk){toast("املا الخانات التلاتة.");return}
    cfg={owner:o,repo:r,token:tk};
    this.disabled=true;this.textContent="جاري الاتصال…";
    load().then(function(){saveCfg(cfg)},function(e){var m=ghErr(e);cfg=null;setupScreen(m)});
  };
}
function helpHTML(open){
  return'<details class="help"'+(open?' open':'')+'><summary>إزاي أعمل التوكن؟ (مرة واحدة)</summary><ol>'+
  '<li>افتح <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a> وانت مسجّل دخول.</li>'+
  '<li><b>Token name:</b> اكتب أي اسم، مثلاً <code>site-admin</code>.</li>'+
  '<li><b>Expiration:</b> اختار أطول مدة متاحة. لما تخلص، اعمل توكن جديد وحطه هنا.</li>'+
  '<li><b>Repository access:</b> اختار <b>Only select repositories</b> واختار مستودع الموقع بس.</li>'+
  '<li><b>Permissions → Repository permissions → Contents:</b> اختار <b>Read and write</b>.</li>'+
  '<li>دوس <b>Generate token</b>، وانسخ الكود اللي بيبدأ بـ <code>github_pat_</code> وحطه في الخانة فوق.</li>'+
  '<li>ما تبعتش التوكن لحد أبدًا، ولا تحطه في أي ملف في الموقع.</li></ol></details>';
}
function load(){
  return gh("GET",null).then(function(repo){
    if(!repo)throw{status:404};
    if(repo.permissions&&!repo.permissions.push)throw{status:403};
    return gh("GET","data.json");
  }).then(function(f){
    if(!f)throw{status:404,message:"data.json مش موجود في المستودع"};
    dataSha=f.sha;S=JSON.parse(utf8b64(f.content));S.books=S.books||[];dirty=false;toDelete=[];
    mainScreen();
  });
}
function mainScreen(){
  root.innerHTML='<h1>'+esc(S.site.name)+'</h1><p style="color:var(--muted);margin:6px 0 0">'+S.books.length+' كتاب · متصل بـ <span class="ltr" style="display:inline-block">'+esc(cfg.owner+"/"+cfg.repo)+'</span></p>'+
  '<div class="toolbar"><button class="btn btn-primary" id="mAdd" type="button">+ إضافة كتاب</button><button class="btn btn-ghost" id="mSite" type="button">بيانات الموقع</button><a class="btn btn-ghost" href="./" target="_blank" rel="noopener">عرض الموقع ↗</a><button class="btn btn-ghost btn-sm" id="mOut" type="button" style="margin-inline-start:auto">فصل الجهاز ده</button></div>'+
  '<div class="admgrid">'+S.books.map(function(b){var n=(b.tracks||[]).length;return'<button class="admcard" type="button" data-id="'+esc(b.id)+'">'+coverHTML(b)+'<h3>'+esc(b.title)+'</h3><div class="meta">'+(n?"♪ "+n+" مقطع":"مفيش صوتيات")+(b.amazon&&b.amazon.indexOf("/dp/")<0?' · <span style="color:var(--warn)">رابط أمازون مش مباشر</span>':'')+'</div></button>'}).join("")+'</div>'+
  helpUse();
  root.querySelectorAll(".admcard").forEach(function(c){c.onclick=function(){openBook(c.getAttribute("data-id"))}});
  document.getElementById("mAdd").onclick=function(){openBook(null)};
  document.getElementById("mSite").onclick=openSite;
  document.getElementById("mOut").onclick=function(){
    if(this.getAttribute("data-sure")){try{localStorage.removeItem("bm-gh")}catch(e){}cfg=null;dirty=false;renderSaveBar();setupScreen()}
    else{this.setAttribute("data-sure","1");this.textContent="اضغط تاني: هيمسح التوكن من الجهاز ده"}
  };
  renderSaveBar();
}
function helpUse(){
  return'<details class="help"><summary>دليل سريع</summary><ol>'+
  '<li>دوس على أي كتاب علشان تعدّله، أو «+ إضافة كتاب» لكتاب جديد.</li>'+
  '<li>ارفع ملفات الصوت (MP3) كلها مرة واحدة. سمّيها <code>01</code> و<code>02</code>… علشان تترتب صح.</li>'+
  '<li>دوس «تم»، وبعدين «حفظ ونشر» في الشريط البرتقالي. الموقع بيتحدث خلال دقيقة أو اتنين.</li>'+
  '<li>نزّل كود QR من شاشة الكتاب، وامسحه بموبايلك قبل ما تطبعه.</li>'+
  '<li>ما تمسحش كتاب وتضيفه تاني بعد ما تطبع الكود بتاعه، علشان رابطه هيتغيّر. عدّله بس.</li>'+
  '<li>ارفع عينة PDF بس (الفصل الأول) لو الكتاب في KDP Select، مش الكتاب كامل.</li></ol></details>';
}
var GEN_SERIES={};
function coverHTML(b){
  var c=esc(b.color||"#1F3A93"),src=b._coverURL||b.cover;
  if(src)return'<div class="cover" style="--c:'+c+'"><img src="'+esc(src)+'" alt="" loading="lazy"></div>';
  return'<div class="cover" style="--c:'+c+'"><div class="gen"><div class="s">'+esc(b.series||"")+'</div>'+(b.num?'<div class="n">Book '+esc(b.num)+'</div>':'')+'<div class="t">'+esc(b.title)+'</div><div class="a">'+esc(S.site.name)+'</div></div></div>';
}
var bar=null;
function renderSaveBar(){
  if(bar){bar.remove();bar=null}
  if(!dirty||!cfg)return;
  bar=el('<div class="savebar"><div class="wrap"><span>عندك تعديلات لسه ما اتنشرتش على الموقع.</span><button class="btn" id="sGo" type="button">● حفظ ونشر</button></div></div>');
  document.body.appendChild(bar);
  bar.querySelector("#sGo").onclick=publish;
}

/* ---------- modal ---------- */
function modal(title,body,foot){
  var m=el('<div class="modal" role="dialog" aria-modal="true"><div class="sheet"><header><h2>'+esc(title)+'</h2><button class="ib" data-x type="button" aria-label="إغلاق">✕</button></header><div class="body">'+body+'</div><div class="foot">'+(foot||"")+'</div></div></div>');
  document.body.appendChild(m);
  m.querySelector("[data-x]").onclick=function(){m.remove()};
  return m;
}
function fld(label,id,val,o){
  o=o||{};
  var inp=o.area?'<textarea id="'+id+'" class="'+(o.ltr?"ltr":"")+'">'+esc(val)+'</textarea>':'<input id="'+id+'" type="'+(o.type||"text")+'" class="'+(o.ltr?"ltr":"")+'" value="'+esc(val)+'"'+(o.ph?' placeholder="'+esc(o.ph)+'"':'')+'>';
  return'<label class="fld"><span>'+label+'</span>'+inp+(o.hint?'<small>'+o.hint+'</small>':'')+'</label>';
}

/* ---------- site settings ---------- */
function openSite(){
  var s=S.site;
  var m=modal("بيانات الموقع",
    fld("اسمك اللي يظهر في الموقع","fName",s.name)+
    '<div class="row2">'+fld("الجملة الرئيسية (إنجليزي)","fTagEn",s.tagline_en,{ltr:true})+fld("الجملة الرئيسية (عربي)","fTagAr",s.tagline_ar)+'</div>'+
    '<div class="row2">'+fld("المقدمة (إنجليزي)","fIntroEn",s.intro_en,{area:true,ltr:true})+fld("المقدمة (عربي)","fIntroAr",s.intro_ar,{area:true})+'</div>'+
    '<div class="row2">'+fld("نبذة عنك (إنجليزي)","fBioEn",s.bio_en,{area:true,ltr:true})+fld("نبذة عنك (عربي)","fBioAr",s.bio_ar,{area:true})+'</div>'+
    fld("إيميل التواصل","fEmail",s.email,{type:"email",ltr:true})+
    fld("رابط صفحتك على أمازون","fAmz",s.amazonAuthor,{type:"url",ltr:true,hint:"من Amazon Author Central انسخ رابط صفحة المؤلف."})+
    fld("رابط الموقع (اللي بيتحط في أكواد QR)","fUrl",s.siteUrl,{type:"url",ltr:true,ph:siteBase(),hint:"سيبه فاضي علشان يستخدم رابط GitHub تلقائي. لو اشتريت دومين، اكتبه هنا <b>قبل</b> ما تطبع أي كود."}),
    '<span></span><button class="btn btn-primary" id="fOk" type="button">تم</button>');
  m.querySelector("#fOk").onclick=function(){
    var g=function(id){return m.querySelector("#"+id).value.trim()};
    s.name=g("fName")||s.name;s.tagline_en=g("fTagEn");s.tagline_ar=g("fTagAr");s.intro_en=g("fIntroEn");s.intro_ar=g("fIntroAr");s.bio_en=g("fBioEn");s.bio_ar=g("fBioAr");s.email=g("fEmail");s.amazonAuthor=g("fAmz");s.siteUrl=g("fUrl");
    m.remove();markDirty();mainScreen();
  };
}

/* ---------- QR ---------- */
function qrCanvas(text,px){
  var q=qrcode(0,"M");q.addData(text);q.make();
  var n=q.getModuleCount(),quiet=4,cell=Math.max(1,Math.floor(px/(n+quiet*2))),size=cell*(n+quiet*2);
  var c=document.createElement("canvas");c.width=c.height=size;var x=c.getContext("2d");
  x.fillStyle="#fff";x.fillRect(0,0,size,size);x.fillStyle="#000";
  for(var r=0;r<n;r++)for(var k=0;k<n;k++)if(q.isDark(r,k))x.fillRect((k+quiet)*cell,(r+quiet)*cell,cell,cell);
  return c;
}
function printableQR(link,title){
  var q=qrCanvas(link,1100),W=1200,H=1440,c=document.createElement("canvas");c.width=W;c.height=H;var x=c.getContext("2d");
  x.fillStyle="#fff";x.fillRect(0,0,W,H);x.imageSmoothingEnabled=false;x.drawImage(q,(W-1100)/2,40,1100,1100);
  x.fillStyle="#111";x.textAlign="center";x.font="600 56px 'IBM Plex Sans Arabic',sans-serif";x.fillText("Scan to listen · امسح واسمع",W/2,1240);
  x.font="40px 'IBM Plex Sans Arabic',sans-serif";x.fillStyle="#444";var tt=title||"";if(tt.length>48)tt=tt.slice(0,46)+"…";x.fillText(tt,W/2,1320);
  return c;
}

/* ---------- book editor ---------- */
function openBook(id){
  var orig=id?findBook(id):null;
  var b=orig||{id:"",title:"",subtitle:"",series:"",num:null,color:"#1F3A93",amazon:"",desc_en:"",desc_ar:"",cover:null,sample:null,tracks:[]};
  var draft={cover:b.cover,_coverFile:b._coverFile,_coverURL:b._coverURL,sample:b.sample,_sampleFile:b._sampleFile,tracks:(b.tracks||[]).map(function(t){return Object.assign({},t)}),removed:[]};
  var m=modal(orig?"تعديل: "+orig.title:"كتاب جديد",
    '<div class="row2">'+fld("اسم الكتاب (زي ما هو على أمازون)","bTitle",b.title,{ltr:true})+fld("العنوان الفرعي","bSub",b.subtitle,{ltr:true})+'</div>'+
    '<div class="row2">'+fld("السلسلة","bSeries",b.series,{ltr:true,hint:"الكتب اللي ليها نفس اسم السلسلة بتتجمع مع بعض."})+'<div class="row2">'+fld("رقمه في السلسلة","bNum",b.num==null?"":b.num,{type:"number",ltr:true})+'<label class="fld"><span>لون الغلاف</span><input id="bColor" type="color" value="'+esc(b.color||"#1F3A93")+'" style="width:100%;height:42px;border:1px solid var(--line);border-radius:10px;background:var(--bg)"></label></div></div>'+
    fld("رابط الكتاب على أمازون","bAmz",b.amazon,{type:"url",ltr:true,ph:"https://www.amazon.com/dp/XXXXXXXXXX",hint:"أفضل شكل: amazon.com/dp/ وبعده رقم ASIN بتاع الكتاب."})+
    fld("رابط الـ Playlist بتاعة الكتاب على YouTube","bYT",b.youtube||"",{type:"url",ltr:true,ph:"https://www.youtube.com/playlist?list=...",hint:"من YouTube: افتح الـ Playlist ودوس Share وانسخ الرابط. هتظهر جوه صفحة الكتاب."})+
    '<div class="row2">'+fld("وصف (إنجليزي)","bDescEn",b.desc_en,{area:true,ltr:true})+fld("وصف (عربي)","bDescAr",b.desc_ar,{area:true})+'</div>'+
    '<div class="box"><h3>الغلاف</h3><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span id="cvPrev"></span><label class="btn btn-ghost btn-sm">اختار صورة الغلاف<input id="cvFile" type="file" accept="image/jpeg,image/png,image/webp" hidden></label><button class="btn btn-ghost btn-sm" id="cvDel" type="button">غلاف تلقائي</button></div><small style="color:var(--muted)">JPG أو PNG بعرض حوالي 800 بكسل. لو ما اخترتش صورة، الموقع بيعمل غلاف بلون السلسلة.</small></div>'+
    '<div class="box"><h3>الشابترات (فيديو YouTube أو ملف صوت)</h3><div id="trList" style="display:grid;gap:8px"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="trYT" type="button">+ شابتر برابط YouTube</button><label class="btn btn-ghost btn-sm">+ رفع ملفات صوت MP3<input id="trFile" type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" multiple hidden></label></div><small style="color:var(--muted)">لكل شابتر زرار <b>QR</b> بينزّل كود ثابت للشابتر ده. حطه جنب عنوان الشابتر في الكتاب. لو غيّرت الفيديو بعدين، غيّر الرابط هنا بس والكود المطبوع يفضل شغال.</small></div>'+
    '<div class="box"><h3>عينة مجانية (PDF)</h3><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span id="smName" style="font-size:14px"></span><label class="btn btn-ghost btn-sm">اختار PDF<input id="smFile" type="file" accept="application/pdf" hidden></label><button class="btn btn-ghost btn-sm" id="smDel" type="button">إزالة</button></div><div class="note warn">لو الكتاب الإلكتروني في KDP Select، ممنوع تنشر نسخة رقمية كاملة منه في أي مكان. ارفع عينة بس (أقل من 10%).</div></div>'+
    (orig?'<div class="box"><h3>كود QR للكتاب</h3><div class="qrwrap"><div class="qrbox" id="qrBox"></div><div style="display:grid;gap:8px;min-width:0;flex:1"><code class="ltr" id="qrLink" style="font-size:13px;overflow-wrap:anywhere"></code><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="qrDl" type="button">تنزيل QR للطباعة (PNG)</button><button class="btn btn-ghost btn-sm" id="qrCopy" type="button">نسخ الرابط</button></div><small style="color:var(--muted)">الكود ده ثابت طول ما رابط الموقع ثابت وما مسحتش الكتاب.</small></div></div></div>':'<div class="note">كود QR هيظهر هنا بعد ما تحفظ الكتاب.</div>'),
    (orig?'<button class="btn btn-ghost btn-sm" id="bDel" type="button" style="color:var(--warn)">حذف الكتاب</button>':'<span></span>')+'<div style="display:flex;gap:8px"><button class="btn btn-ghost" data-cancel type="button">إلغاء</button><button class="btn btn-primary" id="bOk" type="button">تم</button></div>');
  var $=function(i){return m.querySelector("#"+i)};
  m.querySelector("[data-cancel]").onclick=function(){m.remove()};

  function drawCover(){var src=draft._coverURL||draft.cover;$("cvPrev").innerHTML=src?'<img class="thumb" src="'+esc(src)+'" alt="">':'<span class="thumb" style="display:inline-block;background:'+esc($("bColor").value)+'"></span>'}
  function drawSample(){var n=draft._sampleFile?draft._sampleFile.name:(draft.sample&&draft.sample.name);$("smName").textContent=n?"📄 "+n+(draft._sampleFile?" (هيترفع لما تنشر)":""):"مفيش عينة";$("smDel").hidden=!n}
  function drawTracks(){
    var L=$("trList");
    if(!draft.tracks.length){L.innerHTML='<div class="note">لسه مفيش مقاطع.</div>';return}
    L.innerHTML=draft.tracks.map(function(x,i){var isYT=("yt" in x);return'<div class="trk-edit" style="grid-template-columns:1fr auto"><div style="display:grid;gap:4px;min-width:0"><input data-i="'+i+'" value="'+esc(x.title)+'" aria-label="اسم الشابتر '+(i+1)+'" placeholder="Chapter '+(i+1)+': ...">'+(isYT?'<input data-yt="'+i+'" class="ltr" value="'+esc(x.yt)+'" placeholder="https://youtu.be/..." aria-label="رابط YouTube" style="font-size:13px;color:var(--muted)">':'')+'</div><div class="ops"><span style="font-size:12px;color:var(--muted);align-self:center;min-width:34px">'+(isYT?"YouTube":(x._file?"جديد":fmt(x.dur)))+'</span><button class="ib" data-qr="'+i+'" type="button" aria-label="QR" style="width:auto;padding:0 8px;font-size:12px">QR</button><button class="ib" data-up="'+i+'" type="button" aria-label="لفوق">↑</button><button class="ib" data-dn="'+i+'" type="button" aria-label="لتحت">↓</button>'+(isYT?'':'<button class="ib" data-play="'+i+'" type="button" aria-label="تجربة">▶</button>')+'<button class="ib" data-rm="'+i+'" type="button" aria-label="حذف" style="color:var(--warn)">✕</button></div></div>'}).join("");
    L.querySelectorAll("input[data-i]").forEach(function(inp){inp.oninput=function(){draft.tracks[+inp.getAttribute("data-i")].title=inp.value}});
    L.querySelectorAll("input[data-yt]").forEach(function(inp){inp.oninput=function(){draft.tracks[+inp.getAttribute("data-yt")].yt=inp.value.trim()}});
    L.querySelectorAll("[data-qr]").forEach(function(x){x.onclick=function(){
      var t=draft.tracks[+x.getAttribute("data-qr")];
      if(!orig){toast("دوس «تم» واحفظ الكتاب الأول، وبعدين نزّل الكود.");return}
      var link=bookLink(orig.id)+"&c="+encodeURIComponent(t.id);
      printableQR(link,(t.title||"")+" · "+orig.title).toBlob(function(blob){var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="QR-"+orig.id+"-"+(draft.tracks.indexOf(t)+1)+".png";document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000)},"image/png");
      toast("الرابط: "+link);
    }});
    L.querySelectorAll("[data-up]").forEach(function(x){x.onclick=function(){var i=+x.getAttribute("data-up");if(i>0){var t=draft.tracks[i];draft.tracks[i]=draft.tracks[i-1];draft.tracks[i-1]=t;drawTracks()}}});
    L.querySelectorAll("[data-dn]").forEach(function(x){x.onclick=function(){var i=+x.getAttribute("data-dn");if(i<draft.tracks.length-1){var t=draft.tracks[i];draft.tracks[i]=draft.tracks[i+1];draft.tracks[i+1]=t;drawTracks()}}});
    L.querySelectorAll("[data-play]").forEach(function(x){x.onclick=function(){var t=draft.tracks[+x.getAttribute("data-play")];var a=new Audio(t._url||t.file);a.play().then(function(){setTimeout(function(){a.pause()},6000)},function(){toast("المقطع مش بيشتغل. لو لسه رافعه، استنى دقيقة بعد النشر.")})}});
    L.querySelectorAll("[data-rm]").forEach(function(x){x.onclick=function(){var i=+x.getAttribute("data-rm");if(x.getAttribute("data-sure")){var r=draft.tracks.splice(i,1)[0];if(r.file)draft.removed.push(r.file);drawTracks()}else{x.setAttribute("data-sure","1");x.textContent="متأكد؟";x.style.width="auto";x.style.padding="0 8px"}}});
  }
  drawCover();drawSample();drawTracks();
  $("bColor").oninput=drawCover;

  if(orig){
    var link=bookLink(orig.id);
    $("qrLink").textContent=link;
    $("qrBox").appendChild(qrCanvas(link,600));
    $("qrCopy").onclick=function(){navigator.clipboard.writeText(link).then(function(){toast("اتنسخ")},function(){toast(link)})};
    $("qrDl").onclick=function(){
      printableQR(link,orig.title).toBlob(function(blob){
        var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="QR-"+orig.id+".png";document.body.appendChild(a);a.click();
        setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000);
      },"image/png");
    };
    if(!dataSha||orig._new)$("qrLink").textContent=link+"  (هيشتغل بعد النشر)";
  }

  $("cvFile").onchange=function(e){var f=e.target.files[0];if(!f)return;if(f.size>5*1024*1024){toast("الصورة أكبر من 5 ميجا. صغّرها.");return}if(draft._coverURL)URL.revokeObjectURL(draft._coverURL);draft._coverFile=f;draft._coverURL=URL.createObjectURL(f);drawCover()};
  $("cvDel").onclick=function(){if(draft.cover)draft.removed.push(draft.cover);draft.cover=null;draft._coverFile=null;draft._coverURL=null;drawCover()};
  $("smFile").onchange=function(e){var f=e.target.files[0];if(!f)return;if(f.size>25*1024*1024){toast("الـ PDF أكبر من 25 ميجا. صغّره.");return}draft._sampleFile=f;drawSample()};
  $("smDel").onclick=function(){if(draft.sample&&draft.sample.file)draft.removed.push(draft.sample.file);draft.sample=null;draft._sampleFile=null;drawSample()};
  $("trYT").onclick=function(){draft.tracks.push({id:rid(),title:"Chapter "+(draft.tracks.length+1)+": ",yt:""});drawTracks();var ins=m.querySelectorAll("#trList input[data-i]");if(ins.length)ins[ins.length-1].focus()};
  $("trFile").onchange=function(e){
    var files=Array.prototype.slice.call(e.target.files).sort(function(a,c){return a.name.localeCompare(c.name,undefined,{numeric:true})});
    files.forEach(function(f){
      if(f.size>25*1024*1024){toast(f.name+" أكبر من 25 ميجا. صغّره (MP3 بجودة 64kbps).");return}
      var t={id:rid(),title:f.name.replace(/\.[^.]+$/,"").replace(/[_]+/g," "),file:"",dur:null,_file:f,_url:URL.createObjectURL(f)};
      draft.tracks.push(t);
      var a=new Audio();a.preload="metadata";a.onloadedmetadata=function(){if(isFinite(a.duration))t.dur=Math.round(a.duration)};a.src=t._url;
    });
    drawTracks();e.target.value="";
  };
  if($("bDel"))$("bDel").onclick=function(){
    var x=$("bDel");
    if(x.getAttribute("data-sure")){
      S.books=S.books.filter(function(z){return z!==orig});
      (orig.tracks||[]).forEach(function(t){if(t.file)toDelete.push(t.file)});
      if(orig.cover)toDelete.push(orig.cover);if(orig.sample&&orig.sample.file)toDelete.push(orig.sample.file);
      m.remove();markDirty();mainScreen();
    }else{x.setAttribute("data-sure","1");x.textContent="اضغط تاني للتأكيد — أي كود QR مطبوع للكتاب ده هيبطل"}
  };
  $("bOk").onclick=function(){
    var title=$("bTitle").value.trim();if(!title){toast("اكتب اسم الكتاب.");$("bTitle").focus();return}
    m.querySelectorAll("#trList input[data-i]").forEach(function(inp){var i=+inp.getAttribute("data-i");draft.tracks[i].title=inp.value.trim()||("Chapter "+(i+1))});
    var badYT=draft.tracks.filter(function(t){return("yt" in t)&&!/^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(t.yt||"")});
    if(badYT.length){toast("حط رابط YouTube صحيح لـ: "+badYT[0].title);return}
    b.title=title;b.subtitle=$("bSub").value.trim();b.series=$("bSeries").value.trim();var n=$("bNum").value.trim();b.num=n?+n:null;b.color=$("bColor").value;b.amazon=$("bAmz").value.trim();b.youtube=$("bYT").value.trim();b.desc_en=$("bDescEn").value.trim();b.desc_ar=$("bDescAr").value.trim();
    b.cover=draft.cover;b._coverFile=draft._coverFile;b._coverURL=draft._coverURL;b.sample=draft.sample;b._sampleFile=draft._sampleFile;b.tracks=draft.tracks;
    toDelete=toDelete.concat(draft.removed);
    if(!orig){var base=slug(title),nid=base,c=2;while(findBook(nid))nid=base+"-"+c++;b.id=nid;b._new=true;S.books.push(b)}
    m.remove();markDirty();mainScreen();
  };
}

/* ---------- publish ---------- */
function clean(){
  return JSON.stringify(S,function(k,v){return k.charAt(0)==="_"?undefined:v},1);
}
function publish(){
  var jobs=[];
  S.books.forEach(function(b){
    if(b._coverFile)jobs.push({label:"غلاف: "+b.title,file:b._coverFile,path:"covers/"+b.id+"-"+rid()+"."+(ext(b._coverFile.name)||"jpg"),done:function(p){if(b.cover)toDelete.push(b.cover);b.cover=p;b._coverFile=null}});
    if(b._sampleFile)jobs.push({label:"عينة: "+b.title,file:b._sampleFile,path:"samples/"+b.id+"-"+rid()+".pdf",done:function(p){if(b.sample&&b.sample.file)toDelete.push(b.sample.file);b.sample={file:p,name:b._sampleFile.name};b._sampleFile=null}});
    (b.tracks||[]).forEach(function(t){if(t._file)jobs.push({label:"صوت: "+t.title,file:t._file,path:"audio/"+b.id+"/"+t.id+"."+(ext(t._file.name)||"mp3"),done:function(p){t.file=p;t._file=null}})});
  });
  var m=modal("جاري النشر على GitHub",'<div class="log" id="log"></div>','<span class="prog" id="lp"></span><button class="btn btn-ghost" id="lClose" type="button" hidden>إغلاق</button>');
  m.querySelector("[data-x]").hidden=true;
  var log=m.querySelector("#log");
  function line(txt,cls){var d=el('<div class="'+(cls||"")+'">'+esc(txt)+'</div>');log.appendChild(d);log.scrollTop=log.scrollHeight;return d}
  function finish(ok,msg){
    m.querySelector("#lp").textContent=msg;var c=m.querySelector("#lClose");c.hidden=false;c.onclick=function(){m.remove()};
    if(ok){dirty=false;renderSaveBar();S.books.forEach(function(b){delete b._new});mainScreen()}
  }
  var i=0;
  function next(){
    if(i>=jobs.length)return writeData();
    var j=jobs[i++],d=line("⏳ ("+i+"/"+jobs.length+") "+j.label);
    return fileB64(j.file).then(function(c){return gh("PUT",j.path,{message:"Upload "+j.path,content:c})}).then(function(){j.done(j.path);d.textContent="✓ "+j.label;d.className="ok";return next()});
  }
  function writeData(){
    var d=line("⏳ تحديث بيانات الموقع…");
    return gh("PUT","data.json",{message:"Update site content",content:b64utf8(clean()),sha:dataSha}).then(function(r){
      dataSha=r.content.sha;d.textContent="✓ بيانات الموقع";d.className="ok";
      return cleanup();
    });
  }
  function cleanup(){
    var list=toDelete.filter(function(p,k,a){return p&&a.indexOf(p)===k});toDelete=[];
    return list.reduce(function(p,path){return p.then(function(){return gh("GET",path).then(function(f){if(f&&f.sha)return gh("DELETE",path,{message:"Remove "+path,sha:f.sha})}).catch(function(){})})},Promise.resolve());
  }
  next().then(function(){finish(true,"✓ اتنشر. الموقع هيتحدث خلال دقيقة أو اتنين.")},function(e){line("✕ "+ghErr(e),"er");finish(false,"النشر وقف. الملفات اللي اترفعت محفوظة، دوس «حفظ ونشر» تاني علشان تكمّل.")});
}

/* ---------- boot ---------- */
cfg=loadCfg();
if(!cfg)setupScreen();
else{root.innerHTML='<p style="color:var(--muted)">جاري التحميل…</p>';load().catch(function(e){setupScreen(ghErr(e))})}
})();
