// Painted 2D backdrops (the 50 StoryStage scenes) used behind the 3D characters.
// The 2D painter draws a 1280x720 "stage" onto a canvas; that canvas is used as the scene background and is
// positioned like a billboard standing where the characters normally stand, so camera moves/zooms behave naturally.
import * as THREE from 'three';
import { getScene } from './scenes2d/scenes/index.js';
import { todOf, vignette, rain, snow, fog as fogFx, sunRays } from './scenes2d/scenery.js';
import { hash } from './scenes2d/util.js';

const W2 = 1280, H2 = 720;
const TOD_MAP = { morning: 'day', noon: 'day', evening: 'sunset', night: 'night' };
export { BD_WEATHER, BD_FILTERS } from './data.js';

function leaves(ctx, env) {
  for (let i = 0; i < 40; i++) {
    const s = hash('leaf' + i) / 4294967296;
    const x = ((s * W2 + env.t * (20 + s * 30) + Math.sin(env.t * 1.5 + i) * 25) % (W2 + 60)) - 30;
    const y = ((s * 7919 % H2) + env.t * (40 + s * 40)) % (H2 + 40) - 20;
    ctx.save(); ctx.translate(x, y); ctx.rotate(env.t * 2 + i); ctx.fillStyle = ['#e67e22', '#d35400', '#f1c40f', '#c0392b'][i % 4];
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}
function applyFilter(ctx, f) {
  const full = () => ctx.fillRect(0, 0, W2, H2);
  if (f === 'warm') { ctx.fillStyle = 'rgba(255,160,60,0.12)'; full(); }
  else if (f === 'cool') { ctx.fillStyle = 'rgba(60,120,255,0.12)'; full(); }
  else if (f === 'sepia') { ctx.globalCompositeOperation = 'color'; ctx.fillStyle = 'rgba(112,66,20,1)'; full(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(112,66,20,0.18)'; full(); }
  else if (f === 'bw') { ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; full(); ctx.globalCompositeOperation = 'source-over'; }
  else if (f === 'dream') { ctx.fillStyle = 'rgba(255,200,240,0.14)'; full(); }
  else if (f === 'dark') { ctx.fillStyle = 'rgba(0,0,20,0.3)'; full(); }
}

export class Backdrop {
  constructor() {
    this.canvas = document.createElement('canvas'); this.scale = 1.5; this.canvas.width = W2 * this.scale; this.canvas.height = H2 * this.scale;
    this.ctx = this.canvas.getContext('2d');
    const t = this.tex = new THREE.CanvasTexture(this.canvas);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    this.key = ''; this.v = new THREE.Vector3(); this.f = new THREE.Vector3();
  }
  setScale(s) { if (s !== this.scale) { this.scale = s; this.canvas.width = Math.round(W2 * s); this.canvas.height = Math.round(H2 * s); this.key = ''; } }
  paint(scene, t, def2d) {
    const tod = TOD_MAP[scene.tod] || 'day', animate = scene.bdAnimate !== false, weather = scene.weather || 'none';
    const q = animate ? Math.round(t * 10) / 10 : 0;
    const key = [scene.env, tod, weather, scene.filter || 'none', scene.id, scene.vignette, q, this.scale].join('|');
    if (key === this.key) return; this.key = key;
    const ctx = this.ctx, env = { W: W2, H: H2, t: q + (hash(scene.id || 'x') % 50), tod, seed: (hash(scene.id || 'x') % 997) + 1, weather };
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0); ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W2, H2);
    try {
      ctx.save(); def2d.paint(ctx, env); ctx.restore();
      if (weather === 'fog') fogFx(ctx, env, H2 * 0.55, 0.35);
      if (weather === 'sunrays') sunRays(ctx, env, W2 * 0.8, -20, 7, 1400, 0.1);
      if (def2d.paintFront) { ctx.save(); def2d.paintFront(ctx, env); ctx.restore(); }
      if (weather === 'rain') rain(ctx, env, 1); if (weather === 'snow') snow(ctx, env, 1); if (weather === 'leaves') leaves(ctx, env);
      const p = todOf(env); if (p.tint && !def2d.indoor) { ctx.fillStyle = p.tint; ctx.fillRect(0, 0, W2, H2); }
      if (scene.filter && scene.filter !== 'none') applyFilter(ctx, scene.filter);
      if (scene.vignette !== false) vignette(ctx, { W: W2, H: H2 }, 0.3);
    } catch (e) { console.warn('backdrop paint failed', e); }
    ctx.restore(); this.tex.needsUpdate = true;
  }
  // map the painted stage onto the screen like a billboard at the point where the characters stand
  sync(camera, scene, def2d) {
    const cs = scene.camera.start, R = new THREE.Vector3(cs.target[0], 0, cs.target[2] + 3);
    const fwd = camera.getWorldDirection(this.f), depth = Math.max(0.4, this.v.copy(R).sub(camera.position).dot(fwd));
    const sp = new THREE.Vector3(...cs.pos), st = new THREE.Vector3(...cs.target), d0 = Math.max(0.4, R.clone().sub(sp).dot(st.clone().sub(sp).normalize()));
    const ndc = this.v.copy(R).project(camera), xs = ndc.x * 0.5 + 0.5, ys = 0.5 - ndc.y * 0.5;
    const k = (d0 / depth) * (Math.tan(THREE.MathUtils.degToRad(cs.fov || 40) / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) * (scene.bdZoom || 1);
    const rv = 1 / k, ru = (camera.aspect / (16 / 9)) / k, t = this.tex;
    const vc = (1 - (def2d.groundY ?? 0.9)) - rv * (0.5 - ys) + (scene.bdY || 0), uc = 0.5 - ru * (xs - 0.5) - (scene.bdX || 0) * ru;
    t.repeat.set(ru, rv); t.offset.set(uc - ru / 2, vc - rv / 2);
  }
}

export function buildBackdropEnv(envId, def) {
  const group = new THREE.Group(); group.name = 'env-' + envId;
  // invisible floor that only receives the characters' shadows (and is used for clicking / placing characters)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.38 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; floor.receiveShadow = true; floor.userData.ground = true; group.add(floor);
  return { id: envId, def, group, interior: false, grounds: [floor], heightAt: () => 0, update() { }, def2d: getScene(def.backdrop) };
}
