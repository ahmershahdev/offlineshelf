attribute vec3 aScatter;
attribute vec3 aShelf;
attribute vec4 aRand;
attribute float aHeight;

uniform float uProgress;
uniform float uTime;
uniform vec2 uMouse;

varying vec3 vNormal;
varying float vTone;
varying float vAccent;
varying float vDepth;

mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0., -s, c, 0., 0., 0., 1.); }

float easeInOutCubic(float t) {
  return t < .5 ? 4. * t * t * t : 1. - pow(-2. * t + 2., 3.) / 2.;
}

void main() {
  // Each spine starts its flight at a different moment, so the shelf fills in waves.
  float delay = aRand.x * .45;
  float t = clamp((uProgress - delay) / .55, 0., 1.);
  float e = easeInOutCubic(t);
  float loose = 1. - e;

  vec3 p = position;
  p.y *= aHeight;

  float a = aRand.y * 6.2831 + uTime * .18 * (aRand.z - .5);
  float b = aRand.z * 6.2831 + uTime * .12 * (aRand.w - .5);
  mat3 r = rotX(a * loose) * rotY(b * loose) * rotZ(aRand.w * 6.2831 * loose);

  vec3 drift = vec3(
    sin(uTime * .31 + aRand.x * 23.),
    cos(uTime * .27 + aRand.y * 19.),
    sin(uTime * .22 + aRand.z * 17.)
  ) * .28 * loose;

  vec3 world = mix(aScatter + drift, aShelf, e) + r * p;

  // On the shelf, spines near the pointer lean out a little, like being browsed.
  vec2 m = uMouse * vec2(6., 3.2);
  float near = exp(-pow(distance(aShelf.xy, m), 2.) * .9) * e;
  world.z += near * .35;

  vNormal = normalize(normalMatrix * (r * normal));
  vTone = aRand.w;
  vAccent = step(.968, aRand.y);
  vec4 mv = modelViewMatrix * vec4(world, 1.);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
