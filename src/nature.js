import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, cyl, sph, cone, grp, lathe, TAU, clamp, smooth, polyline, lerp } from './util.js';
import { mat, flat, rng, fbm, vnoise } from './textures.js';

export const wind = { value: 0 };
function windify(m) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = wind;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       #ifdef USE_INSTANCING
       float sway = sin(uTime*1.7 + instanceMatrix[3].x*0.45 + instanceMatrix[3].z*0.33) * position.y * 0.3;
       transformed.x += sway; transformed.z += sway*0.55;
       #endif`);
  };
  return m;
}

/* ---------- height function (flat core, rolling hills, optional terraced hillside) ---------- */
export function makeHeightFn(terr) {
  const rise = 1.7, step = 8;
  return function h(x, z) {
    const r = Math.hypot(x, z);
    let y = smooth((r - 55) / 120) * (9 + 30 * fbm(x * 0.011 + 3, z * 0.011 + 7, 4, 5));
    const z0 = terr ? terr.z : -48;
    const d = z0 - z;
    if (d > 0) {
      if (terr) {
        const band = d / step; const i = Math.floor(band), f = band - i;
        const fade = 1 - smooth((Math.abs(x) - 70) / 40);
        const stepH = band >= terr.tiers ? terr.tiers * rise + (d - terr.tiers * step) * 0.34 : (i + smooth((f - 0.78) / 0.22)) * rise;
        y += stepH * fade + (1 - fade) * d * 0.12;
      } else y += smooth(d / 70) * 16 + d * 0.05;
    }
    return y;
  };
}

export function buildTerrain({ heightFn, terr, ground, radius, q }) {
  const size = 420, seg = q === 'low' ? 140 : 200;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = heightFn(x, z); pos.setY(i, y);
    const n = fbm(x * 0.05, z * 0.05, 3, 9);
    c.setRGB(0.55 + n * 0.55, 0.7 + n * 0.5, 0.35 + n * 0.3);
    if (terr) {
      const d = terr.z - z;
      if (d > 0 && d < terr.tiers * 8) {
        const f = (d / 8) % 1, tier = Math.floor(d / 8);
        if (f > 0.76) c.setRGB(0.58, 0.45, 0.32);                                 // earthen riser
        else { const k = fbm(tier * 3.1, 5.5, 2, 3); c.setRGB(0.85 + k * 0.35, 1.0 + k * 0.1, 0.45 + k * 0.1); } // paddy green/yellow
      }
    }
    if (y > 14) { const k = smooth((y - 14) / 25); c.lerp(new THREE.Color(0.55, 0.5, 0.42), k * 0.6); }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: mat('grass', { rx: 150, ry: 150 }).map, vertexColors: true, roughness: 0.95, bumpMap: mat('grass').map, bumpScale: 0.5 }));
  m.receiveShadow = true; m.userData.ground = true;
  const g = new THREE.Group(); g.add(m);

  // central patch (soil / yard / floor) with soft alpha edge
  if (ground === 'soil' || ground === 'yard') {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); const gr = x.createRadialGradient(64, 64, 30, 64, 64, 64); gr.addColorStop(0, '#fff'); gr.addColorStop(0.72, '#fff'); gr.addColorStop(1, '#000'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    const am = new THREE.CanvasTexture(cv);
    const p = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.62, 64), new THREE.MeshStandardMaterial({ map: mat(ground === 'soil' ? 'soil' : 'yard', { rx: 12, ry: 12 }).map, bumpMap: mat('soil').map, bumpScale: 0.7, roughness: 1, alphaMap: am, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }));
    p.rotation.x = -Math.PI / 2; p.position.y = 0.015; p.receiveShadow = true; p.userData.ground = true; g.add(p);
  }
  return g;
}

/* ---------- Himalayan backdrop ---------- */
export function buildMountains(q) {
  const NA = 180, NR = 18, r0 = 210, r1 = 420; const pos = [], col = [], idx = [];
  const c = new THREE.Color();
  for (let j = 0; j <= NR; j++) for (let i = 0; i <= NA; i++) {
    const th = i / NA * TAU, rr = lerp(r0, r1, j / NR), x = Math.cos(th) * rr, z = Math.sin(th) * rr;
    const back = smooth((-z / rr + 0.25) / 1.0);       // taller to the north (-z)
    const rid = 1 - Math.abs(2 * fbm(x * 0.006, z * 0.006, 5, 17) - 1);
    const amp = (0.3 + 0.9 * back) * smooth((rr - r0) / 90) * 190;
    const y = 6 + Math.pow(rid, 1.6) * amp + fbm(x * 0.03, z * 0.03, 3, 2) * 12;
    pos.push(x, y, z);
    if (y > 105) c.setRGB(0.95, 0.96, 1.0); else if (y > 80) c.setRGB(0.62, 0.62, 0.66).lerp(new THREE.Color(0.95, 0.96, 1), smooth((y - 80) / 25));
    else if (y > 45) c.setRGB(0.4, 0.37, 0.33); else c.setRGB(0.18, 0.3, 0.16).lerp(new THREE.Color(0.4, 0.37, 0.33), smooth((y - 25) / 20));
    col.push(c.r, c.g, c.b);
  }
  for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, c2 = a + NA + 1, d = c2 + 1; idx.push(a, c2, b, b, c2, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false }));
  m.receiveShadow = false; m.castShadow = false; return m;
}

export function buildClouds() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv); const grpC = new THREE.Group(); const r = rng(42);
  for (let k = 0; k < 9; k++) {
    const cx = (r() - 0.5) * 700, cz = -100 - r() * 400, cy = 110 + r() * 60; const cl = new THREE.Group(); cl.position.set(cx, cy, cz);
    for (let i = 0; i < 7; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false, opacity: 0.75 })); const s = 60 + r() * 70; sp.scale.set(s * 1.6, s * 0.6, 1); sp.position.set((r() - 0.5) * 120, (r() - 0.5) * 8, (r() - 0.5) * 40); cl.add(sp); }
    grpC.add(cl);
  }
  grpC.userData.update = (t2) => { grpC.children.forEach((c, i) => { c.position.x += 0; c.position.x = ((c.userData.x0 ??= c.position.x) + t2 * (1.2 + (i % 3) * 0.4)); if (c.position.x > 420) c.userData.x0 -= 840; }); };
  return grpC;
}

/* ---------- vegetation ---------- */
function noisySphere(r, detail, seed, amp = 0.25) {
  const g = new THREE.IcosahedronGeometry(r, detail); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + (vnoise(x * 3 + seed, z * 3 + y * 2, seed) - 0.5) * amp * 2; p.setXYZ(i, x * k, y * k * 0.9, z * k); }
  g.computeVertexNormals(); return g;
}
const treeProtos = {};
function treeProto(kind) {
  if (treeProtos[kind]) return treeProtos[kind];
  if (kind === 'round') {
    const trunk = new THREE.CylinderGeometry(0.16, 0.28, 3.2, 8); trunk.translate(0, 1.6, 0);
    const br = new THREE.CylinderGeometry(0.06, 0.12, 1.6, 6); br.rotateZ(0.8); br.translate(0.6, 3.2, 0);
    const trunkG = mergeGeometries([trunk, br]);
    const parts = []; const rr = rng(3);
    for (let i = 0; i < 6; i++) { const s = noisySphere(1.0 + rr() * 0.8, 2, i * 3 + 1); s.translate((rr() - 0.5) * 2.6, 4.2 + rr() * 1.4, (rr() - 0.5) * 2.6); parts.push(s); }
    return (treeProtos[kind] = { trunk: trunkG, crown: mergeGeometries(parts), trunkMat: mat('bark', { rx: 1, ry: 2, bump: 1 }), crownMat: mat('leaf', { rx: 3, ry: 3, rough: 0.9, bump: 0.8 }) });
  }
  const trunk = new THREE.CylinderGeometry(0.1, 0.22, 7, 7); trunk.translate(0, 3.5, 0); const parts = [];
  for (let i = 0; i < 6; i++) { const c = new THREE.ConeGeometry(1.9 - i * 0.26, 2.2, 9); c.translate(0, 3 + i * 1.15, 0); parts.push(c); }
  return (treeProtos[kind] = { trunk, crown: mergeGeometries(parts), trunkMat: mat('bark', { rx: 1, ry: 3, bump: 1 }), crownMat: mat('leaf', { rx: 2, ry: 3, rough: 0.9, bump: 0.8, tint: 0x6f9a6a }) });
}
function instTree(kind, list, tint = 0xffffff) {
  const p = treeProto(kind); const g = new THREE.Group();
  const t = new THREE.InstancedMesh(p.trunk, p.trunkMat, list.length), cr = new THREE.InstancedMesh(p.crown, p.crownMat, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pp = new THREE.Vector3(), col = new THREE.Color();
  list.forEach((a, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a.ry); s.setScalar(a.s); pp.set(a.x, a.y, a.z); m.compose(pp, q, s); t.setMatrixAt(i, m); cr.setMatrixAt(i, m); col.setHSL(0.24 + a.v * 0.07, 0.4 + a.v * 0.2, 0.32 + a.v * 0.16); cr.setColorAt(i, col); });
  t.castShadow = cr.castShadow = true; t.receiveShadow = cr.receiveShadow = true; g.add(t, cr); return g;
}

export function addTrees(env, { n, area, avoid }, ctx) {
  const r = rng(ctx.seed++); const [x0, z0, x1, z1] = area; const round = [], pine = [];
  const pathPoly = ctx.paths[0] ? polyline(ctx.paths[0].pts) : null;
  let tries = 0, made = 0; const want = Math.round(n * ctx.f * (ctx.q === 'low' ? 0.8 : 1));
  while (made < want && tries++ < want * 40) {
    const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
    if (avoid === 'path' && distToPath(ctx.paths, x, z) < 4.2) continue;
    if (ctx.houses.some(h => Math.hypot(h.x - x, h.z - z) < 7.5)) continue;
    if (Math.abs(x) < 3.5 && z > -2 && z < ctx.camZ) continue;
    const e = { x, y: ctx.height(x, z), z, ry: r() * TAU, s: 0.8 + r() * 0.8, v: r() };
    (z < -20 && r() < 0.5 ? pine : round).push(e); made++;
  }
  if (round.length) env.add(instTree('round', round)); if (pine.length) env.add(instTree('pine', pine));
}
export function distToPath(paths, x, z) {
  let best = 1e9; for (const p of paths) { const pts = p.pts; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const dx = bx - ax, dz = bz - az; const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1); best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z)); } }
  return best;
}

export function addForestHills(env, ctx) {
  const n = Math.round(ctx.q === 'low' ? 120 : ctx.q === 'medium' ? 380 : 800); const r = rng(77); const list = [];
  for (let i = 0; i < n; i++) { const a = r() * TAU, d = 70 + r() * 110; const x = Math.cos(a) * d, z = Math.sin(a) * d; list.push({ x, y: ctx.height(x, z) - 0.2, z, ry: r() * TAU, s: 2.2 + r() * 2.2, v: r() }); }
  env.add(instTree('pine', list));
}

export function addGrass(env, ctx) {
  const n = Math.round(ctx.q === 'low' ? 2500 : ctx.q === 'medium' ? 9000 : 20000); const r = rng(55);
  const blades = []; for (let k = 0; k < 3; k++) { const p = new THREE.PlaneGeometry(0.07, 0.5, 1, 3); const a = p.attributes.position; for (let i = 0; i < a.count; i++) { const y = a.getY(i) + 0.25; a.setX(i, a.getX(i) * (1 - y / 0.55)); a.setY(i, y); } p.rotateY(k * Math.PI / 3); blades.push(p); }
  const geo = mergeGeometries(blades); const m = windify(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide }));
  const im = new THREE.InstancedMesh(geo, m, n); const mt = new THREE.Matrix4(), c = new THREE.Color(); let i = 0, tries = 0;
  while (i < n && tries++ < n * 6) {
    const a = r() * TAU, d = Math.sqrt(r()) * 45; const x = Math.cos(a) * d, z = Math.sin(a) * d - 3;
    if (distToPath(ctx.paths, x, z) < 1.6 || ctx.houses.some(h => Math.abs(h.x - x) < 3.4 * h.s && Math.abs(h.z - z) < 3 * h.s)) continue;
    if (ctx.exclude.some(e => x > e[0] && x < e[2] && z > e[1] && z < e[3])) continue;
    if (ctx.ground !== 'grass' && Math.hypot(x, z) < ctx.radius * 0.5) continue;
    const s = 0.6 + r() * 1.1; mt.compose(new THREE.Vector3(x, ctx.height(x, z), z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * TAU), new THREE.Vector3(s, s * (0.7 + r() * 0.7), s));
    im.setMatrixAt(i, mt); c.setHSL(0.22 + r() * 0.08, 0.5, 0.12 + r() * 0.12); im.setColorAt(i, c); i++;
  }
  im.count = i; im.receiveShadow = true; env.add(im);
}

export function addBamboo(env, { x, z, n }, ctx) {
  const r = rng(ctx.seed++); const stem = new THREE.CylinderGeometry(0.035, 0.05, 1, 6); stem.translate(0, 0.5, 0);
  const cnt = Math.round(n * (ctx.q === 'low' ? 0.6 : 1)); const sm = new THREE.InstancedMesh(stem, flat(0x9aaa3c, 0.6), cnt); const leaf = new THREE.ConeGeometry(0.4, 1.2, 5); leaf.translate(0, 0.6, 0);
  const lm = new THREE.InstancedMesh(leaf, flat(0x4f8a2a, 0.8), cnt * 3); const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  for (let i = 0; i < cnt; i++) {
    const px = x + (r() - 0.5) * 4, pz = z + (r() - 0.5) * 4, H = 6 + r() * 3.5, tilt = (r() - 0.5) * 0.25; E.set(tilt, 0, (r() - 0.5) * 0.25); Q.setFromEuler(E);
    M.compose(new THREE.Vector3(px, 0, pz), Q, new THREE.Vector3(1, H, 1)); sm.setMatrixAt(i, M);
    for (let k = 0; k < 3; k++) { const hh = H * (0.65 + k * 0.17); const off = new THREE.Vector3(Math.sin(tilt) * -hh * 0.0 + (r() - 0.5) * 0.4, hh, (r() - 0.5) * 0.4).applyQuaternion(Q).add(new THREE.Vector3(px, 0, pz)); const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 1.2, r() * TAU, (r() - 0.5) * 1.2)); M.compose(off, q2, new THREE.Vector3(1.4, 1.1, 1.4)); lm.setMatrixAt(i * 3 + k, M); }
  }
  sm.castShadow = lm.castShadow = true; env.add(sm, lm);
}

export function addPaddy(env, { x, z, w, d, crop }, ctx) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const mud = flat(0x4a3a24, 0.25, 0, { }); // wet mud/water sheen
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(w, d), crop === 'rice' ? flat(0x5b6e45, 0.12, 0.0) : mat('soil', { rx: 4, ry: 4 }));
  surf.rotation.x = -Math.PI / 2; surf.position.y = 0.06; surf.receiveShadow = true; g.add(surf);
  const bund = mat('soil', { rx: 6, ry: 1, tint: 0xb9a07a });
  [[0, -d / 2, w, 0.5], [0, d / 2, w, 0.5]].forEach(([bx, bz, bw, bd]) => g.add(box(bw + 0.5, 0.28, bd, bund, bx, 0.12, bz)));
  [[-w / 2, 0], [w / 2, 0]].forEach(([bx]) => g.add(box(0.5, 0.28, d, bund, bx, 0.12, 0)));
  const r = rng(ctx.seed++);
  if (crop === 'rice') {
    const bl = []; for (let k = 0; k < 3; k++) { const p = new THREE.PlaneGeometry(0.05, 0.55, 1, 3); const a = p.attributes.position; for (let i = 0; i < a.count; i++) { const y = a.getY(i) + 0.27; a.setX(i, a.getX(i) * (1 - y / 0.6)); a.setY(i, y); a.setZ(i, a.getZ(i) + y * y * 0.35 * (k - 1)); } p.rotateY(k * 1.05); bl.push(p); }
    const geo = mergeGeometries(bl); const m = windify(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide }));
    const sp = ctx.q === 'low' ? 0.5 : ctx.q === 'medium' ? 0.34 : 0.26; const nx = Math.floor((w - 1) / sp), nz = Math.floor((d - 1) / sp); const im = new THREE.InstancedMesh(geo, m, nx * nz); const M = new THREE.Matrix4(), c = new THREE.Color(); let i = 0;
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) { const px = -w / 2 + 0.5 + a * sp + (r() - 0.5) * 0.08, pz = -d / 2 + 0.5 + b * sp + (r() - 0.5) * 0.08; const s = 0.9 + r() * 0.4; M.compose(new THREE.Vector3(px, 0.05, pz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * TAU), new THREE.Vector3(s, s, s)); im.setMatrixAt(i, M); c.setHSL(0.22 + r() * 0.05, 0.55, 0.16 + r() * 0.1); im.setColorAt(i, c); i++; }
    im.receiveShadow = true; g.add(im);
  } else { // maize
    const st = new THREE.CylinderGeometry(0.02, 0.03, 1.8, 5); st.translate(0, 0.9, 0); const parts = [st]; for (let k = 0; k < 5; k++) { const lf = new THREE.PlaneGeometry(0.12, 0.9, 1, 2); lf.translate(0.06, 0.45, 0); lf.rotateZ(-0.9); lf.rotateY(k * 1.26); lf.translate(0, 0.5 + k * 0.28, 0); parts.push(lf); }
    const geo = mergeGeometries(parts); const m = new THREE.MeshStandardMaterial({ color: 0x5f9a35, roughness: 0.8, side: THREE.DoubleSide });
    const nx = Math.floor(w / 0.9), nz = Math.floor(d / 0.7); const im = new THREE.InstancedMesh(geo, m, nx * nz); const M = new THREE.Matrix4(); let i = 0;
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) { const s = 0.8 + r() * 0.5; M.compose(new THREE.Vector3(-w / 2 + 0.6 + a * 0.9, 0.1, -d / 2 + 0.6 + b * 0.7), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * TAU), new THREE.Vector3(s, s, s)); im.setMatrixAt(i++, M); }
    im.castShadow = true; g.add(im);
  }
  env.add(g);
}

export function addHaystack(env, { x, z }) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  g.add(lathe([[0, 0], [1.05, 0.02], [1.15, 0.5], [1.0, 1.2], [0.7, 1.8], [0.3, 2.3], [0.04, 2.6]], mat('thatch', { rx: 2, ry: 2, bump: 1 }), 20));
  g.add(cyl(0.05, 0.05, 1.6, flat(0x5b3d22, 0.9), 0, 3.0, 0, 6)); env.add(g);
}

export function addFence(env, { x0, z0, x1, z1, n }) {
  const g = new THREE.Group(); const w = mat('wood', { rx: 1, ry: 1, bump: 0.2, tint: 0xb89a6a });
  const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i <= n; i++) { const t = i / n; g.add(cyl(0.05, 0.06, 1.1, w, x0 + (x1 - x0) * t, 0.55, z0 + (z1 - z0) * t, 6)); }
  for (let k = 0; k < 2; k++) { const r = box(0.05, 0.06, len, w, (x0 + x1) / 2, 0.45 + k * 0.4, (z0 + z1) / 2); r.rotation.y = ang; g.add(r); }
  env.add(g);
}

export function addPath(env, { pts, w, stones }, ctx) {
  const smoothPts = []; const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.3);
  const N = Math.max(30, Math.round(curve.getLength() / 1.2)); const pos = [], uv = [], idx = []; let acc = 0;
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = curve.getPoint(t), tg = curve.getTangent(t); const nx = -tg.z, nz = tg.x; smoothPts.push([p.x, p.z]);
    const ww = w * (0.5 + 0.1 * (vnoise(i * 0.5, 3, 4) - 0.5)); acc = t * curve.getLength();
    pos.push(p.x + nx * ww, ctx.height(p.x + nx * ww, p.z + nz * ww) + 0.025, p.z + nz * ww, p.x - nx * ww, ctx.height(p.x - nx * ww, p.z - nz * ww) + 0.025, p.z - nz * ww); uv.push(0, acc / 3, 1, acc / 3);
    if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: mat('dirt', { rx: 1, ry: 1 }).map, bumpMap: mat('dirt').map, bumpScale: 0.9, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3 })); m.receiveShadow = true; m.userData.ground = true; env.add(m);
  ctx.paths.push({ pts: smoothPts });
  if (stones) {
    const geo = new THREE.DodecahedronGeometry(0.22, 0); const sm = new THREE.InstancedMesh(geo, mat('stone', { rx: 1, ry: 1 }), N * 4); const r = rng(8), M = new THREE.Matrix4(); let k = 0;
    for (let i = 0; i < N; i++) for (let s = -1; s <= 1; s += 2) { const t = i / N, p = curve.getPoint(t), tg = curve.getTangent(t); const off = s * (w * 0.55 + r() * 0.2); const px = p.x - tg.z * off, pz = p.z + tg.x * off; M.compose(new THREE.Vector3(px, 0.05, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(r(), r() * 3, r())), new THREE.Vector3(0.6 + r() * 0.8, 0.4 + r() * 0.5, 0.6 + r() * 0.8)); sm.setMatrixAt(k++, M); }
    sm.count = k; sm.castShadow = sm.receiveShadow = true; env.add(sm);
  }
}
