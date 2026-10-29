import * as THREE from 'three';
import { box, cyl, sph, cone, grp, torus, lathe, plane, TAU } from './util.js';
import { mat, flat, rng } from './textures.js';
import { buildProp } from './props.js';

const T = 0.2;
// Wall along local X (length L), optional rectangular opening {c, y, w, h}
function wall(L, H, material, op) {
  const g = new THREE.Group();
  if (!op) { g.add(box(L, H, T, material, 0, H / 2, 0)); return g; }
  const l = op.c - op.w / 2 + L / 2, r = L / 2 - (op.c + op.w / 2);
  g.add(box(l, H, T, material, -L / 2 + l / 2, H / 2, 0)); g.add(box(r, H, T, material, L / 2 - r / 2, H / 2, 0));
  if (op.y > 0.01) g.add(box(op.w, op.y, T, material, op.c, op.y / 2, 0)); g.add(box(op.w, H - op.y - op.h, T, material, op.c, op.y + op.h + (H - op.y - op.h) / 2, 0));
  return g;
}
function frame(x, y, z, w, h, ry, tint = 0x7a5030) {
  const g = new THREE.Group(); const m = mat('wood', { tint, rx: 1, ry: 1, bump: 0.2 });
  g.add(box(w + 0.16, 0.08, 0.3, m, 0, h / 2 + 0.04, 0)); g.add(box(w + 0.16, 0.08, 0.3, m, 0, -h / 2 - 0.04, 0)); g.add(box(0.08, h, 0.3, m, -w / 2 - 0.04, 0, 0)); g.add(box(0.08, h, 0.3, m, w / 2 + 0.04, 0, 0));
  g.position.set(x, y, z); g.rotation.y = ry; return g;
}
function room(def, { floorMat, lowerMat, upperMat, ceilMat, openings = {} }) {
  const { w, d, h } = def; const g = new THREE.Group();
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.1, d + 0.1), floorMat); fl.rotation.x = -Math.PI / 2; fl.position.y = 0.025; fl.receiveShadow = true; fl.userData.ground = true; g.add(fl);
  const lowerH = 1.0;
  const setup = { back: [0, -d / 2 - T / 2, 0], front: [0, d / 2 + T / 2, Math.PI], left: [-w / 2 - T / 2, 0, Math.PI / 2], right: [w / 2 + T / 2, 0, -Math.PI / 2] };
  for (const side of ['back', 'front', 'left', 'right']) {
    const L = side === 'back' || side === 'front' ? w : d; const op = openings[side];
    const wg = new THREE.Group();
    wg.add(wall(L, h, upperMat, op));
    if (!op || op.y >= lowerH) wg.add(box(L, lowerH, 0.03, lowerMat, 0, lowerH / 2, T / 2 + 0.012));
    const [px, pz, ry] = setup[side];
    if (side === 'back' || side === 'front') wg.position.set(0, 0, pz); else wg.position.set(px, 0, 0);
    wg.rotation.y = ry;
    wg.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.add(wg);
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.4, d + 0.4), ceilMat); ceil.rotation.x = Math.PI / 2; ceil.position.y = h; ceil.receiveShadow = true; ceil.castShadow = false; g.add(ceil);
  return g;
}
function addAt(parent, o, x, y, z, ry = 0, s = 1) { o.position.set(x, y, z); o.rotation.y = ry; if (s !== 1) o.scale.setScalar(s); parent.add(o); return o; }

function officeChair() {
  const g = new THREE.Group(); const dark = flat(0x2b2f36, 0.6), grey = flat(0x555a63, 0.4, 0.6);
  g.add(cyl(0.03, 0.03, 0.3, grey, 0, 0.25, 0, 8)); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const arm = box(0.3, 0.025, 0.04, grey, Math.cos(a) * 0.15, 0.08, Math.sin(a) * 0.15); arm.rotation.y = -a; g.add(arm); g.add(sph(0.025, dark, Math.cos(a) * 0.29, 0.04, Math.sin(a) * 0.29)); }
  g.add(box(0.46, 0.08, 0.46, dark, 0, 0.45, 0)); g.add(box(0.44, 0.5, 0.07, dark, 0, 0.75, -0.21));
  [-1, 1].forEach(s => { g.add(box(0.04, 0.03, 0.3, grey, s * 0.25, 0.62, 0)); g.add(box(0.03, 0.17, 0.03, grey, s * 0.25, 0.54, 0)); });
  return g;
}
function officeDesk(len = 1.6) {
  const g = new THREE.Group(); const w = mat('wood', { rx: 1, ry: 1, tint: 0xd9b48a, bump: 0.2 });
  g.add(box(len, 0.05, 0.8, w, 0, 0.75, 0)); g.add(box(0.05, 0.72, 0.75, w, -len / 2 + 0.04, 0.36, 0));
  g.add(box(0.5, 0.7, 0.72, w, len / 2 - 0.3, 0.37, 0)); for (let i = 0; i < 3; i++) { g.add(box(0.44, 0.2, 0.02, mat('wood', { tint: 0xe6c9a0 }), len / 2 - 0.3, 0.15 + i * 0.23, 0.37)); g.add(box(0.1, 0.02, 0.02, flat(0x333333, 0.3, 0.8), len / 2 - 0.3, 0.2 + i * 0.23, 0.39)); }
  g.add(box(len - 0.5, 0.5, 0.03, w, -0.2, 0.5, -0.36));
  return g;
}
function monitor() { const g = new THREE.Group(); g.add(box(0.5, 0.31, 0.03, flat(0x101215, 0.3), 0, 0.3, 0)); g.add(box(0.47, 0.28, 0.005, flat(0x2a5a8c, 0.2, 0, { emissive: 0x2a5a8c, emissiveIntensity: 0.5 }), 0, 0.3, 0.018)); g.add(box(0.05, 0.14, 0.04, flat(0x222222, 0.4), 0, 0.12, -0.01)); g.add(box(0.2, 0.01, 0.14, flat(0x222222, 0.4), 0, 0.005, 0)); return g; }
function keyboard() { return grp(box(0.42, 0.015, 0.14, flat(0xdadada, 0.5), 0, 0.01, 0)); }
function plant() { const g = new THREE.Group(); g.add(cyl(0.18, 0.14, 0.34, flat(0xa8532f, 0.8), 0, 0.17, 0, 14)); const lf = flat(0x2f7a3a, 0.7); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; const l = sph(0.12, lf, Math.cos(a) * 0.14, 0.55 + (i % 3) * 0.16, Math.sin(a) * 0.14, 0.5, 1.8, 0.5, 6); l.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(l); } return g; }
function shelves(wd, h, rows, binders) {
  const g = new THREE.Group(); const w = mat('wood', { tint: 0xc9a276, rx: 1, ry: 1, bump: 0.2 }); const r = rng(33);
  g.add(box(wd, h, 0.04, w, 0, h / 2, -0.18)); [-1, 1].forEach(s => g.add(box(0.04, h, 0.4, w, s * wd / 2, h / 2, 0)));
  for (let i = 0; i <= rows; i++) g.add(box(wd, 0.04, 0.4, w, 0, i * (h - 0.04) / rows + 0.02, 0));
  const cols = [0x2e9b4f, 0xf08a24, 0x1f4aa3, 0xb3201f, 0xe8e0c8, 0x555a63];
  if (binders) for (let i = 0; i < rows; i++) { let x = -wd / 2 + 0.08; while (x < wd / 2 - 0.1) { const bw = 0.04 + r() * 0.04, bh = 0.26 + r() * 0.08; g.add(box(bw, bh, 0.26, flat(cols[Math.floor(r() * cols.length)], 0.7), x + bw / 2, i * (h - 0.04) / rows + 0.04 + bh / 2, 0)); x += bw + 0.005; } }
  return g;
}
function bannerCanvas(text, sub) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 192; const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1024, 0); g.addColorStop(0, '#2e9b4f'); g.addColorStop(1, '#1f7a3a'); x.fillStyle = g; x.fillRect(0, 0, 1024, 192);
  x.fillStyle = '#f08a24'; x.fillRect(0, 160, 1024, 32); x.fillStyle = '#fff'; x.font = 'bold 84px sans-serif'; x.textAlign = 'center'; x.fillText(text, 512, 100); x.font = '34px sans-serif'; x.fillText(sub, 512, 146);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 });
}
function calendar() { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 180; const x = cv.getContext('2d'); x.fillStyle = '#f6efe0'; x.fillRect(0, 0, 128, 180); x.fillStyle = '#b3201f'; x.fillRect(0, 0, 128, 40); x.fillStyle = '#fff'; x.font = 'bold 22px sans-serif'; x.fillText('Baisakh', 22, 28); x.fillStyle = '#333'; x.font = '12px sans-serif'; for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) x.fillText(String(r * 7 + c + 1), 8 + c * 17, 66 + r * 22); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.56), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })); }

/* ================= HOME INTERIOR ================= */
function buildHomeInterior(def) {
  const g = new THREE.Group(); const lights = [];
  const r = room(def, {
    floorMat: mat('mud', { rx: 3, ry: 3, tint: 0xc07a54, bump: 0.8 }), lowerMat: mat('mud', { rx: 3, ry: 0.5, tint: 0xb4502e, bump: 0.8 }), upperMat: mat('mud', { rx: 3, ry: 1, tint: 0xe9ddc6, bump: 0.9 }),
    ceilMat: mat('wood', { rx: 4, ry: 3, tint: 0x8a6a48, bump: 0.3 }),
    openings: { back: { c: -1.6, y: 1.2, w: 1.1, h: 0.95 }, left: { c: -1.0, y: 0, w: 1.15, h: 2.0 } },
  });
  g.add(r);
  const { w, d, h } = def;
  g.add(frame(-1.6, 1.675, -d / 2 - 0.1, 1.1, 0.95, 0)); g.add(frame(-w / 2 - 0.1, 1.0, 1.0, 1.15, 2.0, Math.PI / 2));
  for (let i = -3; i <= 3; i++) g.add(box(0.14, 0.18, d + 0.2, mat('wood', { rx: 1, ry: 1, tint: 0x6a4a30 }), i * 1.0, h - 0.09, 0));
  for (let i = 0; i < 2; i++) g.add(box(w + 0.2, 0.2, 0.2, mat('wood', { tint: 0x5a3c26 }), 0, h - 0.1, -1.5 + i * 3));
  // khat + bedding
  addAt(g, buildProp('bed'), -2.5, 0, -1.9, Math.PI / 2 * 0 + 0.0);
  // clay stove (chulo) in back-right corner
  const st = new THREE.Group(); const clay = mat('mud', { rx: 1, ry: 1, tint: 0xb4502e, bump: 1 });
  st.add(box(1.1, 0.5, 0.8, clay, 0, 0.25, 0)); st.add(sph(0.2, flat(0x15110e, 1), -0.25, 0.5, 0, 1, 0.2, 1, 12)); st.add(sph(0.2, flat(0x15110e, 1), 0.25, 0.5, 0, 1, 0.2, 1, 12));
  st.add(box(0.3, 0.25, 0.04, flat(0x15110e, 1), 0, 0.2, 0.41));
  const pot = buildProp('pot'); pot.position.set(-0.25, 0.5, 0); pot.scale.setScalar(0.8); st.add(pot); const pot2 = buildProp('gagri'); pot2.position.set(0.25, 0.5, 0); pot2.scale.setScalar(0.9); st.add(pot2);
  addAt(g, st, 2.3, 0, -2.5); addAt(g, buildProp('firewood'), 3.0, 0, -1.7, Math.PI / 2, 0.9);
  // shelf with pots
  const sh = box(2.0, 0.05, 0.35, mat('wood', { tint: 0x8a6a44 }), 0, 1.6, 0); const shelf = new THREE.Group(); shelf.add(sh); [-0.7, -0.2, 0.3, 0.75].forEach((x, i) => { const p = buildProp(i % 2 ? 'pot' : 'gagri'); p.position.set(x, 1.625, 0); p.scale.setScalar(0.7); shelf.add(p); }); addAt(g, shelf, 0.4, 0, -d / 2 + 0.2);
  addAt(g, buildProp('gundro'), 0.2, 0.01, 0.6, 0.15); addAt(g, buildProp('doko'), -3.1, 0, 1.8, 0.4); addAt(g, buildProp('nanglo'), -2.4, 0, 2.3, 0.5); addAt(g, buildProp('sack'), 3.0, 0, 0.2, 0.3); addAt(g, buildProp('sack'), 3.1, 0, 0.8, 1.1, 0.9);
  addAt(g, buildProp('stool'), 1.8, 0, 1.4); addAt(g, buildProp('cupboard'), -3.0, 0, 0.0, Math.PI / 2);
  const cal = calendar(); addAt(g, cal, -0.4, 1.5, -d / 2 + 0.02); addAt(g, calendar(), 3.4, 1.4, 0.8, -Math.PI / 2).position.x = w / 2 - 0.02;
  // hanging lantern + light
  const ln = buildProp('lantern'); addAt(g, ln, 0.5, h - 0.85, 0.0); g.add(cyl(0.004, 0.004, 0.55, flat(0x222222, 0.5), 0.5, h - 0.27, 0.0, 4));
  lights.push({ type: 'point', pos: [0.5, h - 0.7, 0], color: 0xffb566, intensity: 14, dist: 10 });
  lights.push({ type: 'point', pos: [-1.6, 1.8, -d / 2 + 0.8], color: 0xbfd6ff, intensity: 6, dist: 7 });
  return { group: g, lights };
}

/* ================= OFFICE ================= */
function buildOffice(def) {
  const g = new THREE.Group(); const lights = []; const { w, d, h } = def;
  g.add(room(def, {
    floorMat: mat('tile', { rx: 4, ry: 3.5, rough: 0.5, bump: 0.15, tint: 0xbdbab2 }), lowerMat: flat(0x2e9b4f, 0.7), upperMat: mat('wall_office', { rx: 2, ry: 1, bump: 0.2, tint: 0xc9c6bd }),
    ceilMat: flat(0xf4f2ec, 0.9), openings: { right: { c: 0.4, y: 1.1, w: 1.8, h: 1.2 } },
  }));
  g.add(frame(w / 2 + 0.1, 1.7, 0.4, 1.8, 1.2, -Math.PI / 2, 0x555a63));
  // banner + poster
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.68), bannerCanvas('MICROFINANCE', 'Small loans • Big dreams')); addAt(g, ban, 0, 2.35, -d / 2 + 0.02);
  const pos = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.0), mat('sky_poster', { bump: 0 })); addAt(g, pos, -2.8, 1.7, -d / 2 + 0.02);
  addAt(g, calendar(), 2.8, 1.5, -d / 2 + 0.02);
  const clock = cyl(0.2, 0.2, 0.04, flat(0xf4f2ec, 0.4), 0, 0, 0, 24); clock.rotation.x = Math.PI / 2; clock.add(box(0.015, 0.14, 0.01, flat(0x111111), 0, 0.05, 0.03)); clock.add(box(0.12, 0.015, 0.01, flat(0x111111), 0.05, 0, 0.03)); addAt(g, clock, 1.6, 2.2, -d / 2 + 0.04);
  // two workstations
  [-2.0, 1.6].forEach((x, i) => {
    const desk = officeDesk(); addAt(g, desk, x, 0, -1.6); const mon = monitor(); addAt(g, mon, x - 0.1, 0.775, -1.78, 0.15); addAt(g, keyboard(), x - 0.1, 0.775, -1.45); addAt(g, buildProp('notebook'), x + 0.45, 0.775, -1.5, 0.3);
    addAt(g, officeChair(), x, 0, -2.35, 0); const c1 = officeChair(); addAt(g, c1, x - 0.3, 0, -0.55, Math.PI); const c2 = officeChair(); addAt(g, c2, x + 0.45, 0, -0.55, Math.PI);
  });
  addAt(g, buildProp('passbook'), -1.4, 0.775, -1.4, 0.4); addAt(g, buildProp('money_notes'), -2.5, 0.775, -1.45, 0.2); addAt(g, buildProp('calculator'), -2.6, 0.775, -1.65, -0.3);
  // cabinets along the right of back wall, shelves on left wall
  const cab = shelves(2.2, 1.9, 5, true); addAt(g, cab, 3.0, 0, -d / 2 + 0.22); const cab2 = shelves(1.6, 1.9, 5, true); addAt(g, cab2, -w / 2 + 0.22, 0, -0.5, Math.PI / 2);
  addAt(g, plant(), -3.5, 0, -2.7); addAt(g, plant(), 3.5, 0, 2.5);
  // waiting bench + gundro
  const bench = new THREE.Group(); bench.add(box(2.2, 0.08, 0.5, mat('wood', { tint: 0xb08a5a }), 0, 0.45, 0)); [-1, 1].forEach(s => bench.add(box(0.08, 0.45, 0.45, mat('wood', { tint: 0x8a6a44 }), s * 1.0, 0.22, 0))); addAt(g, bench, -2.0, 0, 2.7, Math.PI);
  addAt(g, buildProp('galaicha'), 0.4, 0.02, 1.0, 0.2);
  // ceiling panels + lights
  [[-2, -1], [2, -1], [-2, 1.5], [2, 1.5]].forEach(([x, z]) => { g.add(box(1.4, 0.05, 0.5, flat(0xffffff, 0.3, 0, { emissive: 0xfff4e0, emissiveIntensity: 0.9 }), x, h - 0.03, z)); });
  lights.push({ type: 'point', pos: [-2, h - 0.5, -0.5], color: 0xfff1da, intensity: 7, dist: 12 }, { type: 'point', pos: [2, h - 0.5, -0.5], color: 0xfff1da, intensity: 7, dist: 12 }, { type: 'point', pos: [0, h - 0.5, 2], color: 0xfff1da, intensity: 5, dist: 12 });
  return { group: g, lights };
}

/* ================= DESK CLOSE-UP ================= */
function buildDesk(def) {
  const g = new THREE.Group(); const lights = []; const { w, d, h } = def;
  g.add(room(def, {
    floorMat: mat('tile', { rx: 3, ry: 2.5, rough: 0.5, bump: 0.15, tint: 0xbdbab2 }), lowerMat: flat(0x2e9b4f, 0.7), upperMat: mat('wall_office', { rx: 2, ry: 1, bump: 0.2, tint: 0xc9c6bd }),
    ceilMat: flat(0xf4f2ec, 0.9), openings: {},
  }));
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), bannerCanvas('MICROFINANCE', 'Small loans • Big dreams')); addAt(g, ban, 0.6, 2.35, -d / 2 + 0.02);
  addAt(g, new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.0), mat('sky_poster', { bump: 0 })), -2.2, 1.6, -d / 2 + 0.02);
  const cab = shelves(2.0, 1.9, 5, true); addAt(g, cab, 1.6, 0, -d / 2 + 0.22);
  addAt(g, plant(), -2.6, 0, -2.0);
  // big desk
  const top = new THREE.Group(); const dm = mat('wood', { rx: 1, ry: 1, tint: 0xd9b48a, bump: 0.2 });
  top.add(box(1.9, 0.06, 0.85, dm, 0, 0.75, 0)); top.add(box(0.06, 0.72, 0.8, dm, -0.9, 0.36, 0)); top.add(box(0.06, 0.72, 0.8, dm, 0.9, 0.36, 0)); top.add(box(1.8, 0.45, 0.03, dm, 0, 0.5, -0.38));
  addAt(g, top, 0, 0, -0.7);
  const y = 0.78;
  addAt(g, buildProp('notebook'), -0.55, y, -0.62, 0.25); addAt(g, buildProp('passbook'), -0.15, y, -0.5, -0.3); addAt(g, buildProp('money_notes'), 0.35, y, -0.55, 0.2); addAt(g, buildProp('coins'), 0.55, y, -0.4, 0.5); addAt(g, buildProp('calculator'), 0.7, y, -0.75, -0.4, 1.2);
  const mon = monitor(); addAt(g, mon, 0.62, y, -0.98, -0.1, 1.0); addAt(g, keyboard(), 0.62, y, -0.78, -0.1);
  const pens = cyl(0.04, 0.04, 0.1, flat(0x1f4aa3, 0.5), -0.75, y + 0.05, -0.95, 12); addAt(g, pens, -0.75, y + 0.05, -0.95); [-0.015, 0.015, 0].forEach((o, i) => g.add(cyl(0.004, 0.004, 0.16, flat([0xb3201f, 0x1f4aa3, 0x111111][i], 0.4), -0.75 + o, y + 0.13, -0.95 + o * 1.5, 5)));
  const np = box(0.3, 0.07, 0.03, flat(0xf08a24, 0.5), 0, 0, 0); np.add(box(0.26, 0.04, 0.005, flat(0xf6f3ea, 0.5), 0, 0, 0.017)); addAt(g, np, -0.4, y + 0.04, -0.3, 0.0);
  const lamp = new THREE.Group(); lamp.add(cyl(0.07, 0.08, 0.02, flat(0x2b2f36, 0.5), 0, 0.01, 0, 12)); lamp.add(cyl(0.01, 0.01, 0.35, flat(0x2b2f36, 0.5), 0, 0.2, 0, 6)); const hd = cone(0.08, 0.1, flat(0x2e9b4f, 0.4), 0.06, 0.4, 0, 14); hd.rotation.z = 0.7; lamp.add(hd); addAt(g, lamp, -0.8, y, -0.5);
  addAt(g, officeChair(), 0, 0, -1.5, 0); addAt(g, officeChair(), 0, 0, 0.15, Math.PI);
  lights.push({ type: 'point', pos: [0, h - 0.6, -0.4], color: 0xfff1da, intensity: 7, dist: 10 }, { type: 'point', pos: [0.4, 1.9, 1.0], color: 0xfff1da, intensity: 3, dist: 8 });
  g.add(box(1.4, 0.05, 0.5, flat(0xffffff, 0.3, 0, { emissive: 0xfff4e0, emissiveIntensity: 0.9 }), 0, h - 0.03, -0.4));
  return { group: g, lights };
}

export function buildInterior(kind, def) {
  if (kind === 'home') return buildHomeInterior(def);
  if (kind === 'office') return buildOffice(def);
  return buildDesk(def);
}
