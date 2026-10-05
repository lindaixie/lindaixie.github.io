/* Lab site — progressive enhancement only. Every page works without this file. */
(function () {
  'use strict';
  var doc = document;
  var ZH = doc.documentElement.lang === 'zh-Hans';
  var L = function (en, zh) { return ZH ? zh : en; };

  /* ---- language toggle: remember the choice and keep the current section ---- */
  doc.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a.lang-btn'); if (!a) return;
    try { localStorage.setItem('twig-lang', a.getAttribute('lang') === 'en' ? 'en' : 'zh'); } catch (e) {}
    if (location.hash) { ev.preventDefault(); location.href = a.getAttribute('href') + location.hash; }
  });

  /* ---- research areas: open only the area named in the link (#area-N) ---- */
  var dets = Array.prototype.slice.call(doc.querySelectorAll('details.area-det'));
  doc.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[data-area]');
    if (a) { try { sessionStorage.setItem('twig-open-area', a.getAttribute('data-area')); } catch (e) {} }
  });
  if (dets.length) {
    var openOnly = function (id, scroll) {
      var hit = null;
      dets.forEach(function (d) {
        var on = d.closest('section').id === id;
        d.open = on; if (on) hit = d;
      });
      if (hit && scroll) hit.closest('section').scrollIntoView();
      return hit;
    };
    var want = /^#area-\d+$/.test(location.hash) ? location.hash.slice(1) : null;
    if (!want) { try { var n = sessionStorage.getItem('twig-open-area'); if (n) want = 'area-' + n; } catch (e) {} }
    try { sessionStorage.removeItem('twig-open-area'); } catch (e) {}
    if (want) openOnly(want, true);
    window.addEventListener('hashchange', function () {
      if (/^#area-\d+$/.test(location.hash)) openOnly(location.hash.slice(1), true);
    });
  }

  /* ---- two-finger swipe right on a trackpad = back to the previous page ---- */
  (function () {
    if (doc.querySelector('.book')) return;   /* the acknowledgements book uses horizontal swipes to turn pages */
    var THRESH = 140, acc = 0, idle = null, cool = false;
    var tip = doc.createElement('div');
    tip.className = 'swipe-back'; tip.setAttribute('aria-hidden', 'true');
    tip.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
    doc.body.appendChild(tip);
    var canScrollLeft = function (el) {
      for (; el && el !== doc.body && el.nodeType === 1; el = el.parentNode) {
        var ox = getComputedStyle(el).overflowX;
        if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth && el.scrollLeft > 0) return true;
      }
      return false;
    };
    var show = function (v) {
      var r = Math.min(v / THRESH, 1);
      tip.style.transform = 'translate(' + (-60 + 84 * r) + 'px,-50%)';
      tip.style.opacity = r;
      tip.classList.toggle('ready', r >= 1);
    };
    var goBack = function () {
      var ref = doc.referrer, same = false;
      try { same = !!ref && new URL(ref).origin === location.origin; } catch (e) {}
      if (same && history.length > 1) history.back();
      else if (!/(^|\/)(index\.html)?$/.test(location.pathname)) location.href = 'index.html';
    };
    window.addEventListener('wheel', function (ev) {
      if (cool || ev.ctrlKey) return;
      if (Math.abs(ev.deltaX) <= Math.abs(ev.deltaY) * 1.2) { if (!acc) return; }
      if (canScrollLeft(ev.target)) return;
      if (ev.deltaX < 0 || acc > 0) acc = Math.max(0, acc - ev.deltaX);
      if (!acc) return;
      ev.preventDefault();
      show(acc);
      clearTimeout(idle);
      idle = setTimeout(function () {             /* fingers lifted: decide */
        var go = acc >= THRESH; acc = 0; show(0);
        if (go) { cool = true; goBack(); setTimeout(function () { cool = false; }, 800); }
      }, 140);
    }, { passive: false });
  })();

  /* ---- light / dark toggle (remembers the visitor's choice; otherwise follows the system) ---- */
  (function () {
    var root = doc.documentElement, b = doc.querySelector('.theme-btn');
    if (!b) return;
    var sys = window.matchMedia('(prefers-color-scheme: dark)');
    var current = function () { return root.getAttribute('data-theme') || (sys.matches ? 'dark' : 'light'); };
    var label = function () {
      var t = current() === 'dark' ? L('Switch to light mode', '切换到浅色模式') : L('Switch to dark mode', '切换到深色模式');
      b.setAttribute('aria-label', t); b.title = t;
    };
    b.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('twig-theme', next); } catch (e) {}
      label();
    });
    if (sys.addEventListener) sys.addEventListener('change', label); else if (sys.addListener) sys.addListener(label);
    label();
  })();

  /* ---- photo reveal on cards (hover the avatar; tap it on touch screens); background drifts gently with the pointer ---- */
  Array.prototype.forEach.call(doc.querySelectorAll('.person.has-reveal'), function (card) {
    var av = card.querySelector('.avatar'), layer = card.querySelector('.p-reveal');
    if (!av || !layer) return;
    var still = window.matchMedia('(prefers-reduced-motion: reduce)');
    card.addEventListener('pointermove', function (ev) {
      if (still.matches || ev.pointerType !== 'mouse') return;
      var r = card.getBoundingClientRect();
      layer.style.setProperty('--px', (((ev.clientX - r.left) / r.width - .5) * -12).toFixed(1) + 'px');
      layer.style.setProperty('--py', (((ev.clientY - r.top) / r.height - .5) * -8).toFixed(1) + 'px');
    });
    card.addEventListener('pointerleave', function () { layer.style.setProperty('--px', '0px'); layer.style.setProperty('--py', '0px'); });
    av.addEventListener('click', function (ev) {
      if (window.matchMedia('(hover: hover)').matches) return;   /* desktop uses hover */
      ev.preventDefault(); card.classList.toggle('is-revealed');
    });
  });

  /* ---- TikTech moment: click the card -> enlarged photo pops in, bubble types the line, paws float ---- */
  Array.prototype.forEach.call(doc.querySelectorAll('.person.has-say'), function (card) {
    var still = window.matchMedia('(prefers-reduced-motion: reduce)');
    var open = function () {
      if (doc.querySelector('.tt-modal')) return;
      var img = card.querySelector('.avatar img');
      var m = doc.createElement('div');
      m.className = 'tt-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
      m.setAttribute('aria-label', card.getAttribute('data-name'));
      m.innerHTML = '<div class="tt-backdrop"></div><div class="tt-stage">' +
        '<p class="tt-bubble" aria-live="polite"><span class="tt-text"></span><span class="tt-caret" aria-hidden="true"></span></p>' +
        '<button class="tt-photo" type="button" aria-label="' + (img ? L('Pet ', '摸摸 ') : L('Say hi to ', '跟他打个招呼：')) + card.getAttribute('data-name').split(' ')[0] + '">' +
        (img ? '<img alt="" src="' + img.getAttribute('src') + '">' : '<span class="tt-initials" aria-hidden="true">' + card.getAttribute('data-initials') + '</span>') + '</button>' +
        '<p class="tt-name"></p><button class="tt-close" type="button" aria-label="' + L('Close (closes automatically after 6 seconds)', '关闭（6 秒后自动关闭）') + '">' +
        '<svg class="tt-ring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20"/></svg><span aria-hidden="true">&times;</span></button></div>';
      m.querySelector('.tt-name').innerHTML = '';
      var nm = m.querySelector('.tt-name'); nm.textContent = card.getAttribute('data-name');
      var sub = doc.createElement('small'); sub.textContent = card.getAttribute('data-role'); nm.appendChild(sub);
      doc.body.appendChild(m); doc.body.style.overflow = 'hidden';
      var stage = m.querySelector('.tt-stage'), photo = m.querySelector('.tt-photo');
      /* floating paws and hearts */
      if (!still.matches) {
        var icons = (card.getAttribute('data-floats') || '🐾 💛').split(' ');
        icons.forEach(function (ic, i) {
          var f = doc.createElement('span'); f.className = 'tt-float'; f.textContent = ic; f.setAttribute('aria-hidden', 'true');
          f.style.setProperty('--x', ((i % 2 ? 1 : -1) * (90 + Math.random() * 140)).toFixed(0) + 'px');
          f.style.setProperty('--drift', ((Math.random() - .5) * 80).toFixed(0) + 'px');
          f.style.setProperty('--rot', ((Math.random() - .5) * 70).toFixed(0) + 'deg');
          f.style.setProperty('--dl', (1 + i * .45).toFixed(2) + 's');
          f.style.setProperty('--dur', (3.2 + Math.random() * 1.6).toFixed(2) + 's');
          f.style.setProperty('--sz', (16 + Math.random() * 14).toFixed(0) + 'px');
          stage.appendChild(f);
        });
      }
      /* type the line out once the bubble lands */
      var line = card.getAttribute('data-say'), out = m.querySelector('.tt-text'), bub = m.querySelector('.tt-bubble'), k = 0, tick = null;
      var type = function () { out.textContent = line.slice(0, ++k); if (k < line.length) tick = setTimeout(type, Math.min(32, 3600 / line.length)); else shown(); };
      var auto = null;
      var countdown = function () {
        clearTimeout(auto); m.classList.remove('counting'); void m.offsetWidth; m.classList.add('counting');
        auto = setTimeout(function () { close(); }, 6000);
      };
      var shown = function () { bub.classList.add('tt-done'); likeRow(); countdown(); };
      /* "like our service?" heart under the line (TikTech): outline heart turns red on click; shared like count */
      var likeRow = function () {
        var key = card.getAttribute('data-like'); if (!key) return;
        var API = 'https://abacus.jasoncameron.dev', NS = 'lindaixie-github-io', LK = 'twig-liked-' + key, liked = false;
        try { liked = localStorage.getItem(LK) === '1'; } catch (e) {}
        var row = doc.createElement('span'); row.className = 'tt-like';
        row.innerHTML = '<span class="tt-like-t">' + L('If you like our service, please give us a like!', '喜欢我们的服务的话，请点个赞！') + '</span>' +
          '<button class="tt-like-btn" type="button" aria-pressed="' + liked + '" aria-label="' + L('Like', '点赞') + '">' +
          '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.2 3.3 4.8 6.8 4.5c2.1-.2 3.9.9 5.2 2.8 1.3-1.9 3.1-3 5.2-2.8 3.5.3 5.3 3.7 4.1 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>' +
          '</button><span class="tt-like-n" aria-live="polite"></span>';
        bub.appendChild(row);
        var btn = row.querySelector('.tt-like-btn'), num = row.querySelector('.tt-like-n');
        var setN = function (v) { if (typeof v === 'number') num.textContent = v; };
        if (window.fetch) fetch(API + '/get/' + NS + '/' + key + '-likes').then(function (r) { return r.status === 404 ? { value: 0 } : r.json(); })
          .then(function (d) { setN(d && d.value); }).catch(function () {});
        btn.addEventListener('click', function () {
          countdown();
          if (liked) return;
          liked = true; btn.setAttribute('aria-pressed', 'true'); btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
          try { localStorage.setItem(LK, '1'); } catch (e) {}
          var cur = parseInt(num.textContent, 10); if (!isNaN(cur)) setN(cur + 1);
          if (window.fetch) fetch(API + '/hit/' + NS + '/' + key + '-likes').then(function (r) { return r.json(); }).then(function (d) { setN(d && d.value); }).catch(function () {});
        });
      };
      if (still.matches) { out.textContent = line; shown(); } else tick = setTimeout(type, 900);
      /* pet him: wiggle + heart burst */
      photo.addEventListener('click', function () {
        photo.classList.remove('wiggle'); void photo.offsetWidth; photo.classList.add('wiggle');
        if (still.matches) return;
        for (var i = 0; i < 8; i++) {
          var bi = (card.getAttribute('data-burst') || '💛 🐾').split(' ');
          var h = doc.createElement('span'); h.className = 'tt-heart'; h.textContent = bi[i % bi.length]; h.setAttribute('aria-hidden', 'true');
          var ang = (i / 8) * Math.PI * 2 + Math.random() * .4, dist = 110 + Math.random() * 60;
          h.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(0) + 'px'); h.style.setProperty('--dy', (Math.sin(ang) * dist).toFixed(0) + 'px');
          h.style.setProperty('--rot', ((Math.random() - .5) * 90).toFixed(0) + 'deg');
          photo.appendChild(h); setTimeout(function (el) { return function () { el.remove(); }; }(h), 950);
        }
      });
      var close = function () {
        if (m.classList.contains('closing')) return;
        clearTimeout(tick); clearTimeout(auto); m.classList.add('closing'); doc.removeEventListener('keydown', onKey);
        setTimeout(function () { m.remove(); doc.body.style.overflow = ''; card.focus(); }, still.matches ? 0 : 280);
      };
      var onKey = function (ev) {
        if (ev.key === 'Escape') close();
        if (ev.key === 'Tab') {                       /* keep focus inside the dialog */
          var f = [photo, m.querySelector('.tt-close')], i = f.indexOf(doc.activeElement);
          ev.preventDefault(); f[(i + (ev.shiftKey ? f.length - 1 : 1)) % f.length].focus();
        }
      };
      doc.addEventListener('keydown', onKey);
      m.querySelector('.tt-backdrop').addEventListener('click', close);
      m.querySelector('.tt-close').addEventListener('click', close);
      setTimeout(function () { m.querySelector('.tt-close').focus({ preventScroll: true }); }, 50);
    };
    card.addEventListener('click', function (ev) { if (ev.target.closest && ev.target.closest('a')) return; open(); });
    card.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } });
  });

  /* ---- acknowledgements book: page turns (buttons, dots, arrow keys, swipe / trackpad), opens at #ack-name ---- */
  (function () {
    var book = doc.querySelector('.book'); if (!book) return;
    var sheets = Array.prototype.slice.call(book.querySelectorAll('.sheet')), n = sheets.length, cur = 0, busy = false;
    var prev = book.querySelector('.book-btn.prev'), next = book.querySelector('.book-btn.next');
    var dots = Array.prototype.slice.call(book.querySelectorAll('.book-dot')), count = book.querySelector('.book-count .cur');
    var still = window.matchMedia('(prefers-reduced-motion: reduce)');
    var ui = function () {
      prev.disabled = cur === 0; next.disabled = cur === n - 1; count.textContent = cur + 1;
      dots.forEach(function (d, i) { d.classList.toggle('on', i === cur); if (i === cur) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
    };
    var show = function (i) { sheets.forEach(function (s, k) { s.hidden = k !== i; s.classList.toggle('is-current', k === i); }); cur = i; ui(); };
    var go = function (i) {
      if (busy || i === cur || i < 0 || i >= n) return;
      var fwd = i > cur, from = sheets[cur], to = sheets[i];
      if (still.matches) { show(i); return; }
      busy = true; to.hidden = false;
      from.classList.add(fwd ? 'out-next' : 'out-prev'); to.classList.add(fwd ? 'in-next' : 'in-prev');
      setTimeout(function () {
        from.classList.remove('out-next', 'out-prev'); to.classList.remove('in-next', 'in-prev');
        show(i); busy = false;
      }, 620);
      var top = book.getBoundingClientRect().top;
      if (top < 0) window.scrollBy({ top: top - 90, behavior: 'smooth' });
    };
    prev.addEventListener('click', function () { go(cur - 1); });
    next.addEventListener('click', function () { go(cur + 1); });
    dots.forEach(function (d) { d.addEventListener('click', function () { go(+d.getAttribute('data-go') - 1); }); });
    doc.addEventListener('keydown', function (ev) {
      if (ev.target.closest && ev.target.closest('input,textarea')) return;
      if (ev.key === 'ArrowRight' || ev.key === 'PageDown') { go(cur + 1); }
      else if (ev.key === 'ArrowLeft' || ev.key === 'PageUp') { go(cur - 1); }
    });
    var stage = book.querySelector('.book-stage'), side = 0;
    var aim = function (ev) {
      if (ev.pointerType && ev.pointerType !== 'mouse') return;
      var r = stage.getBoundingClientRect(), left = ev.clientX < r.left + r.width / 2;
      side = left ? (cur > 0 ? -1 : 0) : (cur < n - 1 ? 1 : 0);
      stage.classList.toggle('cur-prev', side === -1); stage.classList.toggle('cur-next', side === 1);
    };
    stage.addEventListener('pointermove', aim);
    stage.addEventListener('pointerleave', function () { side = 0; stage.classList.remove('cur-prev', 'cur-next'); });
    stage.addEventListener('click', function (ev) {
      if (!side || (ev.target.closest && ev.target.closest('a,button'))) return;
      var s0 = side; go(cur + s0);
      setTimeout(function () { side = 0; stage.classList.remove('cur-prev', 'cur-next'); aim(ev); }, 650);
    });
    var sx = null;
    book.addEventListener('pointerdown', function (ev) { if (ev.pointerType !== 'mouse') sx = ev.clientX; });
    book.addEventListener('pointerup', function (ev) {
      if (sx === null) return; var dx = ev.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1));
    });
    var acc = 0, cool = false, idle = null;
    book.addEventListener('wheel', function (ev) {
      if (Math.abs(ev.deltaX) <= Math.abs(ev.deltaY)) return;
      ev.preventDefault(); if (cool) return;
      acc += ev.deltaX; clearTimeout(idle); idle = setTimeout(function () { acc = 0; }, 160);
      if (Math.abs(acc) > 90) { go(cur + (acc > 0 ? 1 : -1)); acc = 0; cool = true; setTimeout(function () { cool = false; }, 750); }
    }, { passive: false });
    if (ZH) book.classList.add('zh');   /* Chinese site: the parents' section appears in its Chinese original for everyone */
    var target = /^#ack-[a-z]+$/.test(location.hash) ? book.querySelector('mark[data-who="' + location.hash.slice(5) + '"]') : null;
    if (!target && /^#page-\d+$/.test(location.hash)) { var pn = +location.hash.slice(6); if (pn >= 1 && pn <= n) show(pn - 1); }
    if (target) {
      var sheet = target.closest('.sheet'); show(sheets.indexOf(sheet));
      setTimeout(function () { target.classList.add('glow'); }, 450);
    }
    ui();
  })();

  /* ---- home timeline: start the footprints when it scrolls into view ---- */
  (function () {
    var jr = doc.querySelector('.journey'); if (!jr) return;
    if (!('IntersectionObserver' in window)) { jr.classList.add('go'); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { jr.classList.add('go'); io.disconnect(); } });
    }, { threshold: 0.35 });
    io.observe(jr);
  })();

  /* ---- easter eggs: remember which ones this visitor found; count visitors who found at least one ---- */
  (function () {
    var API = 'https://abacus.jasoncameron.dev', NS = 'lindaixie-github-io', KEY = 'twig-eggs';
    var mine = [];
    try { mine = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { mine = []; }
    var hit = function (k) { try { fetch(API + '/hit/' + NS + '/' + k, { mode: 'cors' }).catch(function () {}); } catch (e) {} };
    var show = function () {
      var me = doc.querySelector('.egg-me'), box = doc.querySelector('.egg-mine');
      if (me && box) { me.textContent = mine.length; box.hidden = mine.length === 0; }
    };
    var found = function (k) {
      if (mine.indexOf(k) !== -1) return;
      mine.push(k);
      try { localStorage.setItem(KEY, JSON.stringify(mine)); } catch (e) {}
      if (mine.length === 1) hit('egg-finders');   /* each browser counts once, on its first egg */
      hit('egg-' + k);
      show();
    };
    doc.addEventListener('click', function (ev) { if (ev.target.closest && ev.target.closest('.person.has-say')) found('say'); });
    var peek = function (ev) { if (ev.target.closest && ev.target.closest('.person.has-reveal .avatar')) found('peek'); };
    doc.addEventListener('mouseover', peek);
    doc.addEventListener('pointerdown', peek);
    if (doc.querySelector('.book')) found('ack');
    show();
    var n = doc.querySelector('.egg-n'), cnt = doc.querySelector('.egg-count');
    if (n && cnt && window.fetch) {
      fetch(API + '/get/' + NS + '/egg-finders', { mode: 'cors' })
        .then(function (r) { return r.status === 404 ? { value: 0 } : r.json(); })
        .then(function (d) { if (d && typeof d.value === 'number') { n.textContent = d.value; cnt.hidden = false;
          if (d.value === 1 && !ZH) doc.querySelector('.egg-who').textContent = 'visitor has found at least one so far.'; } })
        .catch(function () {});
    }
  })();

  /* ---- area kittens: work their way right, one segment at a time, to the last in-progress segment ---- */
  (function () {
    var cats = Array.prototype.slice.call(doc.querySelectorAll('.farm-cat[data-to]'));
    if (!cats.length) return;
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var walk = function (c) {
      var to = +c.getAttribute('data-to');
      if (!to) return;
      if (still) { c.style.setProperty('--at', to); return; }
      var dur = to * 2.8;   /* slow, steady walk while working: about 2.8 s per segment */
      c.style.transition = 'left ' + dur + 's linear';
      c.classList.add('walking');
      requestAnimationFrame(function () { c.style.setProperty('--at', to); });
      setTimeout(function () { c.classList.remove('walking'); }, dur * 1000);
    };
    var started = [];
    var start = function (c) { if (started.indexOf(c) !== -1) return; started.push(c); setTimeout(function () { walk(c); }, 1200); };
    var inView = function (c) { var r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < (window.innerHeight || doc.documentElement.clientHeight); };
    var check = function () { cats.forEach(function (c) { if (inView(c)) start(c); }); };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) start(en.target); }); }, { threshold: 0.1 });
      cats.forEach(function (c) { io.observe(c); });
    }
    window.addEventListener('scroll', check, { passive: true });
    check();
  })();

  /* ---- easter-egg note: click the egg -> it bursts into a little confetti puff, then comes back ---- */
  Array.prototype.forEach.call(doc.querySelectorAll('.egg-ic'), function (egg) {
    var colors = ['#ff8fab', '#ffd34d', '#8fd3c1', '#b9a7f0', '#7fb8f0', '#5f9150'];
    egg.addEventListener('click', function () {
      if (egg.classList.contains('pop')) return;
      egg.classList.add('pop');
      setTimeout(function () {
        for (var i = 0; i < 16; i++) {
          var b = doc.createElement('span'); b.className = 'egg-bit'; b.setAttribute('aria-hidden', 'true');
          var ang = (i / 16) * Math.PI * 2 + Math.random() * .5, dist = 22 + Math.random() * 26;
          b.style.background = colors[i % colors.length];
          if (i % 3 === 0) b.style.borderRadius = '50%';
          b.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(0) + 'px');
          b.style.setProperty('--dy', (Math.sin(ang) * dist - 6).toFixed(0) + 'px');
          b.style.setProperty('--rot', ((Math.random() - .5) * 540).toFixed(0) + 'deg');
          egg.appendChild(b);
          setTimeout(function (el) { return function () { el.remove(); }; }(b), 950);
        }
      }, 230);
      setTimeout(function () { egg.classList.remove('pop'); }, 950);
    });
  });

  /* ---- mobile menu ---- */
  var btn = doc.querySelector('.menu-btn');
  var nav = doc.getElementById('site-nav');
  var mq = window.matchMedia('(max-width: 833px)');
  function setOpen(open, returnFocus) {
    if (!btn || !nav) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.querySelector('.sr-only').textContent = open ? L('Close menu', '关闭菜单') : L('Menu', '菜单');
    nav.classList.toggle('open', open);
    doc.body.classList.toggle('nav-open', open);
    if (open) {
      var first = nav.querySelector('a');
      if (first) first.focus();
    } else if (returnFocus) {
      btn.focus();
    }
  }
  if (btn && nav) {
    btn.addEventListener('click', function () {
      setOpen(btn.getAttribute('aria-expanded') !== 'true', false);
    });
    doc.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') setOpen(false, true);
    });
    nav.addEventListener('click', function (ev) {
      if (ev.target.closest('a')) setOpen(false, false);
    });
    /* keep Tab inside the open menu (button + links) */
    doc.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Tab' || btn.getAttribute('aria-expanded') !== 'true') return;
      var items = [btn].concat(Array.prototype.slice.call(nav.querySelectorAll('a')));
      var i = items.indexOf(doc.activeElement);
      if (ev.shiftKey && i <= 0) { ev.preventDefault(); items[items.length - 1].focus(); }
      else if (!ev.shiftKey && i === items.length - 1) { ev.preventDefault(); items[0].focus(); }
    });
    var onChange = function () { if (!mq.matches) setOpen(false, false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }

  /* ---- publications search ---- */
  var tools = doc.querySelector('.pub-tools');
  var q = doc.getElementById('pub-q');
  if (tools && q) {
    tools.hidden = false;
    var groups = Array.prototype.slice.call(doc.querySelectorAll('.year-group'));
    var count = doc.getElementById('pub-count');
    var empty = doc.getElementById('pub-empty');
    var total = doc.querySelectorAll('.year-group .pub').length;
    var norm = function (s) { return s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim(); };
    var run = function () {
      var terms = norm(q.value).split(' ').filter(Boolean);
      var shown = 0;
      groups.forEach(function (g) {
        var year = g.querySelector('.year').textContent;
        var vis = 0;
        g.querySelectorAll('.pub').forEach(function (li) {
          var hay = norm(li.textContent + ' ' + year);
          var ok = terms.every(function (t) { return hay.indexOf(t) !== -1; });
          li.hidden = !ok;
          if (ok) vis++;
        });
        g.hidden = vis === 0;
        shown += vis;
      });
      empty.hidden = shown !== 0;
      count.textContent = ZH ? (terms.length ? '共 ' + total + ' 篇，匹配 ' + shown + ' 篇' : '共 ' + total + ' 篇') : (terms.length ? shown + ' of ' + total : total) + ' publications';
    };
    q.addEventListener('input', run);
  }

  /* ---- copy email ---- */
  doc.querySelectorAll('[data-copy]').forEach(function (b) {
    if (!navigator.clipboard) return;
    b.hidden = false;
    b.addEventListener('click', function () {
      navigator.clipboard.writeText(b.getAttribute('data-copy')).then(function () {
        var t = b.textContent;
        b.textContent = L('Copied', '已复制');
        setTimeout(function () { b.textContent = t; }, 1800);
      });
    });
  });
})();
