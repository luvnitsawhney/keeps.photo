// Occasion pages: videos play only when visible, before/after slider, film strip arrows,
// phone buy bar, hamburger and nav highlight. (The Occasions dropdown lives in landing.js, shared with the homepage.)
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const occasion = document.body.dataset.occasion || "";

  // Videos: play while on screen; pause toggle.
  const paused = new WeakSet();
  const vids = [...document.querySelectorAll("video")];
  if (reduce) vids.forEach((v) => { v.removeAttribute("autoplay"); v.pause(); });
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting && !paused.has(v) && !reduce) { if (v.preload === "none") v.preload = "auto"; v.play().catch(() => {}); }
    else v.pause();
  }), { threshold: 0.35 });
  vids.forEach((v) => io.observe(v));
  document.querySelectorAll(".vtoggle").forEach((b) => {
    const v = document.getElementById(b.dataset.video);
    if (!v) return;
    if (reduce) { paused.add(v); b.setAttribute("aria-pressed", "true"); b.setAttribute("aria-label", "Play video"); }
    b.addEventListener("click", () => {
      const pause = !v.paused;
      if (pause) { v.pause(); paused.add(v); } else { paused.delete(v); v.play().catch(() => {}); }
      b.setAttribute("aria-pressed", String(pause));
      b.setAttribute("aria-label", pause ? "Play video" : "Pause video");
    });
  });

  // Before/after slider, with one nudge so people see it moves.
  const cmp = document.getElementById("compare");
  if (cmp) {
    const input = cmp.querySelector("input");
    const set = () => cmp.style.setProperty("--pos", input.value + "%");
    input.addEventListener("input", set); set();
    if (!reduce) {
      let touched = false;
      input.addEventListener("pointerdown", () => { touched = true; cmp.classList.remove("nudge"); }, { once: true });
      cmp.addEventListener("animationend", () => cmp.classList.remove("nudge"));
      const nudge = new IntersectionObserver((es) => {
        if (!es[0].isIntersecting) return;
        nudge.disconnect();
        if (!touched) setTimeout(() => cmp.classList.add("nudge"), 300);
      }, { threshold: 0.6 });
      nudge.observe(cmp);
    }
  }

  // Film strip arrows.
  const strip = document.getElementById("film-strip");
  const prev = document.getElementById("film-prev"), next = document.getElementById("film-next");
  if (strip && prev && next) {
    const step = () => strip.querySelector(".film").getBoundingClientRect().width + 20;
    prev.addEventListener("click", () => strip.scrollBy({ left: -step(), behavior: reduce ? "auto" : "smooth" }));
    next.addEventListener("click", () => strip.scrollBy({ left: step(), behavior: reduce ? "auto" : "smooth" }));
    const sync = () => { prev.disabled = strip.scrollLeft < 8; next.disabled = strip.scrollLeft + strip.clientWidth > strip.scrollWidth - 8; };
    strip.addEventListener("scroll", sync, { passive: true }); addEventListener("resize", sync); sync();
  }

  // Phones: buy bar once the hero button has scrolled away, hidden over pricing and the closing CTA.
  const bar = document.getElementById("sticky-cta");
  if (bar) {
    const heroCta = document.querySelector(".hero .cta-stack .btn"), stop = [document.getElementById("pricing"), document.querySelector(".final")];
    const vis = new Map();
    const upd = () => {
      const show = !vis.get(heroCta) && !stop.some((el) => vis.get(el));
      bar.classList.toggle("on", show);
      bar.setAttribute("aria-hidden", String(!show));
      bar.querySelector("a").tabIndex = show ? 0 : -1;
    };
    const io2 = new IntersectionObserver((es) => { es.forEach((e) => vis.set(e.target, e.isIntersecting)); upd(); });
    [heroCta, ...stop].forEach((el) => el && io2.observe(el));
  }

  // Phones: hamburger menu.
  const burger = document.querySelector(".burger"), mnav = document.getElementById("mnav");
  if (burger && mnav) {
    const setOpen = (open) => {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.querySelector(".nav").classList.toggle("open", open);
    };
    burger.addEventListener("click", () => setOpen(burger.getAttribute("aria-expanded") !== "true"));
    mnav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  }

  // Highlight the section you're in.
  const links = [...document.querySelectorAll(".nav-links a[href^='#']")];
  const ids = [...new Set(links.map((a) => a.getAttribute("href").slice(1)))];
  let current = null;
  const spy = () => {
    const y = innerHeight * 0.35;
    let id = null, best = -Infinity;   // the section whose top passed the line most recently (page order can differ from nav order)
    for (const s of ids) { const el = document.getElementById(s), t = el && el.getBoundingClientRect().top; if (el && t <= y && t > best) { best = t; id = s; } }
    if (id === current) return;
    current = id;
    links.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + id)));
  };
  addEventListener("scroll", () => requestAnimationFrame(spy), { passive: true });
  spy();

  // Which buttons and links people use on these pages.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-t]");
    if (a) K.track("occasion_click", { occasion, target: a.dataset.t });
  });
})();
