import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { mouthAmount } from './humans.js';
import { TIMES } from './data.js';
import { Backdrop } from './backdrop.js';
import { Overlay } from './overlay.js';
import { buildEnvironment } from './environment.js';
import { buildCharacter, poseCharacter } from './animate.js';
import { buildProp } from './props.js';
import { cameraAt, isTalking } from './model.js';

const FadeShader = { uniforms: { tDiffuse: { value: null }, amount: { value: 1 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'uniform sampler2D tDiffuse; uniform float amount; varying vec2 vUv; void main(){ vec4 c=texture2D(tDiffuse,vUv); gl_FragColor=vec4(c.rgb*amount,c.a);}' };

export class Engine {
  constructor(canvas) {
    this.canvas = canvas; this.quality = 'medium'; this.fade = 1;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    const r = this.renderer; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.55;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 2800);
    this.camera.position.set(0, 4, 14);
    this.controls = new OrbitControls(this.camera, canvas); this.controls.enableDamping = false; this.controls.maxPolarAngle = Math.PI * 0.499 + 0.05;
    this.controls.addEventListener('end', () => this.onCameraChange?.());
    this.envGroup = new THREE.Group(); this.charGroup = new THREE.Group(); this.propGroup = new THREE.Group(); this.helpers = new THREE.Group();
    this.scene.add(this.envGroup, this.charGroup, this.propGroup, this.helpers);

    // sky + lighting
    this.sky = new Sky(); this.sky.scale.setScalar(1500); this.scene.add(this.sky);
    this.sun = new THREE.DirectionalLight(0xffffff, 3); this.sun.castShadow = true; this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbcd4ff, 0x6b5a3c, 0.6); this.scene.add(this.hemi);
    this.pmrem = new THREE.PMREMGenerator(r); this.envKey = '';

    this.chars = new Map(); this.props = new Map(); this.env = null; this.envId = null; this.envCache = new Map();
    this.gltf = new GLTFLoader(); this.glbCache = new Map(); this.selection = null; this.editing = true;

    // gizmo
    this.proxy = new THREE.Object3D(); this.helpers.add(this.proxy);
    this.gizmo = new TransformControls(this.camera, canvas); this.gizmo.setSize(0.8); this.gizmo.attach(this.proxy); this.gizmoHelper = this.gizmo.getHelper(); this.helpers.add(this.gizmoHelper); this.gizmoHelper.visible = false; this.gizmo.enabled = false;
    this.gizmo.addEventListener('dragging-changed', e => { this.controls.enabled = !e.value; this.dragging = e.value; if (!e.value) this.onTransformEnd?.(); });
    this.gizmo.addEventListener('objectChange', () => this.onTransform?.(this.selection, this.proxy));
    this.pathLine = null; this.pathMarks = new THREE.Group(); this.helpers.add(this.pathMarks);
    this.startRing = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 32), new THREE.MeshBasicMaterial({ color: 0xffc400, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.9 })); this.startRing.rotation.x = -Math.PI / 2; this.startRing.visible = false; this.startRing.renderOrder = 10; this.helpers.add(this.startRing);

    // picking
    let down = null;
    canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', e => { if (!down || this.dragging) return; if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) this.click(e); down = null; });
    this.ray = new THREE.Raycaster();
    this.backdrop = new Backdrop(); this.overlay = new Overlay(); this.bdActive = false; this.ovl = null; this._scene = null; this._t = 0;
    this.setQuality('medium');
    this.applyTod('morning', false, 1);
  }

  /* ---------- quality / size ---------- */
  setQuality(q) {
    this.quality = q; const r = this.renderer;
    const size = { low: 1024, medium: 2048, high: 4096 }[q]; this.sun.shadow.mapSize.set(size, size); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    const s = this.sun.shadow.camera; const R = q === 'low' ? 22 : 28; s.left = -R; s.right = R; s.top = R; s.bottom = -R; s.near = 1; s.far = 220; s.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0003; this.sun.shadow.normalBias = 0.04; this.sun.shadow.radius = q === 'low' ? 1.5 : 3;
    this.pixelRatio = q === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, q === 'medium' ? 1.5 : 2);
    this.buildComposer(); this.resize();

    this.invalidateEnvs();
  }
  invalidateEnvs() { for (const e of this.envCache.values()) { this.disposeEnv(e); } this.envCache.clear(); if (this.env) { this.envGroup.remove(this.env.group); this.env = null; this.envId = null; } }
  disposeEnv(e) { e.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }

  buildComposer() {
    const q = this.quality; const w = this.w || 800, h = this.h || 450;
    if (this.composer) this.composer.dispose?.();
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: q === 'low' ? 0 : 4 });
    this.composer = new EffectComposer(this.renderer, rt); this.composer.setPixelRatio(this.pixelRatio);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.gtao = null;
    if (q === 'high') { try { this.gtao = new GTAOPass(this.scene, this.camera, w, h); this.gtao.output = GTAOPass.OUTPUT.Default; this.gtao.updateGtaoMaterial?.({ radius: 0.6, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); this.composer.addPass(this.gtao); } catch (e) { console.warn('GTAO unavailable', e); this.gtao = null; } }
    if (q !== 'low') { this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.18, 0.6, 1.2); this.composer.addPass(this.bloom); }
    this.fadePass = new ShaderPass(FadeShader); this.composer.addPass(this.fadePass);
    this.composer.addPass(new OutputPass());
  }

  resize(w, h, pixelRatio) {
    const p = this.canvas.parentElement; w = w || (p ? p.clientWidth : 800); h = h || (p ? p.clientHeight : 450); if (!w || !h) return;
    this.w = w; this.h = h; const pr = pixelRatio || this.pixelRatio;
    this.renderer.setPixelRatio(pr); this.renderer.setSize(w, h, false); this.canvas.style.width = '100%'; this.canvas.style.height = '100%';
    this.composer.setPixelRatio(pr); this.composer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  // Fixed-size render target for export
  setExportSize(w, h) { this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px'; this.resize(w, h, 1); }

  /* ---------- time of day ---------- */
  applyTod(tod, interior, fogMul) {
    const T = TIMES[tod] || TIMES.morning; this.tod = tod;
    const dir = new THREE.Vector3().setFromSphericalCoords(1, Math.PI / 2 - THREE.MathUtils.degToRad(T.elev), THREE.MathUtils.degToRad(T.azim));
    const skyDir = T.skyElev !== undefined ? new THREE.Vector3().setFromSphericalCoords(1, Math.PI / 2 - THREE.MathUtils.degToRad(T.skyElev), THREE.MathUtils.degToRad(T.azim)) : dir;
    const u = this.sky.material.uniforms; u.turbidity.value = T.turb; u.rayleigh.value = T.ray; u.mieCoefficient.value = 0.005; u.mieDirectionalG.value = 0.82; u.sunPosition.value.copy(skyDir);
    this.sunDir = dir; this.focus = this.focus || new THREE.Vector3(0, 0, 0); this.placeSun();
    this.sun.color.set(T.sun); this.sun.intensity = T.sunI * (interior ? 0.3 : 1);
    this.hemi.intensity = T.hemi * (interior ? 0.28 : 1); this.hemi.color.set(tod === 'evening' ? 0xffc9a0 : tod === 'night' ? 0x8fa0ff : 0xbcd4ff);
    this.renderer.toneMappingExposure = interior ? 0.7 : T.exp;
    this.scene.fog = new THREE.FogExp2(T.fog, T.fogD * fogMul * (interior ? 0.15 : 1)); this.interior = interior;
    if (this.bdActive) { this.scene.fog = null; this.renderer.toneMappingExposure = 1.0; }
    const key = tod + (interior ? 'i' : 'o');
    if (key !== this.envKey) { this.envKey = key; const es = new THREE.Scene(); const sk = new Sky(); sk.scale.setScalar(1000); sk.material.uniforms = THREE.UniformsUtils.clone(this.sky.material.uniforms); sk.material.uniforms.sunPosition.value.copy(skyDir); es.add(sk); const rt = this.pmrem.fromScene(es, 0.02); this.scene.environment?.dispose?.(); this.envTex = rt.texture; this.scene.environment = rt.texture; }
    this.scene.environmentIntensity = interior ? 0.12 : 0.55;
  }
  placeSun() { this.sun.position.copy(this.focus).addScaledVector(this.sunDir, 90); this.sun.target.position.copy(this.focus); this.sun.target.updateMatrixWorld(); }

  /* ---------- scene loading ---------- */
  loadScene(scene) {
    if (this.envId !== scene.env) {
      if (this.env) this.envGroup.remove(this.env.group);
      let e = this.envCache.get(scene.env); if (!e) { e = buildEnvironment(scene.env, this.quality); this.envCache.set(scene.env, e); }
      this.env = e; this.envId = scene.env; this.envGroup.add(e.group);
      this.focus = new THREE.Vector3(e.def.cam.target[0], 0, e.def.cam.target[2]); this.placeSun();
    }
    const bd = !!this.env.def.backdrop; this.bdActive = bd; this.sky.visible = !bd; this.scene.background = bd ? this.backdrop.tex : null;
    this.renderer.toneMapping = bd ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
    if (bd) this.backdrop.setScale(this.quality === 'low' ? 1 : this.quality === 'high' ? 2 : 1.5);
    this.applyTod(scene.tod, this.env.interior, scene.fog ?? 1);
    this.syncEntities(scene);
  }

  syncEntities(scene) {
    const wantC = new Set(scene.chars.map(c => c.id));
    for (const [id, o] of this.chars) if (!wantC.has(id) || o.type !== scene.chars.find(c => c.id === id)?.type) { this.charGroup.remove(o.rig.root); this.chars.delete(id); }
    for (const ch of scene.chars) if (!this.chars.has(ch.id)) { const rig = buildCharacter(ch); rig.root.userData.entity = { kind: 'char', id: ch.id }; this.charGroup.add(rig.root); this.chars.set(ch.id, { rig, type: ch.type, glb: null }); if (ch.glb && this.glbCache.has(ch.glb)) { this.attachGlb('char', ch.id, this.glbCache.get(ch.glb)); this.chars.get(ch.id).glbKey = ch.glb; } }
    const wantP = new Set(scene.props.map(p => p.id));
    for (const [id, o] of this.props) if (!wantP.has(id)) { this.propGroup.remove(o.obj); this.props.delete(id); }
    for (const p of scene.props) if (!this.props.has(p.id)) { const obj = buildProp(p.type); obj.userData.entity = { kind: 'prop', id: p.id }; this.propGroup.add(obj); this.props.set(p.id, { obj }); if (p.glb && this.glbCache.has(p.glb)) { this.attachGlb('prop', p.id, this.glbCache.get(p.glb)); this.props.get(p.id).glbKey = p.glb; } }
    for (const p of scene.props) { const o = this.props.get(p.id).obj; o.position.set(p.x, this.env.heightAt(p.x, p.z) + p.y, p.z); o.rotation.y = p.ry * Math.PI / 180; o.scale.setScalar(p.scale); }
    this.updateHelpers(scene);
  }

  // ---- user-supplied GLB models (cached per file so every scene / export can attach them synchronously) ----
  async loadGlbEntry(key, blob) {
    if (!this.glbCache.has(key)) { const url = URL.createObjectURL(blob); try { this.glbCache.set(key, await this.gltf.loadAsync(url)); } finally { URL.revokeObjectURL(url); } }
    return this.glbCache.get(key);
  }
  async applyGlb(kind, id, blob, key) { this.attachGlb(kind, id, await this.loadGlbEntry(key || id, blob)); }
  attachGlb(kind, id, gltf) {
    const m = cloneSkinned(gltf.scene); const bb = new THREE.Box3().setFromObject(m); const size = bb.getSize(new THREE.Vector3());
    const target = kind === 'char' ? 1.7 : 0.8; const k = target / Math.max(size.y, 0.001); m.scale.setScalar(k); bb.setFromObject(m); m.position.y -= bb.min.y; m.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    const holder = new THREE.Group(); holder.add(m);
    // built-in animation clips + mouth morph targets (mouthOpen / jawOpen / viseme_aa)
    const clips = gltf.animations || [], names = clips.map((c, i) => c.name || 'clip ' + (i + 1));
    const mixer = clips.length ? new THREE.AnimationMixer(m) : null, actions = {};
    clips.forEach((c, i) => { actions[names[i]] = mixer.clipAction(c); });
    const find = (re) => names.find(n => re.test(n)) || null;
    const notMove = names.find(n => !/walk|run|sprint|jog|stroll/i.test(n)) || null;
    const auto = { idle: find(/idle|stand|breath|rest|wait/i) || notMove, walk: find(/walk|stroll/i), run: find(/run|sprint|jog/i), talk: find(/talk|speak|gestic|chat|convers/i) };
    const mouth = []; m.traverse(o => { if (o.isMesh && o.morphTargetDictionary) { for (const [n, i] of Object.entries(o.morphTargetDictionary)) if (/mouth.?open|jaw.?open|viseme_aa|v_aa/i.test(n)) { mouth.push({ mesh: o, idx: i }); break; } } });
    const info = { mixer, actions, names, auto, mouth, started: false };
    if (kind === 'char') { const c = this.chars.get(id); if (!c) return; c.rig.root.children.forEach(ch => ch.visible = false); if (c.glb) c.rig.root.remove(c.glb); holder.userData.keep = true; c.glb = holder; c.gl = info; c.rig.root.add(holder); c.rig.root.userData.customModel = true; }
    else { const p = this.props.get(id); if (!p) return; p.obj.children.forEach(ch => ch.visible = false); if (p.glbHolder) p.obj.remove(p.glbHolder); p.glbHolder = holder; p.gl = info; p.obj.add(holder); }
  }
  glbInfo(kind, id) { const o = (kind === 'char' ? this.chars : this.props).get(id); const g = o?.gl; return g ? { clips: g.names, auto: g.auto, mouth: g.mouth.length > 0 } : null; }
  _startGlb(g) { if (g.started || !g.mixer) return; for (const a of Object.values(g.actions)) { a.play(); a.paused = true; a.setEffectiveWeight(0); } g.started = true; }
  _poseGlb(g, name, time) { // show exactly one clip at an exact time (so scrubbing and export are deterministic)
    if (!g.mixer) return; this._startGlb(g);
    for (const [n, a] of Object.entries(g.actions)) { const on = n === name; a.setEffectiveWeight(on ? 1 : 0); if (on) { const D = a.getClip().duration || 1; a.time = ((time % D) + D) % D; } }
    g.mixer.update(0);
  }
  _animateCharGlb(o, ch, s, t, scene) {
    const g = o.gl, holder = o.glb, talking = isTalking(scene, ch, t); holder.visible = true; holder.rotation.y = (ch.glbYaw || 0) * Math.PI / 180;
    let bob = 0, sway = 0;
    if (g?.mixer) {
      const state = s.moving ? (s.run ? 'run' : 'walk') : (talking ? 'talk' : 'idle');
      const pick = (st) => { const ov = ch.glbAnim?.[st]; if (ov === 'none') return null; return (ov && g.actions[ov]) ? ov : g.auto[st]; };
      let name = pick(state), own = !!name;
      if (!name && state === 'run') { name = pick('walk'); own = !!name; }
      if (!name) name = pick('idle');
      let x = t; if (own && state === 'walk') x = s.dist / 1.4 * (g.actions[name].getClip().duration || 1); if (own && state === 'run') x = s.dist / 3 * (g.actions[name].getClip().duration || 1);
      this._poseGlb(g, name, x);
    } else if (s.moving) bob = 0.03 * Math.abs(Math.sin(s.dist * 4));
    else if (talking) { bob = 0.012 * Math.abs(Math.sin(t * 11)); sway = 0.03 * Math.sin(t * 6); } // gentle talking motion for models without animations
    if (g?.mouth.length) { const open = talking ? mouthAmount(t, ch.id.length * 1.7) * 0.8 : 0; for (const { mesh, idx } of g.mouth) mesh.morphTargetInfluences[idx] = open; }
    holder.position.y = bob; holder.rotation.z = sway;
  }

  /* ---------- evaluate frame ---------- */
  setTime(scene, t, useCameraKeys = true) {
    for (const ch of scene.chars) { const o = this.chars.get(ch.id); if (!o) continue; const s = poseCharacter(o.rig, scene, ch, t, this.env.heightAt); if (o.glb) this._animateCharGlb(o, ch, s, t, scene); }
    for (const p of scene.props) { const o = this.props.get(p.id); const g = o?.gl; if (!g?.mixer) continue; const ov = p.glbAnim; const name = ov === 'none' ? null : (ov && g.actions[ov]) ? ov : g.names[0]; if (name) this._poseGlb(g, name, t * (p.glbSpeed || 1)); }
    this.env.update(t); this._scene = scene; this._t = t;
    if (this.bdActive) this.backdrop.paint(scene, t, this.env.def2d);
    if (useCameraKeys) { const c = cameraAt(scene, t); this.setCamera(c.pos, c.target, c.fov); }
  }
  setCamera(pos, target, fov) { this.camera.position.set(...pos); this.controls.target.set(...target); if (fov) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); } this.controls.update(); }
  getCamera() { return { pos: this.camera.position.toArray().map(v => +v.toFixed(3)), target: this.controls.target.toArray().map(v => +v.toFixed(3)), fov: +this.camera.fov.toFixed(1) }; }

  render() {
    this.fadePass.uniforms.amount.value = this.fade;
    if (this.bdActive && this._scene) this.backdrop.sync(this.camera, this._scene, this.env.def2d);
    this.composer.render();
    if (this.overlay.draw(this)) { const r = this.renderer, ac = r.autoClear; r.autoClear = false; r.render(this.overlay.scene, this.overlay.cam); r.autoClear = ac; }
  }

  /* ---------- selection, gizmo, path helpers ---------- */
  select(sel, scene, mode = 'translate') {
    this.selection = sel; this.mode = mode;
    const g = this.gizmo; g.enabled = !!sel && this.editing; this.gizmoHelper.visible = g.enabled;
    if (!sel) { this.startRing.visible = false; return this.updateHelpers(scene); }
    if (sel.kind === 'char') { const ch = scene.chars.find(c => c.id === sel.id); this.proxy.position.set(ch.x, this.env.heightAt(ch.x, ch.z), ch.z); this.proxy.rotation.set(0, ch.facing * Math.PI / 180, 0); this.proxy.scale.setScalar(1); g.setMode(mode === 'rotate' ? 'rotate' : 'translate'); g.showX = mode !== 'rotate'; g.showY = false; g.showZ = mode !== 'rotate'; if (mode === 'rotate') { g.showY = true; } }
    else { const p = scene.props.find(c => c.id === sel.id); this.proxy.position.set(p.x, p.y, p.z); this.proxy.rotation.set(0, p.ry * Math.PI / 180, 0); this.proxy.scale.setScalar(p.scale); g.setMode(mode); g.showX = g.showZ = mode !== 'rotate'; g.showY = true; if (mode === 'scale') { g.showX = g.showY = g.showZ = true; } }
    this.updateHelpers(scene);
  }
  setEditing(b) { this.editing = b; this.gizmo.enabled = b && !!this.selection; this.gizmoHelper.visible = this.gizmo.enabled; this.pathMarks.visible = b; this.startRing.visible = b && this.selection?.kind === 'char'; this.controls.enabled = true; }
  updateHelpers(scene) {
    while (this.pathMarks.children.length) { const c = this.pathMarks.children.pop(); c.geometry?.dispose(); }
    this.startRing.visible = false;
    if (!scene || this.selection?.kind !== 'char') return;
    const ch = scene.chars.find(c => c.id === this.selection.id); if (!ch) return;
    this.startRing.position.set(ch.x, this.env.heightAt(ch.x, ch.z) + 0.08, ch.z); this.startRing.visible = this.editing;
    const pts = [[ch.x, ch.z], ...ch.path]; if (pts.length > 1) { const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0], this.env.heightAt(p[0], p[1]) + 0.12, p[1]))); const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffc400, depthTest: false })); ln.renderOrder = 11; this.pathMarks.add(ln); }
    ch.path.forEach((p, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: i === ch.path.length - 1 ? 0xff5030 : 0xffc400, depthTest: false })); m.position.set(p[0], this.env.heightAt(p[0], p[1]) + 0.15, p[1]); m.renderOrder = 12; this.pathMarks.add(m); });
  }
  groundPoint(e) {
    const rect = this.canvas.getBoundingClientRect(); const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera); const hit = this.ray.intersectObjects(this.env.grounds, false)[0]; if (hit) return hit.point;
    const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); const p = new THREE.Vector3(); return this.ray.ray.intersectPlane(pl, p) ? p : null;
  }
  click(e) {
    if (this.pathMode) { const p = this.groundPoint(e); if (p) this.onGroundClick?.(+p.x.toFixed(2), +p.z.toFixed(2)); return; }
    const rect = this.canvas.getBoundingClientRect(); const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera); const hits = this.ray.intersectObjects([this.charGroup, this.propGroup], true);
    for (const h of hits) { let o = h.object; while (o && !o.userData.entity) o = o.parent; if (o) { this.onPick?.(o.userData.entity); return; } }
    this.onPick?.(null);
  }
}
