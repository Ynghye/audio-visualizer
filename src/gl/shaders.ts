export const VERTEX_SRC = `#version 300 es
layout(location = 0) in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const FRAGMENT_SRC = `#version 300 es
precision highp float;

uniform sampler2D uHeight;
uniform vec2 uResolution;
uniform float uTexAspect;
uniform float uFitContain;
uniform float uZoom;
uniform float uRotX;
uniform float uRotY;
uniform float uLightPower;
uniform float uLightAngle;
uniform float uThreshold;
uniform float uSharpness;
uniform float uInvert;
uniform float uShowBg;
uniform vec3 uFgColor;
uniform vec3 uBgColor;
uniform float uCell;

out vec4 fragColor;

const int bayer8x8[64] = int[64](
  0,32,8,40,2,34,10,42,
  48,16,56,24,50,18,58,26,
  12,44,4,36,14,46,6,38,
  60,28,52,20,62,30,54,22,
  3,35,11,43,1,33,9,41,
  51,19,59,27,49,17,57,25,
  15,47,7,39,13,45,5,37,
  63,31,55,23,61,29,53,21
);

float bayerValue(vec2 cellCoord) {
  ivec2 p = ivec2(mod(cellCoord, 8.0));
  return float(bayer8x8[p.y * 8 + p.x]) / 64.0;
}

float sampleHeight(vec2 uv) {
  vec3 c = texture(uHeight, clamp(uv, 0.0, 1.0)).rgb;
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  float screenAspect = uResolution.x / uResolution.y;

  // Fit the (possibly non-square) heightmap texture into the screen without stretching.
  // Cover crops the overflow axis to fill the screen; contain shows the whole texture
  // and lets the background show through the letterboxed margin instead of cropping it.
  vec2 uv = screenUv;
  if (uFitContain > 0.5) {
    if (screenAspect >= uTexAspect) {
      uv.x = (screenUv.x - 0.5) * (screenAspect / uTexAspect) + 0.5;
    } else {
      uv.y = (screenUv.y - 0.5) * (uTexAspect / screenAspect) + 0.5;
    }
  } else {
    if (screenAspect / uTexAspect >= 1.0) {
      uv.y = (screenUv.y - 0.5) * (uTexAspect / screenAspect) + 0.5;
    } else {
      uv.x = (screenUv.x - 0.5) * (screenAspect / uTexAspect) + 0.5;
    }
  }

  // Zoom around center. Sampling outside [0,1] (from zooming out, or contain's
  // letterbox) reveals background instead of a stretched/clamped texture edge.
  vec2 zUv = (uv - 0.5) / uZoom + 0.5;
  if (zUv.x < 0.0 || zUv.x > 1.0 || zUv.y < 0.0 || zUv.y > 1.0) {
    fragColor = uShowBg > 0.5 ? vec4(uBgColor, 1.0) : vec4(uFgColor, 0.0);
    return;
  }

  vec2 tiltUv = zUv + vec2(uRotY, -uRotX) * 0.09 * (zUv - 0.5);

  float eps = 0.0045;
  float hL = sampleHeight(tiltUv - vec2(eps, 0.0));
  float hR = sampleHeight(tiltUv + vec2(eps, 0.0));
  float hD = sampleHeight(tiltUv - vec2(0.0, eps));
  float hU = sampleHeight(tiltUv + vec2(0.0, eps));
  float hC = sampleHeight(tiltUv);

  vec3 normal = normalize(vec3((hL - hR) * 18.0, (hD - hU) * 18.0, 1.0));

  float lightAngle = uLightAngle * 6.28318;
  vec3 lightDir = normalize(vec3(cos(lightAngle), sin(lightAngle), 0.65));

  float diffuse = max(dot(normal, lightDir), 0.0) * uLightPower;
  float shade = clamp(diffuse + hC * 0.1, 0.0, 1.0);

  if (uInvert > 0.5) shade = 1.0 - shade;

  float edge = mix(0.5, 0.015, uSharpness);
  shade = smoothstep(uThreshold - edge, uThreshold + edge, shade);

  if (hC < 0.02) shade = 0.0;

  vec2 cellCoord = floor(gl_FragCoord.xy / uCell);
  float bayerV = bayerValue(cellCoord);
  float dith = step(bayerV, shade);

  if (uShowBg > 0.5) {
    fragColor = vec4(mix(uBgColor, uFgColor, dith), 1.0);
  } else {
    fragColor = vec4(uFgColor, dith);
  }
}
`;
