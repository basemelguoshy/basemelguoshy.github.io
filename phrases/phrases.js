/* Phrase pages: ?b=<book>            -> chapter list
                 ?b=<book>&c=<chapter> -> phrases with normal / slow audio
   Audio lives in audio/<session>.mp3; audio/index.json gives each phrase's start/end in that file. */
(function () {
"use strict";
var T = {
  it: {ch: "Capitoli", back: "Tutti i capitoli", n: "Normale", s: "Lento", all: "Ascolta tutto", stop: "Stop", soon: "Audio in arrivo", cnt: function (a, n) { return a + " frasi su " + n + " con audio" }, nf: "Libro non trovato", books: "Tutti i libri", hint: "Premi ▶ per la velocità normale e 🐢 per ascoltare lentamente."},
  nl: {ch: "Hoofdstukken", back: "Alle hoofdstukken", n: "Normaal", s: "Langzaam", all: "Alles afspelen", stop: "Stop", soon: "Audio volgt binnenkort", cnt: function (a, n) { return a + " van " + n + " zinnen met audio" }, nf: "Boek niet gevonden", books: "Alle boeken", hint: "Tik op ▶ voor normaal tempo en op 🐢 om het langzaam te horen."},
  de: {ch: "Kapitel", back: "Alle Kapitel", n: "Normal", s: "Langsam", all: "Alles abspielen", stop: "Stopp", soon: "Audio folgt bald", cnt: function (a, n) { return a + " von " + n + " Sätzen mit Audio" }, nf: "Buch nicht gefunden", books: "Alle Bücher", hint: "Tippe auf ▶ für normales Tempo und auf 🐢, um es langsam zu hören."},
  fr: {ch: "Chapitres", back: "Tous les chapitres", n: "Normal", s: "Lent", all: "Tout écouter", stop: "Stop", soon: "Audio bientôt disponible", cnt: function (a, n) { return a + " phrases sur " + n + " avec audio" }, nf: "Livre introuvable", books: "Tous les livres", hint: "Appuyez sur ▶ pour la vitesse normale et sur 🐢 pour écouter lentement."},
  sv: {ch: "Kapitel", back: "Alla kapitel", n: "Normalt", s: "Långsamt", all: "Spela alla", stop: "Stopp", soon: "Ljud kommer snart", cnt: function (a, n) { return a + " av " + n + " fraser med ljud" }, nf: "Boken hittades inte", books: "Alla böcker", hint: "Tryck på ▶ för normal takt och på 🐢 för att höra det långsamt."},
  pl: {ch: "Rozdziały", back: "Wszystkie rozdziały", n: "Normalnie", s: "Powoli", all: "Odtwórz wszystko", stop: "Stop", soon: "Nagrania wkrótce", cnt: function (a, n) { return a + " z " + n + " zwrotów z nagraniem" }, nf: "Nie znaleziono książki", books: "Wszystkie książki", hint: "Naciśnij ▶, aby usłyszeć normalne tempo, i 🐢, aby usłyszeć powoli."},
  en: {ch: "Chapters", back: "All chapters", n: "Normal", s: "Slow", all: "Play all", stop: "Stop", soon: "Audio coming soon", cnt: function (a, n) { return a + " of " + n + " phrases have audio" }, nf: "Book not found", books: "All books", hint: "Tap ▶ for normal speed and 🐢 to hear it slowly."}
};
var app = document.getElementById("app"), q = new URLSearchParams(location.search);
var bookId = (q.get("b") || "").replace(/[^a-z0-9-]/g, ""), chId = (q.get("c") || "").replace(/[^A-Za-z0-9_-]/g, "");
var L = T.en, book = null, idx = {};

function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c] }) }
function has(u) { return !!idx[u] }
function recCount(ch) { return ch.items.filter(function (it) { return it.u.some(has) }).length }
function getJSON(p) { return fetch(p + "?v=" + Date.now(), {cache: "no-store"}).then(function (r) { if (!r.ok) throw r; return r.json() }) }

/* ---------- player: plays one slice of a session file ---------- */
var audio = new Audio(), cur = null, timer = 0, queue = [], btnOn = null;
audio.preload = "auto";
function stopAll() { queue = []; halt(); setAllBtn(false) }
function halt() { clearInterval(timer); audio.pause(); if (btnOn) btnOn.classList.remove("on"); btnOn = null }
var blobs = {};
function load(f) {
  if (!blobs[f]) blobs[f] = fetch("audio/" + f + ".mp3").then(function (r) { if (!r.ok) throw r; return r.blob() }).then(function (b) { return URL.createObjectURL(b) });
  return blobs[f];
}
var token = 0;
function play(u, kind, btn) {
  var o = idx[u]; if (!o) return;
  halt();
  var my = ++token, a = kind === "s" ? o.t[2] : o.t[0], b = kind === "s" ? o.t[3] : o.t[1];
  btnOn = btn || document.querySelector('[data-u="' + u + '"][data-k="' + kind + '"]');
  if (btnOn) btnOn.classList.add("on");
  load(o.f).then(function (src) {
    if (my !== token) return;
    function go() {
      if (my !== token) return;
      audio.currentTime = a;
      var p = audio.play(); if (p && p.catch) p.catch(function () { halt() });
      clearInterval(timer);
      timer = setInterval(function () { if (audio.currentTime >= b || audio.ended) { halt(); next() } }, 25);
    }
    if (cur !== src) { cur = src; audio.src = src; audio.addEventListener("canplay", function f() { audio.removeEventListener("canplay", f); go() }); audio.load() }
    else go();
  }).catch(function () { halt() });
}
function next() { if (!queue.length) { setAllBtn(false); return } var x = queue.shift(); setTimeout(function () { play(x[0], x[1]) }, 450) }
function setAllBtn(on) { var b = document.getElementById("all"); if (b) b.textContent = on ? "■ " + L.stop : "▶ " + L.all }

/* ---------- pages ---------- */
function bookHead() {
  return '<div class="bhead"><div class="lbl">Egyptian Arabic · العامية المصرية</div><h1>' + esc(book.title) + '</h1><p class="sub">' + esc(book.sub) + '</p></div>';
}
function chapterList() {
  document.title = book.title + " · Basem Elguoshy Madian";
  var h = bookHead() + '<h2 class="sect">' + esc(L.ch) + '</h2><ol class="chs">';
  book.chapters.forEach(function (c) {
    var a = recCount(c);
    h += '<li><a href="?b=' + esc(bookId) + '&c=' + esc(c.id) + '"><span class="ct">' + esc(c.title) + '</span><span class="pill' + (a ? '' : ' none') + '">' + (a ? '♪ ' + esc(L.cnt(a, c.items.length)) : esc(L.soon)) + '</span></a></li>';
  });
  app.innerHTML = h + '</ol>';
}
function btns(u, label, g) {
  if (!has(u)) return '<div class="pb"><span class="soon">' + esc(L.soon) + '</span></div>';
  return '<div class="pb">' + (label ? '<span class="sp" dir="rtl" lang="ar">' + (g === "m" ? '<i>♂</i>' : g === "f" ? '<i>♀</i>' : '') + esc(label) + '</span>' : '') +
    '<button type="button" class="b" data-u="' + esc(u) + '" data-k="n">▶ ' + esc(L.n) + '</button>' +
    '<button type="button" class="b slow" data-u="' + esc(u) + '" data-k="s">🐢 ' + esc(L.s) + '</button></div>';
}
function chapterPage(ch) {
  document.title = ch.title + " · " + book.title;
  var i = book.chapters.indexOf(ch), prev = book.chapters[i - 1], nxt = book.chapters[i + 1], a = recCount(ch);
  var h = '<a class="back" href="?b=' + esc(bookId) + '">← ' + esc(L.back) + '</a><div class="bhead small"><div class="lbl">' + esc(book.title) + '</div><h1>' + esc(ch.title) + '</h1>' +
    '<p class="sub">' + esc(a ? L.cnt(a, ch.items.length) : L.soon) + '</p>' + (a ? '<p class="hint">' + esc(L.hint) + '</p><button type="button" class="btn" id="all">▶ ' + esc(L.all) + '</button>' : '') + '</div><div class="items">';
  var sec = null;
  ch.items.forEach(function (it) {
    if (it.s && it.s !== sec) { sec = it.s; if (sec !== ch.title) h += '<h3 class="sec">' + esc(sec) + '</h3>' }
    h += '<div class="it' + (it.u.some(has) ? '' : ' na') + '">' + (it.f ? '<div class="f">' + esc(it.f) + '</div>' : '') +
      '<div class="a" dir="rtl" lang="ar">' + esc(it.a) + '</div>' + (it.t ? '<div class="t">' + esc(it.t) + '</div>' : '');
    if (it.u.length === 1) h += btns(it.u[0]);
    else it.u.forEach(function (u, k) { h += btns(u, it.sp[k], it.g[k]) });
    h += '</div>';
  });
  h += '</div><nav class="pn">' + (prev ? '<a href="?b=' + esc(bookId) + '&c=' + esc(prev.id) + '">← ' + esc(prev.title) + '</a>' : '<span></span>') +
    (nxt ? '<a href="?b=' + esc(bookId) + '&c=' + esc(nxt.id) + '">' + esc(nxt.title) + ' →</a>' : '') + '</nav>';
  app.innerHTML = h;
  app.addEventListener("click", function (e) {
    var b = e.target.closest("button.b");
    if (b) { queue = []; setAllBtn(false); play(b.getAttribute("data-u"), b.getAttribute("data-k"), b); return }
    if (e.target.closest("#all")) {
      if (queue.length || btnOn) { stopAll(); return }
      var seen = {};
      ch.items.forEach(function (it) { it.u.forEach(function (u) { if (has(u) && !seen[u]) { seen[u] = 1; queue.push([u, "n"], [u, "s"]) } }) });
      setAllBtn(true); next();
    }
  });
}
function notFound() { app.innerHTML = '<p class="loading">' + esc(L.nf) + ' · <a href="../">' + esc(L.books) + '</a></p>' }

if (!bookId) { notFound(); return }
Promise.all([getJSON("books/" + bookId + ".json"), getJSON("audio/index.json").catch(function () { return {} })]).then(function (r) {
  book = r[0]; L = T[book.lang] || T.en;
  document.documentElement.lang = book.lang;
  document.getElementById("homeLink").textContent = L.books;
  Object.keys(r[1]).forEach(function (s) { var m = r[1][s]; Object.keys(m).forEach(function (u) { idx[u] = {f: s, t: m[u]} }) });
  var ch = book.chapters.filter(function (c) { return c.id === chId })[0];
  if (ch) chapterPage(ch); else chapterList();
}).catch(notFound);
})();
