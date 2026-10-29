import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4Target } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmTarget } from 'webm-muxer';
import { renderMix, actx } from './audio.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

function fadeAmount(project, scene, t) { if (!project.fade) return 1; const f = 0.45; return Math.min(smooth(t / f), smooth((scene.duration - t) / f)); }
function locate(scenes, T) { let acc = 0; for (let i = 0; i < scenes.length; i++) { if (T < acc + scenes[i].duration || i === scenes.length - 1) return { i, t: Math.min(T - acc, scenes[i].duration) }; acc += scenes[i].duration; } }

async function pickCodecs(w, h, fps, bitrate) {
  const res = { mp4: null, webm: null };
  if (typeof VideoEncoder === 'undefined' || typeof AudioEncoder === 'undefined') return res;
  for (const codec of ['avc1.640033', 'avc1.640028', 'avc1.64001f', 'avc1.42001f']) {
    try { const s = await VideoEncoder.isConfigSupported({ codec, width: w, height: h, bitrate, framerate: fps }); if (s.supported) { const a = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 160000 }); if (a.supported) { res.mp4 = { v: codec, a: 'mp4a.40.2' }; } break; } } catch { }
  }
  for (const codec of ['vp09.00.40.08', 'vp09.00.10.08', 'vp8']) {
    try { const s = await VideoEncoder.isConfigSupported({ codec, width: w, height: h, bitrate, framerate: fps }); if (s.supported) { const a = await AudioEncoder.isConfigSupported({ codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 }); if (a.supported) { res.webm = { v: codec, a: 'opus' }; } break; } } catch { }
  }
  return res;
}

/**
 * Export the given scenes to a video file entirely in the browser.
 * app: { engine, project }
 */
export const ASPECTS = { '16:9': [16, 9], '9:16': [9, 16], '1:1': [1, 1], '4:5': [4, 5], '4:3': [4, 3] };
export function frameSize(res, aspect = '16:9') { const [a, b] = ASPECTS[aspect] || ASPECTS['16:9']; const short = res === 1080 ? 1080 : 720; let w, h; if (a >= b) { h = short; w = Math.round(short * a / b); } else { w = short; h = Math.round(short * b / a); } return [w + (w % 2), h + (h % 2)]; }
export async function exportVideo({ engine, project, scenes, res = 720, aspect = '16:9', fps = 30, onProgress, signal, liveStream = null, speechTick = null }) {
  const [W, H] = frameSize(res, aspect); const bitrate = (res === 1080 ? 10_000_000 : 6_000_000) * Math.max(0.6, (W * H) / (res === 1080 ? 1920 * 1080 : 1280 * 720));
  const total = scenes.reduce((a, s) => a + s.duration, 0); const frames = Math.ceil(total * fps);
  onProgress?.(0, 'Mixing audio…');
  const { buffer: mix } = await renderMix(scenes, 48000);
  const codecs = await pickCodecs(W, H, fps, bitrate);
  const mode = liveStream ? 'recorder' : codecs.mp4 ? 'mp4' : codecs.webm ? 'webm' : 'recorder';

  const restore = () => { engine.resize(); };
  engine.setExportSize(W, H); engine.setEditing(false);
  let curScene = -1;
  const drawFrame = (T) => {
    const { i, t } = locate(scenes, T);
    const fresh = i !== curScene; if (fresh) { curScene = i; engine.loadScene(scenes[i]); }
    if (liveStream) speechTick?.(scenes[i], t, fresh);
    engine.setTime(scenes[i], t, true); engine.fade = fadeAmount(project, scenes[i], t); engine.render();
  };

  try {
    if (mode === 'recorder') return await recordRealtime({ engine, mix, total, fps, drawFrame, onProgress, signal, W, H, liveStream });
    const target = mode === 'mp4' ? new Mp4Target() : new WebmTarget();
    const cfg = codecs[mode];
    const muxer = mode === 'mp4'
      ? new Mp4Muxer({ target, video: { codec: 'avc', width: W, height: H }, audio: { codec: 'aac', sampleRate: 48000, numberOfChannels: 2 }, fastStart: 'in-memory' })
      : new WebmMuxer({ target, video: { codec: cfg.v.startsWith('vp09') ? 'V_VP9' : 'V_VP8', width: W, height: H, frameRate: fps }, audio: { codec: 'A_OPUS', sampleRate: 48000, numberOfChannels: 2 } });
    let err = null;
    const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { err = e; } });
    venc.configure({ codec: cfg.v, width: W, height: H, bitrate, framerate: fps, ...(mode === 'mp4' ? { avc: { format: 'avc' } } : {}) });
    const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => { err = e; } });
    aenc.configure({ codec: cfg.a, sampleRate: 48000, numberOfChannels: 2, bitrate: mode === 'mp4' ? 160000 : 128000 });

    const L = mix.getChannelData(0), R = mix.getChannelData(1); let aPos = 0; const CH = 4800;
    const feedAudio = (untilSec) => {
      const end = Math.min(mix.length, Math.floor(untilSec * 48000));
      while (aPos < end) {
        const n = Math.min(CH, end - aPos); const data = new Float32Array(n * 2); data.set(L.subarray(aPos, aPos + n), 0); data.set(R.subarray(aPos, aPos + n), n);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(aPos / 48000 * 1e6), data });
        aenc.encode(ad); ad.close(); aPos += n;
      }
    };

    for (let f = 0; f < frames; f++) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (err) throw err;
      drawFrame(f / fps);
      const vf = new VideoFrame(engine.canvas, { timestamp: Math.round(f * 1e6 / fps), duration: Math.round(1e6 / fps) });
      venc.encode(vf, { keyFrame: f % (fps * 2) === 0 }); vf.close();
      feedAudio((f + 1) / fps);
      while (venc.encodeQueueSize > 6 || aenc.encodeQueueSize > 40) await sleep(4);
      if (f % 3 === 0) { onProgress?.(f / frames, `Rendering frame ${f + 1} / ${frames}`); await sleep(0); }
    }
    feedAudio(mix.duration + 1);
    onProgress?.(0.99, 'Finalising file…');
    await venc.flush(); await aenc.flush(); muxer.finalize(); venc.close(); aenc.close();
    const blob = new Blob([target.buffer], { type: mode === 'mp4' ? 'video/mp4' : 'video/webm' });
    return { blob, ext: mode, info: mode === 'mp4' ? 'MP4 (H.264 + AAC)' : `WebM (${cfg.v.startsWith('vp09') ? 'VP9' : 'VP8'} + Opus) — MP4/AAC encoding is not available in this browser` };
  } finally { engine.fade = 1; restore(); }
}

// Fallback: real-time capture of the canvas + mixed audio with MediaRecorder
async function recordRealtime({ engine, mix, total, fps, drawFrame, onProgress, signal, liveStream }) {
  const ctx = actx(); if (ctx.state === 'suspended') await ctx.resume();
  const dest = ctx.createMediaStreamDestination(); const src = ctx.createBufferSource(); src.buffer = mix; src.connect(dest);
  let live = null; if (liveStream) { live = ctx.createMediaStreamSource(liveStream); live.connect(dest); }
  const stream = engine.canvas.captureStream(fps); dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
  const mime = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 }); const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise(r => { rec.onstop = r; }); rec.start(250); src.start(); const t0 = performance.now();
  await new Promise((resolve, reject) => {
    const tick = () => { if (signal?.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; } const T = (performance.now() - t0) / 1000; if (T >= total) { resolve(); return; } drawFrame(T); onProgress?.(T / total, `Recording in real time… ${T.toFixed(0)} / ${total.toFixed(0)} s`); requestAnimationFrame(tick); };
    tick();
  }).catch(e => { try { src.stop(); rec.stop(); } catch { } throw e; });
  await new Promise(r => setTimeout(r, 500)); // let the last words land
  rec.stop(); await done; try { src.stop(); } catch { } try { live?.disconnect(); } catch { }
  const isMp4 = (rec.mimeType || mime || '').includes('mp4');
  return { blob: new Blob(chunks, { type: isMp4 ? 'video/mp4' : 'video/webm' }), ext: isMp4 ? 'mp4' : 'webm', info: (isMp4 ? 'MP4' : 'WebM') + ' recorded in real time' + (liveStream ? ' with captured browser-voice audio' : ' (WebCodecs is not available in this browser)') };
}
