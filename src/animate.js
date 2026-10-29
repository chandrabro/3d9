import { CHARS } from './data.js';
import { charState, isTalking } from './model.js';
import { evalHuman, mixPose, applyHuman, buildHuman } from './humans.js';
import { evalAnimal, mixAnimal, applyAnimal, buildAnimal } from './animals.js';
import { smooth, TAU } from './util.js';
import * as THREE from 'three';

const BLEND = 0.35;
const GROUP_OFFSETS = [[-0.75, 0.0, 0], [0.05, -0.55, 1], [0.85, 0.1, 2], [0.2, 0.85, 3]];

export function buildCharacter(ch) {
  const d = CHARS[ch.type];
  if (d.kind === 'animal') return buildAnimal(d.animal);
  if (d.kind === 'group') {
    const root = new THREE.Group(); const members = [];
    GROUP_OFFSETS.forEach((o, i) => { const m = buildHuman('woman', i); m.root.position.set(o[0], 0, o[1]); m.root.rotation.y = (i - 1.5) * 0.12; root.add(m.root); members.push({ rig: m, i }); });
    return { kind: 'group', root, members };
  }
  return buildHuman(d.look, ch.variant || 0);
}

function strideOf(rig, run) { return rig.kind === 'animal' ? rig.stride[run ? 1 : 0] : (run ? 2.6 : 1.5); }

function stateTuple(s, talking) { return { action: s.action, seat: s.seat, moving: s.moving, run: s.run, talking }; }

function evalRig(rig, st, c) { return rig.kind === 'animal' ? evalAnimal(rig, st, c) : evalHuman(st, c); }
function mix(rig, a, b, w) { return rig.kind === 'animal' ? mixAnimal(a, b, w) : mixPose(a, b, w); }
function apply(rig, J) { rig.kind === 'animal' ? applyAnimal(rig, J) : applyHuman(rig, J); }

// Poses one rig (single body) at time t given its character state; handles blending between actions deterministically.
function poseRig(rig, scene, ch, s, t, talking, seed, phOff) {
  const ph0 = s.moving ? (s.dist * TAU / strideOf(rig, s.run)) : t * TAU * (rig.kind === 'animal' ? 1.1 : 0.9);
  const c = { t, el: Math.max(0, s.elapsed), ph: ph0 + phOff, seed };
  const cur = evalRig(rig, stateTuple(s, talking), c);
  const age = t - s.boundary;
  if (age < BLEND && s.boundary > -1e8) {
    const prev = charState(scene, ch, s.boundary - 1e-3);
    const pc = { ...c, el: Math.max(0, t - prev.actT), ph: (prev.moving ? ph0 : t * TAU * 0.9) + phOff };
    const old = evalRig(rig, stateTuple(prev, talking), pc);
    return mix(rig, old, cur, smooth(age / BLEND));
  }
  return cur;
}

// Evaluate and apply the whole character at time t. Returns state.
export function poseCharacter(rig, scene, ch, t, heightAt) {
  const s = charState(scene, ch, t); const talking = isTalking(scene, ch, t);
  const root = rig.root; const y = heightAt(s.x, s.z);
  root.position.set(s.x, y, s.z); root.rotation.y = s.h;
  const sc = (ch.scale || 1); const base = rig.kind === 'human' ? root.userData.baseScale || 1 : 1;
  if (rig.kind === 'group') { root.scale.setScalar(sc); rig.members.forEach(m => { const J = poseRig(m.rig, scene, ch, s, t + m.i * 0.37, talking && m.i % 2 === 0, m.i * 3.7, m.i * 0.9); apply(m.rig, J); }); }
  else { root.scale.setScalar(base * sc); apply(rig, poseRig(rig, scene, ch, s, t, talking, ch.id.length * 1.7, 0)); }
  return s;
}
