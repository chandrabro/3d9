import * as THREE from 'three';
import { box, cyl, sph, cone, grp, torus, TAU } from './util.js';
import { mat, flat } from './textures.js';

const woodMat = (tint = 0xffffff) => mat('wood', { rx: 1, ry: 1, bump: 0.25, tint });

function roof(W, Rd, y0, Hr, material, lenOver = 0.5) {
  const g = new THREE.Group(); const L = Math.hypot(Rd, Hr), a = Math.atan2(Hr, Rd);
  [1, -1].forEach(s => { const p = box(W + lenOver * 2, 0.1, L, material, 0, y0 + Hr / 2, s * Rd / 2); p.rotation.x = s * a; g.add(p); });
  g.add(box(W + lenOver * 2 + 0.05, 0.12, 0.25, flat(0x3d2e22, 0.9), 0, y0 + Hr + 0.03, 0));
  return g;
}
function gable(D, y0, Hr, Rd, material, x) {
  const hw = D / 2, yE = Hr * (1 - hw / Rd) - 0.07; const sh = new THREE.Shape(); sh.moveTo(-hw, 0); sh.lineTo(hw, 0); sh.lineTo(hw, yE); sh.lineTo(0, Hr - 0.07); sh.lineTo(-hw, yE); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }); const m = new THREE.Mesh(geo, material); m.rotation.y = Math.PI / 2; m.position.set(x, y0, 0); m.castShadow = m.receiveShadow = true; return m;
}
function window3(x, y, z, ry, open = true) {
  const g = new THREE.Group(); const w = woodMat(0xa07040);
  g.add(box(0.95, 0.95, 0.1, w, 0, 0, 0)); g.add(box(0.72, 0.72, 0.12, flat(0x14100d, 0.95), 0, 0, 0.02));
  g.add(box(0.04, 0.72, 0.13, w, 0, 0, 0.03)); g.add(box(0.72, 0.04, 0.13, w, 0, 0, 0.03));
  [-1, 1].forEach(s => { const sh = box(0.38, 0.72, 0.04, woodMat(0xcfa070), s * 0.55, 0, 0.12); sh.rotation.y = -s * 0.9; sh.position.x = s * 0.58; g.add(sh); });
  g.position.set(x, y, z); g.rotation.y = ry; return g;
}

export function buildHouse({ style = 'stone', door = false } = {}) {
  const g = new THREE.Group(); const W = 6.4, D = 4.6, wallH = style === 'stone' ? 2.7 : 2.5, y0 = 0.45 + wallH;
  const wallMat = style === 'stone' ? mat('stone', { rx: 3, ry: 1.2, bump: 1.4 }) : mat('mud', { rx: 3, ry: 1.2, bump: 1.1 });
  g.add(box(W + 0.35, 0.45, D + 0.35, mat('stone', { rx: 3, ry: 0.4, bump: 1.4, tint: 0xbfb8aa }), 0, 0.225, 0));
  g.add(box(W, wallH, D, wallMat, 0, 0.45 + wallH / 2, 0));
  if (style === 'mud') { g.add(box(W + 0.03, 0.95, D + 0.03, mat('mud', { rx: 3, ry: 0.6, tint: 0xb4502e, bump: 1 }), 0, 0.45 + 0.475, 0)); g.add(box(W + 0.03, wallH - 0.95, D + 0.03, mat('plaster', { rx: 3, ry: 1, bump: 0.8 }), 0, 0.45 + 0.95 + (wallH - 0.95) / 2, 0)); }
  const roofMat = style === 'stone' ? mat('slate', { rx: 4, ry: 3, bump: 0.8 }) : mat('thatch', { rx: 4, ry: 2, bump: 1.2 });
  const Rd = D / 2 + 0.7, Hr = 1.9;
  g.add(roof(W, Rd, y0, Hr, roofMat, 0.6)); [-1, 1].forEach(s => g.add(gable(D, y0, Hr, Rd, wallMat, s * (W / 2 - 0.1))));
  // door + steps
  const dw = door ? 1.25 : 1.05, dh = door ? 2.0 : 1.9;
  g.add(box(dw + 0.3, dh + 0.2, 0.1, woodMat(0x8a5a30), 0, 0.45 + dh / 2 + 0.05, D / 2 + 0.03));
  g.add(box(dw, dh, 0.12, woodMat(0xc89a66), 0, 0.45 + dh / 2, D / 2 + 0.06));
  g.add(sph(0.03, flat(0x2a2a2a, 0.4, 0.8), dw / 2 - 0.15, 0.45 + dh / 2, D / 2 + 0.15));
  g.add(box(1.8, 0.2, 0.9, mat('stone', { rx: 1, ry: 1, tint: 0xcfc6b2 }), 0, 0.1, D / 2 + 0.55)); g.add(box(1.5, 0.2, 0.6, mat('stone', { rx: 1, ry: 1, tint: 0xcfc6b2 }), 0, 0.3, D / 2 + 0.3));
  g.add(window3(-2.2, 1.9, D / 2 + 0.04, 0)); g.add(window3(2.2, 1.9, D / 2 + 0.04, 0));
  g.add(window3(W / 2 + 0.04, 1.9, 0, Math.PI / 2)); g.add(window3(-W / 2 - 0.04, 1.9, 0.6, -Math.PI / 2));
  // hanging corn / chillies for flavour
  const cn = flat(0xe4b43a, 0.7); for (let i = 0; i < 4; i++) g.add(sph(0.11, cn, -2.9 + i * 0.22, 2.55, D / 2 + 0.2, 0.7, 1.5, 0.7, 8));
  const rd = flat(0xc1272d, 0.6); for (let i = 0; i < 5; i++) g.add(sph(0.07, rd, 2.3 + i * 0.16, 2.6 - (i % 2) * 0.08, D / 2 + 0.2, 0.6, 1.5, 0.6, 6));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.footprint = { w: W + 1.5, d: D + 2 };
  return g;
}

export function buildHut() {
  const g = new THREE.Group(); const w = woodMat(0xa07a50);
  [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach(([x, z]) => g.add(cyl(0.09, 0.1, 3.2, w, x, 1.6, z, 6)));
  g.add(box(2.8, 0.12, 2.8, w, 0, 1.4, 0));
  const rf = cone(2.5, 1.7, mat('thatch', { rx: 3, ry: 2, bump: 1 }), 0, 3.7, 0, 4); rf.rotation.y = Math.PI / 4; g.add(rf);
  const lad = box(0.45, 1.5, 0.05, w, 0, 0.7, 1.55); lad.rotation.x = -0.35; g.add(lad); return g;
}

export function buildShed(w = 12) {
  const g = new THREE.Group(); const wd = woodMat(0xa07a50);
  g.add(box(w, 2.6, 0.15, woodMat(0x8a6a44), 0, 1.3, -1.6));
  for (let i = 0; i <= 4; i++) g.add(cyl(0.08, 0.09, 2.8, wd, -w / 2 + i * w / 4, 1.4, 1.8, 6));
  const rf = box(w + 1, 0.08, 4.2, mat('tin', { rx: 5, ry: 1, bump: 0.8, metal: 0.4 }), 0, 2.95, 0.1); rf.rotation.x = 0.17; g.add(rf);
  g.add(box(w - 0.5, 0.06, 3, mat('thatch', { rx: 3, ry: 1, bump: 0.6 }), 0, 0.03, 0.1));
  for (let i = 0; i < 3; i++) g.add(box(0.06, 1.0, 3, wd, -w / 4 + i * w / 4, 0.5, 0.1));
  return g;
}

export function buildPen({ w, d, low = false }) {
  const g = new THREE.Group(); const wd = woodMat(0xb08a5a); const H = low ? 0.8 : 1.15; const per = [];
  const side = (x0, z0, x1, z1, gap) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 1.3), ang = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i <= n; i++) { const t = i / n; if (gap && Math.abs(t - 0.5) < 0.1) continue; g.add(cyl(0.05, 0.065, H, wd, x0 + (x1 - x0) * t, H / 2, z0 + (z1 - z0) * t, 6)); }
    for (let k = 0; k < 3; k++) { if (gap) { [[0, 0.4], [0.6, 1]].forEach(([a, b]) => { const l = len * (b - a - (a === 0 ? 0.1 : 0)); const r = box(0.04, 0.07, len * 0.4, wd, x0 + (x1 - x0) * (a + b) / 2, H * (0.3 + k * 0.3), z0 + (z1 - z0) * (a + b) / 2); r.rotation.y = ang; g.add(r); }); } else { const r = box(0.04, 0.07, len, wd, (x0 + x1) / 2, H * (0.3 + k * 0.3), (z0 + z1) / 2); r.rotation.y = ang; g.add(r); } } };
  side(-w / 2, -d / 2, w / 2, -d / 2); side(-w / 2, d / 2, w / 2, d / 2, true); side(-w / 2, -d / 2, -w / 2, d / 2); side(w / 2, -d / 2, w / 2, d / 2);
  return g;
}

export function buildHenhouse() {
  const g = new THREE.Group(); const wd = woodMat(0xc0956a), dk = woodMat(0x8a6a44);
  [[-0.9, -0.6], [0.9, -0.6], [-0.9, 0.6], [0.9, 0.6]].forEach(([x, z]) => g.add(box(0.1, 0.5, 0.1, dk, x, 0.25, z)));
  g.add(box(2.1, 1.2, 1.5, wd, 0, 1.1, 0)); g.add(box(2.1, 0.08, 1.5, dk, 0, 0.5, 0));
  const rf = [1, -1].map(s => { const p = box(2.4, 0.07, 1.1, mat('tin', { rx: 3, ry: 1, bump: 0.8, metal: 0.4 }), 0, 1.95, s * 0.45); p.rotation.x = s * 0.4; g.add(p); return p; });
  g.add(box(0.5, 0.55, 0.06, flat(0x15110e, 1), 0.3, 0.85, 0.76)); const ramp = box(0.45, 0.04, 1.1, dk, 0.3, 0.55, 1.2); ramp.rotation.x = 0.5; g.add(ramp);
  for (let i = 0; i < 4; i++) g.add(box(0.45, 0.03, 0.03, dk, 0.3, 0.45 + i * 0.1, 1.0 + i * 0.22));
  g.add(box(0.6, 0.6, 0.5, wd, -1.35, 1.0, 0.1)); g.add(box(0.68, 0.05, 0.58, mat('tin', { rx: 1, ry: 1, metal: 0.4 }), -1.35, 1.34, 0.1));
  return g;
}

export function buildTulsi() {
  const g = new THREE.Group(); const pl = mat('plaster', { rx: 1, ry: 1, tint: 0xf0e8d6 });
  g.add(box(0.9, 0.18, 0.9, pl, 0, 0.09, 0)); g.add(box(0.65, 0.5, 0.65, pl, 0, 0.43, 0)); g.add(box(0.85, 0.1, 0.85, pl, 0, 0.73, 0));
  g.add(box(0.5, 0.05, 0.5, flat(0x3a2415, 1), 0, 0.78, 0));
  const lf = flat(0x3f8a2e, 0.8); for (let i = 0; i < 14; i++) g.add(sph(0.11, lf, (Math.random() - 0.5) * 0.3, 0.95 + Math.random() * 0.3, (Math.random() - 0.5) * 0.3, 1, 0.8, 1, 6));
  g.add(cyl(0.015, 0.015, 0.7, woodMat(), 0.3, 1.1, 0.3, 6)); g.add(box(0.12, 0.08, 0.02, flat(0xe24a1f, 0.7), 0.3, 1.38, 0.3));
  const diya = cyl(0.04, 0.03, 0.025, flat(0xa8532f, 0.8), -0.25, 0.8, 0.25, 10); g.add(diya); g.add(sph(0.012, flat(0xffcc66, 0.2, 0, { emissive: 0xffaa33, emissiveIntensity: 2 }), -0.25, 0.83, 0.25, 1, 1.6, 1, 6));
  return g;
}

export function buildTrough() {
  const g = new THREE.Group(); const w = woodMat(0xa07a50);
  g.add(box(1.5, 0.08, 0.4, w, 0, 0.3, 0)); g.add(box(1.5, 0.3, 0.05, w, 0, 0.45, 0.2)); g.add(box(1.5, 0.3, 0.05, w, 0, 0.45, -0.2)); g.add(box(0.05, 0.3, 0.4, w, 0.75, 0.45, 0)); g.add(box(0.05, 0.3, 0.4, w, -0.75, 0.45, 0));
  g.add(box(1.4, 0.04, 0.32, flat(0xcaa84a, 0.9), 0, 0.5, 0));
  [-0.6, 0.6].forEach(x => g.add(box(0.07, 0.3, 0.34, w, x, 0.15, 0)));
  return g;
}
