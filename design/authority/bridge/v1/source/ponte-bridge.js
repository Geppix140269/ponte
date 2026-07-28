/* =====================================================================
   PONTE BRIDGE — component engine (vanilla, no framework, no build step)
   Every component is authored in its END STATE. Motion plays *toward*
   that state, so a paused tab, a print, a screenshot, reduced motion and
   a JS failure all show correct information.

   PB.route(el, opts)       Family Bridge · Action Bridge
   PB.progress(el, opts)    Task Completion Bridge (+ compact header)
   PB.journey(el, opts)     Commercial Journey Bridge
   PB.connection(el, opts)  Counterparty Connection
   PB.dealroom(el, opts)    Multi-Party Deal Room Bridge
   PB.value(steps, done)    the weighted progress authority
   ===================================================================== */
window.PB = (function () {
  const NS = 'http://www.w3.org/2000/svg';
  const VBREAK = 460;                    // below this a bridge is drawn in elevation

  function svgEl(t, a) { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); return n; }
  function h(t, cls, txt) { const n = document.createElement(t); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function still(el) { return el.classList.contains('br--still') || matchMedia('(prefers-reduced-motion:reduce)').matches; }

  /* deck geometry — one arc, every component. apex = y0 − rise. */
  function deckPath(W, H, inset, rise) {
    const y0 = H - 1.5, r = rise || H - 3, yc = y0 - (4 * r) / 3;
    return `M${inset},${y0} C${(W * 0.26).toFixed(1)},${yc.toFixed(1)} ${(W * 0.74).toFixed(1)},${yc.toFixed(1)} ${W - inset},${y0}`;
  }
  function stage(el, H, rise) {
    el.innerHTML = '';
    const st = h('div', 'br__stage'); st.style.position = 'relative';
    const W = Math.max(el.clientWidth || 960, 320);
    const svg = svgEl('svg', { class: 'br__deck', viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true', focusable: 'false' });
    svg.style.position = 'absolute'; svg.style.left = '0'; svg.style.top = '0';
    st.appendChild(svg); el.appendChild(st);
    return { st, svg, W, H, y0: H - 1.5, d: deckPath(W, H, 1.5, rise) };
  }
  function measure(d) { const p = svgEl('path', { d }); const s = svgEl('svg'); s.style.position = 'absolute'; s.style.opacity = '0'; s.appendChild(p); document.body.appendChild(s); const L = p.getTotalLength(); const at = t => p.getPointAtLength(L * Math.max(0, Math.min(1, t))); const pts = []; return { L, at, done: () => s.remove(), p }; }
  function fit(st) { if (!st || !st.isConnected) return; let b = 0; [...st.children].forEach(c => { if (c.tagName === 'svg') return; b = Math.max(b, (c.offsetTop || 0) + (c.offsetHeight || 0)); }); st.style.height = (b + 2) + 'px'; }
  /* height is set synchronously, then again after fonts settle: a bridge must
     never leave its labels overlapping the section beneath it. */
  function fitLater(st) { fit(st); requestAnimationFrame(() => fit(st)); if (document.fonts) document.fonts.ready.then(() => fit(st)); }
  /* sub-path from fraction a to b, sampled — used for live / reserved decks */
  function seg(m, a, b) { const n = Math.max(2, Math.round((b - a) * 60)); let d = ''; for (let i = 0; i <= n; i++) { const pt = m.at(a + (b - a) * i / n); d += (i ? 'L' : 'M') + pt.x.toFixed(1) + ',' + pt.y.toFixed(1); } return d; }
  function tsFor(n) {
    if (n <= 1) return [0.5];
    if (n === 2) return [0.30, 0.70];
    if (n === 3) return [0.26, 0.50, 0.74];
    if (n === 4) return [0.16, 0.39, 0.62, 0.85];
    const m = 0.14, sp = (1 - m * 2) / (n - 1); return Array.from({ length: n }, (_, i) => m + sp * i);
  }
  /* Station blocks are sized from the MEASURED spacing of the deck, never from
     a fixed constant: a block may never be wider than the gap it sits in. */
  function blockW(pts, max) {
    let g = Infinity;
    for (let i = 1; i < pts.length; i++) g = Math.min(g, pts[i].x - pts[i - 1].x);
    return Math.max(88, Math.min(max, isFinite(g) ? g - 12 : max));
  }
  /* ---------------- ELEVATION (the mobile drawing) ----------------
     ONE drawer, shared by every component. A bowed deck traced from the
     container height, an abutment cap at each end, every node placed ON the
     curve, piers lengthening as the deck bows away from the label column.
     No component may draw its own vertical deck: that is how three of them
     ended up as straight rules. */
  const GUT = 46, BOW = 11, X0 = 6;
  function elevation(rows, o) {
    const svg = svgEl('svg', { class: 'br__deck br__vsvg', 'aria-hidden': 'true', focusable: 'false' });
    rows.insertBefore(svg, rows.firstChild);
    const draw = () => {
      const H = rows.offsetHeight; if (!H) return;
      const xAt = y => X0 + BOW * 4 * (y / H) * (1 - y / H);
      const trace = (from, to) => { let d = '', n = 48; for (let i = 0; i <= n; i++) { const y = from + (to - from) * i / n; d += (i ? 'L' : 'M') + xAt(y).toFixed(1) + ',' + y.toFixed(1); } return d; };
      svg.setAttribute('viewBox', `0 0 ${GUT} ${H}`);
      svg.setAttribute('width', GUT); svg.setAttribute('height', H);
      svg.style.cssText = 'position:absolute;left:0;top:0;width:' + GUT + 'px;height:' + H + 'px';
      svg.textContent = '';
      svg.appendChild(svgEl('path', { class: 'd-track', d: trace(0, H) }));
      [1.2, H - 1.2].forEach(y => svg.appendChild(svgEl('line', { class: 'cap', x1: (xAt(y) - 5.5).toFixed(1), y1: y.toFixed(1), x2: (xAt(y) + 5.5).toFixed(1), y2: y.toFixed(1) })));
      /* nodes sit on the curve; piers reach from the node to the labels */
      [...rows.querySelectorAll(o.rowSel)].forEach(b => {
        const n = b.querySelector(o.nodeSel), p = o.pierSel ? b.querySelector(o.pierSel) : null;
        if (!n) return;
        const y = b.offsetTop + 9, x = xAt(y);
        n.style.left = (x - GUT - n.offsetWidth / 2).toFixed(1) + 'px';
        if (p) { p.style.left = (x - GUT + 7).toFixed(1) + 'px'; p.style.width = Math.max(8, GUT - 6 - (x + 7)).toFixed(1) + 'px'; }
      });
      (o.segments ? o.segments(rows, H) : []).forEach(s => {
        if (s.to <= s.from) return;
        svg.appendChild(svgEl('path', { class: s.cls, d: trace(s.from * H, s.to * H) }));
      });
      if (o.point) { const t = o.point.at, p = { x: xAt(t * H), y: t * H }; svg.appendChild(svgEl('circle', { class: o.point.cls, cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 4.6 })); }
    };
    requestAnimationFrame(draw);
    if (document.fonts) document.fonts.ready.then(draw);
    return draw;
  }
  function restoreFocus(el, id) {
    if (!id) return;
    const b = el.querySelector('.brst[data-id="' + id + '"]');
    if (b) b.focus({ preventScroll: true });
  }
  function abut(text, side, dashed) {
    const a = h('div', 'br__ab br__ab--' + side + (dashed ? ' br__ab--dashed' : ''));
    a.appendChild(h('i')); a.appendChild(h('b', null, text)); return a;
  }

  /* ---------------- the progress authority ----------------
     value = the sum of the weights of completed steps. Deterministic:
     the same completed work always renders the same number. Never random,
     never time-based, never 0 — an unstarted task shows no number at all. */
  function value(steps, done) {
    const set = new Set(done || []);
    const v = steps.reduce((s, x) => s + (set.has(x.id) ? x.weight : 0), 0);
    return set.size === 0 ? null : Math.round(v);
  }
  const BANDS = [[20, 39, 'Started'], [40, 59, 'Core information added'], [60, 79, 'Good commercial detail'], [80, 99, 'Nearly ready to submit'], [100, 100, 'Ready to submit for review']];
  function band(v, bands) { const b = bands || BANDS; for (const [lo, hi, t] of b) if (v >= lo && v <= hi) return t; return b[0][2]; }

  /* ================= 1 · ROUTE (Family / Action Bridge) ================= */
  function route(el, o) {
    /* This component re-renders its whole station DOM on every selection, so
       focus must be carried across the rebuild by id — otherwise a keyboard
       user is ejected to <body> on the first arrow key. */
    const focused = el.contains(document.activeElement) ? document.activeElement.closest('.brst') : null;
    const refocus = focused ? focused.dataset.id : null;
    const vertical = (el.clientWidth || 960) < VBREAK;
    el.classList.toggle('br--v', vertical);
    el.setAttribute('role', 'radiogroup');
    if (o.aria) el.setAttribute('aria-label', o.aria);
    const sel = o.selected == null ? null : o.selected;
    el.classList.toggle('br--chosen', sel != null);

    const mkStation = (s, i) => {
      const b = h('button', 'brst'); b.type = 'button';
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(sel === s.id));
      b.dataset.id = s.id;
      /* roving tabindex: an ARIA radiogroup is ONE tab stop */
      b.tabIndex = (sel ? sel === s.id : i === 0) ? 0 : -1;
      if (sel === s.id) b.classList.add('brst--on');
      if (o.visited && o.visited.includes(s.id) && sel !== s.id) b.classList.add('brst--visited');
      b.appendChild(h('span', 'brst__n'));
      b.appendChild(h('span', 'brst__p'));
      const w = h('span', 'brst__w'); w.style.display = 'block';
      w.appendChild(h('span', 'brst__ix', s.index || String(i + 1).padStart(2, '0') + ' · ' + (o.unit || 'ROUTE')));
      w.appendChild(h('span', 'brst__t', s.label));
      if (s.note) w.appendChild(h('span', 'brst__d', s.note));
      w.appendChild(h('span', 'brst__mk', o.mark || 'Selected route'));
      b.appendChild(w);
      b.addEventListener('click', () => o.onSelect && o.onSelect(s.id));
      b.addEventListener('keydown', e => {
        const ks = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
        if (!ks.includes(e.key)) return; e.preventDefault();
        const all = [...el.querySelectorAll('.brst')], ix = all.indexOf(b);
        const nx = all[(ix + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length];
        nx.focus(); o.onSelect && o.onSelect(nx.dataset.id);
      });
      return b;
    };

    if (vertical) {
      el.innerHTML = '';
      const rows = h('div', 'br__rows br__rows--arc');
      o.stations.forEach((s, i) => rows.appendChild(mkStation(s, i)));
      el.appendChild(rows);
      restoreFocus(el, refocus);
      elevation(rows, { rowSel: '.brst', nodeSel: '.brst__n', pierSel: '.brst__p',
        segments: (r, H) => { const on = r.querySelector('.brst--on'); return on ? [{ cls: 'd-live', from: 0, to: (on.offsetTop + 9) / H }] : []; } });
      return;
    }

    const H = o.deckH || 92, g = stage(el, H), m = measure(g.d);
    g.svg.appendChild(svgEl('path', { class: 'd-track', d: g.d }));
    const ts = tsFor(o.stations.length);
    const selIx = o.stations.findIndex(s => s.id === sel);
    if (selIx > -1) {
      const live = svgEl('path', { class: 'd-live', d: seg(m, 0, ts[selIx]) });
      g.svg.appendChild(live);
      if (!still(el) && o.animate) {
        const L = live.getTotalLength(); live.style.setProperty('--br-len', L); el.classList.add('br--drawing');
        setTimeout(() => el.classList.remove('br--drawing'), 700);
      }
    }
    if (o.left) { const l = abut(o.left, 'l'); l.style.top = g.y0 + 'px'; g.st.appendChild(l); }
    if (o.right) { const r = abut(o.right, 'r', o.rightDashed); r.style.top = g.y0 + 'px'; g.st.appendChild(r); }
    /* one label baseline for every station: the PIER lengthens to reach the
       deck, so mixed label lengths and a curved deck still share a grid. */
    const pts = ts.map(t => m.at(t)), yBase = Math.max(...pts.map(p => p.y)), basePier = o.pier || 34;
    const stW = blockW(pts, 176);
    o.stations.forEach((s, i) => {
      const b = mkStation(s, i), pt = pts[i];
      b.style.width = stW + 'px';
      b.style.left = pt.x.toFixed(1) + 'px'; b.style.top = (pt.y - 7.5).toFixed(1) + 'px';
      b.querySelector('.brst__p').style.height = (basePier + yBase - pt.y).toFixed(1) + 'px';
      g.st.appendChild(b);
    });
    /* abutment labels must clear the outermost station block on their own side */
    const abL = Math.max(44, Math.min(150, pts[0].x - stW / 2 - 12));
    const abR = Math.max(44, Math.min(150, g.W - pts[pts.length - 1].x - stW / 2 - 12));
    g.st.querySelectorAll('.br__ab--l').forEach(a => { a.style.width = abL + 'px'; });
    g.st.querySelectorAll('.br__ab--r').forEach(a => { a.style.width = abR + 'px'; });
    m.done();
    fitLater(g.st);
    restoreFocus(el, refocus);
    /* the count note lives in normal flow BELOW the stage — it can never be
       placed at a guessed offset, because station blocks vary in height. */
    if (o.count) el.appendChild(h('div', 'brx__empty', o.count));
    /* Travel: the point crosses to the chosen station, then stops. */
    if (selIx > -1 && o.animate && !still(el)) {
      const path = seg(m, 0, ts[selIx]);
      const run = h('div', 'br__runner br__runner--go');
      run.style.offsetPath = `path("${path}")`; run.style.offsetRotate = '0deg';
      run.style.left = '-4.5px'; run.style.top = '-4.5px';
      g.st.appendChild(run); el.classList.add('br--travelling');
      setTimeout(() => { run.remove(); el.classList.remove('br--travelling'); }, 900);
    }
  }

  /* ================= 2 · TASK COMPLETION ================= */
  function progress(el, o) {
    const v = o.value !== undefined ? o.value : value(o.steps || [], o.done || []);
    const vertical = (el.clientWidth || 960) < VBREAK;
    el.classList.toggle('br--v', vertical);
    el.classList.add('brp');
    el.innerHTML = '';
    const top = h('div', 'brp__top');
    const L = h('div');
    L.appendChild(h('div', 'brp__lab', o.label || 'Task completion'));
    L.appendChild(h('div', 'brp__band', v == null ? (o.neutral || 'Not started') : band(v, o.bands)));
    top.appendChild(L);
    if (v == null) { top.appendChild(h('div', 'brp__val brp__val--none', 'No value yet')); }
    else { const n = h('div', 'brp__val'); n.appendChild(h('span', null, String(v))); n.appendChild(h('sup', null, '%')); top.appendChild(n); }
    el.appendChild(top);

    const H = o.deckH || 34;
    const holder = h('div'); el.appendChild(holder);
    const g = stage(holder, H), m = measure(g.d);
    g.svg.appendChild(svgEl('path', { class: 'd-track', d: g.d }));
    if (v != null) {
      const live = svgEl('path', { class: 'd-live', d: seg(m, 0, v / 100) });
      if (o.halted) { live.setAttribute('stroke', 'var(--pf-review)'); }
      g.svg.appendChild(live);
      if (v < 100) g.svg.appendChild(svgEl('path', { class: o.halted ? 'd-fwd' : 'd-fwd', d: seg(m, v / 100, 1) }));
      const pt = m.at(v / 100);
      if (!o.halted) {
        [[0.076, .20], [0.038, .34]].forEach(([b, op]) => { const t = m.at(Math.max(0, v / 100 - b)); g.svg.appendChild(svgEl('circle', { class: 'br__tail', cx: t.x.toFixed(1), cy: t.y.toFixed(1), r: 3, opacity: op })); });
      }
      g.svg.appendChild(svgEl('circle', { class: 'br__pt' + (o.halted ? ' br__pt--halt' : ''), cx: pt.x.toFixed(1), cy: pt.y.toFixed(1), r: 4.6 }));
      if (v === 100) { const e = m.at(1); g.svg.appendChild(svgEl('line', { class: 'cap', x1: e.x.toFixed(1), y1: (e.y - 9).toFixed(1), x2: e.x.toFixed(1), y2: (e.y + 4).toFixed(1) })); }
    }
    m.done(); g.st.style.height = H + 'px';
    holder.setAttribute('role', 'img');
    holder.setAttribute('aria-label', v == null ? (o.label || 'Task') + ': not started, no completion value.' : (o.label || 'Task') + ': ' + v + ' per cent of required work complete. ' + band(v, o.bands) + '.' + (o.halted ? ' Waiting on a person.' : ''));

    if (o.steps && o.showSteps !== false) {
      const ul = h('ul', 'brp__steps'); const set = new Set(o.done || []);
      let run = 0;
      o.steps.forEach(s => {
        const on = set.has(s.id); if (on) run += s.weight;
        const li = h('li', on ? 'on' : ''); li.appendChild(h('i'));
        li.appendChild(h('span', null, s.label));
        li.appendChild(h('u', null, on ? run + '%' : '+' + s.weight));
        ul.appendChild(li);
      });
      el.appendChild(ul);
    }
    if (o.note) el.appendChild(h('div', 'brp__note', o.note));
  }

  function header(el, o) {
    el.className = 'brh';
    el.innerHTML = '';
    el.appendChild(h('span', 'brh__k', o.kicker || 'Journey'));
    el.appendChild(h('span', 'brh__n', o.name));
    const g = h('div', 'brh__g br'); el.appendChild(g);
    const v = o.value !== undefined ? o.value : value(o.steps || [], o.done || []);
    const st = stage(g, 18), m = measure(st.d);
    st.svg.appendChild(svgEl('path', { class: 'd-track', d: st.d }));
    if (v != null) {
      st.svg.appendChild(svgEl('path', { class: 'd-live', d: seg(m, 0, v / 100) }));
      if (v < 100) st.svg.appendChild(svgEl('path', { class: 'd-fwd', d: seg(m, v / 100, 1) }));
      const p = m.at(v / 100);
      st.svg.appendChild(svgEl('circle', { class: 'br__pt' + (o.halted ? ' br__pt--halt' : ''), cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 3.6 }));
    }
    m.done(); st.st.style.height = '18px';
    const n = h('span', 'brh__v');
    if (v == null) { n.className = 'brh__k'; n.textContent = o.neutral || 'Not started'; }
    else { n.appendChild(h('span', null, String(v))); n.appendChild(h('small', null, '%')); }
    el.appendChild(n);
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', o.name + '. ' + (v == null ? 'Not started.' : v + ' per cent complete.'));
  }

  /* ================= 3 · COMMERCIAL JOURNEY ================= */
  /* Solid deck = travelled. Dashed deck = reserved, NOT promised.
     Dotted deck = unavailable (blocked, expired, declined). */
  const JS_STATE = {
    travelling: ['', 'In progress', 'd-fwd'],
    'awaiting-participant': ['halt', 'Awaiting participant', 'd-fwd'],
    'awaiting-evidence': ['halt', 'Awaiting evidence', 'd-fwd'],
    'under-review': ['halt', 'Under review', 'd-fwd'],
    blocked: ['block', 'Blocked', 'd-blocked'],
    paused: ['halt', 'Paused', 'd-off'],
    expired: ['block', 'Expired', 'd-off'],
    withdrawn: ['halt', 'Withdrawn', 'd-off'],
    declined: ['block', 'Declined', 'd-off'],
    completed: ['done', 'Completed', null]
  };
  function journey(el, o) {
    const vertical = (el.clientWidth || 960) < VBREAK;
    el.classList.toggle('br--v', vertical);
    const stages = o.stages, at = o.at, S = JS_STATE[o.state] || JS_STATE.travelling;
    const cls = S[0], fwdCls = S[2], done = o.state === 'completed';

    /* Shown: the current stage and the two ahead of it, with counted
       remainders at each end. Three blocks fit the deck at legible type;
       four do not, and a spec document may not ship an overlap. */
    let shown = stages.map((s, i) => ({ s, i })), collapsed = 0;
    if (!o.full && stages.length > 4) {
      const start = at, end = Math.min(stages.length, at + 3);
      collapsed = start;
      shown = stages.slice(start, end).map((s, k) => ({ s, i: start + k }));
    }
    const rest = stages.length - (shown.length + collapsed);

    const mk = (o2) => {
      const b = h('div', 'brst'); b.style.cursor = 'default';
      const i = o2.i, cur = i === at;
      b.classList.add(...(i < at || done ? ['brst--done'] : cur ? (cls ? ['brst--' + cls] : ['brst--done', 'brst--now']) : ['brst--ahead']));
      b.appendChild(h('span', 'brst__n')); b.appendChild(h('span', 'brst__p'));
      const w = h('span'); w.style.display = 'block';
      w.appendChild(h('span', 'brst__ix', String(i + 1).padStart(2, '0') + (cur ? ' · NOW' : i < at || done ? ' · DONE' : ' · NEXT')));
      w.appendChild(h('span', 'brst__t', o2.s));
      if (cur && S[1]) w.appendChild(h('span', 'brst__d', S[1]));
      b.appendChild(w); return b;
    };

    if (vertical) {
      el.innerHTML = '';
      const rows = h('div', 'br__rows br__rows--arc');
      if (collapsed) { const c = h('div', 'brcol'); c.style.padding = '0 0 18px'; c.appendChild(h('b', null, collapsed + ' stages completed')); rows.appendChild(c); }
      shown.forEach(x => rows.appendChild(mk(x)));
      if (rest > 0) { const c = h('div', 'brcol'); c.appendChild(h('b', null, rest + ' further stages · not guaranteed')); rows.appendChild(c); }
      el.appendChild(rows);
      const curIx = shown.findIndex(x => x.i === at);
      elevation(rows, { rowSel: '.brst', nodeSel: '.brst__n', pierSel: '.brst__p',
        segments: (r, H) => {
          const ns = [...r.querySelectorAll('.brst')], cur = ns[curIx] || ns[0];
          if (!cur) return [];
          const t = done ? 1 : (cur.offsetTop + 9) / H;
          const segs = [{ cls: o.state === 'withdrawn' ? 'd-past' : 'd-live', from: 0, to: t }];
          if (!done && fwdCls) segs.push({ cls: fwdCls, from: t, to: 1 });
          return segs;
        } });
      return;
    }

    el.classList.add('brj');
    const H = o.deckH || 76, g = stage(el, H), m = measure(g.d);
    const n = shown.length + (collapsed ? 1 : 0) + (rest > 0 ? 1 : 0);
    const ts = tsFor(n);
    let k = 0; const tOf = {};
    if (collapsed) k++;
    shown.forEach((x, j) => tOf[x.i] = ts[k + j]);
    const tCur = tOf[at] != null ? tOf[at] : ts[0];
    g.svg.appendChild(svgEl('path', { class: 'd-track', d: g.d }));
    g.svg.appendChild(svgEl('path', { class: o.state === 'withdrawn' ? 'd-past' : 'd-live', d: seg(m, 0, done ? 1 : tCur) }));
    if (!done && fwdCls) g.svg.appendChild(svgEl('path', { class: fwdCls, d: seg(m, tCur, 1) }));
    if (done) { const e = m.at(1); g.svg.appendChild(svgEl('line', { class: 'cap', x1: e.x.toFixed(1), y1: (e.y - 12).toFixed(1), x2: e.x.toFixed(1), y2: (e.y + 5).toFixed(1) })); }
    const allP = ts.map(t => m.at(t)), yB = Math.max(...allP.map(p => p.y)), bp = 26;
    const jW = blockW(allP, 150);
    if (collapsed) { const c = h('div', 'brcol'); const p = allP[0]; c.style.left = p.x + 'px'; c.style.top = (yB + bp + 2) + 'px'; c.style.width = jW + 'px'; c.appendChild(h('b', null, collapsed + ' completed')); g.st.appendChild(c); }
    shown.forEach(x => { const b = mk(x), p = m.at(tOf[x.i]); b.style.width = jW + 'px'; b.style.left = p.x.toFixed(1) + 'px'; b.style.top = (p.y - 7.5).toFixed(1) + 'px'; b.querySelector('.brst__p').style.height = (bp + yB - p.y).toFixed(1) + 'px'; g.st.appendChild(b); });
    if (rest > 0) { const c = h('div', 'brcol'); const p = allP[n - 1]; c.style.left = p.x + 'px'; c.style.top = (yB + bp + 2) + 'px'; c.style.width = jW + 'px'; c.appendChild(h('b', null, '+' + rest + ' · not guaranteed')); g.st.appendChild(c); }
    m.done(); fitLater(g.st);
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', 'Commercial journey. Current stage: ' + stages[at] + '. ' + S[1] + '. Next: ' + (stages[at + 1] || 'none') + '. Later stages are not guaranteed.');
  }

  /* ================= 4 · COUNTERPARTY CONNECTION =================
     Parties are ABUTMENTS — two pieces of land. The deck between them is
     the introduction. Nothing orbits, nothing pulses, nothing matches. */
  const CX = {
    'one-party': { b: 0, deck: 'stub', mid: null, r: null },
    'awaiting-party': { b: 0, deck: 'unconf', mid: ['Awaiting a second party', null], r: 'wait' },
    'two-parties': { b: 0, deck: 'unconf', mid: ['Two parties identified', 'No introduction proposed'], r: 'on' },
    'proposed': { b: 0.5, deck: 'half', mid: ['Introduction proposed', null], r: 'on' },
    'awaiting-acceptance': { b: 0.5, deck: 'half', mid: ['Awaiting acceptance', null], r: 'on', halt: 1 },
    'connecting': { b: 0.5, deck: 'half', mid: ['Introduction accepted — connecting', null], r: 'on', travel: 1 },
    'accepted': { b: 1, deck: 'full', mid: ['Introduction accepted', null], r: 'on' },
    'declined': { b: 0.5, deck: 'off', mid: ['Introduction declined', null], r: 'on', danger: 1 },
    'expired': { b: 0, deck: 'off', mid: ['Connection expired', null], r: 'on' },
    'withdrawn': { b: 0, deck: 'past', mid: ['Connection withdrawn', null], r: 'on' }
  };
  function connection(el, o) {
    const c = CX[o.state] || CX['two-parties'];
    const vertical = (el.clientWidth || 960) < VBREAK;
    el.classList.toggle('br--v', vertical); el.classList.add('brc');
    const H = o.deckH || 62;
    if (vertical) {
      /* the two abutment caps ARE the two parties' ground: top is party A,
         bottom is party B, and the deck between them is the introduction. */
      el.innerHTML = '';
      const rows = h('div', 'br__rows br__rows--arc');
      const A = h('div', 'brc__party'); A.appendChild(h('b', null, o.a.name)); A.appendChild(h('span', null, o.a.role)); rows.appendChild(A);
      const mid = h('div', 'brc__mid'); mid.style.margin = '16px 0';
      if (c.mid) { mid.appendChild(h('b', null, c.mid[0])); if (c.mid[1]) mid.appendChild(h('u', null, c.mid[1])); }
      rows.appendChild(mid);
      const B = h('div', 'brc__party' + (c.r === 'on' ? '' : ' brc__party--wait'));
      B.appendChild(h('b', null, c.r === 'on' ? o.b.name : 'Not yet identified'));
      B.appendChild(h('span', null, c.r === 'on' ? o.b.role : 'Awaiting a counterparty'));
      rows.appendChild(B);
      el.appendChild(rows);
      const segs = { stub: [{ cls: 'd-live', from: 0, to: .16 }],
        unconf: [{ cls: 'd-unconf', from: 0, to: 1 }],
        half: [{ cls: 'd-live', from: 0, to: .5 }, { cls: 'd-unconf', from: .5, to: 1 }],
        full: [{ cls: 'd-live', from: 0, to: 1 }],
        off: [{ cls: 'd-live', from: 0, to: .5 }, { cls: 'd-off', from: .5, to: 1 }],
        past: [{ cls: 'd-past', from: 0, to: 1 }] }[c.deck] || [{ cls: 'd-unconf', from: 0, to: 1 }];
      elevation(rows, { rowSel: '.brc__party', nodeSel: '.brc__nonode',
        segments: () => segs,
        point: c.b && c.b !== 1 ? { at: .5, cls: 'br__pt' + (c.halt ? ' br__pt--halt' : c.danger ? ' br__pt--danger' : '') } : null });
      return;
    }
    const g = stage(el, H), m = measure(g.d);
    g.svg.appendChild(svgEl('path', { class: 'd-track', d: g.d }));
    const map = { stub: () => g.svg.appendChild(svgEl('path', { class: 'd-live', d: seg(m, 0, 0.16) })),
      unconf: () => g.svg.appendChild(svgEl('path', { class: 'd-unconf', d: seg(m, 0, 1) })),
      half: () => { g.svg.appendChild(svgEl('path', { class: 'd-live', d: seg(m, 0, 0.5) })); g.svg.appendChild(svgEl('path', { class: 'd-unconf', d: seg(m, 0.5, 1) })); },
      full: () => g.svg.appendChild(svgEl('path', { class: 'd-live', d: seg(m, 0, 1) })),
      off: () => { g.svg.appendChild(svgEl('path', { class: 'd-live', d: seg(m, 0, 0.5) })); g.svg.appendChild(svgEl('path', { class: 'd-off', d: seg(m, 0.5, 1) })); },
      past: () => g.svg.appendChild(svgEl('path', { class: 'd-past', d: seg(m, 0, 1) })) };
    (map[c.deck] || map.unconf)();
    if (c.b) { const p = m.at(c.b === 1 ? 1 : 0.5); if (c.b !== 1) g.svg.appendChild(svgEl('circle', { class: 'br__pt' + (c.halt ? ' br__pt--halt' : c.danger ? ' br__pt--danger' : ''), cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 4.6 })); }
    if (c.deck === 'full') { [0, 1].forEach(t => { const e = m.at(t); g.svg.appendChild(svgEl('line', { class: 'cap', x1: e.x.toFixed(1), y1: (e.y - 10).toFixed(1), x2: e.x.toFixed(1), y2: (e.y + 4).toFixed(1) })); }); }
    const A = h('div', 'brc__party brc__party--l'); A.style.top = g.y0 + 'px';
    A.appendChild(h('i')); A.appendChild(h('b', null, o.a.name)); A.appendChild(h('span', null, o.a.role)); g.st.appendChild(A);
    const B = h('div', 'brc__party brc__party--r' + (c.r === 'on' ? '' : ' brc__party--wait')); B.style.top = g.y0 + 'px';
    B.appendChild(h('i')); B.appendChild(h('b', null, c.r === 'on' ? o.b.name : 'Not yet identified')); B.appendChild(h('span', null, c.r === 'on' ? o.b.role : 'Awaiting a counterparty')); g.st.appendChild(B);
    if (c.mid) { const M = h('div', 'brc__mid'); M.style.top = (g.y0 + 6) + 'px'; M.appendChild(h('b', null, c.mid[0])); if (c.mid[1]) M.appendChild(h('u', null, c.mid[1])); g.st.appendChild(M); }
    m.done(); fitLater(g.st);
    if (c.travel && o.animate && !still(el)) {
      const run = h('div', 'br__runner br__runner--go');
      run.style.offsetPath = `path("${seg(m, 0.5, 1)}")`; run.style.left = '-4.5px'; run.style.top = '-4.5px';
      g.st.appendChild(run); setTimeout(() => run.remove(), 800);
    }
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', 'Counterparty connection: ' + (c.mid ? c.mid[0] : 'one party present') + '. Relevance only — not a confirmed match.');
  }

  /* ================= 5 · DEAL ROOM ================= */
  function dealroom(el, o) {
    const vertical = (el.clientWidth || 960) < VBREAK;
    el.classList.toggle('br--v', vertical); el.classList.add('brd');
    const at = o.at;
    if (vertical) {
      el.innerHTML = '';
      const rows = h('div', 'br__rows br__rows--arc');
      o.participants.forEach(p => {
        const d = h('div', 'brdp brdp--' + (p.principal ? 'prin' : 'add') + (p.state === 'awaited' ? ' brdp--wait' : p.state === 'accepted' ? ' brdp--acc' : '') + (p.next ? ' brdp--next' : ''));
        d.appendChild(h('span', 'brdp__n')); d.appendChild(h('i', 'brdp__cap'));
        d.appendChild(h('div', 'brdp__r', p.role));
        d.appendChild(h('div', 'brdp__s', p.state === 'awaited' ? 'Awaited' : p.state === 'accepted' ? 'Accepted' : 'Joined'));
        if (p.next) d.appendChild(h('div', 'brdp__tag', 'Owns next action'));
        rows.appendChild(d);
      });
      el.appendChild(rows);
      elevation(rows, { rowSel: '.brdp', nodeSel: '.brdp__n',
        segments: () => [{ cls: 'd-live', from: 0, to: 1 }] });
      return;
    }
    /* a shallower rise than the other bridges: the active milestone is named
       ABOVE the deck, so the arc must leave that band clear. */
    const H = o.deckH || 104, g = stage(el, H, 46), m = measure(g.d);
    const mts = tsFor(o.milestones.length);
    g.svg.appendChild(svgEl('path', { class: 'd-track', d: g.d }));
    g.svg.appendChild(svgEl('path', { class: 'd-live', d: seg(m, 0, mts[at]) }));
    if (at < o.milestones.length - 1) g.svg.appendChild(svgEl('path', { class: 'd-fwd', d: seg(m, mts[at], 1) }));
    /* Every milestone is a node on the deck; only the ACTIVE one is named.
       Eight mono labels across one deck cannot be read — and the room's
       reader needs the current stage, not a printed list. */
    o.milestones.forEach((s, i) => {
      const p = m.at(mts[i]);
      g.svg.appendChild(svgEl('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: i === at ? 4.4 : 3.2, fill: i === at ? 'var(--pf-gold-ink)' : i < at ? 'var(--pf-ink)' : 'var(--pf-surface)', stroke: i === at ? 'var(--pf-gold-ink)' : 'var(--pf-ink)', 'stroke-width': 1.5, opacity: i > at ? .5 : 1 }));
      if (i !== at) return;
      const d = h('div', 'brd__ms brd__ms--on');
      d.appendChild(h('b', null, s));
      d.appendChild(h('u', null, 'Stage ' + (at + 1) + ' of ' + o.milestones.length));
      d.style.left = p.x.toFixed(1) + 'px'; d.style.top = '0px';
      g.st.appendChild(d);
      requestAnimationFrame(() => { d.style.top = Math.max(0, p.y - d.offsetHeight - 13) + 'px'; });
    });
    /* participants are PIERS below the deck, in the order they joined */
    const pts = tsFor(o.participants.length + 1).slice(0, o.participants.length).map(t => m.at(t));
    const yB = Math.max(...pts.map(p => p.y)), pW = blockW(pts, 140);
    o.participants.forEach((p, i) => {
      const d = h('div', 'brdp brdp--' + (p.principal ? 'prin' : 'add') + (p.state === 'awaited' ? ' brdp--wait' : p.state === 'accepted' ? ' brdp--acc' : '') + (p.next ? ' brdp--next' : ''));
      const pt = pts[i];
      d.appendChild(h('span', 'brdp__n'));
      const pier = h('span', 'brdp__p'); pier.style.height = ((p.principal ? 30 : 22) + yB - pt.y).toFixed(1) + 'px'; d.appendChild(pier);
      d.appendChild(h('div', 'brdp__r', p.role));
      d.appendChild(h('div', 'brdp__s', p.state === 'awaited' ? 'Awaited' : p.state === 'accepted' ? 'Accepted' : 'Joined'));
      if (p.next) { d.appendChild(h('i', 'brdp__cap')); d.appendChild(h('div', 'brdp__tag', 'Owns next action')); }
      d.style.left = pt.x.toFixed(1) + 'px'; d.style.top = (pt.y - 4.5).toFixed(1) + 'px'; d.style.width = pW + 'px';
      g.st.appendChild(d);
    });
    m.done(); fitLater(g.st);
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', 'Deal Room. Procedural stage: ' + o.milestones[at] + '. ' + o.participants.length + ' participants. ' + (o.participants.find(p => p.next) ? (o.participants.find(p => p.next).role + ' owns the next action.') : ''));
  }

  return { route, progress, header, journey, connection, dealroom, value, band, BANDS, VBREAK };
})();
