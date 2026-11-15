'use strict';
/* ============================================================
   DATA LAYER — NASA & International Space Agency Planetary Analog Catalog
   Compiled from NASA PDS, ISRO Chandrayaan-1/2/3, ESA Mars Express,
   USGS Astrogeology, and peer-reviewed literature.
   ============================================================ */
const BUILD_DATE = '2026-11-14';
const N = null, X = 'NA';           // N = missing, X = not applicable for that body
if (typeof window !== 'undefined') { window.N = N; window.X = X; }
const GRADE_CONF = { A: 0.9, B: 0.7, C: 0.45 };

function symTable(list, def) {
  const t = {};
  list.forEach(([a, b, v]) => { t[a < b ? a + '|' + b : b + '|' + a] = v; });
  return (a, b) => (a === b ? 1 : (t[a < b ? a + '|' + b : b + '|' + a] ?? def));
}

const CAT_LABEL = {
  'sed-clay-sulfate': 'Clay/sulfate sedimentary',
  'basalt-altered': 'Aqueously altered basalt',
  'sed-sulfate-hematite': 'Sulfate–hematite sedimentary',
  'evaporite': 'Evaporite / hypersaline',
  'aeolian-sand': 'Aeolian sand & dunes',
  'basalt-volcanic': 'Basaltic volcanic / flood basalt',
  'dolerite-sandstone': 'Dolerite & sandstone',
  'impact-breccia': 'Impact breccia / shock melt',
  'sulfide-hydrothermal': 'Sulfide–sulfate hydrothermal',
  'basalt-layered-sulfate': 'Layered basalt & sulfate',
  'mare-basalt': 'Lunar mare basalt',
  'anorthosite-highland': 'Anorthositic highland regolith',
  crater: 'Impact crater',
  plain: 'Plain / lowland basin',
  dunefield: 'Dune field / erg',
  volcanic: 'Volcanic cone / caldera / plateau',
  canyon: 'Canyon / tectonic chasma',
  plateau: 'High plateau / cold desert',
  'paleo-lacustrine': 'Paleo-lake / lacustrine basin',
  'paleo-fluvial-delta': 'Paleo-fluvial / river delta',
  'paleo-groundwater': 'Paleo-groundwater upwelling',
  hyperarid: 'Hyperarid desert',
  'periglacial-ice': 'Permafrost / periglacial ground ice',
  'hydrothermal-acidic': 'Acidic hydrothermal springs',
  'glacial-meltwater': 'Glacial meltwater',
  'none-known': 'None known (airless volatile vacuum)',
  'volatile-cold-trap': 'Permanently Shadowed Cold Trap (PSR)',
  'N2-O2': 'N₂–O₂ atmosphere (~1013 hPa)',
  'CO2-thin': 'Thin CO₂ atmosphere (~6-10 hPa)',
  exosphere: 'Surface boundary exosphere (<10⁻¹¹ hPa)'
};

const GEO_SIM = symTable([
  ['sed-clay-sulfate', 'sed-sulfate-hematite', .78],
  ['sed-clay-sulfate', 'basalt-layered-sulfate', .60],
  ['sed-clay-sulfate', 'evaporite', .55],
  ['sed-clay-sulfate', 'basalt-altered', .40],
  ['sed-clay-sulfate', 'aeolian-sand', .40],
  ['sed-clay-sulfate', 'impact-breccia', .30],
  ['sed-clay-sulfate', 'dolerite-sandstone', .35],
  ['basalt-altered', 'basalt-volcanic', .80],
  ['basalt-altered', 'mare-basalt', .75],
  ['basalt-altered', 'impact-breccia', .65],
  ['basalt-altered', 'basalt-layered-sulfate', .65],
  ['sed-sulfate-hematite', 'evaporite', .65],
  ['sed-sulfate-hematite', 'sulfide-hydrothermal', .55],
  ['sed-sulfate-hematite', 'basalt-layered-sulfate', .70],
  ['basalt-volcanic', 'mare-basalt', .90],
  ['basalt-volcanic', 'basalt-layered-sulfate', .60],
  ['mare-basalt', 'anorthosite-highland', .35],
  ['basalt-volcanic', 'anorthosite-highland', .25],
  ['evaporite', 'aeolian-sand', .35],
  ['evaporite', 'sulfide-hydrothermal', .45],
  ['dolerite-sandstone', 'basalt-volcanic', .45],
  ['dolerite-sandstone', 'aeolian-sand', .40],
  ['impact-breccia', 'anorthosite-highland', .50],
  ['impact-breccia', 'mare-basalt', .60],
  ['mare-basalt', 'basalt-layered-sulfate', .50]
], .1);

const MORPH_SIM = symTable([
  ['crater', 'plain', .3], ['crater', 'canyon', .25], ['crater', 'volcanic', .45], ['crater', 'plateau', .35],
  ['plain', 'plateau', .65], ['plain', 'dunefield', .55], ['plain', 'canyon', .25],
  ['plateau', 'canyon', .45], ['volcanic', 'plateau', .40], ['volcanic', 'plain', .25],
  ['dunefield', 'plateau', .25], ['canyon', 'volcanic', .25]
], .1);

const HYDRO_SIM = symTable([
  ['paleo-lacustrine', 'paleo-fluvial-delta', .75], ['paleo-lacustrine', 'paleo-groundwater', .55],
  ['paleo-fluvial-delta', 'paleo-groundwater', .50], ['paleo-groundwater', 'hydrothermal-acidic', .45],
  ['hyperarid', 'none-known', .40], ['periglacial-ice', 'volatile-cold-trap', .55],
  ['hyperarid', 'periglacial-ice', .35], ['glacial-meltwater', 'periglacial-ice', .55],
  ['hydrothermal-acidic', 'glacial-meltwater', .25]
], .1);

const ATM_SIM = symTable([['N2-O2', 'CO2-thin', .25], ['CO2-thin', 'exosphere', .15]], 0);

const PARAMS = [
  { id: 'temp', name: 'Temperature', unit: '°C', type: 'num', scale: 'lin', w: 1.0,
    interp: { earth: 'Mean annual near-surface air temperature.', mars: 'Near-surface diurnal mean (~80 K diurnal range).', moon: 'Surface skin temperature (+120°C sunlit to -180°C shadowed).' } },
  { id: 'morph', name: 'Terrain morphology', unit: '', type: 'cat', w: 1.0, sim: MORPH_SIM,
    interp: { earth: 'Dominant landform class.', mars: 'Dominant landform class.', moon: 'Dominant landform class.' } },
  { id: 'geo', name: 'Geology & lithology', unit: '', type: 'cat', w: 1.5, sim: GEO_SIM,
    interp: { earth: 'Dominant lithology and mineral suite.', mars: 'Orbital and in-situ mineralogy.', moon: 'Highland anorthosite vs mare flood basalt.' } },
  { id: 'elev', name: 'Elevation', unit: 'm', type: 'num', scale: 'lin', w: 0.4,
    interp: { earth: 'Relative to sea level (WGS84).', mars: 'Relative to MOLA datum areoid.', moon: 'Relative to 1737.4 km reference sphere.' },
    caveat: 'Cross-body elevation is loosely comparable due to distinct planetary reference datums.' },
  { id: 'rad', name: 'Radiation dose', unit: 'µSv/day', type: 'num', scale: 'log', w: 1.0,
    interp: { earth: 'Background cosmic and terrestrial dose.', mars: 'Surface GCR and SEP dose equivalent (~600-700 µSv/day).', moon: 'Unshielded lunar surface dose (~1370 µSv/day).' } },
  { id: 'water', name: 'Water / ice indicator', unit: 'wt%', type: 'num', scale: 'log', off: 0.1, w: 1.2,
    interp: { earth: 'Soil / ground moisture and ice content.', mars: 'Water-equivalent hydrogen (WEH) from neutron spectrometers.', moon: 'Regolith hydroxyl and volatile indicators.' } },
  { id: 'pres', name: 'Atmospheric pressure', unit: 'hPa', type: 'num', scale: 'log', w: 0.8,
    interp: { earth: 'Near-surface air pressure (1000-500 hPa).', mars: 'Thin CO₂ surface pressure (6-10 hPa).', moon: 'Exosphere (~10⁻¹² hPa).' } },
  { id: 'atm', name: 'Atmospheric composition', unit: '', type: 'cat', w: 0.8, sim: ATM_SIM,
    interp: { earth: 'Nitrogen-Oxygen (78/21%).', mars: 'Carbon Dioxide dominated (95.3%).', moon: 'Airless vacuum with trace noble gases.' } },
  { id: 'ozone', name: 'Ozone column', unit: 'DU', type: 'num', scale: 'lin', w: 0.3,
    interp: { earth: 'Total atmospheric column ozone.', mars: 'Trace photochemical oxidant.', moon: 'Not applicable.' } },
  { id: 'precip', name: 'Precipitation', unit: 'mm/yr', type: 'num', scale: 'log', off: 1, w: 0.5,
    interp: { earth: 'Annual precipitation equivalent.', mars: 'Not applicable.', moon: 'Not applicable.' } },
  { id: 'slope', name: 'Slope / roughness', unit: '°', type: 'num', scale: 'lin', w: 0.8,
    interp: { earth: 'Mean baseline slope angle from DEM.', mars: 'MOLA/HRSC baseline slope.', moon: 'LOLA laser altimeter slope.' } },
  { id: 'dust', name: 'Dust / fines cover', unit: '%', type: 'num', scale: 'lin', w: 0.6,
    interp: { earth: 'Aerosol and fine particulate surface coverage.', mars: 'Fine iron-oxide dust coverage.', moon: 'Micron-scale abrasive lunar regolith cover.' } },
  { id: 'albedo', name: 'Albedo', unit: '', type: 'num', scale: 'lin', w: 0.5,
    interp: { earth: 'Broadband surface reflectance.', mars: 'Surface reflectance.', moon: 'Geometric albedo (0.07 maria, 0.18 highlands).' } },
  { id: 'hydro', name: 'Hydrological regime', unit: '', type: 'cat', w: 1.0, sim: HYDRO_SIM,
    interp: { earth: 'Present-day hydrological regime.', mars: 'Inferred ancient Noachian/Hesperian aqueous regime.', moon: 'Volatile cold-trap regime.' } },
  { id: 'solar', name: 'Solar irradiance', unit: 'W/m²', type: 'num', scale: 'lin', w: 0.6,
    interp: { earth: 'Daily mean surface incident solar flux.', mars: 'Surface attenuated solar flux.', moon: 'Unfiltered solar flux (shadowed at polar bottoms).' } }
];

if (typeof globalThis !== 'undefined') {
  globalThis.PARAMS = PARAMS;
  globalThis.CAT_LABEL = CAT_LABEL;
}

const PARAM = Object.fromEntries(PARAMS.map(p => [p.id, p]));
const ORDER = PARAMS.map(p => p.id);

/* ---------- Datasets Registry ---------- */
const DATASETS = [
  { id: 'd-mola', name: 'MGS MOLA Gridded Elevation Model', source: 'NASA PDS Geosciences Node', ident: 'MGS-M-MOLA-5-MEGDR-L3-V1.0', params: ['elev', 'slope'], units: 'm', res: '~463 m/px', time: '1997–2006', crs: 'IAU Mars 2000', body: 'mars', quality: 'Sub-metre vertical precision along nadir tracks.' },
  { id: 'd-crism', name: 'Mars Reconnaissance Orbiter CRISM Spectrometer', source: 'NASA PDS Geosciences Node', ident: 'MRO-M-CRISM-3-RDR-V1.0', params: ['geo'], units: 'spectral reflectance', res: '18 m/px', time: '2006–present', crs: 'IAU Mars 2000', body: 'mars', quality: 'Diagnostic spectral bands for phyllosilicates, carbonates, sulfates.' },
  { id: 'd-lola', name: 'LRO LOLA Lunar Laser Altimeter GDR', source: 'NASA PDS Geosciences Node', ident: 'LRO-L-LOLA-4-GDR-V1.0', params: ['elev', 'slope'], units: 'm', res: 'up to ~118 m/px', time: '2009–present', crs: 'IAU Moon 2015', body: 'moon', quality: 'Sub-metre precision on polar tracks; LOLA-derived illumination maps.' },
  { id: 'd-diviner', name: 'LRO Diviner Lunar Radiometer Experiment', source: 'NASA PDS Geosciences Node', ident: 'LRO-L-DLRE-4-RDR-V1.0', params: ['temp'], units: 'K', res: '250 m/px', time: '2009–present', crs: 'IAU Moon 2015', body: 'moon', quality: 'Surface bolometric temperature; reveals permanent cold traps below 40 K.' },
  { id: 'd-m3', name: 'Chandrayaan-1 Moon Mineralogy Mapper (M³)', source: 'ISRO ISSDC / NASA PDS', ident: 'CH1-M3-4-L2-REFLECTANCE-V1.0', params: ['water', 'geo'], units: 'reflectance (0.43-3.0 µm)', res: '140 m/px', time: '2008–2009', crs: 'IAU Moon 2000', body: 'moon', quality: 'Confirmed surface hydroxyl (OH/H₂O) absorption band at 2.8-3.0 µm.' },
  { id: 'd-ch3', name: 'Chandrayaan-3 Vikram/Pragyan In-Situ Payload Suite', source: 'ISRO Space Applications Centre', ident: 'CH3-LANDER-ROVER-2023', params: ['temp', 'rad', 'geo'], units: 'in-situ probes', res: 'point measurement (69.37° S)', time: 'Aug-Sep 2023', crs: 'IAU Moon 2015', body: 'moon', quality: 'ChaSTE direct subsurface thermophysical probe down to 10 cm, APXS/LIBS elemental.' },
  { id: 'd-lnd', name: 'Chang’e-4 Lunar Lander Neutron & Dosimetry (LND)', source: 'CNSA / Science Advances 2020', ident: 'DOI:10.1126/sciadv.aaz1334', params: ['rad'], units: 'µSv/day', res: 'point (Von Kármán)', time: '2019–present', crs: 'Point', body: 'moon', quality: 'First direct measurement of energetic particle dose on lunar surface.' },
  { id: 'd-rad', name: 'MSL Curiosity Radiation Assessment Detector (RAD)', source: 'NASA PDS Atmospheres Node', ident: 'MSL-RAD-RDR-V1.0', params: ['rad'], units: 'µSv/day', res: 'traverse point', time: '2012–present', crs: 'Point (Gale)', body: 'mars', quality: 'Continuous surface cosmic ray and solar particle dose rate monitoring.' },
  { id: 'd-rems', name: 'MSL Curiosity REMS Environmental Monitoring Station', source: 'NASA PDS Atmospheres Node', ident: 'MSL-M-REMS-4-EDR-V1.0', params: ['temp', 'pres'], units: '°C, hPa', res: 'hourly point', time: '2012–present', crs: 'Point (Gale)', body: 'mars', quality: 'Surface temperature, air pressure, relative humidity, UV flux.' },
  { id: 'd-dan', name: 'MSL Dynamic Albedo of Neutrons (DAN)', source: 'NASA PDS Geosciences Node', ident: 'MSL-M-DAN-4-RDR-V1.0', params: ['water'], units: 'wt% WEH', res: 'traverse track', time: '2012–present', crs: 'Point (Gale)', body: 'mars', quality: 'Active pulsed neutron sensing of subsurface water-equivalent hydrogen.' },
  { id: 'd-srtm', name: 'NASA SRTM v3 Global Digital Elevation Model', source: 'NASA LP DAAC / USGS', ident: 'SRTMGL1 v003', params: ['elev', 'slope'], units: 'm', res: '30 m', time: 'Feb 2000', crs: 'WGS84', body: 'earth', quality: 'Global coverage between 60°N and 56°S.' },
  { id: 'd-modis', name: 'MODIS Land Surface Temperature (MOD11A2)', source: 'NASA LP DAAC', ident: 'MOD11A2 v061', params: ['temp'], units: '°C', res: '1 km', time: '2000–present', crs: 'Sinusoidal', body: 'earth', quality: 'Day/night surface thermodynamic temperature composites.' },
  { id: 'd-imerg', name: 'GPM IMERG Multi-satellite Precipitation', source: 'NASA GES DISC', ident: 'GPM_3IMERGM', params: ['precip'], units: 'mm/yr', res: '0.1°', time: '2000–present', crs: 'WGS84', body: 'earth', quality: 'Calibrated precipitation estimates across global terrestrial biomes.' },
  { id: 'd-bhuvan', name: 'ISRO Bhuvan & Cartosat-1/2 High-Res DEM', source: 'ISRO National Remote Sensing Centre (NRSC)', ident: 'BHUVAN-CARTODEM-V3', params: ['elev', 'slope', 'geo'], units: 'm', res: '10-2.5 m', time: '2005–present', crs: 'WGS84 / UTM', body: 'earth', quality: 'Stereo-optical DEM over the Indian subcontinent with sub-decameter accuracy.' },
  { id: 'd-curated', name: 'NASA Planetary Analog Platform Curated Synthesis', source: 'NASA Space Apps / Inter-agency Literature', ident: 'PAI-CORPUS-' + BUILD_DATE, params: ['morph', 'geo', 'hydro', 'atm', 'dust', 'albedo', 'water', 'rad', 'pres', 'temp', 'solar', 'ozone', 'precip'], units: 'mixed', res: 'site scale', time: 'Curated 2026', crs: 'Various', body: 'all', quality: 'Peer-reviewed mission benchmarks and field site characterization.' }
];

const DS = Object.fromEntries(DATASETS.map(d => [d.id, d]));
const SRC_DEFAULT = {
  earth: { temp: 'd-modis', elev: 'd-srtm', slope: 'd-srtm', precip: 'd-imerg', solar: 'd-modis' },
  mars: { elev: 'd-mola', slope: 'd-mola', geo: 'd-crism', temp: 'd-rems', pres: 'd-rems', rad: 'd-rad', water: 'd-dan' },
  moon: { elev: 'd-lola', slope: 'd-lola', temp: 'd-diviner', rad: 'd-lnd', water: 'd-m3' }
};

function srcFor(pid, reg) {
  return (reg.src && reg.src[pid]) || (SRC_DEFAULT[reg.body] && SRC_DEFAULT[reg.body][pid]) || 'd-curated';
}

/* ---------- Regions Registry ---------- */
function R(id, name, body, lat, lon, vals, gd, gov, ex) {
  const v = {}, g = {};
  ORDER.forEach((k, i) => { v[k] = vals[i]; g[k] = (gov && gov[k]) || gd; });
  return Object.assign({ id, name, body, lat, lon, v, g }, ex);
}

const REGIONS = [
  // --- EARTH CANDIDATE ANALOG SITES (Including New Indian & Global Sites) ---
  R('lonar', 'Lonar Meteorite Crater (Maharashtra, India)', 'earth', 19.975, 76.513,
    [26, 'crater', 'basalt-altered', 563, 7.0, 7.5, 950, 'N2-O2', 265, 750, 19, 32, 0.16, 'paleo-lacustrine', 240],
    'A', { geo: 'A', morph: 'A', hydro: 'A' },
    { units: 5, feat: 'crater', desc: 'A pristine 1.8-km hyper-velocity impact crater carved directly into Deccan flood basalt. One of Earth’s rare basaltic impact structures, making it an irreplaceable analog for lunar mare craters and Martian impact structures in basalt.',
      img: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&w=600&q=80',
      refs: ['lonar_geol', 'lonar_mars'], isNew: true, country: 'India' }),

  R('ladakh', 'Ladakh Cold Desert & Tso Kar (India)', 'earth', 33.30, 78.30,
    [-2, 'plateau', 'evaporite', 4500, 18.5, 1.2, 580, 'N2-O2', 248, 75, 8.5, 52, 0.30, 'periglacial-ice', 325],
    'A', { rad: 'A', pres: 'A', temp: 'A', water: 'B', hydro: 'A' },
    { units: 6, feat: 'plain', desc: 'High-altitude cold desert (4,500 m) with severe hypobaric pressure, elevated cosmic radiation, permafrost polygons, and hypersaline borate/sulfate playas. Official ISRO analog mission site for lunar/Martian rover trials.',
      img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
      refs: ['ladakh_isro'], isNew: true, country: 'India' }),

  R('spiti', 'Spiti Valley Permafrost (Himachal, India)', 'earth', 32.24, 78.02,
    [-4, 'canyon', 'sed-clay-sulfate', 3800, 16.0, 2.0, 630, 'N2-O2', 252, 110, 14, 42, 0.23, 'periglacial-ice', 305],
    'B', { geo: 'B', slope: 'A' },
    { units: 4, feat: 'canyon', desc: 'Cold Himalayan high-altitude canyon with cryogenic weathering, active talus scree, fossiliferous Tethyan shales, and permafrost freeze-thaw cycles. Analog for Martian canyon wall traverses and periglacial regolith.',
      img: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80',
      refs: [], isNew: true, country: 'India' }),

  R('kutch', 'Rann of Kutch & Mata no Madh (Gujarat, India)', 'earth', 23.53, 69.00,
    [27, 'plain', 'sed-sulfate-hematite', 18, 6.8, 0.8, 1010, 'N2-O2', 260, 290, 1.5, 68, 0.42, 'paleo-groundwater', 275],
    'A', { geo: 'A', hydro: 'A' },
    { units: 4, feat: 'plain', desc: 'Vast hypersaline evaporite salt flats and jarosite/alunite/hematite iron-sulfate deposits at Mata no Madh. The mineral suite matches Martian sedimentary outcrops observed at Meridiani Planum and Mawrth Vallis.',
      img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      refs: ['kutch_jarosite'], isNew: true, country: 'India' }),

  R('deccan', 'Deccan Traps Basalt Plateau (India)', 'earth', 18.52, 73.85,
    [24, 'plateau', 'basalt-volcanic', 620, 7.1, 4.5, 945, 'N2-O2', 268, 720, 6.5, 24, 0.15, 'none-known', 235],
    'B', { geo: 'A' },
    { units: 3, feat: 'plateau', desc: 'Continental flood basalt province comprising thick horizontal tholeiitic lava flows, columnar cooling joints, and subterranean lava tubes. Direct lithological analog for lunar maria and Martian volcanic plains.',
      img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
      refs: [], isNew: true, country: 'India' }),

  R('thar', 'Thar Desert (Sam Dunes, Rajasthan, India)', 'earth', 26.82, 70.51,
    [28, 'dunefield', 'aeolian-sand', 220, 7.2, 0.4, 985, 'N2-O2', 265, 160, 16, 75, 0.36, 'hyperarid', 315],
    'A', { dust: 'A', slope: 'A' },
    { units: 3, feat: 'none', desc: 'Vast active barchan and transverse sand sea (erg) in western Rajasthan. Key proving ground for studying Martian sand ripples, dust devil electrostatic levitation, and rover wheel slip mechanics.',
      img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
      refs: [], isNew: true, country: 'India' }),

  R('barren', 'Barren Island Volcano (Andaman Sea, India)', 'earth', 12.29, 93.86,
    [29, 'volcanic', 'basalt-volcanic', 354, 6.9, 4.0, 975, 'N2-O2', 260, 2800, 22, 20, 0.11, 'none-known', 245],
    'B', { geo: 'A', morph: 'A' },
    { units: 3, feat: 'cone', desc: 'South Asia’s only confirmed active volcano. Pristine, unweathered olivine-rich basaltic lava flows and hydrothermal fumaroles. Superb analog for fresh lunar mare rilles and Martian shield volcanic flows.',
      img: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
      refs: [], isNew: true, country: 'India' }),

  R('gangotri', 'Gangotri Glacial Moraine (Uttarakhand, India)', 'earth', 30.93, 79.08,
    [-6, 'canyon', 'impact-breccia', 4100, 17.5, 18.0, 610, 'N2-O2', 250, 180, 21, 38, 0.28, 'periglacial-ice', 290],
    'B', { water: 'B', hydro: 'A' },
    { units: 4, feat: 'canyon', desc: 'High-Himalayan debris-covered glacier and chaotic boulder moraines. Key terrestrial analog for Martian lobate debris aprons (LDA) and glacial water ice preserved beneath protective regolith mantles.',
      img: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=600&q=80',
      refs: [], isNew: true, country: 'India' }),

  R('atacama', 'Atacama Desert (Yungay, Chile)', 'earth', -24.1, -70.0,
    [17, 'plain', 'evaporite', 1000, 9, 0.5, 900, 'N2-O2', 262, 2, 4, 65, 0.28, 'hyperarid', 310],
    'B', { dust: 'C', water: 'C', hydro: 'A', geo: 'B' },
    { units: 4, feat: 'none', desc: 'Hyperarid core of the Atacama Desert. Renowned terrestrial analog for Martian hyperaridity, soil perchlorates, and the dry limit of biological life.',
      img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
      refs: ['navarro2003', 'mckay2003'], country: 'Chile' }),

  R('dryvalleys', 'McMurdo Dry Valleys (Antarctica)', 'earth', -77.5, 162.5,
    [-20, 'canyon', 'dolerite-sandstone', 800, 11, 20, 910, 'N2-O2', 290, 50, 14, 35, 0.30, 'periglacial-ice', 130],
    'B', { water: 'C', precip: 'C', dust: 'C', hydro: 'A' },
    { units: 4, feat: 'none', desc: 'Largest ice-free sector of Antarctica. Cold polar desert with subsurface permafrost, hypolithic cyanobacteria, and ventifact-strewn terrain.',
      img: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=600&q=80',
      refs: ['marchant2007'], country: 'Antarctica' }),

  R('sahara', 'Sahara (Murzuq Sand Sea, Libya)', 'earth', 25.5, 13.0,
    [25, 'dunefield', 'aeolian-sand', 450, 6.5, N, 955, 'N2-O2', 270, 5, 2, 60, 0.35, 'hyperarid', 290],
    'B', { dust: 'C' },
    { units: 3, feat: 'none', desc: 'Massive active aeolian dune field and gravel regolith serir. Ideal for studying sand saltation, dune migration, and rover sinkage.',
      img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
      refs: [], country: 'Libya' }),

  R('maunakea', 'Mauna Kea (Hawai‘i, USA)', 'earth', 19.82, -155.47,
    [2, 'volcanic', 'basalt-volcanic', 4000, 17, 3, 620, 'N2-O2', 255, 400, 12, N, 0.12, 'periglacial-ice', 270],
    'B', { water: 'C', precip: 'C', hydro: 'C' },
    { units: 3, feat: 'cone', desc: 'High-altitude oceanic shield volcano with weathered basalt tephra and cinder cones. Extensively used by NASA for Apollo and rover mobility tests.',
      img: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
      refs: [], country: 'USA' }),

  R('askja', 'Askja Caldera (Iceland)', 'earth', 65.03, -16.75,
    [0, 'volcanic', 'basalt-volcanic', 1050, 7, 8, 890, 'N2-O2', 340, 400, 8, 45, 0.12, 'glacial-meltwater', 105],
    'B', { water: 'C', precip: 'C', hydro: 'C' },
    { units: 3, feat: 'caldera', desc: 'Barren volcanic highlands caldera with basalt tephra fields. Apollo astronauts Neil Armstrong and Buzz Aldrin trained here in geology.',
      img: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80',
      refs: [], country: 'Iceland' }),

  R('devon', 'Haughton Crater (Devon Island, Canada)', 'earth', 75.4, -89.7,
    [-16, 'crater', 'impact-breccia', 100, 6, 10, 1005, 'N2-O2', 360, 150, 5, 30, 0.22, 'periglacial-ice', 85],
    'B', { water: 'C', precip: 'C', dust: 'C', hydro: 'B' },
    { units: 3, feat: 'peak', desc: '23-km meteorite impact crater in the High Arctic polar desert. Hosts NASA and Haughton-Mars Project field simulations.',
      img: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=600&q=80',
      refs: [], country: 'Canada' }),

  R('riotinto', 'Rio Tinto (Spain)', 'earth', 37.7, -6.55,
    [17, 'plateau', 'sulfide-hydrothermal', 300, 6.5, 5, 975, 'N2-O2', 325, 700, 7, 20, N, 'hydrothermal-acidic', 195],
    'B', { water: 'C', dust: 'C', geo: 'A', hydro: 'A' },
    { units: 3, feat: 'none', desc: 'Acidic, ferric iron-rich river flowing through massive sulfide deposits. Renowned geochemical analog for acidic sulfate weathering on Mars.',
      img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      refs: ['amils2007'], country: 'Spain' }),

  R('danakil', 'Danakil Depression (Dallol, Ethiopia)', 'earth', 14.24, 40.30,
    [34, 'plain', 'evaporite', -125, N, 2, 1028, 'N2-O2', 256, 100, 2, 15, 0.25, 'hydrothermal-acidic', 250],
    'B', { water: 'C', precip: 'C', dust: 'C', hydro: 'B' },
    { units: 3, feat: 'none', desc: 'Below-sea-level hyperacidic hypersaline geothermal basin. Investigated as an analog for early Mars hydrothermal environments.',
      img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
      refs: [], country: 'Ethiopia' }),

  R('mdrs', 'Mars Desert Research Station (Utah, USA)', 'earth', 38.41, -110.79,
    [11, 'plateau', 'sed-clay-sulfate', 1370, 8, 3, 860, 'N2-O2', 320, 150, 6, 40, 0.25, 'paleo-fluvial-delta', 215],
    'B', { water: 'C', precip: 'C', dust: 'C', hydro: 'C' },
    { units: 4, feat: 'none', desc: 'Mars Society field habitat situated in the jurassic Morrison Formation badlands with inverted river channels and clay/sulfate beds.',
      img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
      refs: [], country: 'USA' }),

  // --- MARS TARGET SITES ---
  R('gale', 'Gale Crater (Mount Sharp)', 'mars', -5.4, 137.8,
    [-50, 'crater', 'sed-clay-sulfate', -4400, 640, 2.1, 8.0, 'CO2-thin', N, X, 6, 55, 0.22, 'paleo-lacustrine', 110],
    'B', { temp: 'A', rad: 'A', pres: 'A', atm: 'A', geo: 'A', hydro: 'A', elev: 'A', water: 'B', dust: 'C', solar: 'C', slope: 'B' },
    { src: { temp: 'd-rems', pres: 'd-rems', rad: 'd-rad', atm: 'd-sam', water: 'd-dan' }, units: 6, feat: 'mound',
      desc: '154-km impact crater hosting Mount Sharp (Aeolis Mons), a 5.5-km high central mound of layered clay, sulfate, and mudstone. Exploration site of NASA’s Curiosity rover.',
      img: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=600&q=80',
      refs: ['grotzinger2012', 'grotzinger2014', 'hassler2014'] }),

  R('jezero', 'Jezero Crater Delta', 'mars', 18.4, 77.6,
    [-58, 'crater', 'basalt-altered', -2600, 660, 3.0, 7.4, 'CO2-thin', N, X, 4, N, 0.20, 'paleo-fluvial-delta', 105],
    'B', { geo: 'A', hydro: 'A', elev: 'A', rad: 'C', water: 'C', pres: 'B', solar: 'C', temp: 'B' },
    { units: 5, feat: 'delta',
      desc: '45-km impact crater featuring a fossilized river delta, mudstones, and carbonate/olivine igneous floor rocks. Landing and sample-caching site of NASA’s Perseverance rover.',
      img: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=600&q=80',
      refs: ['mangold2021', 'squyres2004'] }),

  R('meridiani', 'Meridiani Planum', 'mars', -1.9, -5.5,
    [-53, 'plain', 'sed-sulfate-hematite', -1400, 680, 4.5, 6.8, 'CO2-thin', N, X, 1, 75, 0.12, 'paleo-groundwater', 115],
    'B', { geo: 'A', hydro: 'A', elev: 'A', rad: 'C', water: 'C', pres: 'C', slope: 'A', solar: 'C' },
    { units: 3, feat: 'none',
      desc: 'Extensive equatorial plain marked by gray hematite concretions ("blueberries") and sulfate-rich sedimentary rocks. Explored by NASA Opportunity rover for over 14 years.',
      img: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=600&q=80',
      refs: ['squyres2004'] }),

  R('valles', 'Valles Marineris (Melas Chasma)', 'mars', -10.0, -70.0,
    [-56, 'canyon', 'basalt-layered-sulfate', -3500, 620, 6.0, 8.8, 'CO2-thin', N, X, 18, N, 0.22, 'paleo-groundwater', 110],
    'C', { elev: 'A', geo: 'B' },
    { units: 6, feat: 'none',
      desc: 'Solar System’s grandest canyon system (>4,000 km long, up to 7 km deep). Layered sulfate and iron oxide walls exposed by ancient tectonic rifting and groundwater outflow.',
      img: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=600&q=80',
      refs: [] }),

  // --- MOON TARGET SITES ---
  R('shackleton', 'Shackleton Crater (Lunar South Pole)', 'moon', -89.9, 0.0,
    [-150, 'crater', 'anorthosite-highland', -1500, 1370, 1.5, 3e-12, 'exosphere', X, X, 14, 90, 0.12, 'volatile-cold-trap', 30],
    'B', { rad: 'C', pres: 'C', water: 'B', temp: 'C', solar: 'C', elev: 'A', hydro: 'C' },
    { units: 4, feat: 'crater',
      desc: '21-km wide impact crater perched on the lunar south pole. Interior floor is in permanent shadow (~40 K) harboring water ice deposits; the rim receives near-continuous sunlight.',
      img: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?auto=format&fit=crop&w=600&q=80',
      refs: ['colaprete2010'] }),

  R('malapert', 'Malapert Mountain (Artemis Base Hub)', 'moon', -86.0, 0.0,
    [-110, 'plateau', 'anorthosite-highland', 5000, 1370, 0.2, 3e-12, 'exosphere', X, X, 11, 90, 0.15, 'volatile-cold-trap', 95],
    'B', { rad: 'C', pres: 'C', elev: 'A' },
    { units: 3, feat: 'plateau',
      desc: 'Prominent 5-km high massif near the south pole designated as a primary candidate for the Artemis Base Camp due to ~85%+ continuous solar illumination and direct Earth radio visibility.',
      img: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?auto=format&fit=crop&w=600&q=80',
      refs: [], isNew: true }),

  R('tranq', 'Mare Tranquillitatis', 'moon', 8.5, 31.4,
    [-55, 'plain', 'mare-basalt', -1900, 1370, 0.02, 3e-12, 'exosphere', X, X, 2, 95, 0.07, 'none-known', 425],
    'B', { rad: 'C', pres: 'C', geo: 'A', elev: 'A', water: 'C' },
    { units: 2, feat: 'none',
      desc: 'Titanium-rich flood basalt mare plain. Historic landing site of Apollo 11 (Statio Tranquillitatis) in July 1969.',
      img: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?auto=format&fit=crop&w=600&q=80',
      refs: [] }),

  R('taurus', 'Taurus–Littrow Valley', 'moon', 20.2, 30.8,
    [-58, 'canyon', 'mare-basalt', -2700, 1370, 0.02, 3e-12, 'exosphere', X, X, 9, 90, 0.10, 'none-known', 405],
    'B', { rad: 'C', pres: 'C', geo: 'A', elev: 'A', water: 'C' },
    { units: 4, feat: 'none',
      desc: 'Deep geological graben valley bordered by sculpted highland massifs. Landing site of Apollo 17; yielded pyroclastic orange glass beads.',
      img: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?auto=format&fit=crop&w=600&q=80',
      refs: [] }),

  R('vonkarman', 'Von Kármán Crater (Chang’e-4)', 'moon', -44.4, 176.2,
    [-75, 'crater', 'mare-basalt', -5900, 1370, 0.01, 3e-12, 'exosphere', X, X, 3, 92, 0.13, 'none-known', 305],
    'B', { rad: 'A', pres: 'C', water: 'C', elev: 'A' },
    { units: 3, feat: 'none',
      desc: '180-km impact crater nestled inside the colossal South Pole–Aitken basin on the lunar far side. Landing site of Chang’e-4 and Yutu-2.',
      img: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?auto=format&fit=crop&w=600&q=80',
      refs: ['zhang2020'] })
];

REGIONS.forEach(r => { if (r.feat === undefined) r.feat = 'none'; });
const REG = Object.fromEntries(REGIONS.map(r => [r.id, r]));
const BODIES = {
  earth: { name: 'Earth', radiusKm: 6371.0, color: '#4aa3ff' },
  mars: { name: 'Mars', radiusKm: 3389.5, color: '#ff8a50' },
  moon: { name: 'Moon', radiusKm: 1737.4, color: '#c9c3e6' }
};

/* ---------- Missions Registry ---------- */
const MISSIONS = [
  { id: 'ch3', name: 'Chandrayaan-3', agency: 'ISRO', body: 'moon', region: 'shackleton', type: 'Polar Lander & Rover', start: '2023-07-14', end: '2023-09-04', status: 'Completed (Historic South Pole Landing)', instruments: ['ChaSTE', 'ILSA', 'APXS', 'LIBS', 'RAMBHA'], note: 'Historic first soft landing in the lunar south polar region (69.37° S). ChaSTE probe recorded extreme surface thermal gradient (60°C surface down to -10°C at 8cm depth).' },
  { id: 'ch1', name: 'Chandrayaan-1', agency: 'ISRO / NASA', body: 'moon', region: null, type: 'Lunar Orbiter', start: '2008-10-22', end: '2009-08-29', status: 'Completed', instruments: ['M3', 'Mini-SAR', 'TMC', 'HySI'], note: 'ISRO orbiter carrying NASA’s Moon Mineralogy Mapper (M³), which conclusively proved the existence of hydroxyl and water molecules on the lunar surface.' },
  { id: 'ch2', name: 'Chandrayaan-2', agency: 'ISRO', body: 'moon', region: null, type: 'High-Res Orbiter', start: '2019-07-22', end: null, status: 'Active (Orbiter Operational)', instruments: ['OHRC', 'CLASS', 'IIRS', 'DFSAR'], note: 'Carries highest-resolution lunar optical camera (OHRC at 25 cm/px) and dual-frequency synthetic aperture radar mapping subsurface polar water ice.' },
  { id: 'perseverance', name: 'Perseverance (Mars 2020)', agency: 'NASA / JPL', body: 'mars', region: 'jezero', type: 'Rover & Helicopter', start: '2020-07-30', end: null, status: 'Active (Operating in Jezero Crater)', instruments: ['MEDA', 'PIXL', 'SHERLOC', 'Mastcam-Z', 'MOXIE', 'RIMFAX'], note: 'Currently exploring Jezero delta, searching for ancient biosignatures, producing oxygen with MOXIE, and sealing rock core samples for future return.' },
  { id: 'curiosity', name: 'Curiosity (MSL)', agency: 'NASA / JPL', body: 'mars', region: 'gale', type: 'Rover', start: '2011-11-26', end: null, status: 'Active (Climbing Mount Sharp)', instruments: ['RAD', 'SAM', 'DAN', 'REMS', 'ChemCam', 'MAHLI'], note: 'Landed in Gale crater August 2012. Discovered ancient habitable freshwater lake in Yellowknife Bay and confirmed methane pulses and organic molecules.' },
  { id: 'mom', name: 'Mangalyaan (Mars Orbiter Mission)', agency: 'ISRO', body: 'mars', region: null, type: 'Orbiter', start: '2013-11-05', end: '2022-10-02', status: 'Completed (8 Years Mission)', instruments: ['MCC', 'TIS', 'MSM', 'MENCA'], note: 'India’s first interplanetary mission; made ISRO the fourth agency to reach Mars, operating for nearly 8 years in Mars orbit.' },
  { id: 'artemis2', name: 'Artemis II', agency: 'NASA / CSA', body: 'moon', region: null, type: 'Crewed Lunar Flyby', start: '2025-09-01', end: null, status: 'Pre-flight Training', instruments: ['Orion Life Support', 'Radiation dosimeters'], note: 'First crewed mission beyond low-Earth orbit since Apollo 17 (1972). Four astronauts will test Orion systems during a lunar free-return trajectory.' },
  { id: 'apollo11', name: 'Apollo 11', agency: 'NASA', body: 'moon', region: 'tranq', type: 'Crewed landing', start: '1969-07-16', end: '1969-07-24', status: 'Completed', instruments: ['EASEP', 'SWC'], note: 'First human lunar landing at Mare Tranquillitatis. Returned 21.6 kg of lunar mare basalt and breccia.' },
  { id: 'apollo17', name: 'Apollo 17', agency: 'NASA', body: 'moon', region: 'taurus', type: 'Crewed landing', start: '1972-12-07', end: '1972-12-19', status: 'Completed', instruments: ['ALSEP', 'Lunar Roving Vehicle'], note: 'Final Apollo landing. Geologist-astronaut Harrison Schmitt discovered orange volcanic glass beads in Taurus–Littrow valley.' },
  { id: 'change4', name: 'Chang’e-4', agency: 'CNSA', body: 'moon', region: 'vonkarman', type: 'Far-Side Lander & Rover', start: '2018-12-07', end: null, status: 'Active on Far Side', instruments: ['LND', 'VNIS', 'LPR'], note: 'Pioneering first soft landing on the lunar far side. Direct surface radiation dosimeter (LND) recorded 1370 µSv/day equivalent dose.' }
];

const UPCOMING = [
  { id: 'artemis3', name: 'Artemis III Crewed South Pole Landing', body: 'moon', status: 'Planned (2026/2027)', when: 'Late 2026', note: 'Historic mission landing the first woman and next man at the lunar south pole candidate zones (Shackleton / Malapert).' },
  { id: 'artemis4', name: 'Artemis IV & Lunar Gateway Hub', body: 'moon', status: 'Planned', when: '2028', note: 'First mission to assemble the Lunar Gateway orbital station with I-Hab and conduct sustained south pole surface excursions.' },
  { id: 'msr', name: 'Mars Sample Return (MSR)', body: 'mars', status: 'In Architecture Review', when: 'Target 2030+', note: 'Multi-agency mission to retrieve and launch the sample tubes cached by Perseverance in Jezero Crater back to Earth.' },
  { id: 'rosalind', name: 'Rosalind Franklin Rover (ExoMars)', body: 'mars', status: 'Planned', when: '2028', note: 'ESA/NASA rover equipped with a 2-metre drill to sample pristine sub-surface organic material shielded from surface radiation.' }
];

/* ---------- Scientific Literature & Papers ---------- */
const PAPERS = [
  { id: 'lonar_geol', au: 'Fredriksson, K., Dube, A., Milton, D. J., et al.', yr: 1973, title: 'Lonar Lake, India: An Impact Crater in Basalt', venue: 'Science 180 (4088)', doi: '10.1126/science.180.4088.862' },
  { id: 'lonar_mars', au: 'Hagerty, J. J., & Newsom, H. E.', yr: 2003, title: 'Hydrothermal alteration at the Lonar Lake impact structure: Implications for impact cratering on Mars', venue: 'Meteoritics & Planetary Science 38', doi: '10.1111/j.1945-5100.2003.tb00028.x' },
  { id: 'ladakh_isro', au: 'Pandey, A., et al.', yr: 2022, title: 'High-Altitude Cold Desert of Ladakh as an Earth Analog for Lunar and Martian Environments', venue: 'Current Science 123 (4)', doi: null },
  { id: 'kutch_jarosite', au: 'Bhattacharya, S., et al.', yr: 2016, title: 'Jarosite from the Mata No Madh, Kachchh, India: A Terrestrial Analog for Martian Sulfates', venue: 'Journal of Geophysical Research: Planets 121', doi: '10.1002/2015JE004958' },
  { id: 'colaprete2010', au: 'Colaprete, A., et al.', yr: 2010, title: 'Detection of Water in the LCROSS Ejecta Plume from Cabeus Crater', venue: 'Science 330 (6003)', doi: '10.1126/science.1186986' },
  { id: 'grotzinger2014', au: 'Grotzinger, J. P., et al.', yr: 2014, title: 'A Habitable Fluvio-Lacustrine Environment at Yellowknife Bay, Gale Crater, Mars', venue: 'Science 343 (6169)', doi: '10.1126/science.1242777' },
  { id: 'hassler2014', au: 'Hassler, D. M., et al.', yr: 2014, title: 'Mars’ Surface Radiation Environment Measured with the Mars Science Laboratory’s Curiosity Rover', venue: 'Science 343 (6169)', doi: '10.1126/science.1244797' },
  { id: 'navarro2003', au: 'Navarro-González, R., et al.', yr: 2003, title: 'Mars-Like Soils in the Atacama Desert, Chile, and the Dry Limit of Microbial Life', venue: 'Science 302 (5647)', doi: '10.1126/science.1089143' },
  { id: 'zhang2020', au: 'Zhang, S., et al.', yr: 2020, title: 'First Measurements of the Radiation Dose on the Lunar Surface', venue: 'Science Advances 6 (39)', doi: '10.1126/sciadv.aaz1334' },
  { id: 'mangold2021', au: 'Mangold, N., et al.', yr: 2021, title: 'Perseverance Rover Reveals an Ancient Delta-Lake System and Flood Deposits at Jezero Crater, Mars', venue: 'Science 374 (6568)', doi: '10.1126/science.abl4051' },
  { id: 'squyres2004', au: 'Squyres, S. W., et al.', yr: 2004, title: 'In Situ Evidence for an Ancient Aqueous Environment at Meridiani Planum, Mars', venue: 'Science 306 (5702)', doi: '10.1126/science.1104559' },
  { id: 'marchant2007', au: 'Marchant, D. R. & Head, J. W.', yr: 2007, title: 'Antarctic Dry Valleys: Microclimate Zonation and Implications for Mars', venue: 'Icarus 192', doi: '10.1016/j.icarus.2007.06.018' },
  { id: 'amils2007', au: 'Amils, R., et al.', yr: 2007, title: 'Extreme Environments as Mars Terrestrial Analogs: The Rio Tinto Case', venue: 'Planetary and Space Science 55', doi: null }
];

const PAPER = Object.fromEntries(PAPERS.map(p => [p.id, p]));
function paperLink(p) { return p.doi ? 'https://doi.org/' + p.doi : 'https://scholar.google.com/scholar?q=' + encodeURIComponent(p.title); }

/* ---------- Knowledge Graph Core Records ---------- */
const INSTRUMENTS = [
  ['RAD', 'RAD (Radiation Assessment Detector)'],
  ['SAM', 'SAM (Sample Analysis at Mars)'],
  ['DAN', 'DAN (Dynamic Albedo of Neutrons)'],
  ['REMS', 'REMS (Environmental Monitoring Station)'],
  ['MEDA', 'MEDA (Mars Environmental Dynamics Analyzer)'],
  ['PIXL', 'PIXL (Planetary Instrument for X-ray Lithochemistry)'],
  ['ChaSTE', 'ChaSTE (Chandra’s Surface Thermophysical Experiment)'],
  ['M3', 'M³ (Moon Mineralogy Mapper)'],
  ['LOLA', 'LOLA (Lunar Orbiter Laser Altimeter)'],
  ['MOLA', 'MOLA (Mars Orbiter Laser Altimeter)'],
  ['LND', 'LND (Lunar Lander Neutron & Dosimetry)'],
  ['Diviner', 'Diviner (Lunar Radiometer)']
];

const OBSERVATIONS = [
  ['lonar-breccia', 'Lonar impact shock metamorphic basalt & maskelynite'],
  ['ladakh-permafrost', 'Ladakh high-altitude patterned ground & hypobaric UV flux'],
  ['kutch-jarosite', 'Kutch Mata-no-Madh jarosite and iron-sulfate precipitates'],
  ['yk', 'Yellowknife Bay: neutral pH fluvio-lacustrine habitable lake'],
  ['rad-gale', 'Surface GCR radiation dose measured in Gale (~0.64 mSv/day)'],
  ['ch3-temp', 'Lunar south pole steep 60°C to -10°C thermal gradient (ChaSTE)'],
  ['m3-water', 'Direct confirmation of 2.8-3.0 µm OH/H₂O absorption on Moon (M³)'],
  ['delta', 'Jezero delta-lake system and boulder flood deposits'],
  ['sulfate', 'Meridiani Planum hematite blueberries and sulfate outcrops'],
  ['lunar-dose', 'Chang’e-4 lunar far-side radiation dose (1.37 mSv/day)']
];

const FORMATIONS = [
  ['lonar-rim', 'Lonar crater raised basaltic rim & ejecta blanket'],
  ['tsokar-basin', 'Tso Kar hypersaline endorheic lake basin'],
  ['mt-sharp', 'Mount Sharp sedimentary strata (Aeolis Mons)'],
  ['jezero-delta', 'Jezero crater western fan delta'],
  ['shackleton-psr', 'Shackleton permanent shadow cold trap'],
  ['burns', 'Burns Formation sulfate strata (Meridiani)']
];

const E = (a, b, type, expl, ref, status) => ({ a, b, type, expl, ref: ref || null, status: status || 'curated' });

const CURATED_EDGES = [
  // Indian analogs
  E('r:lonar', 'r:gale', 'proposed analog', 'Meteorite impact crater in continental flood basalt provides a structural and impact-metamorphic analog for Martian and lunar basaltic craters.', 'lonar_geol', 'hypothesis'),
  E('r:lonar', 'r:jezero', 'proposed analog', 'Both feature crater-hosted lacustrine basins in basaltic lithology with post-impact aqueous alteration.', 'lonar_mars', 'hypothesis'),
  E('r:ladakh', 'r:shackleton', 'proposed analog', 'High UV, extreme sub-zero cold, hypobaric thin atmosphere, and rocky regolith used for lunar rover mobility testing by ISRO.', 'ladakh_isro', 'hypothesis'),
  E('r:kutch', 'r:meridiani', 'proposed analog', 'Mata no Madh jarosite-bearing clays and sulfate evaporites share diagnostic spectral and geochemical signatures with Opportunity’s Burns formation.', 'kutch_jarosite', 'hypothesis'),
  E('r:deccan', 'r:tranq', 'proposed analog', 'Extensive tholeiitic flood basalts and lava tube networks mimic lunar mare basalt plains.', 'deccan_volc', 'hypothesis'),
  E('r:thar', 'r:meridiani', 'proposed analog', 'Transverse and barchan dunes replicate Martian aeolian bedforms and saltation physics observed at Meridiani Planum.', null, 'hypothesis'),
  E('r:barren', 'r:tranq', 'proposed analog', 'Active volcanic island with basaltic scoria, cinder cone eruptive vents, and pyroclastic flows analogous to lunar sinuous rilles.', null, 'hypothesis'),
  E('r:gangotri', 'r:jezero', 'proposed analog', 'Supraglacial debris-covered ice apron and moraine deposition match Martian lobate debris aprons and periglacial landforms.', null, 'hypothesis'),

  // Missions & sites
  E('r:shackleton', 'm:ch3', 'explored by', 'Chandrayaan-3 achieved history’s first soft landing in the lunar south polar region near Shackleton.', 'ch3_temp'),
  E('m:ch3', 'i:ChaSTE', 'carries', 'ChaSTE thermophysical probe recorded unprecedented south pole soil thermal profiles.'),
  E('m:ch1', 'i:M3', 'carries', 'Carried NASA’s M³ spectrometer which discovered water molecules across the lunar surface.'),
  E('i:M3', 'o:m3-water', 'produced', 'Confirmed widespread OH/H₂O hydration features.'),
  E('r:gale', 'm:curiosity', 'explored by', 'Curiosity has traversed Gale crater since August 2012.', 'grotzinger2012'),
  E('r:jezero', 'm:perseverance', 'explored by', 'Perseverance landed in Jezero on 18 February 2021.', 'farley2020'),
  E('r:meridiani', 'm:opportunity', 'explored by', 'Opportunity explored Meridiani Planum from 2004 to 2019.', 'squyres2004'),
  E('r:vonkarman', 'm:change4', 'explored by', 'Chang’e-4 made the first far-side landing in January 2019.', 'zhang2020'),
  E('m:curiosity', 'i:RAD', 'carries', 'Radiation Assessment Detector measures surface dose rates.'),
  E('m:curiosity', 'i:SAM', 'carries', 'Sample Analysis at Mars wet-chemistry and gas chromatograph.'),
  E('i:RAD', 'o:rad-gale', 'produced', 'Measured Gale surface cosmic ray flux at ~0.64 mSv/day.')
];

const DS_COVER = {
  'd-mola': ['gale', 'jezero', 'meridiani', 'valles'],
  'd-crism': ['gale', 'jezero', 'meridiani', 'valles'],
  'd-lola': ['shackleton', 'malapert', 'tranq', 'taurus', 'vonkarman'],
  'd-diviner': ['shackleton', 'malapert', 'tranq', 'taurus', 'vonkarman'],
  'd-m3': ['shackleton', 'malapert', 'tranq', 'taurus', 'vonkarman'],
  'd-srtm': ['lonar', 'ladakh', 'spiti', 'kutch', 'deccan', 'atacama', 'sahara', 'maunakea', 'riotinto', 'danakil', 'mdrs', 'thar', 'barren', 'gangotri'],
  'd-modis': ['lonar', 'ladakh', 'spiti', 'kutch', 'deccan', 'atacama', 'sahara', 'dryvalleys', 'maunakea', 'askja', 'devon', 'riotinto', 'danakil', 'mdrs', 'thar', 'barren', 'gangotri'],
  'd-bhuvan': ['lonar', 'ladakh', 'spiti', 'kutch', 'deccan', 'thar', 'barren', 'gangotri'],
  'd-imerg': ['lonar', 'ladakh', 'spiti', 'kutch', 'deccan', 'atacama', 'sahara', 'maunakea', 'riotinto', 'danakil', 'mdrs', 'thar', 'barren', 'gangotri']
};

const DS_PRODUCER = {
  'd-mola': 'MOLA', 'd-lola': 'LOLA', 'd-diviner': 'Diviner', 'd-m3': 'M3', 'd-rad': 'RAD', 'd-rems': 'REMS', 'd-dan': 'DAN', 'd-lnd': 'LND'
};

/* ---------- RAG Knowledge Corpus ---------- */
const CORPUS = [
  { id: 'c_lonar', doc: 'lonar_geol', kind: 'established', text: 'Lonar Crater in Maharashtra, India, is one of Earth’s premier planetary analog sites because it is an impact crater excavated directly into continental flood basalt (Deccan Traps). The shock pressures generated maskelynite, shatter cones, and impact melt rocks identical to those returned from Apollo lunar mare missions and photographed in Martian basalt craters.' },
  { id: 'c_ladakh', doc: 'ladakh_isro', kind: 'established', text: 'The high-altitude cold desert of Ladakh (3,500–5,500 m) is a leading analog for Moon base and Mars operations. Its thin atmosphere delivers high solar UV irradiance and hypobaric pressure (~580 hPa). The Tso Kar basin exhibits permafrost patterned ground and borate-sulfate evaporites, serving as a proving ground for ISRO rover mobility and cold-hardy drill mechanisms.' },
  { id: 'c_kutch', doc: 'kutch_jarosite', kind: 'established', text: 'The Mata no Madh formation in the Kutch basin, Gujarat, contains abundant jarosite, gypsum, and alunite within an iron-rich sedimentary matrix. This geochemical assemblage is considered a terrestrial twin for the acidic sulfate-rich sedimentary rocks analyzed by the Opportunity rover at Meridiani Planum and the Mawrth Vallis phyllosilicates.' },
  { id: 'c_ch3', doc: 'ch3_temp', kind: 'established', text: 'Chandrayaan-3’s Vikram lander and ChaSTE instrument measured the first in-situ temperature profile of the lunar south polar topsoil. While the sunlit surface hovered around 50–60°C, just 8 cm below the surface the temperature plunged to -10°C, demonstrating the extraordinary thermal insulating capability of lunar regolith.' },
  { id: 'c_m3', doc: 'm3_water', kind: 'established', text: 'The Moon Mineralogy Mapper (M³) on Chandrayaan-1 mapped absorption bands near 2.8 to 3.0 µm, proving the presence of hydroxyl (OH) and water (H₂O) bound to lunar regolith grains, most intensely concentrated toward higher polar latitudes.' },
  { id: 'c_atacama', doc: 'navarro2003', kind: 'established', text: 'Soils from the hyperarid Yungay core of the Atacama Desert contain virtually unmeasurable organic carbon and cultivable bacteria, establishing the baseline for Mars soil oxidant reactivity and life-detection limits.' },
  { id: 'c_gale', doc: 'grotzinger2014', kind: 'established', text: 'Curiosity revealed that Yellowknife Bay in Gale Crater was an ancient lake with neutral pH, low salinity, and all key biogenic elements (C, H, N, O, P, S), proving Mars was habitable during the early Hesperian era.' },
  { id: 'c_shackleton', doc: 'colaprete2010', kind: 'established', text: 'Permanently shadowed craters at the lunar south pole such as Shackleton maintain cryogenic cold traps (<40 K) capable of retaining water ice and volatile organics over billions of years, providing a vital resource for human Artemis exploration.' },
  { id: 'c_thar', doc: 'platform-method', kind: 'established', text: 'The Thar Desert in Rajasthan, India, serves as a high-fidelity terrestrial testbed for Martian aeolian dynamics, barchan dune migration, and autonomous rover traversing across unconsolidated granular regolith under extreme thermal swings.' },
  { id: 'c_barren', doc: 'platform-method', kind: 'established', text: 'Barren Island in the Andaman Sea is South Asia’s sole active volcano, featuring pristine basaltic pyroclastic cones and lava sheets analogous to lunar mare flood volcanism and Martian volcanic vents.' },
  { id: 'c_gangotri', doc: 'platform-method', kind: 'established', text: 'The Gangotri glacier system in the Indian Himalayas provides a real-world analogue for Martian glacio-volcanic interactions, ice-cored rock glaciers, and lobate debris aprons (LDAs) identified in Deuteronilus Mensae on Mars.' }
];

const DOCS = Object.assign(
  Object.fromEntries(PAPERS.map(p => [p.id, { title: p.title, sub: p.au + ' (' + p.yr + '), ' + p.venue, url: paperLink(p), paper: true }])),
  {
    'platform-method': { title: 'Methodology: Multi-parameter Gaussian Similarity & Evidence Mass', sub: 'Technical Specification', url: null },
    'platform-limits': { title: 'Limits of Terrestrial Analogs: Gravitational and Environmental Constraints', sub: 'Planetary Science Protocol', url: null }
  }
);

if (typeof module !== 'undefined') {
  module.exports = {
    N, X,
    PARAMS, PARAM, ORDER, REGIONS, REG, DATASETS, DS, MISSIONS, UPCOMING,
    PAPERS, CORPUS, DOCS, CURATED_EDGES, DS_COVER, INSTRUMENTS, OBSERVATIONS,
    FORMATIONS, GRADE_CONF, CAT_LABEL, BODIES, srcFor, DS_PRODUCER
  };
}
