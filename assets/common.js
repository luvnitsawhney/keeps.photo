// Shared helpers for every Keeps page.
document.documentElement.classList.add("js");

const K = (window.K = {});
K.cfg = window.KEEPS_CONFIG;
K.local = /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[\w-]+\.local)$/.test(location.hostname);   // this Mac, or a phone on the same Wi-Fi
// Demo mode renders sample data for layout checks. Only on localhost; it never touches the API.
K.demo = K.local && new URLSearchParams(location.search).has("demo");

K.$ = (s, r = document) => r.querySelector(s);
K.$$ = (s, r = document) => [...r.querySelectorAll(s)];
K.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Product analytics event (no-op when PostHog isn't configured). Never pass names, emails or tokens.
// Analytics helpers (no-ops when PostHog is off). identify() uses the order id only.
K.phId = () => { try { return window.posthog && window.posthog.get_distinct_id ? window.posthog.get_distinct_id() : null; } catch { return null; } };
K.identify = (id, props) => { try { window.posthog && window.posthog.identify && window.posthog.identify(id, props || {}); } catch {} };
K.register = (props) => { try { window.posthog && window.posthog.register && window.posthog.register(props); } catch {} };
K.track = (event, props) => { try { window.posthog && window.posthog.capture && window.posthog.capture(event, props || {}); } catch {} };
// The API runs next to the database (us-east-1). Without this, Supabase runs it near the visitor,
// and every database query crosses the world: the order page took 2+ seconds from India.
K.apiUrl = (path) => K.cfg.api + path + (path.includes("?") ? "&" : "?") + "forceFunctionRegion=us-east-1";
K.api = async (path, body) => {
  const r = await fetch(K.apiUrl(path), body === undefined ? {} : {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Something went wrong. Please try again.");
  return j;
};

K.symbol = { USD: "$", GBP: "£", EUR: "€" };
K.money = (cur, n) => `${K.symbol[cur] ?? ""}${Number(n).toLocaleString("en", { maximumFractionDigits: 0 })}`;
K.size = (b) => b > 1e9 ? (b / 1e9).toFixed(1) + " GB" : b > 1e6 ? (b / 1e6).toFixed(0) + " MB" : Math.max(1, Math.round(b / 1e3)) + " KB";
K.tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; } };

// Currency guess from the browser's time zone (no third-party lookup).
K.guessCurrency = () => {
  const z = K.tz();
  if (z === "Europe/London" || z === "Europe/Belfast" || z === "Europe/Guernsey" || z === "Europe/Jersey" || z === "Europe/Isle_of_Man") return "GBP";
  if (z.startsWith("Europe/") && !/Moscow|Istanbul|Kiev|Kyiv|Minsk|Zurich|Oslo/.test(z)) return "EUR";
  return "USD";
};

K.when = (iso, tz) => {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true,
      timeZone: tz || undefined, timeZoneName: "short",
    }).format(new Date(iso));
  } catch { return new Date(iso).toLocaleString(); }
};
K.until = (iso) => {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return "closed";
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
};

// Reveal-on-scroll, content visible by default without JS.
addEventListener("DOMContentLoaded", () => {
  const els = K.$$(".rise");
  const showAll = () => els.forEach((e) => e.classList.add("in"));
  if (!("IntersectionObserver" in window)) showAll();
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))), { rootMargin: "0px 0px -8% 0px" });
    els.forEach((e) => io.observe(e));
    // Never leave content hidden if the observer stalls (background tab, old engine).
    setTimeout(() => els.forEach((e) => e.getBoundingClientRect().top < innerHeight && e.classList.add("in")), 1200);
    addEventListener("beforeprint", showAll);
  }
  K.$$("[data-contact]").forEach((a) => { a.href = "mailto:" + K.cfg.contactEmail; if (!a.textContent.trim()) a.textContent = K.cfg.contactEmail; });
  if (K.demo) document.body.insertAdjacentHTML("afterbegin", '<div class="demo-banner">Demo data — localhost preview only</div>');
});
