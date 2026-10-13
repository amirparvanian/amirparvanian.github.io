/* ============================================================
   Amir Parvanian — Portfolio · main.js
   Pure vanilla JS. Scroll reveals (.in / --p), parallax bands,
   scroll-driven crossfade stacks (.xfade), lightbox, nav,
   language switch.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ---------- language switch ---------- */
  var langBtns = document.querySelectorAll('.lang-btn');
  function setLang(code) {
    var dict = (window.I18N && window.I18N[code]) || {};
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (dict[k] != null) el.textContent = dict[k];
    });
    if (dict['doc.title']) document.title = dict['doc.title'];
    var meta = document.querySelector('meta[name="description"]');
    if (meta && dict['doc.desc']) meta.setAttribute('content', dict['doc.desc']);
    langBtns.forEach(function (b) {
      var on = b.getAttribute('data-lang') === code;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    try { localStorage.setItem('ap-lang', code); } catch (e) {}
    document.documentElement.lang = code;
  }
  langBtns.forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
  });
  var stored = null;
  try { stored = localStorage.getItem('ap-lang'); } catch (e) {}
  setLang(stored === 'it' ? 'it' : 'en');

  /* ---------- nav ---------- */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('navBurger');
  var navLinks = document.getElementById('navLinks');
  var progress = document.getElementById('navProgress');

  if (burger && navLinks) {
    burger.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        navLinks.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- one-shot reveals (.reveal / .mask get .in) ---------- */
  var revealEls = document.querySelectorAll('.reveal, .mask');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- scroll-driven figure open (.fig sets --p) ---------- */
  var figs = document.querySelectorAll('.fig, [data-fig]');
  function figLoop() {
    var vh = window.innerHeight;
    figs.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var p = (vh * 0.98 - r.top) / (vh * 0.95);
      p = clamp(p, 0, 1);
      p = p * p * (3 - 2 * p);
      el.style.setProperty('--p', p.toFixed(4));
    });
  }

  /* ---------- scroll-driven crossfade stacks ---------- */
  /* Each [data-xfade] is a tall section with a sticky viewport.
     Scrolling drives a virtual position 0..N-1. Item i is fully
     visible at pos == i; between i and i+1 the current image
     fades out (breathing slightly larger) while the next fades in. */
  var xfades = [];
  function initXfades() {
    xfades = [];
    document.querySelectorAll('[data-xfade]').forEach(function (sec) {
      var items = Array.prototype.slice.call(sec.querySelectorAll('.xfade-item'));
      var num = sec.querySelector('.xfade-num');
      var bar = sec.querySelector('.xfade-bar i');
      var n = items.length;
      if (n < 2) return;
      xfades.push({ sec: sec, items: items, num: num, bar: bar, n: n, cur: 0, target: 0, step: 1 });
    });
    measureXfades();
  }
  function measureXfades() {
    var vh = window.innerHeight;
    xfades.forEach(function (x) {
      x.step = Math.max(300, vh * 0.8);            /* scroll distance per image */
      x.sec.style.height = reduceMotion ? '' : (vh + (x.n - 1) * x.step) + 'px';
    });
  }
  function xfadeLoop() {
    var vh = window.innerHeight;
    for (var k = 0; k < xfades.length; k++) {
      var x = xfades[k];
      var r = x.sec.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) continue;   /* off-screen: skip */
      x.target = clamp(-r.top / x.step, 0, x.n - 1);
      x.cur += (x.target - x.cur) * 0.14;                  /* soft follow */
      if (Math.abs(x.target - x.cur) < 0.0008) x.cur = x.target;
      var p = x.cur;
      for (var i = 0; i < x.n; i++) {
        var d = Math.abs(p - i);
        var t = clamp(1 - d / 0.5, 0, 1);
        var op = t * t * (3 - 2 * t);
        var sc = 1 + clamp(d, 0, 1) * 0.055;
        var el = x.items[i];
        el.style.opacity = op.toFixed(3);
        el.style.transform = 'scale(' + sc.toFixed(4) + ')';
        el.style.visibility = op <= 0.002 ? 'hidden' : 'visible';
        el.setAttribute('aria-hidden', op < 0.5 ? 'true' : 'false');
      }
      if (x.num) x.num.textContent = (clamp(Math.round(p), 0, x.n - 1) + 1) + ' / ' + x.n;
      if (x.bar) x.bar.style.transform = 'scaleX(' + (x.n > 1 ? (p / (x.n - 1)).toFixed(4) : '1') + ')';
    }
  }

  /* ---------- parallax bands ---------- */
  var parallaxEls = document.querySelectorAll('[data-parallax]');
  function parallaxLoop() {
    var vh = window.innerHeight;
    parallaxEls.forEach(function (el) {
      var f = parseFloat(el.getAttribute('data-parallax')) || 0.2;
      var r = el.parentElement.getBoundingClientRect();
      var mid = r.top + r.height / 2 - vh / 2;
      var y = clamp(-mid * f, -160, 160);
      el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0) scale(1.12)';
    });
  }

  /* ---------- main rAF loop ---------- */
  var ticking = false;
  function frame() {
    if (!reduceMotion) {
      xfadeLoop();
      figLoop();
      parallaxLoop();
    }
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle('scrolled', y > 24);
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1).toFixed(4) : 0) + ')';
    ticking = false;
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measureXfades(); onScroll(); });

  /* smooth anchor scrolling */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------- lightbox ---------- */
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbClose = document.getElementById('lbClose');
  document.addEventListener('click', function (e) {
    var img = e.target.closest ? e.target.closest('img.zoomable') : null;
    if (!img || !lb || lb.hidden === false) return;
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt || '';
    lb.hidden = false;
    requestAnimationFrame(function () { lb.classList.add('open'); });
  });
  function closeLb() {
    if (!lb || lb.hidden) return;
    lb.classList.remove('open');
    setTimeout(function () { lb.hidden = true; lbImg.src = ''; }, 320);
  }
  if (lb) {
    lb.addEventListener('click', function (e) { if (e.target !== lbImg) closeLb(); });
    if (lbClose) lbClose.addEventListener('click', closeLb);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); });
  }

  /* ---------- boot ---------- */
  initXfades();
  frame();
  window.addEventListener('load', function () { measureXfades(); frame(); });
})();
