import * as THREE from 'three';

// Seeded RNG + value noise, used everywhere for deterministic procedural content.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hash2(x, y, seed) { let h = (x * 374761393 + y * 668265263 + seed * 144665) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export function vnoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 4, seed = 0) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, seed + i * 7); f *= 2; a *= 0.5; }
  return s;
}

const cache = new Map();
function hex(c) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

function noiseCanvas(size, c1, c2, scale, oct, seed, extra) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const ctx = cv.getContext('2d'); const img = ctx.createImageData(size, size);
  const A = hex(c1), B = hex(c2);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    // tileable noise: blend 4 samples across edges
    const fx = x / size, fy = y / size;
    const n = tile(fx, fy, scale, oct, seed);
    let col = mix(A, B, n);
    if (extra) col = extra(col, x, y, fx, fy, n);
    const i = (y * size + x) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { cv, ctx };
}
function tile(fx, fy, scale, oct, seed) {
  const x = fx * scale, y = fy * scale;
  const n00 = fbm(x, y, oct, seed), n10 = fbm(x - scale, y, oct, seed), n01 = fbm(x, y - scale, oct, seed), n11 = fbm(x - scale, y - scale, oct, seed);
  return n00 * (1 - fx) * (1 - fy) + n10 * fx * (1 - fy) + n01 * (1 - fx) * fy + n11 * fx * fy;
}

function toTex(cv, repeat, srgb = true) {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const MAKERS = {
  grass: () => noiseCanvas(512, 0x2f5a1c, 0x7da03c, 6, 5, 11, (c, x, y, fx, fy, n) => { const k = vnoise(x * 0.9, y * 0.9, 3) * 0.35; return [c[0] * (0.85 + k), c[1] * (0.85 + k), c[2] * (0.85 + k)]; }),
  soil: () => noiseCanvas(512, 0x4a3320, 0x8a6a45, 5, 5, 21, (c, x, y) => { const k = vnoise(x * 0.7, y * 0.7, 4) * 0.4; return [c[0] * (0.8 + k), c[1] * (0.8 + k), c[2] * (0.8 + k)]; }),
  yard: () => noiseCanvas(512, 0x7a6244, 0xa68c66, 8, 5, 31),
  dirt: () => noiseCanvas(256, 0x6d5a40, 0x9b8460, 9, 4, 41),
  stone: () => {
    const { cv, ctx } = noiseCanvas(512, 0x6a665e, 0x9a958a, 10, 4, 51);
    ctx.strokeStyle = 'rgba(30,28,24,0.75)'; ctx.lineWidth = 3;
    const r = rng(5); const rows = 6;
    for (let j = 0; j < rows; j++) { const y = j * 512 / rows; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
      let x = r() * 60; while (x < 512) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 512 / rows); ctx.stroke(); x += 50 + r() * 70; } }
    return { cv };
  },
  mud: () => noiseCanvas(512, 0x8c6a48, 0xb8936a, 6, 5, 61, (c, x, y) => { const k = vnoise(x * 0.5, y * 0.5, 9) * 0.25; return [c[0] * (0.9 + k), c[1] * (0.9 + k), c[2] * (0.9 + k)]; }),
  plaster: () => noiseCanvas(512, 0xd9cdb4, 0xece3cf, 7, 4, 71),
  wood: () => {
    const { cv, ctx } = noiseCanvas(256, 0x4b2f1a, 0x7a5030, 2, 3, 81, (c, x, y) => { const g = Math.sin(y * 0.35 + fbm(x * 0.02, y * 0.05, 3, 2) * 14) * 0.5 + 0.5; return [c[0] * (0.7 + g * 0.45), c[1] * (0.7 + g * 0.45), c[2] * (0.7 + g * 0.45)]; });
    return { cv, ctx };
  },
  bark: () => noiseCanvas(256, 0x2f2218, 0x5b4630, 3, 4, 91, (c, x, y) => { const g = Math.sin(x * 0.5 + fbm(x * 0.03, y * 0.02, 3, 4) * 9) * 0.5 + 0.5; return [c[0] * (0.6 + g * 0.6), c[1] * (0.6 + g * 0.6), c[2] * (0.6 + g * 0.6)]; }),
  leaf: () => noiseCanvas(256, 0x1f4a16, 0x5d8f2c, 8, 4, 101),
  thatch: () => noiseCanvas(256, 0x8a6b2c, 0xcaa550, 5, 3, 111, (c, x, y) => { const g = Math.sin(x * 0.9 + vnoise(x * 0.1, y * 0.1, 8) * 5) * 0.5 + 0.5; return [c[0] * (0.75 + g * 0.35), c[1] * (0.75 + g * 0.35), c[2] * (0.75 + g * 0.35)]; }),
  slate: () => {
    const { cv, ctx } = noiseCanvas(512, 0x4e4a46, 0x77726b, 12, 3, 121);
    ctx.strokeStyle = 'rgba(15,15,15,0.6)'; ctx.lineWidth = 2;
    for (let j = 0; j < 12; j++) { const y = j * 512 / 12; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); for (let i = 0; i < 9; i++) { const x = (i + (j % 2) * 0.5) * 512 / 8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 512 / 12); ctx.stroke(); } }
    return { cv };
  },
  tin: () => noiseCanvas(256, 0x7a6a5c, 0xa39587, 4, 3, 131, (c, x) => { const g = Math.sin(x * 0.5) * 0.5 + 0.5; return [c[0] * (0.78 + g * 0.3), c[1] * (0.78 + g * 0.3), c[2] * (0.78 + g * 0.3)]; }),
  tile: () => {
    const { cv, ctx } = noiseCanvas(512, 0xd8d4cb, 0xefece4, 4, 3, 141);
    ctx.strokeStyle = 'rgba(80,80,80,0.55)'; ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 128, 0); ctx.lineTo(i * 128, 512); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * 128); ctx.lineTo(512, i * 128); ctx.stroke(); }
    return { cv };
  },
  floor: () => noiseCanvas(512, 0x6a5238, 0x8f7452, 5, 5, 151, (c, x, y) => { const k = vnoise(x * 0.4, y * 0.4, 9) * 0.25; return [c[0] * (0.85 + k), c[1] * (0.85 + k), c[2] * (0.85 + k)]; }),
  woven: () => {
    const { cv, ctx } = noiseCanvas(256, 0xb28a4a, 0xd9b56e, 6, 3, 161);
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#6b4b1f'; ctx.lineWidth = 3;
    for (let i = 0; i < 256; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke(); }
    return { cv };
  },
  gundro: () => {
    const { cv, ctx } = noiseCanvas(256, 0xc6a05c, 0xe6c47e, 8, 3, 171);
    ctx.globalAlpha = 0.55; for (let i = 0; i < 256; i += 8) { ctx.strokeStyle = i % 16 ? '#8c6a2e' : '#d9b66e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke(); }
    ctx.globalAlpha = 0.35; ctx.strokeStyle = '#5c4220'; ctx.lineWidth = 2; for (let i = 0; i < 256; i += 32) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke(); }
    return { cv };
  },
  carpet: () => {
    const { cv, ctx } = noiseCanvas(256, 0x8a1c1c, 0xb02d27, 14, 3, 181);
    ctx.globalAlpha = 0.9; ctx.strokeStyle = '#e8c35a'; ctx.lineWidth = 6; ctx.strokeRect(14, 14, 228, 228);
    ctx.strokeStyle = '#1f3a6b'; ctx.lineWidth = 4; ctx.strokeRect(30, 30, 196, 196);
    ctx.fillStyle = '#e8c35a'; ctx.beginPath(); ctx.moveTo(128, 60); ctx.lineTo(196, 128); ctx.lineTo(128, 196); ctx.lineTo(60, 128); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1f3a6b'; ctx.beginPath(); ctx.moveTo(128, 90); ctx.lineTo(166, 128); ctx.lineTo(128, 166); ctx.lineTo(90, 128); ctx.closePath(); ctx.fill();
    return { cv };
  },
  dhaka: () => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const ctx = cv.getContext('2d');
    ctx.fillStyle = '#e8d9b0'; ctx.fillRect(0, 0, 128, 64);
    const cols = ['#c0392b', '#2c3e50', '#d4a017', '#1e8449', '#7d3c98'];
    for (let i = 0; i < 8; i++) { ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.moveTo(i * 16 + 8, 6); ctx.lineTo(i * 16 + 16, 18); ctx.lineTo(i * 16 + 8, 30); ctx.lineTo(i * 16, 18); ctx.closePath(); ctx.fill(); ctx.fillRect(i * 16 + 4, 36, 8, 8); ctx.fillStyle = '#2c3e50'; ctx.fillRect(i * 16, 52, 16, 6); }
    return { cv };
  },
  sari: () => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 128, 128);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#b3201f'; ctx.fillRect(0, 0, 128, 128);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(240,200,80,0.8)'; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { ctx.beginPath(); ctx.arc(10 + i * 22 + (j % 2) * 11, 10 + j * 22, 2.4, 0, 6.3); ctx.fill(); }
    return { cv };
  },
  fabric: () => noiseCanvas(128, 0xffffff, 0xdddddd, 20, 2, 191),
  note500: () => noteCanvas('#d8a7b1', '#7a3d54', '500'),
  note100: () => noteCanvas('#b8d4a8', '#3f6b3a', '100'),
  wall_office: () => noiseCanvas(512, 0xe8e6df, 0xf6f4ee, 6, 3, 201),
  sky_poster: () => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 360; const ctx = cv.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, '#3a9d4f'); g.addColorStop(1, '#f28a1d'); ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 360);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MICROFINANCE', 128, 120); ctx.font = '22px sans-serif'; ctx.fillText('Small loans • Big dreams', 128, 160);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(128, 250, 48, 0, 6.3); ctx.fill(); ctx.fillStyle = '#3a9d4f'; ctx.font = 'bold 50px sans-serif'; ctx.fillText('Rs', 128, 268);
    return { cv };
  },
};
function noteCanvas(bg, fg, val) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const ctx = cv.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 128); ctx.strokeStyle = fg; ctx.lineWidth = 4; ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = fg; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(val, 128, 78); ctx.font = '14px sans-serif'; ctx.fillText('NEPAL RASTRA BANK', 128, 30);
  ctx.beginPath(); ctx.arc(40, 64, 20, 0, 6.3); ctx.globalAlpha = 0.35; ctx.fill();
  return { cv };
}

// Public: get a (cached) texture. repeat is part of cache key.
export function tex(name, rx = 1, ry = rx) {
  const key = `${name}|${rx}|${ry}`;
  if (cache.has(key)) return cache.get(key);
  const m = MAKERS[name]; if (!m) throw new Error('unknown texture ' + name);
  const { cv } = m();
  const t = toTex(cv, [rx, ry]);
  cache.set(key, t); return t;
}
// Material helper (PBR, with the colour texture doubling as a bump map for depth)
const matCache = new Map();
export function mat(name, { rx = 1, ry = rx, rough = 0.85, metal = 0, tint = 0xffffff, bump = 0.6, color } = {}) {
  const key = `${name}|${rx}|${ry}|${rough}|${metal}|${tint}|${bump}|${color}`;
  if (matCache.has(key)) return matCache.get(key);
  const t = tex(name, rx, ry);
  const m = new THREE.MeshStandardMaterial({ map: t, color: color ?? tint, roughness: rough, metalness: metal, bumpMap: bump ? t : null, bumpScale: bump });
  matCache.set(key, m); return m;
}
const flatCache = new Map();
export function flat(color, rough = 0.7, metal = 0, extra = {}) {
  const key = `${color}|${rough}|${metal}|${JSON.stringify(extra)}`;
  if (flatCache.has(key)) return flatCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
  flatCache.set(key, m); return m;
}
