// Project data model + pure evaluation of the timeline (no three.js here).
import { ENVS, CHARS, ACTIONS, DEFAULT_VOICES } from './data.js';
import { polyline, lerpAngle, smooth, clamp, lerp } from './util.js';
import { defaultSubtitles } from './subtitles.js';

let _id = Date.now() % 100000;
export const uid = (p = 'id') => `${p}${(_id++).toString(36)}`;
const rad = (d) => d * Math.PI / 180;

export function newProject() {
  return { version: 1, name: 'My Nepali Story', fade: true, aspect: '16:9', bubbles: true, bubbleStyle: 'rounded', watermark: '', subtitles: defaultSubtitles(), voices: structuredClone(DEFAULT_VOICES), scenes: [newScene('village')] };
}

export function newScene(envId) {
  const def = ENVS[envId];
  return {
    id: uid('s'), env: envId, name: def.name, duration: 20, tod: 'morning', fog: 1,
    camera: { start: { pos: [...def.cam.pos], target: [...def.cam.target], fov: def.cam.fov }, end: null },
    chars: [], props: [], dialogs: [], narration: null, music: null,
  };
}

export function speedFor(type) { const d = CHARS[type]; if (d.kind === 'animal') return d.animal === 'chicken' ? 0.6 : d.animal === 'pig' ? 0.8 : 0.9; return 1.2; }

export function newChar(type, scene) {
  const d = CHARS[type]; const n = scene.chars.filter(c => c.type === type).length;
  const cam = scene.camera.start; const tx = cam.target[0], tz = cam.target[2];
  return { id: uid('c'), type, name: d.name + (n ? ` ${n + 1}` : ''), x: tx + (scene.chars.length - 2) * 1.6, z: tz + 3.0, facing: 0, endFacing: null, scale: 1, speed: speedFor(type), path: [], pathStart: 0, actions: [{ t: 0, action: 'idle', seat: '' }], glb: null };
}
export function newProp(type, scene) {
  const cam = scene.camera.start; return { id: uid('p'), type, x: cam.target[0] + (scene.props.length % 4) * 0.7 - 1, y: 0, z: cam.target[2] + 2.5, ry: 0, scale: 1, glb: null };
}
export function newDialog(scene) {
  const last = scene.dialogs.reduce((m, d) => Math.max(m, d.t + (d.dur || 2)), 0);
  return { id: uid('d'), charId: scene.chars[0]?.id || null, t: Math.min(scene.duration - 1, Math.round(last * 10) / 10), text: '', lang: 'ne', voice: 'auto', source: 'tts', audioKey: null, audioName: '', dur: 0 };
}

export const dialogDur = (d) => d.dur > 0 ? d.dur : Math.max(1.5, (d.text || '').trim().split(/\s+/).filter(Boolean).length * 0.42);

export function actionDef(kind, id) { return (kind === 'animal' ? ACTIONS.animal : ACTIONS.human).find(a => a.id === id) || ACTIONS.human[0]; }

// -- character state at time t (position, heading, action, seat) --
export function charState(scene, ch, t) {
  const def = CHARS[ch.type]; const kind = def.kind === 'animal' ? 'animal' : 'human';
  const pts = [[ch.x, ch.z], ...(ch.path || [])]; const poly = polyline(pts);
  const ts = ch.pathStart || 0; const speed = Math.max(0.05, ch.speed || 1);
  let x = ch.x, z = ch.z, h = rad(ch.facing), moving = false, dist = 0, arrive = null;
  if (poly.len > 0.01) {
    dist = Math.max(0, (t - ts)) * speed; arrive = ts + poly.len / speed;
    const p = poly.at(dist); x = p.x; z = p.z;
    if (dist > 0 && dist < poly.len) { moving = true; const ph = p.h ?? h; h = lerpAngle(rad(ch.facing), ph, smooth((t - ts) / 0.4)); }
    else if (dist >= poly.len) { const lastH = poly.segs[poly.segs.length - 1].h; h = lastH; if (ch.endFacing !== null && ch.endFacing !== undefined && ch.endFacing !== '') h = lerpAngle(lastH, rad(+ch.endFacing), smooth((t - arrive) / 0.5)); }
  }
  const acts = ch.actions && ch.actions.length ? ch.actions : [{ t: 0, action: 'idle', seat: '' }];
  let cur = acts[0]; for (const a of acts) if (a.t <= t && a.t >= cur.t) cur = a; if (cur.t > t) cur = { t: -1e9, action: 'idle', seat: '' };
  const ad = actionDef(kind, cur.action);
  let seat = kind === 'human' ? (ad.seat || cur.seat || '') : '';
  if (moving) seat = '';
  const run = moving && speed > 2.2;
  return { x, z, h, moving, run, dist, action: cur.action, seat, elapsed: t - Math.max(cur.t, -1), kind, actT: cur.t, boundary: boundaryBefore(ch, ts, arrive, t) };
}
function boundaryBefore(ch, ts, arrive, t) {
  let b = -1e9; for (const a of ch.actions || []) if (a.t <= t && a.t > b) b = a.t;
  if (ch.path?.length) { if (ts <= t && ts > b) b = ts; if (arrive !== null && arrive <= t && arrive > b) b = arrive; }
  return b;
}

// While browser voices are playing, speechState.map holds the REAL state of each line ('pending' | 'speaking' | 'done'),
// so the mouth opens exactly when the voice starts and closes when it stops. Otherwise the line's timing is used.
export const speechState = { map: null };
export function isTalking(scene, ch, t) {
  return scene.dialogs.some(d => { if (d.charId !== ch.id) return false; const st = speechState.map?.get(d.id); if (st) return st === 'speaking'; return t >= d.t && t < d.t + dialogDur(d); });
}

// -- camera --
// Auto close-up: while a character speaks, cut to a face-framed shot of that speaker (slow push-in).
function speakerShot(scene, t) {
  let d = null;
  for (const x of scene.dialogs) {
    if (!x.charId || !(x.text || '').trim()) continue;
    const st = speechState.map?.get(x.id), on = (st === 'speaking' || st === 'pending') ? t >= x.t - 2.5 : (t >= x.t && t < x.t + dialogDur(x) + 1.2);
    if (on && (!d || x.t > d.t)) d = x; // hold the shot briefly between lines
  }
  const ch = d && scene.chars.find(c => c.id === d.charId); if (!ch || CHARS[ch.type].kind !== 'human') return null;
  const st = charState(scene, ch, t), sc = ch.scale || 1, headY = (ch.type === 'oldman' ? 1.38 : 1.46) * sc;
  const fx = Math.sin(st.h), fz = Math.cos(st.h), side = [fz, -fx];
  let free = 2.4; // keep the camera in front of whoever is being spoken to
  for (const o of scene.chars) {
    if (o.id === ch.id) continue; const os = charState(scene, o, t); const dx = os.x - st.x, dz = os.z - st.z, dist = Math.hypot(dx, dz);
    if (dist > 0.05 && (dx * fx + dz * fz) / dist > 0.45) free = Math.min(free, dist);
  }
  const k = clamp((t - d.t) / Math.max(1, dialogDur(d)), 0, 1), dd = clamp(free * 0.62, 1.1, 1.9) * (1.08 - 0.16 * k), off = 0.22 * dd;
  return { pos: [st.x + fx * dd + side[0] * off, headY + 0.06, st.z + fz * dd + side[1] * off], target: [st.x, headY - 0.02, st.z], fov: 38 };
}
export function cameraAt(scene, t) {
  const c = scene.camera, s = c.start;
  if (c.closeups) { const shot = speakerShot(scene, t); if (shot) return shot; }
  if (!c.end) return { pos: s.pos, target: s.target, fov: s.fov };
  const k = smooth(clamp(t / Math.max(0.1, scene.duration), 0, 1)), e = c.end;
  return { pos: s.pos.map((v, i) => lerp(v, e.pos[i], k)), target: s.target.map((v, i) => lerp(v, e.target[i], k)), fov: lerp(s.fov, e.fov, k) };
}

// preset camera framing around a point looking along heading
export function presetCamera(name, x, z, heading, h = 1.45) {
  const fx = Math.sin(heading), fz = Math.cos(heading); // character facing direction
  const side = [fz, -fx];                                  // right-hand perpendicular
  const P = (d, hgt, off = 0) => [x + fx * d + side[0] * off, hgt, z + fz * d + side[1] * off];
  const T = [x, h, z];
  switch (name) {
    case 'wide': return { pos: P(11, 3.4, 3), target: [x, 1.2, z], fov: 50 };
    case 'medium': return { pos: P(4.2, 1.7, 0.8), target: [x, 1.25, z], fov: 42 };
    case 'close-up': return { pos: P(1.6, 1.62, 0.25), target: [x, 1.55, z], fov: 34 };
    case 'over-the-shoulder': return { pos: [x - fx * 1.0 + side[0] * 0.5, 1.75, z - fz * 1.0 + side[1] * 0.5], target: [x + fx * 3, 1.35, z + fz * 3], fov: 46 };
    case 'top view': return { pos: [x, 15, z + 0.01], target: [x, 0, z], fov: 50 };
    case 'low angle': return { pos: P(3.4, 0.25, 0.6), target: [x, 1.6, z], fov: 48 };
    default: return { pos: P(8, 3, 2), target: T, fov: 50 };
  }
}

// Older projects used an offline eSpeak voice: drop that generated audio so the line uses the browser voice.
export function migrateProject(p) {
  p.aspect ||= '16:9'; if (p.bubbles === undefined) p.bubbles = true; p.bubbleStyle ||= 'rounded'; p.watermark ||= ''; p.subtitles ||= { ...defaultSubtitles(), mode: 'off' };
  for (const sc of p.scenes || []) sc.captions ||= [];
  for (const sc of p.scenes || []) for (const d of sc.dialogs || []) {
    if (d.source === 'tts' && d.audioKey && d.audioName === 'Text-to-speech') { d.audioKey = null; d.audioName = ''; }
    delete d.engine; delete d.ttsSig;
  }
  for (const sc of p.scenes || []) fitSceneToDialogs(sc);
  return p;
}

// Make sure the scene is long enough for every dialog line (+ a short pause at the end). Returns true if it grew.
export function fitSceneToDialogs(sc, pad = 1) {
  const end = (sc.dialogs || []).reduce((m, d) => ((d.text || '').trim() || d.audioKey) ? Math.max(m, d.t + dialogDur(d)) : m, 0);
  const need = Math.ceil(end + pad); if (need > sc.duration) { sc.duration = need; return true; } return false;
}
