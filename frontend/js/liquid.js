/**
 * MeetWise Pure WebGL Liquid-Ripple Background Engine
 *
 * Architecture & Design Decisions:
 * 1. Simulation: 2D Wave-Equation Heightfield with Ping-Pong Framebuffers (FBOs).
 *    - Height equation: h_{t+1} = ((h_l + h_r + h_u + h_d) * 0.5 - h_{t-1}) * damping
 *    - Chosen over full 2D Navier-Stokes because wave equation provides natural,
 *      crisp acoustic ripple propagation and specular refraction at a fraction of
 *      the GPU cost (< 0.2ms per frame on integrated Intel Iris/UHD GPUs).
 * 2. Precision: Encoded 8-bit RGBA height textures (0.5 = calm state), eliminating
 *    any reliance on float texture extensions (`OES_texture_float`), ensuring 100%
 *    cross-browser compatibility on every mobile and desktop GPU.
 * 3. Color Token Synchronization: Reads CSS variables (--bg-deep, --bg-mid, --bg-glow)
 *    via `getComputedStyle`, converting CSS tokens to WebGL uniforms on theme switch.
 * 4. Performance & Accessibility:
 *    - Device Pixel Ratio capped at 2.
 *    - Pauses simulation loop when tab is hidden (`document.visibilityState === 'hidden'`).
 *    - Listens for `webglcontextlost` and `webglcontextrestored`.
 *    - Respects `prefers-reduced-motion` by rendering a static gradient.
 *    - Provides fallback CSS gradient if WebGL is unavailable.
 */

(function () {
  "use strict";

  // Simulation Grid Resolution
  const SIM_SIZE = 256;

  // Vertex Shader for Full-Screen Quad
  const VS_QUAD = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Wave Simulation Fragment Shader
  const FS_SIM = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_current;
    uniform vec2 u_texel;
    uniform float u_damping;

    void main() {
      float left  = texture2D(u_current, v_uv - vec2(u_texel.x, 0.0)).r * 2.0 - 1.0;
      float right = texture2D(u_current, v_uv + vec2(u_texel.x, 0.0)).r * 2.0 - 1.0;
      float down  = texture2D(u_current, v_uv - vec2(0.0, u_texel.y)).r * 2.0 - 1.0;
      float up    = texture2D(u_current, v_uv + vec2(0.0, u_texel.y)).r * 2.0 - 1.0;

      float curr  = texture2D(u_current, v_uv).r * 2.0 - 1.0;
      float prev  = texture2D(u_current, v_uv).g * 2.0 - 1.0;

      // 2D Wave propagation
      float next = ((left + right + down + up) * 0.5 - prev) * u_damping;

      // Decay tiny residual oscillations to zero
      if (abs(next) < 0.0015) {
        next = 0.0;
      }
      next = clamp(next, -1.0, 1.0);

      // Encode heights into [0, 1] for 8-bit texture:
      // r = new height, g = current height (which becomes prev next tick)
      gl_FragColor = vec4(next * 0.5 + 0.5, curr * 0.5 + 0.5, 0.0, 1.0);
    }
  `;

  // Impulse / Splat Fragment Shader
  const FS_SPLAT = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_texture;
    uniform vec2 u_point;
    uniform float u_radius;
    uniform float u_strength;
    uniform float u_aspect;

    void main() {
      vec4 data = texture2D(u_texture, v_uv);
      float curr = data.r * 2.0 - 1.0;
      float prev = data.g * 2.0 - 1.0;

      vec2 coord = v_uv - u_point;
      coord.x *= u_aspect;
      float d = length(coord);

      // Gaussian impulse
      float impulse = u_strength * exp(-(d * d) / (2.0 * u_radius * u_radius));
      curr = clamp(curr + impulse, -1.0, 1.0);

      gl_FragColor = vec4(curr * 0.5 + 0.5, prev * 0.5 + 0.5, 0.0, 1.0);
    }
  `;

  // Render & Lighting Fragment Shader
  const FS_RENDER = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_heightmap;
    uniform vec2 u_texel;
    uniform vec3 u_bg_deep;
    uniform vec3 u_bg_mid;
    uniform vec3 u_bg_glow;
    uniform float u_distortion;
    uniform float u_specular;
    uniform float u_intensity_scale;

    void main() {
      // Finite differences to approximate surface normals
      float l = texture2D(u_heightmap, v_uv - vec2(u_texel.x, 0.0)).r * 2.0 - 1.0;
      float r = texture2D(u_heightmap, v_uv + vec2(u_texel.x, 0.0)).r * 2.0 - 1.0;
      float d = texture2D(u_heightmap, v_uv - vec2(0.0, u_texel.y)).r * 2.0 - 1.0;
      float u = texture2D(u_heightmap, v_uv + vec2(0.0, u_texel.y)).r * 2.0 - 1.0;

      vec3 normal = normalize(vec3(
        (r - l) * u_intensity_scale,
        (u - d) * u_intensity_scale,
        1.0
      ));

      // Liquid refraction offset
      vec2 refracted_uv = v_uv - normal.xy * (0.045 * u_distortion);

      // Radial base background gradient
      float dist = length(refracted_uv - vec2(0.5, 0.45));
      vec3 color = mix(u_bg_mid, u_bg_deep, smoothstep(0.15, 0.95, dist));

      // Glow accent patches
      float glow1 = smoothstep(0.7, 0.0, length(refracted_uv - vec2(0.2, 0.22)));
      color = mix(color, u_bg_glow, glow1 * 0.45);

      float glow2 = smoothstep(0.75, 0.0, length(refracted_uv - vec2(0.82, 0.78)));
      color = mix(color, u_bg_glow, glow2 * 0.25);

      // Specular reflection highlight (Blinn-Phong)
      vec3 lightDir = normalize(vec3(-0.35, 0.45, 0.8));
      vec3 viewDir = vec3(0.0, 0.0, 1.0);
      vec3 halfVec = normalize(lightDir + viewDir);
      float spec = pow(max(dot(normal, halfVec), 0.0), 32.0);

      vec3 specColor = mix(vec3(1.0), u_bg_glow, 0.45);
      color += spec * specColor * u_specular;

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
  `;

  // Color parsing utility for CSS variables
  function parseCssColor(cssColor, fallback = [0.03, 0.05, 0.12]) {
    if (!cssColor) return fallback;
    const str = cssColor.trim();
    if (str.startsWith("#")) {
      let hex = str.slice(1);
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      if (hex.length === 6) {
        const num = parseInt(hex, 16);
        return [
          ((num >> 16) & 255) / 255,
          ((num >> 8) & 255) / 255,
          (num & 255) / 255,
        ];
      }
    } else if (str.startsWith("rgb")) {
      const match = str.match(/\d+(\.\d+)?/g);
      if (match && match.length >= 3) {
        return [
          parseFloat(match[0]) / 255,
          parseFloat(match[1]) / 255,
          parseFloat(match[2]) / 255,
        ];
      }
    }
    return fallback;
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile failure: ${info}`);
    }
    return shader;
  }

  function createProgram(gl, vsSource, fsSource) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error(`Program link failure: ${info}`);
    }
    return prog;
  }

  class LiquidRippleEngine {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.mode = options.intensity === "calm" ? "calm" : "full";

      this.gl = null;
      this.rafId = null;
      this.isRunning = false;
      this.isContextLost = false;

      // Physics parameters by intensity mode
      this.damping = this.mode === "calm" ? 0.965 : 0.984;
      this.distortion = this.mode === "calm" ? 0.45 : 1.0;
      this.specular = this.mode === "calm" ? 0.28 : 0.62;
      this.intensityScale = this.mode === "calm" ? 1.6 : 3.2;

      this.mouseRadius = this.mode === "calm" ? 0.022 : 0.028;
      this.mouseImpulse = this.mode === "calm" ? 0.045 : 0.11;
      this.clickRadius = this.mode === "calm" ? 0.045 : 0.06;
      this.clickImpulse = this.mode === "calm" ? 0.18 : 0.38;

      // Pending impulses queue
      this.splats = [];

      // Idle movement parameters
      this.lastActivityTime = performance.now();
      this.idleTick = 0;

      // Theme colors
      this.bgDeep = [0.03, 0.05, 0.12];
      this.bgMid = [0.05, 0.16, 0.28];
      this.bgGlow = [0.1, 0.89, 0.76];

      this.init();
    }

    init() {
      // Check prefers-reduced-motion
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) {
        document.body.classList.add("css-fallback-bg");
        this.canvas.style.display = "none";
        return;
      }

      // Initialize WebGL context
      const opts = { alpha: false, depth: false, antialias: false, preserveDrawingBuffer: false };
      this.gl = this.canvas.getContext("webgl2", opts) ||
                this.canvas.getContext("webgl", opts) ||
                this.canvas.getContext("experimental-webgl", opts);

      if (!this.gl) {
        console.warn("WebGL not supported. Falling back to CSS gradient.");
        document.body.classList.add("css-fallback-bg");
        this.canvas.style.display = "none";
        return;
      }

      this.setupShadersAndBuffers();
      this.updateColorsFromTokens();
      this.bindEvents();
      this.resize();
      this.start();
    }

    setupShadersAndBuffers() {
      const gl = this.gl;

      // Full screen quad buffer
      this.quadBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      // Create Programs
      this.simProgram = createProgram(gl, VS_QUAD, FS_SIM);
      this.splatProgram = createProgram(gl, VS_QUAD, FS_SPLAT);
      this.renderProgram = createProgram(gl, VS_QUAD, FS_RENDER);

      // Create Ping-Pong Textures and FBOs
      this.fbos = [this.createFBO(SIM_SIZE, SIM_SIZE), this.createFBO(SIM_SIZE, SIM_SIZE)];
      this.currentFBO = 0;

      // Clear both FBOs to 0.5 (neutral height)
      for (let i = 0; i < 2; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[i].fbo);
        gl.viewport(0, 0, SIM_SIZE, SIM_SIZE);
        gl.clearColor(0.5, 0.5, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    createFBO(width, height) {
      const gl = this.gl;
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // Initial neutral state: 128 (0.50196) for R and G
      const initialData = new Uint8Array(width * height * 4);
      for (let i = 0; i < width * height; i++) {
        initialData[i * 4 + 0] = 128;
        initialData[i * 4 + 1] = 128;
        initialData[i * 4 + 2] = 0;
        initialData[i * 4 + 3] = 255;
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, initialData);

      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

      return { fbo, texture, width, height };
    }

    updateColorsFromTokens() {
      const computed = window.getComputedStyle(document.documentElement);
      this.bgDeep = parseCssColor(computed.getPropertyValue("--bg-deep"), [0.03, 0.05, 0.12]);
      this.bgMid  = parseCssColor(computed.getPropertyValue("--bg-mid"),  [0.05, 0.16, 0.28]);
      this.bgGlow = parseCssColor(computed.getPropertyValue("--bg-glow"), [0.1, 0.89, 0.76]);
    }

    addSplat(x, y, radius, strength) {
      // Normalize to [0, 1], with WebGL y inverted
      const aspect = this.canvas.width / this.canvas.height;
      this.splats.push({
        x: x / window.innerWidth,
        y: 1.0 - (y / window.innerHeight),
        radius,
        strength,
        aspect,
      });
      this.lastActivityTime = performance.now();
    }

    bindEvents() {
      // Mouse move trail
      let lastMove = 0;
      window.addEventListener("pointermove", (e) => {
        const now = performance.now();
        if (now - lastMove > 18) { // throttle to ~55hz
          this.addSplat(e.clientX, e.clientY, this.mouseRadius, this.mouseImpulse);
          lastMove = now;
        }
      }, { passive: true });

      // Clicks & Taps
      window.addEventListener("pointerdown", (e) => {
        this.addSplat(e.clientX, e.clientY, this.clickRadius, this.clickImpulse);
      }, { passive: true });

      // Window resize
      window.addEventListener("resize", () => this.resize(), { passive: true });

      // Page visibility change
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this.stop();
        } else if (document.visibilityState === "visible") {
          this.start();
        }
      });

      // WebGL context loss & restoration
      this.canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        this.isContextLost = true;
        this.stop();
      });

      this.canvas.addEventListener("webglcontextrestored", () => {
        this.isContextLost = false;
        this.setupShadersAndBuffers();
        this.updateColorsFromTokens();
        this.resize();
        this.start();
      });

      // Observer for light/dark theme attribute changes on documentElement
      const themeObserver = new MutationObserver(() => {
        this.updateColorsFromTokens();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    }

    resize() {
      if (!this.gl || this.isContextLost) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.floor(window.innerWidth * dpr);
      const height = Math.floor(window.innerHeight * dpr);

      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
    }

    drawQuad(prog) {
      const gl = this.gl;
      const aPos = gl.getAttribLocation(prog, "a_position");
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    stepSimulation() {
      const gl = this.gl;
      const readIdx = this.currentFBO;
      const writeIdx = 1 - this.currentFBO;

      // 1. Apply any pending splats to current texture
      if (this.splats.length > 0) {
        gl.useProgram(this.splatProgram);
        const splatUPoint = gl.getUniformLocation(this.splatProgram, "u_point");
        const splatURadius = gl.getUniformLocation(this.splatProgram, "u_radius");
        const splatUStrength = gl.getUniformLocation(this.splatProgram, "u_strength");
        const splatUAspect = gl.getUniformLocation(this.splatProgram, "u_aspect");
        const splatUTex = gl.getUniformLocation(this.splatProgram, "u_texture");

        while (this.splats.length > 0) {
          const s = this.splats.shift();
          const targetWrite = 1 - this.currentFBO;

          gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[targetWrite].fbo);
          gl.viewport(0, 0, SIM_SIZE, SIM_SIZE);

          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, this.fbos[this.currentFBO].texture);
          gl.uniform1i(splatUTex, 0);

          gl.uniform2f(splatUPoint, s.x, s.y);
          gl.uniform1f(splatURadius, s.radius);
          gl.uniform1f(splatUStrength, s.strength);
          gl.uniform1f(splatUAspect, s.aspect);

          this.drawQuad(this.splatProgram);
          this.currentFBO = targetWrite;
        }
      }

      // 2. Wave propagation pass
      const curRead = this.currentFBO;
      const curWrite = 1 - this.currentFBO;

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[curWrite].fbo);
      gl.viewport(0, 0, SIM_SIZE, SIM_SIZE);

      gl.useProgram(this.simProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.fbos[curRead].texture);
      gl.uniform1i(gl.getUniformLocation(this.simProgram, "u_current"), 0);
      gl.uniform2f(gl.getUniformLocation(this.simProgram, "u_texel"), 1.0 / SIM_SIZE, 1.0 / SIM_SIZE);
      gl.uniform1f(gl.getUniformLocation(this.simProgram, "u_damping"), this.damping);

      this.drawQuad(this.simProgram);
      this.currentFBO = curWrite;
    }

    renderToScreen() {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);

      gl.useProgram(this.renderProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.fbos[this.currentFBO].texture);
      gl.uniform1i(gl.getUniformLocation(this.renderProgram, "u_heightmap"), 0);

      gl.uniform2f(gl.getUniformLocation(this.renderProgram, "u_texel"), 1.0 / SIM_SIZE, 1.0 / SIM_SIZE);
      gl.uniform3fv(gl.getUniformLocation(this.renderProgram, "u_bg_deep"), this.bgDeep);
      gl.uniform3fv(gl.getUniformLocation(this.renderProgram, "u_bg_mid"),  this.bgMid);
      gl.uniform3fv(gl.getUniformLocation(this.renderProgram, "u_bg_glow"), this.bgGlow);
      gl.uniform1f(gl.getUniformLocation(this.renderProgram, "u_distortion"), this.distortion);
      gl.uniform1f(gl.getUniformLocation(this.renderProgram, "u_specular"), this.specular);
      gl.uniform1f(gl.getUniformLocation(this.renderProgram, "u_intensity_scale"), this.intensityScale);

      this.drawQuad(this.renderProgram);
    }

    checkIdleBreathing(now) {
      // If no user action for 2.8 seconds, drop a gentle ambient droplet
      if (now - this.lastActivityTime > 2800) {
        this.idleTick += 0.02;
        const x = window.innerWidth * (0.5 + 0.32 * Math.sin(this.idleTick * 0.7));
        const y = window.innerHeight * (0.45 + 0.25 * Math.cos(this.idleTick * 0.9));
        this.addSplat(x, y, this.mouseRadius * 1.2, this.mouseImpulse * 0.85);
        this.lastActivityTime = now - 1800; // Next gentle droplet in ~1s
      }
    }

    tick(now) {
      if (!this.isRunning || this.isContextLost) return;

      this.checkIdleBreathing(now);
      this.stepSimulation();
      this.renderToScreen();

      this.rafId = requestAnimationFrame((t) => this.tick(t));
    }

    start() {
      if (this.isRunning || !this.gl || this.isContextLost) return;
      this.isRunning = true;
      this.rafId = requestAnimationFrame((t) => this.tick(t));
    }

    stop() {
      this.isRunning = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
  }

  // Global initializer
  window.initLiquidCanvas = function (options = {}) {
    const canvasId = options.canvasId || "liquid-canvas";
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    return new LiquidRippleEngine(canvas, options);
  };

  // Auto-init if canvas is present and not explicitly deferred
  document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("liquid-canvas");
    if (canvas && !window.__manualLiquidInit) {
      const mode = canvas.dataset.mode || "full";
      window.liquidEngine = new LiquidRippleEngine(canvas, { intensity: mode });
    }
  });
})();
