import {
  scene3DMath as m,
  type Scene3D,
  type Geometry3D,
  type Node3D,
} from "./scene3d.js";

/** Browser-only GPU renderer. Consumes a 3D scene directly. */
export function createWebGLRenderer(container: HTMLElement) {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
  });
  if (!gl) throw new Error("WebGL is unavailable");
  function shader(type: number, source: string) {
    const value = gl!.createShader(type)!;
    gl!.shaderSource(value, source);
    gl!.compileShader(value);
    if (!gl!.getShaderParameter(value, gl!.COMPILE_STATUS)) {
      const error = gl!.getShaderInfoLog(value);
      gl!.deleteShader(value);
      throw new Error(error ?? "Shader compilation failed");
    }
    return value;
  }
  const vertex = shader(
    gl.VERTEX_SHADER,
    `
    attribute vec3 position; attribute vec3 normal;
    uniform mat4 modelView; uniform mat4 modelMatrix; uniform mat4 projection; uniform mat3 normalMatrix;
    varying vec3 vNormal; varying vec3 vPosition; varying vec2 vLocal;
    void main(){vLocal=position.xy;vPosition=(modelMatrix*vec4(position,1.0)).xyz;vNormal=normalMatrix*normal;gl_Position=projection*modelView*vec4(position,1.0);}`,
  );
  const fragment = shader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    uniform vec3 color; uniform vec3 light; uniform vec3 cameraPosition; uniform float ambient; uniform float unlit; uniform float gloss;
    uniform sampler2D sceneColor; uniform sampler2D opaqueDepth; uniform float useOpaqueDepth; uniform vec2 viewport; uniform vec3 backdrop; uniform float transmission; uniform float transmissionRoughness; uniform float radialOpacity;
    varying vec3 vNormal; varying vec3 vPosition; varying vec2 vLocal;
    vec4 transmittedSample(vec2 uv){
      uv=clamp(uv,vec2(.001),vec2(.999));
      if(useOpaqueDepth>.5 && texture2D(opaqueDepth,uv).r<gl_FragCoord.z-.00002)return vec4(0.0);
      return texture2D(sceneColor,uv);
    }
    void main(){vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
      float diffuse=gloss>0.0?max(0.0,(dot(n,light)+0.4)/1.4):max(0.0,dot(n,light));
      float intensity=mix(ambient+(1.0-ambient)*diffuse,1.0,unlit);
      vec3 view=normalize(cameraPosition-vPosition);
      float shine=pow(max(0.0,dot(n,normalize(light+view))),80.0)*gloss*(1.0-unlit);
      vec3 shaded=color*intensity;
      if(transmission>0.0){
        float facing=max(0.0,dot(n,view));
        vec2 uv=gl_FragCoord.xy/viewport;
        vec2 offset=n.xy*(1.0-facing)*0.024;
        vec4 behind=vec4(0.0);
        vec2 center=clamp(uv+offset,vec2(0.001),vec2(0.999));
        if(transmissionRoughness>0.0){
          vec2 stepSize=vec2(viewport.y/viewport.x,1.0)*.012*transmissionRoughness*facing;
          for(int ix=-2;ix<=2;ix++)for(int iy=-2;iy<=2;iy++){
            float wx=ix==0?.375:(ix==1||ix==-1?.25:.0625);
            float wy=iy==0?.375:(iy==1||iy==-1?.25:.0625);
            behind+=transmittedSample(center+vec2(float(ix),float(iy))*stepSize)*wx*wy;
          }
        }else behind=transmittedSample(center);
        vec3 background=behind.rgb+backdrop*(1.0-behind.a);
        vec3 absorption=exp(-2.2*(vec3(1.0)-color)*max(.07,facing));
        vec3 transmitted=background*absorption+color*(1.0-absorption)*.20;
        float fresnel=pow(1.0-facing,3.0);
        shaded=mix(shaded,transmitted,transmission);
        shaded+=vec3(.17,.20,.18)*fresnel*transmission;
      }
      float alpha=radialOpacity<0.0?1.0:radialOpacity*pow(max(0.0,1.0-dot(vLocal,vLocal)),3.0);
      gl_FragColor=vec4(mix(shaded,vec3(1.0),shine)*alpha,alpha);}`,
  );
  const program = gl.createProgram()!;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    throw new Error("WebGL program linking failed");
  }
  const uniforms = Object.fromEntries(
    [
      "modelView",
      "modelMatrix",
      "cameraPosition",
      "gloss",
      "projection",
      "normalMatrix",
      "color",
      "light",
      "ambient",
      "unlit",
      "sceneColor",
      "opaqueDepth",
      "useOpaqueDepth",
      "viewport",
      "backdrop",
      "transmission",
      "transmissionRoughness",
      "radialOpacity",
    ].map((key) => [key, gl.getUniformLocation(program, key)]),
  );
  const position = gl.getAttribLocation(program, "position"),
    normal = gl.getAttribLocation(program, "normal");
  const cache = new Map<
    Geometry3D,
    Map<boolean, { buffer: WebGLBuffer; count: number }>
  >();
  const transpose = (a: number[]) =>
    new Float32Array(
      Array.from({ length: 16 }, (_, i) => a[(i % 4) * 4 + Math.floor(i / 4)]!),
    );
  const sceneTexture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0]),
  );
  // A depth prepass lets transmission distinguish background from foreground per pixel,
  // including geometry that crosses the body. The color pass still uses MSAA on the canvas.
  const depthExtension = gl.getExtension("WEBGL_depth_texture");
  const depthTexture = depthExtension ? gl.createTexture() : null;
  const depthTarget = depthExtension ? gl.createFramebuffer() : null;
  const depthColor = depthExtension ? gl.createRenderbuffer() : null;
  let depthWidth = 0,
    depthHeight = 0;
  function prepareDepth(width: number, height: number) {
    if (!depthTexture || !depthTarget || !depthColor) return false;
    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, depthTexture);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, depthTarget);
    if (width !== depthWidth || height !== depthHeight) {
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.NEAREST);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.NEAREST);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.texImage2D(
        gl!.TEXTURE_2D,
        0,
        gl!.DEPTH_COMPONENT,
        width,
        height,
        0,
        gl!.DEPTH_COMPONENT,
        gl!.UNSIGNED_SHORT,
        null,
      );
      gl!.framebufferTexture2D(
        gl!.FRAMEBUFFER,
        gl!.DEPTH_ATTACHMENT,
        gl!.TEXTURE_2D,
        depthTexture,
        0,
      );
      gl!.bindRenderbuffer(gl!.RENDERBUFFER, depthColor);
      gl!.renderbufferStorage(gl!.RENDERBUFFER, gl!.RGBA4, width, height);
      gl!.framebufferRenderbuffer(
        gl!.FRAMEBUFFER,
        gl!.COLOR_ATTACHMENT0,
        gl!.RENDERBUFFER,
        depthColor,
      );
      depthWidth = width;
      depthHeight = height;
    }
    const complete =
      gl!.checkFramebufferStatus(gl!.FRAMEBUFFER) === gl!.FRAMEBUFFER_COMPLETE;
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.activeTexture(gl!.TEXTURE0);
    return complete;
  }
  let dead = false;
  canvas.style.cssText = "width:100%;height:100%;display:block";
  container.append(canvas);
  function geometry(g: Geometry3D, smooth: boolean) {
    let variants = cache.get(g);
    if (!variants) cache.set(g, (variants = new Map()));
    const old = variants.get(smooth);
    if (old) return old;
    if (
      g.vertices.length > 20000 ||
      g.vertices.some((v) => v.length !== 3 || !v.every(Number.isFinite))
    )
      throw new Error("Invalid 3D vertices");
    if (
      g.normals &&
      (g.normals.length !== g.vertices.length ||
        g.normals.some(
          (n) =>
            n.length !== 3 ||
            !n.every(Number.isFinite) ||
            Math.hypot(...n) < 1e-7,
        ))
    )
      throw new Error("Invalid 3D normals");
    const data: number[] = [];
    for (const triangle of g.triangles) {
      if (
        triangle.length !== 3 ||
        triangle.some((i) => !Number.isInteger(i) || !g.vertices[i])
      )
        throw new Error("Invalid 3D triangle");
      const [a, b, c] = triangle.map((i) => g.vertices[i]!);
      const face =
        smooth && g.normals
          ? undefined
          : m.unit(m.cross(m.sub(b!, a!), m.sub(c!, a!)));
      for (const i of triangle)
        data.push(
          ...g.vertices[i]!,
          ...(smooth && g.normals ? g.normals[i]! : face!),
        );
    }
    const buffer = gl!.createBuffer();
    if (!buffer) throw new Error("WebGL buffer allocation failed");
    gl!.bindBuffer(gl!.ARRAY_BUFFER, buffer);
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(data), gl!.STATIC_DRAW);
    const result = { buffer, count: data.length / 6 };
    variants.set(smooth, result);
    return result;
  }
  function render(scene: Scene3D) {
    if (dead) throw new Error("Renderer has been destroyed");
    if (gl!.isContextLost()) return;
    const box = container.getBoundingClientRect(),
      width = Math.max(1, box.width),
      height = Math.max(1, box.height),
      dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(width * dpr),
      h = Math.round(height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const c = scene.camera,
      near = c.near ?? 0.1,
      far = c.far ?? 100,
      size = c.size ?? 3.8,
      fov = c.fov ?? Math.PI / 4;
    if (
      ![near, far, size, fov].every(Number.isFinite) ||
      near <= 0 ||
      far <= near ||
      size <= 0 ||
      fov <= 0 ||
      fov >= Math.PI ||
      !["orthographic", "perspective"].includes(c.projection)
    )
      throw new Error("Invalid 3D camera");
    const view = m.cameraMatrix(c),
      aspect = width / height,
      f = 1 / Math.tan(fov / 2);
    const projection =
      c.projection === "perspective"
        ? [
            f / aspect,
            0,
            0,
            0,
            0,
            f,
            0,
            0,
            0,
            0,
            (far + near) / (near - far),
            (2 * far * near) / (near - far),
            0,
            0,
            -1,
            0,
          ]
        : [
            2 / (size * aspect),
            0,
            0,
            0,
            0,
            2 / size,
            0,
            0,
            0,
            0,
            -2 / (far - near),
            -(far + near) / (far - near),
            0,
            0,
            0,
            1,
          ];
    const light = m.unit(scene.light?.direction ?? [-0.6, 0.8, 1]),
      ambient = scene.light?.ambient ?? 0.75;
    if (!Number.isFinite(ambient) || ambient < 0 || ambient > 1)
      throw new Error("Invalid ambient light");
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.depthMask(true);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT);
    gl!.enable(gl!.DEPTH_TEST);
    gl!.depthFunc(gl!.LEQUAL);
    gl!.useProgram(program);
    gl!.uniformMatrix4fv(uniforms.projection!, false, transpose(projection));
    gl!.uniform3fv(uniforms.light!, new Float32Array(light));
    gl!.uniform1f(uniforms.ambient!, ambient);
    gl!.uniform3fv(
      uniforms.cameraPosition!,
      new Float32Array(c.position ?? [0, 0, 6]),
    );
    gl!.enableVertexAttribArray(position);
    gl!.enableVertexAttribArray(normal);
    gl!.uniform1i(uniforms.sceneColor!, 0);
    gl!.uniform1i(uniforms.opaqueDepth!, 1);
    gl!.uniform1f(uniforms.useOpaqueDepth!, 0);
    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, sceneTexture);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.uniform2f(uniforms.viewport!, canvas.width, canvas.height);
    let bg = container;
    let background = "";
    while (bg) {
      background = getComputedStyle(bg).backgroundColor;
      if (background !== "rgba(0, 0, 0, 0)" && background !== "transparent")
        break;
      bg = bg.parentElement!;
    }
    // A transparent DOM tree still composites on the page canvas, not black.
    const rgb = (bg
      ? background
          .match(/[\d.]+/g)
          ?.slice(0, 3)
          .map(Number)
      : undefined) ?? [249, 249, 246];
    gl!.uniform3fv(
      uniforms.backdrop!,
      new Float32Array(rgb.map((v) => v / 255)),
    );

    const draws: Array<{
      z: number;
      glass: boolean;
      soft: boolean;
      draw: () => void;
    }> = [];
    const ids = new Set<string>(),
      used = new Set<Geometry3D>();
    let triangles = 0,
      nodes = 0;
    function visit(node: Node3D, parent: number[], depth: number) {
      if (
        depth > 64 ||
        ++nodes > 2048 ||
        ids.has(node.id) ||
        !/^\w[\w-]*$/.test(node.id)
      )
        throw new Error("Invalid 3D hierarchy");
      ids.add(node.id);
      const world = m.multiply(parent, m.matrix(node.transform));
      if (node.geometry) {
        const g = node.geometry,
          material = node.material ?? { color: "#20231f" };
        triangles += g.triangles.length;
        if (triangles > 20000) throw new Error("3D triangle budget exceeded");
        if (!/^#[\da-f]{6}$/i.test(material.color))
          throw new Error("Invalid 3D material color");
        for (const value of [
          material.gloss,
          material.transmission,
          material.transmissionRoughness,
          material.radialOpacity,
        ])
          if (
            value !== undefined &&
            (!Number.isFinite(value) || value < 0 || value > 1)
          )
            throw new Error("Invalid 3D material response");
        const mesh = geometry(g, material.smooth !== false);
        used.add(g);
        const draw = () => {
          gl!.bindBuffer(gl!.ARRAY_BUFFER, mesh.buffer);
          gl!.vertexAttribPointer(position, 3, gl!.FLOAT, false, 24, 0);
          gl!.vertexAttribPointer(normal, 3, gl!.FLOAT, false, 24, 12);
          gl!.uniformMatrix4fv(
            uniforms.modelView!,
            false,
            transpose(m.multiply(view, world)),
          );
          // Cofactor columns preserve inverse-transpose scale ratios; normalize in the fragment shader.
          const a = [world[0]!, world[4]!, world[8]!] as const,
            b = [world[1]!, world[5]!, world[9]!] as const,
            c = [world[2]!, world[6]!, world[10]!] as const;
          gl!.uniformMatrix3fv(
            uniforms.normalMatrix!,
            false,
            new Float32Array([
              ...m.cross(b, c),
              ...m.cross(c, a),
              ...m.cross(a, b),
            ]),
          );
          gl!.uniform3fv(
            uniforms.color!,
            new Float32Array(
              [1, 3, 5].map(
                (i) => parseInt(material.color.slice(i, i + 2), 16) / 255,
              ),
            ),
          );
          if (
            material.gloss !== undefined &&
            (!Number.isFinite(material.gloss) ||
              material.gloss < 0 ||
              material.gloss > 1)
          )
            throw new Error("Invalid material gloss");
          const soft = material.radialOpacity !== undefined;
          gl!.depthMask(!soft);
          if (soft) {
            gl!.enable(gl!.BLEND);
            gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
          } else gl!.disable(gl!.BLEND);
          gl!.uniform1f(uniforms.radialOpacity!, material.radialOpacity ?? -1);
          gl!.uniform1f(
            uniforms.transmissionRoughness!,
            material.transmissionRoughness ?? 0,
          );
          gl!.uniform1f(uniforms.transmission!, material.transmission ?? 0);
          gl!.uniform1f(uniforms.gloss!, material.gloss ?? 0);
          gl!.uniformMatrix4fv(uniforms.modelMatrix!, false, transpose(world));
          gl!.uniform1f(uniforms.unlit!, material.unlit ? 1 : 0);
          if (material.doubleSided) gl!.disable(gl!.CULL_FACE);
          else {
            gl!.enable(gl!.CULL_FACE);
            gl!.cullFace(gl!.BACK);
          }
          gl!.drawArrays(gl!.TRIANGLES, 0, mesh.count);
        };
        draws.push({
          z: m.multiply(view, world)[11]!,
          glass: !!material.transmission,
          soft: material.radialOpacity !== undefined,
          draw,
        });
      }
      for (const child of node.children ?? []) visit(child, world, depth + 1);
    }
    for (const node of scene.nodes) visit(node, m.identity(), 0);
    const hasDepth =
      draws.some((item) => item.glass) &&
      prepareDepth(canvas.width, canvas.height);
    if (hasDepth) {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, depthTarget);
      // Never bind the attached depth texture as a sampler during its own pass.
      gl!.activeTexture(gl!.TEXTURE1);
      gl!.bindTexture(gl!.TEXTURE_2D, sceneTexture);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.depthMask(true);
      gl!.clear(gl!.DEPTH_BUFFER_BIT);
      gl!.colorMask(false, false, false, false);
      for (const item of draws) if (!item.glass && !item.soft) item.draw();
      gl!.colorMask(true, true, true, true);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      gl!.activeTexture(gl!.TEXTURE1);
      gl!.bindTexture(gl!.TEXTURE_2D, depthTexture);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.uniform1f(uniforms.useOpaqueDepth!, 1);
      for (const item of draws
        .filter((item) => !item.glass)
        .sort((a, b) => a.z - b.z))
        item.draw();
    }
    // Devices without depth textures retain the object-sorted approximation.
    for (const item of draws
      .filter((item) => !hasDepth || item.glass)
      .sort((a, b) => a.z - b.z)) {
      if (item.glass) {
        gl!.activeTexture(gl!.TEXTURE0);
        gl!.bindTexture(gl!.TEXTURE_2D, sceneTexture);
        gl!.copyTexImage2D(
          gl!.TEXTURE_2D,
          0,
          gl!.RGBA,
          0,
          0,
          canvas.width,
          canvas.height,
          0,
        );
      }
      item.draw();
    }
    for (const [g, variants] of cache)
      if (!used.has(g)) {
        for (const value of variants.values()) gl!.deleteBuffer(value.buffer);
        cache.delete(g);
      }
  }
  return {
    canvas,
    render,
    destroy() {
      if (dead) return;
      dead = true;
      for (const variants of cache.values())
        for (const value of variants.values()) gl!.deleteBuffer(value.buffer);
      cache.clear();
      gl!.deleteTexture(sceneTexture);
      gl!.deleteTexture(depthTexture);
      gl!.deleteFramebuffer(depthTarget);
      gl!.deleteRenderbuffer(depthColor);
      gl!.deleteProgram(program);
      canvas.remove();
      gl!.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
