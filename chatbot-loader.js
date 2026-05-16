(function () {
  var loaded = false;
  function loadChatbot() {
    if (loaded) return;
    loaded = true;
    var s = document.createElement('script');
    s.src = 'chatbot-upgrade.min.js?v=20260226-02';
    s.defer = true;
    document.head.appendChild(s);
  }
  var triggers = ['scroll', 'click', 'keydown', 'touchstart', 'mousemove'];
  triggers.forEach(function (evt) {
    window.addEventListener(evt, loadChatbot, { once: true, passive: true });
  });
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadChatbot, { timeout: 5000 });
  } else {
    setTimeout(loadChatbot, 5000);
  }
})();
