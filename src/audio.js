import { uid, dialogDur } from './model.js';

/* ---------------- IndexedDB (audio blobs + autosaved project) ---------------- */
let dbp;
function db() {
  return dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('nepali-story-studio', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('blobs', { keyPath: 'key' }); r.result.createObjectStore('project'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
const tx = async (store, mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(store, mode); const out = fn(t.objectStore(store)); t.oncomplete = () => res(out.result); t.onerror = () => rej(t.error); }); };
export async function putBlob(blob, name = '', key = uid('a')) { await tx('blobs', 'readwrite', s => s.put({ key, blob, name })); bufCache.delete(key); return key; }
export async function getBlob(key) { const r = await tx('blobs', 'readonly', s => s.get(key)); return r?.blob || null; }
export async function saveProjectDb(p) { try { await tx('project', 'readwrite', s => s.put(p, 'current')); } catch (e) { console.warn('autosave failed', e); } }
export async function loadProjectDb() { try { return await tx('project', 'readonly', s => s.get('current')); } catch { return null; } }

/* ---------------- decoding ---------------- */
let _ctx; export const actx = () => (_ctx ||= new (window.AudioContext || window.webkitAudioContext)());
const bufCache = new Map();
export async function getBuffer(key) {
  if (!key) return null; if (bufCache.has(key)) return bufCache.get(key);
  const blob = await getBlob(key); if (!blob) return null;
  try { const buf = await actx().decodeAudioData(await blob.arrayBuffer()); bufCache.set(key, buf); return buf; } catch (e) { console.warn('decode failed', e); return null; }
}

/* ---------------- microphone recording ---------------- */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); const chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data); rec.start(200);
  return { stop: () => new Promise(res => { rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); res(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })); }; rec.stop(); }) };
}

/* ---------------- scheduling shared by preview + offline mix ---------------- */
async function sceneSources(scene) {
  const out = [];
  if (scene.narration?.key) { const b = await getBuffer(scene.narration.key); if (b) out.push({ kind: 'narr', buf: b, at: 0, gain: scene.narration.vol ?? 1 }); }
  for (const d of scene.dialogs) if (d.audioKey) { const b = await getBuffer(d.audioKey); if (b) out.push({ kind: 'dlg', buf: b, at: d.t, gain: d.gain ?? 1 }); }
  if (scene.music?.key) { const b = await getBuffer(scene.music.key); if (b) out.push({ kind: 'music', buf: b, at: 0, gain: scene.music.vol ?? 0.35, loop: true, fade: scene.music.fade ?? 1.5 }); }
  return out;
}
function schedule(ctx, dest, srcs, sceneDur, base, from = 0) {
  const nodes = [];
  for (const s of srcs) {
    const g = ctx.createGain(); g.gain.value = s.gain; g.connect(dest);
    const src = ctx.createBufferSource(); src.buffer = s.buf; src.connect(g); nodes.push(src);
    const sceneEnd = base + sceneDur - from;
    if (s.loop) {
      src.loop = true; const off = (from % s.buf.duration); const f = Math.min(s.fade, sceneDur / 3);
      if (from > 0.01) g.gain.setValueAtTime(s.gain, base); else { g.gain.setValueAtTime(0.0001, base); g.gain.linearRampToValueAtTime(s.gain, base + f); }
      g.gain.setValueAtTime(s.gain, Math.max(base + f, sceneEnd - f)); g.gain.linearRampToValueAtTime(0.0001, sceneEnd);
      src.start(base, off); src.stop(sceneEnd);
    } else {
      const startT = s.at; const dur = s.buf.duration;
      if (startT + dur <= from) continue;
      const off = Math.max(0, from - startT), when = base + Math.max(0, startT - from);
      src.start(when, off); src.stop(Math.min(when + dur - off + 0.05, sceneEnd + 4));
    }
  }
  return nodes;
}

/* ---------------- offline mix-down of the whole project (for export) ---------------- */
export async function renderMix(scenes, sampleRate = 48000) {
  const total = scenes.reduce((a, s) => a + s.duration, 0);
  const off = new OfflineAudioContext(2, Math.ceil(total * sampleRate), sampleRate);
  let base = 0; let any = false;
  for (const sc of scenes) { const srcs = await sceneSources(sc); if (srcs.length) any = true; schedule(off, off.destination, srcs, sc.duration, base, 0); base += sc.duration; }
  const buf = await off.startRendering(); return { buffer: buf, any };
}

/* ---------------- realtime preview player ---------------- */
export class Player {
  constructor() { this.nodes = []; this.master = null; }
  async play(scene, from = 0) {
    this.stop(); const ctx = actx(); if (ctx.state === 'suspended') await ctx.resume();
    this.master = ctx.createGain(); this.master.connect(ctx.destination);
    const srcs = await sceneSources(scene); this.nodes = schedule(ctx, this.master, srcs.map(s => s), scene.duration - 0, ctx.currentTime + 0.05, from);
    this.base = ctx.currentTime + 0.05;
  }
  stop() { for (const n of this.nodes) { try { n.stop(); } catch { } try { n.disconnect(); } catch { } } this.nodes = []; if (this.master) { try { this.master.disconnect(); } catch { } this.master = null; } }
}

export async function audioDuration(blob) { try { const b = await actx().decodeAudioData(await blob.arrayBuffer()); return b.duration; } catch { return 0; } }
export async function blobToDataUrl(blob) { return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }); }
export async function dataUrlToBlob(u) { return (await fetch(u)).blob(); }
