// PostHog product analytics. Uses only the public project key from config.js.
// Privacy rules (these keep the privacy policy true and need no cookie banner):
//  - private links never leave the browser: ?t= (organiser) and ?f= (family) are stripped from every URL
//  - nothing is stored on the device (memory persistence: no cookies, no localStorage)
//  - on private pages (order, family upload, find) no autocapture of text and no session replay
//  - session replay elsewhere masks every input
//  - the organiser is identified by order id only (never email or name), so their visits join up across days
//  - JavaScript errors are captured, so we see where pages break for people
// Off on localhost and when no key is set.
(function () {
  const c = window.KEEPS_CONFIG && window.KEEPS_CONFIG.posthog;
  if (!c || !c.key || /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[\w-]+\.local)$/.test(location.hostname)) return;

  // Official PostHog loader stub (queues calls until the library arrives).
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags on onFeatureFlags onSessionId identify setPersonProperties group resetGroups reset get_distinct_id get_session_id alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  const PRIVATE = /\/(order|wishes|find)(\.html)?$/.test(location.pathname);
  const SECRET_PARAMS = ["t", "f", "rate"];
  const clean = (v) => {
    if (typeof v !== "string" || v.indexOf("?") < 0) return v;
    try { const u = new URL(v, location.origin); SECRET_PARAMS.forEach((k) => u.searchParams.delete(k)); return u.toString(); }
    catch { return v.split("?")[0]; }
  };
  const scrub = (obj) => {
    if (!obj) return;
    for (const k in obj) if (/url|referrer|href/i.test(k)) obj[k] = clean(obj[k]);
  };

  window.posthog.init(c.key, {
    api_host: c.host || "https://us.i.posthog.com",
    defaults: "2025-05-24",
    persistence: "memory",
    person_profiles: "identified_only",
    autocapture: !PRIVATE,
    disable_session_recording: PRIVATE,
    session_recording: { maskAllInputs: true },
    capture_exceptions: true,
    before_send: (e) => {
      if (!e) return e;
      scrub(e.properties); scrub(e.$set); scrub(e.$set_once);
      if (e.properties && e.properties.$elements) e.properties.$elements.forEach(scrub);
      return e;
    },
  });
  window.posthog.register({ page_kind: PRIVATE ? location.pathname.replace(/\W|html/g, "") : "marketing" });

  // Every video play on any page (example films, the delivered film, guests watching).
  document.addEventListener("play", (e) => {
    const v = e.target; if (!(v instanceof HTMLVideoElement)) return;
    if (v.dataset.tracked) return; v.dataset.tracked = "1";
    window.posthog.capture("video_played", { video: v.id || (v.currentSrc || "").split("?")[0].split("/").pop().slice(0, 60) || "video" });
  }, true);
})();
