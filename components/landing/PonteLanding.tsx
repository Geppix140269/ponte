"use client";

// Ponte Landing v1 — "Concept C: Heritage trading press × terminal data".
// Ported from the Claude Design bundle (Ponte Landing v1.html + ponte-landing.js).
// Self-contained: renders its own nav + footer, wrapped in `.ponte-terminal`
// which scopes the light terminal theme (see app/ponte-landing.css). The global
// dark SiteHeader/SiteFooter are suppressed on "/" so this owns the viewport.

import { useEffect, useRef } from "react";
import Link from "next/link";
import "@/app/ponte-landing.css";

const MARK = (
  <svg className="lockup__mark" viewBox="0 0 120 120" aria-hidden="true">
    <path d="M 22 98 L 22 60 C 22 35 98 35 98 60 L 98 98" fill="none" stroke="currentColor" strokeWidth="12" strokeLinejoin="miter" strokeLinecap="square" />
    <line x1="12" y1="98" x2="108" y2="98" stroke="currentColor" strokeWidth="5" />
    <circle cx="60" cy="42" r="11" className="lockup__dot" />
  </svg>
);

// CSS custom properties in inline styles need a loose cast.
const cssVars = (o: Record<string, string | number>) => o as React.CSSProperties;

export function PonteLanding() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (s: string) => root.querySelector(s) as HTMLElement | null;
    const $$ = (s: string) => Array.from(root.querySelectorAll(s)) as HTMLElement[];

    /* ---- TICKER ---- */
    const TICKER_ITEMS = [
      { cm: "WHEAT", corr: "UA → EG", delta: "+1.8%", up: true },
      { cm: "SUGAR 1701", corr: "BR → DZ", delta: "-0.4%", up: false },
      { cm: "UREA", corr: "QA → IN", delta: "+2.4%", up: true },
      { cm: "COCOA", corr: "CI → NL", delta: "+0.9%", up: true },
      { cm: "SOYBEAN", corr: "US → CN", delta: "-1.2%", up: false },
      { cm: "RICE BAS.", corr: "IN → AE", delta: "+0.6%", up: true },
      { cm: "COTTON", corr: "BJ → BD", delta: "-0.3%", up: false },
      { cm: "PALM OIL", corr: "ID → IN", delta: "+1.4%", up: true },
      { cm: "COFFEE AR.", corr: "BR → DE", delta: "+0.8%", up: true },
      { cm: "STEEL HRC", corr: "TR → ES", delta: "-0.7%", up: false },
      { cm: "OLIVE OIL", corr: "TN → IT", delta: "+0.5%", up: true },
      { cm: "CEMENT", corr: "VN → PH", delta: "+0.2%", up: true },
      { cm: "CORN", corr: "AR → DZ", delta: "-0.9%", up: false },
      { cm: "ALUMINIUM", corr: "RU → TR", delta: "+1.1%", up: true },
    ];
    function renderTicker() {
      const track = $("#tickerTrack");
      if (!track) return;
      const html = TICKER_ITEMS.map((it) => `
        <span class="tick">
          <span class="tick__cm">${it.cm}</span>
          <span class="tick__corr">${it.corr}</span>
          <span class="tick__delta--${it.up ? "up" : "dn"}">${it.delta}</span>
          <span class="tick__sep" aria-hidden="true"></span>
        </span>`).join("");
      track.innerHTML = html + html;
    }

    /* ---- SESSION CLOCK ---- */
    function updateClock() {
      const el = $("#sessionClock");
      if (!el) return;
      const d = new Date();
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      const ss = String(d.getUTCSeconds()).padStart(2, "0");
      el.textContent = `${hh}:${mm}:${ss} UTC`;
    }

    /* ---- COUNTERS ---- */
    function fmtNum(n: number, big: boolean) {
      if (big && n > 1e9) return (n / 1e9).toFixed(2) + '<span class="mute">B</span>';
      return n.toLocaleString("en-US");
    }
    function tickCounters() {
      $$(".rail__v[data-count]").forEach((el) => {
        const cur = parseInt(el.dataset.count!, 10);
        const step = parseInt(el.dataset.step || "1", 10);
        if (step === 0) return;
        const delta = Math.max(1, Math.floor(Math.random() * step * 2));
        const next = cur + delta;
        el.dataset.count = String(next);
        el.innerHTML = fmtNum(next, next > 1e9);
        el.style.transition = "color 200ms";
        el.style.color = "var(--pos)";
        setTimeout(() => { el.style.color = ""; }, 220);
      });
    }
    function presenceTick() {
      const el = $("#presenceCount");
      if (!el) return;
      const cur = parseInt(el.textContent!, 10);
      const delta = Math.round((Math.random() - 0.4) * 4);
      el.textContent = String(Math.max(180, cur + delta));
    }

    /* ---- SPARKLINE ---- */
    function renderSpark(elId: string, points: number[], colorVar: string) {
      const el = $(elId);
      if (!el) return;
      const W = el.clientWidth || 280, H = el.clientHeight || 60, P = 4;
      const min = Math.min(...points), max = Math.max(...points);
      const xs = (i: number) => P + (i / (points.length - 1)) * (W - P * 2);
      const ys = (v: number) => H - P - ((v - min) / Math.max(0.0001, max - min)) * (H - P * 2);
      const d = points.map((v, i) => `${i ? "L" : "M"} ${xs(i).toFixed(1)} ${ys(v).toFixed(1)}`).join(" ");
      const dArea = `${d} L ${xs(points.length - 1).toFixed(1)} ${H} L ${P} ${H} Z`;
      el.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" width="100%" height="100%">
          <defs><linearGradient id="${elId.replace("#", "")}-g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="var(${colorVar})" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="var(${colorVar})" stop-opacity="0"/>
          </linearGradient></defs>
          <path d="${dArea}" fill="url(#${elId.replace("#", "")}-g)"/>
          <path d="${d}" fill="none" stroke="var(${colorVar})" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
        </svg>`;
    }
    function genSpark(n: number, base: number, amp: number) {
      const out: number[] = []; let v = base;
      for (let i = 0; i < n; i++) { v += (Math.random() - 0.45) * amp; out.push(v); }
      return out;
    }
    function tinySparkSvg(points: number[], color: string) {
      const W = 84, H = 28, P = 2;
      const min = Math.min(...points), max = Math.max(...points);
      const xs = (i: number) => P + (i / (points.length - 1)) * (W - P * 2);
      const ys = (v: number) => H - P - ((v - min) / Math.max(0.0001, max - min)) * (H - P * 2);
      const d = points.map((v, i) => `${i ? "L" : "M"} ${xs(i).toFixed(1)} ${ys(v).toFixed(1)}`).join(" ");
      return `<svg class="spark-cell" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="none">
        <path d="${d}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    }

    /* ---- DISCOVERY BOARD ---- */
    const COUNTRIES: Record<string, { name: string; fill: string }> = {
      BR: { name: "Brazil", fill: "#0F6E3D" }, AE: { name: "United Arab Emirates", fill: "#0F0F0E" },
      DZ: { name: "Algeria", fill: "#0F6E3D" }, IN: { name: "India", fill: "#C9973A" },
      CN: { name: "China", fill: "#C84A2C" }, DE: { name: "Germany", fill: "#0F0F0E" },
      NL: { name: "Netherlands", fill: "#C84A2C" }, EG: { name: "Egypt", fill: "#0F0F0E" },
      UA: { name: "Ukraine", fill: "#1E5DB8" }, US: { name: "United States", fill: "#1E5DB8" },
      CI: { name: "Côte d'Ivoire", fill: "#C9973A" }, TR: { name: "Türkiye", fill: "#C84A2C" },
      AR: { name: "Argentina", fill: "#7BB3D8" }, QA: { name: "Qatar", fill: "#7A1F33" },
    };
    function flag(code: string) {
      const c = COUNTRIES[code] || { name: code, fill: "#777" };
      return `<span class="flag"><span class="flag__sq" style="background:${c.fill}"></span>${c.name}</span>`;
    }
    function scoreCls(s: number) { return s >= 75 ? "tscore" : s >= 50 ? "tscore tscore--mid" : "tscore tscore--low"; }
    const SUPPLIERS = [
      { co: "Atlantis Commodities Trading FZE", init: "AC", sub: "JAFZA-87431", country: "AE", hs: "1701.99", sh: 412, vol: "186K MT", last: "2 days", score: 91 },
      { co: "Açúcar do Norte Exportadora S.A.", init: "AN", sub: "CNPJ 33.881…", country: "BR", hs: "1701.14", sh: 638, vol: "412K MT", last: "1 day", score: 88 },
      { co: "Companhia Sucroenergia Cosan Trad.", init: "CS", sub: "B3:CSAN3", country: "BR", hs: "1701.99", sh: 1042, vol: "914K MT", last: "today", score: 96 },
      { co: "Delta Trading & Shipping LLC", init: "DT", sub: "DXB-DDA-9921", country: "AE", hs: "1701.14", sh: 187, vol: " 71K MT", last: "4 days", score: 74 },
      { co: "São Martinho Internacional", init: "SM", sub: "B3:SMTO3", country: "BR", hs: "1701.99", sh: 821, vol: "623K MT", last: "today", score: 93 },
      { co: "Algiers Mediterranean Sugar Co.", init: "AM", sub: "NIF 099876…", country: "DZ", hs: "1701.14", sh: 93, vol: " 38K MT", last: "7 days", score: 68 },
      { co: "Tropicana Agribusiness Holdings", init: "TA", sub: "CNPJ 21.554…", country: "BR", hs: "1701.99", sh: 314, vol: "201K MT", last: "3 days", score: 82 },
      { co: "Mahalakshmi Trade House Pvt Ltd", init: "MT", sub: "GSTIN 27ABXY…", country: "IN", hs: "1701.14", sh: 226, vol: "118K MT", last: "today", score: 79 },
    ];
    function renderBoard() {
      const tb = $("#boardBody");
      if (!tb) return;
      tb.innerHTML = SUPPLIERS.map((s) => {
        const spark = tinySparkSvg(genSpark(20, 50, 14), s.score >= 80 ? "var(--pos)" : s.score >= 60 ? "var(--warn)" : "var(--neg)");
        return `<tr>
          <td class="board__cell--name"><div class="bname"><span class="bname__init">${s.init}</span>
            <div><div class="bname__co">${s.co}</div><div class="bname__sub">${s.sub}</div></div></div></td>
          <td>${flag(s.country)}</td>
          <td class="mono">${s.hs}</td>
          <td class="num">${s.sh}</td>
          <td class="num">${s.vol}</td>
          <td class="mono">${s.last}</td>
          <td>${spark}</td>
          <td class="num"><span class="${scoreCls(s.score)}"><span class="tscore__bar"><span class="tscore__fill" style="width:${s.score}%"></span></span>${s.score}</span></td>
          <td><a class="iconbtn" href="#verify" title="Verify">→</a></td>
        </tr>`;
      }).join("");
    }
    function flashBoardRow() {
      if (reduced) return;
      const rows = $$("#boardBody tr");
      if (!rows.length) return;
      const r = rows[Math.floor(Math.random() * rows.length)];
      r.classList.add("flash");
      setTimeout(() => r.classList.remove("flash"), 1200);
    }

    /* ---- VERIFY ---- */
    function runVerify() {
      const checks = $$("#checks .check");
      const arc = $("#gaugeArc");
      const num = $("#gaugeNum");
      const total = 251.3, score = 91;
      checks.forEach((c) => { c.dataset.pending = "true"; });
      if (arc) { arc.style.transition = "none"; arc.style.strokeDashoffset = String(total); }
      if (num) num.textContent = "0";
      void root!.offsetWidth;
      const stepMs = reduced ? 0 : 360;
      checks.forEach((c, i) => { setTimeout(() => { c.dataset.pending = "false"; }, 200 + i * stepMs); });
      setTimeout(() => {
        if (!arc || !num) return;
        const targetOffset = total - (total * score / 100);
        arc.style.transition = reduced ? "none" : "stroke-dashoffset 1100ms cubic-bezier(.2,.8,.2,1)";
        arc.style.strokeDashoffset = String(targetOffset);
        const start = performance.now();
        const dur = reduced ? 1 : 1100;
        function tk(now: number) {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          num!.textContent = String(Math.round(score * eased));
          if (t < 1) requestAnimationFrame(tk);
        }
        requestAnimationFrame(tk);
      }, 200 + checks.length * stepMs + 100);
    }

    /* ---- FEED ---- */
    const COMMODITIES = [
      { name: "Sugar ICUMSA 45", hs: "1701.99" }, { name: "Urea Granular 46%", hs: "3102.10" },
      { name: "Wheat Milling", hs: "1001.99" }, { name: "Cocoa Beans", hs: "1801.00" },
      { name: "Soybean GMO", hs: "1201.90" }, { name: "Rice Basmati 1121", hs: "1006.30" },
      { name: "Cotton Type 4", hs: "5201.00" }, { name: "Palm Oil RBD", hs: "1511.90" },
      { name: "Coffee Arabica", hs: "0901.11" }, { name: "Steel HRC", hs: "7208.39" },
      { name: "Olive Oil EV", hs: "1509.10" }, { name: "Cement OPC 42.5", hs: "2523.29" },
    ];
    const CORRIDORS = [["BR", "DZ"], ["QA", "IN"], ["UA", "EG"], ["CI", "NL"], ["US", "CN"], ["IN", "AE"], ["TR", "ES"], ["BJ", "BD"], ["ID", "IN"], ["BR", "DE"], ["AR", "DZ"], ["RU", "TR"]];
    const COUNTERPARTIES = [
      { init: "KH", name: "K. Hamadi", ver: true, role: "seller" }, { init: "JM", name: "J. Mendes", ver: true, role: "trader" },
      { init: "RS", name: "R. Sharma", ver: true, role: "buyer" }, { init: "OA", name: "O. Adekunle", ver: true, role: "seller" },
      { init: "LB", name: "L. Bianchi", ver: true, role: "trader" }, { init: "YT", name: "Y. Tan", ver: true, role: "buyer" },
      { init: "NK", name: "N. Kowalski", ver: true, role: "seller" }, { init: "AG", name: "A. Gómez", ver: true, role: "trader" },
    ];
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    function makeOffer(forceSide: string | null) {
      const side = forceSide || (Math.random() > 0.5 ? "buy" : "sell");
      const cm = pick(COMMODITIES);
      const [a, b] = pick(CORRIDORS);
      const qty = (Math.floor(Math.random() * 60) + 5) * 1000;
      const poster = pick(COUNTERPARTIES);
      const priceBase = ({ "1701.99": 480, "3102.10": 360, "1001.99": 240, "1801.00": 3200, "1201.90": 415, "1006.30": 1180, "5201.00": 1580, "1511.90": 1080, "0901.11": 4250, "7208.39": 720, "1509.10": 7400, "2523.29": 92 } as Record<string, number>)[cm.hs] || 500;
      const price = priceBase + Math.round((Math.random() - 0.5) * priceBase * 0.05);
      return { side, cm, qty, a, b, poster, price };
    }
    const formatQty = (q: number) => q.toLocaleString("en-US") + " MT";
    function rowHTML(o: ReturnType<typeof makeOffer>, isNew: boolean) {
      const roleCap = o.poster.role.charAt(0).toUpperCase() + o.poster.role.slice(1);
      return `<div class="feed__row${isNew ? " is-new" : ""}">
        <span class="col col--side"><span class="sidepill sidepill--${o.side}"><span>${o.side === "buy" ? "↑" : "↓"}</span> ${o.side === "buy" ? "BUY" : "SELL"}</span></span>
        <span class="col col--cm"><div class="cmname">${o.cm.name}</div><div class="cmsub">HS ${o.cm.hs}</div></span>
        <span class="col col--qty num">${formatQty(o.qty)}</span>
        <span class="col col--corr"><span class="corr"><span>${o.a}</span><span class="corr__arrow">→</span><span>${o.b}</span></span></span>
        <span class="col col--price num">$${o.price.toLocaleString("en-US")}<span class="mute">/MT</span></span>
        <span class="col col--poster"><span class="posterpill"><span class="posterpill__init">${o.poster.init}</span>${o.poster.name}${o.poster.ver ? `<span class="posterpill__ck" title="Verified ${roleCap}">✓</span>` : ""}</span></span>
        <span class="col col--age age">${isNew ? "just now" : (Math.floor(Math.random() * 40) + 1) + "m ago"}</span>
        <span class="col col--act"><a class="iconbtn" href="#feed" title="Open">→</a></span>
      </div>`;
    }
    let feedFilter = "all";
    function renderFeed() {
      const body = $("#feedBody");
      if (!body) return;
      const offers = Array.from({ length: 7 }, () => makeOffer(feedFilter === "all" ? null : feedFilter));
      body.innerHTML = offers.map((o) => rowHTML(o, false)).join("");
    }
    function pushNewOffer() {
      if (reduced) return;
      const body = $("#feedBody");
      if (!body) return;
      const o = makeOffer(feedFilter === "all" ? null : feedFilter);
      const tmp = document.createElement("div");
      tmp.innerHTML = rowHTML(o, true);
      const row = tmp.firstElementChild as HTMLElement;
      body.prepend(row);
      while (body.children.length > 8) body.lastElementChild!.remove();
      setTimeout(() => row.classList.remove("is-new"), 1600);
    }

    /* ---- TAB WIRING ---- */
    function wireSegmented() {
      $$(".tsearch__intent .intent").forEach((b) => {
        b.addEventListener("click", () => {
          $$(".tsearch__intent .intent").forEach((x) => { x.classList.remove("is-active"); x.setAttribute("aria-selected", "false"); });
          b.classList.add("is-active"); b.setAttribute("aria-selected", "true");
        });
      });
      $$("[data-side]").forEach((b) => {
        b.addEventListener("click", () => {
          $$("[data-side]").forEach((x) => { x.classList.remove("is-active"); x.setAttribute("aria-selected", "false"); });
          b.classList.add("is-active"); b.setAttribute("aria-selected", "true");
        });
      });
      $$("[data-feed]").forEach((b) => {
        b.addEventListener("click", () => {
          $$("[data-feed]").forEach((x) => { x.classList.remove("is-active"); x.setAttribute("aria-selected", "false"); });
          b.classList.add("is-active"); b.setAttribute("aria-selected", "true");
          feedFilter = b.dataset.feed!;
          renderFeed();
        });
      });
      const vg = $("#verifyGo");
      if (vg) vg.addEventListener("click", runVerify);
    }

    /* ---- LIVENESS ---- */
    const timers: ReturnType<typeof setInterval>[] = [];
    const setInt = (fn: () => void, ms: number) => { const id = setInterval(fn, ms); timers.push(id); return id; };
    function startLiveness() {
      const lv = (root!.dataset.liveness as string) || "bloomberg";
      if (reduced || lv === "off") return;
      const rates = ({
        subtle: { counters: 8000, presence: 9000, feed: 14000, board: 12000, feedrate: 4.2 },
        medium: { counters: 4000, presence: 5500, feed: 8000, board: 7000, feedrate: 7.6 },
        bloomberg: { counters: 2200, presence: 3000, feed: 4200, board: 4400, feedrate: 12.4 },
      } as Record<string, { counters: number; presence: number; feed: number; board: number; feedrate: number }>)[lv] || { counters: 2200, presence: 3000, feed: 4200, board: 4400, feedrate: 12.4 };
      const fr = $("#feedRate"); if (fr) fr.textContent = rates.feedrate.toFixed(1);
      setInt(tickCounters, rates.counters);
      setInt(presenceTick, rates.presence);
      setInt(pushNewOffer, rates.feed);
      setInt(flashBoardRow, rates.board);
      setInt(updateClock, 1000);
    }

    /* ---- VERIFY ON SCROLL ---- */
    let io: IntersectionObserver | null = null;
    function observeVerify() {
      const sec = $("#verify");
      if (!sec) return;
      let ran = false;
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting && !ran) { ran = true; runVerify(); io!.disconnect(); } });
      }, { threshold: 0.35 });
      io.observe(sec);
    }

    /* ---- INIT ---- */
    renderTicker();
    updateClock();
    renderBoard();
    renderFeed();
    renderSpark("#heroSpark", genSpark(48, 60, 6), "--pos");
    wireSegmented();
    observeVerify();
    startLiveness();

    let rt: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(() => renderSpark("#heroSpark", genSpark(48, 60, 6), "--pos"), 200); };
    window.addEventListener("resize", onResize);

    return () => {
      timers.forEach(clearInterval);
      io?.disconnect();
      window.removeEventListener("resize", onResize);
      clearTimeout(rt);
    };
  }, []);

  return (
    <div className="ponte-terminal" data-theme="light" data-liveness="bloomberg" ref={rootRef}>
      {/* TICKER */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker__track" id="tickerTrack" />
      </div>

      {/* NAV */}
      <header className="nav">
        <div className="nav__inner">
          <a className="lockup" href="#top" aria-label="Ponte home">
            <span className="lockup__chip">{MARK}</span>
            <span className="lockup__word">Ponte</span>
            <span className="lockup__tld">.trade</span>
          </a>
          <nav className="nav__links" aria-label="Primary">
            <a href="#discover">Discover</a>
            <a href="#verify">Verify</a>
            <a href="#feed">Live offers</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="nav__actions">
            <span className="presence" aria-live="off"><span className="presence__dot" /><span id="presenceCount">214</span> principals online</span>
            <Link className="btn btn--ghost" href="/login">Sign in</Link>
            <Link className="btn btn--primary" href="/pricing">Open account</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" id="top" data-screen-label="Hero">
        <div className="hero__masthead">
          <div className="masthead__rule" />
          <div className="masthead__meta">
            <span className="meta__chip"><span className="kbd">EST</span> ICTTM · ADAMftd intelligence</span>
            <span className="meta__chip meta__chip--mono">SESSION OPEN · <span id="sessionClock">--:--:-- UTC</span></span>
          </div>
          <div className="masthead__rule" />
        </div>

        <div className="hero__grid">
          <div className="hero__main">
            <h1 className="hero__title" id="heroTitle">
              Verified counterparties.<br />
              <em>Live trade intelligence.</em>
            </h1>
            <p className="hero__sub" id="heroSub">Real buyers and sellers, proven by real customs data. No mandates. No daisy chains. Verify any principal in seconds against 7B+ shipment records and global sanctions lists.</p>

            <form className="tsearch" action="/network/listings" method="get">
              <div className="tsearch__intent" role="tablist" aria-label="Intent">
                <button type="button" className="intent intent--buy is-active" data-intent="buy" role="tab" aria-selected="true">
                  <span className="intent__glyph" aria-hidden="true">↑</span> Buy
                </button>
                <button type="button" className="intent intent--sell" data-intent="sell" role="tab" aria-selected="false">
                  <span className="intent__glyph" aria-hidden="true">↓</span> Sell
                </button>
              </div>
              <div className="tsearch__field">
                <label className="tsearch__label" htmlFor="searchQ">What are you trading?</label>
                <input id="searchQ" name="q" className="tsearch__input" type="text" placeholder="e.g. Sugar ICUMSA 45, 25,000 MT, Brazil → Algeria" autoComplete="off" />
              </div>
              <button type="submit" className="tsearch__go" aria-label="Search">
                <span>Find counterparties</span>
                <span className="tsearch__kbd">↵</span>
              </button>
            </form>

            <div className="trending">
              <span className="trending__label">Active now</span>
              <Link className="chip" href="/network/listings?q=Sugar">Sugar · BR → DZ</Link>
              <Link className="chip" href="/network/listings?q=Urea">Urea · QA → IN</Link>
              <Link className="chip" href="/network/listings?q=Wheat">Wheat · UA → EG</Link>
              <Link className="chip" href="/network/listings?q=Soybean">Soybean · US → CN</Link>
              <Link className="chip" href="/network/listings?q=Cocoa">Cocoa · CI → NL</Link>
              <Link className="chip" href="/network/listings?q=Rice">Rice · IN → AE</Link>
            </div>
          </div>

          <aside className="hero__rail" aria-label="Live network statistics">
            <div className="rail">
              <div className="rail__head">
                <span className="rail__title">Ponte network</span>
                <span className="rail__live"><span className="pulse" /> Live</span>
              </div>
              <div className="rail__rows">
                <div className="rail__row"><span className="rail__k">Verified principals</span><span className="rail__v mono" data-count="4231" data-step="1">4,231</span></div>
                <div className="rail__row"><span className="rail__k">Active corridors</span><span className="rail__v mono" data-count="827" data-step="1">827</span></div>
                <div className="rail__row"><span className="rail__k">Customs records indexed</span><span className="rail__v mono" data-count="7142861923" data-step="73">7.14<span className="mute">B</span></span></div>
                <div className="rail__row"><span className="rail__k">Sanctions screens / 24h</span><span className="rail__v mono" data-count="18429" data-step="3">18,429</span></div>
                <div className="rail__row"><span className="rail__k">Verifications passed</span><span className="rail__v mono pos" data-count="11604" data-step="2">11,604</span></div>
                <div className="rail__row"><span className="rail__k">Sanctions flagged</span><span className="rail__v mono neg" data-count="287" data-step="0">287</span></div>
              </div>
              <div className="rail__foot">
                <span className="mono">OFAC</span><span className="rail__sep" />
                <span className="mono">EU</span><span className="rail__sep" />
                <span className="mono">UN</span><span className="rail__sep" />
                <span className="mono">UK HMT</span><span className="rail__sep" />
                <span className="mono">+38 lists</span>
              </div>
            </div>
            <div className="rail rail--compact">
              <div className="rail__head">
                <span className="rail__title">Verification volume · 24h</span>
                <span className="mono pos" id="volDelta">+12.4%</span>
              </div>
              <div className="spark" id="heroSpark" />
            </div>
          </aside>
        </div>
      </section>

      {/* DISCOVERY */}
      <section className="section" id="discover" data-screen-label="Discovery">
        <div className="section__head">
          <div>
            <span className="eyebrow"><span className="eyebrow__no">01</span> Discovery</span>
            <h2 className="section__title">Real suppliers. Real buyers. From customs.</h2>
            <p className="section__lede">Search 7 billion shipment records across 199 countries. Counterparties exist before they list — find them anyway.</p>
          </div>
          <div className="section__filters">
            <div className="seg" role="tablist" aria-label="Side">
              <button className="seg__b is-active" data-side="suppliers" role="tab" aria-selected="true">Suppliers</button>
              <button className="seg__b" data-side="buyers" role="tab" aria-selected="false">Buyers</button>
            </div>
            <div className="filter-row">
              <span className="filter">Commodity · <strong>Sugar (HS 1701)</strong> <span className="caret">▾</span></span>
              <span className="filter">From · <strong>Brazil</strong> <span className="caret">▾</span></span>
              <span className="filter">To · <strong>Any</strong> <span className="caret">▾</span></span>
              <span className="filter">Min shipments · <strong>10</strong> <span className="caret">▾</span></span>
            </div>
          </div>
        </div>
        <div className="board">
          <table className="board__table" aria-label="Suppliers from customs data">
            <thead>
              <tr>
                <th className="board__cell--name">Counterparty</th>
                <th>Country</th>
                <th>HS code</th>
                <th className="num">Shipments · 12mo</th>
                <th className="num">Volume</th>
                <th>Last seen</th>
                <th>Activity</th>
                <th className="num">Trust</th>
                <th />
              </tr>
            </thead>
            <tbody id="boardBody" />
          </table>
          <div className="board__foot">
            <span className="mono">Showing 8 of 14,221 matches</span>
            <span className="board__source">Source · ADAMftd customs intelligence</span>
            <Link className="link" href="/network/listings">Open full results →</Link>
          </div>
        </div>
      </section>

      {/* VERIFY */}
      <section className="section section--alt" id="verify" data-screen-label="Verify">
        <div className="section__head">
          <div>
            <span className="eyebrow"><span className="eyebrow__no">02</span> Verify</span>
            <h2 className="section__title">Verify any counterparty in 6 seconds.</h2>
            <p className="section__lede">Paste a company name, VAT, or registry ID. Get sanctions, registry, customs activity, and a confidence score.</p>
          </div>
        </div>
        <div className="verify">
          <div className="verify__input">
            <div className="vinput">
              <label className="vinput__label">Counterparty</label>
              <input className="vinput__field" id="verifyQ" type="text" defaultValue="Atlantis Commodities Trading FZE" />
              <button className="btn btn--primary vinput__go" id="verifyGo" type="button">Run verification</button>
            </div>
            <div className="vmeta">
              <span className="meta__chip"><span className="kbd">VAT</span> AE-100432198400003</span>
              <span className="meta__chip"><span className="kbd">REG</span> JAFZA-87431</span>
              <span className="meta__chip"><span className="kbd">DOM</span> United Arab Emirates</span>
            </div>
          </div>
          <div className="verify__result" id="verifyResult">
            <div className="vcol vcol--checks">
              <div className="vcol__head">Verification trail</div>
              <ul className="checks" id="checks">
                <li className="check" data-step="1" data-result="pass"><span className="check__dot" /><div className="check__body"><div className="check__title">Identity match · registry</div><div className="check__meta mono">JAFZA · Dubai · incorporated 2014-03-11</div></div><span className="check__state" data-state="pass">PASS</span></li>
                <li className="check" data-step="2" data-result="pass"><span className="check__dot" /><div className="check__body"><div className="check__title">Sanctions screen · 42 lists</div><div className="check__meta mono">OFAC SDN · EU CFSP · UN 1267 · UK HMT · +38</div></div><span className="check__state" data-state="pass">CLEAR</span></li>
                <li className="check" data-step="3" data-result="warn"><span className="check__dot" /><div className="check__body"><div className="check__title">PEP &amp; adverse media</div><div className="check__meta mono">3 mentions · trade press · no material findings</div></div><span className="check__state" data-state="warn">REVIEW</span></li>
                <li className="check" data-step="4" data-result="pass"><span className="check__dot" /><div className="check__body"><div className="check__title">Customs activity · 36 months</div><div className="check__meta mono">412 outbound shipments · 11 corridors · HS 1701, 1006</div></div><span className="check__state" data-state="pass">ACTIVE</span></li>
                <li className="check" data-step="5" data-result="pass"><span className="check__dot" /><div className="check__body"><div className="check__title">Directors &amp; UBO</div><div className="check__meta mono">3 directors · 1 UBO · cross-checked against 12 lists</div></div><span className="check__state" data-state="pass">CLEAR</span></li>
              </ul>
            </div>
            <div className="vcol vcol--score">
              <div className="vcol__head">Trust score</div>
              <div className="gauge" id="gauge">
                <svg viewBox="0 0 200 120" className="gauge__svg" aria-hidden="true">
                  <path d="M 20 110 A 80 80 0 0 1 180 110" stroke="var(--rule)" strokeWidth="14" fill="none" strokeLinecap="round" />
                  <path id="gaugeArc" d="M 20 110 A 80 80 0 0 1 180 110" stroke="var(--pos)" strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray="251.3" strokeDashoffset="22.6" />
                </svg>
                <div className="gauge__val">
                  <span className="gauge__num mono" id="gaugeNum">91</span>
                  <span className="gauge__den">/ 100</span>
                </div>
                <div className="gauge__label">Verified · Tier IV</div>
              </div>
              <ul className="kv">
                <li><span>Sanctions</span><span className="pos mono">Clear</span></li>
                <li><span>Customs activity</span><span className="mono">412 / 36mo</span></li>
                <li><span>Counterparties</span><span className="mono">119 unique</span></li>
                <li><span>Disputes filed</span><span className="mono">0</span></li>
                <li><span>Ponte deals closed</span><span className="mono">7</span></li>
              </ul>
              <div className="badge-row">
                <span className="vbadge vbadge--verified">✓ Verified Trader</span>
                <span className="vbadge vbadge--tier">Tier IV · Institutional</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE FEED */}
      <section className="section" id="feed" data-screen-label="Live feed">
        <div className="section__head">
          <div>
            <span className="eyebrow"><span className="eyebrow__no">03</span> Live offers</span>
            <h2 className="section__title">Offers and requests, in motion.</h2>
            <p className="section__lede">Direct from verified buyers and sellers. Private contact unlock on mutual interest.</p>
          </div>
          <div className="section__filters">
            <div className="seg seg--triple" role="tablist" aria-label="Filter">
              <button className="seg__b is-active" data-feed="all" role="tab" aria-selected="true">All</button>
              <button className="seg__b" data-feed="buy" role="tab" aria-selected="false">Buy</button>
              <button className="seg__b" data-feed="sell" role="tab" aria-selected="false">Sell</button>
            </div>
            <span className="feed__live"><span className="pulse" /> Streaming · <span className="mono" id="feedRate">12.4</span>/min</span>
          </div>
        </div>
        <div className="feed">
          <div className="feed__head feed__row">
            <span className="col col--side">Side</span>
            <span className="col col--cm">Commodity</span>
            <span className="col col--qty num">Quantity</span>
            <span className="col col--corr">Corridor</span>
            <span className="col col--price num">Indication</span>
            <span className="col col--poster">Posted by</span>
            <span className="col col--age">Posted</span>
            <span className="col col--act" />
          </div>
          <div id="feedBody" className="feed__body" />
        </div>
      </section>

      {/* TRUST LANGUAGE */}
      <section className="section section--alt" id="trust" data-screen-label="Trust language">
        <div className="section__head">
          <div>
            <span className="eyebrow"><span className="eyebrow__no">04</span> Trust language</span>
            <h2 className="section__title">A consistent vocabulary for risk.</h2>
            <p className="section__lede">Every counterparty earns a 0-100 score, a verification tier, and an explicit sanctions state.</p>
          </div>
        </div>
        <div className="trust-grid">
          <div className="card card--span2">
            <div className="card__head">Trust score · 0–100</div>
            <div className="scale">
              <div className="scale__bar">
                <div className="scale__seg" style={cssVars({ "--w": "25%", "--c": "var(--neg)" })} />
                <div className="scale__seg" style={cssVars({ "--w": "25%", "--c": "var(--warn)" })} />
                <div className="scale__seg" style={cssVars({ "--w": "25%", "--c": "var(--pos-mid)" })} />
                <div className="scale__seg" style={cssVars({ "--w": "25%", "--c": "var(--pos)" })} />
              </div>
              <div className="scale__labels mono"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
              <div className="scale__tags">
                <span className="tag tag--neg">Untrusted</span>
                <span className="tag tag--warn">Review</span>
                <span className="tag tag--posmid">Trusted</span>
                <span className="tag tag--pos">Institutional</span>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card__head">Verification tiers</div>
            <ul className="tiers">
              <li><span className="tier tier--0">0</span><span>Unverified</span><span className="mono mute">email only</span></li>
              <li><span className="tier tier--1">I</span><span>Identity</span><span className="mono mute">ID + selfie</span></li>
              <li><span className="tier tier--2">II</span><span>Business</span><span className="mono mute">registry + VAT</span></li>
              <li><span className="tier tier--3">III</span><span>Activity</span><span className="mono mute">customs history</span></li>
              <li><span className="tier tier--4">IV</span><span>Institutional</span><span className="mono mute">audit + UBO</span></li>
            </ul>
          </div>
          <div className="card">
            <div className="card__head">Sanctions states</div>
            <ul className="states">
              <li><span className="dotstate dotstate--pos" /> <strong>Clear</strong><span className="mute"> · screened against 42 lists</span></li>
              <li><span className="dotstate dotstate--warn" /> <strong>Partial match</strong><span className="mute"> · review required</span></li>
              <li><span className="dotstate dotstate--neg" /> <strong>Hit</strong><span className="mute"> · transactions blocked</span></li>
            </ul>
          </div>
          <div className="card card--badge">
            <div className="card__head">Verified principal badge</div>
            <div className="bigbadge">
              <span className="bigbadge__check">✓</span>
              <div>
                <div className="bigbadge__title">Verified Trader</div>
                <div className="bigbadge__sub mono">PONTE · ADAMftd · ICTTM</div>
              </div>
            </div>
            <div className="bigbadge__foot mute">Role-aware: Verified Seller · Verified Buyer · Verified Trader. Awarded at Tier III+. Revocable on dispute or sanction.</div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section" id="pricing" data-screen-label="Pricing">
        <div className="section__head">
          <div>
            <span className="eyebrow"><span className="eyebrow__no">05</span> Pricing</span>
            <h2 className="section__title">Built for principals.</h2>
          </div>
        </div>
        <div className="plans">
          <div className="plan">
            <div className="plan__name">Free</div>
            <div className="plan__price"><span className="plan__c">€</span><span className="plan__n mono">0</span><span className="plan__per">/ mo</span></div>
            <div className="plan__line">Browse listings, view network</div>
            <ul className="plan__feat"><li>Identity verification</li><li>3 verifications / mo</li><li>Read-only deal rooms</li></ul>
            <Link className="btn btn--ghost btn--block" href="/login">Open free</Link>
          </div>
          <div className="plan">
            <div className="plan__name">Starter</div>
            <div className="plan__price"><span className="plan__c">€</span><span className="plan__n mono">49</span><span className="plan__per">/ mo</span></div>
            <div className="plan__line">Active buyers and sellers, building reputation</div>
            <ul className="plan__feat"><li>Business verification</li><li>50 verifications / mo</li><li>Post offers &amp; requests</li><li>Deal rooms · 5 active</li></ul>
            <Link className="btn btn--ghost btn--block" href="/pricing">Start €49</Link>
          </div>
          <div className="plan plan--featured">
            <div className="plan__ribbon">Most chosen</div>
            <div className="plan__name">Pro</div>
            <div className="plan__price"><span className="plan__c">€</span><span className="plan__n mono">149</span><span className="plan__per">/ mo</span></div>
            <div className="plan__line">Full ADAMftd discovery + Verified badge</div>
            <ul className="plan__feat"><li>Activity verification (Tier III)</li><li>Unlimited verifications</li><li>ADAMftd discovery (7B records)</li><li>Deal rooms · unlimited</li><li>Verified Trader badge</li></ul>
            <Link className="btn btn--primary btn--block" href="/pricing">Go Pro €149</Link>
          </div>
          <div className="plan">
            <div className="plan__name">Enterprise</div>
            <div className="plan__price"><span className="plan__c">€</span><span className="plan__n mono">499</span><span className="plan__per">/ mo</span></div>
            <div className="plan__line">Trading houses, multi-seat</div>
            <ul className="plan__feat"><li>Institutional verification (Tier IV)</li><li>Bulk verification API</li><li>SSO, audit log, SLA</li><li>Market intelligence access</li></ul>
            <Link className="btn btn--ghost btn--block" href="/pricing">Contact sales</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="foot">
        <div className="foot__inner">
          <div className="foot__lock">
            <span className="lockup__chip lockup__chip--lg">{MARK}</span>
            <div>
              <div className="foot__name">Ponte<span className="foot__tld">.trade</span></div>
              <div className="foot__tag mute">Build Trust. Trade Smarter.</div>
            </div>
          </div>
          <div className="foot__cols">
            <div>
              <div className="foot__h">Product</div>
              <Link href="/network/listings">Discovery</Link><Link href="/network/verify">Verify</Link><Link href="/network/deals">Deal rooms</Link><Link href="/catalogue">Market intelligence</Link>
            </div>
            <div>
              <div className="foot__h">Network</div>
              <Link href="/network/listings">Buyers</Link><Link href="/network/listings">Sellers</Link><Link href="/network/listings">Trading houses</Link><Link href="/network/listings">Producers</Link>
            </div>
            <div>
              <div className="foot__h">Trust</div>
              <Link href="/network/verify">ADAMftd</Link><Link href="/about">ICTTM</Link><Link href="/methodology">Sanctions methodology</Link><Link href="/privacy">Security</Link>
            </div>
            <div>
              <div className="foot__h">Company</div>
              <Link href="/about">About</Link><Link href="/about">Careers</Link><Link href="/about">Press</Link><a href="mailto:hello@ponte.trade">Contact</a>
            </div>
          </div>
        </div>
        <div className="foot__rule" />
        <div className="foot__inner foot__legal">
          <span className="mono">© 2026 Ponte Trade · operated under ICTTM · powered by ADAMftd</span>
          <span className="mono mute">All counterparties shown in demo are fictitious for illustration.</span>
        </div>
      </footer>
    </div>
  );
}
