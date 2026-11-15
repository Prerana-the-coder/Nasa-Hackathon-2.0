'use strict';
/* ============================================================
   KNOWLEDGE GRAPH — real node/edge structure built from the registries (regions, missions, instruments,
   observations, papers, formations, datasets) plus analog edges computed by the similarity engine.
   ============================================================ */
const GRAPH = (() => {
  const TYPE = {
    planet: { label: 'Planetary bodies', color: '#ffffff' }, region: { label: 'Locations', color: '#38d8ff' }, mission: { label: 'Missions', color: '#7aa7ff' }, instrument: { label: 'Instruments', color: '#b69cff' },
    observation: { label: 'Observations', color: '#ffd166' }, paper: { label: 'Papers', color: '#e3ebfa' }, formation: { label: 'Formations', color: '#7cf0b5' }, dataset: { label: 'Datasets', color: '#ff9db1' }
  };
  const BODY_COL = { earth: '#4aa3ff', mars: '#ff8a50', moon: '#c9c3e6' };
  function build(opt) {
    const _R = typeof REGIONS !== 'undefined' ? REGIONS : require('./data.js').REGIONS;
    const _M = typeof MISSIONS !== 'undefined' ? MISSIONS : require('./data.js').MISSIONS;
    const _I = typeof INSTRUMENTS !== 'undefined' ? INSTRUMENTS : require('./data.js').INSTRUMENTS;
    const _O = typeof OBSERVATIONS !== 'undefined' ? OBSERVATIONS : require('./data.js').OBSERVATIONS;
    const _F = typeof FORMATIONS !== 'undefined' ? FORMATIONS : require('./data.js').FORMATIONS;
    const _P = typeof PAPERS !== 'undefined' ? PAPERS : require('./data.js').PAPERS;
    const _D = typeof DATASETS !== 'undefined' ? DATASETS : require('./data.js').DATASETS;
    const _CE = typeof CURATED_EDGES !== 'undefined' ? CURATED_EDGES : require('./data.js').CURATED_EDGES;
    const _DC = typeof DS_COVER !== 'undefined' ? DS_COVER : require('./data.js').DS_COVER;
    const _DP = typeof DS_PRODUCER !== 'undefined' ? DS_PRODUCER : require('./data.js').DS_PRODUCER;
    const _B = typeof BODIES !== 'undefined' ? BODIES : require('./data.js').BODIES;

    const nodes = {}, edges = [];
    const add = (id, type, label, body, extra) => { nodes[id] = Object.assign({ id, type, label, body: body || null }, extra || {}); };
    Object.entries(_B).forEach(([id, body]) => add('planet:' + id, 'planet', body.name, id, { radiusKm: body.radiusKm }));
    _R.forEach(r => {
      add('r:' + r.id, 'region', r.name, r.body, { region: r.id, lat: r.lat, lon: r.lon, country: r.country });
      edges.push({ a: 'planet:' + r.body, b: 'r:' + r.id, type: 'has location', expl: r.name + ' is catalogued as a location on ' + _B[r.body].name + '.', ref: null, status: 'hierarchy' });
    });
    _M.forEach(m => add('m:' + m.id, 'mission', m.name, m.body, { mission: m.id }));
    _I.forEach(([k, l]) => add('i:' + k, 'instrument', l, null));
    _O.forEach(([k, l]) => add('o:' + k, 'observation', l, null));
    _F.forEach(([k, l]) => add('f:' + k, 'formation', l, null));
    _P.forEach(p => add('p:' + p.id, 'paper', p.au.split(',')[0].replace(/ &.*/, '') + ' ' + p.yr, null, { paper: p.id }));
    _D.filter(d => d.id !== 'd-curated').forEach(d => add('d:' + d.id, 'dataset', d.name.length > 38 ? d.name.slice(0, 36) + '…' : d.name, d.body === 'all' ? null : d.body, { dataset: d.id }));
    _CE.forEach(e => edges.push(Object.assign({}, e)));
    Object.entries(_DC).forEach(([d, regs]) => regs.forEach(r => edges.push({ a: 'd:' + d, b: 'r:' + r, type: 'covers', expl: 'Dataset coverage as catalogued in the sample registry (not verified against the live archive).', ref: null, status: 'dataset-coverage' })));
    Object.entries(_DP).forEach(([d, i]) => edges.push({ a: 'i:' + i, b: 'd:' + d, type: 'produced', expl: 'Instrument that generates this dataset.', ref: null, status: 'curated' }));
    // computed analog edges (top matches by confidence-adjusted similarity under current weights)
    const o = opt || {};
    const _E = typeof ENG !== 'undefined' ? ENG : (function() { try { return require('./engine.js'); } catch(e) { return null; } })();
    if (_E && _E.rank) {
      _R.filter(r => r.body !== 'earth').forEach(r => {
        _E.rank(r, _R.filter(x => x.body === 'earth'), o).slice(0, 2).forEach((c, i) => edges.push({ a: 'r:' + c.B.id, b: 'r:' + r.id, type: 'computed analog', expl: 'Engine result: confidence-adjusted similarity ' + (c.adjusted !== null ? c.adjusted.toFixed(1) : '—') + ' (raw ' + (c.raw !== null ? c.raw.toFixed(1) : '—') + '), rank ' + (i + 1) + ' of ' + _R.filter(x => x.body === 'earth').length + ' Earth candidates. A screening index, not a validated analog.', ref: null, status: 'computed', score: c.adjusted }));
      });
    }
    const keep = edges.filter(e => nodes[e.a] && nodes[e.b]);
    const adj = {}; Object.keys(nodes).forEach(k => { adj[k] = []; });
    keep.forEach((e, i) => { e.i = i; adj[e.a].push({ to: e.b, e }); adj[e.b].push({ to: e.a, e }); });
    // propagate body tags to untagged nodes (instruments, observations, formations, papers)
    for (let pass = 0; pass < 3; pass++) Object.values(nodes).forEach(n => { if (!n.body) { const nb = adj[n.id].map(x => nodes[x.to].body).filter(Boolean); if (nb.length) n.body = nb[0]; } });
    return { nodes, edges: keep, adj };
  }
  function paperCount(g, regionId) {
    const start = 'r:' + regionId, seen = new Set([start]); let frontier = [start], papers = new Set();
    for (let d = 0; d < 3; d++) { const next = []; frontier.forEach(id => g.adj[id].forEach(({ to, e }) => { if (e.status === 'dataset-coverage' || e.status === 'computed' || e.status === 'hierarchy' || seen.has(to)) return; seen.add(to); if (g.nodes[to].type === 'paper') papers.add(to); else if (g.nodes[to].type !== 'dataset') next.push(to); })); frontier = next; }
    return papers.size;
  }
  function ego(g, id, depth) {
    const seen = new Set([id]); let fr = [id];
    for (let d = 0; d < depth; d++) { const nx = []; fr.forEach(k => { if (g.nodes[k].type === 'planet') return; g.adj[k].forEach(({ to, e }) => { if (e.status === 'dataset-coverage' || seen.has(to) || g.nodes[to].type === 'dataset') return; seen.add(to); nx.push(to); }); }); fr = nx; }
    return seen;
  }
  /* force layout (repulsion, springs, gravity). Deterministic start from a type-sorted ring. */
  function layout(ids, edges, W, H, iters) {
    const list = ids.slice().sort(), n = list.length, P = {};
    list.forEach((id, i) => { const a = i / n * 6.283; P[id] = { x: W / 2 + Math.cos(a) * W * 0.32, y: H / 2 + Math.sin(a) * H * 0.32, vx: 0, vy: 0 }; });
    const E = edges.filter(e => P[e.a] && P[e.b]); const k = Math.sqrt((W * H) / Math.max(n, 1)) * 0.7;
    for (let it = 0; it < (iters || 260); it++) {
      const cool = 1 - it / (iters || 260);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = P[list[i]], b = P[list[j]]; let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy + 0.01, d = Math.sqrt(d2); const f = (k * k) / d2 * 0.9; dx /= d; dy /= d; a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f; }
      E.forEach(e => { const a = P[e.a], b = P[e.b]; let dx = b.x - a.x, dy = b.y - a.y; const d = Math.sqrt(dx * dx + dy * dy) + 0.01, f = (d - k * 0.9) * 0.06; dx /= d; dy /= d; a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f; });
      list.forEach(id => { const p = P[id]; p.vx += (W / 2 - p.x) * 0.012; p.vy += (H / 2 - p.y) * 0.012; p.x += Math.max(-12, Math.min(12, p.vx)) * cool; p.y += Math.max(-12, Math.min(12, p.vy)) * cool; p.vx *= 0.55; p.vy *= 0.55; p.x = Math.max(30, Math.min(W - 30, p.x)); p.y = Math.max(22, Math.min(H - 22, p.y)); });
    }
    return P;
  }
  function hierarchyLayout(g, ids, W, H) {
    const list = ids.filter(id => g.nodes[id]), P = {};
    const bodyOrder = ['earth', 'moon', 'mars'];
    const activeBodies = bodyOrder.filter(body => list.some(id => g.nodes[id].body === body));
    const centers = {};
    activeBodies.forEach((body, i) => { centers[body] = W * (i + 0.5) / Math.max(activeBodies.length, 1); });
    const columnWidth = activeBodies.length === 1 ? W * 0.82 : W / Math.max(activeBodies.length, 1) * 0.88;
    const minCellWidth = 128;
    const regionsByBody = {};
    const relatedByBody = {};
    activeBodies.forEach(body => {
      regionsByBody[body] = list.filter(id => g.nodes[id].type === 'region' && g.nodes[id].body === body)
        .sort((a, b) => g.nodes[a].label.localeCompare(g.nodes[b].label));
      relatedByBody[body] = list.filter(id => g.nodes[id].type !== 'planet' && g.nodes[id].type !== 'region' && g.nodes[id].body === body)
        .sort((a, b) => g.nodes[a].type.localeCompare(g.nodes[b].type) || g.nodes[a].label.localeCompare(g.nodes[b].label));
    });
    const regionColumns = Math.max(1, Math.floor(columnWidth / minCellWidth));
    const regionRows = Math.max(0, ...activeBodies.map(body => Math.ceil(regionsByBody[body].length / regionColumns)));
    const locationTop = 108, locationGap = 22;
    const relatedTop = locationTop + regionRows * locationGap + 36;
    const relatedColumns = Math.max(1, Math.floor(columnWidth / minCellWidth));
    const relatedRows = Math.max(0, ...activeBodies.map(body => Math.ceil(relatedByBody[body].length / relatedColumns)));

    list.filter(id => g.nodes[id].type === 'planet').forEach(id => {
      P[id] = { x: centers[g.nodes[id].body], y: 38, labelBelow: true };
    });

    activeBodies.forEach(body => {
      const left = centers[body] - columnWidth / 2;
      const regions = regionsByBody[body];
      regions.forEach((id, i) => {
        const col = i % regionColumns, row = Math.floor(i / regionColumns);
        const cellWidth = columnWidth / regionColumns;
        P[id] = { x: left + col * cellWidth + 10, y: locationTop + row * locationGap, labelMaxChars: Math.max(8, Math.floor((cellWidth - 28) / 4.5)) };
      });

      const related = relatedByBody[body];
      related.forEach((id, i) => {
        const col = i % relatedColumns, row = Math.floor(i / relatedColumns);
        const cellWidth = columnWidth / relatedColumns;
        P[id] = { x: left + col * cellWidth + 10, y: relatedTop + row * 18, labelMaxChars: Math.max(8, Math.floor((cellWidth - 28) / 4.5)) };
      });
    });

    const unassigned = list.filter(id => !P[id]).sort((a, b) => g.nodes[a].label.localeCompare(g.nodes[b].label));
    const unassignedColumns = Math.max(1, Math.floor(W / minCellWidth));
    const unassignedCellWidth = W / unassignedColumns;
    const unassignedTop = relatedTop + relatedRows * 18 + (unassigned.length ? 24 : 0);
    unassigned.forEach((id, i) => {
      const col = i % unassignedColumns, row = Math.floor(i / unassignedColumns);
      P[id] = { x: col * unassignedCellWidth + 10, y: unassignedTop + row * 18, labelMaxChars: Math.max(8, Math.floor((unassignedCellWidth - 28) / 4.5)) };
    });
    const unassignedRows = Math.ceil(unassigned.length / unassignedColumns);
    P.height = Math.max(300, Math.ceil(unassigned.length ? unassignedTop + unassignedRows * 18 + 24 : relatedTop + relatedRows * 18 + 24));
    return P;
  }
  function displayLabel(node, maxChars) {
    let label = node.type === 'region' ? node.label.replace(/\s*\([^)]*\)\s*$/, '') : node.label;
    if (label.length > maxChars) label = label.slice(0, Math.max(1, maxChars - 1)).trimEnd() + '…';
    return label;
  }
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function svg(g, P, st) {
    const nodeIds = st.nodes || Object.keys(P), visibleNodes = new Set(nodeIds);
    const hl = st.focus && visibleNodes.has(st.focus) && g.adj[st.focus] ? st.focus : null, nb = hl ? new Set(g.adj[hl].map(x => x.to).concat([hl])) : null, q = (st.query || '').toLowerCase();
    let out = '';
    (st.edges || g.edges).forEach(e => { const a = P[e.a], b = P[e.b]; if (!a || !b || !visibleNodes.has(e.a) || !visibleNodes.has(e.b)) return; const on = hl && (e.a === hl || e.b === hl), sel = st.edgeSel === e.i;
      const relationMatch = !st.edgeType || e.type === st.edgeType;
      const queryMatch = !q || g.nodes[e.a].label.toLowerCase().includes(q) || g.nodes[e.b].label.toLowerCase().includes(q);
      const typeMatch = !st.filterType || g.nodes[e.a].type === st.filterType || g.nodes[e.b].type === st.filterType;
      const dim = !relationMatch || !queryMatch || !typeMatch || (hl && !on);
      const col = e.status === 'hierarchy' ? '#c4b5fd' : e.status === 'computed' ? '#7cf0b5' : e.status === 'hypothesis' ? '#ffd166' : '#4a7bc0';
      const edgeOpacity = on || sel ? .9 : e.status === 'hierarchy' ? .62 : .28;
      out += `<g class="gedge${sel ? ' is-selected' : ''}" data-edge="${e.i}" tabindex="0" role="button" aria-label="${esc(g.nodes[e.a].label)} to ${esc(g.nodes[e.b].label)}: ${esc(e.type)}" opacity="${dim ? .1 : 1}">`;
      out += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${col}" stroke-width="${sel ? 3 : on ? 2 : e.status === 'hierarchy' ? 1.6 : 1}" stroke-opacity="${edgeOpacity}" ${e.status === 'hypothesis' ? 'stroke-dasharray="5 4"' : e.status === 'hierarchy' ? 'stroke-dasharray="3 3"' : ''}/>`;
      out += `<line class="gedge-hit" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#fff" stroke-opacity=".01" stroke-width="14" pointer-events="stroke"/></g>`; });
    nodeIds.forEach(id => { const n = g.nodes[id], p = P[id]; if (!n || !p) return; const t = TYPE[n.type], typeContext = st.filterType === 'planet' && n.type === 'region', dim = (hl && !nb.has(id)) || (q && !(n.label.toLowerCase().includes(q))) || (st.filterType && !st.edgeType && n.type !== st.filterType && !typeContext); const r = n.type === 'planet' ? 11 : n.type === 'region' ? 9 : n.type === 'mission' ? 7.5 : 6;
      const hit = q && n.label.toLowerCase().includes(q);
      const labelMaxChars = st.labelMaxChars || p.labelMaxChars || 22;
      const label = displayLabel(n, labelMaxChars);
      out += `<g class="gnode${id === hl ? ' is-selected' : ''}" data-node="${esc(id)}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})" opacity="${dim ? .22 : 1}" tabindex="0" role="button" aria-pressed="${id === hl}" aria-label="${esc(n.label)} (${t.label})">`;
      if (id === hl || hit) out += `<circle r="${r + 6}" fill="none" stroke="#fff" stroke-width="1.5" stroke-opacity=".8"/>`;
      out += `<circle r="${r}" fill="${n.type === 'planet' ? BODY_COL[n.body] : t.color}" fill-opacity=".92" stroke="${n.type === 'planet' ? '#fff' : n.body ? BODY_COL[n.body] : '#0a1428'}" stroke-width="${n.type === 'planet' ? 2.5 : 2}"/>`;
      out += `<text x="${p.labelBelow ? 0 : r + 4}" y="${p.labelBelow ? r + 13 : 3}" text-anchor="${p.labelBelow ? 'middle' : 'start'}" class="glabel">${esc(label)}</text></g>`; });
    return out;
  }
  return { TYPE, BODY_COL, build, paperCount, ego, layout, hierarchyLayout, svg };
})();
if (typeof module !== 'undefined') module.exports = GRAPH;
