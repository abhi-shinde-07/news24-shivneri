// Small progressive enhancements only; every page works without this file.
(function () {
  // Visitor counter in the footer: every page view adds one.
  var vc = document.getElementById('visits');
  if (vc) fetch('/api/visit', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (d) {
    vc.textContent = Number(d.visits).toLocaleString('mr-IN'); vc.parentNode.hidden = false;
  }).catch(function () {});
  // Text cannot be copied, cut or right-clicked (forms still work); pinch zoom is off.
  var editable = function (e) { return e.target.closest && e.target.closest('input, textarea, select, [contenteditable]'); };
  ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (!editable(e)) e.preventDefault(); });
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && /^[acsup]$/i.test(e.key) && !editable(e)) e.preventDefault();
  });
  ['gesturestart', 'gesturechange'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); }); });
  document.addEventListener('touchmove', function (e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  // "Read here": the story opens with a smooth animation; a top-news card grows to the full row.
  var stories = document.querySelectorAll('.lead3, .mainrow .rcard');
  stories.forEach(function (el, i) { el.style.viewTransitionName = 'story' + i; });
  document.querySelectorAll('.lead3 .readhere > summary, .rcard .readhere > summary').forEach(function (sum) {
    sum.addEventListener('click', function (e) {
      var d = sum.parentNode, card = d.closest('.rcard'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      e.preventDefault();
      var flip = function () { d.open = !d.open; };
      var settle = function () {
        if (card && d.open && card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      };
      if (document.startViewTransition && !reduce) document.startViewTransition(flip).finished.then(settle);
      else { flip(); settle(); }
    });
  });
  var t = document.getElementById('today');
  if (t) t.textContent = new Date().toLocaleDateString('mr-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.hidden = false;
    b.addEventListener('click', function () {
      navigator.clipboard.writeText(b.getAttribute('data-copy')).then(function () {
        var old = b.textContent; b.textContent = 'लिंक कॉपी झाली ✓';
        setTimeout(function () { b.textContent = old; }, 2000);
      });
    });
  });
  // Lite YouTube: load the iframe only after a click.
  document.querySelectorAll('[data-yt]').forEach(function (el) {
    el.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + el.getAttribute('data-yt') + '?autoplay=1&rel=0';
      f.title = el.getAttribute('aria-label') || 'व्हिडिओ';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      el.replaceWith(f);
    });
  });
  // Photo lightbox using <dialog>.
  var dlg = document.getElementById('lightbox');
  if (dlg) {
    var img = dlg.querySelector('img'), cap = dlg.querySelector('p');
    document.querySelectorAll('[data-lightbox]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault(); img.src = a.href; img.alt = a.getAttribute('data-caption') || '';
        cap.textContent = a.getAttribute('data-caption') || ''; dlg.showModal();
      });
    });
    dlg.addEventListener('click', function () { dlg.close(); img.removeAttribute('src'); });
  }
})();
