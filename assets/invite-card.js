// Contextual invite image (1200×630), drawn in the browser from the organiser's own data:
// their photo of the person, the occasion, the organiser's name and the Keeps mark.
// Shared as an image alongside the link, so the message is about *this* celebration.
// K.inviteCard({ honoree, occasion, organiser, cover_url }) → Promise<Blob>
(function () {
  const W = 1200, H = 630, BLUE = "#004ef7";
  const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  const loadImg = (src, cors) => new Promise((res, rej) => {
    const i = new Image(); if (cors) i.crossOrigin = "anonymous";
    i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
  let markP;
  const mark = () => (markP ||= fetch("assets/brand/keeps-mark.svg").then((r) => r.text()).then((s) =>
    loadImg(URL.createObjectURL(new Blob([s.replace(/currentColor/g, "#ffffff")], { type: "image/svg+xml" })))).catch(() => null));

  function wrap(x, text, maxW) {
    const words = String(text).split(/\s+/), lines = [];
    let line = "";
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  function round(x, l, t, w, h, r) {
    x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r);
    x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath();
  }

  K.inviteCard = async function ({ honoree, occasion, organiser, cover_url }) {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    // background: white fading into Keeps blue from the left edge
    const g = x.createLinearGradient(0, 0, 520, 0);
    g.addColorStop(0, "#ffffff"); g.addColorStop(.55, "#7ea6ff"); g.addColorStop(1, BLUE);
    x.fillStyle = BLUE; x.fillRect(0, 0, W, H);
    x.fillStyle = g; x.fillRect(0, 0, 520, H);

    // photo (or a warm placeholder with their initial)
    const P = { l: 36, t: 36, w: 520, h: 558, r: 44 };
    let photo = null;
    if (cover_url) photo = await loadImg(cover_url, true).catch(() => null);
    x.save(); round(x, P.l, P.t, P.w, P.h, P.r); x.clip();
    if (photo) {
      const k = Math.max(P.w / photo.width, P.h / photo.height);
      const dw = photo.width * k, dh = photo.height * k;
      x.drawImage(photo, P.l + (P.w - dw) / 2, P.t + (P.h - dh) / 2.4, dw, dh);
    } else {
      x.fillStyle = "#e6efff"; x.fillRect(P.l, P.t, P.w, P.h);
      x.fillStyle = BLUE; x.font = `700 220px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(String(honoree || "?").trim()[0]?.toUpperCase() || "?", P.l + P.w / 2, P.t + P.h / 2);
    }
    x.restore();

    // right column
    const L = 624, MAXW = W - L - 56;
    const m = await mark();
    if (m) x.drawImage(m, L, 52, 66, 66 * 176 / 122);
    x.fillStyle = "#ffffff"; x.textAlign = "left"; x.textBaseline = "alphabetic";

    // Lay out lead + title + pill top-down; shrink the title until the block fits above the bottom margin.
    const leadText = `${organiser ? organiser + " is" : "We're"} collecting video wishes for`;
    const title = `${honoree || "Someone special"}’s ${occasion ? occasion.replace(/^Wedding anniversary$/i, "Anniversary") : "celebration"}`;
    const PH = 78, BOTTOM = H - 44;
    let size = 80, lines, leadLines, y0;
    for (;;) {
      x.font = `400 36px ${FONT}`; leadLines = wrap(x, leadText, MAXW).slice(0, 2);
      x.font = `700 ${size}px ${FONT}`; lines = wrap(x, title, MAXW);
      const fits = lines.length <= 2 && lines.every((l) => x.measureText(l).width <= MAXW);
      const blockH = leadLines.length * 44 + 22 + lines.length * size * .98 + 36 + PH;
      y0 = Math.max(170, (148 + BOTTOM - blockH) / 2 + 20);
      if ((fits && y0 + blockH <= BOTTOM) || size <= 40) break;
      size -= 4;
    }
    let y = y0;
    x.font = `400 36px ${FONT}`;
    leadLines.forEach((l) => { y += 36; x.fillText(l, L, y); y += 8; });
    y += 22;
    x.font = `700 ${size}px ${FONT}`;
    lines.slice(0, 2).forEach((l) => { y += size * .9; x.fillText(l, L - 3, y); y += size * .08; });

    // pill CTA
    const cta = "Upload your wish today →";
    x.font = `700 32px ${FONT}`;
    const pw = x.measureText(cta).width + 72, ph = PH, py = Math.min(BOTTOM - ph, y + 36);
    x.fillStyle = "#ffffff"; round(x, L - 2, py, pw, ph, ph / 2); x.fill();
    x.fillStyle = BLUE; x.fillText(cta, L + 34, py + 50);

    return new Promise((res) => c.toBlob((b) => res(b), "image/jpeg", .9));
  };
})();
