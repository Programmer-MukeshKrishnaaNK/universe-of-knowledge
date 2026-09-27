/**
 * All GLSL lives here. Shaders output *linear* colour; the effect composer
 * handles tone mapping and sRGB output.
 */

// ─── Knowledge nodes ────────────────────────────────────────────────────
// Instanced camera-facing quads. Each node reads as a small lit sphere with
// an atmospheric halo; fields and domains carry a slow orbital ring.

export const nodeVertex = /* glsl */ `
attribute vec3 iPos;
attribute vec3 iColor;
attribute float iSize;
attribute float iEmph;
attribute float iHover;
attribute float iFocus;
attribute float iLevel;
attribute float iKnown;
attribute float iDelay;

uniform float uReveal;
uniform float uViewH;
uniform float uMap;

varying vec2 vUv;
varying vec3 vColor;
varying float vEmph;
varying float vHover;
varying float vFocus;
varying float vLevel;
varying float vKnown;
varying float vAlpha;
varying float vSeed;

void main() {
  float rev = smoothstep(iDelay, iDelay + 0.16, uReveal);
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  float depth = max(-mv.z, 0.001);
  float s = iSize * (0.8 + 0.2 * iEmph) * (1.0 + 0.16 * iHover + 0.1 * iFocus) * (0.35 + 0.65 * rev) * 4.2;

  // Keep far nodes as crisp points instead of sub-pixel shimmer.
  float px = s * projectionMatrix[1][1] * uViewH * 0.5 / depth;
  float minPx = 9.0 + iLevel * -1.5;
  float fade = 1.0;
  if (px < minPx) { fade = px / minPx; s *= minPx / max(px, 1e-4); }

  mv.xy += position.xy * s;
  gl_Position = projectionMatrix * mv;

  float fog = smoothstep(380.0, 1100.0, depth);
  vAlpha = rev * mix(1.0, 0.3, fog) * mix(0.45, 1.0, fade);
  vUv = uv;
  vColor = iColor;
  float known = step(0.5, iKnown);
  vEmph = iEmph * mix(1.0, mix(0.5, 1.15, known), uMap);
  vHover = iHover;
  vFocus = iFocus;
  vLevel = iLevel;
  vKnown = iKnown;
  vSeed = fract(sin(dot(iPos.xy, vec2(12.9898, 78.233))) * 43758.5453);
}
`

export const nodeFragment = /* glsl */ `
uniform float uTime;
uniform float uMap;

varying vec2 vUv;
varying vec3 vColor;
varying float vEmph;
varying float vHover;
varying float vFocus;
varying float vLevel;
varying float vKnown;
varying float vAlpha;
varying float vSeed;

float ringAt(float r, float radius, float w) {
  return smoothstep(w, 0.0, abs(r - radius));
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float aa = fwidth(r);
  float e = vEmph;

  // Core: a small lit sphere with a cool rim — an object, not a dot.
  float cr = 0.2;
  float core = smoothstep(cr + aa, cr - aa, r);
  vec2 q = p / cr;
  float z = sqrt(max(0.0, 1.0 - dot(q, q)));
  vec3 n = normalize(vec3(q, z));
  float lit = 0.5 + 0.5 * max(0.0, dot(n, normalize(vec3(-0.45, 0.55, 0.7))));
  float rim = pow(1.0 - z, 3.0);
  vec3 coreCol = mix(vColor, vec3(1.0), 0.42 + 0.35 * vHover + 0.25 * vFocus) * lit + vColor * rim * 0.9;

  // Atmosphere.
  float glow = exp(-pow(r / (cr * 1.55), 2.0)) * 0.5 + exp(-r * 5.0) * 0.14;

  // Orbital ring for domains (3 arcs) and fields (2 arcs).
  float ang = atan(p.y, p.x) / 6.28318 + 0.5;
  float w = aa * 1.1 + 0.003;
  float isDomain = 1.0 - step(0.5, vLevel);
  float isField = step(0.5, vLevel) * (1.0 - step(1.5, vLevel));
  float arcs = mix(2.0, 3.0, isDomain);
  float gap = smoothstep(0.1, 0.16, fract(ang * arcs + uTime * (0.012 + vSeed * 0.01) * (isDomain > 0.5 ? -1.0 : 1.0)));
  float orbit = ringAt(r, cr * mix(1.75, 2.05, isDomain), w) * gap * (isDomain * 0.7 + isField * 0.5);
  float outer = ringAt(r, cr * 3.3, w) * isDomain * 0.16 * smoothstep(0.2, 0.5, fract(ang * 24.0));

  // Focus: a calm breathing ring. Hover: a close, thin halo.
  float breathe = 0.5 + 0.5 * sin(uTime * 1.4);
  float focusRing = ringAt(r, cr * (2.45 + 0.1 * breathe), w * 1.4) * vFocus * (0.55 + 0.25 * breathe);
  float hoverRing = ringAt(r, cr * 1.42, w) * vHover * (1.0 - vFocus);

  // Personal knowledge layer.
  float k = vKnown;
  float understood = step(2.5, k) * (1.0 - step(3.5, k));
  float learning = step(1.5, k) * (1.0 - step(2.5, k));
  float review = step(3.5, k) * (1.0 - step(4.5, k));
  float want = step(4.5, k);
  float kr = ringAt(r, cr * 1.28, w * 1.3);
  float knowRing = kr * (understood + learning * step(ang, 0.5) + review * step(0.5, fract(ang * 8.0)) + want * step(0.6, fract(ang * 16.0)));
  vec3 knowCol = mix(vec3(1.0, 0.82, 0.55), vec3(0.75, 0.9, 1.0), want);

  vec3 col = vec3(0.0);
  col += coreCol * core * (0.3 + 1.0 * e);
  col += vColor * glow * (0.12 + 0.85 * e);
  col += vColor * (orbit + outer) * (0.25 + 0.9 * e);
  col += vec3(1.0) * focusRing * 0.7;
  col += mix(vColor, vec3(1.0), 0.6) * hoverRing * 0.75;
  col += knowCol * knowRing * uMap * 0.9;

  float a = core * (0.55 + 0.45 * e);
  // Premultiplied "over": the core occludes lines behind it, the halo adds light.
  gl_FragColor = vec4(col * vAlpha, a * vAlpha);
}
`

// ─── Relationships ──────────────────────────────────────────────────────

export const edgeVertex = /* glsl */ `
attribute float aT;
attribute float aEmph;
attribute float aFlow;
attribute float aKind;
attribute float aLen;
attribute vec3 aColor;

varying float vT;
varying float vEmph;
varying float vFlow;
varying float vKind;
varying float vLen;
varying float vFog;
varying vec3 vColor;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vT = aT;
  vEmph = aEmph;
  vFlow = aFlow;
  vKind = aKind;
  vLen = aLen;
  vColor = aColor;
  vFog = smoothstep(420.0, 1200.0, -mv.z);
}
`

export const edgeFragment = /* glsl */ `
uniform float uTime;
uniform float uReveal;
uniform float uMotion;

varying float vT;
varying float vEmph;
varying float vFlow;
varying float vKind;
varying float vLen;
varying float vFog;
varying vec3 vColor;

void main() {
  float ends = smoothstep(0.0, 0.09, vT) * smoothstep(1.0, 0.91, vT);
  // Sideways relationships are drawn as a quiet dotted line.
  float dotted = vKind > 1.5 ? 0.35 + 0.65 * step(0.45, fract(vT * vLen / 1.1)) : 1.0;
  float kindGain = vKind < 0.5 ? 1.0 : (vKind < 1.5 ? 0.9 : 0.75);

  // Signals flow from prerequisite to what it enables, parent to child.
  float spacing = max(1.0, vLen / 8.0);
  float ph = fract(vT * spacing - uTime * 0.32 * uMotion);
  float pulse = exp(-pow((ph - 0.5) * 11.0, 2.0));

  float a = vEmph * ends * dotted * kindGain;
  vec3 col = vColor * (0.62 * a + pulse * vFlow * ends * 1.35);
  col *= uReveal * mix(1.0, 0.3, vFog);
  gl_FragColor = vec4(col, 1.0);
}
`

// ─── Dust & stars ───────────────────────────────────────────────────────

export const dustVertex = /* glsl */ `
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;

uniform float uTime;
uniform float uPixelRatio;
uniform float uReveal;
uniform float uAttenuate;
uniform float uMotion;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 p = position;
  // Barely-there drift so the space feels alive, never busy.
  p += vec3(sin(uTime * 0.05 + aSeed * 40.0), cos(uTime * 0.04 + aSeed * 23.0), sin(uTime * 0.045 + aSeed * 17.0)) * 0.6 * uAttenuate * uMotion;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = max(-mv.z, 0.001);
  float att = mix(1.0, clamp(220.0 / depth, 0.35, 2.6), uAttenuate);
  gl_PointSize = aSize * att * uPixelRatio;
  float tw = 0.72 + 0.28 * sin(uTime * (0.4 + aSeed * 0.9) * uMotion + aSeed * 60.0);
  float reveal = smoothstep(aSeed * 0.7, aSeed * 0.7 + 0.3, uReveal);
  vAlpha = tw * reveal * mix(1.0, smoothstep(1400.0, 500.0, depth), uAttenuate);
  vColor = aColor;
}
`

export const dustFragment = /* glsl */ `
uniform float uGain;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = pow(max(0.0, 1.0 - d), 2.2);
  gl_FragColor = vec4(vColor * a * vAlpha * uGain, 1.0);
}
`

// ─── Sky ────────────────────────────────────────────────────────────────

export const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`

export const skyFragment = /* glsl */ `
varying vec3 vDir;
uniform float uReveal;

float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }

void main() {
  vec3 d = normalize(vDir);
  // A faint galactic band and a cold, deep gradient.
  float band = exp(-pow(d.y * 3.2 + 0.25 * sin(d.x * 2.0), 2.0));
  float n = fbm(d * 2.4 + vec3(0.0, 0.0, 3.0));
  float neb = smoothstep(0.45, 0.85, n) * band;
  vec3 base = mix(vec3(0.0035, 0.004, 0.009), vec3(0.008, 0.009, 0.02), band);
  vec3 col = base + vec3(0.018, 0.016, 0.034) * neb + vec3(0.02, 0.012, 0.02) * smoothstep(0.6, 0.95, fbm(d * 5.0)) * band;
  gl_FragColor = vec4(col * uReveal, 1.0);
}
`

// ─── Ripples ────────────────────────────────────────────────────────────

export const rippleVertex = /* glsl */ `
uniform vec3 uPos;
uniform float uScale;
varying vec2 vUv;
void main() {
  vec4 mv = modelViewMatrix * vec4(uPos, 1.0);
  mv.xy += position.xy * uScale;
  gl_Position = projectionMatrix * mv;
  vUv = uv;
}
`

export const rippleFragment = /* glsl */ `
uniform float uProgress;
uniform float uKind;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float aa = fwidth(r);
  float fade = pow(1.0 - uProgress, 2.0);
  float ring = smoothstep(aa * 2.0 + 0.01, 0.0, abs(r - 0.92));
  float wake = smoothstep(0.92, 0.3, r) * smoothstep(0.0, 0.92, r) * 0.08;
  float a = (ring * mix(0.9, 0.45, uKind) + wake) * fade;
  gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a, 1.0);
}
`
