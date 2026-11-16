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
  var placed = null;
  var leaveTimer = 0;
  var resizeRaf = 0;
  function place(el) {
    if (!el || el === placed) return;
    placed = el;
    var b = bar.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    var x = Math.round(r.left - b.left);
    var y = Math.round(r.top - b.top);
    var w = Math.round(r.width);
    var h = Math.round(r.height);
    pill.style.width = w + "px";
    pill.style.height = h + "px";
    pill.style.transform = "translate3d(" + x + "px," + y + "px,0)";
  }
  links.forEach(function (a) {
    a.addEventListener("mouseenter", function () {
      clearTimeout(leaveTimer);
      place(a);
    });
    a.addEventListener("focus", function () { place(a); });
  });
  bar.addEventListener("mouseleave", function () {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(function () {
      placed = null;
      place(current);
    }, 120);
  });
  function setCurrent(id) {
    var next = null;
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute("data-spy") === id) next = links[i];
    }
    if (!next || next === current) return;
    if (current) current.classList.remove("is-current");
    next.classList.add("is-current");
    current = next;
    if (!bar.matches(":hover")) {
      placed = null;
      place(current);
    }
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      var best = null;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry;
      });
      if (best) setCurrent(best.target.id);
    }, { rootMargin: "-30% 0px -50% 0px", threshold: [0.2] });
    ["hero", "services", "work", "faq"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
    var hero = document.getElementById("hero");
    if (hero) {
      new IntersectionObserver(function (entries) {
        document.body.classList.toggle("nav-over-scene", entries[0].isIntersecting);
      }, { threshold: 0 }).observe(hero);
    }
    var cta = document.querySelector(".hero .glass-zone");
    if (cta) {
      new IntersectionObserver(function (entries) {
        document.body.classList.toggle("hero-cta-away", !entries[0].isIntersecting);
      }, { threshold: 0 }).observe(cta);
    }
  }
  window.addEventListener("resize", function () {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(function () {
      resizeRaf = 0;
      placed = null;
      place(bar.matches(":hover") ? placed : current);
      var hover = null;
      links.forEach(function (a) { if (a.matches(":hover")) hover = a; });
      placed = null;
      place(hover || current);
    });
  });
  var zone = document.querySelector(".glass-zone");
  if (zone) {
    var openTimer = 0;
    zone.addEventListener("mouseenter", function () {
      clearTimeout(openTimer);
      zone.classList.add("is-open");
    });
    zone.addEventListener("mouseleave", function () {
      clearTimeout(openTimer);
      openTimer = setTimeout(function () { zone.classList.remove("is-open"); }, 120);
    });
    zone.addEventListener("focus", function () { zone.classList.add("is-open"); });
    zone.addEventListener("blur", function () { zone.classList.remove("is-open"); });
  }
  requestAnimationFrame(function () {
    current.classList.add("is-current");
    place(current);
  });
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
