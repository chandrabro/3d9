// Convert a StoryStage 2D project (.storystage.json) into Nepali Story Studio 3D scenes.
// Every 2D background becomes one of the 50 painted backdrops, characters become 3D characters,
// and dialog, actions, captions, weather and camera moves are carried over.
import { ENVS, CHARS, MAX_CHARS, TIMES } from './data.js';
import { newScene, newChar, newDialog, speedFor, uid, dialogDur } from './model.js';

const ACT = {
  idle: 'idle', talk: 'talk', sit_talk: 'sit', walk: 'walk', sad_walk: 'walk', run: 'run', sit: 'sit', wave: 'wave', namaste: 'wave', write: 'write', type: 'write', read: 'write',
  dig: 'dig', sow: 'plant_rice', water: 'dig', pluck: 'harvest', chop: 'harvest', sweep: 'sweep', wipe: 'sweep', carry_heavy: 'carry_doko', carry: 'carry_doko',
  hug: 'idle', cry: 'idle', laugh: 'talk', nod: 'talk', shake_head: 'talk', think: 'idle', angry: 'talk', scared: 'idle', cheer: 'wave', clap: 'wave', thumbs_up: 'wave', jump_joy: 'wave', point: 'wave',
};
const TOD = { day: 'morning', dawn: 'morning', sunset: 'evening', night: 'night' };
const OFFICE = /police|doctor|nurse|teacher|officer|pilot|hostess|manager|merchant|minister|clerk|chef|soldier|groom|bride/;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), r2 = (x) => Math.round(x * 100) / 100;

function charType(c) {
  const a = c.appearance || {}, p = String(c.preset || ''), name = String(c.name || ''); const female = a.gender === 'female', office = OFFICE.test(p);
  const elder = a.build === 'elder' || /grand|old|elder|king|monk/.test(p);
  const scale = a.build === 'child' ? 0.65 : a.build === 'teen' ? 0.85 : 1;
  if (female) return { type: office || /bride/.test(p) ? 'mf2' : 'woman', scale };
  return { type: elder || /farmer/.test(p) ? 'oldman' : 'mf1', scale };
}
function langOf(v) { v = String(v || ''); if (/^hi|hindi/i.test(v)) return 'hi'; if (/^en|english/i.test(v)) return 'en-us'; return 'ne'; }
function cameraFrom(sc, preset, targetPos) {
  const cam = sc.camera.start, to = (k) => ({ pos: cam.pos.map((v, i) => v + (cam.target[i] - v) * k), target: [...cam.target], fov: cam.fov });
  switch (preset) {
    case 'medium': sc.camera.start = to(0.3); break;
    case 'closeup': sc.camera.start = to(0.5); sc.camera.closeups = true; break;
    case 'zoom_in': sc.camera.end = to(0.45); break;
    case 'zoom_out': { const e = { ...cam, pos: [...cam.pos], target: [...cam.target] }; sc.camera.start = to(0.45); sc.camera.end = e; break; }
    case 'dolly': sc.camera.end = { ...to(0.3), pos: to(0.3).pos.map((v, i) => i === 1 ? v + 0.3 : v) }; break;
    case 'pan_lr': sc.camera.start = { ...cam, pos: [cam.pos[0] - 1.2, ...cam.pos.slice(1)], target: [cam.target[0] - 1.2, ...cam.target.slice(1)] }; sc.camera.end = { ...cam, pos: [cam.pos[0] + 1.2, ...cam.pos.slice(1)], target: [cam.target[0] + 1.2, ...cam.target.slice(1)] }; break;
    case 'pan_rl': sc.camera.start = { ...cam, pos: [cam.pos[0] + 1.2, ...cam.pos.slice(1)], target: [cam.target[0] + 1.2, ...cam.target.slice(1)] }; sc.camera.end = { ...cam, pos: [cam.pos[0] - 1.2, ...cam.pos.slice(1)], target: [cam.target[0] - 1.2, ...cam.target.slice(1)] }; break;
    default: break;
  }
}

export function import2dProject(data) {
  const warnings = [], scenes = [], langCount = {};
  const chars = new Map((data.characters || []).map(c => [c.id, c]));
  for (const s2 of data.scenes || []) {
    const envId = ENVS['bd_' + s2.background] ? 'bd_' + s2.background : 'village';
    if (envId === 'village') warnings.push(`Background "${s2.background}" is not available – a village scene is used.`);
    const sc = newScene(envId); sc.name = s2.name || ENVS[envId].name; sc.duration = Math.max(3, Math.ceil(s2.duration || 8));
    sc.tod = TOD[s2.tod] && TIMES[TOD[s2.tod]] ? TOD[s2.tod] : 'morning'; sc.weather = s2.weather || 'none'; sc.filter = s2.filter || 'none'; sc.vignette = s2.vignette !== false;
    const actorChar = [];
    (s2.actors || []).slice(0, MAX_CHARS).forEach((a, i) => {
      const src = chars.get(a.characterId) || {}, { type, scale } = charType(src);
      const ch = newChar(type, sc); ch.name = src.name || ch.name; ch.scale = scale * (a.scale || 1);
      ch.x = r2((a.x - 640) / 1280 * 6.2); ch.z = r2(3 + clamp((a.y - 650) / 90, -1.2, 1.6));
      ch.facing = a.orientation === 'front' ? 0 : a.facing < 0 ? 290 : 70; ch.actions = [{ t: 0, action: 'idle', seat: '' }];
      const acts = [...(a.actions || [])].sort((x, y) => x.start - y.start); let walked = false;
      for (const x of acts) {
        const id = ACT[x.action] || 'idle', move = (x.toX != null || x.toY != null) && (id === 'walk' || id === 'run');
        if (move && !walked) {
          const tx = r2(((x.toX ?? a.x) - 640) / 1280 * 6.2), tz = r2(3 + clamp(((x.toY ?? a.y) - 650) / 90, -1.2, 1.6)), len = Math.hypot(tx - ch.x, tz - ch.z), dur = Math.max(0.5, x.end - x.start);
          ch.path = [[tx, tz]]; ch.pathStart = r2(x.start); ch.speed = r2(clamp(len / dur, 0.4, 3)); walked = true;
          ch.actions.push({ t: r2(x.start), action: id, seat: '' }); ch.actions.push({ t: r2(x.end), action: 'idle', seat: '' });
        } else if (!move) {
          ch.actions.push({ t: r2(x.start), action: id, seat: id === 'sit' ? 'chair' : '' });
          if (x.end > x.start) ch.actions.push({ t: r2(x.end), action: 'idle', seat: '' });
        }
      }
      // a later 'idle' marker must not cancel the action that starts at the same time
      ch.actions.sort((p, q) => p.t - q.t || (p.action === 'idle' ? -1 : 1)); sc.chars.push(ch); actorChar[i] = ch;
    });
    for (const d2 of s2.dialogs || []) {
      const ch = d2.actor >= 0 ? actorChar[d2.actor] : null; if (d2.actor >= 0 && !ch) continue;
      const d = newDialog(sc); d.charId = ch ? ch.id : null; d.text = d2.text || ''; d.t = r2(d2.start || 0); d.dur = r2(d2.duration || 0); d.lang = langOf(d2.voice); d.voice = ch ? 'auto' : 'narrator';
      if (d2.bubble === false) d.bubble = false; if (d2.silent) d.silent = true; if (d2.bubbleStyle) d.bubbleStyle = d2.bubbleStyle === 'rounded' ? '' : d2.bubbleStyle;
      langCount[d.lang] = (langCount[d.lang] || 0) + 1; sc.dialogs.push(d);
    }
    sc.captions = (s2.captions || []).map(c => ({ id: uid('cp'), text: c.text, start: c.start, end: c.end, style: c.style === 'title' ? 'title' : 'subtitle', position: c.position || 'bottom', size: c.size || 0.05, color: c.color || '#ffffff' }));
    cameraFrom(sc, s2.camera?.preset || 'wide');
    out: { scenes.push(sc); }
  }
  const lang = Object.entries(langCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'ne';
  return { name: data.title || 'Imported story', scenes, warnings, lang, subtitles: data.subtitles || null };
}
