// Keeps app UI kit: icons, bottom sheets, wheel picker, toast, confetti.
// Depends on common.js (K). Markup and classes live in app.css.
(function () {
  // ----- icons (24px grid, stroke) -----
  const P = {
    back: '<path d="M15 5l-7 7 7 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    camera: '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.3"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    share: '<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3.1-3.1a4 4 0 0 0-5.7-5.7L11.6 6.7"/><path d="M14 10a4 4 0 0 0-5.7 0l-3.1 3.1a4 4 0 0 0 5.7 5.7l1.5-1.5"/>',
    download: '<path d="M12 3.5V15M7.5 10.5L12 15l4.5-4.5M4.5 20h15"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M4.5 15v3.5A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5V15"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
    warn: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.2v.1"/>',
    cast: '<path d="M3.5 17a4 4 0 0 1 4 4M3.5 13.2a7.8 7.8 0 0 1 7.8 7.8M3.5 9.4A11.6 11.6 0 0 1 15.1 21"/><path d="M6.5 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3"/>',
    edit: '<path d="M4 20h4.5L19 9.5 14.5 5 4 15.5z"/><path d="M13 6.5l4.5 4.5"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3"/>',
    photo: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
    star: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.8l-5.1 2.6 1-5.6-4.1-4 5.7-.8z"/>',
    whatsapp: '<path d="M4.5 19.5l1.2-3.8A8 8 0 1 1 8.6 18.4z"/><path d="M9 8.8c.2 1.9 2.3 4.6 5.6 5.7l1.2-1.4-2-1-.9.8c-.9-.4-1.8-1.3-2.2-2.2l.8-.9-1-2z"/>',
    sparkle: '<path d="M12 3.5l1.9 5.3 5.3 1.9-5.3 1.9L12 18l-1.9-5.4L4.8 10.7l5.3-1.9z"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M20.5 15.5l-4.5-4.5-9 8.5"/><circle cx="9" cy="9.5" r="1.6"/>',
    redo: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4.5h-4.5"/>',
    users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  };
  K.icon = (name, cls = "") => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ""}</svg>`;

  // ----- bottom sheet -----
  // K.sheet({ id, title, sub, body, foot, full, onClose }) → { el, body, close }. Reuses the dialog if it exists.
  K.sheet = function ({ id, title, sub = "", body = "", foot = "", full = false, onClose, label, cls = "" } = {}) {
    let d = id && document.getElementById(id);
    if (!d) { d = document.createElement("dialog"); if (id) d.id = id; document.body.append(d); }
    d.className = "sheet" + (full ? " full" : "") + (cls ? " " + cls : "");
    const tid = (id || "sh") + "-t";
    d.setAttribute("aria-labelledby", tid);
    d.innerHTML = `<div class="sh-top"><button class="icon-btn sm" type="button" data-close aria-label="Close">${K.icon("close")}</button></div>
      <div class="sh-body">${title || sub ? `<div class="sh-head">${title ? `<h2 class="t-sub" id="${tid}" tabindex="-1">${title}</h2>` : ""}${sub ? `<p class="t-lead">${sub}</p>` : ""}</div>` : `<span class="sr" id="${tid}">${K.esc(label || "Dialog")}</span>`}${body}</div>
      ${foot ? `<div class="sh-foot">${foot}</div>` : ""}`;
    const close = () => { if (d.open) d.close(); };
    d.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
    d.onclick = (e) => { if (e.target === d) close(); };   // tap the scrim
    d.onclose = () => { kbOff(d); onClose && onClose(); };
    if (!d.open) { d.showModal(); kbOn(d); }
    const h = d.querySelector(".sh-head h2"); if (h) h.focus({ preventScroll: true });
    return { el: d, body: d.querySelector(".sh-body"), foot: d.querySelector(".sh-foot"), close };
  };

  // Keyboard: on iOS the on-screen keyboard covers the bottom of the page instead of shrinking it,
  // so an open sheet would sit behind it. Lift the sheet by the keyboard's height, and mark it .kb
  // (sheets can tuck away decoration then, so the field and the button stay in view).
  // Only a real keyboard counts: the visible area has to shrink. Focusing a field on its own (desktop,
  // a hardware keyboard, a phone preview) changes nothing.
  let kbSheet = null, kbBase = 0;
  function kbFit() {
    const v = window.visualViewport; if (!kbSheet || !v) return;
    kbBase = Math.max(kbBase, v.height);
    const cover = Math.max(0, Math.round(window.innerHeight - v.height - v.offsetTop));   // iOS: keyboard over the page
    const up = kbBase - v.height > 120 && v.scale < 1.05;                                                 // iOS or Android: less to see
    kbSheet.style.setProperty("--kb", up ? cover + "px" : "0px");
    kbSheet.style.setProperty("--vvh", Math.round(v.height) + "px");
    kbSheet.classList.toggle("kb", up);
  }
  function kbOn(d) {
    kbSheet = d; kbBase = window.visualViewport ? window.visualViewport.height : 0; kbFit();
    window.visualViewport?.addEventListener("resize", kbFit); window.visualViewport?.addEventListener("scroll", kbFit);
    d.addEventListener("focusin", kbLater); d.addEventListener("focusout", kbLater);
  }
  function kbOff(d) {
    if (kbSheet !== d) return;
    window.visualViewport?.removeEventListener("resize", kbFit); window.visualViewport?.removeEventListener("scroll", kbFit);
    d.removeEventListener("focusin", kbLater); d.removeEventListener("focusout", kbLater);
    d.classList.remove("kb"); d.style.removeProperty("--kb"); kbSheet = null;
  }
  function kbLater() { kbFit(); setTimeout(kbFit, 60); setTimeout(kbFit, 350); }

  // ----- toast -----
  let tEl, tTimer;
  K.toast = (msg) => {
    if (!tEl) { tEl = document.createElement("div"); tEl.className = "toast"; tEl.setAttribute("role", "status"); document.body.append(tEl); }
    tEl.textContent = msg; tEl.classList.add("on");
    clearTimeout(tTimer); tTimer = setTimeout(() => tEl.classList.remove("on"), 2200);
  };

  // ----- wheel picker (always in a bottom sheet) -----
  // cols: [{ label, opts: [{v, t}], value }]. Resolves with the chosen values, or null if dismissed.
  K.wheel = ({ id = "wheel", title, cols, done = "Done", extra = "" }) => new Promise((resolve) => {
    let result = null;
    const s = K.sheet({
      id, title,
      body: `<div class="wheel" style="grid-template-columns:${cols.map((c) => (c.w || 1) + "fr").join(" ")}">${cols.map((c, i) =>
        `<div class="col" tabindex="0" role="listbox" aria-label="${K.esc(c.label)}" data-i="${i}">${c.opts.map((o, j) =>
          `<div class="opt" role="option" data-j="${j}">${K.esc(o.t)}</div>`).join("")}</div>`).join("")}</div>${extra}`,
      foot: `<button class="btn block" type="button" data-done>${K.esc(done)}</button>`,
      onClose: () => resolve(result),
    });
    const colEls = [...s.el.querySelectorAll(".col")];
    const idx = cols.map((c) => Math.max(0, c.opts.findIndex((o) => String(o.v) === String(c.value))));
    const rowH = () => colEls[0].querySelector(".opt").offsetHeight || 40;
    const mark = (ci) => {
      colEls[ci].querySelectorAll(".opt").forEach((o, j) => { const on = j === idx[ci]; o.classList.toggle("on", on); o.setAttribute("aria-selected", on); });
    };
    colEls.forEach((col, ci) => {
      requestAnimationFrame(() => { col.scrollTop = idx[ci] * rowH(); mark(ci); });
      let t;
      col.addEventListener("scroll", () => {
        const j = Math.round(col.scrollTop / rowH());
        if (j !== idx[ci] && cols[ci].opts[j]) { idx[ci] = j; mark(ci); }
        clearTimeout(t); t = setTimeout(() => cols[ci].onChange && cols[ci].onChange(cols[ci].opts[idx[ci]].v), 120);
      }, { passive: true });
      col.addEventListener("click", (e) => { const o = e.target.closest(".opt"); if (o) col.scrollTo({ top: +o.dataset.j * rowH(), behavior: "smooth" }); });
      col.addEventListener("keydown", (e) => {
        const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const j = Math.min(cols[ci].opts.length - 1, Math.max(0, idx[ci] + step));
        col.scrollTo({ top: j * rowH() });
      });
    });
    s.el.querySelector("[data-done]").addEventListener("click", () => { result = idx.map((j, ci) => cols[ci].opts[j].v); s.close(); });
    s.el.wheelResult = (r) => { result = r; s.close(); };
  });

  // ----- confetti (brand colours; skipped for reduced motion) -----
  K.confetti = (ms = 2600) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = document.createElement("canvas"); c.className = "confetti"; document.body.append(c);
    const x = c.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1);
    const W = (c.width = innerWidth * dpr), H = (c.height = innerHeight * dpr);
    const cols = ["#004ef7", "#ff7ac6", "#ff4d0d", "#ffd11a", "#ffffff"];
    const ps = Array.from({ length: 140 }, () => ({
      x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 18 * dpr, vy: (-Math.random() * 16 - 6) * dpr,
      s: (6 + Math.random() * 7) * dpr, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[(Math.random() * cols.length) | 0], round: Math.random() < .3,
    }));
    const t0 = performance.now();
    (function f(t) {
      const k = (t - t0) / ms;
      x.clearRect(0, 0, W, H);
      ps.forEach((p) => {
        p.vy += .45 * dpr; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        x.save(); x.globalAlpha = Math.max(0, 1 - Math.max(0, k - .7) / .3); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c;
        if (p.round) { x.beginPath(); x.arc(0, 0, p.s / 2, 0, 7); x.fill(); } else x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        x.restore();
      });
      if (k < 1) requestAnimationFrame(f); else c.remove();
    })(t0);
  };

  // ----- dates -----
  K.locale = navigator.language || "en-GB";
  K.monthFirst = /^en-(US|PH|CA)$/i.test(K.locale) || K.locale === "en";
  // Calendar dates ("2026-12-05" or a date column serialised as midnight UTC) format as that day everywhere.
  K.fmtDate = (iso, opts) => {
    try {
      const s = String(iso), day = /^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z)?$/.test(s);
      return new Date(day ? s.slice(0, 10) + "T12:00:00" : s).toLocaleDateString(K.locale, opts || { day: "numeric", month: "long", year: "numeric" });
    } catch { return iso; }
  };
  K.fmtTime = (iso, tz) => { try { return new Date(iso).toLocaleTimeString(K.locale, { hour: "numeric", minute: "2-digit", timeZone: tz || undefined }); } catch { return ""; } };
  K.fmtWhen = (iso, tz) => { try { return new Date(iso).toLocaleString(K.locale, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: tz || undefined }); } catch { return ""; } };
  // Deadline with its zone, e.g. "Fri 4 Dec, 18:00 GMT+5:30" / "Fri 4 Dec, 7:30 am EST". tz omitted = the viewer's own zone.
  K.fmtWhenZ = (iso, tz) => { try { return new Date(iso).toLocaleString(K.locale, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: tz || undefined, timeZoneName: "short" }); } catch { return K.fmtWhen(iso, tz); } };
  // "India Standard Time", "British Summer Time"… falls back to the city ("Europe/London" → "London").
  K.tzLabel = (tz) => {
    try {
      const long = new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "long" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value;
      return long && !/^GMT/.test(long) ? long : tz.split("/").pop().replace(/_/g, " ");
    } catch { return tz; }
  };
  K.initials = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
})();
