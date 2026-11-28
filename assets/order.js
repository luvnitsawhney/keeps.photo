// Organiser's private page. One context per state, one set of step screens:
//   setup      → 3 steps (who it's for · style · invite), then the invite link. Style comes before the invite so the film is shaped before anyone is asked.
//   collecting → share the invite, see what's arrived, add files for someone, edit details (same step screens, in a sheet)
//   making     → "ready by", details locked
//   delivered  → watch, cast, download, remake, share with people who asked, rate
(function () {
  const qs = new URLSearchParams(location.search);
  const t = qs.get("t");
  const tz = K.tz();
  const app = K.$("#app");
  const I = K.icon;
  let order = null, state = null, step = 0, draft = {};

  // ---------- catalogues ----------
  const OCCASIONS = [
    ["Birthday", "Birthday", '<path d="M4 21h16M5 21v-6.5A2.5 2.5 0 0 1 7.5 12h9a2.5 2.5 0 0 1 2.5 2.5V21"/><path d="M5 16.5c1.4 1 2.8 1 4.2 0s2.8-1 4.2 0 2.8 1 4.2 0M12 12V8.5"/><path d="M12 3.5c1.2 1.2 1.2 2.6 0 3.5-1.2-.9-1.2-2.3 0-3.5z"/>'],
    ["Wedding anniversary", "Anniversary", '<circle cx="9" cy="14" r="5"/><circle cx="15" cy="14" r="5"/><path d="M9.5 4.5 12 7l2.5-2.5"/>'],
    ["Wedding", "Wedding", '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>'],
    ["Retirement", "Retirement", '<path d="M3 17h18M6.5 17a5.5 5.5 0 0 1 11 0M12 5.5V7.5M5.9 8.9l1.4 1.4M18.1 8.9l-1.4 1.4M6 20.5h12"/>'],
    ["Graduation", "Graduation", '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c3.2 2.3 7.8 2.3 11 0V11M21.5 9v5.5"/>'],
    ["Farewell", "Farewell", '<path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z"/>'],
    ["Memorial", "Memorial", '<path d="M8.5 21h7M10 21V11h4v10M12 11V9"/><path d="M12 3c1.6 1.7 1.6 3.6 0 4.8-1.6-1.2-1.6-3.1 0-4.8z"/>'],
    ["Something else", "Something else", '<path d="M12 3.5l1.9 5.3 5.3 1.9-5.3 1.9L12 18l-1.9-5.4L4.8 10.7l5.3-1.9z"/>'],
  ];
  const occ = (v) => OCCASIONS.find(([k]) => k === v) || null;
  const occIcon = (v) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${(occ(v) || OCCASIONS[7])[2]}</svg>`;
  const occLabel = (v) => (occ(v) ? occ(v)[1] : v || "");
  const EMOJI = { Birthday: "🎂", "Wedding anniversary": "💍", Wedding: "💍", Retirement: "🌅", Graduation: "🎓", Farewell: "👋", Memorial: "🕊️" };
  const occEmoji = (v) => EMOJI[v] || "🎉";

  const FEELINGS = ["Warm", "Celebratory", "Heartfelt", "Funny", "Nostalgic", "Playful", "Reflective", "Elegant", "Romantic", "Energetic", "Inspiring"];
  // Style library. Swatches stand in until each style has a sample frame. Grows without layout changes.
  const STYLES = [
    { v: "Surprise me", d: "We pick what fits", icon: "sparkle" },
    { v: "Keepsake", d: "Quiet and warm", img: "assets/films/elegant.jpg" },
    { v: "Postcard", d: "Stamps and notes", img: "assets/films/postcard.jpg" },
    { v: "Gallery", d: "Bold titles, depth", img: "assets/films/gallery.jpg" },
    { v: "Rose gold", n: "Rose Gold", d: "Blush balloons, sparkle", img: "assets/styles/rose-gold.jpg" },
    { v: "Gold", n: "Golden Hour", d: "Disco ball, streamers", img: "assets/styles/gold.jpg" },
    { v: "Silver", n: "Silver Stars", d: "Star balloons, crisp", img: "assets/styles/silver.jpg" },
    { v: "Streaming premiere", n: "Big Premiere", d: "Opens like their own series", img: "assets/styles/premiere.jpg" },
    { v: "Watercolour", d: "Painted, soft edges", img: "assets/styles/watercolour.jpg" },
    { v: "Retro", n: "Throwback", d: "Polaroids, sepia, dust", img: "assets/styles/retro.jpg" },
    { v: "Modern", d: "Bold type, clean cuts", img: "assets/styles/modern.jpg" },
    { v: "Digi-cam", n: "Party Cam", d: "2000s camera screen", img: "assets/styles/digicam.jpg" },
    { v: "Paper cut-out", n: "Paper Cut-out", d: "Torn-paper collage", img: "assets/styles/paper-cutout.jpg" },
    { v: "Floral", n: "Garden Bloom", d: "A wall of flowers", img: "assets/styles/floral.jpg" },
  ];
  // n: the name buyers see (matches the occasion pages); v: the stored value, unchanged so old orders still match.
  const styleName = (v) => STYLES.find((s) => s.v === v)?.n || v;
  // Each occasion's own looks come first (the same ones its page on keeps.photo shows); the rest follow in library order.
  const OCC_STYLES = {
    Birthday: ["Gold", "Silver", "Retro", "Streaming premiere", "Digi-cam", "Watercolour"],
    "Wedding anniversary": ["Rose gold", "Floral", "Keepsake", "Paper cut-out", "Gold", "Silver"],
    Farewell: ["Modern", "Streaming premiere", "Paper cut-out", "Keepsake", "Gold", "Silver"],
    Retirement: ["Keepsake", "Gold", "Modern", "Paper cut-out", "Streaming premiere", "Silver"],
  };
  OCC_STYLES.Wedding = OCC_STYLES["Wedding anniversary"];
  const stylesFor = (occasion) => {
    const pick = OCC_STYLES[occasion] || [], rank = (s) => (s.v === "Surprise me" ? -1 : pick.includes(s.v) ? pick.indexOf(s.v) : pick.length);
    return [...STYLES].sort((a, b) => rank(a) - rank(b));
  };
  const PEEK = 6;
  const STEPS = [
    { key: "who", label: "Who it's for", title: "Who's the film for?", lead: "Everyone you invite sees this." },
    { key: "style", label: "Style", title: "How should it feel?", lead: "Pick a look and a mood. You can change these until uploads close." },
    { key: "invite", label: "Invite", title: "Create your invite", lead: "One link collects every wish for you." },
  ];

  // ---------- demo data (localhost only) ----------
  const later = new Date(Date.now() + 2 * 864e5 + 3 * 36e5);
  later.setMinutes(0, 0, 0);
  const DEMO = { id: "demo", amount: 99, currency: "USD", tier: "founding", buyer_name: "Priya Shah", buyer_email: "priya@example.com",
    honoree: "", occasion: "", tone: "Warm", cutoff_at: null, closed_at: null, open: true, orientation: "landscape",
    family_url: location.origin + "/wishes.html?demo=1", uploads: [], delivery: null };
  const filled = { honoree: "Mum", occasion: "Birthday", event_date: new Date(Date.now() + 4 * 864e5).toISOString().slice(0, 10), cutoff_at: later.toISOString(), cutoff_tz: tz,
    family_message: "Mum turns 60 on Saturday! Send a short video wish and a photo you love.", title_text: "Happy 60th, Mum", end_text: "",
    brief_saved_at: later.toISOString(), cover_url: "assets/films/ph-cover.jpg",
    uploads: [{ contributor: "Aunt Rita", filename: "IMG_2041.MOV", size_bytes: 8e7 }, { contributor: "Aunt Rita", filename: "beach.jpg", size_bytes: 3e6 },
              { contributor: "Sam", filename: "us.jpg", size_bytes: 2e6 }, { contributor: "Grandpa", filename: "wish.mp4", size_bytes: 4e7 },
              ...["Leo", "Maya", "Uncle Dev", "Nisha", "Tom"].map((n, i) => ({ contributor: n, filename: i % 2 ? "photo.jpg" : "wish.mov", size_bytes: 1e7 }))]
      .map((u, i) => ({ ...u, completed_at: new Date(Date.now() - (9 - i) * 5.3 * 36e5).toISOString() })) };
  const dq = qs.get("demo");
  if (dq === "collecting") Object.assign(DEMO, filled, qs.get("empty") ? { uploads: [] } : {});
  if (dq === "closed") Object.assign(DEMO, filled, { open: false, closed_at: new Date().toISOString(), brief: "Loves her garden and terrible puns.", theme: "Keepsake" });
  if (dq === "delivered") Object.assign(DEMO, filled, { open: false, closed_at: new Date().toISOString(),
    delivery: { watch: "assets/films/hero.mp4", master: "assets/films/hero.mp4", share: "assets/films/hero.mp4", purge_after: new Date(Date.now() + 30 * 864e5).toISOString(), downloaded: false },
    family_film: { asked: ["Aunt Rita", "Sam", "Leo", "Grandpa"], shared_at: null } });

  // ---------- helpers ----------
  const firstName = (n) => String(n || "").trim().split(/\s+/)[0] || "";
  const whose = (o) => (o.honoree ? `${o.honoree}'s film` : "Your film");
  const isVideo = (f) => /\.(mov|mp4|m4v|3gp|avi|mkv|webm|mts|m2ts|hevc)$/i.test(f || "");
  const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  const cutTz = (o) => o.cutoff_tz || tz;
  const DAY = { day: "numeric", month: "short", year: "numeric" };   // always show the year: Jan 31, 2027 is next year
  const readyBy = (o) => new Date(new Date(o.closed_at || o.cutoff_at).getTime() + 36e5);
  const busy = (b, on) => { if (!b) return; b.classList.toggle("is-loading", on); b.disabled = on; };
  const err = (id, msg) => { const e = K.$("#" + id); if (!e) return; e.textContent = msg || ""; e.closest(".field")?.classList.toggle("invalid", !!msg); };
  const save = async (body) => (K.demo ? { ...order, ...body, brief_saved_at: new Date().toISOString(), cutoff_tz: tz } : K.api("/order/brief", { t, ...body }));
  const cutKey = "keeps-cutoff-" + (t || "demo");

  function fromOrder(o) {
    draft = {
      honoree: o.honoree || "", occasion: o.occasion || "", event_date: String(o.event_date || "").slice(0, 10),   // API sends a full timestamp for a date column
      buyer_name: o.buyer_name || "", buyer_email: o.buyer_email || "", buyer_phone: o.buyer_phone || "",
      family_message: o.family_message || "", orientation: o.orientation || "landscape",
      cutoff_at: o.cutoff_at || null, tone: o.tone || "Warm", theme: o.theme || "Surprise me",
      brief: o.brief || "", must_include: o.must_include || "", title_text: o.title_text || "", end_text: o.end_text || "",
    };
    try { const c = sessionStorage.getItem(cutKey); if (!o.cutoff_at && c && new Date(c) > Date.now() + 10 * 6e4) draft.cutoff_at = c; } catch {}
  }
  function payload(withCutoff) {
    const b = { ...draft, buyer_email: draft.buyer_email || order.buyer_email, cutoff_tz: tz };
    if (!withCutoff || !order.open) delete b.cutoff_at;
    return b;
  }

  // ======================================================================
  // Step screens (shared by setup and edit)
  // ======================================================================
  function whoHTML() {
    const d = draft;
    return `<div class="card profile">
      <label class="pf-photo" id="pf-photo">
        <input type="file" accept="image/*" id="cover-file" class="sr" aria-describedby="cover-st">
        ${order.cover_url ? `<img src="${K.esc(order.cover_url)}" alt="">` : ""}
        <span class="ph" ${order.cover_url ? "hidden" : ""}>${I("camera")}<b>Add their photo</b><span>A clear one of their face works best</span></span>
        <span class="pf-edit" ${order.cover_url ? "" : "hidden"}>${I("camera")}Change</span>
      </label>
      <div class="pf-body">
        <label class="sr" for="honoree">Their name</label>
        <input class="pf-name" id="honoree" value="${K.esc(d.honoree)}" placeholder="Their name" maxlength="120" autocomplete="off" enterkeyhint="done">
        <p class="msg-err" id="honoree-err" role="alert"></p>
        <p class="t-body" id="cover-st">The name everyone knows them by, like Mum or Margaret.</p>
      </div>
      <div class="pf-rows">
        <div class="field" id="occ-field"><button type="button" class="li pf-row" id="pick-occ" aria-haspopup="dialog">${occRow()}</button>
          <p class="msg-err" id="occ-err" role="alert"></p></div>
        <button type="button" class="li pf-row" id="pick-date" aria-haspopup="dialog">${dateRow()}</button>
      </div>
    </div>`;
  }
  const occRow = () => `<span class="av s40">${draft.occasion ? occIcon(draft.occasion) : I("sparkle")}</span>
    <span class="txt"><span class="dsc">Occasion</span><span class="ttl${draft.occasion ? "" : " ph"}">${draft.occasion ? K.esc(occLabel(draft.occasion)) : "Choose the occasion"}</span></span>${I("chev", "chev")}`;
  const dateRow = () => `<span class="av s40">${I("calendar")}</span>
    <span class="txt"><span class="dsc">Celebration day <span class="optional">· Optional</span></span><span class="ttl${draft.event_date ? "" : " ph"}">${draft.event_date ? K.esc(K.fmtDate(draft.event_date, { weekday: "short", ...DAY })) : "Add the date"}</span></span>${I("chev", "chev")}`;

  function inviteHTML() {
    const d = draft, who = d.honoree || "them";
    return `<div class="card how">
      <ul class="ticks">
        <li>${I("link")}<span><b>Share one link</b> in your group chats.</span></li>
        <li>${I("video")}<span><b>Everyone adds a video wish and photos</b> from their phone. No app, no sign-up.</span></li>
        <li>${I("check")}<span><b>It all lands here for the film.</b> No chasing people or forwarding files.</span></li>
      </ul>
    </div>
    <div class="card">
      <div class="field"><label for="buyer_name">Your name</label>
        <input id="buyer_name" value="${K.esc(d.buyer_name)}" autocomplete="name" maxlength="120" placeholder="e.g. Priya">
        <p class="help">Shown on the invite, so people know it's from you.</p>
        <p class="msg-err" id="buyer_name-err" role="alert"></p></div>
      ${order.buyer_email ? "" : `<div class="field"><label for="buyer_email">Your email</label>
        <input id="buyer_email" type="email" value="${K.esc(d.buyer_email)}" autocomplete="email" inputmode="email">
        <p class="help">We send the finished film here.</p><p class="msg-err" id="buyer_email-err" role="alert"></p></div>`}
      <div class="field"><label for="family_message">A note from you <span class="optional">· Optional</span></label>
        <textarea id="family_message" maxlength="600" style="min-height:5.5rem" placeholder="e.g. ${K.esc(notePh(who, d.occasion))}">${K.esc(d.family_message)}</textarea>
        <p class="help">A line from you gets more people to send something.</p></div>
    </div>
    <div class="card">
      <div class="stack-s"><h2 class="t-body-title" id="shape-l">How should people film their message?</h2>
        <p class="t-body" id="shape-note">${shapeNote(d.orientation)}</p></div>
      <div class="list" role="radiogroup" aria-labelledby="shape-l">
        ${[["landscape", "Landscape", "Phone sideways. Best on a TV or projector at the party.", "land"],
           ["portrait", "Portrait", "Phone upright. Best for phones, Reels and WhatsApp Status.", "port"]].map(([v, ttl, dsc, c]) =>
          `<label class="li"><input type="radio" name="orientation" value="${v}" ${d.orientation === v ? "checked" : ""}>
            <span class="shape-ill"><i class="${c}"></i></span><span class="txt"><span class="ttl">${ttl}</span><span class="dsc">${dsc}</span></span><span class="radio"></span></label>`).join("")}
      </div>
    </div>
    <div class="card">
      <div class="field"><span class="lbl" id="cut-l">Last day to send wishes</span>
        <button type="button" class="picker-field" id="pick-cutoff" aria-labelledby="cut-l cut-v" aria-haspopup="dialog">
          <span id="cut-v" class="${d.cutoff_at ? "" : "ph"}">${d.cutoff_at ? K.esc(K.fmtWhen(d.cutoff_at)) : "Choose a day and time"}</span>${I("calendar")}</button>
        <p class="msg-err" id="cutoff-err" role="alert"></p>
        <p class="help" id="cut-help">${cutHelp()}</p></div>
    </div>`;
  }
  // Short and specific: who, what for, what to send.
  const notePh = (who, o) => {
    const n = who === "them" ? "them" : who;
    if (o === "Memorial") return `Record a short memory of ${n}. Add photos too.`;
    const what = o && o !== "Something else" ? (occ(o) ? occLabel(o).toLowerCase() : o.toLowerCase()) : "";
    return `Record a short video for ${n === "them" ? "the big day" : what ? `${n}'s ${what}` : n}. Add photos too!`;
  };
  // The stakes of the deadline, in plain words: the link stops, we edit, and you want time for a remake.
  const cutHelp = () => (draft.cutoff_at
    ? `After this the link stops taking uploads and we start editing. Your film is ready by about ${K.esc(K.fmtWhen(new Date(new Date(draft.cutoff_at).getTime() + 36e5)))}.`
    : "After this the link stops taking uploads and we start editing. Your film is ready about an hour later.") +
    ` Two days before the celebration leaves time to watch it and ask for changes. Times are in ${K.esc(K.tzLabel(tz))}.`;
  const shapeNote = (v) => `We'll ask everyone to film this way, and your finished film will be ${v === "portrait" ? "portrait" : "landscape"} too.`;

  function styleTile(s) {
    const sw = s.img ? `<img src="${K.esc(s.img)}" alt="" loading="lazy" decoding="async">` : s.icon ? I(s.icon) : "";
    return `<label class="st-tile"><input type="radio" name="theme" value="${K.esc(s.v)}" ${draft.theme === s.v ? "checked" : ""}>
      <span class="sw" style="${s.sw ? "--sw:" + s.sw : ""}">${sw}</span><b>${K.esc(s.n || s.v)}</b><small>${K.esc(s.d)}</small></label>`;
  }
  const styleList = () => { const all = stylesFor(draft.occasion); return STYLES.some((s) => s.v === draft.theme) ? all : [{ v: draft.theme, d: "Your earlier pick", icon: "star" }, ...all]; };
  function styleCardHTML() {
    const list = styleList(), chosen = list.findIndex((s) => s.v === draft.theme);
    const peek = chosen >= PEEK ? [...list.slice(0, PEEK - 1), list[chosen]] : list.slice(0, PEEK);   // the pick is always visible
    return `<div class="card" id="style-card">
      <div class="card-link"><h2 class="t-body-title" id="sty-l">Style</h2><span class="t-body">${list.length} styles</span></div>
      <div class="styles" role="radiogroup" aria-labelledby="sty-l">${peek.map(styleTile).join("")}</div>
      ${list.length > PEEK ? `<button class="btn neutral md block" type="button" id="all-styles">See all ${list.length} styles</button>` : ""}
    </div>`;
  }
  function styleHTML() {
    const d = draft;
    return `<div class="card">
      <div class="stack-s"><h2 class="t-body-title" id="feel-l">Feeling</h2><p class="t-body">Sets the music and the pace.</p></div>
      <div class="chips" role="radiogroup" aria-labelledby="feel-l">${FEELINGS.map((f) =>
        `<label class="chip"><input type="radio" name="tone" value="${f}" ${d.tone === f ? "checked" : ""}><span>${f}</span></label>`).join("")}</div>
    </div>
    ${styleCardHTML()}
    <div class="card">
      <div class="stack-s"><h2 class="t-body-title">Opening and closing words</h2><p class="t-body">The first and last thing everyone reads. Leave blank and we'll write them.</p></div>
      <div class="field"><label for="title_text">Opening title <span class="optional">· Optional</span></label>
        <input id="title_text" maxlength="80" value="${K.esc(d.title_text)}" placeholder="e.g. ${K.esc(titlePh())}"></div>
      <div class="field"><label for="end_text">Closing line <span class="optional">· Optional</span></label>
        <input id="end_text" maxlength="140" value="${K.esc(d.end_text)}" placeholder="e.g. We love you. From all of us."></div>
    </div>
    <div class="card">
      <div class="field"><label for="brief">About them <span class="optional">· Optional</span></label>
        <textarea id="brief" maxlength="4000" placeholder="Who they are, what they love, what you want people to feel.">${K.esc(d.brief)}</textarea></div>
      <div class="field"><label for="must_include">Must-include moments <span class="optional">· Optional</span></label>
        <textarea id="must_include" maxlength="2000" style="min-height:5.5rem" placeholder="e.g. the 1986 wedding photo, Dad's toast, end with the grandkids">${K.esc(d.must_include)}</textarea></div>
    </div>`;
  }
  const titlePh = () => { const n = draft.honoree || "Mum";
    return { Birthday: `Happy birthday, ${n}`, "Wedding anniversary": `Happy anniversary, ${n}`, Retirement: `Happy retirement, ${n}`, Graduation: `Congratulations, ${n}`,
      Farewell: `We'll miss you, ${n}`, Memorial: `Remembering ${n}`, Wedding: `${n}, congratulations` }[draft.occasion] || `For ${n}, with love`; };
  const STEP_HTML = { who: whoHTML, invite: inviteHTML, style: styleHTML };

  // Wire whatever step is on screen. Inputs write straight into the draft.
  function wireRadios(root) {
    root.querySelectorAll('input[type="radio"]:not([name="occ-pick"])').forEach((el) => el.addEventListener("change", () => {
      draft[el.name] = el.value;
      if (el.name === "orientation") K.$("#shape-note").textContent = shapeNote(el.value);
    }));
  }
  function wireStep(key, root) {
    root.querySelectorAll("input[id], textarea[id]").forEach((el) => {
      if (el.type === "file" || el.type === "radio") return;
      el.addEventListener("input", () => { draft[el.id] = el.value; err(el.id + "-err", ""); });
    });
    wireRadios(root);
    if (key === "who") {
      K.$("#cover-file", root).addEventListener("change", onCover);
      K.$("#pick-occ", root).addEventListener("click", pickOccasion);
      K.$("#pick-date", root).addEventListener("click", pickEventDate);
      K.$("#honoree", root).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } });
    }
    if (key === "invite") K.$("#pick-cutoff", root).addEventListener("click", pickCutoff);
    if (key === "style") K.$("#all-styles", root)?.addEventListener("click", allStyles);
  }

  function validate(key) {
    const d = draft;
    if (key === "who") {
      if (!d.honoree.trim()) { err("honoree-err", "Add their name, so people know who the film is for."); K.$("#honoree")?.focus(); K.track("setup_validation_error", { step: key, field: "honoree" }); return false; }
      if (!d.occasion.trim()) { err("occ-err", "Choose what you're celebrating."); K.$("#pick-occ")?.focus(); K.track("setup_validation_error", { step: key, field: "occasion" }); return false; }
    }
    if (key === "invite") {
      let ok = true;
      if (!d.buyer_name.trim()) { err("buyer_name-err", "Add your name, so people know who's asking."); ok = false; }
      if (!order.buyer_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.buyer_email)) { err("buyer_email-err", "Add the email we should send the film to."); ok = false; }
      if (!d.cutoff_at) { err("cutoff-err", "Choose the last day to send wishes."); ok = false; }
      else if (new Date(d.cutoff_at) < Date.now() + 10 * 6e4) { err("cutoff-err", "Pick a time at least 10 minutes from now."); ok = false; }
      if (!ok) { K.$(".field.invalid input, .field.invalid textarea, .field.invalid button")?.focus();
        K.track("setup_validation_error", { step: key, field: [...document.querySelectorAll(".field.invalid")].map((f) => f.querySelector("[id]")?.id).filter(Boolean).join(",") }); }
      return ok;
    }
    return true;
  }

  // ---------- pickers ----------
  function pickOccasion() {
    const custom = draft.occasion && !occ(draft.occasion) ? draft.occasion : "";
    const sel = custom ? "Something else" : draft.occasion;
    const s = K.sheet({ id: "occ-sheet", title: "What are you celebrating?",
      body: `<div class="list" role="radiogroup" aria-label="Occasion">${OCCASIONS.map(([v, label, svg]) =>
        `<label class="li"><input type="radio" name="occ-pick" value="${K.esc(v)}" ${sel === v ? "checked" : ""}>
          <span class="av s40"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${svg}</svg></span>
          <span class="txt"><span class="ttl">${K.esc(label)}</span></span><span class="radio"></span></label>`).join("")}</div>
        <div class="field" id="occ-other" ${sel === "Something else" ? "" : "hidden"}><label for="occ-text">What's the occasion?</label>
          <input id="occ-text" maxlength="60" value="${K.esc(custom)}" placeholder="e.g. Promotion, new baby, 25 years at work" enterkeyhint="done">
          <p class="msg-err" id="occ-text-err" role="alert"></p>
          <button class="btn md" type="button" id="occ-done" style="justify-self:start">Done</button></div>` });
    const set = (v) => { draft.occasion = v; err("occ-err", ""); const b = K.$("#pick-occ"); if (b) { b.innerHTML = occRow(); } return b; };
    const other = K.$("#occ-other"), txt = K.$("#occ-text");
    const finish = () => {
      const v = txt.value.trim();
      if (!v) return err("occ-text-err", "Tell us what you're celebrating.");
      const b = set(v); s.close(); b?.focus();
    };
    K.$("#occ-done").addEventListener("click", finish);
    txt.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); finish(); } });
    s.body.querySelectorAll('input[name="occ-pick"]').forEach((r) => r.addEventListener("change", () => {
      if (r.value === "Something else") { other.hidden = false; txt.focus(); other.scrollIntoView({ block: "nearest" }); return; }
      other.hidden = true;
      const b = set(r.value);
      setTimeout(() => { s.close(); b?.focus(); }, 160);
    }));
  }

  const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(K.locale, { month: "long" }));
  async function pickEventDate() {
    const now = new Date(), base = draft.event_date ? new Date(draft.event_date + "T12:00:00") : now;
    const D = { label: "Day", opts: Array.from({ length: 31 }, (_, i) => ({ v: i + 1, t: String(i + 1) })), value: base.getDate() };
    const M = { label: "Month", opts: MONTHS.map((m, i) => ({ v: i, t: m })), value: base.getMonth(), w: 1.8 };
    const Y = { label: "Year", opts: Array.from({ length: 4 }, (_, i) => ({ v: now.getFullYear() - 1 + i, t: String(now.getFullYear() - 1 + i) })), value: base.getFullYear() };
    const p = K.wheel({ id: "date-sheet", title: "Celebration day", cols: K.monthFirst ? [M, D, Y] : [D, M, Y],
      extra: draft.event_date ? `<button class="btn tertiary md" type="button" id="clear-date">Remove date</button>` : "" });
    K.$("#clear-date")?.addEventListener("click", () => K.$("#date-sheet").wheelResult("clear"));
    const r = await p;
    const b = K.$("#pick-date");
    if (r === "clear") draft.event_date = "";
    else if (r) {
      const [day, mon, yr] = K.monthFirst ? [r[1], r[0], r[2]] : r;
      const dt = new Date(yr, mon, Math.min(day, new Date(yr, mon + 1, 0).getDate()), 12);
      draft.event_date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    }
    if (b) { b.innerHTML = dateRow(); b.focus(); }
  }

  async function pickCutoff() {
    const btn = K.$("#pick-cutoff"); btn.setAttribute("aria-expanded", "true");
    const now = new Date();
    // Suggest 6 pm two days before the celebration (time to watch it and ask for a remake), else 6 pm in two days.
    let base = draft.cutoff_at ? new Date(draft.cutoff_at) : null;
    if (!base) {
      base = draft.event_date ? new Date(draft.event_date + "T18:00:00") : new Date(now.getTime() + 2 * 864e5);
      if (draft.event_date) base.setDate(base.getDate() - 2);
      base.setHours(18, 0, 0, 0);
      if (base < now.getTime() + 36e5) { base = new Date(now.getTime() + 2 * 864e5); base.setHours(18, 0, 0, 0); }
    }
    const day0 = new Date(now); day0.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 90 }, (_, i) => {
      const d = new Date(day0); d.setDate(d.getDate() + i);
      return { v: i, t: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString(K.locale, { weekday: "short", day: "numeric", month: "short" }) };
    });
    const baseDay = Math.max(0, Math.round((new Date(base).setHours(0, 0, 0, 0) - day0) / 864e5));
    const mins = [0, 15, 30, 45], m = mins.reduce((a, b) => (Math.abs(b - base.getMinutes()) < Math.abs(a - base.getMinutes()) ? b : a));
    const r = await K.wheel({ id: "cut-sheet", title: "Uploads close", cols: [
      { label: "Day", opts: days, value: Math.min(89, baseDay), w: 2.2 },
      { label: "Hour", opts: Array.from({ length: 12 }, (_, i) => ({ v: i + 1, t: String(i + 1) })), value: base.getHours() % 12 || 12 },
      { label: "Minutes", opts: mins.map((x) => ({ v: x, t: String(x).padStart(2, "0") })), value: m },
      { label: "AM or PM", opts: [{ v: "am", t: "am" }, { v: "pm", t: "pm" }], value: base.getHours() >= 12 ? "pm" : "am" },
    ], extra: `<p class="t-body">Wishes can be sent until this time. ${K.esc(K.tzLabel(tz))}.</p>` });
    btn.setAttribute("aria-expanded", "false"); btn.focus();
    if (!r) return;
    const d = new Date(day0); d.setDate(d.getDate() + r[0]);
    d.setHours((r[1] % 12) + (r[3] === "pm" ? 12 : 0), r[2], 0, 0);
    draft.cutoff_at = d.toISOString();
    try { sessionStorage.setItem(cutKey, draft.cutoff_at); } catch {}
    K.$("#cut-v").textContent = K.fmtWhen(draft.cutoff_at); K.$("#cut-v").className = "";
    K.$("#cut-help").innerHTML = cutHelp();
    err("cutoff-err", d < Date.now() + 10 * 6e4 ? "Pick a time at least 10 minutes from now." : "");
  }

  function allStyles() {
    const s = K.sheet({ id: "styles-sheet", full: true, title: "Choose a style", sub: "Every style works with any feeling.",
      body: `<div class="styles all" role="radiogroup" aria-label="Style">${styleList().map(styleTile).join("")}</div>`,
      foot: `<button class="btn block" type="button" data-close>Use this style</button>` });
    s.body.querySelectorAll('input[name="theme"]').forEach((r) => r.addEventListener("change", () => { draft.theme = r.value; }));
    s.el.addEventListener("close", () => {
      const card = K.$("#style-card"); if (!card) return;
      card.outerHTML = styleCardHTML();
      const nc = K.$("#style-card");
      wireRadios(nc);
      K.$("#all-styles", nc)?.addEventListener("click", allStyles);
      K.$("#all-styles", nc)?.focus();
    }, { once: true });
  }

  // ---------- cover photo ----------
  async function shrinkPhoto(file) {
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
      return blob ? new File([blob], "cover.jpg", { type: "image/jpeg" }) : file;
    } catch { return file; }
  }
  async function onCover(ev) {
    let file = ev.target.files[0]; if (!file) return;
    const box = K.$("#pf-photo"), st = K.$("#cover-st");
    file = await shrinkPhoto(file);
    let img = box.querySelector("img"); if (!img) { img = document.createElement("img"); img.alt = ""; box.prepend(img); }
    img.src = URL.createObjectURL(file);
    box.querySelector(".ph").hidden = true; box.querySelector(".pf-edit").hidden = false;
    if (K.demo) { order.cover_url = img.src; return; }
    box.classList.add("busy"); st.textContent = "Saving photo…";
    try {
      const sig = await K.api("/order/cover/sign", { t, type: file.type, size: file.size });
      const r = await fetch(sig.url, { method: "PUT", headers: { "content-type": file.type }, body: file });
      if (!r.ok) throw new Error("The photo didn't upload. Try again.");
      const next = await K.api("/order/cover/done", { t, path: sig.path });
      order.cover_url = next.cover_url;
      K.track("cover_photo_added", {});
      st.textContent = "The name everyone knows them by, like Mum or Margaret.";
    } catch (e) { st.textContent = e.message; K.track("cover_photo_failed", { message: String(e.message).slice(0, 120) }); }
    finally { box.classList.remove("busy"); }
  }

  // ======================================================================
  // Setup (3 steps). Back lives top-left, where people expect it.
  // ======================================================================
  const backBtn = K.$("#nav-back");
  backBtn.innerHTML = I("back");
  backBtn.addEventListener("click", () => (step > 0 && history.state?.step ? history.back() : showSetup(Math.max(0, step - 1), false)));
  addEventListener("popstate", (e) => { if (state === "setup") showSetup(e.state?.step ?? 0, false); });

  function showSetup(i, push = true) {
    step = i;
    const s = STEPS[i], last = i === STEPS.length - 1;
    if (push && i > 0) history.pushState({ step: i }, "");
    backBtn.hidden = i === 0; K.$("#nav-logo").hidden = i !== 0;
    app.innerHTML = `
      <ol class="steps" aria-label="Setup progress">${STEPS.map((x, n) =>
        `<li class="${n < i ? "done" : n === i ? "now" : ""}" ${n === i ? 'aria-current="step"' : ""}><span>${x.label}</span></li>`).join("")}</ol>
      <div class="page-head"><h1 class="t-screen" tabindex="-1">${s.title}</h1><p class="t-lead">${s.lead}</p></div>
      ${STEP_HTML[s.key]()}
      <p class="msg-err" id="save-err" role="alert"></p>
      <div class="dock">
        <button class="btn block" type="button" id="next">${last ? "Create invite link" : "Continue"}</button>
      </div>`;
    wireStep(s.key, app);
    K.track("setup_step_viewed", { step: s.key, index: i + 1 });
    K.$("#next").addEventListener("click", () => next(false));
    scrollTo({ top: 0 });
    if (push !== null) K.$(".page-head h1").focus({ preventScroll: true });
  }

  async function next(skip) {
    const key = STEPS[step].key;
    if (!validate(key)) return;
    const b = K.$(skip ? "#skip" : "#next");
    err("save-err", "");
    const last = step === STEPS.length - 1;
    busy(b, true);
    try {
      // Save as we go, so a reload never loses work. The cut-off goes in last: it's what publishes the link.
      const saved = await save(payload(last));
      order = saved;
      K.track("setup_step_completed", { step: key, index: step + 1, ...(key === "who" ? { occasion: occ(draft.occasion) ? draft.occasion : "custom", has_photo: !!order.cover_url, has_date: !!draft.event_date }
        : key === "style" ? { theme: draft.theme, tone: draft.tone, has_title: !!draft.title_text, has_end: !!draft.end_text, has_story: !!(draft.brief || draft.must_include) }
        : { orientation: draft.orientation, has_note: !!draft.family_message, hours_to_close: Math.round((new Date(draft.cutoff_at) - Date.now()) / 36e5) }) });
      if (!last) { busy(b, false); return showSetup(step + 1); }
      try { sessionStorage.removeItem(cutKey); } catch {}
      if (K.demo) Object.assign(order, { cutoff_at: draft.cutoff_at, uploads: order.uploads || [] });
      K.track("family_link_created", { occasion: draft.occasion, orientation: draft.orientation, theme: draft.theme });
      history.replaceState(null, "", location.pathname + location.search);
      render(order);
      openShare(true);
    } catch (e) { busy(b, false); err("save-err", e.message); K.track("setup_save_failed", { step: key, message: String(e.message).slice(0, 120) }); }
  }

  // Thank-you moment straight after checkout. Once only; confetti respects reduced motion.
  function thankYou() {
    const name = firstName(order.buyer_name);
    const s = K.sheet({ id: "thanks", label: "Payment received",
      body: `<div class="thanks"><span class="av accent">${I("check")}</span>
        <h2 class="t-display">${name ? `Thank you, ${K.esc(name)}!` : "Thank you!"}</h2>
        <p class="t-lead">Payment received. Three quick steps and your invite link is ready to share.</p></div>` });
    K.confetti();
    K.track("thank_you_seen", {});
    const timer = setTimeout(s.close, 3000);
    s.el.addEventListener("close", () => clearTimeout(timer), { once: true });
    const u = new URL(location.href); u.searchParams.delete("new"); history.replaceState(null, "", u);
  }

  // ======================================================================
  // Dashboard pieces
  // ======================================================================
  function heroHTML(o, badge, extra) {
    const pic = o.cover_url ? `<img src="${K.esc(o.cover_url)}" alt="">` : K.esc(K.initials(o.honoree));
    const sub = [occLabel(o.occasion), o.event_date && K.fmtDate(o.event_date, DAY)].filter(Boolean).join(" · ");
    return `<section class="card hero">
      <div class="hero-top"><span class="av s72">${pic}</span>
        <div class="who">${badge}<h1>${K.esc(o.honoree || "Someone special")}</h1>${sub ? `<p class="t-body">${K.esc(sub)}</p>` : ""}</div></div>
      ${extra}
    </section>`;
  }
  function byPerson(o) {
    const by = {};
    const seen = {};   // "john" and "John " are one person, shown as they first typed it
    o.uploads.forEach((u) => {
      const raw = String(u.contributor || "Someone").trim(), k = (seen[raw.toLowerCase()] ||= raw); (by[k] ||= { v: 0, p: 0, b: 0, at: 0 });
      isVideo(u.filename) ? by[k].v++ : by[k].p++; by[k].b += Number(u.size_bytes || 0);
      by[k].at = Math.max(by[k].at, +new Date(u.completed_at || 0));
    });
    return by;
  }
  const SHOW = 5;
  // When someone last sent: "Today, 14:05", "Yesterday, 09:10", or "Mon 23 Nov".
  function sentAt(ms) {
    const d = new Date(ms), day = (x) => new Date(x).setHours(0, 0, 0, 0), diff = Math.round((day(Date.now()) - day(d)) / 864e5);
    const time = d.toLocaleTimeString(K.locale, { hour: "numeric", minute: "2-digit" });
    return diff === 0 ? `Today, ${time}` : diff === 1 ? `Yesterday, ${time}` : d.toLocaleDateString(K.locale, { weekday: "short", day: "numeric", month: "short" });
  }
  function personRow(n, x) {
    const what = [x.v && plural(x.v, "video", "videos"), x.p && plural(x.p, "photo", "photos")].filter(Boolean).join(" · ");
    return `<div class="li"><span class="av s40">${K.esc(K.initials(n))}</span><span class="txt"><span class="ttl">${K.esc(n)}</span><span class="dsc">${what}</span></span>${x.at ? `<span class="t-body when">${K.esc(sentAt(x.at))}</span>` : ""}</div>`;
  }
  function receivedHTML(o, open) {
    const by = byPerson(o), names = Object.keys(by).reverse().sort((a, b) => by[b].at - by[a].at);   // newest first
    const more = names.length - SHOW;
    const body = names.length ? `<div class="list">${names.slice(0, SHOW).map((n) => personRow(n, by[n])).join("")}</div>
      ${more > 0 ? `<button class="btn neutral md block" type="button" id="all-people">See all ${names.length} people</button>` : ""}`
      : `<div class="empty"><span class="av s56">${I("users")}</span><p class="t-body-title">Nothing yet</p><p class="t-body">${open ? "Share the invite. Wishes show up here as they arrive." : "No files arrived before uploads closed."}</p></div>`;
    return `<section class="card" id="received"><div class="card-link"><h2 class="t-body-title">Received so far</h2>${names.length ? `<span class="t-body">${plural(names.length, "person", "people")}</span>` : ""}</div>${body}</section>`;
  }
  function allPeople() {
    K.track("people_list_opened", { people: Object.keys(byPerson(order)).length });
    const by = byPerson(order), names = Object.keys(by).reverse().sort((a, b) => by[b].at - by[a].at);
    K.sheet({ id: "people-sheet", full: true, title: `${plural(names.length, "person", "people")} sent wishes`,
      sub: `${plural(order.uploads.length, "photo or video", "photos and videos")} in all. Newest first.`,
      body: `<div class="list">${names.map((n) => personRow(n, by[n])).join("")}</div>` });
  }
  function wireReceived() { K.$("#all-people")?.addEventListener("click", allPeople); }
  function detailsHTML(o, locked) {
    const row = (key, av, ttl, dsc) => locked
      ? `<div class="li locked">${av}<span class="txt"><span class="ttl">${ttl}</span><span class="dsc">${K.esc(dsc)}</span></span></div>`
      : `<button class="li" type="button" data-edit="${key}">${av}<span class="txt"><span class="ttl">${ttl}</span><span class="dsc">${K.esc(dsc)}</span></span>${I("chev", "chev")}</button>`;
    const story = o.brief || o.must_include;
    return `<section><h2 class="t-group list-title">Film details</h2>
      <div class="list boxed">
        ${row("who", `<span class="av s40">${o.cover_url ? `<img src="${K.esc(o.cover_url)}" alt="">` : I("camera")}</span>`, "Who it's for",
            [o.honoree, occLabel(o.occasion), o.event_date && K.fmtDate(o.event_date, DAY)].filter(Boolean).join(" · "))}
        ${row("invite", `<span class="av s40">${I("clock")}</span>`, "Invite and last day",
            [locked ? "Uploads closed" : `Closes ${K.fmtWhen(o.cutoff_at, cutTz(o))}`, o.orientation === "portrait" ? "Portrait" : "Landscape"].join(" · "))}
        ${row("style", `<span class="av s40">${I("sparkle")}</span>`, "Style and words",
            [o.tone || "Warm", styleName(o.theme || "Surprise me"), story ? "Story added" : "No story yet"].join(" · "))}
      </div>
      ${locked ? `<p class="t-body lock-note">${I("lock", "s")}Locked while we make your film. Need a change? Email us.</p>` : ""}
    </section>`;
  }

  function renderCollecting(o) {
    const people = Object.keys(byPerson(o)).length;
    app.innerHTML = heroHTML(o, '<span class="badge live">Collecting wishes</span>', `
      <div class="kv" style="--n:3">
        <div><b id="left">${K.until(o.cutoff_at)}</b><span>until close</span></div>
        <div><b>${people}</b><span>${people === 1 ? "person" : "people"}</span></div>
        <div><b>${o.uploads.length}</b><span>${o.uploads.length === 1 ? "file" : "files"}</span></div>
      </div>
      <p class="closes">Uploads close <b>${K.esc(K.fmtWhen(o.cutoff_at, cutTz(o)))}</b>. Your film is ready by about ${K.esc(K.fmtTime(readyBy(o), cutTz(o)))}.</p>
      <div class="btn-stack">
        <button class="btn block" type="button" id="share">${I("share")}Share the invite</button>
        <button class="btn secondary block" type="button" id="add">${I("upload")}Upload for someone</button>
      </div>`) +
      receivedHTML(o, true) + detailsHTML(o, false) + `
      <section class="card"><div class="stack-s"><h2 class="t-body-title">Everyone sent theirs?</h2>
        <p class="t-body">You can stop uploads early and we'll start your film. Nobody can send anything after that.</p></div>
        <button class="btn secondary negative md" type="button" id="close" style="justify-self:start">Close uploads early</button></section>`;
    wireReceived();
    K.$("#share").addEventListener("click", () => openShare(false));
    K.$("#add").addEventListener("click", openAdd);
    K.$("#close").addEventListener("click", confirmClose);
    K.$$("[data-edit]").forEach((b) => b.addEventListener("click", () => openEdit(b.dataset.edit)));
  }

  function renderMaking(o) {
    const due = readyBy(o), people = Object.keys(byPerson(o)).length;
    app.innerHTML = heroHTML(o, '<span class="badge accent">Making your film</span>', `
      <div class="kv" style="--n:3">
        <div><b>${K.esc(K.fmtTime(due, cutTz(o)))}</b><span>ready by</span></div>
        <div><b>${people}</b><span>${people === 1 ? "person" : "people"}</span></div>
        <div><b>${o.uploads.length}</b><span>${o.uploads.length === 1 ? "file" : "files"}</span></div>
      </div>
      <p class="closes">We're making your film now. It appears on this page, and we'll email <b>${K.esc(o.buyer_email || "you")}</b> too.</p>`) +
      receivedHTML(o, false) + detailsHTML(o, true);
    wireReceived();
  }

  function renderDelivered(o) {
    const d = o.delivery, portrait = o.orientation === "portrait";
    const until = d.purge_after ? K.fmtDate(d.purge_after, { day: "numeric", month: "long" }) : null;
    app.innerHTML = `
      <div class="page-head"><span class="badge live" style="justify-self:start">Ready</span><h1 class="t-screen" tabindex="-1">${K.esc(whose(o))} is ready</h1></div>
      <section class="card">
        ${d.watch ? `<div class="player${portrait ? " portrait" : ""}"><video id="film" controls playsinline preload="metadata" x-webkit-airplay="allow" ${d.poster || o.cover_url ? `poster="${K.esc(d.poster || o.cover_url)}"` : ""} src="${K.esc(d.watch)}"></video>
          <button class="icon-btn ghost cast" type="button" id="cast" aria-label="Play on a TV" hidden>${I("cast")}</button></div>` : ""}
        <div class="btn-stack">
          ${d.master ? `<a class="btn block" href="${K.esc(d.master)}">${I("download")}Download your film</a>` : ""}
          ${d.share ? `<a class="btn secondary block" href="${K.esc(d.share)}">Smaller copy for WhatsApp</a>` : ""}
        </div>
        <p class="t-body cast-tip" id="cast-tip" hidden>${I("cast", "s")}Play it on a TV with AirPlay or Chromecast.</p>
      </section>
      <div class="alert warning">${I("warn")}<span>${d.downloaded ? "" : "<b>Save a copy now.</b> "}For everyone's privacy we delete the film and all uploads ${until ? "on " + K.esc(until) : "30 days after delivery"}.</span></div>
      ${familyFilmHTML(o)}
      ${remakeHTML(o)}
      ${feedbackHTML(o)}`;
    wireCast();
    K.track("film_page_viewed", { remake: !!o.remake, downloaded_before: !!d.downloaded });
    app.querySelectorAll('a.btn[href*="/download"]').forEach((a) => a.addEventListener("click", () => K.track("film_downloaded", { kind: /kind=master/.test(a.href) ? "master" : "share" })));
    K.$("#send-fam")?.addEventListener("click", confirmShareFilm);
    K.$("#remake")?.addEventListener("click", openRemake);
    wireFeedback();
  }

  // ---------- AirPlay (Safari) / Cast (Chrome) ----------
  function wireCast() {
    const v = K.$("#film"), b = K.$("#cast"); if (!v || !b) return;
    const show = () => { b.hidden = false; K.$("#cast-tip").hidden = false; };
    if (window.WebKitPlaybackTargetAvailabilityEvent) {
      v.addEventListener("webkitplaybacktargetavailabilitychanged", (e) => { if (e.availability === "available") show(); });
      b.addEventListener("click", () => { K.track("cast_clicked", { via: "airplay" }); v.webkitShowPlaybackTargetPicker(); });
    } else if (v.remote && v.remote.watchAvailability) {
      v.remote.watchAvailability((ok) => { if (ok) show(); }).catch(() => {});
      b.addEventListener("click", () => { K.track("cast_clicked", { via: "chromecast" }); v.remote.prompt().catch(() => {}); });
    }
    if (K.demo && qs.get("cast")) show();
  }

  // ---------- send the finished film to people who asked ----------
  function familyFilmHTML(o) {
    const asked = o.family_film?.asked || [];
    if (!asked.length) return "";
    const n = asked.length;
    if (o.family_film.shared_at) return `<section class="card"><div class="stack-s"><h2 class="t-body-title">Sent to ${plural(n, "person", "people")}</h2>
      <p class="t-body">They watch it on the invite link. Nobody gets your private page or downloads.</p></div></section>`;
    const names = asked.slice(0, 3).join(", ") + (n > 3 ? ` and ${n - 3} more` : "");
    return `<section class="card"><div class="stack-s"><h2 class="t-body-title">${plural(n, "person", "people")} asked for the film</h2>
      <p class="t-body">${K.esc(names)} left an email when they sent a wish. Send it when you're ready, after the party if it's a surprise.</p></div>
      <button class="btn secondary block" type="button" id="send-fam">Send the film to ${plural(n, "person", "people")}</button></section>`;
  }
  function confirmShareFilm() {
    const n = order.family_film.asked.length;
    const s = K.sheet({ id: "fam-sheet", title: `Send the film to ${plural(n, "person", "people")}?`,
      sub: "We'll email them a link to watch it. You can't undo this, so wait until after the party if it's a surprise.",
      foot: `<button class="btn block" type="button" id="fam-go">Send the film</button><button class="btn neutral block" type="button" data-close>Not yet</button><p class="msg-err" id="fam-err"></p>` });
    K.$("#fam-go").addEventListener("click", async (e) => {
      const b = e.currentTarget; busy(b, true);
      try {
        K.track("film_shared_with_family", { people: n });
        const nx = K.demo ? { ...order, family_film: { ...order.family_film, shared_at: new Date().toISOString() } } : await K.api("/order/share-family", { t });
        s.close(); render(nx); K.toast("Film sent");
      } catch (x) { busy(b, false); K.$("#fam-err").textContent = x.message; }
    });
  }

  // ---------- one free remake ----------
  function remakeHTML(o) {
    const r = o.remake;
    if (r?.delivered_at) return `<section class="card"><div class="stack-s"><h2 class="t-body-title">This is your remade film</h2>
      <p class="t-body">Still not right? <a href="mailto:${K.esc(K.cfg.contactEmail)}?subject=Refund">Email us</a> and we'll refund you in full.</p></div></section>`;
    if (r) return `<section class="card"><div class="stack-s"><span class="badge" style="justify-self:start">${I("redo", "s")}Remake requested</span>
      <h2 class="t-body-title">We're remaking your film</h2><p class="t-body">The new version appears here and we'll email you. You asked: “${K.esc(r.note)}”</p></div></section>`;
    return `<div class="list boxed"><button class="li" type="button" id="remake"><span class="av s40">${I("redo")}</span>
      <span class="txt"><span class="ttl">Not quite right?</span><span class="dsc">Request your one free remake</span></span>${I("chev", "chev")}</button></div>`;
  }
  function openRemake() {
    const s = K.sheet({ id: "remake-sheet", title: "What should we change?", sub: "Be specific. You get one free remake, usually back within a day.",
      body: `<div class="field"><label class="sr" for="remake-note">What to change</label>
        <textarea id="remake-note" maxlength="2000" placeholder="e.g. Start with the beach photo, cut Uncle Sam's second video, and make the music softer."></textarea>
        <p class="msg-err" id="remake-err" role="alert"></p></div>`,
      foot: `<button class="btn block" type="button" id="remake-go">Request remake</button>` });
    K.$("#remake-note").focus();
    K.$("#remake-go").addEventListener("click", async (e) => {
      const note = K.$("#remake-note").value.trim();
      if (note.length < 5) return err("remake-err", "Tell us what to change, so we get it right this time.");
      const b = e.currentTarget; busy(b, true);
      try {
        const nx = K.demo ? { ...order, remake: { requested_at: new Date().toISOString(), note } } : await K.api("/order/remake", { t, note });
        K.track("remake_requested", {});
        s.close(); render(nx); K.toast("Remake requested");
      } catch (x) { busy(b, false); err("remake-err", x.message); }
    });
  }

  // ---------- rating ----------
  function feedbackHTML(o) {
    if (o.feedback) return `<section class="card"><p class="t-body">You rated your film ${o.feedback.rating} out of 5. Thank you, it genuinely helps.</p></section>`;
    const pre = Number(qs.get("rate")) || 0;
    return `<section class="card" id="feedback"><h2 class="t-body-title">How did it land?</h2>
      <div class="field"><div class="stars" role="radiogroup" aria-label="Rating out of 5">${[1, 2, 3, 4, 5].map((n) =>
        `<label><input type="radio" name="rating" value="${n}" ${n === pre ? "checked" : ""}><span>${n}</span></label>`).join("")}</div>
        <div class="scale"><span>It missed</span><span>There were tears</span></div></div>
      <div class="field"><label for="fb-text">Anything you'd tell a friend? <span class="optional">· Optional</span></label><textarea id="fb-text" rows="3" maxlength="2000" style="min-height:5.5rem"></textarea></div>
      <label class="check"><input type="checkbox" id="fb-ok">You can quote this on keeps.photo with my first name</label>
      <p class="msg-err" id="fb-err" role="alert"></p>
      <button class="btn secondary block" type="button" id="fb-go">Send rating</button></section>`;
  }
  function wireFeedback() {
    const b = K.$("#fb-go"); if (!b) return;
    if (qs.get("rate")) setTimeout(() => K.$("#feedback").scrollIntoView({ block: "center" }), 300);
    b.addEventListener("click", async () => {
      const rating = Number((K.$('input[name="rating"]:checked') || {}).value);
      if (!rating) return (K.$("#fb-err").textContent = "Pick a number from 1 to 5.");
      busy(b, true);
      try {
        if (!K.demo) await K.api("/order/feedback", { t, rating, text: K.$("#fb-text").value, quote_ok: K.$("#fb-ok").checked });
        K.track("feedback_sent", { rating, has_text: !!K.$("#fb-text").value.trim(), quote_ok: K.$("#fb-ok").checked });
        K.$("#feedback").innerHTML = '<p class="t-body">Thank you. A person reads every answer.</p>';
      } catch (e) { busy(b, false); K.$("#fb-err").textContent = e.message; }
    });
  }

  // ======================================================================
  // Sheets used while collecting
  // ======================================================================
  function inviteText(o) {
    const shape = o.orientation === "portrait" ? "upright" : "sideways", who = o.honoree || "someone special";
    const what = o.occasion === "Memorial" ? `a tribute film for ${who}`
      : `a surprise film for ${who}'s ${(occLabel(o.occasion) || "celebration").toLowerCase().replace("something else", "celebration")}`;
    return `We're making ${what} ${occEmoji(o.occasion)}\n` +
      `Send a short video wish (phone ${shape}) and photos you love by ${K.fmtWhenZ(o.cutoff_at, cutTz(o))}. No app needed:\n${o.family_url}`;
  }
  // Keep a copy of the invite image on the server, so link previews (keeps.photo/i/…) can show it. Only when it changes.
  async function saveInviteImage(blob, o) {
    if (K.demo) return;
    const key = "keeps-inv-" + t, sig = [o.honoree, o.occasion, o.buyer_name, (o.cover_url || "").split("?")[0]].join("|");
    try { if (localStorage.getItem(key) === sig) return; } catch {}
    try {
      const { url } = await K.api("/order/invite-image/sign", { t });
      const r = await fetch(url, { method: "PUT", headers: { "content-type": "image/jpeg", "x-upsert": "true" }, body: blob });
      if (!r.ok) return;
      await K.api("/order/invite-image/done", { t });
      try { localStorage.setItem(key, sig); } catch {}
    } catch {}
  }
  async function openShare(fresh) {
    const o = order, msg = inviteText(o);
    K.track("share_sheet_opened", { fresh: !!fresh, can_share_files: !!(navigator.canShare) });
    K.sheet({ id: "share-sheet", title: fresh ? "Your invite link is ready" : "Share the invite",
      sub: "Send it to everyone you'd like in the film. Anyone with the link can add wishes until uploads close.",
      body: `<div class="invite-prev" id="inv-prev"></div><div class="msg-prev">${K.esc(msg)}</div>`,
      foot: `<button class="btn block" type="button" id="sh-native" hidden>${I("share")}Share invite</button>
        <a class="btn block" id="sh-wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">${I("whatsapp")}Send on WhatsApp</a>
        <div class="btn-pair"><button class="btn neutral md" type="button" id="sh-copy">${I("link")}Copy link</button>
        <button class="btn neutral md" type="button" id="sh-img" disabled>${I("download")}Save image</button></div>` });
    const nat = K.$("#sh-native"), wa = K.$("#sh-wa");
    if (navigator.share) { nat.hidden = false; wa.classList.add("secondary"); }   // one accent button: the image + text share
    wa.addEventListener("click", () => K.track("family_link_shared", { via: "whatsapp" }));
    K.$("#sh-copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(o.family_url); K.toast("Link copied"); } catch { prompt("Copy this link", o.family_url); }
      K.track("family_link_shared", { via: "copy" });
    });
    let file = null;
    try {
      const blob = await K.inviteCard({ honoree: o.honoree, occasion: occLabel(o.occasion), organiser: firstName(o.buyer_name), cover_url: o.cover_url });
      file = new File([blob], `invite-${(o.honoree || "keeps").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.jpg`, { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      saveInviteImage(blob, o);
      K.$("#inv-prev").innerHTML = `<img src="${url}" alt="Invite image: ${K.esc(firstName(o.buyer_name) || "We're")} collecting video wishes for ${K.esc(o.honoree || "them")}">`;
      const sv = K.$("#sh-img"); sv.disabled = false;
      sv.addEventListener("click", () => { const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); K.track("family_link_shared", { via: "image" }); });
    } catch { K.$("#inv-prev").hidden = true; K.$("#sh-img").hidden = true; }
    nat.addEventListener("click", async () => {
      const withImg = file && navigator.canShare && navigator.canShare({ files: [file] });
      try { await navigator.share(withImg ? { files: [file], text: msg } : { text: msg }); K.track("family_link_shared", { via: withImg ? "native_image" : "native" }); } catch {}
    });
  }

  // Add files on someone's behalf. Built once and reopened, so uploads carry on if the sheet is closed.
  let addSheet = null;
  function openAdd() {
    K.track("upload_for_someone_opened", {});
    if (addSheet) { addSheet.showModal(); return; }
    const s = K.sheet({ id: "add-sheet", title: "Add for someone",
      sub: "Got photos or a video message on WhatsApp? Save them to your phone, then add them here with the sender's name.",
      body: `<div class="field"><label for="from-name">Who is it from?</label>
          <input id="from-name" maxlength="60" placeholder="e.g. Grandpa" autocomplete="off">
          <p class="help">Leave blank if they're from you.</p></div>
        <label class="drop" id="drop"><input type="file" id="file" aria-label="Choose photos or videos">
          <span class="av s56 accent">${I("upload")}</span><b>Choose photos or videos</b>
          <span class="t-body">Originals are best, up to 10 GB each. Big videos pick up where they left off if the connection drops.</span></label>
        <ul class="files" id="list"></ul>`,
      foot: `<button class="btn neutral block" type="button" data-close>Done</button>` });
    addSheet = s.el;
    K.uploader({
      input: K.$("#file"), drop: K.$("#drop"), list: K.$("#list"), auth: { t },
      contributor: () => K.$("#from-name").value.trim() || null, nameOptional: true,
      onDone: async (u) => {
        if (K.demo) order.uploads.push({ contributor: u.contributor || order.buyer_name, filename: u.name, size_bytes: u.size, completed_at: new Date().toISOString() });
        else order = await K.api("/order?t=" + encodeURIComponent(t)).catch(() => order);
        if (state === "collecting") { const r = K.$("#received"); if (r) r.outerHTML = receivedHTML(order, true); wireReceived(); refreshCounts(); }
      },
    });
  }
  function refreshCounts() {
    const kv = K.$(".hero .kv"); if (!kv) return;
    const people = Object.keys(byPerson(order)).length;
    kv.children[1].innerHTML = `<b>${people}</b><span>${people === 1 ? "person" : "people"}</span>`;
    kv.children[2].innerHTML = `<b>${order.uploads.length}</b><span>${order.uploads.length === 1 ? "file" : "files"}</span>`;
  }

  // Error prevention before the one irreversible action.
  function confirmClose() {
    const n = order.uploads.length;
    K.track("close_uploads_viewed", { files: n });
    const s = K.sheet({ id: "close-sheet", title: "Close uploads early?",
      body: `<ul class="ticks">
          <li>${I("lock")}<span>Nobody can send photos or videos after this, and the film details lock. You can't reopen it.</span></li>
          <li>${I("clock")}<span>We start straight away. Your film is ready within the hour.</span></li>
          <li>${I("users")}<span>So far: ${plural(n, "file", "files")} from ${plural(Object.keys(byPerson(order)).length, "person", "people")}.</span></li>
        </ul>${n ? "" : `<div class="alert negative">${I("info")}<span>Add at least one photo or video first.</span></div>`}`,
      foot: `<button class="btn block" type="button" data-close>Keep collecting</button>
        <button class="btn secondary negative block" type="button" id="close-go" ${n ? "" : "disabled"}>Close uploads now</button><p class="msg-err" id="close-err" role="alert"></p>` });
    K.$("#close-go").addEventListener("click", async (e) => {
      const b = e.currentTarget; busy(b, true);
      K.track("close_uploads_confirmed", { files: n, hours_early: Math.round((new Date(order.cutoff_at) - Date.now()) / 36e5) });
      try {
        const nx = K.demo ? { ...order, open: false, closed_at: new Date().toISOString() } : await K.api("/order/close", { t });
        s.close(); render(nx); scrollTo({ top: 0, behavior: "smooth" });
      } catch (x) { busy(b, false); K.$("#close-err").textContent = x.message; }
    });
  }

  // Edit = the same step screen as setup, in a full-height sheet.
  function openEdit(key) {
    if (!order.open) return;
    fromOrder(order);
    const s = STEPS.find((x) => x.key === key);
    const sh = K.sheet({ id: "edit-sheet", full: true, title: s.title, sub: s.lead,
      body: STEP_HTML[key]() + '<p class="msg-err" id="save-err" role="alert"></p>',
      foot: `<button class="btn block" type="button" id="edit-save">Save changes</button>` });
    wireStep(key, sh.body);
    K.$("#edit-save").addEventListener("click", async (e) => {
      if (!validate(key)) return;
      const b = e.currentTarget; busy(b, true);
      try {
        const nx = await save(payload(key === "invite"));
        if (K.demo && key === "invite") nx.cutoff_at = draft.cutoff_at;
        sh.close(); render(nx); K.toast("Saved");
        K.$(`[data-edit="${key}"]`)?.focus({ preventScroll: true });
        K.track("details_edited", { step: key });
      } catch (x) { busy(b, false); err("save-err", x.message); }
    });
  }

  // ======================================================================
  function render(o) {
    order = o;
    if (o.id && o.id !== "demo" && render.who !== o.id) { render.who = o.id; K.identify(o.id); K.register({ order_ref: String(o.id).slice(0, 8) }); }
    const s = o.delivery ? "delivered" : !o.open ? "making" : o.cutoff_at ? "collecting" : "setup";
    if (state !== s) K.track("order_page_viewed", { state: s, new_order: !!qs.get("new") && s === "setup" });
    document.body.dataset.state = state = s;
    if (s === "setup") { if (!Object.keys(draft).length) fromOrder(o); showSetup(Math.min(step, 2), null); return; }
    backBtn.hidden = true; K.$("#nav-logo").hidden = false;
    fromOrder(o);
    if (s === "collecting") renderCollecting(o);
    if (s === "making") renderMaking(o);
    if (s === "delivered") renderDelivered(o);
  }

  async function load() {
    if (K.demo) {
      // Review hooks (localhost only): ?demo=1|collecting|closed|delivered &new=1 &step=invite|style
      // &sheet=who|invite|style|share|add|close|remake|occasion|date|cutoff|styles &remake=requested|done &empty=1 &cast=1
      const rm = qs.get("remake");
      if (rm) DEMO.remake = { requested_at: new Date().toISOString(), note: "Start with the beach photo and make the music softer.", delivered_at: rm === "done" ? new Date().toISOString() : null };
      order = { ...DEMO };
      fromOrder(order);
      step = { style: 1, invite: 2 }[qs.get("step")] || 0;
      if (step) { draft.honoree ||= "Mum"; draft.occasion ||= qs.get("occ") || "Birthday"; order.cover_url = "assets/films/ph-cover.jpg"; }
      render(order);
      const sh = qs.get("sheet");
      const map = { share: () => openShare(false), add: openAdd, close: confirmClose, remake: openRemake, occasion: pickOccasion, date: pickEventDate, cutoff: pickCutoff, styles: allStyles, people: allPeople };
      if (sh) (map[sh] || (() => openEdit(sh)))();
      if (qs.get("new") && state === "setup") thankYou();
      return;
    }
    if (!t) return fail('This link is missing its order code. <a href="find.html">Get your link by email</a>.');
    // Show the last copy this device saw straight away, then swap in fresh data if anything changed.
    const ck = "keeps-order-" + t, same = (a, b) => JSON.stringify(a).replace(/token=[^"&]+/g, "") === JSON.stringify(b).replace(/token=[^"&]+/g, "");
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(ck) || "null"); } catch {}
    if (cached) render(cached);
    try {
      const fresh = await K.api("/order?t=" + encodeURIComponent(t));
      try { localStorage.setItem(ck, JSON.stringify(fresh)); } catch {}
      if (!cached || !same(cached, fresh)) render(fresh); else order = fresh;   // keep fresh signed links without a re-render
      adsPurchase(order);
      if (qs.get("new") && state === "setup") thankYou();
    } catch (e) { if (!cached) fail(`${K.esc(e.message)} <a href="find.html">Get your link by email</a>.`); }
  }
  // Google Ads purchase conversion, once per payment, right after checkout. It runs in a hidden token-free page
  // (conv.html), so the private order link in this page's address never reaches Google.
  function adsPurchase(o) {
    if (!qs.get("new") || !o.pay_id || o.pay_mode !== "live") return;
    const key = "keeps-conv-" + o.pay_id;
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); } catch {}
    // The buyer's email (for enhanced conversions) goes through this browser's storage, never the iframe's address.
    try { if (o.buyer_email) localStorage.setItem("keeps-conv-email", o.buyer_email); } catch {}
    const f = document.createElement("iframe");
    f.hidden = true; f.title = ""; f.setAttribute("aria-hidden", "true"); f.referrerPolicy = "no-referrer";
    f.src = `conv.html?tx=${encodeURIComponent(o.pay_id)}&v=${encodeURIComponent(o.amount)}&c=${encodeURIComponent(o.currency)}`;
    document.body.append(f);
  }
  function fail(html) { app.innerHTML = `<div class="alert negative">${I("info")}<span>${html}</span></div>`; }

  setInterval(() => {
    const l = K.$("#left"); if (l && order?.cutoff_at) l.textContent = K.until(order.cutoff_at);
    if (!K.demo && order?.cutoff_at && order.open && new Date(order.cutoff_at) <= new Date()) load();   // locks at the cut-off
  }, 30000);
  load();
})();
