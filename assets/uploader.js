// Resumable uploader: each file asks keeps-api for a signed upload token,
// then streams straight to Supabase Storage over TUS in 6 MB chunks, so a
// dropped connection resumes instead of restarting.
//
// K.uploader({ input?, drop?, list, auth: {t} | {f}, contributor: () => name, extra?: {…}, onDone, onStart, onProgress(sent, total, left) })
// Without an input the page stages files itself and calls .add(files) when the person taps Send.
(function () {
  const ACCEPT = "image/*,video/*,audio/*,.heic,.heif,.mov,.mp4,.m4v";
  K.UPLOAD_ACCEPT = ACCEPT;
  // The resumable-upload library loads on first use, not with the page.
  let tusP = null;
  const loadTus = () => tusP ||= new Promise((ok, no) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tus-js-client@4.1.0/dist/tus.min.js";
    s.onload = ok; s.onerror = () => { tusP = null; no(new Error("Couldn't start the upload. Check your connection and try again.")); };
    document.head.append(s);
  });

  K.uploader = function ({ input, drop, list, auth, contributor, nameOptional, extra, onDone, onStart, onProgress }) {
    if (input) { input.accept = ACCEPT; input.multiple = true; }
    let active = 0;
    const queue = [], MAX = 2;
    const pump = () => { while (active < MAX && queue.length) queue.shift()(); };
    // Overall progress across this batch, for one clear bar. Resets once everything has finished.
    const prog = new Map();
    const report = () => {
      if (!onProgress) return;
      let a = 0, b = 0, left = 0;
      prog.forEach((x) => { a += x.a; b += x.b; if (!x.end) left++; });
      onProgress(a, b, left);
      if (!left) prog.clear();
    };

    const pick = (files) => {
      const name = contributor ? contributor() : null;
      if (contributor && !name && !nameOptional) return false;
      [...files].forEach((f) => { const r = row(f); prog.set(r, { a: 0, b: f.size, end: false }); queue.push(() => send(f, name, r)); });
      report();
      pump();
      return true;
    };
    if (input) input.addEventListener("change", () => { if (pick(input.files)) input.value = ""; });
    if (drop) {
      ["dragenter", "dragover"].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add("over"); }));
      ["dragleave", "drop"].forEach((e) => drop.addEventListener(e, () => drop.classList.remove("over")));
      drop.addEventListener("drop", (ev) => { ev.preventDefault(); pick(ev.dataTransfer.files); });
    }

    function row(file) {
      const li = document.createElement("li");
      li.innerHTML = `<span class="nm">${K.esc(file.name)}</span><span class="st">Waiting…</span>
        <span class="meta">${K.size(file.size)}</span><span></span><span class="bar2"><i></i></span>`;
      list.prepend(li);
      const rr = {
        set: (txt, cls) => { const s = li.querySelector(".st"); s.textContent = txt; s.className = "st " + (cls || ""); },
        pct: (p) => { li.querySelector(".bar2 i").style.transform = `scaleX(${p / 100})`; const x = prog.get(rr); if (x) { x.a = x.b * p / 100; report(); } },
      };
      return rr;
    }

    async function send(file, name, r) {
      active++; onStart && onStart(active);
      try {
        if (K.demo) { // fake progress for layout checks
          for (let p = 0; p <= 100; p += 20) { r.pct(p); r.set(p + "%"); await new Promise((s) => setTimeout(s, 120)); }
          r.set("Sent ✓", "ok"); onDone && onDone({ demo: true, name: file.name, size: file.size, contributor: name });
          return;
        }
        if (!window.tus) await loadTus();
        const sig = await K.api("/upload/sign", { ...auth, ...(extra || {}), contributor: name, filename: file.name, size: file.size, type: file.type });
        await new Promise((resolve, reject) => {
          const headers = { "x-signature": sig.token, "x-upsert": "false" };
          if (K.cfg.publishableKey) headers.apikey = K.cfg.publishableKey;
          const up = new tus.Upload(file, {
            endpoint: K.cfg.tus,
            retryDelays: [0, 2000, 5000, 10000, 20000, 30000, 60000],
            headers,
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            chunkSize: 6 * 1024 * 1024,
            metadata: { bucketName: sig.bucket, objectName: sig.path, contentType: file.type || "application/octet-stream", cacheControl: "3600" },
            onProgress: (a, b) => { const p = Math.floor((a / b) * 100); r.pct(p); r.set(p + "%"); },
            onError: reject,
            onSuccess: resolve,
          });
          up.findPreviousUploads().then((prev) => { if (prev.length) up.resumeFromPreviousUpload(prev[0]); up.start(); });
        });
        const done = await K.api("/upload/done", { ...auth, upload_id: sig.upload_id });
        r.pct(100);
        r.set(done.late ? "Sent (after close)" : "Sent ✓", "ok");
        onDone && onDone({ name: file.name, size: file.size, contributor: name });
      } catch (e) {
        K.track && K.track("upload_failed", { via: auth.t ? "organiser" : "guest", size_mb: Math.round(file.size / 1e6), type: (file.type || "").split("/")[0] || "unknown", message: String(e.message || e).slice(0, 120) });
        r.set(e.message?.length < 90 ? e.message : "Failed — try again", "err");
      } finally {
        active--; const x = prog.get(r); if (x) { x.end = true; x.a = x.b; } report(); onStart && onStart(active);
        pump();
      }
    }

    // Warn before leaving mid-upload.
    addEventListener("beforeunload", (e) => { if (active > 0 || queue.length) { e.preventDefault(); e.returnValue = ""; } });
    return { add: pick, busy: () => active > 0 || queue.length > 0 };
  };
})();
