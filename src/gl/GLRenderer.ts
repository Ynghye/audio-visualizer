import { VERTEX_SRC, FRAGMENT_SRC } from "./shaders";

export interface TerrainParams {
  rotationX: number;
  rotationY: number;
  lightPower: number;
  lightPosition: number;
  threshold: number;
  sharpness: number;
  dotSize: number;
  invert: boolean;
  color: string;
  bgColor: string;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${log}`);
  }
  return shader;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export class GLRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  readonly canvasEl: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvasEl = canvas;
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: false, alpha: true });
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // Canvas/image/video sources are top-row-first; WebGL texture V=0 is the bottom.
    // Flip on upload so sampled orientation matches the source instead of appearing upside down.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

    const names = [
      "uHeight",
      "uResolution",
      "uTexAspect",
      "uFitContain",
      "uZoom",
      "uRotX",
      "uRotY",
      "uLightPower",
      "uLightAngle",
      "uThreshold",
      "uSharpness",
      "uInvert",
      "uShowBg",
      "uFgColor",
      "uBgColor",
      "uCell",
    ];
    gl.useProgram(program);
    for (const n of names) this.uniforms[n] = gl.getUniformLocation(program, n);
  }

  resize(w: number, h: number) {
    if (this.canvasEl.width !== w || this.canvasEl.height !== h) {
      this.canvasEl.width = w;
      this.canvasEl.height = h;
    }
    this.gl.viewport(0, 0, w, h);
  }

  updateHeightmap(source: TexImageSource) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  /**
   * Renders the terrain effect from the current heightmap into a w×h canvas. Used as one
   * chain stage: source and target are always the same size, so no crop/letterbox is needed
   * (texAspect == screenAspect exactly) and the output is always fully opaque for compositing.
   */
  render(params: TerrainParams, w: number, h: number) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uniforms.uHeight, 0);
    gl.uniform2f(this.uniforms.uResolution, w, h);
    gl.uniform1f(this.uniforms.uTexAspect, w / h);
    gl.uniform1f(this.uniforms.uFitContain, 0);
    gl.uniform1f(this.uniforms.uZoom, 1);
    gl.uniform1f(this.uniforms.uRotX, params.rotationX / 100);
    gl.uniform1f(this.uniforms.uRotY, params.rotationY / 100);
    gl.uniform1f(this.uniforms.uLightPower, params.lightPower / 90);
    gl.uniform1f(this.uniforms.uLightAngle, params.lightPosition / 100);
    gl.uniform1f(this.uniforms.uThreshold, params.threshold / 100);
    gl.uniform1f(this.uniforms.uSharpness, params.sharpness / 100);
    gl.uniform1f(this.uniforms.uInvert, params.invert ? 1 : 0);
    gl.uniform1f(this.uniforms.uShowBg, 1);
    gl.uniform3fv(this.uniforms.uFgColor, hexToRgb(params.color));
    gl.uniform3fv(this.uniforms.uBgColor, hexToRgb(params.bgColor));
    gl.uniform1f(this.uniforms.uCell, params.dotSize);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
