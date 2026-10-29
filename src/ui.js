// Tiny DOM helpers
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v; else if (k === 'checked') el.checked = !!v; else if (k === 'disabled') el.disabled = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}
export function drag(el, onMove, onStart, onEnd) {
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId); const x0 = e.clientX; onStart?.(e);
    const mv = ev => onMove(ev.clientX - x0, ev); const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); onEnd?.(); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
  });
}
export function download(blob, name) { const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
export function toast(msg, ms = 3500) { const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, ms); }
export const fmt = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`; };
export function pickFile(accept) { return new Promise(res => { const i = h('input', { type: 'file', accept }); i.onchange = () => res(i.files[0] || null); i.click(); }); }
