// Version history: automatic snapshots of the project (last 10), stored in this browser.
const KEY = 'nss-history-v1', MAX = 10;
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const write = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; } };
let lastSig = '';
export function snapshot(project, reason = 'auto') {
  const json = JSON.stringify(project); const sig = json.length + ':' + json.slice(0, 200) + json.slice(-200); if (sig === lastSig && reason === 'auto') return false; lastSig = sig;
  let list = read(); list.unshift({ id: Date.now(), time: new Date().toISOString(), reason, name: project.name || 'Story', scenes: project.scenes.length, json });
  list = list.slice(0, MAX); while (list.length > 1 && !write(list)) list.pop(); return true;
}
export const listSnapshots = () => read().map(({ id, time, reason, name, scenes, json }) => ({ id, time, reason, name, scenes, size: json.length }));
export const loadSnapshot = (id) => { const s = read().find(x => x.id === id); return s ? JSON.parse(s.json) : null; };
export const clearSnapshots = () => { try { localStorage.removeItem(KEY); } catch { } };
