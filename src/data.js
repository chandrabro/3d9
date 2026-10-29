// Central, data-driven configuration: scenes, characters, props, actions, time-of-day.

export const MAX_CHARS = 5;

/* ---------- Scene environments (exactly 10) ---------- */
// Each environment is a list of "features" consumed by environment.js.
export const ENVS = {
  village: {
    name: 'Rural Village', ground: 'grass', mountains: true, radius: 60,
    cam: { pos: [0, 5.5, 16], target: [0, 1.5, -4], fov: 50 },
    features: [
      ['terraces', { x: -20, z: -42, w: 70, tiers: 4 }],
      ['house', { x: -9, z: -8, ry: 0.35, s: 1.0, style: 'stone' }],
      ['house', { x: 12, z: -12, ry: -0.4, s: 1.1, style: 'mud' }],
      ['house', { x: 24, z: -4, ry: -0.9, s: 0.9, style: 'stone' }],
      ['house', { x: -26, z: -14, ry: 0.8, s: 1.0, style: 'mud' }],
      ['path', { pts: [[-40, 14], [-15, 8], [0, 6], [14, 2], [40, -4]], w: 3 }],
      ['trees', { n: 26, area: [-50, -35, 50, 5], avoid: 'path' }],
      ['bamboo', { x: 30, z: -16, n: 14 }],
      ['fence', { x0: -6, z0: 0, x1: 8, z1: -2, n: 9 }],
      ['haystack', { x: 18, z: -6 }],
      ['grass', {}],
    ],
  },
  home: {
    name: 'Rural Home (exterior)', ground: 'grass', mountains: true, radius: 50,
    cam: { pos: [6, 3, 13], target: [0, 1.8, 0], fov: 46 },
    features: [
      ['house', { x: 0, z: -2, ry: 0, s: 1.5, style: 'stone', door: true }],
      ['terraces', { x: -10, z: -38, w: 60, tiers: 3 }],
      ['trees', { n: 14, area: [-30, -25, 30, -8], avoid: 'house' }],
      ['path', { pts: [[0, 12], [0, 4], [-3, -1]], w: 2 }],
      ['fence', { x0: -9, z0: 8, x1: 9, z1: 8, n: 12 }],
      ['haystack', { x: 10, z: -4 }],
      ['grass', {}],
    ],
  },
  farm: {
    name: 'Agriculture Farm', ground: 'soil', mountains: true, radius: 60,
    cam: { pos: [0, 4.5, 14], target: [0, 1, -2], fov: 50 },
    features: [
      ['paddy', { x: -16, z: -6, w: 14, d: 22, crop: 'rice' }],
      ['paddy', { x: 2, z: -6, w: 14, d: 22, crop: 'rice' }],
      ['paddy', { x: 20, z: -6, w: 12, d: 22, crop: 'maize' }],
      ['terraces', { x: -20, z: -45, w: 80, tiers: 4 }],
      ['trees', { n: 12, area: [-45, -35, 45, -28], avoid: '' }],
      ['hut', { x: 28, z: 10 }],
      ['grass', {}],
    ],
  },
  animalfarm: {
    name: 'Animal Keeping Farm', ground: 'soil', mountains: true, radius: 40,
    cam: { pos: [2, 3.5, 11], target: [0, 1, 0], fov: 48 },
    features: [
      ['pen', { x: 0, z: 0, w: 14, d: 10 }],
      ['shed', { x: 0, z: -7.5, w: 12, kind: 'goat' }],
      ['trough', { x: -3, z: 2 }],
      ['trough', { x: 3, z: 2 }],
      ['haystack', { x: 10, z: -4 }],
      ['trees', { n: 10, area: [-35, -30, 35, -14], avoid: '' }],
      ['grass', {}],
    ],
  },
  henfarm: {
    name: 'Hen Farm', ground: 'soil', mountains: true, radius: 40,
    cam: { pos: [0, 2.8, 8.5], target: [0, 0.8, 0], fov: 46 },
    features: [
      ['henhouse', { x: -4, z: -5 }],
      ['henhouse', { x: 4, z: -5 }],
      ['pen', { x: 0, z: 0, w: 14, d: 10, low: true }],
      ['trough', { x: 0, z: 1 }],
      ['trees', { n: 8, area: [-30, -30, 30, -12], avoid: '' }],
      ['grass', {}],
    ],
  },
  inside: {
    name: 'Inside Rural House', interior: 'home', ground: 'floor',
    cam: { pos: [2.9, 1.7, 2.6], target: [-0.6, 0.9, -1.0], fov: 62 },
    room: { w: 7, d: 6, h: 2.8 },
    features: [],
  },
  office: {
    name: 'Microfinance Office', interior: 'office', ground: 'tile',
    cam: { pos: [3.4, 1.9, 2.9], target: [-0.3, 1.0, -1.2], fov: 62 },
    room: { w: 8, d: 6.5, h: 3 },
    features: [],
  },
  desk: {
    name: 'Microfinance Office Desk', interior: 'desk', ground: 'tile',
    cam: { pos: [0.5, 1.5, 1.5], target: [0, 0.85, -0.8], fov: 42 },
    room: { w: 6, d: 5, h: 3 },
    features: [],
  },
  pathway: {
    name: 'Village Pathway', ground: 'grass', mountains: true, radius: 60,
    cam: { pos: [-4, 1.8, 18], target: [0, 1.4, 0], fov: 46 },
    features: [
      ['path', { pts: [[0, 30], [0, 14], [3, 2], [-2, -12], [-1, -30]], w: 2.6, stones: true }],
      ['trees', { n: 34, area: [-24, -34, 24, 30], avoid: 'path' }],
      ['bamboo', { x: -12, z: 6, n: 12 }],
      ['fence', { x0: 4, z0: 22, x1: 4, z1: 6, n: 8 }],
      ['house', { x: 14, z: -6, ry: -1.2, s: 1, style: 'mud' }],
      ['terraces', { x: -20, z: -50, w: 80, tiers: 3 }],
      ['grass', {}],
    ],
  },
  courtyard: {
    name: 'Outside Home Courtyard', ground: 'yard', mountains: true, radius: 40,
    cam: { pos: [4, 2.6, 9], target: [0, 1.1, 0], fov: 50 },
    features: [
      ['house', { x: 0, z: -7, ry: 0, s: 1.3, style: 'mud', door: true }],
      ['tulsi', { x: 0, z: 0.5 }],
      ['haystack', { x: 9, z: -3 }],
      ['fence', { x0: -10, z0: 6, x1: 10, z1: 6, n: 14 }],
      ['trees', { n: 8, area: [-30, -30, 30, -16], avoid: '' }],
      ['terraces', { x: -10, z: -40, w: 60, tiers: 3 }],
      ['grass', {}],
    ],
  },
};
import { SCENES as SCENES_2D } from './scenes2d/scenes/index.js';
export const ENV_ORDER = ['village', 'home', 'farm', 'animalfarm', 'henfarm', 'inside', 'office', 'desk', 'pathway', 'courtyard'];

/* ---------- Characters ---------- */
export const CHARS = {
  woman: { name: 'Rural Nepali Woman', kind: 'human', gender: 'female', look: 'woman' },
  oldman: { name: 'Old Rural Nepali Man', kind: 'human', gender: 'male', look: 'oldman' },
  mf1: { name: 'Microfinance Employee', kind: 'human', gender: 'male', look: 'mf1' },
  mf2: { name: 'Other Microfinance Employee', kind: 'human', gender: 'female', look: 'mf2' },
  women: { name: 'Group of Women', kind: 'group', gender: 'female', look: 'woman' },
  goat: { name: 'Goat', kind: 'animal', animal: 'goat', gender: 'none' },
  chicken: { name: 'Chicken', kind: 'animal', animal: 'chicken', gender: 'none' },
  pig: { name: 'Pig', kind: 'animal', animal: 'pig', gender: 'none' },
};
export const CHAR_ORDER = ['woman', 'oldman', 'mf1', 'mf2', 'women', 'goat', 'chicken', 'pig'];

/* ---------- Props ---------- */
export const PROPS = {
  money_notes: 'Money (notes)', coins: 'Money (coins)', chair: 'Chair', stool: 'Stool (Mudha)', table: 'Table',
  gundro: 'Gundro (mat)', galaicha: 'Galaicha (carpet)', doko: 'Doko (basket)', nanglo: 'Nanglo (tray)',
  pot: 'Clay pot', gagri: 'Gagri (water vessel)', kodalo: 'Kodalo (hoe)', hasiya: 'Hasiya (sickle)',
  rice_bundle: 'Rice bundle', notebook: 'Notebook', passbook: 'Passbook', calculator: 'Calculator',
  lantern: 'Lantern', broom: 'Broom (kucho)', bucket: 'Bucket', firewood: 'Firewood', sack: 'Sack',
  bed: 'Khat (cot)', cupboard: 'Cupboard',
};

/* ---------- Actions ---------- */
// seat: forced seat. holdsArms: keep action arms while moving. held: items shown.
export const ACTIONS = {
  human: [
    { id: 'idle', label: 'Idle' }, { id: 'stand', label: 'Stand' }, { id: 'walk', label: 'Walk' }, { id: 'run', label: 'Run' },
    { id: 'talk', label: 'Talk' }, { id: 'wave', label: 'Wave' }, { id: 'sit', label: 'Sit (chair)', seat: 'chair' },
    { id: 'sit_gundro', label: 'Sit on gundro', seat: 'floor' },
    { id: 'hand_money', label: 'Hand money' }, { id: 'receive_money', label: 'Receive money' },
    { id: 'count_money', label: 'Count money' }, { id: 'write', label: 'Write in notebook' },
    { id: 'dig', label: 'Dig a hole' }, { id: 'plant_rice', label: 'Plant rice' }, { id: 'harvest', label: 'Harvest' },
    { id: 'carry_doko', label: 'Carry doko' }, { id: 'sweep', label: 'Sweep' },
    { id: 'feed_chicken', label: 'Feed chicken' }, { id: 'milk_goat', label: 'Milk / tend goat' },
  ],
  animal: [
    { id: 'idle', label: 'Idle' }, { id: 'walk', label: 'Walk' }, { id: 'run', label: 'Run' }, { id: 'eat', label: 'Eat / graze' },
  ],
};
// Actions where the pose keeps its own arms/tools while walking, and can be done seated:
export const KEEP_ARMS = new Set(['carry_doko', 'hand_money', 'count_money', 'receive_money', 'write', 'sweep', 'wave', 'harvest', 'dig', 'plant_rice', 'feed_chicken', 'milk_goat']);
export const SEATABLE = new Set(['idle', 'stand', 'talk', 'wave', 'hand_money', 'receive_money', 'count_money', 'write', 'sweep']);

/* ---------- Time of day ---------- */
export const TIMES = {
  morning: { label: 'Morning', elev: 16, azim: 110, sun: 0xffd9a8, sunI: 2.6, hemi: 0.9, fog: 0xcfd9e6, fogD: 0.0075, turb: 6, ray: 2.0, exp: 0.95, tone: 0.9 },
  noon: { label: 'Noon', elev: 62, azim: 170, sun: 0xfff4e0, sunI: 3.4, hemi: 1.0, fog: 0xbcd4ec, fogD: 0.004, turb: 3, ray: 1.2, exp: 0.8, tone: 0.85 },
  night: { label: 'Night', elev: 38, skyElev: -8, azim: 215, sun: 0x9fb4ff, sunI: 0.7, hemi: 0.32, fog: 0x0b1228, fogD: 0.009, turb: 2, ray: 0.4, exp: 1.0, tone: 0.8 },
  evening: { label: 'Evening', elev: 6, azim: 250, sun: 0xff9a4d, sunI: 2.4, hemi: 0.7, fog: 0xe2a98a, fogD: 0.009, turb: 8, ray: 3.2, exp: 0.9, tone: 0.8 },
};

/* ---------- Camera presets ---------- */
export const CAM_PRESETS = ['wide', 'medium', 'close-up', 'over-the-shoulder', 'top view', 'low angle'];

/* ---------- Voices ---------- */
export const DEFAULT_VOICES = {
  male: { lang: 'ne', bVoice: '', bRate: 1, bPitch: 1 },
  female: { lang: 'ne', bVoice: '', bRate: 1, bPitch: 1 },
  narrator: { lang: 'ne', bVoice: '', bRate: 0.95, bPitch: 1 },
};
export const VOICE_TYPES = ['male', 'female', 'narrator'];
export const LANGS = { ne: 'Nepali', 'en-us': 'English', hi: 'Hindi' };

/* ---------- 2D painted backdrops (the 50 StoryStage scenes) as environments: ids "bd_<id>" ---------- */
export const BD_CATEGORIES = [...new Set(SCENES_2D.map(s => s.category))];
export const BD_ORDER = SCENES_2D.map(s => 'bd_' + s.id);
for (const s of SCENES_2D) {
  ENVS['bd_' + s.id] = { name: s.name, category: s.category, backdrop: s.id, indoor: !!s.indoor, ground: 'grass', radius: 20, features: [],
    cam: { pos: [0, 1.6, 9], target: [0, 1.35, 0], fov: 40 } };
}
export const bgToEnv = (id) => ENVS['bd_' + id] ? 'bd_' + id : null;

export const BD_WEATHER = [['none', 'None'], ['rain', 'Rain'], ['snow', 'Snow'], ['fog', 'Fog'], ['sunrays', 'Sun rays'], ['leaves', 'Falling leaves']];
export const BD_FILTERS = [['none', 'None'], ['warm', 'Warm'], ['cool', 'Cool'], ['sepia', 'Sepia'], ['bw', 'Black & white'], ['dream', 'Dreamy'], ['dark', 'Dark']];
