// Studio backdrops for chroma-keying (green screen / blue screen).
// A flat, evenly lit key colour with no ground, shadows, grading or vignette, so it can be keyed out
// cleanly in any video editor (CapCut, DaVinci Resolve, Premiere, OBS …).

export const DEFAULT_CHROMA = '#00b140';
export const CHROMA_PRESETS = [['#00b140', 'Chroma green (recommended)'], ['#00ff00', 'Pure green'], ['#0047bb', 'Chroma blue']];

export default [
  {
    id: 'green_screen', name: 'Green Screen (chroma key)', category: 'Studio',
    groundY: 0.9, horizonY: 0.66, indoor: true, chroma: true,
    paint(ctx, env) { ctx.fillStyle = env.chroma || DEFAULT_CHROMA; ctx.fillRect(0, 0, env.W, env.H); },
  },
];
