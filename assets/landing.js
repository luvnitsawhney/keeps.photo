// Landing: live price + founding spots, currency switch, checkout (Razorpay; PayPal as an optional fallback).
(function () {
  const DEFAULT = {
    tier: "founding", founding_left: null, founding_total: 10,
    prices: { founding: { USD: 99, GBP: 79, EUR: 89 }, standard: { USD: 129, GBP: 99, EUR: 119 } },
  };
  let cfg = DEFAULT;
  let currency = K.guessCurrency();
  const status = K.$("#pay-status");
  const say = (t, err) => { status.textContent = t || ""; status.className = "status" + (err ? " err" : ""); };

  function render() {
    const now = cfg.prices[cfg.tier][currency];
    const was = cfg.prices.standard[currency];
    const founding = cfg.tier === "founding";
    K.$$("[data-price]").forEach((e) => (e.textContent = K.money(currency, now)));
    K.$$("[data-was]").forEach((e) => { e.textContent = K.money(currency, was); e.hidden = !founding; });
    K.$$("[data-was-plain]").forEach((e) => (e.textContent = K.money(currency, was)));
    K.$$("[data-cur]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cur === currency)));
    K.$$("[data-founding]").forEach((e) => (e.hidden = !founding));
  }

  K.$$("[data-cur]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.cur === currency) return;
    currency = b.dataset.cur;
    K.track("currency_changed", { currency });
    render();
    if (ppOpen) mountPayPal();   // PayPal's script is tied to one currency
  }));

  const load = (src, attr) => new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    if (attr) s.dataset[attr] = "1";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Couldn't load checkout. Please refresh."));
    document.head.appendChild(s);
  });
  const goToOrder = (t) => (location.href = `order.html?t=${encodeURIComponent(t)}&new=1`);
  const cancelled = "Checkout closed. Your spot isn't reserved until payment goes through.";

  // ---- Razorpay (main) ----
  async function payCard(btn) {
    if (K.demo) return (location.href = "order.html?demo=1");   // localhost preview: skip real checkout
    K.track("checkout_started", { provider: "razorpay", currency, tier: cfg.tier });
    try { K.ads && K.ads.begin({ value: cfg.prices[cfg.tier][currency], currency }); } catch {}   // Google Ads: begin checkout
    btn.disabled = true;
    say("");
    try {
      if (!window.Razorpay) await load("https://checkout.razorpay.com/v1/checkout.js");
      const o = await K.api("/checkout/create", { currency, ph: K.phId && K.phId() });   // joins this visit to the order
      const rzp = new window.Razorpay({
        key: o.key, order_id: o.order_id, amount: o.amount, currency: o.currency,
        name: "Keeps", description: "Your celebration film",
        image: new URL("assets/brand/keeps-checkout.png", location.href).href,   // otherwise Razorpay shows the account's logo
        theme: { color: "#004EF7" },
        // Card security checks (3-D Secure) open a popup, which in-app browsers like WhatsApp's block.
        // Redirect mode sends the result to our server instead, which forwards the buyer to their order page.
        redirect: true, callback_url: K.apiUrl ? K.apiUrl("/checkout/return") : K.cfg.api + "/checkout/return",
        handler: async (resp) => {
          say("Confirming your payment…");
          try { goToOrder((await K.api("/checkout/verify", resp)).owner_token); }
          catch (e) { say(`${e.message} If you were charged, email ${K.cfg.contactEmail} and we'll sort it out.`, true); }
        },
        modal: { ondismiss: () => { K.track("checkout_dismissed", { currency }); btn.disabled = false; if (!status.textContent) say(cancelled); } },
      });
      // Never show Razorpay's raw gateway text (it can be internal jargon). Say what happened and what to do.
      rzp.on("payment.failed", (r) => {
        const e = r?.error || {};
        K.track("checkout_failed", { reason: e.reason || null, source: e.source || null, step: e.step || null, code: e.code || null });
        say(e.source === "customer" || e.reason === "payment_cancelled"
          ? "Payment cancelled. You haven't been charged."
          : "That card didn't go through, and you haven't been charged. Please try a different card.", true);
      });
      rzp.open();
      K.track("checkout_opened", { currency, tier: cfg.tier });
    } catch (e) {
      say(e.message, true);
      btn.disabled = false;
    }
  }

  // ---- PayPal (optional fallback, loaded only if the buyer asks for it) ----
  let ppOpen = false, sdkCurrency = null;
  async function mountPayPal() {
    const box = K.$("#pp-box");
    box.hidden = false;
    box.innerHTML = "";
    try {
      if (!window.paypal || sdkCurrency !== currency) {
        K.$$("script[data-pp]").forEach((s) => s.remove());
        delete window.paypal;
        await load(`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(cfg.paypal_client_id)}&currency=${currency}&intent=capture&components=buttons&disable-funding=card,paylater,venmo`, "pp");
        sdkCurrency = currency;
      }
      await window.paypal.Buttons({
        style: { layout: "vertical", shape: "rect", color: "gold", label: "paypal", height: 48 },
        createOrder: async () => (await K.api("/paypal/create", { currency })).id,
        onApprove: async (data) => {
          say("Confirming your payment…");
          goToOrder((await K.api("/paypal/capture", { paypal_order_id: data.orderID })).owner_token);
        },
        onCancel: () => say(cancelled),
        onError: (e) => say(e?.message || "Payment didn't go through. Please try again.", true),
      }).render(box);
    } catch (e) {
      say(e.message, true);
    }
  }

  function mountPay() {
    const box = K.$("#pay");
    if (!cfg.razorpay_key_id && !cfg.paypal_client_id) {
      box.innerHTML = `<button class="btn ink block" type="button" disabled>Checkout opens soon</button>`;
      return;
    }
    box.innerHTML = (cfg.razorpay_key_id
      ? `<button class="btn primary block" type="button" id="pay-card"><span>Pay <span data-price>${K.money(currency, cfg.prices[cfg.tier][currency])}</span> by card</span> <span class="arrow" aria-hidden="true">→</span></button>`
      : "") +
      (cfg.paypal_client_id
        ? (cfg.razorpay_key_id ? `<button class="pp-link" type="button" id="pp-open">Prefer PayPal?</button>` : "") + `<div id="pp-box" hidden></div>`
        : "");
    K.$("#pay-card")?.addEventListener("click", (e) => payCard(e.currentTarget));
    const open = () => { ppOpen = true; K.$("#pp-open")?.remove(); mountPayPal(); };
    K.$("#pp-open")?.addEventListener("click", open);
    if (cfg.paypal_client_id && !cfg.razorpay_key_id) open();
  }

  // Back from a redirected checkout that didn't complete.
  const back = new URLSearchParams(location.search).get("pay");
  if (back) say(back === "failed"
    ? "Payment didn't go through, so you haven't been charged. Please try again."
    : `We couldn't confirm your payment. If you were charged, email ${K.cfg.contactEmail} and we'll sort it out.`, true);

  (async () => {
    try {
      if (!K.demo && K.cfg.api) cfg = await K.api("/config");
      if (K.demo) cfg = { ...cfg, razorpay_key_id: "demo" };
      if (cfg.suggested_currency) currency = cfg.suggested_currency;
    } catch { /* keep defaults; checkout shows as unavailable */ }
    render();
    mountPay();
  })();
})();

// Funnel step: the pricing card actually came into view (not just the page loaded).
(function () {
  const el = document.getElementById("pricing"); if (!el || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { K.track("pricing_viewed", {}); io.disconnect(); } }, { threshold: 0.4 });
  io.observe(el);
})();

// Occasion links (hero pills, "Who it's for" cards): which use cases people want to read more about.
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-occ]");
  if (a) K.track("occasion_clicked", { occasion: a.dataset.occ, from: a.dataset.from || null });
});

// Occasions dropdown in the top nav (homepage and occasion pages).
(function () {
  // Occasions dropdown (same nav on every page): tap or keyboard to open, Escape or a click outside to close.
  const dd = document.querySelector(".occ-dd"), ddBtn = dd && dd.querySelector(".occ-btn");
  if (dd && ddBtn) {
    const items = [...dd.querySelectorAll(".occ-menu a")];
    const setDd = (open, focus) => {
      dd.classList.toggle("open", open); ddBtn.setAttribute("aria-expanded", String(open));
      if (open && focus) items[0].focus();
    };
    ddBtn.addEventListener("click", () => setDd(!dd.classList.contains("open")));
    ddBtn.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") { e.preventDefault(); setDd(true, true); } });
    dd.addEventListener("keydown", (e) => {
      const i = items.indexOf(document.activeElement);
      if (e.key === "Escape") { setDd(false); ddBtn.focus(); }
      else if (e.key === "ArrowDown" && i > -1) { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === "ArrowUp" && i > -1) { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    });
    dd.addEventListener("focusout", (e) => { if (!dd.contains(e.relatedTarget)) setDd(false); });
    document.addEventListener("click", (e) => { if (!dd.contains(e.target)) setDd(false); });
  }
})();
