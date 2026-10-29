// Subtitles: burned-in drawing (classic / boxed / karaoke word highlight) and .srt / .vtt export.
// Cue text always comes from the dialog lines (narrator + characters).

import { clamp, wrapText, roundRect } from './scenes2d/util.js';

export const SUB_STYLES = [['classic', 'Classic (white + outline)'], ['boxed', 'Boxed (dark bar)'], ['karaoke', 'Karaoke (word highlight)'], ['karaoke_box', 'Karaoke on dark bar']];
export const SUB_MODES = [['off', 'Off'], ['narrator', 'Narrator lines only'], ['all', 'All speech (narrator + characters)']];

export function defaultSubtitles() {
  return { mode: 'narrator', style: 'classic', position: 'bottom', size: 0.045, color: '#ffffff', highlight: '#ffd166', speakerNames: false, hideBubbles: false };
}
export function ensureSubtitles(p) { p.subtitles = { ...defaultSubtitles(), ...(p.subtitles || {}) }; return p.subtitles; }

/** Does this dialog get a burned-in subtitle under the project's subtitle settings? */
export function showsSubtitle(sub, d) {
  if (!sub || sub.mode === 'off' || !d.text || d.bubble === false) return false;
  return d.actor === -1 || sub.mode === 'all';
}

/** Split text into words with timing weights (longer words take longer to say). */
function wordTimes(words) {
  const w = words.map((x) => x.length + 1.5); const sum = w.reduce((a, b) => a + b, 0);
  let acc = 0; return w.map((x) => { acc += x / sum; return acc; });
}

export function drawSubtitle(ctx, sub, text, speaker, elapsed, dur, W, H) {
  if (!text) return;
  const portrait = H > W;
  const size = Math.round(Math.min(W, H) * sub.size * (portrait ? 1.2 : 1));
  const alpha = Math.min(1, elapsed / 0.15, Math.max(0, dur - elapsed) / 0.2);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `800 ${size}px "Nunito", "Segoe UI", sans-serif`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const maxW = W * (portrait ? 0.88 : 0.84);
  const lines = wrapText(ctx, text, maxW);
  const lineH = size * 1.28;
  const karaoke = sub.style === 'karaoke' || sub.style === 'karaoke_box';
  const boxed = sub.style === 'boxed' || sub.style === 'karaoke_box';
  const label = sub.speakerNames && speaker ? speaker : '';
  const blockH = lines.length * lineH + (label ? lineH * 0.8 : 0);
  const baseY = sub.position === 'top' ? H * 0.13 : sub.position === 'center' ? H * 0.5 : H * (portrait ? 0.76 : 0.87);
  const top = sub.position === 'top' ? baseY : sub.position === 'center' ? baseY - blockH / 2 : baseY - blockH + lineH / 2;
  if (boxed) {
    let wMax = 0; for (const l of lines) wMax = Math.max(wMax, ctx.measureText(l).width);
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    roundRect(ctx, W / 2 - wMax / 2 - size * 0.6, top - size * 0.45, wMax + size * 1.2, blockH + size * 0.35, size * 0.4); ctx.fill();
  }
  let y = top;
  if (label) {
    ctx.font = `800 ${Math.round(size * 0.7)}px "Nunito", "Segoe UI", sans-serif`;
    const lw = ctx.measureText(label).width; ctx.fillStyle = sub.highlight;
    if (!boxed) { ctx.lineWidth = size * 0.14; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(label, W / 2 - lw / 2, y + lineH * 0.3); }
    ctx.fillText(label, W / 2 - lw / 2, y + lineH * 0.3);
    y += lineH * 0.8; ctx.font = `800 ${size}px "Nunito", "Segoe UI", sans-serif`;
  }
  // global word index across wrapped lines, for karaoke timing
  const allWords = text.trim().split(/\s+/); const bounds = wordTimes(allWords);
  const u = clamp(elapsed / Math.max(0.2, dur * 0.92), 0, 1);
  let wi = 0;
  ctx.lineWidth = size * 0.16; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  const space = ctx.measureText(' ').width;
  for (const line of lines) {
    const ws = line.split(' ');
    const widths = ws.map((x) => ctx.measureText(x).width);
    const total = widths.reduce((a, b) => a + b, 0) + space * (ws.length - 1);
    let x = W / 2 - total / 2;
    ws.forEach((word, k) => {
      const spoken = karaoke ? (wi === 0 ? u >= 0 : u >= (bounds[wi - 1] || 0)) : false;
      const active = karaoke && u >= (bounds[wi - 1] || 0) && u < bounds[wi];
      if (!boxed) ctx.strokeText(word, x, y + lineH / 2);
      ctx.fillStyle = karaoke ? (spoken ? sub.highlight : sub.color) : sub.color;
      if (active) { ctx.save(); const cx = x + widths[k] / 2, cy = y + lineH / 2; ctx.translate(cx, cy); ctx.scale(1.08, 1.08); ctx.translate(-cx, -cy); ctx.fillText(word, x, cy); ctx.restore(); } else ctx.fillText(word, x, y + lineH / 2);
      x += widths[k] + space; wi++;
    });
    y += lineH;
  }
  ctx.restore();
}

// ---------- subtitle files ----------
/** All dialog lines as cues on the global timeline. */
export function buildCues(project, audioInfo, dialogDurationFn, { speakerNames = false } = {}) {
  const cues = []; let t0 = 0;
  for (const s of project.scenes) {
    for (const d of s.dialogs.slice().sort((a, b) => a.start - b.start)) {
      if (!d.text || !String(d.text).trim()) continue;
      const dur = dialogDurationFn(d, audioInfo);
      let name = '';
      if (speakerNames) {
        if (d.actor === -1) name = 'Narrator'; else { const a = s.actors[d.actor]; const c = a && project.characters.find((x) => x.id === a.characterId); name = c ? c.name : ''; }
      }
      cues.push({ start: t0 + d.start, end: t0 + d.start + dur, text: (name ? name + ': ' : '') + String(d.text).trim() });
    }
    t0 += s.duration;
  }
  // never let a cue run into the next one
  cues.sort((a, b) => a.start - b.start);
  for (let i = 0; i < cues.length - 1; i++) if (cues[i].end > cues[i + 1].start - 0.02) cues[i].end = Math.max(cues[i].start + 0.3, cues[i + 1].start - 0.02);
  return cues;
}
const pad = (n, l = 2) => String(n).padStart(l, '0');
function stamp(t, comma) {
  const ms = Math.round(Math.max(0, t) * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)}${comma ? ',' : '.'}${pad(r, 3)}`;
}
export function toSrt(cues) { return cues.map((c, i) => `${i + 1}\n${stamp(c.start, true)} --> ${stamp(c.end, true)}\n${c.text}\n`).join('\n'); }
export function toVtt(cues) { return 'WEBVTT\n\n' + cues.map((c, i) => `${i + 1}\n${stamp(c.start, false)} --> ${stamp(c.end, false)}\n${c.text}\n`).join('\n'); }
