// Plain-text script  <->  3D scenes ("text to scene maker").
//
//   # Scene title | background          new scene; background = a 3D scene ("village", "Rural Home") or any of the 50 painted ones ("Kitchen", "vegetable_farm")
//   @time morning|noon|evening|night      @weather rain|snow|fog|sunrays|leaves (painted backgrounds)      @filter sepia|warm|cool|bw|dream|dark
//   @camera wide|medium|close-up|over-the-shoulder|top view|low angle      @closeups on|off      @title Big title text
//   Narrator: voice-over text
//   Sita (f, old): a line spoken by Sita      tags (f) (m) (old) (child) (teen) (tall) + a role (farmer, employee, group, goat, chicken, pig ...) create a NEW character
//   Ram [wave]: Hello!                    the action is played while he speaks (default: talk)
//   [Ram: walk to right]  [Ram: walk to Sita]  [Ram: sit for 4]  [Sita: face camera]
//   [+Sita: laugh]                        "+" = at the same time as the next line (the story does not wait)
//   // comment
import { ENVS, CHARS, ACTIONS, TIMES, MAX_CHARS, BD_ORDER, ENV_ORDER, BD_WEATHER, BD_FILTERS } from './data.js';
import { newScene, newChar, newDialog, presetCamera, dialogDur, speedFor, uid } from './model.js';

const NARR = /^(narrator|narration|voice[- ]?over|नरेटर|वाचक|सूत्रधार|कथावाचक|नैरेटर)$/i;
const AGES = { old: 'old', elder: 'old', elderly: 'old', grandpa: 'old', grandma: 'old', child: 'child', kid: 'child', young: 'teen', teen: 'teen', tall: 'tall' };
const GEN = { f: 'f', female: 'f', woman: 'f', girl: 'f', m: 'm', male: 'm', man: 'm', boy: 'm' };
const OFFICE = /employee|officer|staff|manager|micro|bank|teacher|doctor|nurse|police|clerk|worker|merchant|shopkeeper|minister/;
const norm = (s) => String(s || '').trim().toLowerCase();
const r2 = (x) => Math.round(x * 100) / 100;
const ACTION_IDS = new Set([...ACTIONS.human, ...ACTIONS.animal].map(a => a.id));
const ALIAS = {
  walk: 'walk', walks: 'walk', go: 'walk', goes: 'walk', come: 'walk', comes: 'walk', move: 'walk', run: 'run', runs: 'run', rush: 'run', sprint: 'run',
  stand: 'idle', wait: 'idle', stay: 'idle', sit: 'sit', sits: 'sit', talk: 'talk', talks: 'talk', speak: 'talk', wave: 'wave', waves: 'wave', greet: 'wave', namaste: 'wave',
  write: 'write', writes: 'write', dig: 'dig', digs: 'dig', work: 'dig', plant: 'plant_rice', harvest: 'harvest', cut: 'harvest', carry: 'carry_doko', sweep: 'sweep', sweeps: 'sweep',
  count: 'count_money', give: 'hand_money', hand: 'hand_money', receive: 'receive_money', take: 'receive_money', feed: 'feed_chicken', milk: 'milk_goat', eat: 'eat', graze: 'eat',
};
export function actionFromWords(text) {
  const words = norm(text).replace(/[^\p{L}\p{N}\s_-]/gu, ' ').split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const two = words[i] + '_' + (words[i + 1] || ''); if (ACTION_IDS.has(two)) return two;
    const w = words[i]; if (ALIAS[w]) return ALIAS[w]; if (ACTION_IDS.has(w) && w !== 'idle') return w;
  }
  return null;
}
const OPTION = (list, q) => { const clean = (x) => norm(x).replace(/\bto\b/g, '').replace(/[^a-z0-9]+/g, ''); const n = clean(q); if (!n) return null; const hit = list.find(([id, l]) => clean(id) === n || clean(l) === n) || list.find(([id, l]) => clean(l).includes(n)); return hit ? hit[0] : null; };
const TODS = [...Object.entries(TIMES).map(([k, v]) => [k, v.label]), ['day', 'Day'], ['dawn', 'Morning'], ['sunset', 'Evening']];
const TOD_FIX = { day: 'noon', dawn: 'morning', sunset: 'evening' };
const CAMS = CAMS_LIST();
function CAMS_LIST() { return [['wide', 'Wide'], ['medium', 'Medium'], ['close-up', 'Close-up'], ['closeup', 'Close-up'], ['over-the-shoulder', 'Over the shoulder'], ['top view', 'Top view'], ['low angle', 'Low angle']]; }

/** Find a scene background by id / name (3D scenes first, then the painted 2D backdrops). */
export function findEnv(q) {
  const n = norm(q); if (!n) return null; const ids = [...ENV_ORDER, ...BD_ORDER];
  return ids.find(id => id === n || id === 'bd_' + n) || ids.find(id => norm(ENVS[id].name) === n) || ids.find(id => norm(ENVS[id].name).includes(n) || id.includes(n.replace(/\s+/g, '_'))) || null;
}

/* ---------------- parsing ---------------- */
export function parseScript(text) {
  const blocks = [], warnings = []; let cur = null;
  const start = (title = '', env = null) => { cur = { title, env, settings: {}, items: [] }; blocks.push(cur); return cur; };
  String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim(); if (!line || line.startsWith('//')) return;
    if (line.startsWith('#')) {
      const [t, b] = line.replace(/^#+\s*/, '').split('|'); const env = b ? findEnv(b) : null;
      if (b && !env) warnings.push(`Line ${i + 1}: background "${b.trim()}" not found – the previous one is used.`);
      start((t || '').trim(), env); return;
    }
    if (!cur) start('');
    if (line.startsWith('@')) {
      const m = /^@(\w+)\s*(.*)$/.exec(line); if (!m) return; const key = m[1].toLowerCase(), val = m[2].trim();
      const set = (k, list, fix) => { const id = OPTION(list, val); if (id) cur.settings[k] = fix?.[id] || id; else warnings.push(`Line ${i + 1}: "${val}" is not a valid ${key}.`); };
      if (key === 'time' || key === 'tod') set('tod', TODS, TOD_FIX); else if (key === 'weather') set('weather', BD_WEATHER); else if (key === 'filter') set('filter', BD_FILTERS);
      else if (key === 'camera') set('camera', CAMS); else if (key === 'title') cur.settings.title = val; else if (key === 'closeups') cur.settings.closeups = !/^(off|no|false|0)$/i.test(val);
      else warnings.push(`Line ${i + 1}: unknown setting @${key}.`);
      return;
    }
    if (line.startsWith('[')) { const m = /^\[\s*(\+?)\s*(.+?)\s*\]$/.exec(line); if (!m) { warnings.push(`Line ${i + 1}: stage direction needs a closing ].`); return; } cur.items.push({ type: 'dir', parallel: !!m[1], text: m[2], line: i + 1 }); return; }
    const m = /^([^:：]{1,60}?)\s*[:：]\s*(.+)$/.exec(line);
    if (!m) { cur.items.push({ type: 'say', who: 'narrator', text: line }); return; }
    let name = m[1].trim(), gender = null, age = null, role = null, action = null;
    const am = /\s*\[([^\]]*)\]\s*$/.exec(name); if (am) { action = actionFromWords(am[1]); if (!action) warnings.push(`Line ${i + 1}: action "${am[1]}" not understood.`); name = name.replace(am[0], '').trim(); }
    const g = /\s*\(([^)]*)\)\s*$/.exec(name);
    if (g) {
      for (const tag of g[1].split(/[,/;]|\s+/).map(x => x.trim().toLowerCase()).filter(Boolean)) {
        if (GEN[tag]) gender = GEN[tag]; if (AGES[tag]) age = AGES[tag]; if ((tag === 'girl' || tag === 'boy') && !age) age = 'child';
        if (!AGES[tag] && !GEN[tag]) role = tag;
      }
      name = name.replace(g[0], '').trim();
    }
    cur.items.push({ type: 'say', who: NARR.test(name) ? 'narrator' : name, gender, age, role, action, text: m[2].trim() });
  });
  return { blocks: blocks.filter(b => b.items.length || Object.keys(b.settings).length), warnings };
}

/* ---------------- building ---------------- */
function typeFor(info, used) {
  const { gender, age, role } = info; const r = norm(role);
  if (r === 'goat' || r === 'chicken' || r === 'pig' || r === 'hen') return { type: r === 'hen' ? 'chicken' : r, scale: 1 };
  if (/^(group|women|villagers|crowd)$/.test(r)) return { type: 'women', scale: 1 };
  const female = gender === 'f' || (!gender && /woman|girl|mother|bua|didi|aama|ama|sita|radha|gita|maya/.test(norm(info.who)));
  const office = OFFICE.test(r);
  let type = female ? (office ? 'mf2' : 'woman') : (age === 'old' || /farmer|baba|grand|ramdas/.test(r + norm(info.who)) ? 'oldman' : 'mf1');
  if (!female && !gender && !role && !age) type = used.has('mf1') ? 'oldman' : 'mf1';
  return { type, scale: age === 'child' ? 0.65 : age === 'teen' ? 0.85 : age === 'tall' ? 1.1 : 1 };
}
function guessLang(text) { return /[\u0900-\u097F]/.test(text) ? 'ne' : 'en-us'; }

export function buildScenes(project, parsed) {
  const warnings = [...parsed.warnings], out = [];
  let envId = project.scenes.length ? project.scenes[project.scenes.length - 1].env : 'village';
  parsed.blocks.forEach((b) => {
    if (b.env) envId = b.env;
    const sc = newScene(envId); sc.name = b.title || `Scene ${project.scenes.length + out.length + 1}`; const S = b.settings;
    if (S.tod) sc.tod = TIMES[S.tod] ? S.tod : 'morning';
    if (ENVS[envId].backdrop) { if (S.weather) sc.weather = S.weather; if (S.filter) sc.filter = S.filter; }
    if (S.closeups !== undefined) sc.camera.closeups = S.closeups;
    const baseX = sc.camera.start.target[0], baseZ = sc.camera.start.target[2] + 3;
    // 1) who is on stage (max MAX_CHARS)
    const byName = new Map(), order = [];
    const find = (name) => { const n = norm(name); if (!n) return null; if (byName.has(n)) return byName.get(n); for (const [k, v] of byName) if (k.startsWith(n) || n.startsWith(k)) return v; return null; };
    const ensure = (name, info) => {
      let ch = find(name); if (ch) return ch;
      if (order.length >= MAX_CHARS) { warnings.push(`Scene "${sc.name}": more than ${MAX_CHARS} characters – "${name}" is skipped.`); return null; }
      const used = new Set(order.map(c => c.type)); const { type, scale } = typeFor({ ...info, who: name }, used);
      ch = newChar(type, sc); ch.name = name; ch.scale = scale; ch.speed = speedFor(type); ch.actions = [{ t: 0, action: 'idle', seat: '' }];
      sc.chars.push(ch); order.push(ch); byName.set(norm(name), ch); return ch;
    };
    for (const it of b.items) if (it.type === 'say' && it.who !== 'narrator') ensure(it.who, it);
    for (const it of b.items) if (it.type === 'dir') { const m = /^([^:：]+?)\s*[:：]/.exec(it.text); if (m && !find(m[1].replace(/^\+/, ''))) ensure(m[1].trim(), {}); }
    // 2) place them left → right, facing each other
    const n = order.length, pos = new Map();
    order.forEach((ch, i) => {
      const x = n === 1 ? baseX : baseX + (i / (n - 1) - 0.5) * Math.min(5.2, 1.7 * (n - 1) + 0.6);
      ch.x = r2(x); ch.z = r2(baseZ + (i % 2 ? -0.4 : 0.2)); ch.facing = n === 1 ? 0 : x < baseX - 0.1 ? 70 : x > baseX + 0.1 ? 290 : 0; pos.set(ch.id, { x: ch.x, z: ch.z });
    });
    // 3) timeline
    let T = 1; let moved = new Set(); const lastTalk = new Map();
    const setAct = (ch, t, action, seat = '') => { const a = ch.actions.find(x => Math.abs(x.t - t) < 0.01); if (a) { a.action = action; a.seat = seat; } else ch.actions.push({ t: r2(t), action, seat }); };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const resolveTarget = (ch, text) => {
      const q = norm(text).replace(/^(to|towards?|at|near)\s+/, ''); const p = pos.get(ch.id);
      if (/^(left)/.test(q)) return { x: baseX - 2.8, z: p.z }; if (/^(right)/.test(q)) return { x: baseX + 2.8, z: p.z };
      if (/^(cent|middle|mid)/.test(q)) return { x: baseX, z: baseZ }; if (/^(front|camera|forward)/.test(q)) return { x: p.x, z: Math.min(p.z + 1.6, baseZ + 2.2) };
      if (/^(back|away)/.test(q)) return { x: p.x, z: p.z - 2.2 }; if (/^(off|exit|out)/.test(q)) return { x: p.x < baseX ? baseX - 6.5 : baseX + 6.5, z: p.z };
      const o = find(q); if (o && o !== ch) { const t = pos.get(o.id), dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz) || 1; return { x: t.x + dx / d * 1.15, z: t.z + dz / d * 1.15 }; }
      return null;
    };
    const startWalk = (ch, target, run) => {
      const p = pos.get(ch.id); if (moved.has(ch.id)) warnings.push(`Scene "${sc.name}": ${ch.name} has more than one walk – a character can only follow one path per scene, so the extra walk continues the same path.`);
      if (!moved.has(ch.id)) { ch.pathStart = r2(T); ch.path = []; ch.speed = r2(speedFor(ch.type) * (run ? 1.7 : 1)); }
      ch.path.push([r2(target.x), r2(target.z)]); moved.add(ch.id);
      const len = dist(p, target), dur = len / ch.speed; pos.set(ch.id, { x: target.x, z: target.z });
      setAct(ch, T, run ? 'run' : 'walk'); setAct(ch, T + dur + 0.05, 'idle'); ch.endFacing = null;
      return dur;
    };
    for (const it of b.items) {
      if (it.type === 'say') {
        const text = it.text, ch = it.who === 'narrator' ? null : find(it.who);
        const d = newDialog(sc); d.charId = ch ? ch.id : null; d.text = text; d.lang = guessLang(text); d.voice = ch ? 'auto' : 'narrator'; d.t = r2(T); d.dur = 0; d.dur = r2(dialogDur(d));
        sc.dialogs.push(d);
        if (ch) {
          setAct(ch, T, it.action || 'talk'); const end = T + d.dur; if (!moved.has(ch.id) || true) setAct(ch, end, 'idle');
          // keep 'talk' continuous when the same character speaks again immediately
          lastTalk.set(ch.id, end);
        }
        T = r2(T + d.dur + 0.5);
      } else {
        const m = /^\+?\s*([^:：]+?)\s*[:：]\s*(.+)$/.exec(it.text); if (!m) { warnings.push(`Line ${it.line}: stage direction "${it.text}" not understood (use [Name: action]).`); continue; }
        const ch = find(m[1]); if (!ch) { warnings.push(`Line ${it.line}: "${m[1]}" is not on stage.`); continue; }
        const body = m[2].trim(), forM = /\bfor\s+(\d+(?:\.\d+)?)/i.exec(body), forT = forM ? +forM[1] : null, bodyNoFor = body.replace(/\bfor\s+\d+(?:\.\d+)?\s*(s|sec|seconds)?/i, '').trim();
        let wait = 0;
        if (/^face\b/i.test(bodyNoFor)) {
          const q = norm(bodyNoFor.replace(/^face\s*/i, '')), p = pos.get(ch.id); let deg = null;
          if (/camera|front|us/.test(q)) deg = 0; else if (/^left/.test(q)) deg = 270; else if (/^right/.test(q)) deg = 90; else if (/back/.test(q)) deg = 180;
          else { const o = find(q); if (o) { const t = pos.get(o.id); deg = Math.round(Math.atan2(t.x - p.x, t.z - p.z) * 180 / Math.PI); } }
          if (deg === null) warnings.push(`Line ${it.line}: cannot face "${q}".`); else if (moved.has(ch.id)) ch.endFacing = deg; else ch.facing = (deg + 360) % 360;
          continue;
        }
        const act = actionFromWords(bodyNoFor);
        if (act === 'walk' || act === 'run' || /^(walk|go|come|run|move|rush)/i.test(bodyNoFor)) {
          const tgt = resolveTarget(ch, bodyNoFor.replace(/^(walks?|goes?|comes?|runs?|moves?|rush(es)?)\s*/i, ''));
          if (!tgt) { warnings.push(`Line ${it.line}: where should ${ch.name} go? (left, right, center, front, back, exit or a character name)`); continue; }
          wait = startWalk(ch, tgt, act === 'run' || /^run|^rush/i.test(bodyNoFor));
        } else if (act) {
          const d = forT ?? 2; setAct(ch, T, act, act === 'sit' ? 'chair' : act === 'sit_gundro' ? 'floor' : ''); setAct(ch, T + d, 'idle'); wait = d;
        } else { warnings.push(`Line ${it.line}: action "${bodyNoFor}" not understood.`); continue; }
        if (!it.parallel) T = r2(T + wait + 0.2);
      }
    }
    // clean actions: sorted, de-duplicated
    for (const ch of sc.chars) ch.actions.sort((a, b) => a.t - b.t);
    // camera preset
    if (S.camera) { const f = order[0]; const hd = f ? f.facing * Math.PI / 180 : 0; const cx = order.length ? order.reduce((a, c) => a + c.x, 0) / order.length : baseX, cz = order.length ? order.reduce((a, c) => a + c.z, 0) / order.length : baseZ; const preset = S.camera === 'closeup' ? 'close-up' : S.camera; sc.camera.start = presetCamera(preset, cx, cz, hd); if (preset === 'close-up') sc.camera.closeups = true; }
    if (S.title) sc.captions = [{ id: uid('cp'), text: S.title, start: 0.3, end: 3.5, style: 'title', position: 'center', size: 0.09, color: '#ffd166' }];
    sc.duration = Math.max(6, Math.ceil(T + 1.5));
    out.push(sc);
  });
  return { scenes: out, warnings };
}

/* ---------------- scenes -> script text ---------------- */
export function scenesToScript(project) {
  const lines = [`// ${project.name || 'Story'} – script (Nepali Story Studio)`];
  for (const sc of project.scenes) {
    const def = ENVS[sc.env]; lines.push('', `# ${sc.name} | ${def?.name || sc.env}`, `@time ${TIMES[sc.tod]?.label || sc.tod}`);
    if (sc.weather && sc.weather !== 'none') lines.push(`@weather ${sc.weather}`); if (sc.filter && sc.filter !== 'none') lines.push(`@filter ${sc.filter}`); if (sc.camera.closeups) lines.push('@closeups on');
    for (const c of sc.captions || []) if (c.style === 'title') lines.push(`@title ${c.text}`);
    for (const d of [...sc.dialogs].sort((a, b) => a.t - b.t)) {
      if (!(d.text || '').trim()) continue; const ch = sc.chars.find(c => c.id === d.charId);
      let who = 'Narrator'; if (ch) { const k = CHARS[ch.type]; const tags = [k.gender === 'female' ? 'f' : k.gender === 'male' ? 'm' : '', ch.scale < 0.8 ? 'child' : ''].filter(Boolean); who = ch.name + (tags.length ? ` (${tags.join(', ')})` : ''); }
      lines.push(`${who}: ${d.text.trim()}`);
    }
  }
  return lines.join('\n') + '\n';
}

export const SCRIPT_EXAMPLE = `# Morning in the village | village
@time morning
@title सुन्दर गाउँको बिहान
Narrator: सूर्य उदाउँदै थियो र गाउँमा नयाँ दिन सुरु भयो।
Sita (f): बुबा, धान रोप्ने बेला भयो।
Baba (m, old): ठीक छ नानी, म आउँछु।
[Baba: walk to Sita]
Sita [wave]: हामी सँगै जाऔँ!

# Talk at the table | Kitchen
@time evening
Radha (f): आज के पकाउने?
Ram (m): दाल भात र तरकारी।
`;
