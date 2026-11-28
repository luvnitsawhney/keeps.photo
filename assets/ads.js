// Google Tag Manager + Google Ads conversions, with Consent Mode v2.
//  - Loads only on public pages (landing, policies) and on conv.html. Never on order, upload, find or founder pages:
//    their URLs carry private links (?t=, ?f=), and Google must never see those.
//  - UK, EEA and Swiss visitors: ad cookies are off until they tap Accept on a small banner.
//    Everyone else: on by default, per Consent Mode. Their choice is remembered on this device.
//  - K.ads.begin() on the pay button, K.ads.purchase() from conv.html after payment.
//    Each pushes a dataLayer event (for GTM triggers) and, when an Ads ID + label is set in config.js,
//    a direct gtag conversion as well.
(function () {
  const c = (window.KEEPS_CONFIG && window.KEEPS_CONFIG.ads) || {};
  const off = !c.gtm || /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[\w-]+\.local)$/.test(location.hostname);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  const REGULATED = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO","GB","CH"];
  const KEY = "keeps-ad-consent";
  let saved = null; try { saved = localStorage.getItem(KEY); } catch {}
  const granted = { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted", analytics_storage: "granted" };
  const denied = { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" };

  // Defaults must come before GTM loads.
  gtag("consent", "default", { ...denied, region: REGULATED, wait_for_update: 500 });
  gtag("consent", "default", granted);
  if (saved === "granted") gtag("consent", "update", granted);
  if (saved === "denied") gtag("consent", "update", denied);
  gtag("set", "ads_data_redaction", saved !== "granted");
  gtag("set", "url_passthrough", false);

  if (!off) {
    gtag("js", new Date());
    dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const s = document.createElement("script");
    s.async = true; s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(c.gtm)}`;
    document.head.appendChild(s);
    if (c.aw) {   // Google Ads tag, so gtag conversions work even if the GTM container has no Ads tag yet
      const g = document.createElement("script");
      g.async = true; g.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(c.aw)}`;
      document.head.appendChild(g);
      gtag("config", c.aw);
    }
  }

  // ---- consent banner: only where the law needs it (by time zone: Europe), only until they choose ----
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } })();
  const needsAsk = !off && !saved && /^Europe\//.test(tz) && !/conv\.html$/.test(location.pathname);
  function choose(v) {
    try { localStorage.setItem(KEY, v); } catch {}
    gtag("consent", "update", v === "granted" ? granted : denied);
    gtag("set", "ads_data_redaction", v !== "granted");
    document.getElementById("keeps-consent")?.remove();
  }
  function banner() {
    const b = document.createElement("div");
    b.id = "keeps-consent"; b.setAttribute("role", "region"); b.setAttribute("aria-label", "Cookie choice");
    b.innerHTML = `<p>We use Google cookies to see which ads bring people to Keeps. <a href="privacy.html">Privacy</a></p>
      <div><button type="button" data-v="denied">Decline</button><button type="button" data-v="granted" class="yes">Accept</button></div>`;
    const st = document.createElement("style");
    st.textContent = `#keeps-consent{position:fixed;z-index:9999;left:16px;right:16px;bottom:16px;max-width:30rem;margin:0 auto;padding:16px;border-radius:20px;
      background:#fff;color:#0b0b0c;box-shadow:0 8px 32px rgba(11,11,12,.18);font:15px/1.4 "Helvetica Neue",Helvetica,Arial,sans-serif;display:grid;gap:12px}
      #keeps-consent a{color:#002a8c;font-weight:600}#keeps-consent div{display:flex;gap:8px}
      #keeps-consent button{flex:1;height:44px;border:0;border-radius:999px;font:600 15px/1 inherit;font-family:inherit;cursor:pointer;background:#edf2fd;color:#0b0b0c}
      #keeps-consent button.yes{background:#004ef7;color:#fff}`;
    b.prepend(st);
    b.addEventListener("click", (e) => { const v = e.target.closest("button")?.dataset.v; if (v) choose(v); });
    document.body.appendChild(b);
  }
  if (needsAsk) (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", banner) : banner());

  // ---- conversions ----
  const send = (label, params) => { if (c.aw && label) gtag("event", "conversion", { send_to: `${c.aw}/${label}`, ...params }); };
  window.K = window.K || {};
  K.ads = {
    // Pay button tapped.
    begin({ value, currency }) {
      dataLayer.push({ event: "begin_checkout", ecommerce: { value, currency, items: [{ item_name: "Keeps film", price: value, quantity: 1 }] } });
      send(c.beginLabel, { value, currency });
    },
    // Payment captured. transaction_id = Razorpay payment id, so Google counts each sale once.
    // email (optional) turns on enhanced conversions: Google hashes it in the browser before sending.
    purchase({ value, currency, transaction_id, email }) {
      dataLayer.push({ ecommerce: null });
      dataLayer.push({ event: "purchase", ecommerce: { transaction_id, value, currency, items: [{ item_name: "Keeps film", price: value, quantity: 1 }] } });
      if (email && c.aw) gtag("set", "user_data", { email });
      send(c.purchaseLabel, { value, currency, transaction_id });
    },
  };
})();
