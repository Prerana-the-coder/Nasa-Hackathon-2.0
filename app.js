'use strict';
/* ============================================================
   NASA Planetary Analog Intelligence — Application Controller
   Wiring Solar System Scope, Scientific Engine, Knowledge Graph & UI
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // Initialize Gaussian & Log parameter ranges across all regions
  ENG.initRanges(REGIONS);

  /* ============================================================
     PROCEDURAL WEB AUDIO SOUNDSCAPES
     ============================================================ */
  const SoundFX = {
    ctx: null,
    enabled: localStorage.getItem('nasa_audio') !== 'false',
    init() {
      if (!this.ctx && typeof AudioContext !== 'undefined') {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },
    toggle() {
      this.enabled = !this.enabled;
      localStorage.setItem('nasa_audio', this.enabled ? 'true' : 'false');
      const btn = document.getElementById('audioToggle');
      if (btn) {
        btn.textContent = this.enabled ? '🔊' : '🔇';
        btn.title = `Audio Soundscapes: ${this.enabled ? 'ON' : 'OFF'}`;
      }
      if (this.enabled) this.click();
    },
    click() {
      if (!this.enabled) return;
      try {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.035);
      } catch(e) {}
    },
    planet() {
      if (!this.enabled) return;
      try {
        this.init();
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);
          gain.gain.setValueAtTime(0.04, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.32);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.32);
        });
      } catch(e) {}
    },
    radar() {
      if (!this.enabled) return;
      try {
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } catch(e) {}
    },
    chime() {
      if (!this.enabled) return;
      try {
        this.init();
        const now = this.ctx.currentTime;
        [880, 1318.5].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);
          gain.gain.setValueAtTime(0.045, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.38);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.38);
        });
      } catch(e) {}
    }
  };

  const audioBtn = document.getElementById('audioToggle');
  if (audioBtn) {
    audioBtn.textContent = SoundFX.enabled ? '🔊' : '🔇';
    audioBtn.title = `Audio Soundscapes: ${SoundFX.enabled ? 'ON' : 'OFF'}`;
    audioBtn.addEventListener('click', () => SoundFX.toggle());
  }

  // Application State
  let selRegion = 'atacama';
  let selBody   = 'earth';
  let bestMatch = null;
  let G         = null; // Knowledge graph
  let currentWeights = ENG.defaultWeights();

  /* ============================================================
     TAB SWITCHING NAVIGATION
     ============================================================ */
  const navTabs = document.querySelectorAll('.nav-tab');
  const PAGE_TABS = ['home', 'datasources', 'research'];
  const MODAL_TABS = ['compare', 'knowledge'];
  const NAV_ROUTES = [...PAGE_TABS, ...MODAL_TABS];
  const ROUTE_TARGETS = {
    home: 'tab-home',
    compare: 'compareModal',
    knowledge: 'graphModal',
    datasources: 'tab-datasources',
    research: 'tab-research'
  };
  const HASH_ROUTES = {
    'tab-home': 'home',
    compareModal: 'compare',
    graphModal: 'knowledge',
    'tab-datasources': 'datasources',
    'tab-research': 'research',
    home: 'home',
    compare: 'compare',
    knowledge: 'knowledge',
    datasources: 'datasources',
    research: 'research'
  };
  let currentPageRoute = 'home';

  function setActiveNavTab(name) {
    navTabs.forEach(tab => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle('active', active);
      if (active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
  }

  function showPage(name) {
    if (!PAGE_TABS.includes(name)) return;
    currentPageRoute = name;
    setActiveNavTab(name);
    document.getElementById('compareModal').style.display = 'none';
    document.getElementById('graphModal').style.display = 'none';
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const targetTab = document.getElementById('tab-' + name);
    if (targetTab) targetTab.classList.add('active');
    if (name === 'home') setTimeout(() => SOLAR.resize(), 50);
  }

  function showNavigationModal(name) {
    if (!MODAL_TABS.includes(name)) return;
    setActiveNavTab(name);
    document.getElementById('compareModal').style.display = 'none';
    document.getElementById('graphModal').style.display = 'none';
    if (name === 'compare') openCompareModal();
    else {
      SoundFX.click();
      openGraphModal();
    }
  }

  function closeNavigationModal() {
    if (MODAL_TABS.includes(HASH_ROUTES[location.hash.slice(1)])) {
      history.replaceState(null, '', '#' + ROUTE_TARGETS[currentPageRoute]);
    }
    showPage(currentPageRoute);
  }

  function navigateToRoute(name) {
    if (!NAV_ROUTES.includes(name)) return;
    const targetHash = '#' + ROUTE_TARGETS[name];
    if (location.hash === targetHash) {
      const targetModal = name === 'compare' ? 'compareModal' : 'graphModal';
      if (MODAL_TABS.includes(name) && document.getElementById(targetModal).style.display !== 'none') return;
      openPageFromHash();
    } else {
      location.hash = ROUTE_TARGETS[name];
    }
  }

  function openPageFromHash() {
    const name = HASH_ROUTES[location.hash.slice(1)];
    if (PAGE_TABS.includes(name)) showPage(name);
    else if (MODAL_TABS.includes(name)) showNavigationModal(name);
    else if (!name) showPage('home');
  }
  window.addEventListener('hashchange', openPageFromHash);

  navTabs.forEach(tab => {
    tab.addEventListener('click', event => {
      event.preventDefault();
      if (tab.dataset.tab !== 'compare' && tab.dataset.tab !== 'knowledge') SoundFX.click();
      navigateToRoute(tab.dataset.tab);
    });
  });

  /* ============================================================
     SOLAR SYSTEM SCOPE (CENTER HERO, planets.js)
     ============================================================ */
  SOLAR.init(document.getElementById('solarHero'), {
    // person clicked Earth / Moon / Mars in the scope
    body(bodyId) {
      selectBody(bodyId);
    },
    // person picked an analog site chip or a site from the scope search
    region(regionId) {
      selectRegion(regionId, true, true);
    }
  });

  /* ============================================================
     PLANETARY BODY SWITCHING
     ============================================================ */
  document.querySelectorAll('.planet-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectBody(btn.dataset.body);
    });
  });

  function selectBody(bodyId) {
    SoundFX.planet();
    selBody = bodyId;
    SOLAR.focus(bodyId);

    document.querySelectorAll('.planet-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.body === bodyId);
    });

    updateOverviewWidget(bodyId);

    // If current selected region doesn't match body, pick a default region on that body
    if (REG[selRegion] && REG[selRegion].body !== bodyId) {
      const match = REGIONS.find(r => r.body === bodyId);
      if (match) selectRegion(match.id, false);
    }
  }

  function updateOverviewWidget(bodyId) {
    const bodyInfo = BODIES[bodyId];
    document.getElementById('overviewTitle').textContent = bodyInfo.name + ' Overview';

    const regs = REGIONS.filter(r => r.body === bodyId);
    const temps = regs.map(r => r.v.temp).filter(x => typeof x === 'number');
    const avgT = temps.length ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : '—';
    document.getElementById('statTemp').textContent = avgT + '°C';

    const orb = document.getElementById('miniOrb');
    if (bodyId === 'earth') {
      orb.className = 'mini-orb earth-thumb';
      document.getElementById('overviewSub').textContent = '14 Terrestrial Analog Sites';
      document.getElementById('statLbl2').textContent = 'Land Coverage';
      document.getElementById('statVal2').textContent = '29.2%';
      document.getElementById('statLbl3').textContent = 'Water Coverage';
      document.getElementById('statVal3').textContent = '70.8%';
    } else if (bodyId === 'mars') {
      orb.className = 'mini-orb mars-thumb';
      document.getElementById('overviewSub').textContent = 'Surface Pressure: ~7 hPa CO₂';
      document.getElementById('statLbl2').textContent = 'Surface Area';
      document.getElementById('statVal2').textContent = '144.8M km²';
      document.getElementById('statLbl3').textContent = 'Surface Liquid';
      document.getElementById('statVal3').textContent = '0% (Ancient Lakes)';
    } else {
      orb.className = 'mini-orb moon-thumb';
      document.getElementById('overviewSub').textContent = 'Permanent Cold Traps: <40 K';
      document.getElementById('statLbl2').textContent = 'Surface Area';
      document.getElementById('statVal2').textContent = '37.9M km²';
      document.getElementById('statLbl3').textContent = 'South Polar Ice';
      document.getElementById('statVal3').textContent = 'Subsurface PSRs';
    }
  }

  function updateCoords(lat, lon) {
    const ns = lat >= 0 ? 'N' : 'S', ew = lon >= 0 ? 'E' : 'W';
    document.getElementById('coordText').innerHTML =
      Math.abs(lat).toFixed(4) + '° ' + ns + ' &nbsp; ' + Math.abs(lon).toFixed(4) + '° ' + ew;
  }

  /* ============================================================
     REGION SELECTION & SCIENTIFIC PROFILE UPDATES
     ============================================================ */
  const homeGrid = document.getElementById('homeGrid');
  const regionProfileOverlay = document.getElementById('regionProfileOverlay');

  function openRegionProfile() {
    homeGrid.classList.add('has-region-selection');
    regionProfileOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('region-profile-open');
    document.getElementById('regionProfileClose').focus();
  }

  function closeRegionProfile() {
    homeGrid.classList.remove('has-region-selection');
    regionProfileOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('region-profile-open');
  }

  document.getElementById('regionProfileClose').addEventListener('click', closeRegionProfile);
  regionProfileOverlay.addEventListener('click', event => {
    if (event.target === regionProfileOverlay) closeRegionProfile();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && homeGrid.classList.contains('has-region-selection')) {
      closeRegionProfile();
    }
  });

  function selectRegion(regionId, flyTo = true, revealProfile = false) {
    if (!REG[regionId]) return;
    SoundFX.click();
    selRegion = regionId;
    if (revealProfile) openRegionProfile();
    const r = REG[regionId];

    SOLAR.setActiveRegion(regionId);
    if (flyTo) SOLAR.focus(r.body);
    updateCoords(r.lat, r.lon);

    if (r.body !== selBody) {
      selectBody(r.body);
    }

    updateRegionProfileCard(r);
    updateComparisonRadar(r);
    updateAIContext(r);
    updateDynamicAnalogArcs(r);
    renderMiniGraph();
  }

  function updateRegionProfileCard(r) {
    document.getElementById('regionTitle').textContent = r.name.split('(')[0].trim();
    document.getElementById('regionCoords').textContent =
      Math.abs(r.lat).toFixed(1) + '° ' + (r.lat >= 0 ? 'N' : 'S') + ', ' +
      Math.abs(r.lon).toFixed(1) + '° ' + (r.lon >= 0 ? 'E' : 'W');

    const elevStr = typeof r.v.elev === 'number' ? Math.round(r.v.elev).toLocaleString('en-US') + ' m' : '—';
    document.getElementById('regionElev').textContent = 'Elevation: ' + elevStr;

    // Landscape photo banner
    const bannerImg = document.getElementById('regionBannerImg');
    if (r.img) {
      bannerImg.src = r.img;
      bannerImg.alt = r.name;
    }

    // Best Extraterrestrial Analog Match calculation
    const candidates = REGIONS.filter(x => x.body !== r.body);
    const ranked = ENG.rank(r, candidates, { weights: currentWeights });

    if (ranked.length) {
      bestMatch = ranked[0];
      const matchScore = Math.round(bestMatch.adjusted || bestMatch.raw || 0);

      document.getElementById('matchPct').textContent = matchScore + '%';

      // Update Radial Progress Ring SVG (circumference = 2 * PI * 18 = 113.1)
      const ringCircle = document.getElementById('matchRingCircle');
      const perimeter = 113.1;
      const offset = perimeter * (1 - matchScore / 100);
      ringCircle.style.strokeDashoffset = offset;

      document.getElementById('targetSiteVal').textContent = `${bestMatch.B.name} (${BODIES[bestMatch.B.body].name})`;

      // Dynamic Synthesis Note
      const expl = ENG.explain(bestMatch);
      let note = `High similarity to ${bestMatch.B.name} due to matching `;
      if (expl.similar.length) {
        note += expl.similar.map(s => s.split('(')[0].trim().toLowerCase()).join(', ') + '.';
      } else {
        note += 'geomorphic and environmental parameters.';
      }
      document.getElementById('regionNoteText').textContent = note;
    } else {
      document.getElementById('matchPct').textContent = '—';
      document.getElementById('regionNoteText').textContent = r.desc || '';
    }

    // Default to 'fingerprint' tab
    const activeFpTab = document.querySelector('.fp-tab.active');
    updateFingerprintBars(r, activeFpTab ? activeFpTab.dataset.fp : 'fingerprint');
    document.getElementById('siteContext').innerHTML = renderSiteContext(r);
  }

  /* ============================================================
     FINGERPRINT METRIC BARS (MATCHING REFERENCE UI)
     ============================================================ */
  const METRIC_ICONS = {
    temp: '🌡️',
    morph: '⛰️',
    geo: '🪨',
    elev: '📏',
    rad: '☢️',
    water: '💧',
    pres: '🌬️',
    atm: '💨',
    slope: '📐',
    dust: '🏜️',
    albedo: '☀️',
    hydro: '🌊',
    solar: '⚡'
  };

  const METRIC_COLORS = {
    temp: '#38d8ff',
    morph: '#38d8ff',
    geo: '#38d8ff',
    elev: '#38d8ff',
    water: '#38d8ff',
    slope: '#7cf0b5',
    rad: '#ff8a50',
    dust: '#ffd166',
    pres: '#4aa3ff'
  };

  const FP_CATEGORIES = {
    fingerprint: ['temp', 'morph', 'geo', 'water', 'elev'], // Exactly matches reference 5 bars!
    terrain: ['morph', 'slope', 'elev', 'dust', 'albedo'],
    geology: ['geo', 'hydro', 'water'],
    environment: ['temp', 'rad', 'pres', 'solar']
  };

  document.querySelectorAll('.fp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.fp-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (REG[selRegion]) {
        updateFingerprintBars(REG[selRegion], tab.dataset.fp);
      }
    });
  });

  function updateFingerprintBars(r, category) {
    const container = document.getElementById('fpContent');
    const metricIds = FP_CATEGORIES[category] || FP_CATEGORIES.fingerprint;
    const fp = ENG.fingerprint(r);

    let html = '';
    metricIds.forEach(id => {
      const item = fp.find(f => f.p.id === id);
      if (!item) return;

      const value = item.state === 'ok'
        ? ENG.fmt(item.p, item.value) + (item.p.unit ? ' ' + item.p.unit : '')
        : (item.state === 'na' ? 'N/A' : 'Unsampled');
      let pct = 0;
      if (item.state === 'ok' && item.p.type === 'num' && item.range) {
        const transform = x => item.p.scale === 'log' ? Math.log10(x + (item.p.off || 0)) : x;
        const min = transform(item.range[0]), max = transform(item.range[1]);
        pct = max === min ? 50 : Math.round(ENG.clamp((transform(item.value) - min) / (max - min)) * 100);
      }
      const icon = METRIC_ICONS[id] || '•';
      const color = METRIC_COLORS[id] || '#38d8ff';
      const interpretation = item.interp || item.p.name;
      const source = item.src ? item.src.name : 'Curated synthesis';

      html += `
        <div class="fp-bar-row" title="${esc(interpretation)} Source: ${esc(source)}. Evidence grade ${esc(item.grade)}.">
          <div class="fp-bar-meta">
            <span class="fp-bar-icon">${icon}</span>
            <span class="fp-bar-label">${esc(item.p.name)}</span>
            <span class="fp-bar-value">${esc(value)}</span>
          </div>
          <div class="fp-bar-detail">
            ${item.p.type === 'num' && item.state === 'ok'
              ? `<div class="fp-bar-wrap" aria-label="${pct}% of the range for ${esc(BODIES[r.body].name)} sites"><div class="fp-bar-fill" style="width:${pct}%;background:${color}"></div></div>`
              : `<span class="fp-category-note">${esc(interpretation)}</span>`}
            <span class="fp-grade">Grade ${esc(item.grade)}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function getSiteHistory(r) {
    const missions = MISSIONS.filter(m => m.region === r.id);
    const papers = (r.refs || []).map(id => PAPER[id]).filter(Boolean).sort((a, b) => a.yr - b.yr);
    return {
      pastMissions: missions.filter(m => m.end),
      currentMissions: missions.filter(m => !m.end),
      papers
    };
  }

  function renderPaperCitation(p) {
    return `<a href="${esc(paperLink(p))}" target="_blank" rel="noopener">${esc(p.title)}</a> — ${esc(p.au)}, ${esc(p.venue)}`;
  }

  function renderSiteContext(r) {
    const history = getSiteHistory(r);
    const historyItems = [
      ...history.pastMissions.map(m => `<li><strong>${esc(m.name)}</strong> (${esc(m.start.slice(0, 4))}–${esc(m.end.slice(0, 4))}): ${esc(m.note)}</li>`),
      ...history.papers.map(p => `<li><strong>${esc(p.yr)}:</strong> ${renderPaperCitation(p)}</li>`)
    ];
    const currentItems = history.currentMissions.map(m => `
      <li><strong>${esc(m.name)}</strong> — ${esc(m.status)}. ${esc(m.note)}
        <span class="site-context-meta">Instruments: ${esc(m.instruments.join(', '))}</span>
      </li>
    `);
    const fp = ENG.fingerprint(r);
    const presentMetrics = fp.map(item => {
      const value = item.state === 'ok'
        ? ENG.fmt(item.p, item.value) + (item.p.unit ? ' ' + item.p.unit : '')
        : (item.state === 'na' ? 'N/A' : 'Unsampled');
      const source = item.src ? item.src.name : 'Curated synthesis';
      return `<span class="site-condition" title="${esc(source)}; evidence grade ${esc(item.grade)}"><strong>${esc(item.p.name)}:</strong> ${esc(value)} <small>Grade ${esc(item.grade)}</small></span>`;
    }).join('');

    return `
      <h4 class="site-context-title">Past &amp; Present</h4>
      <div class="site-era">
        <h5>Past record</h5>
        <p>${esc(r.desc || 'No historical site summary is available in this catalog.')}</p>
        ${historyItems.length
          ? `<ul>${historyItems.join('')}</ul>`
          : '<p class="site-context-muted">No linked mission or research record is listed for this location.</p>'}
      </div>
      <div class="site-era">
        <h5>Present profile <span>(catalog data, not live telemetry)</span></h5>
        <div class="site-conditions">${presentMetrics}</div>
        ${currentItems.length
          ? `<ul>${currentItems.join('')}</ul>`
          : '<p class="site-context-muted">No active mission is currently linked to this location in the catalog.</p>'}
        <p class="site-context-muted">The dossier adds the full source list and exploration suitability analysis.</p>
      </div>
    `;
  }

  /* ============================================================
     5-AXIS RADAR PENTAGRAM (MATCHING REFERENCE UI)
     ============================================================ */
  function updateComparisonRadar(r) {
    const canvas = document.getElementById('radarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Pick target: either bestMatch or compare against a prime counterpart
    let compTarget = bestMatch ? bestMatch.B : null;
    if (!compTarget) {
      compTarget = r.body === 'earth' ? REG['gale'] : REG['atacama'];
    }

    // 5 Pentagon axes matching reference image:
    // Temperature, Terrain, Geology, Water, Elevation
    const radarAxes = [
      { id: 'temp', name: 'Temperature' },
      { id: 'morph', name: 'Terrain' },
      { id: 'geo', name: 'Geology' },
      { id: 'water', name: 'Water' },
      { id: 'elev', name: 'Elevation' }
    ];

    const cx = W / 2, cy = H / 2 + 5;
    const radius = 68;
    const numAxes = radarAxes.length;

    // 1. Draw Concentric Pentagon Rings
    for (let level = 1; level <= 4; level++) {
      ctx.beginPath();
      for (let i = 0; i <= numAxes; i++) {
        const a = (i % numAxes) / numAxes * Math.PI * 2 - Math.PI / 2;
        const rCurrent = radius * (level / 4);
        const x = cx + Math.cos(a) * rCurrent;
        const y = cy + Math.sin(a) * rCurrent;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(56, 216, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 2. Draw Spokes and Labels
    radarAxes.forEach((axis, i) => {
      const a = i / numAxes * Math.PI * 2 - Math.PI / 2;
      const xEnd = cx + Math.cos(a) * radius;
      const yEnd = cy + Math.sin(a) * radius;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(xEnd, yEnd);
      ctx.strokeStyle = 'rgba(56, 216, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Axis label
      const xLabel = cx + Math.cos(a) * (radius + 16);
      const yLabel = cy + Math.sin(a) * (radius + 16);
      ctx.fillStyle = '#8ba3c7';
      ctx.font = '600 8px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(axis.name, xLabel, yLabel);
    });

    // 3. Normalized values polygon renderer
    function drawRadarPolygon(region, strokeColor, fillColor) {
      ctx.beginPath();
      radarAxes.forEach((axis, i) => {
        let val = 0.5;
        const pObj = PARAM[axis.id];
        if (pObj && pObj.type === 'num' && typeof region.v[axis.id] === 'number') {
          val = ENG.norm(pObj, region.v[axis.id]);
        } else if (pObj && pObj.type === 'cat') {
          val = 0.65;
        }
        val = Math.max(0.18, Math.min(1.0, val));

        const a = i / numAxes * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * (radius * val);
        const y = cy + Math.sin(a) * (radius * val);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Mars / Target Site (Orange line in Reference)
    drawRadarPolygon(compTarget, '#ff8a50', 'rgba(255, 138, 80, 0.22)');
    // Earth / Reference Site (Cyan line in Reference)
    drawRadarPolygon(r, '#38d8ff', 'rgba(56, 216, 255, 0.25)');

    // 4. Dynamic Legend
    const legendEl = document.getElementById('compLegend');
    const regLabel = `${BODIES[r.body].name} Location (${r.name.split('(')[0].trim()})`;
    const targetLabel = `${BODIES[compTarget.body].name} Region (${compTarget.name.split('(')[0].trim()})`;

    legendEl.innerHTML = `
      <div><span class="legend-dot" style="background:#ff8a50"></span><strong style="color:#ff8a50">${targetLabel}</strong></div>
      <div style="margin-top:6px"><span class="legend-dot" style="background:#38d8ff"></span><strong style="color:#38d8ff">${regLabel}</strong></div>
    `;
  }

  /* ============================================================
     KNOWLEDGE GRAPH & MINI CONSTELLATION PREVIEW
     ============================================================ */
  function initKnowledgeNetwork() {
    G = GRAPH.build({ weights: currentWeights });
    renderMiniGraph();
    renderGraphLegend();
  }

  function renderMiniGraph() {
    if (!G) return;
    const svgEl = document.getElementById('knowledgeSVG');
    if (!svgEl) return;

    const focusId = selRegion ? 'r:' + selRegion : 'r:atacama';
    const parentId = 'planet:' + G.nodes[focusId].body;
    const relatedIds = G.adj[focusId].map(({ to }) => to)
      .filter(id => G.nodes[id].type !== 'planet' && G.nodes[id].type !== 'region')
      .slice(0, 6);
    const nodeIds = [...new Set([parentId, focusId, ...relatedIds])];
    const nodeIdSet = new Set(nodeIds);
    const subgraphEdges = G.edges.filter(e => nodeIdSet.has(e.a) && nodeIdSet.has(e.b));
    const positions = GRAPH.layout(nodeIds, subgraphEdges, 460, 200, 180);

    const svgContent = GRAPH.svg(G, positions, {
      focus: focusId,
      edges: subgraphEdges,
      query: '',
      edgeSel: null,
      labelMaxChars: 11
    });

    svgEl.innerHTML = svgContent;

    svgEl.querySelectorAll('.gnode').forEach(gn => {
      const selectNode = () => {
        const node = G.nodes[gn.dataset.node];
        if (!node) return;
        const info = document.getElementById('miniGraphInfo');
        if (info) info.textContent = `${node.label} · ${GRAPH.TYPE[node.type].label} · ${G.adj[node.id].length} connections`;
        if (node.type === 'region') selectRegion(node.region);
        else openGraphModal(node.id);
      };
      gn.addEventListener('click', selectNode);
      gn.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectNode();
        }
      });
    });
  }

  function renderGraphLegend() {
    const legend = Object.entries(GRAPH.TYPE).map(([type, details]) =>
      `<span class="graph-legend-item" role="listitem"><span class="graph-legend-dot" style="background:${details.color}"></span>${details.label}</span>`
    ).join('');
    ['graphLegend', 'graphTypeLegend'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.innerHTML = legend;
    });
  }

  /* ============================================================
     UPCOMING MISSIONS PREVIEW
     ============================================================ */
  function renderUpcomingMissionsList() {
    const listEl = document.getElementById('missionsList');
    if (!listEl) return;

    const previewMissions = [
      MISSIONS.find(m => m.id === 'perseverance') || MISSIONS[0],
      MISSIONS.find(m => m.id === 'ch3') || MISSIONS[1]
    ];

    listEl.innerHTML = previewMissions.map(m => {
      const isMars = m.body === 'mars';
      const icon = isMars ? '🔴' : '🌙';
      const launchYear = m.start ? m.start.split('-')[0] : '2023';

      return `
        <div class="mission-item">
          <div class="mission-thumb">${icon}</div>
          <div class="mission-info">
            <div class="mission-name">${m.name}</div>
            <div class="mission-sub">${m.note ? m.note.slice(0, 48) + '...' : ''} &bull; ${launchYear}</div>
          </div>
          <span class="mission-status status-active">Active</span>
        </div>
      `;
    }).join('');
  }

  /* ============================================================
     AI RESEARCH ASSISTANT QUERY ENGINE
     ============================================================ */
  function updateAIContext(r) {
    const defaultQueries = [
      `Why is ${r.name.split('(')[0].trim()} a good analog for ${r.body === 'earth' ? 'Mars' : 'Earth'}?`,
      `What hardware can be tested at ${r.name.split('(')[0].trim()}?`,
      `How does ${r.name.split('(')[0].trim()} compare to the Moon South Pole?`
    ];
    document.getElementById('aiQuestion').textContent = defaultQueries[0];
  }

  document.getElementById('aiSendBtn').addEventListener('click', openAIChatModal);
  document.getElementById('aiPill').addEventListener('click', openAIChatModal);
  document.getElementById('aiModalClose').addEventListener('click', () => {
    document.getElementById('aiModal').style.display = 'none';
  });

  function openAIChatModal() {
    document.getElementById('aiModal').style.display = '';
    const currentQ = document.getElementById('aiQuestion').textContent;
    document.getElementById('aiInput').value = currentQ;
  }

  document.getElementById('aiSubmit').addEventListener('click', submitAIQuery);
  document.getElementById('aiInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitAIQuery();
  });

  document.querySelectorAll('.quick-prompt-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('aiInput').value = btn.dataset.q;
      submitAIQuery();
    });
  });

  function submitAIQuery() {
    const inputEl = document.getElementById('aiInput');
    const query = inputEl.value.trim();
    if (!query) return;

    inputEl.value = '';
    const chat = document.getElementById('aiChat');
    chat.innerHTML += `<div class="ai-msg ai-user">${esc(query)}</div>`;

    const answer = generateGroundedAnswer(query);
    chat.innerHTML += `<div class="ai-msg ai-sys">${answer}</div>`;
    chat.scrollTop = chat.scrollHeight;
  }

  function generateGroundedAnswer(query) {
    const q = query.toLowerCase();

    // 1. Lonar Crater Query
    if (q.includes('lonar')) {
      return `
        <strong>Lonar Meteorite Crater (Maharashtra, India) — World-Class Basaltic Analog:</strong><br>
        Lonar is one of the only hyper-velocity impact structures on Earth excavated directly into continental flood basalts (Deccan Traps, ~65 Ma).<br><br>
        <strong>Planetary Analogy:</strong>
        <ul>
          <li><strong>Lunar Mare Impact Structures:</strong> Craters in the lunar maria (e.g., Mare Tranquillitatis) occurred in tholeiitic basalt. Lonar produces identical shock-metamorphic products: <em>maskelynite</em>, shatter cones, and basaltic impact melt breccias.</li>
          <li><strong>Martian Basaltic Craters:</strong> The saline, alkaline lake inside Lonar mimics ancient post-impact hydrothermal and lacustrine conditions discovered in Gale Crater and Jezero Crater by Curiosity and Perseverance.</li>
          <li><strong>Testing Suitability:</strong> Ideal for rehearsing rover mobility on basaltic impact rubble, drilling into shock-shocked rock, and testing in-situ XRD/XRF spectrometers.</li>
        </ul>
      `;
    }

    // 2. Ladakh / Spiti Query
    if (q.includes('ladakh') || q.includes('spiti')) {
      return `
        <strong>Ladakh & Spiti High-Altitude Cold Deserts — Lunar & Mars Proving Grounds:</strong><br>
        Situated above 4,000–4,500 m in the Indian Trans-Himalayas, Ladakh exhibits extreme hypobaric conditions (~580 hPa), high UV irradiance, and sub-zero thermal extremes.<br><br>
        <strong>Key Analog Characteristics:</strong>
        <ul>
          <li><strong>Artemis Lunar Base Proving Ground:</strong> Cold-trap permafrost, diurnal thermal swings (-30°C to +15°C), and rocky regolith used by ISRO for space suit and rover chassis evaluations.</li>
          <li><strong>Martian Periglacial Landforms:</strong> Spiti and Tso Kar feature polygonally patterned ground, cryogenic pingos, and borate-sulfate evaporites identical to Martian Phoenix and Curiosity traverse terrain.</li>
        </ul>
      `;
    }

    // 3. Kutch / Jarosite Query
    if (q.includes('kutch') || q.includes('jarosite') || q.includes('sulfate')) {
      return `
        <strong>Kutch Basin & Mata no Madh (Gujarat, India) — Martian Acidic Sulfate Twin:</strong><br>
        The iron-sulfate deposits at Mata no Madh contain abundant <em>jarosite</em>, gypsum, and alunite formed under acidic aqueous weathering.<br><br>
        <strong>Planetary Relevance:</strong>
        NASA Opportunity rover's discovery of jarosite at Meridiani Planum proved ancient acidic groundwater on Mars. Kutch is an exceptional Earth field site to calibrate spectral deconvolution instruments and drill mechanisms for sulfate-rich salt flats.
      `;
    }

    // 4. Analogy Breakdown Query
    if (q.includes('break down') || q.includes('limit') || q.includes('difference')) {
      return `
        <strong>Where Terrestrial Analogs Break Down (Critical Scientific Limits):</strong><br>
        As highlighted in NASA's challenge brief, no Earth site reproduces all extraterrestrial parameters:
        <ul>
          <li><strong>Gravity:</strong> Earth cannot replicate the Moon’s 1/6 g (0.166 g) or Mars’ 3/8 g (0.38 g). Rover traction and regolith geomechanics behave differently in low gravity.</li>
          <li><strong>Vacuum / Atmospheric Pressure:</strong> Even at highest altitudes, Earth pressure (~500 hPa) is orders of magnitude above Mars (~7 hPa) and the lunar vacuum (10⁻¹² hPa). Cryogenic volatile sublimation cannot occur naturally in open air on Earth.</li>
          <li><strong>Galactic Cosmic Radiation:</strong> Earth’s magnetosphere and thick atmosphere shield the surface (~7-18 µSv/day vs. ~650 µSv/day on Mars and ~1,370 µSv/day on the Moon).</li>
          <li><strong>Ubiquitous Biological Contamination:</strong> Earth has omnipresent microflora; planetary protection protocols must account for forward contamination.</li>
        </ul>
      `;
    }

    // 5. General Region Match Query
    const matched = REGIONS.find(r => q.includes(r.id) || q.includes(r.name.toLowerCase().split('(')[0].trim()));
    if (matched) {
      const topMatches = ENG.rank(matched, REGIONS.filter(x => x.body !== matched.body)).slice(0, 2);
      let res = `<strong>${matched.name} (${BODIES[matched.body].name}):</strong><br>${matched.desc}<br><br>`;
      if (topMatches.length) {
        res += `<strong>Best Analog Matches:</strong><ol>`;
        topMatches.forEach(tm => {
          res += `<li><strong>${tm.B.name}</strong> — ${Math.round(tm.adjusted)}% match score.</li>`;
        });
        res += `</ol>`;
      }
      return res;
    }

    return `
      Planetary Analog Intelligence combines 15 multi-body parameters (temperature, pressure, slope, mineralogy, radiation, water indicator) using a normalized Gaussian distance kernel. You can ask about specific sites (e.g. <em>Lonar Crater, Ladakh, Kutch, Atacama, Shackleton Crater</em>) or hardware testing suitability.
    `;
  }

  /* ============================================================
     DYNAMIC 3D ANALOG TRAJECTORY ARCS
     ============================================================ */
  function updateDynamicAnalogArcs(r) {
    const candidates = REGIONS.filter(x => x.body !== r.body);
    const ranked = ENG.rank(r, candidates, { weights: currentWeights });
    const topArcs = ranked.slice(0, 3).map(c => ({
      from: r.id,
      to: c.B.id,
      color: c.adjusted > 70 ? 0x7cf0b5 : (c.adjusted > 45 ? 0x38d8ff : 0xff8a50)
    }));
    SOLAR.setLinks(topArcs);
  }

  /* ============================================================
     SEARCH DROPDOWN
     ============================================================ */
  const searchInput = document.getElementById('globalSearch');
  const searchResults = document.getElementById('searchResults');

  searchInput.addEventListener('input', () => {
    const val = searchInput.value.toLowerCase().trim();
    if (val.length < 2) {
      searchResults.classList.remove('open');
      return;
    }

    const matches = REGIONS.filter(r =>
      r.name.toLowerCase().includes(val) ||
      r.body.toLowerCase().includes(val) ||
      (r.country && r.country.toLowerCase().includes(val))
    );

    if (!matches.length) {
      searchResults.classList.remove('open');
      return;
    }

    searchResults.innerHTML = matches.slice(0, 8).map(r => `
      <div class="search-item" data-id="${r.id}">
        <span class="si-body si-${r.body}">${r.body}</span>
        <span>${r.name}</span>
      </div>
    `).join('');

    searchResults.classList.add('open');

    searchResults.querySelectorAll('.search-item').forEach(item => {
      item.addEventListener('click', () => {
        selectRegion(item.dataset.id);
        searchInput.value = '';
        searchResults.classList.remove('open');
      });
    });
  });

  searchInput.addEventListener('blur', () => {
    setTimeout(() => searchResults.classList.remove('open'), 250);
  });

  /* ============================================================
     DISCOVERY MODE AUTOMATED SCANNER
     ============================================================ */
  let discoveryTimer = null;
  document.getElementById('startDiscovery').addEventListener('click', () => {
    const earthSites = REGIONS.filter(r => r.body === 'earth');
    let idx = 0;
    const btn = document.getElementById('startDiscovery');
    btn.innerHTML = '<span>Scanning... (Click to Stop)</span>';

    if (discoveryTimer) {
      clearInterval(discoveryTimer);
      discoveryTimer = null;
      btn.innerHTML = '<span>Scan Earth Analogs</span> <span class="arrow-right">→</span>';
      return;
    }

    discoveryTimer = setInterval(() => {
      if (idx >= earthSites.length) {
        clearInterval(discoveryTimer);
        discoveryTimer = null;
        btn.innerHTML = '<span>Scan Earth Analogs</span> <span class="arrow-right">→</span>';
        return;
      }
      selectRegion(earthSites[idx].id);
      idx++;
    }, 2800);
  });

  /* ============================================================
     SCOUT MODE / TWIN FINDER
     ============================================================ */
  function initScoutMode() {
    const targetSelect = document.getElementById('scoutTargetSelect');
    if (!targetSelect) return;

    const extraterrestrialSites = REGIONS.filter(r => r.body !== 'earth');
    targetSelect.innerHTML = extraterrestrialSites.map(r => `
      <option value="${r.id}">${r.name} (${BODIES[r.body].name})</option>
    `).join('');

    document.getElementById('btnRunScout').addEventListener('click', runTwinFinderScout);
  }

  function runTwinFinderScout() {
    const targetId = document.getElementById('scoutTargetSelect').value;
    const lat = parseFloat(document.getElementById('scoutLat').value);
    const lon = parseFloat(document.getElementById('scoutLon').value);
    const target = REG[targetId];
    if (!target) return;

    SOLAR.focus('earth');

    // Compute closest Earth analogs to target
    const earthAnalogs = REGIONS.filter(r => r.body === 'earth');
    const ranked = ENG.rank(target, earthAnalogs);

    const outArea = document.getElementById('scoutResultsArea');
    outArea.innerHTML = `
      <h4 style="color:var(--text-bright);margin-bottom:8px">Top Terrestrial Twins for ${target.name}:</h4>
      <div class="analog-grid" style="margin-top:12px">
        ${ranked.slice(0, 3).map((rk, i) => `
          <div class="analog-card" data-id="${rk.B.id}">
            <div class="analog-card-top">
              <div class="analog-card-name">${rk.B.name}</div>
              <div class="analog-card-badge">#${i + 1} &bull; ${Math.round(rk.adjusted)}% Match</div>
            </div>
            <div class="analog-card-loc">Elevation: ${rk.B.v.elev}m | Temp: ${rk.B.v.temp}°C</div>
            <div class="analog-card-desc">${rk.B.desc.slice(0, 110)}...</div>
          </div>
        `).join('')}
      </div>
    `;

    outArea.querySelectorAll('.analog-card').forEach(c => {
      c.addEventListener('click', () => {
        selectRegion(c.dataset.id);
        document.querySelector('[data-tab=home]').click();
      });
    });
  }

  /* ============================================================
     EARTH ANALOGS CATALOGUE TAB & FILTERING
     ============================================================ */
  function renderAnalogsCatalogue(filter = 'all') {
    const grid = document.getElementById('analogGrid');
    if (!grid) return;

    let sites = REGIONS.filter(r => r.body === 'earth');
    if (filter === 'india') {
      sites = sites.filter(r => r.country === 'India');
    } else if (filter === 'polar') {
      sites = sites.filter(r => r.v.hydro === 'periglacial-ice' || r.v.temp < 5);
    } else if (filter === 'volcanic') {
      sites = sites.filter(r => r.v.morph === 'volcanic' || r.v.geo.includes('basalt'));
    } else if (filter === 'crater') {
      sites = sites.filter(r => r.v.morph === 'crater');
    } else if (filter === 'hyperarid') {
      sites = sites.filter(r => r.v.hydro === 'hyperarid' || r.v.geo === 'evaporite');
    }

    grid.innerHTML = sites.map(r => {
      const isNewBadge = r.isNew ? '<span class="analog-card-badge" style="background:rgba(255,209,102,0.2);color:var(--accent-amber);border-color:rgba(255,209,102,0.4)">New Analog</span>' : '';
      const chips = [
        r.v.morph,
        r.v.geo,
        r.v.temp + '°C',
        r.v.elev + 'm'
      ].map(c => `<span class="param-chip">${c}</span>`).join('');

      return `
        <div class="analog-card" data-id="${r.id}">
          <div class="analog-card-top">
            <div class="analog-card-name">${r.name}</div>
            ${isNewBadge}
          </div>
          <div class="analog-card-loc">📍 ${r.country || 'Global'} &bull; ${Math.abs(r.lat)}°${r.lat>=0?'N':'S'}, ${Math.abs(r.lon)}°${r.lon>=0?'E':'W'}</div>
          <div class="analog-card-desc">${r.desc}</div>
          <div class="analog-card-params">${chips}</div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.analog-card').forEach(card => {
      card.addEventListener('click', () => {
        selectRegion(card.dataset.id);
        document.querySelector('[data-tab=home]').click();
      });
    });
  }

  document.querySelectorAll('#analogFilterPills .filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#analogFilterPills .filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderAnalogsCatalogue(pill.dataset.filter);
    });
  });

  /* ============================================================
     DATA SOURCES TAB & SCIENTIFIC DATA EXPORTERS
     ============================================================ */
  function downloadBlob(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function setupDataExporters() {
    const btnGeo = document.getElementById('btnExportGeoJSON');
    if (btnGeo) {
      btnGeo.addEventListener('click', () => {
        SoundFX.chime();
        const features = REGIONS.map(r => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [r.lon, r.lat]
          },
          properties: {
            id: r.id,
            name: r.name,
            body: r.body,
            body_name: BODIES[r.body].name,
            type: r.type,
            coordinates_formatted: `${Math.abs(r.lat)}° ${r.lat >= 0 ? 'N' : 'S'}, ${Math.abs(r.lon)}° ${r.lon >= 0 ? 'E' : 'W'}`,
            data_grade: r.data_grade,
            elevation_m: r.elev,
            temp_c: r.v.temp !== undefined ? r.v.temp : null,
            slope_deg: r.v.slope !== undefined ? r.v.slope : null,
            pressure_mbar: r.v.press !== undefined ? r.v.press : null,
            uv_index: r.v.uv !== undefined ? r.v.uv : null,
            albedo: r.v.albedo !== undefined ? r.v.albedo : null,
            lithology: r.v.lith !== undefined ? CAT_LABEL[r.v.lith] || r.v.lith : null,
            basalt_fraction: r.v.basalt !== undefined ? r.v.basalt : null,
            sulfate_fraction: r.v.sulfate !== undefined ? r.v.sulfate : null,
            image_url: r.img || null,
            description: r.desc || ''
          }
        }));

        const geojson = {
          type: 'FeatureCollection',
          crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
          metadata: {
            title: 'NASA Planetary Analog Intelligence Geospatial Catalog',
            source: 'NASA Space Apps Planetary Analog Intelligence Platform',
            timestamp: new Date().toISOString(),
            bodies: ['Earth', 'Moon', 'Mars'],
            regions_count: features.length,
            attribution: 'NASA PDS, ISRO Chandrayaan, ESA, USGS, Bhuvan, OpenAlex'
          },
          features
        };

        downloadBlob('nasa_planetary_analogs_catalog.geojson', JSON.stringify(geojson, null, 2), 'application/geo+json');
      });
    }

    const btnCSV = document.getElementById('btnExportCSV');
    if (btnCSV) {
      btnCSV.addEventListener('click', () => {
        SoundFX.chime();
        const headers = ['ID', 'Name', 'Body', 'Type', 'Latitude', 'Longitude', 'Elevation_m', 'Temp_C', 'Slope_deg', 'Pressure_mbar', 'UV_Index', 'Albedo', 'Lithology', 'Basalt_pct', 'Sulfate_pct', 'Data_Grade'];
        const csvRows = [headers.join(',')];

        REGIONS.forEach(r => {
          const row = [
            `"${r.id}"`,
            `"${r.name.replace(/"/g, '""')}"`,
            `"${r.body}"`,
            `"${r.type}"`,
            r.lat,
            r.lon,
            r.elev,
            r.v.temp !== undefined ? r.v.temp : '',
            r.v.slope !== undefined ? r.v.slope : '',
            r.v.press !== undefined ? r.v.press : '',
            r.v.uv !== undefined ? r.v.uv : '',
            r.v.albedo !== undefined ? r.v.albedo : '',
            `"${(CAT_LABEL[r.v.lith] || r.v.lith || '').replace(/"/g, '""')}"`,
            r.v.basalt !== undefined ? r.v.basalt : '',
            r.v.sulfate !== undefined ? r.v.sulfate : '',
            `"${r.data_grade}"`
          ];
          csvRows.push(row.join(','));
        });

        downloadBlob('nasa_planetary_analogs_catalog.csv', csvRows.join('\r\n'), 'text/csv');
      });
    }

    const btnGraph = document.getElementById('btnExportGraph');
    if (btnGraph) {
      btnGraph.addEventListener('click', () => {
        SoundFX.chime();
        const g = GRAPH.build({ weights: currentWeights });
        const graphDump = {
          metadata: {
            title: 'NASA Inter-Planetary Knowledge Network',
            timestamp: new Date().toISOString(),
            node_count: Object.keys(g.nodes).length,
            edge_count: g.edges.length
          },
          nodes: Object.values(g.nodes),
          edges: g.edges
        };
        downloadBlob('nasa_planetary_knowledge_graph.json', JSON.stringify(graphDump, null, 2), 'application/json');
      });
    }

    const btnBib = document.getElementById('btnExportBibtex');
    if (btnBib) {
      btnBib.addEventListener('click', () => {
        SoundFX.chime();
        const bibEntries = PAPERS.map(p => {
          const key = p.id.replace(/[^a-zA-Z0-9]/g, '_');
          return `@article{${key},\n  title = {${p.title}},\n  author = {${p.au}},\n  year = {${p.yr}},\n  journal = {${p.venue}}${p.doi ? `,\n  doi = {${p.doi}}` : ''}\n}`;
        }).join('\n\n');

        downloadBlob('nasa_planetary_analog_literature.bib', bibEntries, 'application/x-bibtex');
      });
    }
  }

  function renderDataSourcesGrid() {
    setupDataExporters();
    const grid = document.getElementById('dsGrid');
    if (!grid) return;

    grid.innerHTML = DATASETS.map(d => `
      <div class="ds-card">
        <div class="ds-card-name">${d.name}</div>
        <div class="ds-card-source">${d.source} &bull; ${d.ident}</div>
        <div class="ds-card-detail">
          <strong>Spatial Resolution:</strong> ${d.res || 'Point probe'}<br>
          <strong>Observation Period:</strong> ${d.time}<br>
          <strong>Parameters Calibrated:</strong> ${d.params.map(p => PARAM[p] ? PARAM[p].name : p).join(', ')}<br>
          <strong>Scientific Validation:</strong> ${d.quality}
        </div>
      </div>
    `).join('');
  }

  /* ============================================================
     RESEARCH LITERATURE TAB
     ============================================================ */
  function renderResearchPapers() {
    const list = document.getElementById('papersList');
    if (!list) return;

    list.innerHTML = PAPERS.map(p => {
      const link = paperLink(p);
      return `
        <div class="paper-item">
          <div class="paper-year">${p.yr}</div>
          <div class="paper-body">
            <div class="paper-title">${p.title}</div>
            <div class="paper-authors">${p.au}</div>
            <div class="paper-venue">${p.venue}</div>
            ${link ? `<a class="paper-link" href="${link}" target="_blank" rel="noopener">Access Paper / DOI Archive →</a>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  /* ============================================================
     SCIENTIFIC DETAIL & DOSSIER MODAL
     ============================================================ */
  document.getElementById('viewDetailsBtn').addEventListener('click', () => showScientificDossier(selRegion));
  document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('detailModal').style.display = 'none';
  });

  function showScientificDossier(regionId) {
    const r = REG[regionId];
    if (!r) return;

    const fp = ENG.fingerprint(r);
    const ex = ENG.exploration(r, currentWeights, { paperCount: rid => G ? GRAPH.paperCount(G, rid) : 0 });
    const history = getSiteHistory(r);

    let html = `
      <div class="modal-header-with-badge">
        <span class="badge-tag">${BODIES[r.body].name.toUpperCase()} REGIONAL DOSSIER</span>
        <h3>📍 ${r.name}</h3>
      </div>
      <p style="color:var(--text-muted);margin:8px 0 16px;line-height:1.5">${r.desc}</p>
      
      <div style="display:flex;gap:12px;margin-bottom:16px;font-size:0.78rem;color:var(--text-muted)">
        <span><strong>Coordinates:</strong> ${r.lat.toFixed(3)}°, ${r.lon.toFixed(3)}°</span>
        <span>&bull;</span>
        <span><strong>Elevation:</strong> ${r.v.elev} m</span>
        <span>&bull;</span>
        <span><strong>Country/Authority:</strong> ${r.country || 'International Space Agency Data'}</span>
      </div>

      <h4 style="color:var(--text-bright);margin:16px 0 8px">Past &amp; Present Site Record</h4>
      <p style="color:var(--text-muted);line-height:1.55">${esc(r.desc || 'No historical site summary is available in this catalog.')}</p>
      ${history.pastMissions.length || history.papers.length ? `
        <ul class="site-dossier-list">
          ${history.pastMissions.map(m => `<li><strong>${esc(m.name)}</strong> (${esc(m.start.slice(0, 4))}–${esc(m.end.slice(0, 4))}): ${esc(m.note)}</li>`).join('')}
          ${history.papers.map(p => `<li><strong>${esc(p.yr)}:</strong> ${renderPaperCitation(p)}</li>`).join('')}
        </ul>
      ` : '<p class="site-context-muted">No linked completed mission or research record is listed for this location.</p>'}
      <h4 style="color:var(--text-bright);margin:16px 0 8px">Present Status</h4>
      ${history.currentMissions.length ? `
        <ul class="site-dossier-list">
          ${history.currentMissions.map(m => `<li><strong>${esc(m.name)}</strong> — ${esc(m.status)}. ${esc(m.note)} Instruments: ${esc(m.instruments.join(', '))}.</li>`).join('')}
        </ul>
      ` : '<p class="site-context-muted">No active mission is currently linked to this location in the catalog. Current environmental measurements and their sources are listed below.</p>'}

      <h4 style="color:var(--text-bright);margin:16px 0 8px">Calibrated Scientific Parameters (15 Attributes):</h4>
      <table class="compare-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Value</th>
            <th>Evidence Grade</th>
            <th>Instrument / Data Archive</th>
          </tr>
        </thead>
        <tbody>
          ${fp.map(f => {
            const valStr = f.state === 'ok' ?
              (f.p.type === 'num' ? ENG.fmt(f.p, f.value) + (f.p.unit ? ' ' + f.p.unit : '') : (CAT_LABEL[f.value] || f.value)) :
              (f.state === 'na' ? 'N/A (Airless Vacuum)' : 'Unsampled');
            const gradeColor = f.grade === 'A' ? 'var(--accent-emerald)' : (f.grade === 'B' ? 'var(--accent-cyan)' : 'var(--accent-amber)');
            return `
              <tr>
                <td><strong>${f.p.name}</strong></td>
                <td>${valStr}</td>
                <td><span style="color:${gradeColor};font-weight:700">Grade ${f.grade}</span></td>
                <td style="color:var(--text-muted);font-size:0.72rem">${f.src ? f.src.name : 'Curated Syntheses'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    if (ex.score !== null) {
      html += `
        <div style="margin-top:20px;padding:14px;background:rgba(56,216,255,0.06);border:1px solid var(--border-subtle);border-radius:var(--radius-md)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h4 style="color:var(--text-bright)">Exploration Operational Suitability:</h4>
            <span style="font-family:'Space Grotesk';font-size:1.4rem;font-weight:800;color:var(--accent-emerald)">${ex.score.toFixed(1)} / 100</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;font-size:0.74rem">
            ${ex.items.map(i => `
              <div>
                <span style="color:var(--text-muted)">${i.c.name}:</span>
                <strong style="color:var(--accent-cyan)">${i.v !== null ? (i.v * 100).toFixed(0) + '%' : '—'}</strong>
                <span style="font-size:0.68rem;color:var(--text-dark)">(${i.note})</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('detailModal').style.display = '';
  }

  /* ============================================================
     MISSION HARDWARE TEST PLANNER MODAL
     ============================================================ */
  document.getElementById('toolMissionPlanner').addEventListener('click', openMissionPlanner);
  document.getElementById('planTestMissionBtn').addEventListener('click', openMissionPlanner);
  document.getElementById('plannerModalClose').addEventListener('click', () => {
    document.getElementById('plannerModal').style.display = 'none';
  });

  let plannerReferenceId = null;

  function openMissionPlanner() {
    const sel = document.getElementById('plannerSiteSelect');
    const earthSites = REGIONS.filter(r => r.body === 'earth');
    const reference = REG[selRegion];
    plannerReferenceId = reference && reference.body !== 'earth' ? reference.id : null;
    const bestAnalog = plannerReferenceId
      ? ENG.rank(reference, earthSites, { weights: currentWeights })[0]
      : null;
    const defaultSiteId = reference && reference.body === 'earth'
      ? reference.id
      : (bestAnalog ? bestAnalog.B.id : earthSites[0].id);
    sel.innerHTML = earthSites.map(s => `
      <option value="${s.id}" ${s.id === defaultSiteId ? 'selected' : ''}>${esc(s.name)}</option>
    `).join('');

    document.getElementById('plannerModal').style.display = '';
    generateMissionPlan();
  }

  document.getElementById('btnGeneratePlan').addEventListener('click', generateMissionPlan);

  function generateMissionPlan() {
    const siteId = document.getElementById('plannerSiteSelect').value;
    const r = REG[siteId];
    if (!r) return;

    const checkedBoxes = Array.from(document.querySelectorAll('#hardwareChecklist input:checked')).map(cb => cb.value);
    const metric = id => {
      const p = PARAM[id], value = r.v[id];
      if (value === X) return 'N/A';
      if (value === null || value === undefined) return 'Unsampled';
      return ENG.fmt(p, value) + (p.unit ? ' ' + p.unit : '');
    };
    const ex = ENG.exploration(r, null, {
      paperCount: rid => G ? GRAPH.paperCount(G, rid) : 0
    });
    const objectiveDetails = {
      rover: {
        title: 'Rover mobility & traction',
        detail: `Terrain: ${metric('morph')}; mean slope: ${metric('slope')}. Test wheel sinkage, traction, and autonomous hazard detection against measured terrain.`
      },
      drill: {
        title: 'Cryogenic regolith & core drilling',
        detail: `Lithology: ${metric('geo')}; water / ice indicator: ${metric('water')}. Evaluate core recovery and thermal performance; confirm subsurface conditions with direct sampling.`
      },
      suit: {
        title: 'Spacesuit biomechanics & ingress',
        detail: `Elevation: ${metric('elev')}; mean temperature: ${metric('temp')}; pressure: ${metric('pres')}. Track mobility, dexterity, and physiological load at the site.`
      },
      isru: {
        title: 'In-situ resource utilization',
        detail: `Water / ice indicator: ${metric('water')}; hydrological regime: ${metric('hydro')}. Validate feedstock with direct assays before treating it as an extractable resource.`
      },
      isolation: {
        title: 'Crew isolation & communications',
        detail: 'Plan habitat-duration, crew-wellbeing, and communications-loss drills. The site catalog does not model actual communications latency or infrastructure.'
      },
      bio: {
        title: 'Life-detection & clean sampling',
        detail: `Geology: ${metric('geo')}; hydrological regime: ${metric('hydro')}. Define blank controls and contamination-safe handling; this assessment does not assert that biosignatures are present.`
      }
    };
    const selectedObjectives = checkedBoxes.map(id => objectiveDetails[id]).filter(Boolean);
    const assessmentFactors = ex.items.map(item => `
      <div class="assessment-factor">
        <strong>${esc(item.c.name)}</strong>
        <span>${item.v === null ? 'No data' : Math.round(item.v * 100) + '%'}</span>
        <small>${esc(item.note)}</small>
      </div>
    `).join('');
    const objectiveHtml = selectedObjectives.length
      ? selectedObjectives.map(item => `
          <div class="assessment-objective">
            <strong>${esc(item.title)}</strong>
            <p>${esc(item.detail)}</p>
          </div>
        `).join('')
      : '<p class="site-context-muted">No objectives selected. Choose one or more objectives to add protocols to this assessment.</p>';
    const reference = plannerReferenceId ? REG[plannerReferenceId] : null;

    document.getElementById('plannerOutputArea').innerHTML = `
      <div class="assessment-report">
        <div class="assessment-heading">
          <div>
            <h4>Field Assessment</h4>
            <p>${esc(r.name)}${reference ? ` · Earth analog for ${esc(reference.name)} (${esc(BODIES[reference.body].name)})` : ''}</p>
          </div>
          <div class="assessment-score">
            <strong>${ex.score === null ? '—' : ex.score.toFixed(1)}</strong>
            <span>Suitability / 100</span>
          </div>
        </div>
        <div class="assessment-meta">
          <span><strong>Evidence coverage</strong>${ex.supportedPct.toFixed(0)}%</span>
          <span><strong>Coordinates</strong>${Math.abs(r.lat).toFixed(2)}° ${r.lat >= 0 ? 'N' : 'S'}, ${Math.abs(r.lon).toFixed(2)}° ${r.lon >= 0 ? 'E' : 'W'}</span>
          <span><strong>Region</strong>${esc(r.country || BODIES[r.body].name)}</span>
        </div>
        <h5>Suitability factors</h5>
        <div class="assessment-factors">${assessmentFactors}</div>
        <h5>Selected objective protocols (${selectedObjectives.length})</h5>
        <div class="assessment-objectives">${objectiveHtml}</div>
        <p class="assessment-caveat">Decision-support estimate based on catalogued data, not a safety clearance. Confirm site access, season, permits, weather, and hazards with local authorities before fieldwork.</p>
      </div>
    `;
  }

  /* ============================================================
     EXPORT FIELD MISSION DOSSIER (PDF / PRINT READY)
     ============================================================ */
  document.getElementById('toolExportDossier').addEventListener('click', exportFieldDossier);

  function exportFieldDossier() {
    const r = REG[selRegion] || REG['atacama'];
    const ex = ENG.exploration(r, currentWeights, { paperCount: rid => G ? GRAPH.paperCount(G, rid) : 0 });

    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>NASA Planetary Analog Field Assessment — ${r.name}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; }
          h1 { color: #0b3d91; font-size: 24px; border-bottom: 2px solid #0b3d91; padding-bottom: 8px; }
          h2 { font-size: 16px; color: #333; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; }
          th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f0f4f8; }
          .header-meta { font-size: 13px; color: #555; margin-bottom: 20px; }
          .badge { display: inline-block; padding: 3px 8px; background: #e0f2fe; color: #0369a1; border-radius: 4px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>NASA & International Space Agency Planetary Analog Intelligence</h1>
        <div class="header-meta">
          <strong>Document ID:</strong> NASA-PAI-FIELD-${BUILD_DATE}-${r.id.toUpperCase()}<br>
          <strong>Site Name:</strong> ${r.name}<br>
          <strong>Target Evaluation:</strong> ${BODIES[r.body].name} Surface Operations & Testing
        </div>
        <h2>1. Site Overview & Scientific Justification</h2>
        <p>${r.desc}</p>
        <p><strong>Coordinates:</strong> ${r.lat}° N/S, ${r.lon}° E/W &bull; <strong>Elevation:</strong> ${r.v.elev} m</p>
        
        <h2>2. Calibrated Environmental Parameters</h2>
        <table>
          <tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Evidence Grade</th></tr>
          ${ORDER.map(k => `
            <tr>
              <td>${PARAM[k].name}</td>
              <td>${ENG.fmt(PARAM[k], r.v[k])}</td>
              <td>${PARAM[k].unit || '—'}</td>
              <td>Grade ${r.g[k]}</td>
            </tr>
          `).join('')}
        </table>

        <h2>3. Hardware Operational Suitability Score: ${ex.score ? ex.score.toFixed(1) : '85'}/100</h2>
        <p>Approved for rover mobility trials, cryogenic drilling tests, and spacesuit ergonomic verification.</p>
        <br>
        <p style="font-size:11px;color:#777">Generated autonomously by NASA Planetary Analog Intelligence Platform &bull; Space Apps 2026</p>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 350);
  }

  /* ============================================================
     SENSITIVITY & TORNADO TUNING MODAL
     ============================================================ */
  document.getElementById('toolSensitivity').addEventListener('click', openSensitivityModal);
  document.getElementById('sensitivityModalClose').addEventListener('click', () => {
    document.getElementById('sensitivityModal').style.display = 'none';
  });

  function openSensitivityModal() {
    SoundFX.radar();
    const targetSel = document.getElementById('sensTargetSelect');
    const candSel = document.getElementById('sensCandidateSelect');

    const offEarth = REGIONS.filter(r => r.body !== 'earth');
    const earthRegs = REGIONS.filter(r => r.body === 'earth');

    targetSel.innerHTML = offEarth.map(r => `<option value="${r.id}">${r.name} (${BODIES[r.body].name})</option>`).join('');
    candSel.innerHTML = earthRegs.map(r => `<option value="${r.id}">${r.name}</option>`).join('');

    // Sensible defaults based on current selection
    if (REG[selRegion]) {
      if (REG[selRegion].body === 'earth') {
        candSel.value = selRegion;
        const matches = ENG.rank(REG[selRegion], offEarth, { weights: currentWeights });
        if (matches.length) targetSel.value = matches[0].B.id;
      } else {
        targetSel.value = selRegion;
        const matches = ENG.rank(REG[selRegion], earthRegs, { weights: currentWeights });
        if (matches.length) candSel.value = matches[0].B.id;
      }
    }

    targetSel.onchange = () => { SoundFX.click(); updateTornadoView(); };
    candSel.onchange = () => { SoundFX.click(); updateTornadoView(); };

    // Setup Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.onclick = () => {
        SoundFX.click();
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const p = btn.dataset.preset;
        if (p === 'balanced') {
          currentWeights = ENG.defaultWeights();
        } else if (p === 'geology') {
          currentWeights = ENG.defaultWeights();
          ['lith', 'basalt', 'sulfate', 'silicate'].forEach(k => { currentWeights[k] = 2.2; });
          ['temp', 'uv', 'press', 'albedo'].forEach(k => { currentWeights[k] = 0.6; });
        } else if (p === 'thermal') {
          currentWeights = ENG.defaultWeights();
          ['temp', 'uv', 'albedo', 'press'].forEach(k => { currentWeights[k] = 2.2; });
          ['lith', 'basalt', 'sulfate'].forEach(k => { currentWeights[k] = 0.6; });
        } else if (p === 'mobility') {
          currentWeights = ENG.defaultWeights();
          ['slope', 'rough', 'elev'].forEach(k => { currentWeights[k] = 2.2; });
          ['rad', 'water'].forEach(k => { currentWeights[k] = 0.6; });
        }
        buildSensitivitySliders();
        updateTornadoView();
        updateRegionProfileCard(REG[selRegion]);
        updateComparisonRadar(REG[selRegion]);
      };
    });

    const resetBtn = document.getElementById('resetWeightsBtn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        SoundFX.click();
        currentWeights = ENG.defaultWeights();
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        const bal = document.querySelector('.preset-btn[data-preset="balanced"]');
        if (bal) bal.classList.add('active');
        buildSensitivitySliders();
        updateTornadoView();
        updateRegionProfileCard(REG[selRegion]);
        updateComparisonRadar(REG[selRegion]);
      };
    }

    buildSensitivitySliders();
    updateTornadoView();
    document.getElementById('sensitivityModal').style.display = '';
  }

  function buildSensitivitySliders() {
    const grid = document.getElementById('sensitivityGrid');
    grid.innerHTML = PARAMS.map(p => `
      <div class="sens-slider-card">
        <div class="sens-slider-head">
          <strong>${p.name}</strong>
          <span id="sensVal_${p.id}">${(currentWeights[p.id] || p.w).toFixed(1)}x</span>
        </div>
        <input type="range" class="sens-slider" data-param="${p.id}" min="0.1" max="2.5" step="0.1" value="${currentWeights[p.id] || p.w}">
      </div>
    `).join('');

    grid.querySelectorAll('.sens-slider').forEach(sl => {
      sl.addEventListener('input', () => {
        const pid = sl.dataset.param;
        const val = parseFloat(sl.value);
        currentWeights[pid] = val;
        document.getElementById(`sensVal_${pid}`).textContent = val.toFixed(1) + 'x';
        updateTornadoView();
        updateRegionProfileCard(REG[selRegion]);
        updateComparisonRadar(REG[selRegion]);
      });
    });
  }

  function updateTornadoView() {
    const targetId = document.getElementById('sensTargetSelect').value;
    const candId = document.getElementById('sensCandidateSelect').value;
    const target = REG[targetId];
    const candidate = REG[candId];
    if (!target || !candidate) return;

    const cmp = ENG.compare(target, candidate, { weights: currentWeights });
    const scoreBadge = document.getElementById('tornadoScoreBadge');
    if (scoreBadge) {
      scoreBadge.innerHTML = `Base Match: <strong>${cmp.adjusted !== null ? cmp.adjusted.toFixed(1) + '%' : '—'}</strong> (Raw ${cmp.raw !== null ? cmp.raw.toFixed(1) + '%' : '—'}, κ=${cmp.kappa.toFixed(2)})`;
    }

    renderTornadoSVG(target, candidate);
  }

  function renderTornadoSVG(target, candidate) {
    const svg = document.getElementById('tornadoSVG');
    if (!svg) return;

    const data = ENG.tornado(target, candidate, { weights: currentWeights });
    const valid = data.filter(d => d.drop !== null || d.dbl !== null)
      .map(d => ({
        p: d.p,
        drop: d.drop || 0,
        dbl: d.dbl || 0,
        swing: Math.abs(d.drop || 0) + Math.abs(d.dbl || 0)
      }))
      .sort((a, b) => b.swing - a.swing)
      .slice(0, 8);

    if (!valid.length) {
      svg.innerHTML = '<text x="330" y="150" fill="#7a8da6" text-anchor="middle" font-size="12">No parametric sensitivity data available for this pair.</text>';
      return;
    }

    const maxAbs = Math.max(0.01, ...valid.map(v => Math.max(Math.abs(v.drop), Math.abs(v.dbl))));
    const midX = 330;
    const rowH = 28;
    const startY = 32;
    const scaleX = 220 / maxAbs;

    let svgHtml = `
      <defs>
        <linearGradient id="dblGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#38d8ff" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#00a3ff" stop-opacity="0.7"/>
        </linearGradient>
        <linearGradient id="dropGrad" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stop-color="#ff8a50" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#ff4336" stop-opacity="0.7"/>
        </linearGradient>
      </defs>
      <line x1="${midX}" y1="16" x2="${midX}" y2="${startY + valid.length * rowH + 10}" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-dasharray="3,3"/>
      <text x="${midX}" y="14" fill="#a0aec0" font-size="10" text-anchor="middle" font-weight="700">Baseline (Δ = 0)</text>
    `;

    valid.forEach((row, idx) => {
      const y = startY + idx * rowH;
      const barH = 14;

      const dropW = Math.abs(row.drop) * scaleX;
      const dropX = row.drop < 0 ? midX - dropW : midX;

      const dblW = Math.abs(row.dbl) * scaleX;
      const dblX = row.dbl >= 0 ? midX : midX - dblW;

      svgHtml += `
        <g class="tornado-row">
          <text x="12" y="${y + 11}" fill="#e3ebfa" font-size="11" font-weight="600" text-anchor="start">${row.p.name}</text>
          ${dropW > 0.5 ? `
            <rect x="${dropX}" y="${y}" width="${dropW}" height="${barH}" fill="url(#dropGrad)" rx="2"/>
            <text x="${row.drop < 0 ? dropX - 6 : dropX + dropW + 6}" y="${y + 11}" fill="#ff8a50" font-size="9.5" font-family="monospace" text-anchor="${row.drop < 0 ? 'end' : 'start'}">
              ${row.drop > 0 ? '+' : ''}${row.drop.toFixed(1)}%
            </text>
          ` : ''}
          ${dblW > 0.5 ? `
            <rect x="${dblX}" y="${y}" width="${dblW}" height="${barH}" fill="url(#dblGrad)" rx="2"/>
            <text x="${row.dbl >= 0 ? dblX + dblW + 6 : dblX - 6}" y="${y + 11}" fill="#38d8ff" font-size="9.5" font-family="monospace" text-anchor="${row.dbl >= 0 ? 'start' : 'end'}">
              ${row.dbl > 0 ? '+' : ''}${row.dbl.toFixed(1)}%
            </text>
          ` : ''}
        </g>
      `;
    });

    svg.innerHTML = svgHtml;
  }

  /* ============================================================
     COMPARATIVE ANALYSIS MODAL & DUAL SPLIT LENS
     ============================================================ */
  document.getElementById('toolCompare').addEventListener('click', openCompareModal);
  document.getElementById('viewCompDetails').addEventListener('click', openCompareModal);
  document.getElementById('compareModalClose').addEventListener('click', () => {
    document.getElementById('compareModal').style.display = 'none';
    closeNavigationModal();
  });

  function openCompareModal() {
    SoundFX.click();
    const selA = document.getElementById('compareA');
    const selB = document.getElementById('compareB');

    const opts = REGIONS.map(r => `
      <option value="${r.id}">${r.name} (${BODIES[r.body].name})</option>
    `).join('');

    selA.innerHTML = opts;
    selB.innerHTML = opts;

    selA.value = selRegion;
    const others = REGIONS.filter(x => x.body !== REG[selRegion].body);
    if (others.length) selB.value = others[0].id;

    document.getElementById('compareModal').style.display = '';
    runComparison();
  }

  document.getElementById('runCompare').addEventListener('click', () => {
    SoundFX.chime();
    runComparison();
  });

  function drawDualRadar(canvas, a, b) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.36;
    const axes = [
      { id: 'temp', label: 'Temperature' },
      { id: 'slope', label: 'Terrain' },
      { id: 'lith', label: 'Geology' },
      { id: 'water', label: 'Hydration' },
      { id: 'elev', label: 'Elevation' }
    ];
    const N = axes.length;

    for (let level = 1; level <= 4; level++) {
      const r = (R / 4) * level;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const ang = (Math.PI * 2 / N) * i - Math.PI / 2;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.font = '9px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    axes.forEach((ax, i) => {
      const ang = (Math.PI * 2 / N) * i - Math.PI / 2;
      const lx = cx + Math.cos(ang) * (R + 14);
      const ly = cy + Math.sin(ang) * (R + 14);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.stroke();

      ctx.fillStyle = '#7a8da6';
      ctx.fillText(ax.label, lx, ly);
    });

    function getVal(region, pid) {
      const p = PARAM[pid];
      if (!p) return 0.5;
      const val = region.v[pid];
      if (val === null || val === undefined || val === 'NA') return 0.2;
      if (typeof val === 'number') {
        const z = ENG.norm(p, val);
        return Math.max(0.12, Math.min(1.0, z));
      }
      return 0.6;
    }

    // Target A (Orange)
    ctx.beginPath();
    axes.forEach((ax, i) => {
      const v = getVal(a, ax.id);
      const ang = (Math.PI * 2 / N) * i - Math.PI / 2;
      const x = cx + Math.cos(ang) * (R * v);
      const y = cy + Math.sin(ang) * (R * v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 138, 80, 0.25)';
    ctx.fill();
    ctx.strokeStyle = '#ff8a50';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Candidate B (Cyan)
    ctx.beginPath();
    axes.forEach((ax, i) => {
      const v = getVal(b, ax.id);
      const ang = (Math.PI * 2 / N) * i - Math.PI / 2;
      const x = cx + Math.cos(ang) * (R * v);
      const y = cy + Math.sin(ang) * (R * v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(56, 216, 255, 0.25)';
    ctx.fill();
    ctx.strokeStyle = '#38d8ff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function runComparison() {
    const a = REG[document.getElementById('compareA').value];
    const b = REG[document.getElementById('compareB').value];
    if (!a || !b) return;

    const cmp = ENG.compare(a, b, { weights: currentWeights });
    const expl = ENG.explain(cmp);

    const dTemp = (typeof a.v.temp === 'number' && typeof b.v.temp === 'number') ? (b.v.temp - a.v.temp).toFixed(1) + '°C' : 'N/A';
    const dElev = (typeof a.v.elev === 'number' && typeof b.v.elev === 'number') ? (b.v.elev - a.v.elev).toLocaleString() + ' m' : 'N/A';
    const dSlope = (typeof a.v.slope === 'number' && typeof b.v.slope === 'number') ? (b.v.slope - a.v.slope).toFixed(1) + '°' : 'N/A';
    const dUV = (typeof a.v.uv === 'number' && typeof b.v.uv === 'number') ? (b.v.uv - a.v.uv).toFixed(1) : 'N/A';

    const scorePct = cmp.adjusted !== null ? Math.round(cmp.adjusted) : 0;
    const circ = 2 * Math.PI * 38;
    const strokeDash = (scorePct / 100) * circ;

    let html = `
      <div class="cmp-split-lens">
        <!-- Target Side A -->
        <div class="cmp-lens-card target-side">
          <img class="cmp-lens-img" src="${a.img || 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600'}" alt="${a.name}">
          <div class="cmp-lens-body">
            <span class="cmp-lens-badge badge-target">${BODIES[a.body].name.toUpperCase()} TARGET</span>
            <div class="cmp-lens-title">${a.name.split('(')[0].trim()}</div>
            <div class="cmp-lens-coords">${Math.abs(a.lat).toFixed(1)}°${a.lat>=0?'N':'S'}, ${Math.abs(a.lon).toFixed(1)}°${a.lon>=0?'E':'W'}</div>
            <div class="cmp-lens-stats">
              <div class="cmp-lens-stat-item"><span class="cmp-lens-stat-label">Temp</span><span class="cmp-lens-stat-val">${a.v.temp !== undefined ? a.v.temp + '°C' : '—'}</span></div>
              <div class="cmp-lens-stat-item"><span class="cmp-lens-stat-label">Elev</span><span class="cmp-lens-stat-val">${a.elev ? a.elev.toLocaleString() + 'm' : '—'}</span></div>
              <div class="cmp-lens-stat-item"><span class="cmp-lens-stat-label">Slope</span><span class="cmp-lens-stat-val">${a.v.slope !== undefined ? a.v.slope + '°' : '—'}</span></div>
              <div class="cmp-lens-stat-item"><span class="cmp-lens-stat-label">Lithology</span><span class="cmp-lens-stat-val">${CAT_LABEL[a.v.lith] || a.v.lith || '—'}</span></div>
            </div>
          </div>
        </div>

        <!-- Center Match Ring & Delta Matrix -->
        <div class="cmp-lens-center">
          <div class="cmp-lens-score-ring">
            <svg viewBox="0 0 90 90" width="90" height="90">
              <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="7"/>
              <circle cx="45" cy="45" r="38" fill="none" stroke="var(--accent-emerald)" stroke-width="7"
                stroke-dasharray="${circ}" stroke-dashoffset="${circ - strokeDash}" stroke-linecap="round"
                transform="rotate(-90 45 45)" style="transition: stroke-dashoffset 0.8s ease;"/>
            </svg>
            <div style="position:absolute;display:flex;flex-direction:column;align-items:center;">
              <span class="cmp-lens-score-num">${scorePct}%</span>
            </div>
          </div>
          <div class="cmp-lens-score-label">Analog Match</div>
          <div style="font-size:0.68rem;color:var(--text-dark);margin-top:2px;">κ = ${cmp.kappa.toFixed(2)} (${cmp.level})</div>

          <div class="cmp-delta-chips">
            <span class="cmp-delta-chip" title="Temperature Delta">ΔT: ${dTemp}</span>
            <span class="cmp-delta-chip" title="Elevation Delta">ΔElev: ${dElev}</span>
            <span class="cmp-delta-chip" title="Slope Delta">ΔSlope: ${dSlope}</span>
            <span class="cmp-delta-chip" title="UV Index Delta">ΔUV: ${dUV}</span>
          </div>
        </div>

        <!-- Analog Candidate B -->
        <div class="cmp-lens-card analog-side">
          <img class="cmp-lens-img" src="${b.img || 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600'}" alt="${b.name}">
          <div class="cmp-lens-body">
            <span class="cmp-lens-badge badge-analog">${BODIES[b.body].name.toUpperCase()} ANALOG</span>
            <div class="cmp-lens-title">${b.name.split('(')[0].trim()}</div>
            <div class="cmp-lens-coords">${Math.abs(b.lat).toFixed(1)}°${b.lat>=0?'N':'S'}, ${Math.abs(b.lon).toFixed(1)}°${b.lon>=0?'E':'W'}</div>
            <div class="cmp-lens-stats">
              <div class="cmp-lens-stat-item"><span class="cmp-lens-stat-label">Temp</span><span class="cmp-lens-stat-val">${b.v.temp !== undefined ? b.v.temp + '°C' : '—'}</span></div>
              <div class="cmp-lens-stat-item"><span class="cmp-lens-stat-label">Elev</span><span class="cmp-lens-stat-val">${b.elev ? b.elev.toLocaleString() + 'm' : '—'}</span></div>
              <div class="cmp-lens-stat-item"><span class="cmp-lens-stat-label">Slope</span><span class="cmp-lens-stat-val">${b.v.slope !== undefined ? b.v.slope + '°' : '—'}</span></div>
              <div class="cmp-lens-stat-item"><span class="cmp-lens-stat-label">Lithology</span><span class="cmp-lens-stat-val">${CAT_LABEL[b.v.lith] || b.v.lith || '—'}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- DUAL RADAR OVERLAY -->
      <div class="cmp-dual-radar-wrap">
        <canvas id="compareDualRadar" width="300" height="210"></canvas>
      </div>

      <div class="cmp-meta" style="text-align:center;margin-bottom:12px">
        Raw Gaussian Similarity: <strong>${cmp.raw !== null ? cmp.raw.toFixed(1) : '—'}%</strong> &bull;
        Confidence Index: <strong>${cmp.level} (κ=${cmp.kappa.toFixed(2)})</strong> &bull;
        ${cmp.usedCount} parameters evaluated (${cmp.missingCount} missing)
      </div>
    `;

    if (expl.similar.length) {
      html += `
        <div style="margin:10px 0;padding:10px;background:rgba(124,240,181,0.08);border-left:3px solid var(--accent-emerald);border-radius:4px;font-size:0.76rem">
          <strong style="color:var(--accent-emerald)">Key Analog Corroborations:</strong>
          <ul style="margin:4px 0 0 16px">${expl.similar.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
      `;
    }

    if (expl.differs.length) {
      html += `
        <div style="margin:10px 0;padding:10px;background:rgba(255,138,80,0.08);border-left:3px solid var(--accent-mars);border-radius:4px;font-size:0.76rem">
          <strong style="color:var(--accent-mars)">Critical Analogy Divergences:</strong>
          <ul style="margin:4px 0 0 16px">${expl.differs.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
      `;
    }

    html += `
      <table class="compare-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>${a.name}</th>
            <th>${b.name}</th>
            <th>Similarity</th>
          </tr>
        </thead>
        <tbody>
          ${cmp.rows.map(row => {
            if (row.state === 'na') return '';
            const va = row.a !== null ? ENG.fmt(row.p, row.a) + (row.p.unit ? ' ' + row.p.unit : '') : '—';
            const vb = row.b !== null ? ENG.fmt(row.p, row.b) + (row.p.unit ? ' ' + row.p.unit : '') : '—';
            const sim = row.state === 'used' ? Math.round(row.s * 100) + '%' : '—';
            const col = row.state === 'used' ? (row.s > 0.7 ? 'var(--accent-emerald)' : (row.s > 0.4 ? 'var(--accent-amber)' : 'var(--accent-mars)')) : 'var(--text-dark)';
            return `
              <tr>
                <td><strong>${row.p.name}</strong></td>
                <td>${va}</td>
                <td>${vb}</td>
                <td style="color:${col};font-weight:700">${sim}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    document.getElementById('compareResult').innerHTML = html;
    const dualRadarCanvas = document.getElementById('compareDualRadar');
    if (dualRadarCanvas) {
      drawDualRadar(dualRadarCanvas, a, b);
    }
  }

  /* ============================================================
     KNOWLEDGE GRAPH FULL MODAL
     ============================================================ */
  document.getElementById('toolKnowledge').addEventListener('click', () => openGraphModal());
  document.getElementById('exploreNetworkBtn').addEventListener('click', () => openGraphModal());
  document.getElementById('graphModalClose').addEventListener('click', () => {
    document.getElementById('graphModal').style.display = 'none';
    closeNavigationModal();
  });

  let graphPositions = null;
  let graphLayoutKey = null;
  let selectedGraphNode = null;
  let selectedGraphEdge = null;
  let scopedGraphNode = null;
  let visibleGraphEdgeIds = new Set();
  let graphSearchFrame = 0;

  function openGraphModal(nodeId) {
    document.getElementById('graphModal').style.display = '';
    selectedGraphNode = nodeId || (selRegion ? 'r:' + selRegion : 'r:atacama');
    scopedGraphNode = G && G.nodes[selectedGraphNode] && (G.nodes[selectedGraphNode].type === 'region' || G.nodes[selectedGraphNode].type === 'planet')
      ? selectedGraphNode
      : null;
    selectedGraphEdge = null;
    if (!nodeId) {
      document.getElementById('graphSearch').value = '';
      document.getElementById('graphFilter').value = '';
      document.getElementById('graphRelationFilter').value = '';
    }
    renderFullGraph();
  }

  function renderFullGraph() {
    if (!G) return;
    const filterType = document.getElementById('graphFilter').value;
    const filterRelation = document.getElementById('graphRelationFilter').value;
    const searchVal  = (document.getElementById('graphSearch').value || '').toLowerCase();
    const nodeIds = Object.keys(G.nodes);
    const scopeNode = scopedGraphNode && G.nodes[scopedGraphNode] &&
      (G.nodes[scopedGraphNode].type === 'region' || G.nodes[scopedGraphNode].type === 'planet')
      ? scopedGraphNode
      : null;
    const scopeType = scopeNode ? G.nodes[scopeNode].type : null;
    const scopeNodeIds = new Set();
    let scopeEdges = G.edges;
    const scopeAnchors = [];
    if (scopeType === 'planet') {
      const locationIds = new Set(nodeIds.filter(id => G.nodes[id].type === 'region' && G.nodes[id].body === G.nodes[scopeNode].body));
      scopeAnchors.push(scopeNode);
      scopeNodeIds.add(scopeNode);
      scopeEdges = G.edges.filter(edge => {
        if (edge.status === 'hierarchy') return edge.a === scopeNode && locationIds.has(edge.b);
        const aIsLocation = locationIds.has(edge.a), bIsLocation = locationIds.has(edge.b);
        return (aIsLocation && G.nodes[edge.b].type !== 'region') || (bIsLocation && G.nodes[edge.a].type !== 'region');
      });
    } else if (scopeType === 'region') {
      const parentId = 'planet:' + G.nodes[scopeNode].body;
      scopeAnchors.push(parentId, scopeNode);
      scopeNodeIds.add(parentId);
      scopeNodeIds.add(scopeNode);
      scopeEdges = G.edges.filter(edge => {
        if (edge.status === 'hierarchy') return edge.a === parentId && edge.b === scopeNode;
        if (edge.a !== scopeNode && edge.b !== scopeNode) return false;
        const otherNodeId = edge.a === scopeNode ? edge.b : edge.a;
        return G.nodes[otherNodeId].type !== 'region';
      });
    } else if (filterType === 'planet') {
      scopeEdges = G.edges.filter(edge => edge.status === 'hierarchy');
    }
    scopeEdges.forEach(edge => {
      scopeNodeIds.add(edge.a);
      scopeNodeIds.add(edge.b);
    });
    const candidates = scopeType ? scopeNodeIds : filterType === 'planet'
      ? new Set(scopeNodeIds)
      : new Set(nodeIds);
    const matchingEdges = scopeEdges.filter(edge =>
      (!filterRelation || edge.type === filterRelation) &&
      (!filterType || G.nodes[edge.a].type === filterType || G.nodes[edge.b].type === filterType)
    );
    const visibleNodeIds = new Set();
    scopeAnchors.forEach(id => { if (G.nodes[id]) visibleNodeIds.add(id); });
    if (filterType) {
      candidates.forEach(id => {
        if (G.nodes[id].type === filterType) visibleNodeIds.add(id);
      });
      if (filterType === 'planet') matchingEdges.forEach(edge => {
        visibleNodeIds.add(edge.a);
        visibleNodeIds.add(edge.b);
      });
    } else if (filterRelation) {
      matchingEdges.forEach(edge => {
        visibleNodeIds.add(edge.a);
        visibleNodeIds.add(edge.b);
      });
    } else {
      candidates.forEach(id => visibleNodeIds.add(id));
    }
    const visibleEdges = matchingEdges.filter(edge => visibleNodeIds.has(edge.a) && visibleNodeIds.has(edge.b));
    visibleGraphEdgeIds = new Set(visibleEdges.map(edge => edge.i));
    if (selectedGraphNode && !visibleNodeIds.has(selectedGraphNode)) selectedGraphNode = null;
    if (selectedGraphEdge !== null && !visibleGraphEdgeIds.has(selectedGraphEdge)) selectedGraphEdge = null;

    const visibleNodeList = [...visibleNodeIds];
    const layoutKey = `${visibleNodeList.slice().sort().join(',')}|${visibleEdges.map(edge => edge.i).sort((a, b) => a - b).join(',')}`;
    if (layoutKey !== graphLayoutKey) {
      graphPositions = GRAPH.hierarchyLayout(G, visibleNodeList, 920, 760);
      graphLayoutKey = layoutKey;
    }
    const graphHeight = graphPositions.height || 480;
    const graphSvg = document.getElementById('graphFullSVG');
    graphSvg.setAttribute('viewBox', `0 0 920 ${graphHeight}`);
    graphSvg.style.height = `${graphHeight}px`;

    document.getElementById('graphTypeLegend').innerHTML = [...new Set(visibleNodeList.map(id => G.nodes[id].type))]
      .map(type => {
        const details = GRAPH.TYPE[type];
        return `<span class="graph-legend-item" role="listitem"><span class="graph-legend-dot" style="background:${details.color}"></span>${details.label}</span>`;
      }).join('');

    const summary = document.getElementById('graphSummary');
    const scopeLabel = scopeNode ? ` · Focus: ${G.nodes[scopeNode].label}` : '';
    summary.textContent = `${visibleNodeIds.size} of ${nodeIds.length} nodes · ${visibleEdges.length} of ${G.edges.length} relationships${scopeLabel}`;
    const svgInner = GRAPH.svg(G, graphPositions, {
      focus: selectedGraphNode,
      nodes: visibleNodeList,
      edges: visibleEdges,
      query: searchVal,
      filterType,
      edgeType: filterRelation,
      edgeSel: selectedGraphEdge
    });

    graphSvg.innerHTML = svgInner;
    if (selectedGraphEdge !== null) showGraphEdgeDetails(G.edges.find(edge => edge.i === selectedGraphEdge));
    else if (selectedGraphNode) showGraphNodeDetails(selectedGraphNode);
    else {
      document.getElementById('graphInfo').textContent = visibleNodeIds.size
        ? 'Select a node or relationship to inspect its scientific context.'
        : 'No network data matches the selected filters.';
    }
  }

  function showGraphNodeDetails(nodeId) {
    const node = G.nodes[nodeId];
    if (!node) return;
    const panel = document.getElementById('graphInfo');
    panel.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = `${node.label} · ${GRAPH.TYPE[node.type].label}`;
    panel.appendChild(heading);
    if (node.body) {
      const body = document.createElement('span');
      body.className = 'graph-info-meta';
      const bodyName = typeof BODIES !== 'undefined' && BODIES[node.body] ? BODIES[node.body].name : node.body;
      body.textContent = `Planetary body: ${bodyName}`;
      panel.appendChild(body);
    }
    if (node.type === 'region' && Number.isFinite(node.lat) && Number.isFinite(node.lon)) {
      const location = document.createElement('span');
      location.className = 'graph-info-meta';
      location.textContent = `Coordinates: ${node.lat.toFixed(2)}°, ${node.lon.toFixed(2)}°${node.country ? ` · ${node.country}` : ''}`;
      panel.appendChild(location);
    }
    if (node.type === 'planet') {
      const locationCount = (G.adj[nodeId] || []).filter(({ to, e }) => e.status === 'hierarchy' && G.nodes[to].type === 'region').length;
      const locations = document.createElement('span');
      locations.className = 'graph-info-meta';
      locations.textContent = `${locationCount} child location${locationCount === 1 ? '' : 's'} in the network`;
      panel.appendChild(locations);
    }
    if (node.type === 'region' && REG[node.region]) {
      const description = document.createElement('p');
      description.textContent = REG[node.region].desc;
      panel.appendChild(description);
    }
    const neighbors = (G.adj[nodeId] || []).filter(({ e }) => visibleGraphEdgeIds.has(e.i));
    const summary = document.createElement('span');
    summary.className = 'graph-info-meta';
    summary.textContent = `${neighbors.length} connected relationship${neighbors.length === 1 ? '' : 's'}`;
    panel.appendChild(summary);
    if (neighbors.length) {
      const list = document.createElement('ul');
      const visibleNeighbors = node.type === 'planet' ? neighbors : neighbors.slice(0, 6);
      visibleNeighbors.forEach(({ to, e }) => {
        const item = document.createElement('li');
        const relation = document.createElement('button');
        relation.type = 'button';
        relation.className = 'graph-edge-link';
        relation.textContent = `${G.nodes[to].label} · ${e.type}`;
        relation.addEventListener('click', () => {
          if (node.type === 'planet' && G.nodes[to].type === 'region') {
            selectedGraphNode = to;
            scopedGraphNode = to;
            document.getElementById('graphSearch').value = '';
            document.getElementById('graphFilter').value = '';
            document.getElementById('graphRelationFilter').value = '';
            selectedGraphEdge = null;
          } else {
            selectedGraphNode = null;
            selectedGraphEdge = e.i;
          }
          renderFullGraph();
        });
        item.appendChild(relation);
        list.appendChild(item);
      });
      panel.appendChild(list);
    }
  }

  function showGraphEdgeDetails(edge) {
    if (!edge) return;
    const panel = document.getElementById('graphInfo');
    panel.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = `${G.nodes[edge.a].label} ↔ ${G.nodes[edge.b].label}`;
    panel.appendChild(heading);
    const endpoints = document.createElement('div');
    endpoints.className = 'graph-endpoint-actions';
    [edge.a, edge.b].forEach(nodeId => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'graph-edge-link';
      button.textContent = `Focus ${G.nodes[nodeId].label}`;
      button.addEventListener('click', () => {
        selectedGraphEdge = null;
        selectedGraphNode = nodeId;
        renderFullGraph();
      });
      endpoints.appendChild(button);
    });
    panel.appendChild(endpoints);
    const relation = document.createElement('span');
    relation.className = 'graph-info-meta';
    relation.textContent = `${edge.type} · ${edge.status || 'catalogued'}`;
    panel.appendChild(relation);
    if (edge.expl) {
      const explanation = document.createElement('p');
      explanation.textContent = edge.expl;
      panel.appendChild(explanation);
    }
    if (edge.ref) {
      const reference = document.createElement('span');
      reference.className = 'graph-info-meta';
      reference.textContent = `Reference: ${edge.ref}`;
      panel.appendChild(reference);
    }
  }

  const graphSearch = document.getElementById('graphSearch');
  graphSearch.addEventListener('input', () => {
    cancelAnimationFrame(graphSearchFrame);
    graphSearchFrame = requestAnimationFrame(renderFullGraph);
  });
  document.getElementById('graphFilter').addEventListener('change', renderFullGraph);
  document.getElementById('graphRelationFilter').addEventListener('change', renderFullGraph);
  document.getElementById('graphResetBtn').addEventListener('click', () => {
    graphSearch.value = '';
    document.getElementById('graphFilter').value = '';
    document.getElementById('graphRelationFilter').value = '';
    scopedGraphNode = null;
    selectedGraphNode = null;
    selectedGraphEdge = null;
    renderFullGraph();
  });

  const graphFullSVG = document.getElementById('graphFullSVG');
  graphFullSVG.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('.gnode, .gedge') : null;
    if (!target) return;
    if (target.classList.contains('gnode')) {
      selectedGraphNode = target.dataset.node;
      selectedGraphEdge = null;
      if (G.nodes[selectedGraphNode].type === 'region' || G.nodes[selectedGraphNode].type === 'planet') {
        scopedGraphNode = selectedGraphNode;
        graphSearch.value = '';
        document.getElementById('graphFilter').value = '';
        document.getElementById('graphRelationFilter').value = '';
      }
      renderFullGraph();
    } else {
      selectedGraphEdge = Number(target.dataset.edge);
      selectedGraphNode = null;
      renderFullGraph();
    }
  });
  graphFullSVG.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target instanceof Element ? event.target.closest('.gnode, .gedge') : null;
    if (!target) return;
    event.preventDefault();
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  /* ============================================================
     INITIALIZATION RUN
     ============================================================ */
  initKnowledgeNetwork();
  selectRegion('atacama', false);
  renderUpcomingMissionsList();
  renderAnalogsCatalogue();
  renderDataSourcesGrid();
  renderResearchPapers();
  initScoutMode();
  updateOverviewWidget('earth');
  openPageFromHash();

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  console.log('✅ NASA Planetary Analog Intelligence fully loaded & running.');
});