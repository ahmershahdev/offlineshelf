uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uSignal;

varying vec3 vNormal;
varying float vTone;
varying float vAccent;
varying float vDepth;

void main() {
  vec3 light = normalize(vec3(.35, .8, .55));
  float diffuse = max(dot(normalize(vNormal), light), 0.) * .72 + .28;

  vec3 base = mix(uPaper * .22, uPaper * .7, vTone);
  base = mix(base, uSignal, vAccent);
  vec3 color = base * diffuse;

  float fog = smoothstep(9., 20., vDepth);
  color = mix(color, uInk, fog);
  gl_FragColor = vec4(color, 1.);
}
