// Small progressive enhancements only; every page works without this file.
(function () {
  // Visitor counter in the footer: every page view adds one.
  var vc = document.getElementById('visits');
  if (vc) fetch('/api/visit', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (d) {
    vc.textContent = Number(d.visits).toLocaleString('mr-IN'); vc.parentNode.hidden = false;
  }).catch(function () {});
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
