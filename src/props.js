import * as THREE from 'three';
import { box, cyl, sph, cap, cone, torus, lathe, grp, at, TAU } from './util.js';
import { mat, flat } from './textures.js';
import { rng } from './textures.js';

const wood = () => mat('wood', { rx: 1, ry: 1, rough: 0.7, bump: 0.3 });
const metal = (c = 0xb8b8b8) => flat(c, 0.35, 0.9);

function notesPile(n = 3) {
  const g = new THREE.Group(); const r = rng(7);
  const side = flat(0xe9e2d0, 0.9);
  const m500 = [side, side, mat('note500', { bump: 0 }), side, side, side];
  const m100 = [side, side, mat('note100', { bump: 0 }), side, side, side];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.163, 0.018, 0.073), i % 2 ? m100 : m500);
    b.position.set((r() - 0.5) * 0.02, 0.009 + i * 0.019, (r() - 0.5) * 0.02); b.rotation.y = (r() - 0.5) * 0.25; b.castShadow = b.receiveShadow = true; g.add(b);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.075), flat(0xf3f3f3, 0.8)); band.position.copy(b.position); band.rotation.y = b.rotation.y; g.add(band);
  }
  return g;
}

export const PROP_BUILDERS = {
  money_notes: () => notesPile(3),
  coins: () => {
    const g = new THREE.Group(); const r = rng(3);
    for (let s = 0; s < 5; s++) { const h = 3 + Math.floor(r() * 5); for (let i = 0; i < h; i++) g.add(cyl(0.013, 0.013, 0.003, metal(s % 2 ? 0xd9b24a : 0xc8c8cc), (s - 2) * 0.034, 0.002 + i * 0.0032, (r() - 0.5) * 0.02, 20)); }
    for (let i = 0; i < 4; i++) { const c = cyl(0.013, 0.013, 0.003, metal(0xd9b24a), (r() - 0.5) * 0.18, 0.002, 0.04 + r() * 0.04, 20); c.rotation.y = r(); g.add(c); }
    return g;
  },
  chair: () => {
    const g = new THREE.Group(), w = wood();
    g.add(box(0.44, 0.04, 0.44, w, 0, 0.45, 0));
    [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].forEach(([x, z]) => g.add(box(0.04, 0.45, 0.04, w, x, 0.225, z)));
    g.add(box(0.04, 0.45, 0.04, w, -0.19, 0.69, -0.19)); g.add(box(0.04, 0.45, 0.04, w, 0.19, 0.69, -0.19));
    for (let i = 0; i < 3; i++) g.add(box(0.38, 0.06, 0.025, w, 0, 0.58 + i * 0.12, -0.19));
    return g;
  },
  stool: () => { const g = new THREE.Group(); g.add(cyl(0.17, 0.2, 0.3, mat('woven', { rx: 2, ry: 1 }), 0, 0.15, 0, 20)); g.add(cyl(0.18, 0.18, 0.025, wood(), 0, 0.3, 0, 20)); return g; },
  table: () => {
    const g = new THREE.Group(), w = wood();
    g.add(box(1.2, 0.05, 0.7, w, 0, 0.75, 0));
    [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]].forEach(([x, z]) => g.add(box(0.06, 0.75, 0.06, w, x, 0.375, z)));
    g.add(box(1.0, 0.04, 0.04, w, 0, 0.25, 0.3)); g.add(box(1.0, 0.04, 0.04, w, 0, 0.25, -0.3));
    return g;
  },
  gundro: () => { const m = box(1.8, 0.012, 0.95, mat('gundro', { rx: 3, ry: 2, bump: 0.4 }), 0, 0.006, 0); m.receiveShadow = true; return grp(m); },
  galaicha: () => grp(box(1.7, 0.014, 1.1, mat('carpet', { rx: 1, ry: 1, bump: 0.5 }), 0, 0.007, 0)),
  doko: () => {
    const g = new THREE.Group(); const m = mat('woven', { rx: 3, ry: 1.5, bump: 0.8 }).clone(); m.side = THREE.DoubleSide;
    g.add(cyl(0.29, 0.17, 0.58, m, 0, 0.29, 0, 24, true));
    g.add(cyl(0.17, 0.17, 0.02, m, 0, 0.01, 0, 20));
    g.add(torus(0.29, 0.015, flat(0x6b4b1f, 0.9), 0, 0.58, 0, Math.PI / 2));
    return g;
  },
  nanglo: () => {
    const m = mat('woven', { rx: 3, ry: 1, bump: 0.8 }).clone(); m.side = THREE.DoubleSide;
    const g = new THREE.Group(); g.add(lathe([[0, 0.02], [0.22, 0.03], [0.4, 0.08], [0.42, 0.095]], m, 32));
    g.add(torus(0.42, 0.012, flat(0x6b4b1f, 0.9), 0, 0.095, 0, Math.PI / 2)); return g;
  },
  pot: () => { const g = new THREE.Group(); g.add(lathe([[0, 0], [0.1, 0.01], [0.2, 0.12], [0.22, 0.24], [0.15, 0.36], [0.11, 0.4], [0.14, 0.42], [0.12, 0.43]], flat(0xa8532f, 0.85), 28)); return g; },
  gagri: () => { const g = new THREE.Group(); g.add(lathe([[0, 0], [0.08, 0.01], [0.17, 0.12], [0.18, 0.22], [0.1, 0.34], [0.07, 0.4], [0.1, 0.44], [0.09, 0.45]], metal(0xcf9c3a), 28)); return g; },
  kodalo: () => {
    const g = new THREE.Group();
    const h = cyl(0.018, 0.02, 1.1, wood(), 0, 0.55, 0, 8); g.add(h);
    const blade = box(0.17, 0.2, 0.012, metal(0x8d8d92), 0, 1.08, 0.1); blade.rotation.x = -0.9; blade.position.set(0, 1.08, 0.08); g.add(blade);
    g.add(box(0.03, 0.04, 0.2, metal(0x55555a), 0, 1.1, 0.02));
    return g;
  },
  hasiya: () => {
    const g = new THREE.Group(); g.add(cyl(0.02, 0.02, 0.22, wood(), 0, 0.11, 0, 8));
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 6, 20, Math.PI * 1.25), metal(0xc4c4c8)); arc.position.set(0.0, 0.3, 0); arc.rotation.z = -0.4; arc.castShadow = true; g.add(arc);
    return g;
  },
  rice_bundle: () => {
    const g = new THREE.Group(); const r = rng(9); const stalk = flat(0xc9a53a, 0.8), head = flat(0xe0bd45, 0.7);
    for (let i = 0; i < 26; i++) { const a = r() * TAU, k = r() * 0.06; const s = cyl(0.004, 0.005, 0.7, stalk, Math.cos(a) * k, 0.35, Math.sin(a) * k, 4); s.rotation.set(Math.sin(a) * 0.05 * (0.4 + r()), 0, -Math.cos(a) * 0.05 * (0.4 + r())); g.add(s); const hd = sph(0.012, head, Math.cos(a) * (k + 0.03), 0.68 + r() * 0.04, Math.sin(a) * (k + 0.03), 1, 2.4, 1, 6); g.add(hd); }
    g.add(torus(0.05, 0.008, flat(0x6b4b1f, 0.9), 0, 0.3, 0, Math.PI / 2));
    return g;
  },
  notebook: () => {
    const g = new THREE.Group(); g.add(box(0.2, 0.018, 0.28, flat(0x1f4aa3, 0.6), 0, 0.009, 0)); g.add(box(0.19, 0.012, 0.27, flat(0xf5f2e8, 0.9), 0.004, 0.011, 0)); return g;
  },
  passbook: () => {
    const g = new THREE.Group(); g.add(box(0.1, 0.008, 0.16, flat(0x2f8f4e, 0.55), 0, 0.004, 0)); g.add(box(0.1, 0.009, 0.03, flat(0xf08a24, 0.55), 0, 0.0045, -0.065)); return g;
  },
  calculator: () => {
    const g = new THREE.Group(); g.add(box(0.1, 0.02, 0.15, flat(0x2b2b30, 0.5), 0, 0.01, 0)); g.add(box(0.08, 0.004, 0.03, flat(0x9ec8a0, 0.3), 0, 0.021, -0.045));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.add(box(0.016, 0.005, 0.016, flat(0xdddddd, 0.5), -0.03 + i * 0.02, 0.022, -0.005 + j * 0.02));
    return g;
  },
  lantern: () => {
    const g = new THREE.Group(); g.add(cyl(0.05, 0.06, 0.03, metal(0x333333), 0, 0.015, 0, 12));
    g.add(cyl(0.045, 0.045, 0.2, flat(0xffe9b0, 0.1, 0, { transparent: true, opacity: 0.45, emissive: 0xffa83a, emissiveIntensity: 0.9 }), 0, 0.13, 0, 14));
    g.add(cone(0.065, 0.06, metal(0x333333), 0, 0.26, 0, 12)); g.add(torus(0.04, 0.005, metal(0x333333), 0, 0.31, 0, 0)); return g;
  },
  broom: () => {
    const g = new THREE.Group(); const r = rng(13);
    g.add(cyl(0.015, 0.015, 1.0, wood(), 0, 0.55, 0, 6));
    for (let i = 0; i < 30; i++) { const a = r() * TAU; const s = cyl(0.003, 0.004, 0.32, flat(0xb89a4a, 0.9), Math.cos(a) * 0.05, 0.15, Math.sin(a) * 0.05, 3); s.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2); g.add(s); }
    g.add(cyl(0.045, 0.05, 0.05, flat(0x7a3d2c, 0.8), 0, 0.36, 0, 10)); return g;
  },
  bucket: () => {
    const g = new THREE.Group(); const m = flat(0x3a6ea5, 0.5); m.side = THREE.DoubleSide;
    g.add(cyl(0.18, 0.13, 0.3, m, 0, 0.15, 0, 20, true)); g.add(cyl(0.13, 0.13, 0.01, m, 0, 0.005, 0, 20));
    const h = torus(0.17, 0.006, metal(0x888888), 0, 0.3, 0, 0); h.scale.y = 1.2; g.add(h); return g;
  },
  firewood: () => {
    const g = new THREE.Group(); const r = rng(21); const w = wood();
    for (let row = 0; row < 4; row++) for (let i = 0; i < 6 - row; i++) { const c = cyl(0.05, 0.05, 0.8, w, (i - (5 - row) / 2) * 0.105, 0.05 + row * 0.09, 0, 8); c.rotation.z = Math.PI / 2; c.rotation.x = Math.PI / 2; c.position.z = (r() - 0.5) * 0.03; g.add(c); }
    return g;
  },
  sack: () => { const g = new THREE.Group(); const m = flat(0xc9b78f, 0.95); g.add(sph(0.26, m, 0, 0.3, 0, 1, 1.25, 0.8, 16)); g.add(cyl(0.1, 0.17, 0.12, m, 0, 0.66, 0, 12)); return g; },
  bed: () => {
    const g = new THREE.Group(), w = wood();
    g.add(box(1.9, 0.06, 0.95, flat(0xb89a4a, 0.9), 0, 0.42, 0));
    [[-0.9, -0.43], [0.9, -0.43], [-0.9, 0.43], [0.9, 0.43]].forEach(([x, z]) => g.add(box(0.06, 0.42, 0.06, w, x, 0.21, z)));
    g.add(box(1.94, 0.05, 0.06, w, 0, 0.45, 0.47)); g.add(box(1.94, 0.05, 0.06, w, 0, 0.45, -0.47)); g.add(box(0.06, 0.05, 1.0, w, 0.95, 0.45, 0)); g.add(box(0.06, 0.05, 1.0, w, -0.95, 0.45, 0));
    g.add(box(1.7, 0.06, 0.85, mat('carpet', { rx: 1, ry: 1 }), 0, 0.48, 0));
    g.add(box(0.5, 0.1, 0.35, flat(0xe9e2d0, 0.9), -0.65, 0.54, 0));
    return g;
  },
  cupboard: () => {
    const g = new THREE.Group(), w = wood();
    g.add(box(0.9, 1.6, 0.45, w, 0, 0.8, 0));
    g.add(box(0.42, 1.5, 0.02, mat('wood', { tint: 0xcfa87a }), -0.22, 0.8, 0.23)); g.add(box(0.42, 1.5, 0.02, mat('wood', { tint: 0xcfa87a }), 0.22, 0.8, 0.23));
    g.add(sph(0.02, metal(0xcfa13a), -0.04, 0.8, 0.25)); g.add(sph(0.02, metal(0xcfa13a), 0.04, 0.8, 0.25));
    return g;
  },
};

export function buildProp(type) {
  const f = PROP_BUILDERS[type]; if (!f) throw new Error('unknown prop ' + type);
  const g = f(); g.userData.propType = type; return g;
}
