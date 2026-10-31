uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uSignal;
uniform vec3 uTorch;
uniform float uTorchPower;

varying vec3 vNormal;
varying float vTone;
varying float vAccent;
varying float vDepth;
varying vec3 vWorld;
varying vec3 vWorldNormal;

void main() {
  vec3 light = normalize(vec3(.35, .8, .55));
  float diffuse = max(dot(normalize(vNormal), light), 0.) * .72 + .28;

  vec3 base = mix(uPaper * .22, uPaper * .7, vTone);
  base = mix(base, uSignal, vAccent);
  vec3 color = base * diffuse * .8;

  // The cursor is a torch held in front of the shelf: a warm point light with soft falloff.
  vec3 toTorch = uTorch - vWorld;
  float dist = length(toTorch);
  float lambert = max(dot(normalize(vWorldNormal), toTorch / dist), 0.);
  float falloff = uTorchPower / (1. + dist * dist * .35);
  color += base * vec3(1., .62, .34) * lambert * falloff;

  float fog = smoothstep(9., 20., vDepth);
  color = mix(color, uInk, fog);
  gl_FragColor = vec4(color, 1.);
}
