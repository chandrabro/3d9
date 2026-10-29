// Full-frame 2D overlay drawn on top of the 3D picture: speech bubbles, subtitles, titles/captions, watermark.
// It is rendered by engine.render(), so it appears in the preview and in every export.
import * as THREE from 'three';
import { CHARS } from './data.js';
import { dialogDur, speechState } from './model.js';
import { drawSubtitle } from './subtitles.js';
import { wrapText, roundRect, clamp } from './scenes2d/util.js';

const FONT = '"Noto Sans Devanagari","Mukta","Nirmala UI","Segoe UI","Nunito",system-ui,sans-serif';
export const BUBBLE_STYLES = [['rounded', 'Speech'], ['thought', 'Thought (cloud)'], ['shout', 'Shout (spiky)'], ['box', 'Box'], ['whisper', 'Whisper (dashed)']];

export function dialogActive(d, t) {
  const st = speechState.map?.get(d.id);
  if (st) return st === 'speaking';
  return t >= d.t && t < d.t + dialogDur(d);
}

export class Overlay {
  constructor() {
    this.canvas = document.createElement('canvas'); this.ctx = this.canvas.getContext('2d');
    const t = this.tex = new THREE.CanvasTexture(this.canvas); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter;
    this.scene = new THREE.Scene(); this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    m.frustumCulled = false; this.scene.add(m); this.dirty = false; this.v = new THREE.Vector3(); this.W = 0; this.H = 0;
  }
  /** Draws everything for this frame. Returns true when there is something to show. */
  draw(engine) {
    const info = engine.ovl, scene = engine._scene, t = engine._t; if (!info || !scene) return false;
    const o = info.opts || {}, subs = o.subs || { mode: 'off' };
    const size = engine.renderer.getDrawingBufferSize(new THREE.Vector2()), W = size.x, H = size.y;
    const items = { bub: [], sub: null, caps: [] };
    const sorted = [...scene.dialogs].sort((a, b) => a.t - b.t);
    for (const d of sorted) {
      if (!(d.text || '').trim() || d.bubble === false || !dialogActive(d, t)) continue;
      const showSub = subs.mode === 'all' || (subs.mode === 'narrator' && !d.charId);
      if (showSub) items.sub = d;
      if (d.charId && o.bubbles !== false && !(subs.mode === 'all' && subs.hideBubbles)) items.bub.push(d);
    }
    for (const c of scene.captions || []) if (t >= c.start && t < c.end) items.caps.push(c);
    const wm = o.watermark;
    const any = items.bub.length || items.sub || items.caps.length || wm;
    if (!any) { if (this.dirty) { this.clear(W, H); this.dirty = false; } return false; }
    if (W !== this.W || H !== this.H) { this.W = this.canvas.width = W; this.H = this.canvas.height = H; }
    const ctx = this.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
    for (const d of items.bub) this.bubble(engine, scene, d, W, H, o.bubbleStyle);
    for (const c of items.caps) this.caption(ctx, c, W, H, t - c.start, c.end - t);
    if (items.sub) {
      const d = items.sub, ch = scene.chars.find(c => c.id === d.charId);
      drawSubtitle(ctx, { ...subs, size: subs.size || 0.045 }, d.text.trim(), subs.speakerNames ? (ch ? info.name(ch) : 'Narrator') : '', Math.max(0, t - d.t), dialogDur(d), W, H);
    }
    if (wm) { ctx.font = `${Math.round(H * 0.025)}px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.textAlign = 'right'; ctx.fillText(wm, W - 16, H - 14); ctx.textAlign = 'left'; }
    this.tex.needsUpdate = true; this.dirty = true; return true;
  }
  clear(W, H) { if (W !== this.W || H !== this.H) { this.W = this.canvas.width = W; this.H = this.canvas.height = H; } this.ctx.clearRect(0, 0, W, H); this.tex.needsUpdate = true; }

  headPoint(engine, scene, id) {
    const ch = scene.chars.find(c => c.id === id), o = engine.chars.get(id); if (!ch || !o) return null;
    const def = CHARS[ch.type], base = def.kind === 'animal' ? 0.95 : def.kind === 'group' ? 1.75 : ch.type === 'oldman' ? 1.62 : 1.78;
    const p = this.v.copy(o.rig.root.position); p.y += base * (ch.scale || 1) + 0.08;
    p.project(engine.camera); if (p.z > 1 || p.z < -1) return null;
    return { x: (p.x * 0.5 + 0.5) * this.W, y: (0.5 - p.y * 0.5) * this.H };
  }
  bubble(engine, scene, d, W, H, projStyle) {
    const pt = this.headPoint(engine, scene, d.charId); if (!pt) return;
    const style = d.bubbleStyle || projStyle || 'rounded', ctx = this.ctx, s = H / 720;
    ctx.save(); ctx.font = `600 ${Math.round(24 * s)}px ${FONT}`;
    const maxW = Math.min(W * 0.42, 360 * s * (H > W ? 1.4 : 1)), lines = wrapText(ctx, d.text.trim(), maxW), lh = 30 * s, pad = 15 * s;
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + pad * 2, h = lines.length * lh + pad * 1.6;
    const x = clamp(pt.x, 24 * s, W - 24 * s);
    let bx = clamp(x - w / 2, 10 * s, W - w - 10 * s), by = pt.y - h - 20 * s; by = clamp(by, 10 * s, H - h - 30 * s);
    const bg = d.bubbleColor || '#ffffff', stroke = style === 'whisper' || style === 'box';
    ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = 12 * s; ctx.shadowOffsetY = 4 * s; ctx.fillStyle = bg;
    if (style === 'thought') {
      roundRect(ctx, bx, by, w, h, h / 2); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.beginPath(); ctx.arc(x, by + h + 11 * s, 7 * s, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + 5 * s, by + h + 25 * s, 4 * s, 0, 7); ctx.fill();
    } else if (style === 'shout') {
      ctx.beginPath(); const n = 18; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, r = i % 2 ? 1 : 1.12; ctx.lineTo(bx + w / 2 + Math.cos(a) * (w / 2) * r, by + h / 2 + Math.sin(a) * (h / 2 + 6 * s) * r); } ctx.closePath(); ctx.fill();
    } else if (style === 'box') {
      ctx.fillRect(bx, by, w, h); ctx.shadowColor = 'transparent'; ctx.beginPath(); ctx.moveTo(x - 9 * s, by + h); ctx.lineTo(x, by + h + 16 * s); ctx.lineTo(x + 9 * s, by + h); ctx.fill();
    } else {
      roundRect(ctx, bx, by, w, h, 15 * s); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.beginPath(); ctx.moveTo(clamp(x - 10 * s, bx + 12, bx + w - 30), by + h - 1); ctx.lineTo(clamp(x, bx + 20, bx + w - 20), by + h + 18 * s); ctx.lineTo(clamp(x + 10 * s, bx + 30, bx + w - 12), by + h - 1); ctx.fill();
    }
    ctx.shadowColor = 'transparent';
    if (stroke) { ctx.save(); ctx.strokeStyle = '#444'; ctx.lineWidth = 2 * s; if (style === 'whisper') ctx.setLineDash([7 * s, 5 * s]); roundRect(ctx, bx, by, w, h, style === 'box' ? 2 : 15 * s); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = d.textColor || '#1c1c28'; ctx.textBaseline = 'top';
    if (style === 'whisper') ctx.font = `italic 500 ${Math.round(22 * s)}px ${FONT}`;
    lines.forEach((l, i) => ctx.fillText(l, bx + pad, by + pad * 0.8 + i * lh));
    ctx.restore();
  }
  caption(ctx, c, W, H, since, until) {
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, since / 0.3, until / 0.3));
    const size = Math.round(H * (c.size || 0.05)); ctx.font = `800 ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lines = wrapText(ctx, c.text || '', W * 0.86), pos = c.position || 'bottom';
    const y0 = pos === 'top' ? H * 0.12 : pos === 'center' ? H / 2 - (lines.length - 1) * size * 0.6 : H * 0.88 - (lines.length - 1) * size * 1.2;
    lines.forEach((l, i) => {
      const y = y0 + i * size * 1.2;
      if (c.style === 'title') { ctx.lineWidth = size * 0.18; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.strokeText(l, W / 2, y); ctx.fillStyle = c.color || '#ffd166'; ctx.fillText(l, W / 2, y); }
      else { const tw = ctx.measureText(l).width; ctx.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(ctx, W / 2 - tw / 2 - size * 0.4, y - size * 0.65, tw + size * 0.8, size * 1.3, size * 0.3); ctx.fill(); ctx.fillStyle = c.color || '#fff'; ctx.fillText(l, W / 2, y); }
    });
    ctx.restore();
  }
}
