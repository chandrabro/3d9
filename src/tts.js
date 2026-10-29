// Text-to-speech: browser voices only (Web Speech API: Microsoft Edge "Natural" voices / Google Chrome voices).
import { CHARS } from './data.js';

// Which voice type a dialog uses: explicit override > character gender > narrator
export function voiceTypeFor(scene, d) {
  if (d.voice && d.voice !== 'auto') return d.voice;
  const ch = scene.chars.find(c => c.id === d.charId); const g = ch ? (ch.app?.gender || CHARS[ch.type].gender) : 'none';
  return g === 'male' || g === 'female' ? g : 'narrator';
}

/* ======================================================================
 * Browser voices (Web Speech API): the voices installed in your browser / operating system.
 *  - Microsoft Edge: Microsoft "Natural" voices (e.g. Swara / Madhur for Hindi, Hemkala / Sagar for Nepali)
 *  - Google Chrome: Google voices + the voices of your OS
 * These play through the speakers, so they are heard in the preview. They cannot be encoded into an
 * exported file offline; use "Live export" (records your system audio) for exports.
 * ==================================================================== */
export const browserTtsAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let _voices = [];
export function getBrowserVoices() {
  if (!browserTtsAvailable()) return [];
  const v = speechSynthesis.getVoices(); if (v.length) _voices = v; return _voices;
}
if (browserTtsAvailable()) { getBrowserVoices(); speechSynthesis.addEventListener?.('voiceschanged', () => { getBrowserVoices(); window.dispatchEvent(new Event('nss-voices')); }); }

export const LANG_CODES = { ne: 'ne-NP', hi: 'hi-IN', 'en-us': 'en-US' };
const norm = (l) => (l || '').replace('_', '-').toLowerCase();
export function voicesForLang(lang) { const base = (LANG_CODES[lang] || lang).slice(0, 2).toLowerCase(); return getBrowserVoices().filter(v => norm(v.lang).startsWith(base)); }
export function autoPickVoice(lang, type) {
  const c = voicesForLang(lang); if (!c.length) return null;
  const female = /swara|neerja|heera|kalpana|hemkala|female|zira|aria|jenny|google/i, male = /madhur|prabhat|hemant|sagar|male|david|guy|mark/i;
  const want = type === 'female' ? female : male; const score = (v) => (/natural|online/i.test(v.name) ? 4 : 0) + (want.test(v.name) ? 3 : 0) + (type !== 'female' && female.test(v.name) && !male.test(v.name) ? -2 : 0) + (v.localService ? 0 : 1);
  return [...c].sort((a, b) => score(b) - score(a))[0];
}
export function browserProfile(project, scene, d) {
  const type = voiceTypeFor(scene, d); const v = project.voices[type] || {}; const lang = d.lang || v.lang || 'ne';
  let voice = v.bVoice ? getBrowserVoices().find(x => x.name === v.bVoice) : null;
  if (!voice || norm(voice.lang).slice(0, 2) !== (LANG_CODES[lang] || lang).slice(0, 2).toLowerCase()) voice = autoPickVoice(lang, type) || voice;
  return { type, voice, langCode: LANG_CODES[lang] || lang, rate: v.bRate || 1, pitch: v.bPitch || 1 };
}

let _cur = null;
// onstart / onend(ok) report the REAL start and end of the speech (ok=false when it was cancelled).
export function speakBrowser(text, { voice, langCode = 'hi-IN', rate = 1, pitch = 1, volume = 1, onstart, onend } = {}) {
  if (!browserTtsAvailable()) { onend?.(false); return Promise.resolve(0); }
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text); if (voice) u.voice = voice; u.lang = voice?.lang || langCode; u.rate = rate; u.pitch = pitch; u.volume = volume;
    let t0 = performance.now(), ka = 0, done = false;
    u.onstart = () => { t0 = performance.now(); onstart?.();
      // Chrome silently stalls long utterances; a pause/resume every 10 s keeps them going
      ka = setInterval(() => { if (speechSynthesis.speaking && !speechSynthesis.paused) { speechSynthesis.pause(); speechSynthesis.resume(); } }, 10000); };
    const end = (ok) => { if (done) return; done = true; clearInterval(ka); if (_cur === u) _cur = null; onend?.(ok); resolve((performance.now() - t0) / 1000); };
    u.onend = () => end(true); u.onerror = () => end(false);
    _cur = u; speechSynthesis.speak(u);
  });
}
export function cancelBrowser() { if (browserTtsAvailable()) { speechSynthesis.cancel(); _cur = null; } }
// Silent run to learn how long a line really takes with a given browser voice, and how long the voice needs to start
export async function measureBrowser(text, prof) {
  cancelBrowser(); const t0 = performance.now(); let lat = 0;
  const s = await Promise.race([speakBrowser(text, { ...prof, volume: 0, onstart: () => { lat = (performance.now() - t0) / 1000; } }), new Promise(r => setTimeout(() => r(0), 40000))]);
  return { dur: Math.max(0.5, s), lat: Math.min(3, lat) };
}
