(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) document.documentElement.classList.add("js");

  function markNav() {
    var menu = document.getElementById("mobile-nav");
    var legacy = document.getElementById("navMenu");
    var open = (menu && menu.classList.contains("open")) ||
      (legacy && legacy.classList.contains("active"));
    document.body.classList.toggle("nav-open", !!open);
  }

  var watch = [document.getElementById("mobile-nav"), document.getElementById("navMenu")];
  if ("MutationObserver" in window) {
    var obs = new MutationObserver(markNav);
    watch.forEach(function (node) {
      if (node) obs.observe(node, { attributes: true, attributeFilter: ["class"] });
    });
  }

  var nodes = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    nodes.forEach(function (el) { el.classList.add("is-in"); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  nodes.forEach(function (el) { io.observe(el); });
})();

(function () {
  var videos = document.querySelectorAll(".hero-video");
  if (!videos.length) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var save = conn && (conn.saveData || conn.effectiveType === "slow-2g" || conn.effectiveType === "2g");
  if (reduce || save) {
    document.documentElement.classList.add("hero-still");
    return;
  }
  function start() {
    var mobile = window.matchMedia("(max-width: 900px)").matches;
    videos.forEach(function (video) {
      var on = mobile ? video.classList.contains("hero-video-mobile") : video.classList.contains("hero-video-desktop");
      if (!on) return;
      var webm = document.createElement("source");
      webm.src = video.getAttribute("data-webm");
      webm.type = "video/webm";
      var mp4 = document.createElement("source");
      mp4.src = video.getAttribute("data-mp4");
      mp4.type = "video/mp4";
      video.appendChild(webm);
      video.appendChild(mp4);
      video.preload = "metadata";
      video.addEventListener("playing", function () { video.classList.add("is-ready"); });
      var play = video.play();
      if (play && play.catch) play.catch(function () {});
    });
  }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
