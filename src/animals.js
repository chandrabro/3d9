import * as THREE from 'three';
import { box, cyl, sph, cap, cone, torus, clamp } from './util.js';
import { flat } from './textures.js';

const S = Math.sin;

function leg(parent, x, y, z, len, r, mat, hoof) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  g.add(cap(r, len - 2 * r - 0.03, mat, 0, -len / 2 + 0.015)); g.add(cyl(r * 1.05, r * 1.15, 0.05, hoof, 0, -len + 0.02, 0, 8));
  return g;
}

export function buildAnimal(kind) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const rig = { kind: 'animal', animal: kind, root, body, legs: [], head: null, tail: null, ears: [] };

  if (kind === 'goat') {
    const fur = flat(0x8a5a36, 0.95), dark = flat(0x3a2415, 0.9), white = flat(0xe7ddc9, 0.95), hoof = flat(0x1f1a17, 0.7);
    body.position.y = 0.45;
    const torso = cap(0.17, 0.45, fur, 0, 0.12, 0); torso.rotation.x = Math.PI / 2; torso.scale.set(1.0, 1, 0.9); body.add(torso);
    body.add(sph(0.13, white, 0, 0.0, 0.0, 1.2, 0.5, 2.2, 12));
    const hg = new THREE.Group(); hg.position.set(0, 0.2, 0.38); body.add(hg); rig.head = hg;
    const neck = cap(0.075, 0.2, fur, 0, 0.12, 0.07); neck.rotation.x = 0.7; hg.add(neck);
    hg.add(sph(0.085, fur, 0, 0.27, 0.17, 0.9, 1.0, 1.35, 14)); hg.add(sph(0.045, dark, 0, 0.25, 0.3, 1, 0.85, 1.1, 10));
    hg.add(box(0.03, 0.12, 0.02, white, 0, 0.3, 0.2)); // blaze
    [-1, 1].forEach(s => {
      const ear = sph(0.045, fur, s * 0.1, 0.3, 0.14, 1.6, 0.3, 0.9, 8); ear.rotation.z = -s * 0.5; hg.add(ear); rig.ears.push({ m: ear, s });
      const horn = cone(0.018, 0.2, dark, s * 0.045, 0.37, 0.13, 6); horn.rotation.set(-0.7, 0, -s * 0.2); hg.add(horn);
      hg.add(sph(0.01, flat(0xe0c040, 0.2), s * 0.055, 0.29, 0.25, 1, 1, 0.5, 6)); hg.add(sph(0.005, flat(0x0b0b0b, 0.2), s * 0.057, 0.29, 0.255, 1, 1, 0.5, 6));
    });
    const beard = cone(0.015, 0.07, white, 0, 0.18, 0.32, 6); beard.rotation.x = Math.PI; hg.add(beard);
    const tail = cone(0.03, 0.12, fur, 0, 0.25, -0.5, 6); tail.rotation.x = -0.9; body.add(tail); rig.tail = tail;
    const L = 0.43; rig.legs = [leg(body, 0.1, 0.02, 0.3, L, 0.032, fur, hoof), leg(body, -0.1, 0.02, 0.3, L, 0.032, fur, hoof), leg(body, 0.1, 0.02, -0.3, L, 0.034, fur, hoof), leg(body, -0.1, 0.02, -0.3, L, 0.034, fur, hoof)];
    rig.stride = [1.0, 1.9]; rig.speed = 0.9; rig.hip = 0.45;
  } else if (kind === 'pig') {
    const pink = flat(0xe6a49c, 0.8), dpink = flat(0xc77f7a, 0.8), hoof = flat(0x2a211e, 0.7);
    body.position.y = 0.4;
    const torso = cap(0.25, 0.5, pink, 0, 0.14, 0); torso.rotation.x = Math.PI / 2; torso.scale.set(1.0, 1, 0.92); body.add(torso);
    [[0.12, 0.2, -0.1], [-0.15, 0.1, 0.15], [0.1, 0.3, 0.2]].forEach(p => body.add(sph(0.08, flat(0x6a4a46, 0.9), p[0] * 1.2, p[1] + 0.12, p[2], 1, 0.3, 1, 8)));
    const hg = new THREE.Group(); hg.position.set(0, 0.2, 0.55); body.add(hg); rig.head = hg;
    hg.add(sph(0.18, pink, 0, 0.02, 0.03, 0.95, 0.95, 1.05, 16));
    const snout = cyl(0.07, 0.075, 0.09, dpink, 0, -0.03, 0.2, 14); snout.rotation.x = Math.PI / 2; hg.add(snout);
    [-1, 1].forEach(s => { hg.add(sph(0.012, flat(0x2a1a18, 0.5), s * 0.025, -0.03, 0.25, 1, 1, 0.5, 6)); hg.add(sph(0.012, flat(0x0b0b0b, 0.2), s * 0.09, 0.08, 0.15, 1, 1, 0.5, 6));
      const ear = cone(0.075, 0.13, dpink, s * 0.1, 0.17, 0.0, 4); ear.rotation.set(0.9, 0, -s * 0.5); hg.add(ear); rig.ears.push({ m: ear, s }); });
    const tail = torus(0.035, 0.008, pink, 0, 0.3, -0.58, 0); tail.scale.set(1, 1.3, 1); body.add(tail); rig.tail = tail;
    const L = 0.28; rig.legs = [leg(body, 0.13, 0.02, 0.3, L + 0.1, 0.05, pink, hoof), leg(body, -0.13, 0.02, 0.3, L + 0.1, 0.05, pink, hoof), leg(body, 0.13, 0.02, -0.3, L + 0.1, 0.055, pink, hoof), leg(body, -0.13, 0.02, -0.3, L + 0.1, 0.055, pink, hoof)];
    body.position.y = 0.38; rig.stride = [1.0, 1.8]; rig.speed = 0.8; rig.hip = 0.38;
  } else { // chicken
    const red = flat(0xa8431f, 0.9), dark = flat(0x1f2a1e, 0.6, 0.2), yellow = flat(0xe0a526, 0.6), comb = flat(0xc4161c, 0.5);
    body.position.y = 0.24;
    body.add(sph(0.12, red, 0, 0.08, 0, 0.82, 0.95, 1.25, 14));
    [-1, 1].forEach(s => { const wing = sph(0.1, flat(0x8f3417, 0.9), s * 0.095, 0.1, -0.02, 0.25, 0.75, 1.2, 10); wing.rotation.z = s * 0.15; body.add(wing); });
    for (let i = 0; i < 5; i++) { const f = cone(0.03, 0.2, dark, (i - 2) * 0.035, 0.2, -0.2, 5); f.rotation.set(-1.0 - Math.abs(i - 2) * 0.1, 0, (i - 2) * 0.22); body.add(f); }
    const hg = new THREE.Group(); hg.position.set(0, 0.13, 0.1); body.add(hg); rig.head = hg;
    const neck = cap(0.04, 0.07, red, 0, 0.07, 0.03); neck.rotation.x = 0.25; hg.add(neck);
    hg.add(sph(0.045, red, 0, 0.17, 0.06, 1, 1, 1.1, 10));
    const beak = cone(0.014, 0.05, yellow, 0, 0.165, 0.12, 5); beak.rotation.x = Math.PI / 2; hg.add(beak);
    for (let i = 0; i < 3; i++) hg.add(sph(0.014, comb, 0, 0.22 - Math.abs(i - 1) * 0.006, 0.04 + i * 0.022, 0.6, 1.3, 0.9, 6));
    hg.add(sph(0.014, comb, 0, 0.13, 0.095, 0.7, 1.4, 0.7, 6));
    [-1, 1].forEach(s => hg.add(sph(0.007, flat(0x0b0b0b, 0.2), s * 0.035, 0.18, 0.08, 1, 1, 1, 6)));
    const L = 0.2; rig.legs = [];
    [0.045, -0.045].forEach(x => { const g = new THREE.Group(); g.position.set(x, 0.1, 0.0); body.add(g); g.add(cyl(0.008, 0.008, L, yellow, 0, -L / 2, 0, 5)); for (let k = -1; k <= 1; k++) { const toe = box(0.01, 0.008, 0.05, yellow, k * 0.02, -L, 0.02); toe.rotation.y = k * 0.4; g.add(toe); } rig.legs.push(g); });
    rig.stride = [0.4, 0.8]; rig.speed = 0.6; rig.hip = 0.24; rig.biped = true;
  }
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return rig;
}

const A0 = () => ({ dy: 0, pitch: 0, l0: 0, l1: 0, l2: 0, l3: 0, hd: 0, hz: 0, hy: 0, tail: 0, ear: 0 });

export function evalAnimal(rig, st, c) {
  const J = A0(); const t = c.t + c.seed; const a = st.action; const k = rig.animal;
  const moving = st.moving || a === 'walk' || a === 'run'; const run = st.run || a === 'run';
  J.dy = 0.004 * S(2.2 * t); J.hy = 0.25 * S(0.5 * t) * S(0.23 * t);
  if (k === 'goat') J.tail = 0.25 * S(7 * t) * Math.max(0, S(0.6 * t));
  if (k === 'pig') { J.tail = 0.1 * S(2 * t); J.ear = 0.1 * S(1.5 * t); }
  if (moving) {
    const ph = c.ph, A = run ? 0.95 : 0.55;
    if (rig.biped) { J.l0 = A * 1.2 * S(ph); J.l1 = -A * 1.2 * S(ph); J.hz = 0.02 * S(ph * 2); J.hd = 0.05; }
    else { J.l0 = A * S(ph); J.l3 = A * S(ph); J.l1 = -A * S(ph); J.l2 = -A * S(ph); J.pitch = run ? 0.06 * S(2 * ph) : 0.02 * S(2 * ph); }
    J.dy += (run ? 0.035 : 0.015) * Math.abs(C(ph)); J.hd += 0.06 * S(2 * ph);
  }
  if (a === 'eat') {
    if (k === 'chicken') { const p = Math.max(0, S(7 * t)); J.hd = 0.2 + 1.0 * p; J.dy -= 0.02 * p; J.pitch = 0.2 * p; }
    else if (k === 'pig') { J.hd = 0.9 + 0.12 * S(6 * t); J.hz = 0.01; }
    else { J.hd = 0.95 + 0.12 * S(4.5 * t); J.pitch = 0.0; }
  }
  return J;
}
const C = Math.cos;

export function mixAnimal(A, B, w) { const J = {}; for (const k in B) J[k] = A[k] + (B[k] - A[k]) * w; return J; }

export function applyAnimal(rig, J) {
  rig.body.position.y = rig.hip + J.dy; rig.body.rotation.x = -J.pitch;
  rig.legs.forEach((l, i) => { l.rotation.x = -J['l' + i]; });
  if (rig.head) { rig.head.rotation.set(J.hd, J.hy, 0); rig.head.position.z = (rig.animal === 'goat' ? 0.38 : rig.animal === 'pig' ? 0.55 : 0.1) + J.hz; }
  if (rig.tail) rig.tail.rotation.z = J.tail;
  rig.ears.forEach(e => { e.m.rotation.z = (rig.animal === 'goat' ? -e.s * 0.5 : -e.s * 0.5) + e.s * J.ear; });
}
