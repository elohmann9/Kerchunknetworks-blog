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
  var bar = document.querySelector(".nav-glass-bar");
  var pill = bar && bar.querySelector(".nav-pill");
  if (!bar || !pill) return;
  var links = Array.prototype.slice.call(bar.querySelectorAll("a[data-spy]"));
  if (!links.length) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) pill.style.transition = "none";
  var current = links[0];
  function place(el) {
    if (!el) return;
    var b = bar.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    pill.style.width = r.width + "px";
    pill.style.height = r.height + "px";
    pill.style.transform = "translate(" + (r.left - b.left) + "px," + (r.top - b.top) + "px)";
  }
  links.forEach(function (a) {
    a.addEventListener("mouseenter", function () { place(a); });
    a.addEventListener("focus", function () { place(a); });
  });
  bar.addEventListener("mouseleave", function () { place(current); });
  function setCurrent(id) {
    var next = null;
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute("data-spy") === id) next = links[i];
    }
    if (!next) return;
    links.forEach(function (a) { a.classList.toggle("is-current", a === next); });
    current = next;
    if (!bar.matches(":hover")) place(current);
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      var best = null;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry;
      });
      if (best) setCurrent(best.target.id);
    }, { rootMargin: "-28% 0px -48% 0px", threshold: [0.15, 0.4, 0.7] });
    ["hero", "services", "work", "faq"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }
  window.addEventListener("resize", function () { place(current); });
  requestAnimationFrame(function () { place(current); });
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
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    var video = document.querySelector(".hero-video-mobile");
    if (!video || video.querySelector("source")) return;
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
  }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
