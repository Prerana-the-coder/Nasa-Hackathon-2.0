'use strict';
/* ============================================================
   SOLAR SYSTEM SCOPE — centre hero of the dashboard (Sun, Earth, Moon, Mars).
   Replaces the old Earth/Moon/Mars globe (globe.js).

   Public API (used by app.js):
     SOLAR.init(hostEl, { body(id), region(id) })
     SOLAR.focus('earth' | 'moon' | 'mars' | 'sun')   fly the camera to a body
     SOLAR.overview()                                 back to the full view
     SOLAR.setActiveRegion(regionId)                  highlight a site chip
     SOLAR.setLinks([{ from, to, color }])            analog links between bodies
     SOLAR.resize()
   ============================================================ */
const SOLAR = (() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const short = n => String(n).split('(')[0].trim();
const regionList = () => (typeof REGIONS !== 'undefined' ? REGIONS : []);
const regionMap = () => (typeof REG !== 'undefined' ? REG : {});

/* ---------- procedural textures ---------- */
const hash = (x, y, s) => { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };
const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi,
  u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return (hash(xi, yi, s) * (1 - u) + hash(xi + 1, yi, s) * u) * (1 - v) + (hash(xi, yi + 1, s) * (1 - u) + hash(xi + 1, yi + 1, s) * u) * v; };
const fbm = (x, y, s) => { let a = .5, f = 1, t = 0; for (let i = 0; i < 5; i++) { t += a * vn(x * f, y * f, s + i); f *= 2; a *= .5; } return t; };
const tn = (u, v, sc, s) => { const P = sc * 2; return fbm(u * P, v * sc, s) * (1 - u) + fbm((u - 1) * P, v * sc, s) * u; }; // wraps horizontally
const mix = (a, b, t) => { t = Math.max(0, Math.min(1, t)); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
function tex(fn, w = 256, h = 128) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), d = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = fn(x / w, y / h), i = (y * w + x) * 4; d.data[i] = p[0]; d.data[i + 1] = p[1]; d.data[i + 2] = p[2]; d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
const T = {
  sun: (u, v) => { const n = tn(u, v, 6, 1), m = mix([255, 120, 10], [255, 235, 110], n * 1.6 - .2); return mix(m, [255, 255, 220], (tn(u, v, 14, 5) - .6) * 3); },
  moon: (u, v) => mix([95, 92, 90], [185, 180, 172], tn(u, v, 8, 2) * 1.4 - .15),
  earth: (u, v) => { const n = tn(u, v, 4, 4), pole = Math.abs(v - .5) > .43;
    let c = n > .52 ? mix([40, 110, 50], [150, 125, 80], (n - .52) * 4 + Math.abs(v - .5) * 1.5) : mix([8, 35, 95], [35, 95, 185], n * 2.2);
    c = mix(c, [255, 255, 255], (tn(u, v, 5, 9) - .52) * 5); return pole ? [240, 245, 255] : c; },
  mars: (u, v) => mix([140, 62, 40], [208, 128, 84], tn(u, v, 5, 6) * 1.6 - .25)
};

/* ---------- bodies (visual scale, real periods in days) ---------- */
const BODIES = [
  { id: 'sun', name: 'SUN', r: 2.6, a: 0, tex: 'sun', spin: .02, info: ['1,392,700 km', '\u2014', '\u2014', '25 days', 'Holds 99.8% of the solar system\u2019s mass.'] },
  { id: 'earth', name: 'EARTH', r: 1.2, a: 11.5, P: 365.25, ph: .75, tex: 'earth', spin: .25, info: ['12,742 km', '1.00 AU', '365.25 days', '23 h 56 m', 'The only known world with liquid surface water and life.'] },
  { id: 'moon', name: 'MOON', r: .34, of: 'earth', dist: 2.4, P: 27.3, tex: 'moon', spin: .02, info: ['3,474 km', '384,400 km from Earth', '27.3 days', '27.3 days (tidally locked)', 'Earth\u2019s only natural satellite, and the only other world humans have visited.'] },
  { id: 'mars', name: 'MARS', r: .7, a: 18.5, P: 687, ph: 3.2, tex: 'mars', spin: .24, info: ['6,779 km', '1.52 AU', '687 days', '24 h 37 m', 'Home to Olympus Mons, the tallest volcano known.'] }
];
// bodies that carry analog sites in the dashboard
const DASH_BODIES = new Set(['earth', 'moon', 'mars']);
const INNER = 36, EPOCH = Date.UTC(2017, 4, 10, 11, 11);

const state = { arcs: [], activeRegion: null };
const API = {
  init,
  resize() {}, focus() {}, overview() {},
  setLinks(a) { state.arcs = a || []; },
  setActiveRegion(id) { state.activeRegion = id; }
};

function fail(host, msg) { const d = document.createElement('div'); d.className = 'ss-fail'; d.textContent = msg; host.appendChild(d); }

function init(host, cb) {
  cb = cb || {};
  if (!host) return;
  const canvas = $('.ss-gl', host), labelsEl = $('.ss-labels', host), infoBox = $('#ssInfo', host);
  if (typeof THREE === 'undefined' || !THREE.OrbitControls) { fail(host, 'The 3D engine could not be loaded. Check your connection and reload.'); return; }
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
  catch (e) { fail(host, 'WebGL is not available in this browser.'); return; }

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 45, 280);
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 3000);
  camera.position.set(1.5, INNER * .5, INNER * .87);
  const controls = new THREE.OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, dampingFactor: .06, minDistance: 3, maxDistance: 600, maxPolarAngle: Math.PI * .92 });
  controls.target.set(0, 0, 0);

  scene.add(new THREE.AmbientLight(0x6a7a99, .35));
  scene.add(new THREE.PointLight(0xfff0d0, 2.2, 0, 1.2));

  let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const sph = r => { const u = R() * 2 - 1, t = R() * 6.2832, s = Math.sqrt(1 - u * u); return new THREE.Vector3(s * Math.cos(t), u, s * Math.sin(t)).multiplyScalar(r); };

  // stars
  { const n = 7000, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { sph(500 + R() * 200).toArray(p, i * 3); const b = .35 + R() * .65, w = R();
      c.set([b * (.8 + .2 * w), b * (.85 + .15 * w), b], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.4, sizeAttenuation: false, vertexColors: true, fog: false }))); }

  // constellation network
  const constel = new THREE.Group(); scene.add(constel);
  { const seg = [], dots = [];
    for (let k = 0; k < 26; k++) { let p = sph(380); const pts = [p.clone()];
      for (let i = 0; i < 6 + (R() * 4 | 0); i++) { p = p.clone().add(new THREE.Vector3(R() - .5, R() - .5, R() - .5).multiplyScalar(110)); pts.push(p); }
      pts.forEach((q, i) => { dots.push(q.x, q.y, q.z); if (i) { const a = pts[R() < .3 && i > 1 ? i - 2 : i - 1]; seg.push(a.x, a.y, a.z, q.x, q.y, q.z); } }); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    constel.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x2f7bd0, transparent: true, opacity: .75, fog: false })));
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dots, 3));
    constel.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xbfe0ff, size: 2.5, sizeAttenuation: false, fog: false }))); }

  // grid plane
  const grid = new THREE.GridHelper(500, 250, 0x8fb0d0, 0x8fb0d0);
  grid.position.y = -.8; grid.material.transparent = true; grid.material.opacity = .32; scene.add(grid);

  // asteroid belt
  const belt = (() => { const n = 3500, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = R() * 6.2832, r = 21.5 + R() * 5 + (R() - .5) * 1.5; p.set([Math.cos(a) * r, (R() - .5) * 1.2, Math.sin(a) * r], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xc4beb2, size: .16, sizeAttenuation: true, transparent: true, opacity: .85 })); scene.add(m); return m; })();

  // sun glow
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,210,100,.95)'); r.addColorStop(.25, 'rgba(255,170,50,.45)'); r.addColorStop(1, 'rgba(255,140,20,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();

  /* ---------- build bodies + orbits ---------- */
  const orbits = new THREE.Group(); scene.add(orbits);
  const linkGroup = new THREE.Group(); scene.add(linkGroup);
  const sim = { ms: EPOCH, playing: true, daysPerSec: 5 };
  const d0 = sim.ms / 864e5;

  BODIES.forEach(b => {
    b.pivot = new THREE.Object3D(); scene.add(b.pivot);
    const geo = new THREE.SphereGeometry(b.r, 48, 32), map = tex(T[b.tex]);
    b.mesh = new THREE.Mesh(geo, b.id === 'sun' ? new THREE.MeshBasicMaterial({ map }) : new THREE.MeshStandardMaterial({ map, roughness: .9, metalness: 0 }));
    b.mesh.rotation.z = .1; b.pivot.add(b.mesh); b.mesh.userData.body = b;
    if (b.id === 'sun') { [[14, 1], [30, .45]].forEach(([s, o]) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, opacity: o, fog: false })); sp.scale.set(s, s, 1); b.pivot.add(sp); }); }
    if (b.a) { const pts = []; for (let k = 0; k <= 256; k++) { const t = k / 256 * 6.2832; pts.push(new THREE.Vector3(Math.cos(t) * b.a, 0, Math.sin(t) * b.a)); }
      orbits.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xdcecff, transparent: true, opacity: .6 }))); }
    b.label = document.createElement('div'); b.label.className = 'ss-lbl'; b.label.textContent = b.name;
    b.label.addEventListener('click', () => pick(b)); labelsEl.appendChild(b.label);
  });
  const byId = id => BODIES.find(b => b.id === id);

  function place() {
    const d = sim.ms / 864e5 - d0;
    BODIES.forEach(b => {
      if (b.a) { const t = b.ph + 6.28318 * d / b.P; b.pivot.position.set(Math.cos(t) * b.a, 0, Math.sin(t) * b.a); }
      else if (b.of) { const c = byId(b.of).pivot.position, m = d / b.P * 6.28318; b.pivot.position.set(c.x + Math.cos(m) * b.dist, 0, c.z + Math.sin(m) * b.dist); }
    });
  }

  /* ---------- analog links between bodies (driven by the similarity engine in app.js) ---------- */
  let links = [];
  function rebuildLinks() {
    links.forEach(l => { linkGroup.remove(l.line); l.line.geometry.dispose(); l.line.material.dispose(); }); links = [];
    const RM = regionMap(), seen = new Set();
    (state.arcs || []).forEach(a => {
      const ra = RM[a.from], rb = RM[a.to]; if (!ra || !rb) return;
      const A = byId(ra.body), B = byId(rb.body); if (!A || !B || A === B) return;
      const key = [A.id, B.id].sort().join(); if (seen.has(key)) return; seen.add(key);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: a.color, transparent: true, opacity: .9, fog: false })); line.frustumCulled = false;
      linkGroup.add(line); links.push({ A, B, line });
    });
  }
  const wa = new THREE.Vector3(), wb = new THREE.Vector3();
  function updateLinks() { links.forEach(l => { l.A.pivot.getWorldPosition(wa); l.B.pivot.getWorldPosition(wb);
    const p = l.line.geometry.attributes.position; p.setXYZ(0, wa.x, wa.y, wa.z); p.setXYZ(1, wb.x, wb.y, wb.z); p.needsUpdate = true; }); }

  /* ---------- camera focus ---------- */
  let sel = null; const want = { on: false, d: INNER, t: new THREE.Vector3(), distOn: true }, tmp = new THREE.Vector3();
  controls.addEventListener('start', () => { want.distOn = false; if (!sel) want.on = false; });
  function applyCam() {
    if (!want.on) return;
    const goal = sel ? sel.pivot.getWorldPosition(tmp) : want.t, old = controls.target.clone();
    controls.target.lerp(goal, .08); camera.position.add(controls.target.clone().sub(old));
    if (want.distOn) { const dir = camera.position.clone().sub(controls.target), d = dir.length(); dir.setLength(d + (want.d - d) * .06);
      camera.position.copy(controls.target).add(dir); if (!sel && Math.abs(d - want.d) < .1 && controls.target.distanceTo(want.t) < .1) want.on = false; }
  }
  function overview(dist) {
    sel = null; infoBox.classList.add('ss-hidden'); $$('.ss-lbl', host).forEach(l => l.classList.remove('ss-sel'));
    Object.assign(want, { on: true, d: dist, distOn: true }); want.t.set(0, 0, 0);
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (dir.y < .25) { camera.position.copy(controls.target).add(new THREE.Vector3(.04, .5, .87).multiplyScalar(camera.position.distanceTo(controls.target))); }
  }
  function chipsFor(b) {
    const rs = regionList().filter(r => r.body === b.id); if (!rs.length) return '';
    return `<h3>ANALOG SITES</h3><div class="ss-chips">${rs.map(r => `<button type="button" class="ss-chip${r.id === state.activeRegion ? ' ss-on' : ''}" data-region="${esc(r.id)}">${esc(short(r.name))}</button>`).join('')}</div>`;
  }
  function select(b) {
    sel = b; $$('.ss-lbl', host).forEach(l => l.classList.toggle('ss-sel', l === b.label));
    Object.assign(want, { on: true, d: Math.max(7, b.r * 6), distOn: true });
    const [dia, dist, per, day, fact] = b.info, pane = $('.ss-pane', infoBox);
    pane.innerHTML = `<h2>${b.name}<button type="button" aria-label="Close" class="ss-x">&times;</button></h2><dl><dt>Diameter</dt><dd>${dia}</dd><dt>Distance</dt><dd>${dist}</dd><dt>Orbit</dt><dd>${per}</dd><dt>Day</dt><dd>${day}</dd></dl><p>${fact}</p>${chipsFor(b)}`;
    infoBox.classList.remove('ss-hidden');
    $('.ss-x', pane).onclick = () => overview(want.d);
    $$('.ss-chip', pane).forEach(c => c.onclick = () => cb.region && cb.region(c.dataset.region));
  }
  // a click made by the person: focus the body and tell the dashboard
  function pick(b) { select(b); if (cb.body && DASH_BODIES.has(b.id)) cb.body(b.id); }

  let down = null;
  canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; host.focus({ preventScroll: true }); });
  canvas.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const ray = new THREE.Raycaster(), r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), camera);
    const hit = ray.intersectObjects(BODIES.map(b => b.mesh))[0]; if (hit) pick(hit.object.userData.body);
  });
  // Escape returns to the overview only while the scope itself has focus (never hijacks the dashboard)
  host.addEventListener('keydown', e => { if (e.key === 'Escape') overview(want.d); });

  /* ---------- loop ---------- */
  function resize() { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host); else addEventListener('resize', resize);
  resize();
  const v = new THREE.Vector3(), clk = new THREE.Clock();
  function labels() { const w = host.clientWidth, h = host.clientHeight, k = h / 2 / Math.tan(camera.fov * Math.PI / 360);
    BODIES.forEach(b => { b.pivot.getWorldPosition(v); const dist = v.distanceTo(camera.position); v.project(camera);
      let vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      if (b.id === 'moon' && sel !== b && dist > 26) vis = false;   // keep Earth's label readable when zoomed out
      b.label.style.display = vis ? '' : 'none'; if (!vis) return;
      b.label.style.left = (v.x * .5 + .5) * w + 'px'; b.label.style.top = (-v.y * .5 + .5) * h + b.r / dist * k + 8 + 'px'; }); }
  function frame() {
    requestAnimationFrame(frame); const dt = Math.min(clk.getDelta(), .1);
    if (!host.clientWidth || document.hidden) return;   // home tab hidden: skip all work
    if (sim.playing) { sim.ms += dt * sim.daysPerSec * 864e5; BODIES.forEach(b => b.mesh.rotation.y += dt * b.spin); belt.rotation.y += dt * .01; }
    place(); updateLinks(); applyCam(); controls.update(); labels(); renderer.render(scene, camera);
  }

  /* ---------- public API goes live ---------- */
  Object.assign(API, {
    resize,
    focus(id) { const b = byId(id); if (b) select(b); },
    overview() { overview(INNER); },
    setLinks(a) { state.arcs = a || []; rebuildLinks(); },
    setActiveRegion(id) { state.activeRegion = id; $$('.ss-chip', host).forEach(c => c.classList.toggle('ss-on', c.dataset.region === id)); }
  });
  place(); rebuildLinks(); frame();
}

return API;
})();
if (typeof module !== 'undefined') module.exports = SOLAR;
