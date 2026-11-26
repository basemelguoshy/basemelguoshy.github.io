/* Pocket Egyptian Arabic — free audio.
   #chNN opens a chapter (the QR codes in the book use this).
   book.json = all phrases; audio.json = recorded codes: {code: [normalEnd, slowStart, duration]}
   (normalEnd = null when the clip has no clear normal/slow split: one button plays it all).
   Clips live in audio/<code>.mp3 */
(function () {
"use strict";
var app = document.getElementById("app"), book = null, rec = {};
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c] }) }
function getJSON(p) { return fetch(p + "?v=" + Date.now(), {cache: "no-store"}).then(function (r) { if (!r.ok) throw r; return r.json() }) }
function items(ch) { var a = []; ch.s.forEach(function (s) { a = a.concat(s.items) }); return a }
function nrec(ch) { return items(ch).filter(function (i) { return rec[i.c] }).length }

/* ---------- player ---------- */
var audio = new Audio(), timer = 0, queue = [], btnOn = null, token = 0;
audio.preload = "auto";
function halt() { clearInterval(timer); audio.pause(); if (btnOn) btnOn.classList.remove("on"); btnOn = null }
function stopAll() { queue = []; halt(); allBtn(false) }
function play(code, kind, btn) {
  var r = rec[code]; if (!r) return;
  halt(); var my = ++token;
  var a = 0, b = r[2] + 1;
  if (kind === "n" && r[0] != null) b = r[0];
  if (kind === "s" && r[0] != null) a = r[1];
  btnOn = btn || document.querySelector('[data-c="' + code + '"][data-k="' + kind + '"]');
  if (btnOn) btnOn.classList.add("on");
  function go() {
    if (my !== token) return;
    try { audio.currentTime = a } catch (e) {}
    var p = audio.play(); if (p && p.catch) p.catch(function () { halt() });
    clearInterval(timer);
    timer = setInterval(function () { if (audio.currentTime >= b || audio.ended) { halt(); next() } }, 25);
  }
  var src = "audio/" + code + ".mp3";
  if (audio.getAttribute("src") !== src) {
    audio.setAttribute("src", src);
    audio.addEventListener("canplay", function f() { audio.removeEventListener("canplay", f); go() });
    audio.load();
  } else go();
}
function next() { if (!queue.length) { allBtn(false); return } var x = queue.shift(); setTimeout(function () { play(x[0], x[1]) }, 400) }
function allBtn(on) { var b = document.getElementById("all"); if (b) b.textContent = on ? "■ Stop" : "▶ Play all" }

function row(i) {
  var r = rec[i.c], h = '<div class="it' + (r ? '' : ' na') + '"><div class="f"><span class="code">' + esc(i.c) + '</span>' + esc(i.en) + '</div>' +
    '<div class="a" dir="rtl" lang="ar">' + esc(i.ar) + '</div><div class="t">' + esc(i.tr) + '</div><div class="pb">';
  if (!r) h += '<span class="soon">Audio coming soon</span>';
  else if (r[0] == null) h += '<button type="button" class="b" data-c="' + i.c + '" data-k="w">▶ Normal + slow</button>';
  else h += '<button type="button" class="b" data-c="' + i.c + '" data-k="n">▶ Normal</button><button type="button" class="b slow" data-c="' + i.c + '" data-k="s">🐢 Slow</button>';
  return h + '</div></div>';
}

/* ---------- pages ---------- */
function home() {
  stopAll(); document.title = "Pocket Egyptian Arabic · Free audio";
  var total = 0, done = 0;
  book.chapters.forEach(function (c) { total += items(c).length; done += nrec(c) });
  var h = '<div class="bhead"><div class="lbl">Egyptian Arabic · العامية المصرية</div><h1>' + esc(book.title) + '</h1><p class="sub">' + esc(book.sub) + '</p>' +
    '<div class="voice">🔊 Every phrase is read at normal speed, then slowly. The audio was produced with AI voice technology and checked by the author, <b>' + esc(book.author) + '</b>, a native Egyptian Arabic speaker.</div>' +
    '<input class="search" id="q" type="search" placeholder="Search a word or code (e.g. thank you, 02-028)…"></div><div id="res"></div>' +
    '<h2 class="sect">Chapters</h2><p class="hint">' + done + ' of ' + total + ' recordings are online.</p><ol class="chs">';
  book.chapters.forEach(function (c) {
    var a = nrec(c), n = items(c).length;
    h += '<li><a href="#ch' + String(c.n).padStart(2, "0") + '"><span class="ct"><span class="chn">' + c.n + '</span>' + esc(c.t) + '<span class="car" dir="rtl">' + esc(c.ar) + '</span></span><span class="pill' + (a ? '' : ' none') + '">' +
      (a ? '♪ ' + a + ' of ' + n : 'Audio coming soon') + '</span></a></li>';
  });
  app.innerHTML = h + '</ol>';
  var all = []; book.chapters.forEach(function (c) { all = all.concat(items(c)) });
  document.getElementById("q").addEventListener("input", function () {
    var v = this.value.trim().toLowerCase(), out = document.getElementById("res");
    if (v.length < 2) { out.innerHTML = ""; return }
    var m = all.filter(function (i) { return (i.c + " " + i.en + " " + i.tr + " " + i.ar).toLowerCase().indexOf(v) >= 0 }).slice(0, 40);
    out.innerHTML = '<div class="items">' + (m.length ? m.map(row).join("") : '<p class="hint">No match.</p>') + '</div>';
  });
}
function chapter(c) {
  stopAll(); document.title = c.t + " · Pocket Egyptian Arabic";
  var k = book.chapters.indexOf(c), prev = book.chapters[k - 1], nxt = book.chapters[k + 1], a = nrec(c), n = items(c).length;
  var id = function (x) { return "#ch" + String(x.n).padStart(2, "0") };
  var h = '<a class="back" href="#">← All chapters</a><div class="bhead small"><div class="lbl">Chapter ' + c.n + ' · ' + esc(book.title) + '</div><h1>' + esc(c.t) +
    ' <span class="car" dir="rtl">' + esc(c.ar) + '</span></h1><p class="sub">' + (a ? a + ' of ' + n + ' recordings online' : 'Audio coming soon') + '</p>' +
    (a ? '<p class="hint">Tap ▶ for normal speed and 🐢 to hear it slowly.</p><button type="button" class="btn" id="all">▶ Play all</button>' : '') + '</div><div class="items' + (c.s.length === 1 && n > 300 ? ' dl' : '') + '">';
  c.s.forEach(function (s) { h += '<h3 class="sec">' + esc(s.h) + '</h3>' + s.items.map(row).join("") });
  h += '</div><nav class="pn">' + (prev ? '<a href="' + id(prev) + '">← ' + esc(prev.t) + '</a>' : '<span></span>') + (nxt ? '<a href="' + id(nxt) + '">' + esc(nxt.t) + ' →</a>' : '') + '</nav>';
  app.innerHTML = h; scrollTo(0, 0);
  var b = document.getElementById("all");
  if (b) b.addEventListener("click", function () {
    if (queue.length || btnOn) { stopAll(); return }
    items(c).forEach(function (i) { var r = rec[i.c]; if (r) { if (r[0] == null) queue.push([i.c, "w"]); else queue.push([i.c, "n"], [i.c, "s"]) } });
    allBtn(true); next();
  });
}
app.addEventListener("click", function (e) {
  var b = e.target.closest("button.b");
  if (b) { queue = []; allBtn(false); play(b.getAttribute("data-c"), b.getAttribute("data-k"), b) }
});
function route() {
  var m = /^#ch(\d+)/.exec(location.hash), c = m && book.chapters.filter(function (x) { return x.n === +m[1] })[0];
  if (c) chapter(c); else home();
}
Promise.all([getJSON("book.json"), getJSON("audio.json").catch(function () { return {} })]).then(function (r) {
  book = r[0]; rec = r[1]; route(); addEventListener("hashchange", route);
}).catch(function () { app.innerHTML = '<p class="loading">The page couldn\'t load. Check your connection and refresh.</p>' });
})();
