/* Shared by the teacher room (teacher-dashboard.html) and the admin room (admin.html).
 * Plain script, loaded before each page's own script: small helpers, dialogs, the mobile drawer and the line chart. */

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DAY = 864e5;
const dateText = (d, o = { day: "numeric", month: "short" }) => new Date(Date.now() - d * DAY).toLocaleDateString("en-GB", o);
const ago = d => d === 0 ? "Today" : d === 1 ? "Yesterday" : d == null ? "Never" : `${d} days ago`;
const initials = n => n.replace(/^(Ms|Mr|Mrs)\.\s*/, "").split(" ").map(w => w[0]).slice(0, 2).join("");
const tempPass = () => ["owl", "leaf", "book", "star", "moon"][Math.floor(Math.random() * 5)] + "-" + String(Math.floor(1000 + Math.random() * 9000));
function setHelp(id, text, err) { const h = $(id); h.textContent = text; h.classList.toggle("err", !!err); }

/* Status tags: colour + icon + word, never colour alone. Pages add their own keys. */
const TAG = {
  published: ["ok", "i-check", "Published"],
  draft:     ["idle", "i-dash", "Draft"],
  live:      ["live", "i-megaphone", "Running"],
  ended:     ["idle", "i-dash", "Ended"],
};
const tag = k => { const [c, i, t] = TAG[k]; return `<span class="tag ${c}"><svg class="icon" aria-hidden="true"><use href="#${i}"/></svg>${t}</span>`; };

/* ---------- Dialogs: open, close on backdrop or [data-close], focus returns to the opener ---------- */
let dlgOpener;
function openDlg(id) { dlgOpener = document.activeElement; $(id).showModal(); }
document.addEventListener("click", e => {
  if (e.target.tagName === "DIALOG") e.target.close();
  const x = e.target.closest("[data-close]"); if (x) x.closest("dialog").close();
  const c = e.target.closest("[data-copy]");
  if (c) {
    navigator.clipboard?.writeText($(c.dataset.copy).textContent);
    c.lastChild.textContent = "Copied"; setTimeout(() => c.lastChild.textContent = "Copy", 1400);
  }
});
document.addEventListener("close", e => { if (e.target.tagName === "DIALOG") dlgOpener?.focus(); }, true);

/* ---------- Sidebar drawer (tablet + phone) ---------- */
function menu(open) {
  const side = $("side");
  side.classList.toggle("open", open); $("scrim").classList.toggle("open", open);
  $("menuBtn").setAttribute("aria-expanded", open);
  if (open) side.querySelector(".nav-item").focus();
}
$("menuBtn").addEventListener("click", () => menu(true));
$("scrim").addEventListener("click", () => menu(false));
addEventListener("keydown", e => {
  if (e.key === "Escape" && $("side").classList.contains("open")) { menu(false); $("menuBtn").focus(); }
});

/* ---------- Line chart: opened vs watched to the end, one axis ----------
 * series: [{ d: daysAgo, opened, finished, event?: "text for upload days" }], oldest first */
function initChart(series, { eventCol = "Lesson uploaded", what = "lessons" } = {}) {
  let range = 28;
  function draw() {
    const svg = $("chart"), W = svg.clientWidth || 800, H = svg.clientHeight || 260;
    const pad = { l: 34, r: 92, t: 12, b: 44 };
    const data = series.slice(-range);
    const max = Math.max(...data.map(p => p.opened)) * 1.15;
    const x = i => pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r);
    const y = v => pad.t + (1 - v / max) * (H - pad.t - pad.b);
    const base = H - pad.b;
    const path = k => data.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join("");
    const ticks = [0, Math.round(max / 2), Math.round(max * 0.9)];
    const step = range > 7 ? (W < 520 ? 14 : 7) : (W < 520 ? 2 : 1);
    let s = ticks.map(t => `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis-text" x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join("");
    s += `<path class="area s1" d="${path("opened")}L${x(data.length - 1)},${base}L${x(0)},${base}Z"/>`;
    s += `<path class="line s1" d="${path("opened")}"/><path class="line s2" d="${path("finished")}"/>`;
    const last = data[data.length - 1], lx = x(data.length - 1) + 10;
    let y1 = y(last.opened), y2 = y(last.finished); if (y2 - y1 < 16) { const m = (y1 + y2) / 2; y1 = m - 8; y2 = m + 8; }
    s += `<text class="end-label" x="${lx}" y="${y1 + 4}">Opened ${last.opened}</text><text class="end-label" x="${lx}" y="${y2 + 4}">To the end ${last.finished}</text>`;
    // event rail: a dot on each upload day
    s += `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${base + 14}" y2="${base + 14}"/>`;
    data.forEach((p, i) => {
      if (p.event) s += `<line class="event-line" x1="${x(i)}" x2="${x(i)}" y1="${pad.t}" y2="${base + 14}"/><circle class="event-dot" cx="${x(i)}" cy="${base + 14}" r="4.5"/>`;
      if ((data.length - 1 - i) % step === 0) s += `<text class="axis-text" x="${x(i)}" y="${base + 34}" text-anchor="middle">${p.d === 0 ? "Today" : dateText(p.d)}</text>`;
    });
    s += `<line class="today-line" x1="${x(data.length - 1)}" x2="${x(data.length - 1)}" y1="${pad.t}" y2="${base + 14}"/>`;
    s += `<line class="cross" id="cross" y1="${pad.t}" y2="${base}"/><circle class="hover-dot s1" id="hd1" r="5"/><circle class="hover-dot s2" id="hd2" r="5"/>`;
    s += `<rect id="hit" x="${pad.l}" y="0" width="${W - pad.l - pad.r}" height="${H}" fill="transparent"/>`;
    svg.innerHTML = s;
    const tot = data.reduce((a, p) => a + p.opened, 0), fin = data.reduce((a, p) => a + p.finished, 0);
    $("chartDesc").textContent = `Over the last ${range} days, ${what} were opened ${tot} times and watched to the end ${fin} times. Views rise on days a new lesson is uploaded.`;
    const wrap = $("chartWrap"), tip = $("tip");
    const show = i => {
      const p = data[i], cx = x(i);
      $("cross").setAttribute("x1", cx); $("cross").setAttribute("x2", cx);
      $("hd1").setAttribute("cx", cx); $("hd1").setAttribute("cy", y(p.opened));
      $("hd2").setAttribute("cx", cx); $("hd2").setAttribute("cy", y(p.finished));
      tip.innerHTML = `<p class="t-date">${p.d === 0 ? "Today" : dateText(p.d, { weekday: "short", day: "numeric", month: "short" })}</p>
        <p class="t-row"><i></i>Opened<b>${p.opened}</b></p><p class="t-row"><i class="s2"></i>Watched to the end<b>${p.finished}</b></p>
        ${p.event ? `<p class="t-event">${esc(p.event)}</p>` : ""}`;
      const ox = svg.getBoundingClientRect().left - wrap.getBoundingClientRect().left, tw = tip.offsetWidth || 180;
      tip.style.left = `${ox + (cx + 16 + tw > W ? cx - 16 - tw : cx + 16)}px`;
      wrap.classList.add("hovering");
    };
    const hit = $("hit");
    hit.addEventListener("pointermove", e => {
      const r = svg.getBoundingClientRect(), px = e.clientX - r.left;
      show(Math.max(0, Math.min(data.length - 1, Math.round((px - pad.l) / (W - pad.l - pad.r) * (data.length - 1)))));
    });
    hit.addEventListener("pointerleave", () => wrap.classList.remove("hovering"));
    if ($("chartTable")) { $("chartTable").remove(); showTable(); }
  }
  function showTable() {
    const rows = series.slice(-range).map(p => `<tr><td>${p.d === 0 ? "Today" : dateText(p.d)}</td><td class="num">${p.opened}</td><td class="num">${p.finished}</td><td>${p.event ? esc(p.event) : ""}</td></tr>`).join("");
    $("chartWrap").insertAdjacentHTML("afterend", `<div class="table-wrap" id="chartTable" style="margin:0 var(--space-md) var(--space-sm);max-height:260px;overflow:auto"><table><thead><tr><th>Day</th><th>Opened</th><th>Watched to the end</th><th>${eventCol}</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }
  document.querySelectorAll("[data-range]").forEach(b => b.addEventListener("click", () => {
    range = +b.dataset.range;
    document.querySelectorAll("[data-range]").forEach(o => o.setAttribute("aria-pressed", o === b));
    draw();
  }));
  $("asTable").addEventListener("click", () => {
    if ($("chartTable")) { $("chartTable").remove(); $("asTable").textContent = "See as a table"; return; }
    showTable(); $("asTable").textContent = "Hide table";
  });
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(draw, 120); });
  draw();
}
