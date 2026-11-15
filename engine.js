'use strict';
/* ============================================================
   SCIENTIFIC ENGINE — pure functions, no DOM.
   Normalisation:   z = (t(x) - lo) / (hi - lo)   where t = identity or log10(x + offset)
   Continuous sim:  s = exp(-(|zA - zB| / sigma)^2)            (Gaussian kernel, sigma adjustable)
   Categorical sim: s = curator affinity matrix value in [0,1]  (1 when identical)
   Similarity:      100 * sum(w_i s_i) / sum(w_i)   over parameters present in BOTH regions
   Confidence:      kappa = sum(w_i c_i over used) / sum(w_i over comparable) ; adjusted = raw * kappa
   ============================================================ */
const ENG = (() => {
  const PARAMS = (typeof globalThis.PARAMS !== 'undefined') ? globalThis.PARAMS : (typeof require !== 'undefined' ? require('./data.js').PARAMS : []);
  const CAT_LABEL = (typeof globalThis.CAT_LABEL !== 'undefined') ? globalThis.CAT_LABEL : (typeof require !== 'undefined' ? require('./data.js').CAT_LABEL : {});
  const CONF = typeof GRADE_CONF !== 'undefined' ? GRADE_CONF : (typeof require !== 'undefined' ? require('./data.js').GRADE_CONF : { A: 0.9, B: 0.7, C: 0.45 });
  const T = (p, x) => (p.scale === 'log' ? Math.log10(x + (p.off || 0)) : x);

  function initRanges(regions) {
    PARAMS.forEach(p => {
      if (p.type !== 'num') return;
      const vals = [];
      regions.forEach(r => { const x = r.v[p.id]; if (typeof x === 'number') vals.push(T(p, x)); });
      p.lo = Math.min(...vals); p.hi = Math.max(...vals);
      if (p.hi === p.lo) p.hi = p.lo + 1;
      // mean of normalised values, used to centre vectors for cosine similarity
      p.meanZ = vals.map(v => (v - p.lo) / (p.hi - p.lo)).reduce((a, b) => a + b, 0) / vals.length;
    });
  }
  function norm(p, x) { return (T(p, x) - p.lo) / (p.hi - p.lo); }
  const _X = (typeof X !== 'undefined') ? X : 'NA';
  const status = x => (x === _X ? 'na' : (x === null || x === undefined ? 'missing' : 'ok'));

  function defaultWeights() { return Object.fromEntries(PARAMS.map(p => [p.id, p.w])); }

  function compare(A, B, opt) {
    const W = (opt && opt.weights) || defaultWeights();
    const sigma = (opt && opt.sigma) || 0.35;
    const rows = [];
    let wI = 0, wU = 0, wMiss = 0, wsS = 0, wcc = 0, wcS = 0, d2 = 0, wd2 = 0, nU = 0;
    const vecA = [], vecB = [];
    PARAMS.forEach(p => {
      const a = A.v[p.id], b = B.v[p.id], sa = status(a), sb = status(b), w = W[p.id] ?? p.w;
      const row = { p, a, b, w, ga: A.g[p.id], gb: B.g[p.id] };
      if (sa === 'na' || sb === 'na') {
        row.state = 'na'; rows.push(row); return;       // planet-specific, not comparable
      }
      wI += w;
      if (sa === 'missing' || sb === 'missing') {
        row.state = 'missing'; wMiss += w; rows.push(row); return;   // never treated as 0 or as a match
      }
      let s, d;
      if (p.type === 'num') {
        row.za = norm(p, a); row.zb = norm(p, b);
        d = Math.abs(row.za - row.zb);
        s = Math.exp(-Math.pow(d / sigma, 2));
        vecA.push(row.za - p.meanZ); vecB.push(row.zb - p.meanZ);
      } else {
        s = p.sim(a, b); d = 1 - s;
      }
      row.state = 'used'; row.d = d; row.s = s;
      row.conf = Math.min(CONF[row.ga], CONF[row.gb]);
      row.contrib = w * s;
      wU += w; wsS += w * s; wcc += w * row.conf; d2 += d * d; wd2 += w * d * d; nU++;
      rows.push(row);
    });
    const used = rows.filter(r => r.state === 'used');
    const raw = wU > 0 ? 100 * wsS / wU : null;
    const kappa = wI > 0 ? wcc / wI : 0;
    const adjusted = raw === null ? null : raw * kappa;
    let dot = 0, na = 0, nb = 0;
    vecA.forEach((x, i) => { dot += x * vecB[i]; na += x * x; nb += vecB[i] * vecB[i]; });
    const cosine = vecA.length >= 3 && na > 0 && nb > 0 ? dot / Math.sqrt(na * nb) : null;
    const ranked = used.slice().sort((x, y) => (y.s * y.w) - (x.s * x.w));
    const byS = used.filter(r => r.w > 0).sort((x, y) => y.s - x.s);
    return {
      A, B, rows, raw, adjusted, kappa, sigma,
      confMean: wU > 0 ? wcc / wU : null,
      level: kappa >= 0.6 ? 'High' : kappa >= 0.4 ? 'Moderate' : 'Low',
      missingPct: wI > 0 ? 100 * wMiss / wI : 0,
      naCount: rows.filter(r => r.state === 'na').length, missingCount: rows.filter(r => r.state === 'missing').length, usedCount: used.length,
      euclid: nU ? Math.sqrt(d2) : null, euclidNorm: nU ? Math.sqrt(d2 / nU) : null, wEuclid: wU > 0 ? Math.sqrt(wd2 / wU) : null,
      cosine, wU, wI, wsS, wcc,
      strongest: byS.slice(0, 3), weakest: byS.slice(-3).reverse(), ranked
    };
  }

  function rank(src, candidates, opt) {
    return candidates.filter(c => c.id !== src.id).map(c => compare(src, c, opt)).filter(r => r.adjusted !== null)
      .sort((a, b) => b.adjusted - a.adjusted);
  }

  // Sensitivity: scale each weight by 0.5 and 1.5 (one at a time), track rank/score movement.
  function sensitivity(src, candidates, opt) {
    const W0 = (opt && opt.weights) || defaultWeights();
    const base = rank(src, candidates, opt);
    const baseRank = {}; base.forEach((r, i) => { baseRank[r.B.id] = i + 1; });
    const stat = {}; base.forEach(r => { stat[r.B.id] = { rank0: baseRank[r.B.id], minR: baseRank[r.B.id], maxR: baseRank[r.B.id], minS: r.adjusted, maxS: r.adjusted }; });
    let top1Changes = 0, runs = 0;
    PARAMS.forEach(p => {
      [0.5, 1.5].forEach(f => {
        const W = Object.assign({}, W0); W[p.id] = (W0[p.id] ?? p.w) * f;
        const rr = rank(src, candidates, Object.assign({}, opt, { weights: W }));
        runs++;
        if (rr[0] && base[0] && rr[0].B.id !== base[0].B.id) top1Changes++;
        rr.forEach((r, i) => { const s = stat[r.B.id]; if (!s) return; s.minR = Math.min(s.minR, i + 1); s.maxR = Math.max(s.maxR, i + 1); s.minS = Math.min(s.minS, r.adjusted); s.maxS = Math.max(s.maxS, r.adjusted); });
      });
    });
    return { base, stat, top1Changes, runs };
  }

  // Effect of each parameter on a single pair: drop it (w=0) or double it.
  function tornado(A, B, opt) {
    const W0 = (opt && opt.weights) || defaultWeights();
    const base = compare(A, B, opt).raw;
    return PARAMS.map(p => {
      const W1 = Object.assign({}, W0), W2 = Object.assign({}, W0);
      W1[p.id] = 0; W2[p.id] = (W0[p.id] ?? p.w) * 2;
      const a = compare(A, B, Object.assign({}, opt, { weights: W1 })).raw, b = compare(A, B, Object.assign({}, opt, { weights: W2 })).raw;
      return { p, drop: a === null || base === null ? null : a - base, dbl: b === null || base === null ? null : b - base };
    });
  }

  /* ----- explanation text built from computed numbers ----- */
  const fmt = (p, x) => {
    if (x === null || x === undefined) return 'missing';
    if (x === X) return 'n/a';
    if (p.type === 'cat') return CAT_LABEL[x] || x;
    if (p.scale === 'log' && Math.abs(x) < 0.01) return x.toExponential(1);
    if (typeof x === 'number' && Math.abs(x) >= 1000) return Math.round(x).toLocaleString('en-US');
    return String(Math.round(x * 100) / 100);
  };
  function explain(c) {
    const line = r => r.p.name + ' (' + fmt(r.p, r.a) + ' vs ' + fmt(r.p, r.b) + (r.p.unit ? ' ' + r.p.unit : '') + ')';
    return {
      similar: c.strongest.filter(r => r.s >= 0.5).map(line),
      differs: c.weakest.filter(r => r.s < 0.5).map(line)
    };
  }

  /* ----- Exploration opportunity scoring (configurable weights, transparent, data-driven) ----- */
  const clamp = x => Math.max(0, Math.min(1, x));
  const EXPLORE = [
    { id: 'access', name: 'Terrain accessibility', w: 1.2, basis: '1 − mean slope / 25°', f: (r) => num(r, 'slope', s => 1 - clamp(s / 25)) },
    { id: 'geodiv', name: 'Geological diversity', w: 1.0, basis: 'distinct units in sample / 6', f: (r) => (typeof r.units === 'number' ? { v: clamp(r.units / 6), note: r.units + ' units' } : null) },
    { id: 'science', name: 'Scientific research value', w: 1.2, basis: 'papers within 3 graph hops / 3', f: (r, ctx) => { const n = ctx && ctx.paperCount ? ctx.paperCount(r.id) : 0; return { v: clamp(n / 3), note: n + ' linked papers' }; } },
    { id: 'water', name: 'Water / ice indicators', w: 1.0, basis: 'normalised log water indicator', f: (r) => num(r, 'water', (x) => clamp(norm(PARAM.water, x))) },
    { id: 'hazard', name: 'Low environmental hazard', w: 1.0, basis: '1 − (0.6·slope/25° + 0.4·fines cover)', f: (r) => (typeof r.v.slope === 'number' && typeof r.v.dust === 'number' ? { v: clamp(1 - (0.6 * r.v.slope / 25 + 0.4 * r.v.dust / 100)), note: 'slope ' + r.v.slope + '°, fines ' + r.v.dust + '%' } : null) },
    { id: 'rad', name: 'Low radiation exposure', w: 0.8, basis: '1 − normalised log dose', f: (r) => num(r, 'rad', (x) => 1 - clamp(norm(PARAM.rad, x))) },
    { id: 'data', name: 'Data availability', w: 0.8, basis: 'evidence mass: Σ grade confidence over available parameters / count', f: (r) => {
      let s = 0, n = 0; PARAMS.forEach(p => { const x = r.v[p.id]; if (x === X) return; n++; if (x !== null) s += CONF[r.g[p.id]]; }); return { v: clamp(s / n), note: Math.round(100 * s / n) + '% evidence mass' }; } },
    { id: 'thermal', name: 'Rover thermal constraint', w: 0.8, basis: '1 inside −40…+40 °C, falling to 0 at 100 °C outside', f: (r) => num(r, 'temp', (t) => clamp(1 - Math.max(0, Math.abs(t) - 40) / 100)) }
  ];
  function num(r, id, fn) { const x = r.v[id]; return typeof x === 'number' ? { v: fn(x), note: fmt(PARAM[id], x) + ' ' + PARAM[id].unit } : null; }
  function exploration(r, W, ctx) {
    const items = EXPLORE.map(c => { const out = c.f(r, ctx); return { c, w: (W && W[c.id] !== undefined) ? W[c.id] : c.w, v: out ? out.v : null, note: out ? out.note : 'no data in sample' }; });
    let sw = 0, sv = 0; items.forEach(i => { if (i.v !== null) { sw += i.w; sv += i.w * i.v; } });
    const totalW = items.reduce((a, i) => a + i.w, 0);
    return { r, items, score: sw > 0 ? 100 * sv / sw : null, supportedPct: totalW > 0 ? 100 * sw / totalW : 0, unsupported: items.filter(i => i.v === null) };
  }

  /* ----- fingerprint ----- */
  function bodyRange(pid, body) {
    const p = PARAM[pid]; const vals = REGIONS.filter(r => r.body === body && typeof r.v[pid] === 'number').map(r => r.v[pid]);
    return vals.length ? [Math.min(...vals), Math.max(...vals)] : null;
  }
  function fingerprint(r) {
    return PARAMS.map(p => {
      const x = r.v[p.id]; const st = status(x);
      return { p, value: x, state: st, z: st === 'ok' && p.type === 'num' ? clamp(norm(p, x)) : null, grade: r.g[p.id], conf: CONF[r.g[p.id]],
        src: DS[srcFor(p.id, r)], range: p.type === 'num' ? bodyRange(p.id, r.body) : null, interp: p.interp[r.body] };
    });
  }
  const api = { initRanges, norm, compare, rank, sensitivity, tornado, explain, fmt, exploration, EXPLORE, fingerprint, defaultWeights, status, clamp, bodyRange };
  if (typeof module !== 'undefined') module.exports = api;
  return api;
})();
