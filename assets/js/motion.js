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
