"use strict";

window.addEventListener("error", (e) =>
  console.error("[neo-swarm]", e.message, e.filename, e.lineno));
window.addEventListener("unhandledrejection", (e) =>
  console.error("[neo-swarm]", String((e.reason && e.reason.stack) || e.reason)));

/* ================= constants ================= */

const J2000 = 2451545.0;
const DEG = Math.PI / 180;
const GAUSS = 0.01720209895;            // rad/day, sqrt(GM_sun) in au^1.5/day
const LD_AU = 384400 / 149597870.7;     // 1 lunar distance in au
const OBLIQUITY = 23.43928 * DEG;       // J2000 obliquity, for star coords

// Planets: JPL "Approximate Positions of the Planets" (Standish), 1800-2050.
const PLANETS = [
  { key: "mercury", color: "#9aa0a8", r: 2.2,
    a: 0.38709927, e: 0.20563593, I: 7.00497902, L: 252.25032350, peri: 77.45779628, node: 48.33076593,
    aDot: 0.00000037, eDot: 0.00001906, IDot: -0.00594749, LDot: 149472.67411175, periDot: 0.16047689, nodeDot: -0.12534081 },
  { key: "venus", color: "#e8c468", r: 3.0,
    a: 0.72333566, e: 0.00677672, I: 3.39467605, L: 181.97909950, peri: 131.60246718, node: 76.67984255,
    aDot: 0.00000390, eDot: -0.00004107, IDot: -0.00078890, LDot: 58517.81538729, periDot: 0.00268329, nodeDot: -0.27769418 },
  { key: "earth", color: "#4f9df7", r: 3.4,
    a: 1.00000261, e: 0.01671123, I: -0.00001531, L: 100.46457166, peri: 102.93768193, node: 0.0,
    aDot: 0.00000562, eDot: -0.00004392, IDot: -0.01294668, LDot: 35999.37244981, periDot: 0.32327364, nodeDot: 0.0 },
  { key: "mars", color: "#e2693f", r: 2.6,
    a: 1.52371034, e: 0.09339410, I: 1.84969142, L: -4.55343205, peri: -23.94362959, node: 49.55953891,
    aDot: 0.00001847, eDot: 0.00007882, IDot: -0.00813131, LDot: 19140.30268499, periDot: 0.44441088, nodeDot: -0.29257343 },
  { key: "jupiter", color: "#d8a26a", r: 5.0,
    a: 5.20288700, e: 0.04838624, I: 1.30439695, L: 34.39644051, peri: 14.72847983, node: 100.47390909,
    aDot: -0.00011607, eDot: -0.00013253, IDot: -0.00183714, LDot: 3034.74612775, periDot: 0.21252668, nodeDot: 0.20469106 },
  { key: "saturn", color: "#e3c98a", r: 4.4,
    a: 9.53667594, e: 0.05386179, I: 2.48599187, L: 49.95424423, peri: 92.59887831, node: 113.66242448,
    aDot: -0.00125060, eDot: -0.00050991, IDot: 0.00193609, LDot: 1222.49362201, periDot: -0.41897216, nodeDot: -0.28867794 }
];

const CLASS_NAMES = { APO: "Apollo", ATE: "Aten", AMO: "Amor", IEO: "Atira" };
const CLASS_ORDER = ["APO", "ATE", "AMO", "IEO"];
const CLASS_COLORS = ["rgba(255,122,92,0.7)", "rgba(88,230,217,0.8)", "rgba(124,140,255,0.7)", "rgba(232,196,104,0.9)"];
const CLASS_HEX = ["#ff7a5c", "#58e6d9", "#7c8cff", "#e8c468"];

const I18N = {
  en: {
    eyebrow: "NASA/JPL Small-Body Database · pull ",
    title: "The Near-Earth Swarm",
    stats: (s) => `<b>${s.plotted}</b> plotted &nbsp;·&nbsp; <b class="pha">${s.phas} PHAs</b> — all of them` +
      `<br>of <b>${s.known}</b> known NEOs &nbsp;·&nbsp; <b>${s.cad}</b> close passes ≤ 0.05 au through 2033`,
    swarmAll: "All", swarmPha: "Hazardous", swarmOff: "Hide",
    starLabel: "stars", starsBright: "bright", starsAll: "all 41k", starsOff: "off",
    focusLabel: "focus",
    caToggle: "Close approaches", caTitle: "Upcoming close approaches",
    caNote: "Known future passes within 0.05 au (≈19.5 LD), per JPL CNEOS. Click a row to watch its approach.",
    hint: "drag to orbit · scroll to zoom · click an asteroid",
    sources: "Orbits: NASA/JPL Small-Body Database · Approaches: JPL CNEOS · Planets: JPL Keplerian elements · Stars: BSC5/HYG (mag ≤ 8.5)",
    loading: "computing 6,800 orbits…",
    today: "Today", watch: "⏵ watch this approach", paused: "paused",
    days: "d", years: "y", perSecond: "/s",
    semiMajor: "Semi-major axis", ecc: "Eccentricity", inc: "Inclination",
    period: "Orbital period", hmag: "Abs. magnitude H", diameter: "Diameter", diamEst: "Diameter (est.)",
    rSun: "Distance from Sun", dEarth: "Distance from Earth", nextCa: "Next close pass",
    yearsUnit: "y", daysUnit: "d", pha: "PHA — potentially hazardous", neo: "NEO",
    consToggle: "lines", viewLabel: "view", viewNow: "now", viewDiscovery: "discovery",
    search: "search 6,834 asteroids…", noResults: "no match",
    ticker: (des, ld) => `☄ closest to Earth now: <b>${des}</b> · <i>${ld} LD</i>`,
    discoveryStats: (n, total, year) => `<b>${n}</b> of <b>${total}</b> plotted NEOs discovered by <b>${year}</b><br>teal flash = newly discovered`,
    sentry: "Sentry — impact monitored", ip: "Impact probability (cum.)", oneIn: "1 in",
    palermo: "Palermo scale (cum.)", torino: "Torino scale (max.)", impactYears: "Possible impacts",
    moon: "Moon",
    colorLabel: "color", colorDanger: "danger", colorClass: "type",
    energy: "Impact energy (est.)", hiro: "× Hiroshima",
    tourBtn: "🎬 tour", tourSkip: "next →", tourExit: "exit ×",
    tourCaps: [
      "42,026 known near-Earth asteroids. 6,834 of them are moving on this screen right now — every orbit is real, from NASA/JPL.",
      "These are the 2,540 potentially hazardous ones: larger than ~140 m, crossing within 0.05 au of Earth's orbit. We are watching all of them.",
      "April 13, 2029 — Apophis, 340 m wide, slides closer to Earth than our own geostationary satellites. Watch the teal orbit thread the rings.",
      "Bennu. OSIRIS-REx brought a piece of it home; Sentry still keeps it on the watchlist into the 2300s.",
      "Rewind to 1980 and let it run: every teal flash is a real discovery, on its real date. Four decades of planetary defense in a minute.",
      "And all of it happens in front of 41,411 real stars and 88 constellations. Drag the sky. It's yours."
    ]
  },
  tr: {
    eyebrow: "NASA/JPL Küçük Cisimler Veritabanı · çekim ",
    title: "Yakın-Dünya Sürüsü",
    stats: (s) => `<b>${s.plotted}</b> çizildi &nbsp;·&nbsp; <b class="pha">${s.phas} PHA</b> — tamamı` +
      `<br><b>${s.known}</b> bilinen NEO içinden &nbsp;·&nbsp; 2033'e dek <b>${s.cad}</b> yakın geçiş (≤ 0,05 au)`,
    swarmAll: "Tümü", swarmPha: "Tehlikeli", swarmOff: "Gizle",
    starLabel: "yıldızlar", starsBright: "parlak", starsAll: "tümü 41b", starsOff: "kapalı",
    focusLabel: "odak",
    caToggle: "Yakın geçişler", caTitle: "Yaklaşan yakın geçişler",
    caNote: "JPL CNEOS'a göre 0,05 au (≈19,5 AyU) içindeki bilinen geçişler. Yaklaşmayı izlemek için bir satıra tıkla.",
    hint: "sürükle: döndür · tekerlek: yakınlaş · asteroite tıkla",
    sources: "Yörüngeler: NASA/JPL Küçük Cisimler VT · Geçişler: JPL CNEOS · Gezegenler: JPL Kepler elemanları · Yıldızlar: BSC5/HYG (kadir ≤ 8,5)",
    loading: "6.800 yörünge hesaplanıyor…",
    today: "Bugün", watch: "⏵ bu geçişi izle", paused: "duraklatıldı",
    days: "g", years: "y", perSecond: "/sn",
    semiMajor: "Yarı-büyük eksen", ecc: "Dışmerkezlik", inc: "Eğiklik",
    period: "Yörünge periyodu", hmag: "Mutlak parlaklık H", diameter: "Çap", diamEst: "Çap (tahmini)",
    rSun: "Güneş'e uzaklık", dEarth: "Dünya'ya uzaklık", nextCa: "Sonraki yakın geçiş",
    yearsUnit: "y", daysUnit: "g", pha: "PHA — potansiyel tehlikeli", neo: "NEO",
    consToggle: "çizgiler", viewLabel: "görünüm", viewNow: "şimdi", viewDiscovery: "keşif",
    search: "6.834 asteroit içinde ara…", noResults: "sonuç yok",
    ticker: (des, ld) => `☄ şu an Dünya'ya en yakın: <b>${des}</b> · <i>${ld} AyU</i>`,
    discoveryStats: (n, total, year) => `<b>${year}</b> itibarıyla çizilen NEO'ların <b>${n}</b>/<b>${total}</b>'i keşfedilmişti<br>turkuaz parlama = yeni keşif`,
    sentry: "Sentry — çarpışma izlemede", ip: "Çarpışma olasılığı (küm.)", oneIn: "1 /",
    palermo: "Palermo ölçeği (küm.)", torino: "Torino ölçeği (maks.)", impactYears: "Olası çarpışmalar",
    moon: "Ay",
    colorLabel: "renk", colorDanger: "tehlike", colorClass: "tür",
    energy: "Çarpma enerjisi (tahmini)", hiro: "× Hiroşima",
    tourBtn: "🎬 tur", tourSkip: "sonraki →", tourExit: "çık ×",
    tourCaps: [
      "Bilinen 42.026 yakın-Dünya asteroidi. 6.834'ü şu anda bu ekranda hareket ediyor — her yörünge gerçek, NASA/JPL'den.",
      "Bunlar potansiyel tehlikeli 2.540 tanesi: ~140 m'den büyük ve Dünya yörüngesine 0,05 au'dan fazla yaklaşanlar. Hepsini izliyoruz.",
      "13 Nisan 2029 — 340 metrelik Apophis, kendi sabit yörünge uydularımızdan bile yakın geçecek. Turkuaz yörüngenin halkaların arasından geçişini izle.",
      "Bennu. OSIRIS-REx ondan bir parçayı eve getirdi; Sentry onu 2300'lere kadar izleme listesinde tutuyor.",
      "1980'e sar ve bırak aksın: her turkuaz parlama, gerçek tarihinde gerçek bir keşif. Kırk yıllık gezegen savunması bir dakikada.",
      "Ve hepsi 41.411 gerçek yıldız ile 88 takımyıldızın önünde oluyor. Gökyüzünü sürükle. Senin artık."
    ]
  }
};

const PLANET_NAMES = {
  en: { mercury: "Mercury", venus: "Venus", earth: "Earth", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", sun: "Sun" },
  tr: { mercury: "Merkür", venus: "Venüs", earth: "Dünya", mars: "Mars", jupiter: "Jüpiter", saturn: "Satürn", sun: "Güneş" }
};

/* ================= state ================= */

let lang = localStorage.getItem("neo-lang")
  || (navigator.language && navigator.language.startsWith("tr") ? "tr" : "en");
let simDate = new Date();
let playing = true;
const SPEEDS = [1, 7, 30, 90, 365, 3650];
let speedIdx = 2;
let direction = 1;
let swarmMode = "all";      // all | pha | off
let starMode = "bright";    // bright | all | off
let consOn = true;
let viewMode = "now";       // now | discovery
let colorMode = "danger";   // danger | class
let tourIdx = -1, tourTimer = null;
let lastInteract = performance.now();
const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;
let focusEarth = false;
let selected = -1;          // asteroid index
let cam = { yaw: -0.5, pitch: 0.62, dist: 4.2 };
let W = 0, H = 0, dpr = 1, fov = 0;

let NEO = null, CAD = null, STARS = null, EXTRAS = null;
let ast = null;             // typed-array bundle
let starsArr = null, consArr = null;
let caByDes = new Map();
let earthNow = { x: 0, y: 0, z: 0 };
let closestIdx = -1, closestD = 1e9, discoveredCount = 0;

const t = (k) => I18N[lang][k];
const $ = (id) => document.getElementById(id);

const starsCv = $("stars-canvas"), trailCv = $("trail-canvas"), topCv = $("top-canvas");
const starsCx = starsCv.getContext("2d"), trailCx = trailCv.getContext("2d"), topCx = topCv.getContext("2d");

/* ================= math ================= */

const julianDay = (d) => d.getTime() / 86400000 + 2440587.5;

function kepler(M, e) {
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 6; k++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

// Planet heliocentric ecliptic position [au] (same scheme as solar-system).
function planetPos(p, jd) {
  const T = (jd - J2000) / 36525;
  const a = p.a + p.aDot * T, e = p.e + p.eDot * T;
  const I = (p.I + p.IDot * T) * DEG;
  const L = (p.L + p.LDot * T) * DEG;
  const peri = (p.peri + p.periDot * T) * DEG;
  const node = (p.node + p.nodeDot * T) * DEG;
  let M = (L - peri) % (2 * Math.PI);
  if (M > Math.PI) M -= 2 * Math.PI;
  if (M < -Math.PI) M += 2 * Math.PI;
  const E = kepler(M, e);
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = peri - node;
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(node), sO = Math.sin(node);
  const cI = Math.cos(I), sI = Math.sin(I);
  return {
    x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    z: sw * sI * xp + cw * sI * yp
  };
}

// Low-precision lunar position (geocentric ecliptic, ~0.3° accuracy) — plenty
// for visualising the Moon's orbit at close-approach scale.
function moonPos(jd, earth) {
  const d = jd - J2000;
  const L = (218.316 + 13.176396 * d) * DEG;     // mean longitude
  const M = (134.963 + 13.064993 * d) * DEG;     // mean anomaly
  const F = (93.272 + 13.229350 * d) * DEG;      // argument of latitude
  const lon = L + 6.289 * DEG * Math.sin(M);
  const lat = 5.128 * DEG * Math.sin(F);
  const r = (385001 - 20905 * Math.cos(M)) / 149597870.7;
  return {
    x: earth.x + r * Math.cos(lat) * Math.cos(lon),
    y: earth.y + r * Math.cos(lat) * Math.sin(lon),
    z: earth.z + r * Math.sin(lat),
    r
  };
}

/* ================= data ================= */

function prepAsteroids() {
  const n = NEO.des.length;
  ast = {
    n,
    A: new Float64Array(n), B: new Float64Array(n), C: new Float64Array(n),
    D: new Float64Array(n), E: new Float64Array(n), F: new Float64Array(n),
    a: new Float64Array(n), b: new Float64Array(n), e: new Float64Array(n),
    nn: new Float64Array(n), M0: new Float64Array(n), ep: new Float64Array(n),
    pha: new Uint8Array(n), ok: new Uint8Array(n),
    sx: new Float32Array(n), sy: new Float32Array(n), vis: new Uint8Array(n),
    wx: new Float64Array(n), wy: new Float64Array(n), wz: new Float64Array(n),
    fo: new Float32Array(n), cc: new Uint8Array(n)
  };
  for (let i = 0; i < n; i++) {
    const a = NEO.a[i], e = NEO.e[i];
    if (!(a > 0) || !(e >= 0) || e >= 0.99) continue;
    const w = NEO.w[i] * DEG, om = NEO.om[i] * DEG, inc = NEO.i[i] * DEG;
    const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(om), sO = Math.sin(om);
    const cI = Math.cos(inc), sI = Math.sin(inc);
    ast.A[i] = cw * cO - sw * sO * cI; ast.B[i] = -sw * cO - cw * sO * cI;
    ast.C[i] = cw * sO + sw * cO * cI; ast.D[i] = -sw * sO + cw * cO * cI;
    ast.E[i] = sw * sI; ast.F[i] = cw * sI;
    ast.a[i] = a; ast.b[i] = a * Math.sqrt(1 - e * e); ast.e[i] = e;
    ast.nn[i] = GAUSS / Math.pow(a, 1.5);
    ast.M0[i] = NEO.ma[i] * DEG; ast.ep[i] = NEO.ep[i];
    ast.pha[i] = NEO.pha[i]; ast.ok[i] = 1;
    ast.fo[i] = NEO.fo[i] || 0;
    const cc = CLASS_ORDER.indexOf(NEO.cls[i]);
    ast.cc[i] = cc < 0 ? 3 : cc;
  }
}

function prepCons() {
  const ce = Math.cos(OBLIQUITY), se = Math.sin(OBLIQUITY);
  const toDir = (ra, dec) => {
    const r = ra * DEG, q = dec * DEG;
    const cx = Math.cos(q) * Math.cos(r), cy = Math.cos(q) * Math.sin(r), cz = Math.sin(q);
    return [cx * 1000, (cy * ce + cz * se) * 1000, (-cy * se + cz * ce) * 1000];
  };
  consArr = {
    lines: EXTRAS.lines.map((seg) => seg.map((p) => toDir(p[0], p[1]))),
    names: EXTRAS.names.map(([name, ra, dec]) => [name, ...toDir(ra, dec)])
  };
}

function prepStars() {
  const n = STARS.count;
  const dir = new Float32Array(n * 3);
  const ce = Math.cos(OBLIQUITY), se = Math.sin(OBLIQUITY);
  for (let i = 0; i < n; i++) {
    const ra = STARS.ra[i] * DEG, dec = STARS.dec[i] * DEG;
    const cx = Math.cos(dec) * Math.cos(ra), cy = Math.cos(dec) * Math.sin(ra), cz = Math.sin(dec);
    dir[i * 3] = cx * 1000;
    dir[i * 3 + 1] = (cy * ce + cz * se) * 1000;       // equatorial -> ecliptic
    dir[i * 3 + 2] = (-cy * se + cz * ce) * 1000;
  }
  // buckets: color band (by B-V) x brightness band (by mag), one fillStyle per bucket
  const colors = ["#9db8ff", "#cdd9ff", "#eef2f8", "#ffd9a0", "#ffb98a"];
  const alphas = [1, 0.85, 0.6, 0.4, 0.26];
  const sizes = [2.2, 1.7, 1.3, 1.0, 0.8];
  const colorBand = (bv) => bv < 0 ? 0 : bv < 0.4 ? 1 : bv < 0.9 ? 2 : bv < 1.4 ? 3 : 4;
  const magBand = (m) => m < 1.5 ? 0 : m < 3 ? 1 : m < 4.5 ? 2 : m < 6 ? 3 : 4;
  const buckets = { bright: [], all: [] };
  for (const mode of ["bright", "all"]) {
    for (let c = 0; c < 5; c++) for (let m = 0; m < 5; m++) {
      buckets[mode].push({ style: hexA(colors[c], alphas[m]), size: sizes[m], idx: [] });
    }
  }
  for (let i = 0; i < n; i++) {
    const k = colorBand(STARS.bv[i]) * 5 + magBand(STARS.mag[i]);
    buckets.all[k].idx.push(i);
    if (STARS.mag[i] <= 6) buckets.bright[k].idx.push(i);
  }
  starsArr = { n, dir, buckets, names: STARS.names };
}

function hexA(hex, a) {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${a})`;
}

/* ================= camera / projection ================= */

let cyaw = 1, syaw = 0, cpit = 1, spit = 0, tgt = { x: 0, y: 0, z: 0 };

function camUpdate(jd) {
  cyaw = Math.cos(cam.yaw); syaw = Math.sin(cam.yaw);
  cpit = Math.cos(cam.pitch); spit = Math.sin(cam.pitch);
  tgt = focusEarth ? planetPos(PLANETS[2], jd) : { x: 0, y: 0, z: 0 };
  fov = Math.min(W, H) * 1.05;
}

// returns [sx, sy, depth] or null
function project(x, y, z) {
  x -= tgt.x; y -= tgt.y; z -= tgt.z;
  const x1 = x * cyaw + y * syaw;
  const y1 = -x * syaw + y * cyaw;
  const y2 = y1 * cpit - z * spit;
  const z2 = y1 * spit + z * cpit;
  const depth = cam.dist + y2;
  if (depth < 0.03) return null;
  return [W / 2 + fov * x1 / depth, H / 2 - fov * z2 / depth, depth];
}

/* ================= rendering ================= */

function drawStars() {
  starsCx.clearRect(0, 0, W, H);
  if (starMode === "off" || !starsArr) return;
  if (consOn && consArr) {
    starsCx.strokeStyle = "rgba(124,140,255,0.22)";
    starsCx.lineWidth = 1;
    for (const seg of consArr.lines) {
      starsCx.beginPath();
      let started = false;
      for (const v of seg) {
        const p = project(v[0] + tgt.x, v[1] + tgt.y, v[2] + tgt.z);
        if (!p) { started = false; continue; }
        started ? starsCx.lineTo(p[0], p[1]) : starsCx.moveTo(p[0], p[1]);
        started = true;
      }
      starsCx.stroke();
    }
    starsCx.fillStyle = "rgba(124,140,255,0.45)";
    starsCx.font = "10px 'JetBrains Mono', monospace";
    for (const [name, x, y, z] of consArr.names) {
      const p = project(x + tgt.x, y + tgt.y, z + tgt.z);
      if (p) starsCx.fillText(name, p[0], p[1]);
    }
  }
  const set = starsArr.buckets[starMode];
  const d = starsArr.dir;
  for (const b of set) {
    starsCx.fillStyle = b.style;
    const s = b.size;
    for (const i of b.idx) {
      const p = project(d[i * 3] + tgt.x, d[i * 3 + 1] + tgt.y, d[i * 3 + 2] + tgt.z);
      if (p) starsCx.fillRect(p[0], p[1], s, s);
    }
  }
  starsCx.fillStyle = "rgba(139,155,180,0.75)";
  starsCx.font = "10px 'JetBrains Mono', monospace";
  for (const [i, name] of starsArr.names) {
    const p = project(d[i * 3] + tgt.x, d[i * 3 + 1] + tgt.y, d[i * 3 + 2] + tgt.z);
    if (p) starsCx.fillText(name, p[0] + 5, p[1] - 4);
  }
}

function drawSwarm(jd) {
  trailCx.globalCompositeOperation = "source-over";
  trailCx.fillStyle = REDUCED_MOTION ? "rgba(10,14,20,1)" : "rgba(10,14,20,0.32)";
  trailCx.fillRect(0, 0, W, H);
  trailCx.globalCompositeOperation = "lighter";

  // sun
  const sp = project(0, 0, 0);
  if (sp) {
    const r = Math.max(5, 8 / cam.dist * 4);
    const g = trailCx.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], r * 4);
    g.addColorStop(0, "rgba(255,214,138,0.9)");
    g.addColorStop(0.35, "rgba(255,170,80,0.18)");
    g.addColorStop(1, "rgba(255,170,80,0)");
    trailCx.fillStyle = g;
    trailCx.beginPath(); trailCx.arc(sp[0], sp[1], r * 4, 0, 7); trailCx.fill();
  }

  // planets
  for (const p of PLANETS) {
    const w = planetPos(p, jd);
    p.world = w;
    const q = project(w.x, w.y, w.z);
    p.screen = q;
    if (!q) continue;
    const r = p.r * Math.min(2, 3.4 / q[2]);
    trailCx.fillStyle = p.color;
    trailCx.beginPath(); trailCx.arc(q[0], q[1], Math.max(1.4, r), 0, 7); trailCx.fill();
  }
  earthNow = PLANETS[2].world;

  // the Moon, once the camera is close enough for it to mean something
  if (cam.dist < 0.6) {
    const m = moonPos(jd, earthNow);
    const q = project(m.x, m.y, m.z);
    if (q) {
      trailCx.fillStyle = "#c8ccd4";
      trailCx.beginPath(); trailCx.arc(q[0], q[1], 1.6, 0, 7); trailCx.fill();
    }
  }

  if (swarmMode === "off" || !ast) return;
  const phaOnly = swarmMode === "pha";
  const discovery = viewMode === "discovery";
  const simYear = 2000 + (jd - J2000) / 365.25;
  const fresh = [];
  closestIdx = -1; closestD = 1e9; discoveredCount = 0;
  ast.vis.fill(0);

  // one pass per fill style; depth-scaled point size for 3D feel
  const passes = colorMode === "class"
    ? CLASS_COLORS.map((fill, k) => ({ fill, s: 1.6, match: (i) => ast.cc[i] === k }))
    : [{ fill: "rgba(219,108,84,0.42)", s: 1.3, match: (i) => !ast.pha[i] },
       { fill: "rgba(255,118,86,0.85)", s: 1.9, match: (i) => ast.pha[i] === 1 }];

  for (const pass of passes) {
    trailCx.fillStyle = pass.fill;
    const s = pass.s;
    for (let i = 0; i < ast.n; i++) {
      if (!ast.ok[i] || !pass.match(i)) continue;
      if (phaOnly && !ast.pha[i]) continue;
      if (discovery && ast.fo[i] > simYear) continue;
      if (discovery) discoveredCount++;
      let M = (ast.M0[i] + ast.nn[i] * (jd - ast.ep[i])) % (2 * Math.PI);
      const e = ast.e[i];
      const E = kepler(M, e);
      const xp = ast.a[i] * (Math.cos(E) - e), yp = ast.b[i] * Math.sin(E);
      const wx = ast.A[i] * xp + ast.B[i] * yp;
      const wy = ast.C[i] * xp + ast.D[i] * yp;
      const wz = ast.E[i] * xp + ast.F[i] * yp;
      ast.wx[i] = wx; ast.wy[i] = wy; ast.wz[i] = wz;
      const dx = wx - earthNow.x, dy = wy - earthNow.y, dz = wz - earthNow.z;
      const dE2 = dx * dx + dy * dy + dz * dz;
      if (dE2 < closestD) { closestD = dE2; closestIdx = i; }
      const q = project(wx, wy, wz);
      if (!q) continue;
      ast.vis[i] = 1; ast.sx[i] = q[0]; ast.sy[i] = q[1];
      if (discovery && simYear - ast.fo[i] < 1.5) { fresh.push(i); continue; }
      const f = Math.min(2.4, Math.max(0.55, 2.6 / q[2]));
      trailCx.fillRect(q[0], q[1], s * f, s * f);
    }
  }

  // newly discovered objects flash teal, then settle into the swarm
  if (fresh.length) {
    trailCx.fillStyle = "rgba(88,230,217,0.95)";
    for (const i of fresh) trailCx.fillRect(ast.sx[i] - 1, ast.sy[i] - 1, 2.6, 2.6);
  }
}

function drawTop(jd) {
  topCx.clearRect(0, 0, W, H);
  topCx.font = "11px 'JetBrains Mono', monospace";
  const names = PLANET_NAMES[lang];

  const sp = project(0, 0, 0);
  if (sp && !focusEarth) {
    topCx.fillStyle = "rgba(139,155,180,0.9)";
    topCx.fillText(names.sun, sp[0] + 8, sp[1] - 8);
  }
  for (const p of PLANETS) {
    if (!p.screen) continue;
    topCx.fillStyle = p.key === "earth" ? "rgba(79,157,247,0.95)" : "rgba(139,155,180,0.8)";
    topCx.fillText(names[p.key], p.screen[0] + 7, p.screen[1] - 7);
  }

  // lunar-distance rings around Earth: the yardstick of every close approach
  if (focusEarth && cam.dist < 0.6) {
    topCx.strokeStyle = "rgba(88,230,217,0.28)";
    topCx.fillStyle = "rgba(88,230,217,0.6)";
    topCx.lineWidth = 1;
    topCx.setLineDash([2, 5]);
    for (const ld of [1, 5, 20]) {
      const r = ld * LD_AU;
      topCx.beginPath();
      let started = false;
      for (let k = 0; k <= 90; k++) {
        const th = k / 90 * 2 * Math.PI;
        const q = project(earthNow.x + r * Math.cos(th), earthNow.y + r * Math.sin(th), earthNow.z);
        if (!q) { started = false; continue; }
        started ? topCx.lineTo(q[0], q[1]) : topCx.moveTo(q[0], q[1]);
        started = true;
      }
      topCx.stroke();
      const lp = project(earthNow.x + r * 0.7071, earthNow.y + r * 0.7071, earthNow.z);
      if (lp) topCx.fillText(`${ld} LD`, lp[0] + 4, lp[1] - 4);
    }
    topCx.setLineDash([]);
    const m = moonPos(jd, earthNow);
    const mq = project(m.x, m.y, m.z);
    if (mq && cam.dist < 0.15) {
      topCx.fillStyle = "rgba(200,204,212,0.85)";
      topCx.fillText(t("moon"), mq[0] + 6, mq[1] - 6);
    }
  }

  if (selected >= 0 && ast.ok[selected]) {
    // full orbit of the selected object
    topCx.strokeStyle = "rgba(88,230,217,0.85)";
    topCx.lineWidth = 1.3;
    topCx.beginPath();
    let started = false;
    for (let k = 0; k <= 128; k++) {
      const E = k / 128 * 2 * Math.PI;
      const xp = ast.a[selected] * (Math.cos(E) - ast.e[selected]);
      const yp = ast.b[selected] * Math.sin(E);
      const q = project(
        ast.A[selected] * xp + ast.B[selected] * yp,
        ast.C[selected] * xp + ast.D[selected] * yp,
        ast.E[selected] * xp + ast.F[selected] * yp);
      if (!q) { started = false; continue; }
      started ? topCx.lineTo(q[0], q[1]) : topCx.moveTo(q[0], q[1]);
      started = true;
    }
    topCx.stroke();
    const q = project(ast.wx[selected], ast.wy[selected], ast.wz[selected]);
    if (q) {
      topCx.strokeStyle = "#58e6d9";
      topCx.setLineDash([3, 3]);
      topCx.beginPath(); topCx.arc(q[0], q[1], 9, 0, 7); topCx.stroke();
      topCx.setLineDash([]);
      topCx.fillStyle = "#58e6d9";
      topCx.fillText(NEO.name[selected] || NEO.des[selected], q[0] + 12, q[1] - 10);
    }
    updateCard(jd);
  }
}

/* ================= info card / CA panel ================= */

const fmt = (n, d = 2) => n.toLocaleString(lang === "tr" ? "tr-TR" : "en-US",
  { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtInt = (n) => Math.round(n).toLocaleString(lang === "tr" ? "tr-TR" : "en-US");
const row = (l, v, warn = "") => `<div class="row"><span>${l}</span><b class="${warn}">${v}</b></div>`;

function estDiameter(Hm) {
  // D[km] = 1329/sqrt(albedo) * 10^(-H/5); albedo 0.05-0.25 (JPL convention)
  const lo = 1329 / Math.sqrt(0.25) * Math.pow(10, -Hm / 5);
  const hi = 1329 / Math.sqrt(0.05) * Math.pow(10, -Hm / 5);
  const f = (km) => km < 1 ? `${fmtInt(km * 1000)} m` : `${fmt(km, 1)} km`;
  return `${f(lo)} – ${f(hi)}`;
}

function updateCard(jd) {
  const i = selected;
  const e = PLANETS[2].world || planetPos(PLANETS[2], jd);
  const dE = Math.hypot(ast.wx[i] - e.x, ast.wy[i] - e.y, ast.wz[i] - e.z);
  const rS = Math.hypot(ast.wx[i], ast.wy[i], ast.wz[i]);
  const ca = caByDes.get(NEO.des[i]);
  const period = Math.pow(ast.a[i], 1.5);
  let html =
    row(t("rSun"), `${fmt(rS, 3)} au`) +
    row(t("dEarth"), `${fmt(dE, 3)} au · ${fmt(dE / LD_AU, 1)} LD`, dE < 0.05 ? "warn" : "") +
    row(t("semiMajor"), `${fmt(ast.a[i], 3)} au`) +
    row(t("ecc"), fmt(ast.e[i], 3)) +
    row(t("inc"), `${fmt(NEO.i[i], 1)}°`) +
    row(t("period"), period < 2 ? `${fmtInt(period * 365.25)} ${t("daysUnit")}` : `${fmt(period, 1)} ${t("yearsUnit")}`) +
    (NEO.H[i] != null ? row(t("hmag"), fmt(NEO.H[i], 1)) : "") +
    (NEO.d[i] != null ? row(t("diameter"), `${fmt(NEO.d[i], 2)} km`)
      : NEO.H[i] != null ? row(t("diamEst"), estDiameter(NEO.H[i])) : "");

  // back-of-envelope impact energy: rocky density, CA velocity or 20 km/s typical
  const dKm = NEO.d[i] != null ? NEO.d[i]
    : NEO.H[i] != null ? 1329 / Math.sqrt(0.14) * Math.pow(10, -NEO.H[i] / 5) : null;
  if (dKm) {
    const v = (ca ? ca[3] : 20) * 1000;
    const mass = Math.PI / 6 * 2600 * Math.pow(dKm * 1000, 3);
    const mt = 0.5 * mass * v * v / 4.184e15;
    const label = mt >= 1000 ? `${fmt(mt / 1000, 1)} Gt` : mt >= 1 ? `${fmt(mt, 0)} Mt` : `${fmt(mt * 1000, 0)} kt`;
    html += row(t("energy"), `${label} · ${fmtInt(Math.max(1, mt / 0.015))}${t("hiro")}`,
      mt >= 100 ? "warn" : "");
  }
  if (ca) {
    const d = new Date(ca[1].replace(/-(\w{3})-/, (m, mon) => "-" + ("0" + (
      ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(mon) + 1)).slice(-2) + "-"));
    html += row(t("nextCa"),
      `${d.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { year: "numeric", month: "short", day: "numeric" })}` +
      ` · ${fmt(ca[2] / LD_AU, 1)} LD · ${fmt(ca[3], 1)} km/s`, "warn");
  }
  const sentry = EXTRAS.sentry[NEO.des[i]];
  if (sentry) {
    const [ip, ps, ts, range] = sentry;
    html +=
      row(t("ip"), `${t("oneIn")} ${fmtInt(1 / ip)}`, "warn") +
      row(t("palermo"), fmt(ps, 2)) +
      (ts != null ? row(t("torino"), String(ts)) : "") +
      row(t("impactYears"), range);
  }
  $("card-body").innerHTML = html;
}

function select(i) {
  selected = i;
  const card = $("card");
  document.querySelectorAll(".ca-row.sel").forEach((r) => r.classList.remove("sel"));
  if (i < 0) { card.classList.remove("open"); return; }
  card.classList.add("open");
  $("card-title").textContent = NEO.name[i] ? `${NEO.name[i]} (${NEO.des[i]})` : NEO.des[i];
  const cls = CLASS_NAMES[NEO.cls[i]] || NEO.cls[i];
  $("card-badges").innerHTML =
    `<span class="badge">${cls}</span>` +
    (NEO.pha[i] ? `<span class="badge pha">${t("pha")}</span>` : `<span class="badge">${t("neo")}</span>`) +
    (EXTRAS.sentry[NEO.des[i]] ? `<span class="badge pha">⚠ ${t("sentry")}</span>` : "");
  const ca = caByDes.get(NEO.des[i]);
  $("card-watch").classList.toggle("show", !!ca);
  const rowEl = document.querySelector(`.ca-row[data-des="${CSS.escape(NEO.des[i])}"]`);
  if (rowEl) rowEl.classList.add("sel");
  writeHash();
}

function buildCaList() {
  const frag = [];
  for (const r of CAD.rows) {
    const d = r[1].slice(0, 11);
    frag.push(`<button class="ca-row" data-des="${r[0]}"><time>${d}</time><b>${r[0]}</b><i>${(r[2] / LD_AU).toFixed(1)} LD</i></button>`);
    if (!caByDes.has(r[0])) caByDes.set(r[0], r);
  }
  $("ca-list").innerHTML = frag.join("");
  $("ca-list").addEventListener("click", (ev) => {
    const btn = ev.target.closest(".ca-row");
    if (!btn) return;
    const i = NEO.des.indexOf(btn.dataset.des);
    if (i >= 0) { select(i); watchApproach(false); }
  });
}

function watchApproach(jump = true) {
  const ca = selected >= 0 && caByDes.get(NEO.des[selected]);
  if (!ca) return;
  if (jump) {
    const when = new Date(ca[1].replace(/-(\w{3})-/, (m, mon) => "-" + ("0" + (
      ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(mon) + 1)).slice(-2) + "-"));
    simDate = new Date(when.getTime() - 12 * 86400000);
    speedIdx = 0; direction = 1; playing = true;
    $("speed").value = 0;
    setFocus(true);
  }
}

/* ================= UI ================= */

function applyLang() {
  document.documentElement.lang = lang;
  $("eyebrow").textContent = t("eyebrow") + NEO.pull;
  $("brand-title").textContent = t("title");
  $("stats").innerHTML = I18N[lang].stats({
    plotted: fmtInt(NEO.plotted), phas: fmtInt(NEO.phas),
    known: fmtInt(NEO.known), cad: fmtInt(CAD.count)
  });
  const sw = document.querySelectorAll("#swarm-chips .chip");
  sw[0].textContent = t("swarmAll"); sw[1].textContent = t("swarmPha"); sw[2].textContent = t("swarmOff");
  const st = document.querySelectorAll("#star-chips .chip:not(#cons-toggle)");
  st[0].textContent = t("starsBright"); st[1].textContent = t("starsAll"); st[2].textContent = t("starsOff");
  $("cons-toggle").textContent = `✦ ${t("consToggle")}`;
  const tc = document.querySelectorAll("#time-chips .chip");
  tc[0].textContent = t("viewNow"); tc[1].textContent = t("viewDiscovery");
  $("view-label").textContent = t("viewLabel");
  const cc = document.querySelectorAll("#color-chips .chip");
  cc[0].textContent = t("colorDanger"); cc[1].textContent = t("colorClass");
  $("color-label").textContent = t("colorLabel");
  $("legend").innerHTML = CLASS_ORDER.map((k, j) =>
    `<span><i style="background:${CLASS_HEX[j]}"></i>${CLASS_NAMES[k]}</span>`).join("");
  $("btn-tour").textContent = t("tourBtn");
  $("tour-skip").textContent = t("tourSkip");
  $("tour-exit").textContent = t("tourExit");
  if (tourIdx >= 0) $("tour-text").textContent = I18N[lang].tourCaps[tourIdx];
  $("search").placeholder = t("search");
  $("star-label").textContent = t("starLabel");
  $("focus-label").textContent = t("focusLabel");
  $("ca-toggle").textContent = `☄ ${t("caToggle")} (${fmtInt(CAD.count)})`;
  $("ca-title").textContent = t("caTitle");
  $("ca-note").textContent = t("caNote");
  $("hint").textContent = t("hint");
  $("sources").innerHTML =
    `${t("sources")}<br><a href="https://kncn23.github.io" target="_blank" rel="noopener">kncn23.github.io</a>` +
    ` · <a href="https://github.com/KNCn23/neo-swarm" target="_blank" rel="noopener">GitHub</a>`;
  $("btn-today").textContent = t("today");
  $("card-watch").textContent = t("watch");
  $("lang-en").classList.toggle("active", lang === "en");
  $("lang-tr").classList.toggle("active", lang === "tr");
  if (selected >= 0) select(selected);
}

let hudT = 0;
function updateHud(now) {
  $("date-label").textContent = simDate.toLocaleDateString(
    lang === "tr" ? "tr-TR" : "en-US", { year: "numeric", month: "short", day: "numeric" });
  const dps = SPEEDS[speedIdx] * direction;
  $("speed-label").textContent = !playing ? t("paused")
    : Math.abs(dps) >= 365 ? `${dps > 0 ? "+" : "−"}${fmt(Math.abs(dps) / 365, 0)}${t("years")}${t("perSecond")}`
    : `${dps > 0 ? "+" : "−"}${Math.abs(dps)}${t("days")}${t("perSecond")}`;

  if (now - hudT < 250) return;   // ticker + discovery counter, 4x/s is plenty
  hudT = now;
  if (closestIdx >= 0) {
    $("ticker").innerHTML = I18N[lang].ticker(
      NEO.name[closestIdx] || NEO.des[closestIdx],
      fmt(Math.sqrt(closestD) / LD_AU, 1));
    $("ticker").dataset.idx = closestIdx;
  }
  if (viewMode === "discovery") {
    $("stats").innerHTML = I18N[lang].discoveryStats(
      fmtInt(discoveredCount), fmtInt(NEO.plotted), simDate.getFullYear());
  }
}

function setFocus(earth) {
  focusEarth = earth;
  $("focus-sun").classList.toggle("active", !earth);
  $("focus-earth").classList.toggle("active", earth);
  if (earth) cam.dist = Math.min(cam.dist, 1.2);
  writeHash();
}

function chipGroup(rootId, set) {
  document.querySelectorAll(`#${rootId} .chip[data-mode]`).forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(`#${rootId} .chip[data-mode]`).forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      set(b.dataset.mode);
    });
  });
}

/* ================= search ================= */

let searchIndex = null;

function buildSearch() {
  searchIndex = [];
  for (let i = 0; i < NEO.des.length; i++) {
    searchIndex.push([((NEO.name[i] || "") + " " + NEO.des[i]).toLowerCase(), i]);
  }
  const box = $("search"), out = $("search-results");
  box.addEventListener("input", () => {
    const q = box.value.trim().toLowerCase();
    if (q.length < 2) { out.classList.remove("open"); return; }
    const hits = [];
    for (const [key, i] of searchIndex) {
      if (key.includes(q)) { hits.push(i); if (hits.length >= 8) break; }
    }
    out.innerHTML = hits.map((i) =>
      `<button class="sr-row" data-i="${i}"><b>${NEO.name[i] || NEO.des[i]}</b>` +
      `${NEO.pha[i] ? "<i>PHA</i>" : ""}<span>${NEO.cls[i]}</span></button>`).join("")
      || `<div class="sr-row"><span>${t("noResults")}</span></div>`;
    out.classList.toggle("open", true);
  });
  out.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-i]");
    if (!b) return;
    select(+b.dataset.i);
    out.classList.remove("open");
    box.value = "";
    box.blur();
  });
  box.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") { out.classList.remove("open"); box.blur(); }
    if (ev.key === "Enter") {
      const first = out.querySelector("[data-i]");
      if (first) first.click();
    }
  });
  document.addEventListener("pointerdown", (ev) => {
    if (!ev.target.closest("#search-row")) out.classList.remove("open");
  });
}

/* ================= shareable state ================= */

function writeHash() {
  const parts = [`d=${simDate.toISOString().slice(0, 10)}`];
  if (selected >= 0) parts.push(`sel=${encodeURIComponent(NEO.des[selected])}`);
  if (focusEarth) parts.push("f=e");
  if (viewMode === "discovery") parts.push("v=d");
  history.replaceState(null, "", "#" + parts.join("&"));
}

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get("d")) {
    const d = new Date(h.get("d") + "T12:00:00");
    if (!isNaN(d)) simDate = d;
  }
  if (h.get("f") === "e") setFocus(true);
  if (h.get("v") === "d") setViewMode("discovery", false);
  if (h.get("sel")) {
    const i = NEO.des.indexOf(decodeURIComponent(h.get("sel")));
    if (i >= 0) select(i);
  }
}

/* ================= guided tour ================= */

function syncChips(rootId, mode) {
  document.querySelectorAll(`#${rootId} .chip[data-mode]`).forEach((x) =>
    x.classList.toggle("active", x.dataset.mode === mode));
}

function setSwarm(m) { swarmMode = m; syncChips("swarm-chips", m); }
function setStars(m) { starMode = m; syncChips("star-chips", m); }
function setColor(m) {
  colorMode = m;
  syncChips("color-chips", m);
  $("legend").classList.toggle("open", m === "class");
}

function gotoApophis() {
  const i = NEO.des.indexOf("99942");
  if (i < 0) return;
  select(i);
  simDate = new Date("2029-04-01T12:00:00");
  speedIdx = 0; direction = 1; playing = true;
  $("speed").value = 0;
  setFocus(true);
  cam.dist = 0.35;
  writeHash();
}

const TOUR = [
  () => { setViewMode("now", true); setSwarm("all"); setColor("danger"); setStars("bright");
          select(-1); setFocus(false); cam = { yaw: -0.5, pitch: 0.62, dist: 4.2 };
          speedIdx = 2; $("speed").value = 2; playing = true; },
  () => { setSwarm("pha"); },
  () => { setSwarm("all"); gotoApophis(); },
  () => { setViewMode("now", true); const i = NEO.des.indexOf("101955");
          if (i >= 0) select(i); setFocus(false); cam = { yaw: 0.4, pitch: 0.5, dist: 2.4 }; },
  () => { select(-1); setFocus(false); cam = { yaw: -0.5, pitch: 0.62, dist: 4.2 }; setViewMode("discovery", true); },
  () => { setViewMode("now", true); setStars("all"); consOn = true; $("cons-toggle").classList.add("active");
          select(-1); cam = { yaw: 0.2, pitch: 0.12, dist: 5.2 }; }
];

function tourApply() {
  TOUR[tourIdx]();
  $("tour-text").textContent = I18N[lang].tourCaps[tourIdx];
  $("tour-dots").innerHTML = TOUR.map((_, k) =>
    `<i class="${k === tourIdx ? "on" : ""}"></i>`).join("");
  clearTimeout(tourTimer);
  tourTimer = setTimeout(tourNext, 13000);
}

function tourNext() {
  tourIdx++;
  if (tourIdx >= TOUR.length) { tourEnd(); return; }
  tourApply();
}

function tourEnd() {
  clearTimeout(tourTimer);
  tourIdx = -1;
  $("tour").classList.remove("open");
  setViewMode("now", true); setSwarm("all"); setColor("danger"); setStars("bright");
  select(-1); setFocus(false);
  cam = { yaw: -0.5, pitch: 0.62, dist: 4.2 };
}

function tourStart() {
  tourIdx = 0;
  $("tour").classList.add("open");
  tourApply();
}

function setViewMode(m, jump = true) {
  viewMode = m;
  document.querySelectorAll("#time-chips .chip[data-mode]").forEach((x) =>
    x.classList.toggle("active", x.dataset.mode === m));
  if (m === "discovery" && jump) {
    simDate = new Date("1980-01-01T12:00:00");
    speedIdx = 4; direction = 1; playing = true;   // 1 year/s
    $("speed").value = 4;
    setFocus(false);
    cam.dist = Math.max(cam.dist, 3.5);
  }
  if (m === "now") {
    if (jump) { simDate = new Date(); speedIdx = 2; $("speed").value = 2; }
    applyLang();   // restore the normal stats line
  }
  writeHash();
}

/* ================= interaction ================= */

let dragging = false, moved = false, lx = 0, ly = 0, pinch = 0;

topCv.addEventListener("pointerdown", (e) => { dragging = true; moved = false; lx = e.clientX; ly = e.clientY; });
window.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lx, dy = e.clientY - ly;
  if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
  cam.yaw -= dx * 0.005;
  cam.pitch = Math.min(1.5, Math.max(-1.5, cam.pitch + dy * 0.005));
  lx = e.clientX; ly = e.clientY;
});
window.addEventListener("pointerup", (e) => {
  if (!dragging) return;
  dragging = false;
  if (moved || !ast) return;
  let best = -1, bd = 14;
  for (let i = 0; i < ast.n; i++) {
    if (!ast.vis[i]) continue;
    const d = Math.hypot(e.clientX - ast.sx[i], e.clientY - ast.sy[i]);
    const dd = ast.pha[i] ? d - 2 : d;   // slight preference for PHAs
    if (dd < bd) { best = i; bd = dd; }
  }
  select(best);
});
topCv.addEventListener("wheel", (e) => {
  e.preventDefault();
  cam.dist = Math.min(60, Math.max(0.05, cam.dist * (e.deltaY > 0 ? 1.1 : 1 / 1.1)));
}, { passive: false });
topCv.addEventListener("touchmove", (e) => {
  if (e.touches.length !== 2) return;
  e.preventDefault();
  const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                       e.touches[0].clientY - e.touches[1].clientY);
  if (pinch) cam.dist = Math.min(60, Math.max(0.05, cam.dist * pinch / d));
  pinch = d;
}, { passive: false });
topCv.addEventListener("touchend", () => { pinch = 0; });

$("btn-play").addEventListener("click", () => {
  playing = !playing;
  $("btn-play").textContent = playing ? "⏸" : "▶";
});
$("btn-dir").addEventListener("click", () => {
  direction *= -1;
  $("btn-dir").textContent = direction > 0 ? "⏩" : "⏪";
});
$("speed").addEventListener("input", (e) => { speedIdx = +e.target.value; });
$("btn-today").addEventListener("click", () => { simDate = new Date(); syncDate(); });
$("date-input").addEventListener("change", (e) => {
  const d = new Date(e.target.value + "T12:00:00");
  if (!isNaN(d)) simDate = d;
});
$("card-close").addEventListener("click", () => select(-1));
$("card-watch").addEventListener("click", () => watchApproach(true));
$("ca-toggle").addEventListener("click", () => $("ca-panel").classList.toggle("open"));
$("focus-sun").addEventListener("click", () => setFocus(false));
$("focus-earth").addEventListener("click", () => setFocus(true));
$("lang-en").addEventListener("click", () => { lang = "en"; localStorage.setItem("neo-lang", "en"); applyLang(); });
$("lang-tr").addEventListener("click", () => { lang = "tr"; localStorage.setItem("neo-lang", "tr"); applyLang(); });
chipGroup("swarm-chips", (m) => { swarmMode = m; });
chipGroup("star-chips", (m) => { starMode = m; });
chipGroup("time-chips", (m) => setViewMode(m));
$("cons-toggle").addEventListener("click", () => {
  consOn = !consOn;
  $("cons-toggle").classList.toggle("active", consOn);
});
$("ticker").addEventListener("click", () => {
  const i = +$("ticker").dataset.idx;
  if (i >= 0) select(i);
});
$("btn-apophis").addEventListener("click", gotoApophis);
chipGroup("color-chips", (m) => setColor(m));
$("btn-tour").addEventListener("click", () => (tourIdx < 0 ? tourStart() : tourEnd()));
$("tour-skip").addEventListener("click", tourNext);
$("tour-exit").addEventListener("click", tourEnd);
$("btn-shot").addEventListener("click", () => {
  const c = document.createElement("canvas");
  c.width = W * dpr; c.height = H * dpr;
  const x = c.getContext("2d");
  x.fillStyle = "#0a0e14";
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(starsCv, 0, 0);
  x.drawImage(trailCv, 0, 0);
  x.drawImage(topCv, 0, 0);
  const a = document.createElement("a");
  a.download = `neo-swarm-${simDate.toISOString().slice(0, 10)}.png`;
  a.href = c.toDataURL("image/png");
  a.click();
});

window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  switch (e.key) {
    case " ": e.preventDefault(); $("btn-play").click(); break;
    case "ArrowRight": speedIdx = Math.min(SPEEDS.length - 1, speedIdx + 1); $("speed").value = speedIdx; break;
    case "ArrowLeft": speedIdx = Math.max(0, speedIdx - 1); $("speed").value = speedIdx; break;
    case "r": $("btn-dir").click(); break;
    case "t": $("btn-today").click(); break;
    case "e": setFocus(!focusEarth); break;
    case "Escape": select(-1); break;
  }
});

function syncDate() {
  $("date-input").value = simDate.toISOString().slice(0, 10);
}

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  for (const [cv, cx] of [[starsCv, starsCx], [trailCv, trailCx], [topCv, topCx]]) {
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

/* ================= boot / loop ================= */

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (playing) {
    simDate = new Date(simDate.getTime() + SPEEDS[speedIdx] * direction * dt * 86400000);
    if (document.activeElement !== $("date-input")) syncDate();
  }
  // cinematic idle drift: after 20 s without input, the camera slowly orbits
  if (!REDUCED_MOTION && tourIdx < 0 && playing && now - lastInteract > 20000) {
    cam.yaw += 0.0004;
  }
  const jd = julianDay(simDate);
  camUpdate(jd);
  drawStars();
  drawSwarm(jd);
  drawTop(jd);
  updateHud(now);
  requestAnimationFrame(loop);
}

for (const ev of ["pointerdown", "wheel", "keydown", "touchstart"]) {
  window.addEventListener(ev, () => { lastInteract = performance.now(); }, { passive: true });
}
$("menu-toggle").addEventListener("click", () =>
  document.querySelector("header").classList.toggle("menu-open"));

$("loading").querySelector("span").textContent =
  (navigator.language || "").startsWith("tr") ? I18N.tr.loading : I18N.en.loading;

Promise.all([
  fetch("assets/data/neos.json").then((r) => r.json()),
  fetch("assets/data/cad.json").then((r) => r.json()),
  fetch("assets/data/stars.json").then((r) => r.json()),
  fetch("assets/data/extras.json").then((r) => r.json())
]).then(([neo, cad, stars, extras]) => {
  NEO = neo; CAD = cad; STARS = stars; EXTRAS = extras;
  prepAsteroids();
  prepStars();
  prepCons();
  buildCaList();
  buildSearch();
  resize();
  applyLang();
  readHash();
  syncDate();
  $("loading").classList.add("done");
  requestAnimationFrame(loop);
}).catch((err) => {
  console.error("[neo-swarm] data load failed:", err);
  $("loading").querySelector("span").textContent = lang === "tr"
    ? "Veri yüklenemedi — sayfayı yenilemeyi dene."
    : "Data failed to load — try refreshing the page.";
});

window.addEventListener("resize", resize);
