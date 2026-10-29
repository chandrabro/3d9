import * as THREE from 'three';
import { box, cyl, sph, cap, cone, torus, grp, TAU, clamp, lerp, smooth } from './util.js';
import { mat, flat } from './textures.js';
import { buildProp } from './props.js';
import { KEEP_ARMS } from './data.js';

const S = Math.sin, C = Math.cos;
const skin = (c) => flat(c, 0.55, 0, { roughness: 0.55 });

// Per-look configuration (clothing, colours, proportions)
const LOOKS = {
  woman: { skin: 0xbf8459, h: 0.96, female: true, hair: 0x15110e, sari: 0xb3201f, blouse: 0x1f6b3a, w: 0.92 },
  oldman: { skin: 0xa5744d, h: 0.95, female: false, hair: 0xb9b6ae, stoop: 0.13, w: 1.0 },
  mf1: { skin: 0xc6936a, h: 1.0, female: false, hair: 0x15110e, w: 1.0 },
  mf2: { skin: 0xcf9f7a, h: 0.96, female: true, hair: 0x120d0b, w: 0.92 },
};
const WOMAN_VARIANTS = [
  { sari: 0xb3201f, blouse: 0x1f6b3a, skin: 0xbf8459, h: 0.96 }, { sari: 0x1f4f9a, blouse: 0xd9a21b, skin: 0xb27a52, h: 0.93 },
  { sari: 0x7b2f8e, blouse: 0xe8e0c8, skin: 0xc79468, h: 1.0 }, { sari: 0x2a7d4a, blouse: 0xb3201f, skin: 0xa8734d, h: 0.9 },
];

export function buildHuman(lookName, variant = 0) {
  const base = { ...LOOKS[lookName] };
  if (lookName === 'woman' && variant) Object.assign(base, WOMAN_VARIANTS[variant % WOMAN_VARIANTS.length]);
  const L = base, F = L.female, W = L.w;
  const SK = skin(L.skin), HAIR = flat(L.hair, 0.6);
  const root = new THREE.Group(); root.userData.baseScale = L.h; root.scale.setScalar(L.h);
  const body = new THREE.Group(); body.position.y = 0.92; root.add(body);
  const torso = new THREE.Group(); body.add(torso);
  const headG = new THREE.Group(); headG.position.y = 0.58; torso.add(headG);

  // ---------- clothes materials by look ----------
  let topMat, legMat, shoeMat, sleeve = false, legR1 = 0.085, legR2 = 0.065, topRadius = 0.15 * W;
  if (lookName === 'mf1' || lookName === 'mf2') { topMat = flat(0x2e9b4f, 0.8); legMat = flat(0x2c4a7a, 0.85); shoeMat = flat(0xf2f2f2, 0.6); sleeve = true; }
  else if (lookName === 'oldman') { topMat = flat(0xa89b7c, 1.0); legMat = flat(0xa89b7c, 1.0); shoeMat = flat(0x2a2a2a, 0.8); legR1 = 0.105; legR2 = 0.075; topRadius = 0.16; }
  else { topMat = flat(L.blouse, 0.75); legMat = mat('sari', { rx: 1, ry: 2, tint: L.sari, bump: 0.2 }); shoeMat = flat(0x3a2a20, 0.8); legR1 = 0.115; legR2 = 0.1; }

  // ---------- torso ----------
  const tor = cap(topRadius, 0.28, topMat, 0, 0.29); tor.scale.z = 0.72; torso.add(tor);
  const pelvis = sph(0.165 * W, lookName === 'oldman' || lookName === 'woman' ? legMat : flat(0x2c4a7a, 0.85), 0, -0.02, 0, 1, 0.8, 0.78); body.add(pelvis);
  const neck = cyl(0.045, 0.05, 0.08, SK, 0, 0.6, 0, 10); torso.add(neck);

  // ---------- head & face ----------
  const head = sph(0.105, SK, 0, 0.13, 0, 0.95, 1.15, 1.0, 20); headG.add(head);
  const eyeW = flat(0xf4f0e8, 0.3), pupil = flat(0x120c08, 0.2);
  [-1, 1].forEach(s => { headG.add(sph(0.014, eyeW, s * 0.04, 0.155, 0.093, 1, 0.8, 0.6, 8)); headG.add(sph(0.008, pupil, s * 0.04, 0.155, 0.1, 1, 1, 0.6, 8)); headG.add(box(0.04, 0.008, 0.01, HAIR, s * 0.04, 0.178, 0.095)); const ear = sph(0.022, SK, s * 0.1, 0.13, 0, 0.5, 1, 0.8, 8); headG.add(ear); });
  headG.add(sph(0.016, SK, 0, 0.125, 0.105, 1, 1.1, 1.0, 8));
  const mouth = sph(0.024, flat(0x5a1f1b, 0.4), 0, 0.075, 0.097, 1, 0.25, 0.4, 10); headG.add(mouth);

  // hair / headwear / accessories per look
  if (lookName === 'oldman') {
    const hairCap = sph(0.108, HAIR, 0, 0.14, -0.01, 0.97, 1.0, 1.0, 16); hairCap.scale.y = 1.05; hairCap.position.y = 0.15; hairCap.position.z = -0.015; headG.add(hairCap);
    const topi = cyl(0.108, 0.098, 0.14, mat('dhaka', { rx: 3, ry: 1, bump: 0.2 }), 0, 0.255, 0, 24); topi.rotation.x = -0.12; headG.add(topi);
    const top = cyl(0.108, 0.108, 0.01, flat(0x2a2a2a, 0.6), 0, 0.325, -0.01, 24); top.rotation.x = -0.12; headG.add(top);
    headG.add(sph(0.05, flat(0xcfcac0, 0.8), 0, 0.045, 0.085, 1.1, 0.9, 0.8, 10)); // stubble/beard
    headG.add(box(0.07, 0.012, 0.02, flat(0xd8d4cc, 0.8), 0, 0.1, 0.108));        // moustache
  } else if (F) {
    const hairCap = sph(0.11, HAIR, 0, 0.145, -0.012, 1, 1.08, 1.05, 16); headG.add(hairCap);
    if (lookName === 'woman') headG.add(sph(0.06, HAIR, 0, 0.2, -0.1, 1, 1, 1, 12));                // bun
    else headG.add(cap(0.035, 0.18, HAIR, 0, 0.08, -0.12, 8));                                     // ponytail
    headG.add(sph(0.009, flat(0xc1272d, 0.4), 0, 0.185, 0.102, 1, 1, 0.5, 8));                     // tika
    if (lookName === 'woman') { headG.add(sph(0.007, flat(0xe0b040, 0.3, 1), 0.02, 0.12, 0.106, 1, 1, 1, 6)); [-1, 1].forEach(s => headG.add(sph(0.01, flat(0xe0b040, 0.3, 1), s * 0.105, 0.09, 0, 1, 1, 1, 6))); }
  } else {
    const hairCap = sph(0.108, HAIR, 0, 0.15, -0.012, 1, 1.0, 1.04, 16); headG.add(hairCap);
  }
  if (lookName === 'mf1') { // glasses
    const gl = flat(0x1a1a1a, 0.3, 0.4); [-1, 1].forEach(s => headG.add(torus(0.026, 0.003, gl, s * 0.04, 0.155, 0.1, 0)));
  }
  if (lookName === 'woman') { // potey necklace
    torso.add(torus(0.075, 0.008, flat(0x1f8a4a, 0.4), 0, 0.55, 0.03, Math.PI / 2.4));
  }

  // ---------- arms ----------
  function makeArm(side) {
    const s = side === 'L' ? 1 : -1;
    const sh = new THREE.Group(); sh.position.set(s * (0.19 * W + 0.02), 0.5, 0); torso.add(sh);
    sh.add(sph(0.058, sleeve || lookName === 'oldman' || F ? topMat : SK, 0, 0, 0, 1, 1, 1, 10));
    const upper = cap(0.045, 0.2, (sleeve || lookName === 'oldman' || F) ? topMat : SK, 0, -0.145); sh.add(upper);
    if (sleeve) { sh.add(torus(0.047, 0.01, flat(0xf08a24, 0.6), 0, -0.2, 0, Math.PI / 2)); upper.scale.set(1, 0.7, 1); upper.position.y = -0.11; sh.add(cap(0.04, 0.12, SK, 0, -0.21)); }
    const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
    el.add(sph(0.04, (lookName === 'oldman' ? topMat : SK), 0, 0, 0, 1, 1, 1, 8));
    el.add(cap(0.036, 0.19, lookName === 'oldman' ? topMat : SK, 0, -0.135));
    const hand = new THREE.Group(); hand.position.y = -0.28; el.add(hand);
    hand.add(sph(0.04, SK, 0, -0.03, 0, 0.9, 1.3, 0.7, 10));
    if (F && lookName === 'woman') { hand.add(torus(0.04, 0.008, flat(0x1f8a4a, 0.3), 0, -0.005, 0, Math.PI / 2)); hand.add(torus(0.04, 0.008, flat(0xb3201f, 0.3), 0, 0.012, 0, Math.PI / 2)); }
    return { sh, el, hand };
  }
  const armL = makeArm('L'), armR = makeArm('R');

  // ---------- legs ----------
  function makeLeg(side) {
    const s = side === 'L' ? 1 : -1;
    const hip = new THREE.Group(); hip.position.set(s * 0.09 * W, 0, 0); body.add(hip);
    hip.add(cap(legR1, 0.35, legMat, 0, -0.22));
    const kn = new THREE.Group(); kn.position.y = -0.44; hip.add(kn);
    kn.add(sph(legR1 * 0.9, legMat, 0, 0, 0, 1, 1, 1, 8));
    kn.add(cap(legR2, 0.35, legMat, 0, -0.22));
    const foot = new THREE.Group(); foot.position.y = -0.44; kn.add(foot);
    const shoe = box(0.09, 0.08, 0.25, shoeMat, 0, 0, 0.05); foot.add(shoe);
    if (lookName === 'woman' || lookName === 'oldman') { foot.add(box(0.085, 0.01, 0.1, SK, 0, 0.042, 0.13)); }
    if (lookName === 'woman') kn.add(torus(legR2 + 0.004, 0.012, flat(0xe3b341, 0.4, 0.6), 0, -0.42, 0, Math.PI / 2));
    return { hip, kn };
  }
  const legL = makeLeg('L'), legR = makeLeg('R');

  // ---------- outfit extras ----------
  if (lookName === 'mf1' || lookName === 'mf2') {
    const coll = torus(0.075, 0.022, flat(0xf08a24, 0.6), 0, 0.575, 0.0, Math.PI / 2); coll.scale.set(1, 1.1, 1.4); torso.add(coll);
    torso.add(box(0.13, 0.03, 0.01, flat(0xf08a24, 0.6), 0, 0.5, 0.108)); // placket
    // ID card on lanyard
    torso.add(box(0.012, 0.22, 0.004, flat(0x222222, 0.6), -0.03, 0.46, 0.112)); torso.add(box(0.06, 0.085, 0.006, flat(0xf2f2f2, 0.5), -0.03, 0.31, 0.114));
    torso.add(box(0.06, 0.008, 0.007, flat(0xf08a24, 0.5), -0.03, 0.345, 0.115));
    body.add(box(0.31 * W, 0.035, 0.2, flat(0x4a3320, 0.6), 0, 0.075, 0)); // belt
  }
  if (lookName === 'oldman') {
    // daura kurta skirt + waistcoat
    const skirt = cyl(0.19, 0.225, 0.52, topMat, 0, -0.22, 0, 20); skirt.scale.z = 0.8; body.add(skirt);
    const vest = cap(topRadius + 0.012, 0.2, flat(0x23201e, 0.8), 0, 0.34); vest.scale.z = 0.76; torso.add(vest);
    torso.add(box(0.015, 0.34, 0.01, flat(0x7d735c, 0.8), 0, 0.33, 0.122));
  }
  if (lookName === 'woman') {
    // pallu draped from left shoulder to right hip, plus waist wrap
    const pallu = box(0.2, 0.62, 0.012, mat('sari', { rx: 1, ry: 2, tint: L.sari, bump: 0.2 }), 0, 0.3, 0.115); pallu.rotation.z = -0.55; pallu.position.x = -0.02; torso.add(pallu);
    const back = box(0.26, 0.5, 0.01, mat('sari', { rx: 1, ry: 2, tint: L.sari, bump: 0.2 }), 0.09, 0.28, -0.11); back.rotation.z = 0.1; torso.add(back);
    const wrap = cyl(0.17, 0.19, 0.2, mat('sari', { rx: 2, ry: 1, tint: L.sari, bump: 0.2 }), 0, -0.1, 0, 20); wrap.scale.z = 0.8; body.add(wrap);
  }

  // ---------- held items (hidden until an action shows them) ----------
  const items = {};
  const addItem = (slot, name, builder, pos, rot, scale = 1) => { const it = builder(); it.position.set(...pos); it.rotation.set(...rot); it.scale.setScalar(scale); it.visible = false; slot.add(it); items[slot === armL.hand ? 'L' + name : 'R' + name] = it; };
  [armL.hand, armR.hand].forEach(h => {
    addItem(h, 'notes', () => buildProp('money_notes'), [0, -0.06, 0.03], [0.3, 0, 0], 1.2);
    addItem(h, 'notebook', () => buildProp('notebook'), [0, -0.05, 0.08], [1.0, 0, 0], 0.9);
    addItem(h, 'pen', () => grp(cyl(0.006, 0.006, 0.14, flat(0x1a1a8a, 0.4), 0, 0, 0, 6)), [0, -0.05, 0.03], [0.6, 0, 0]);
    addItem(h, 'kodalo', () => buildProp('kodalo'), [0, 0.2, 0], [Math.PI / 2 + 0.05, 0, 0], 1);
    addItem(h, 'hasiya', () => buildProp('hasiya'), [0, -0.05, 0], [Math.PI / 2, 0, 0], 1.1);
    addItem(h, 'broom', () => buildProp('broom'), [0, -0.5, 0], [-0.8, 0, 0], 1);
    addItem(h, 'nanglo', () => buildProp('nanglo'), [0, -0.1, 0.18], [-0.5, 0, 0], 0.6);
    addItem(h, 'rice', () => buildProp('rice_bundle'), [0, -0.15, 0.02], [1.2, 0, 0], 0.7);
    addItem(h, 'strap', () => cyl(0.012, 0.012, 0.5, flat(0x6b4b1f, 0.9), 0, 0, 0, 6), [0, -0.1, 0], [0, 0, 0]);
  });
  const doko = buildProp('doko'); doko.position.set(0, 0.05, -0.2); doko.rotation.x = -0.2; doko.scale.setScalar(0.85); doko.visible = false; torso.add(doko);
  const rice = new THREE.Group(); const grain = flat(0xd8b445, 0.8); for (let i = 0; i < 14; i++) rice.add(sph(0.05, grain, (Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4, 1, 0.6, 1, 6)); rice.position.y = 0.55; doko.add(rice);
  const strapBand = torus(0.12, 0.012, flat(0x6b4b1f, 0.9), 0, 0.1, 0.0, Math.PI / 2); strapBand.visible = false; headG.add(strapBand);

  // ---------- fx (hole, seedlings, bucket, grain) ----------
  const fx = new THREE.Group(); root.add(fx);
  const hole = new THREE.Group(); const pit = sph(0.28, flat(0x1b120a, 1), 0, 0.004, 0, 1, 0.01, 1, 20); const mound = sph(0.3, mat('soil', { rx: 1, ry: 1 }), 0, 0, 0, 1, 0.1, 1, 16); mound.position.set(0.2, 0, -0.15); hole.add(mound); hole.add(pit); hole.position.set(0, 0.0, 0.75); hole.visible = false; fx.add(hole);
  const seedlings = []; const sg = flat(0x5faa2b, 0.8);
  for (let i = 0; i < 8; i++) { const sd = new THREE.Group(); for (let k = 0; k < 3; k++) { const b = cone(0.008, 0.22, sg, (k - 1) * 0.012, 0.11, 0, 4); b.rotation.z = (k - 1) * 0.3; sd.add(b); } sd.position.set((i - 3.5) * 0.15, 0, 0.55 + (i % 2) * 0.12); sd.visible = false; fx.add(sd); seedlings.push(sd); }
  const bucket = buildProp('bucket'); bucket.position.set(0, 0, 0.5); bucket.scale.setScalar(0.9); bucket.visible = false; fx.add(bucket);
  const grains = []; const gm = flat(0xe6c350, 0.7); for (let i = 0; i < 10; i++) { const g = sph(0.012, gm, 0, 0, 0, 1, 1, 1, 5); g.visible = false; fx.add(g); grains.push(g); }

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  return {
    kind: 'human', look: lookName, root, body, torso, head: headG, mouth, stoop: L.stoop || 0, female: F,
    shL: armL.sh, elL: armL.el, shR: armR.sh, elR: armR.el, hipL: legL.hip, kL: legL.kn, hipR: legR.hip, kR: legR.kn,
    items, doko, strapBand, fx: { hole, seedlings, bucket, grains },
  };
}

/* ======================= POSES ======================= */
const J0 = () => ({ dy: 0, tl: 0, tt: 0, ts: 0, hd: 0, hy: 0, sLp: 0, sLa: 0.08, eL: 0.12, sRp: 0, sRa: 0.08, eR: 0.12, hLp: 0, hLa: 0, kL: 0, hRp: 0, hRa: 0, kR: 0, mouth: 0, iL: null, iR: null, back: 0, fx: null, fxp: 0 });

function legsWalk(J, ph, run) {
  const A = run ? 0.95 : 0.5, K = run ? 1.7 : 1.0, s = S(ph), c = C(ph);
  J.hLp = A * s; J.hRp = -A * s; J.kL = K * Math.max(0, c); J.kR = K * Math.max(0, -c);
  J.dy = -0.025 * (1 - C(2 * ph)) * (run ? 1.6 : 1); J.hLa = J.hRa = 0.02;
  if (run) J.tl = Math.max(J.tl, 0.2);
}
function armsWalk(J, ph, run) {
  const s = S(ph), A = run ? 0.95 : 0.48;
  J.sLp = -A * s; J.sRp = A * s; J.eL = run ? 1.4 : 0.22 + 0.2 * Math.max(0, s); J.eR = run ? 1.4 : 0.22 + 0.2 * Math.max(0, -s);
}
export const mouthAmount = (t, seed = 0) => clamp(0.25 + 0.55 * Math.abs(S(t * 13 + seed) * S(t * 7.3 + seed * 2)) + 0.25 * Math.max(0, S(t * 3.1 + seed)), 0, 1);
function speakMouth(J, t, seed = 0) { J.mouth = mouthAmount(t, seed); }

const POSES = {
  idle(J, c) { const t = c.t; J.tl = 0.012 + 0.01 * S(1.6 * t); J.ts = 0.02 * S(0.5 * t); J.hy = 0.12 * S(0.4 * t + c.seed); J.sLa = 0.1 + 0.02 * S(1.6 * t); J.sRa = 0.1 + 0.02 * S(1.6 * t + 1); J.eL = 0.15; J.eR = 0.15; J.sLp = 0.03 * S(0.9 * t); J.sRp = -0.03 * S(0.9 * t); },
  stand(J, c) { POSES.idle(J, c); },
  walk(J, c) { POSES.idle(J, c); },
  run(J, c) { POSES.idle(J, c); },
  sit(J, c) { POSES.idle(J, c); },
  sit_gundro(J, c) { POSES.idle(J, c); },
  talk(J, c) {
    const t = c.t + c.seed; POSES.idle(J, c);
    J.sRp = 0.55 + 0.28 * S(2.2 * t); J.eR = 1.05 + 0.4 * S(3.1 * t + 1); J.sRa = 0.3; J.sLp = 0.28 + 0.2 * S(1.7 * t + 2); J.eL = 0.95 + 0.3 * S(2.5 * t); J.hd = 0.05 * S(2 * t); J.hy = 0.18 * S(0.7 * t); J.tt = 0.05 * S(0.9 * t);
    speakMouth(J, c.t, c.seed);
  },
  wave(J, c) { POSES.idle(J, c); J.sRp = 0.15; J.sRa = 2.0 + 0.3 * S(7 * c.t); J.eR = 0.35 + 0.3 * S(7 * c.t + 1.2); J.hy = 0.25; J.hd = -0.05; },
  hand_money(J, c) { POSES.idle(J, c); J.sRp = 1.25; J.sRa = 0.1; J.eR = 0.3 + 0.05 * S(2 * c.t); J.iR = 'notes'; J.tl = 0.08; J.hd = 0.1; J.sLp = 0.1; },
  receive_money(J, c) { POSES.idle(J, c); J.sRp = J.sLp = 1.1; J.sRa = -0.12; J.sLa = -0.12; J.eR = J.eL = 0.85; J.tl = 0.1; J.hd = 0.2; },
  count_money(J, c) { const t = c.t; POSES.idle(J, c); J.sLp = 0.9; J.eL = 1.8; J.sRp = 1.0; J.eR = 1.6 + 0.4 * S(9 * t); J.sRa = 0.15; J.iL = 'notes'; J.hd = 0.5; J.tl = 0.15; J.hy = 0; },
  write(J, c) { const t = c.t; POSES.idle(J, c); J.sRp = 0.95; J.eR = 1.25 + 0.14 * S(11 * t); J.sLp = 0.85; J.eL = 1.45; J.iL = 'notebook'; J.iR = 'pen'; J.hd = 0.55; J.tl = 0.2; J.hy = 0; },
  dig(J, c) {
    const u = (c.el % 2.2) / 2.2; const a = u < 0.55 ? smooth(u / 0.55) : 1 - smooth((u - 0.55) / 0.12);
    const sp = lerp(0.55, 2.3, a); J.sRp = sp; J.sLp = sp - 0.12; J.eR = J.eL = 0.35; J.tl = 0.25 + 0.55 * (1 - a); J.hd = -0.25; J.iR = 'kodalo';
    J.hLp = 0.35; J.hRp = -0.2; J.kL = 0.5; J.kR = 0.2; J.dy = -0.06; J.fx = 'hole'; J.fxp = clamp(c.el / 12, 0, 1); J.sRa = J.sLa = 0.05;
  },
  plant_rice(J, c) {
    const t = c.t; J.tl = 1.1 + 0.05 * S(2 * t); J.hd = -0.5; J.sLp = 1.1 + 0.18 * S(2.2 * t); J.sRp = 1.1 + 0.18 * S(2.2 * t + 1.6); J.eL = 0.15; J.eR = 0.3;
    J.hLp = 0.22; J.hRp = 0.22; J.kL = 0.35; J.kR = 0.35; J.dy = -0.1; J.fx = 'seedlings'; J.fxp = c.el / 1.3; J.iL = 'rice';
  },
  harvest(J, c) { const t = c.t; J.tl = 0.85; J.hd = -0.35; J.sLp = 1.0; J.eL = 0.5; J.iL = 'rice'; const cut = S(3.5 * t); J.sRp = 1.05 + 0.35 * cut; J.eR = 0.6 + 0.35 * cut; J.iR = 'hasiya'; J.hLp = 0.2; J.hRp = 0.2; J.kL = 0.4; J.kR = 0.4; J.dy = -0.07; },
  carry_doko(J, c) { POSES.idle(J, c); J.back = 1; J.tl = 0.28; J.hd = -0.1; J.sLp = 0.35; J.sRp = 0.35; J.eL = 1.1; J.eR = 1.1; J.sLa = 0.35; J.sRa = 0.35; },
  sweep(J, c) { const t = c.t; J.tl = 0.38; J.hd = 0.2; J.sRp = 0.95 + 0.22 * S(3 * t); J.sLp = 0.75 + 0.22 * S(3 * t); J.eR = 0.35; J.eL = 0.7; J.tt = 0.28 * S(3 * t); J.iR = 'broom'; J.hLp = 0.12; J.hRp = -0.1; J.kL = 0.2; },
  feed_chicken(J, c) {
    const u = (c.el % 2.0) / 2.0; const th = u < 0.35 ? smooth(u / 0.35) : u < 0.5 ? 1 : 1 - smooth((u - 0.5) / 0.5);
    POSES.idle(J, c); J.tl = 0.2; J.hd = 0.3; J.sLp = 0.85; J.eL = 1.3; J.iL = 'nanglo'; J.sRp = lerp(0.35, 1.35, th); J.eR = lerp(1.2, 0.3, th); J.sRa = 0.2; J.fx = 'grain'; J.fxp = u - 0.3;
  },
  milk_goat(J, c) { const t = c.t; J.dy = -0.48; J.hLp = J.hRp = 1.4; J.kL = J.kR = 2.1; J.hLa = J.hRa = 0.12; J.tl = 0.35; J.hd = 0.1; J.sLp = 1.0 + 0.2 * S(7 * t); J.sRp = 1.0 - 0.2 * S(7 * t); J.eL = J.eR = 0.75; J.sLa = J.sRa = 0.05; J.fx = 'bucket'; },
};

function legsSeat(J, seat) {
  if (seat === 'chair') { J.dy = -0.46; J.hLp = J.hRp = 1.5; J.kL = J.kR = 1.5; J.hLa = J.hRa = 0.05; if (J.tl < 0.02) J.tl = 0.02; }
  else { J.dy = -0.83; J.hLp = J.hRp = 0.85; J.hLa = J.hRa = 0.7; J.kL = J.kR = 2.35; }
}

export function evalHuman(st, c) {
  const J = J0(); const a = st.action;
  // a 'talk' action only gestures/moves the mouth while the character is actually speaking
  (a === 'talk' && !st.talking ? POSES.idle : (POSES[a] || POSES.idle))(J, c);
  if (st.seat) legsSeat(J, st.seat);
  else if (st.moving || a === 'walk' || a === 'run') { const run = st.run || a === 'run'; legsWalk(J, c.ph, run); if (!KEEP_ARMS.has(a)) armsWalk(J, c.ph, run); }
  if (st.talking && a !== 'talk') speakMouth(J, c.t, c.seed);
  if (st.talking && (a === 'idle' || a === 'stand') && !st.moving && !st.seat) { const t = c.t + c.seed; J.sRp = 0.5 + 0.25 * S(2.2 * t); J.eR = 1.0 + 0.4 * S(3.1 * t + 1); J.sRa = 0.3; J.hy = 0.15 * S(0.7 * t); }
  if (st.talking && st.seat && (a === 'idle' || a === 'sit' || a === 'sit_gundro' || a === 'stand')) { const t = c.t + c.seed; J.sRp = 0.7 + 0.2 * S(2.2 * t); J.eR = 1.2 + 0.3 * S(3.1 * t + 1); }
  return J;
}

const NUM_KEYS = Object.keys(J0()).filter(k => typeof J0()[k] === 'number');
export function mixPose(A, B, w) {
  const J = { ...B }; for (const k of NUM_KEYS) J[k] = lerp(A[k], B[k], w);
  if (w < 0.5) { J.iL = A.iL; J.iR = A.iR; J.fx = A.fx; J.fxp = A.fxp; J.back = A.back; } return J;
}

export function applyHuman(rig, J) {
  rig.body.position.y = 0.92 + J.dy;
  rig.torso.rotation.set(J.tl + rig.stoop, J.tt, J.ts);
  rig.head.rotation.set(J.hd - rig.stoop * 0.6, J.hy, 0);
  rig.shL.rotation.set(-J.sLp, 0, J.sLa); rig.shR.rotation.set(-J.sRp, 0, -J.sRa);
  rig.elL.rotation.x = -J.eL; rig.elR.rotation.x = -J.eR;
  rig.hipL.rotation.set(-J.hLp, 0, J.hLa); rig.hipR.rotation.set(-J.hRp, 0, -J.hRa);
  rig.kL.rotation.x = J.kL; rig.kR.rotation.x = J.kR;
  rig.mouth.scale.y = 0.22 + J.mouth * 1.1; rig.mouth.scale.x = 1 - J.mouth * 0.15;
  for (const k in rig.items) rig.items[k].visible = (k[0] === 'L' ? J.iL : J.iR) === k.slice(1);
  rig.doko.visible = rig.strapBand.visible = J.back > 0.5;
  const f = rig.fx;
  f.hole.visible = J.fx === 'hole'; if (f.hole.visible) { const p = Math.max(0.02, J.fxp); f.hole.scale.set(p, 1, p); f.hole.children[1].scale.y = 0.01 + 0.5 * p; }
  f.seedlings.forEach((s, i) => { s.visible = J.fx === 'seedlings' && i < Math.floor(J.fxp); });
  f.bucket.visible = J.fx === 'bucket';
  f.grains.forEach((g, i) => {
    if (J.fx !== 'grain') { g.visible = false; return; }
    const ti = (J.fxp * 2.0 - 0.2) - i * 0.04; if (ti < 0 || ti > 0.8) { g.visible = false; return; }
    g.visible = true; const spread = ((i % 5) - 2) * 0.28 * ti; g.position.set(-0.2 + spread, Math.max(0.01, 1.0 + 1.3 * ti - 4.9 * ti * ti), 0.3 + 1.7 * ti);
  });
}
