import * as THREE from 'three';
import { buildBackdropEnv } from './backdrop.js';
import { ENVS } from './data.js';
import * as N from './nature.js';
import * as B from './buildings.js';
import { buildInterior } from './interiors.js';

const PRIORITY = { house: 0, hut: 0, pen: 1, shed: 1, henhouse: 1, path: 2, terraces: -1 };

export function buildEnvironment(envId, q = 'medium') {
  const def = ENVS[envId]; if (def.backdrop) return buildBackdropEnv(envId, def);
  const group = new THREE.Group(); group.name = 'env-' + envId;
  const f = q === 'low' ? 0.5 : q === 'medium' ? 0.8 : 1;
  const terrF = def.features.find(x => x[0] === 'terraces');
  const terr = terrF ? { z: terrF[1].z, tiers: terrF[1].tiers } : null;
  const height = N.makeHeightFn(terr);
  const ctx = { seed: 100, q, f, paths: [], houses: [], exclude: [], height, ground: def.ground, radius: def.radius || 30, camZ: 20 };
  const interior = !!def.interior;

  group.add(N.buildTerrain({ heightFn: height, terr, ground: interior ? 'grass' : def.ground, radius: ctx.radius, q }));
  group.add(N.buildMountains(q));
  const clouds = N.buildClouds(); group.add(clouds);

  const feats = [...def.features].sort((a, b) => (PRIORITY[a[0]] ?? 5) - (PRIORITY[b[0]] ?? 5));
  const place = (obj, x, z, ry = 0, s = 1) => { obj.position.set(x, height(x, z), z); obj.rotation.y = ry; obj.scale.setScalar(s); group.add(obj); return obj; };
  for (const [kind, p] of feats) {
    switch (kind) {
      case 'house': { const h = B.buildHouse(p); place(h, p.x, p.z, p.ry, p.s); ctx.houses.push({ x: p.x, z: p.z, s: p.s }); ctx.exclude.push([p.x - 5 * p.s, p.z - 4 * p.s, p.x + 5 * p.s, p.z + 5 * p.s]); break; }
      case 'hut': place(B.buildHut(), p.x, p.z); ctx.exclude.push([p.x - 3, p.z - 3, p.x + 3, p.z + 3]); break;
      case 'pen': place(B.buildPen(p), p.x, p.z); ctx.exclude.push([p.x - p.w / 2, p.z - p.d / 2, p.x + p.w / 2, p.z + p.d / 2]); break;
      case 'shed': place(B.buildShed(p.w), p.x, p.z); break;
      case 'henhouse': place(B.buildHenhouse(), p.x, p.z); break;
      case 'trough': place(B.buildTrough(), p.x, p.z); break;
      case 'tulsi': place(B.buildTulsi(), p.x, p.z); break;
      case 'path': N.addPath(group, p, ctx); break;
      case 'trees': N.addTrees(group, p, ctx); break;
      case 'bamboo': N.addBamboo(group, p, ctx); break;
      case 'paddy': N.addPaddy(group, p, ctx); ctx.exclude.push([p.x - p.w / 2, p.z - p.d / 2, p.x + p.w / 2, p.z + p.d / 2]); break;
      case 'haystack': N.addHaystack(group, p); break;
      case 'fence': N.addFence(group, p); break;
      case 'grass': N.addGrass(group, ctx); break;
      default: break; // 'terraces' is handled by the terrain height function
    }
  }

  const lights = new THREE.Group(); group.add(lights);
  if (interior) {
    ctx.ground = 'grass'; ctx.exclude.push([-def.room.w / 2 - 1, -def.room.d / 2 - 1, def.room.w / 2 + 1, def.room.d / 2 + 1]);
    const built = buildInterior(def.interior, def.room); group.add(built.group);
    built.lights.forEach(l => { const pl = new THREE.PointLight(l.color, l.intensity * 1.1, l.dist, 2); pl.position.set(...l.pos); lights.add(pl); });
    N.addTrees(group, { n: 22, area: [-45, -45, 45, -10], avoid: '' }, ctx);
    N.addTrees(group, { n: 10, area: [8, -12, 40, 14], avoid: '' }, ctx);
    N.addGrass(group, ctx);
  }
  N.addForestHills(group, ctx);

  const grounds = []; group.traverse(o => { if (o.userData.ground) grounds.push(o); });
  return {
    id: envId, def, group, interior, grounds,
    heightAt: (x, z) => interior ? 0.02 : height(x, z),
    update(t) { N.wind.value = t; clouds.userData.update(t); },
  };
}
