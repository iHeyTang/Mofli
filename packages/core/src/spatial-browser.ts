import { createWebGLRenderer } from "./webgl.js";
import type { Scene3D } from "./scene3d.js";
/** 3D is always WebGL. Context loss never changes the rendering format. */
export function createSpatialRenderer(container: HTMLElement) {
  let gpu: ReturnType<typeof createWebGLRenderer> | undefined;
  let dead = false,
    lost = false;
  const abort = new AbortController();
  function message(text: string) {
    container.replaceChildren();
    const p = document.createElement("p");
    p.setAttribute("role", "status");
    p.textContent = text;
    container.append(p);
  }
  function initialize() {
    try {
      gpu = createWebGLRenderer(container);
      container.dataset.renderer = "webgl";
      gpu.canvas.addEventListener(
        "webglcontextlost",
        (event) => {
          event.preventDefault();
          lost = true;
          const p = document.createElement("p");
          p.setAttribute("role", "status");
          p.textContent = "3D 渲染已中断，请刷新页面重试";
          container.append(p);
        },
        { signal: abort.signal },
      );
    } catch {
      container.dataset.renderer = "unavailable";
      message("当前设备无法使用 WebGL，无法显示 3D 宠物");
    }
  }
  initialize();
  return {
    render(scene: Scene3D) {
      if (dead) return;
      if (!lost) gpu?.render(scene);
    },
    get element() {
      return gpu?.canvas;
    },
    get backend() {
      return gpu && !lost ? ("webgl" as const) : ("unavailable" as const);
    },
    destroy() {
      dead = true;
      abort.abort();
      gpu?.destroy();
      container.replaceChildren();
      delete container.dataset.renderer;
    },
  };
}
