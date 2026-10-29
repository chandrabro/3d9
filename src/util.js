import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export function lerpAngle(a, b, t) { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * t; }

function shadowed(m, cast = true, recv = true) { m.castShadow = cast; m.receiveShadow = recv; return m; }
export function box(w, h, d, material, x = 0, y = 0, z = 0) { return shadowed(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material), {}), true, true).translateX(x).translateY(y).translateZ(z); }
export function cyl(rt, rb, h, material, x = 0, y = 0, z = 0, seg = 16, open = false) { return shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), material)).translateX(x).translateY(y).translateZ(z); }
export function sph(r, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 16) { const m = shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg >> 1)), material)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m; }
export function cap(r, len, material, x = 0, y = 0, z = 0, seg = 8) { return shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, seg), material)).translateX(x).translateY(y).translateZ(z); }
export function cone(r, h, material, x = 0, y = 0, z = 0, seg = 12) { return shadowed(new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), material)).translateX(x).translateY(y).translateZ(z); }
export function torus(r, tube, material, x = 0, y = 0, z = 0, rx = Math.PI / 2) { const m = shadowed(new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 24), material)); m.position.set(x, y, z); m.rotation.x = rx; return m; }
export function lathe(points, material, seg = 24) { return shadowed(new THREE.Mesh(new THREE.LatheGeometry(points.map(p => new THREE.Vector2(p[0], p[1])), seg), material)); }
export function plane(w, d, material, y = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; return m; }
export function grp(...kids) { const g = new THREE.Group(); kids.forEach(k => k && g.add(k)); return g; }
export function at(o, x = 0, y = 0, z = 0, ry = 0) { o.position.set(x, y, z); o.rotation.y = ry; return o; }

// Dispose helper for removed groups (geometries only; materials are shared/cached)
export function disposeGroup(g) { g.traverse(o => { if (o.geometry && !o.userData.keepGeo) o.geometry.dispose(); }); }

export function polyline(points) {
  // returns {len, at(d) -> {x,z,heading}}
  const segs = []; let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1][0] - points[i][0], dz = points[i + 1][1] - points[i][1]; const l = Math.hypot(dx, dz);
    if (l > 1e-4) { segs.push({ a: points[i], b: points[i + 1], l, d0: len, h: Math.atan2(dx, dz) }); len += l; }
  }
  return {
    len, segs,
    at(d) {
      if (!segs.length) return { x: points[0][0], z: points[0][1], h: null, i: -1, rem: 0 };
      d = clamp(d, 0, len);
      let i = segs.findIndex(s => d <= s.d0 + s.l); if (i < 0) i = segs.length - 1;
      const s = segs[i]; const u = (d - s.d0) / s.l;
      const x = s.a[0] + (s.b[0] - s.a[0]) * u;
      const z = s.a[1] + (s.b[1] - s.a[1]) * u;
      let h = s.h; const rem = s.d0 + s.l - d;
      if (rem < 0.7 && segs[i + 1]) h = lerpAngle(s.h, segs[i + 1].h, smooth(1 - rem / 0.7) * 0.5 + (rem < 0.01 ? 0.5 : 0));
      return { x, z, h, i, rem };
    },
  };
}
