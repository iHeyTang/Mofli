import {
  composeSpatialAttachments,
  type AttachmentInstance,
} from "@mofli/core";
import { createSpatialRenderer } from "@mofli/core/spatial-browser";
import {
  createSpatialPetScene,
  spatialSkins,
  spatialParts,
  spatialExpressions,
  spatialShapes,
  spatialActions,
  type SpatialPetOptions,
} from "@mofli/grove/rigs/spatial";
import "./spatial.css";

const root = document.querySelector<HTMLDivElement>("#spatial-app")!;
root.innerHTML = `<header><a class="brand" href="/" aria-label="返回 Mofli 工作台"><svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M3 19C3 8 8 5 16 5s13 3 13 14c0 6-5 8-13 8S3 25 3 19Z"/><ellipse cx="11" cy="15" rx="2" ry="2.6" fill="white"/><ellipse cx="21" cy="15" rx="2" ry="2.6" fill="white"/></svg>mofli</a><span class="page-name">3D</span><div class="header-actions"><a href="/">返回工作台</a></div></header>
<main><section class="preview" aria-label="三维宠物预览"><div id="scene" tabindex="0" aria-label="拖动旋转宠物；方向键旋转，Home 恢复正面"></div><div class="view-tools"><button id="rotate" aria-pressed="false">自动旋转</button><div class="views" aria-label="预设视角"><button data-view="0" aria-label="正面视角">正面</button><button data-view="1.5707963267948966" aria-label="侧面视角">侧面</button><button data-view="3.141592653589793" aria-label="背面视角">背面</button></div></div></section>
<aside aria-label="三维宠物设置"><div class="panel-heading"><h1>Mallow 3D</h1><button id="reset">重置</button></div>

<section><h2>视角</h2><div class="segmented" aria-label="投影方式"><button data-projection="orthographic" aria-pressed="true">正交</button><button data-projection="perspective" aria-pressed="false">透视</button></div>
<label class="slider">左右旋转 <output id="yaw-value">0°</output><input id="yaw" type="range" min="-180" max="180" value="0" step="1"></label>
<label class="slider">上下俯仰 <output id="pitch-value">0°</output><input id="pitch" type="range" min="-70" max="70" value="0" step="1"></label></section>
<section><h2>表情</h2><div class="expressions">${spatialExpressions.map((e) => `<button data-expression="${e.index}" aria-pressed="${e.index === 0}">${e.name}</button>`).join("")}</div></section>
<section><h2>动作</h2><div class="expressions">${spatialActions.map((e) => `<button data-action="${e.index}" aria-pressed="${e.index === 0}">${e.name}</button>`).join("")}</div></section>
<section><h2>基础形状</h2><div class="expressions">${spatialShapes.map((e) => `<button data-shape="${e.index}" aria-pressed="${e.index === 0}">${e.name}</button>`).join("")}</div></section>
<section><h2>外观</h2><label class="color">身体<input id="body" type="color" value="#bff2dc"></label><label class="color">五官<input id="face" type="color" value="#34483f"></label>
<label class="slider">果冻透光<input id="jelly" type="range" min="0" max="100" value="88" step="1"></label><label class="toggle">透射参照<input id="reference" type="checkbox"></label><label class="slider">立体明暗<input id="light" type="range" min="0" max="70" value="36" step="1"></label></section>
<section><h2>饰品</h2>${spatialParts
  .map(
    ({ name, attachment: a }) =>
      `<div><label class="toggle">${name}<input id="${a.id.replace("spatial-", "")}" type="checkbox"></label><div id="settings-${a.id}" hidden>${Object.entries(
        a.colors ?? {},
      )
        .map(
          ([k, c]) =>
            `<label class="color">${a.labels?.[k] ?? k}<input data-part="${a.id}" data-color="${k}" type="color" value="${c}"></label>`,
        )
        .join("")}${Object.entries(a.parameters ?? {})
        .map(
          ([k, r]) =>
            `<label class="slider">${a.labels?.[k] ?? k}<input data-part="${a.id}" data-param="${k}" type="range" min="${r.min}" max="${r.max}" step=".01" value="${r.default}"></label>`,
        )
        .join("")}</div></div>`,
  )
  .join("")}</section>
<div class="bottom-actions"><button id="motion" aria-pressed="true">暂停动画</button></div><p id="error" role="alert" hidden></p></aside></main>`;
const element = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const compactScreen = matchMedia("(max-width: 800px)");
const host = element("scene"),
  renderer = createSpatialRenderer(host);
const defaults: SpatialPetOptions = {
  time: 1,
  yaw: 0,
  pitch: 0,
  expression: 0,
  shape: 0,
  action: 0,
  hat: false,
  orbit: false,
  ears: false,
  perspective: false,
  light: 0.78,
  jelly: 0.88,
  reference: false,
  face: "#34483f",
  body: "#bff2dc",
  accessory: "#466c56",
};
const instances: AttachmentInstance[] = spatialParts.map(({ attachment }) => ({
  id: attachment.id,
  attachment,
  parameters: {},
  colors: {},
}));
const worn = new Set<string>();
let options = { ...defaults },
  rotating = false,
  playing = !matchMedia("(prefers-reduced-motion: reduce)").matches,
  dirty = true;
let previous = performance.now(),
  lastDraw = 0,
  frameId = 0,
  pointer: { id: number; x: number; y: number } | null = null;
let yaw = 0,
  pitch = 0,
  follow = { x: 0, y: 0, weight: 0 },
  target = { x: 0, y: 0, weight: 0 };

const setMotion = () => {
  element("motion").setAttribute("aria-pressed", String(playing));
  element("motion").textContent = playing ? "暂停动画" : "播放动画";
};
setMotion();
function syncAngles() {
  element<HTMLInputElement>("yaw").value = String(
    Math.round((yaw * 180) / Math.PI),
  );
  element("yaw-value").textContent = `${Math.round((yaw * 180) / Math.PI)}°`;
  element<HTMLInputElement>("pitch").value = String(
    Math.round((pitch * 180) / Math.PI),
  );
  element("pitch-value").textContent =
    `${Math.round((pitch * 180) / Math.PI)}°`;
}
function autoRotate(value: boolean) {
  rotating = value;
  element("rotate").setAttribute("aria-pressed", String(value));
  target.weight = 0;
  dirty = true;
}
compactScreen.addEventListener("change", () => {
  dirty = true;
});
function draw() {
  options.detail = compactScreen.matches ? "compact" : "standard";
  const natural =
    playing && !rotating
      ? Math.sin(options.time! * 0.65) * 0.09 +
        (options.expression === 2 ? 0.12 : 0)
      : 0;
  options.yaw =
    yaw + (1 - follow.weight) * natural + follow.x * 0.45 * follow.weight;
  options.pitch = pitch + follow.y * 0.28 * follow.weight;
  const start = performance.now();
  try {
    renderer.render(
      composeSpatialAttachments(
        createSpatialPetScene(options),
        instances.filter((a) => worn.has(a.id)),
        options.time,
      ),
    );
    element("error").hidden = true;
    // Available to QA without cluttering the product UI.
    host.dataset.renderMs = (performance.now() - start).toFixed(2);
    host.dataset.paths = String(host.querySelectorAll("path").length);
  } catch (error) {
    element("error").hidden = false;
    element("error").textContent =
      error instanceof Error ? error.message : String(error);
    playing = false;
    autoRotate(false);
    setMotion();
  }
  dirty = false;
}
function animate(now: number) {
  const dt = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  if (!document.hidden) {
    if (playing) {
      options.time! += dt;
      dirty = true;
    }
    if (rotating) {
      yaw = ((yaw + dt * 0.48 + Math.PI) % (Math.PI * 2)) - Math.PI;
      syncAngles();
      dirty = true;
    }
    const k = 1 - Math.exp(-dt * 12);
    for (const key of ["x", "y", "weight"] as const) {
      if (Math.abs(follow[key] - target[key]) > 0.001) {
        follow[key] += (target[key] - follow[key]) * k;
        dirty = true;
      } else follow[key] = target[key];
    }
    if (dirty && now - lastDraw >= 1000 / 30) {
      draw();
      lastDraw = now;
    }
  }
  frameId = requestAnimationFrame(animate);
}
element("rotate").onclick = () => autoRotate(!rotating);
element("motion").onclick = () => {
  playing = !playing;
  setMotion();
  dirty = true;
};
for (const key of ["yaw", "pitch"] as const)
  element<HTMLInputElement>(key).oninput = (e) => {
    autoRotate(false);
    const v = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
    if (key === "yaw") yaw = v;
    else pitch = v;
    target.weight = 0;
    follow.weight = 0;
    syncAngles();
    dirty = true;
  };
for (const button of root.querySelectorAll<HTMLButtonElement>("[data-view]"))
  button.onclick = () => {
    autoRotate(false);
    yaw = Number(button.dataset.view);
    pitch = 0;
    follow.weight = 0;
    syncAngles();
    dirty = true;
  };
for (const button of root.querySelectorAll<HTMLButtonElement>(
  "[data-projection]",
))
  button.onclick = () => {
    options.perspective = button.dataset.projection === "perspective";
    for (const b of root.querySelectorAll("[data-projection]"))
      b.setAttribute("aria-pressed", String(b === button));
    dirty = true;
  };
for (const button of root.querySelectorAll<HTMLButtonElement>(
  "[data-expression]",
))
  button.onclick = () => {
    options.expression = Number(button.dataset.expression);
    for (const b of root.querySelectorAll("[data-expression]"))
      b.setAttribute("aria-pressed", String(b === button));
    dirty = true;
  };
for (const key of ["reference"] as const)
  element<HTMLInputElement>(key).onchange = (e) => {
    options[key] = (e.target as HTMLInputElement).checked;
    dirty = true;
  };
for (const key of ["body", "face"] as const)
  element<HTMLInputElement>(key).oninput = (e) => {
    options[key] = (e.target as HTMLInputElement).value;
    dirty = true;
  };
for (const a of instances)
  element<HTMLInputElement>(a.id.replace("spatial-", "")).onchange = (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    checked ? worn.add(a.id) : worn.delete(a.id);
    element(`settings-${a.id}`).hidden = !checked;
    dirty = true;
  };
for (const input of root.querySelectorAll<HTMLInputElement>("[data-part]"))
  input.oninput = () => {
    const a = instances.find((a) => a.id === input.dataset.part)!;
    if (input.dataset.color) a.colors![input.dataset.color] = input.value;
    if (input.dataset.param)
      a.parameters![input.dataset.param] = Number(input.value);
    dirty = true;
  };
element<HTMLInputElement>("light").oninput = (e) => {
  options.light = 1 - Number((e.target as HTMLInputElement).value) / 100;
  dirty = true;
};
element<HTMLInputElement>("jelly").oninput = (e) => {
  options.jelly = Number((e.target as HTMLInputElement).value) / 100;
  dirty = true;
};
element("reset").onclick = () => {
  options = { ...defaults };
  worn.clear();
  for (const a of instances) {
    a.colors = {};
    a.parameters = {};
    element<HTMLInputElement>(a.id.replace("spatial-", "")).checked = false;
    element(`settings-${a.id}`).hidden = true;
  }
  for (const input of root.querySelectorAll<HTMLInputElement>("[data-part]"))
    input.value = input.defaultValue;
  yaw = 0;
  pitch = 0;
  follow = { x: 0, y: 0, weight: 0 };
  target = { ...follow };
  autoRotate(false);
  syncAngles();
  for (const key of ["reference"] as const)
    element<HTMLInputElement>(key).checked = !!defaults[key];
  for (const key of ["body", "face"] as const)
    element<HTMLInputElement>(key).value = defaults[key]!;
  element<HTMLInputElement>("light").value = "36";
  element<HTMLInputElement>("jelly").value = "88";
  for (const kind of ["action", "shape"] as const)
    root
      .querySelectorAll<HTMLElement>(`[data-${kind}]`)
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset[kind] === "0")),
      );
  root
    .querySelectorAll<HTMLElement>("[data-expression]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.expression === "0")),
    );
  root
    .querySelectorAll<HTMLElement>("[data-projection]")
    .forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String(b.dataset.projection === "orthographic"),
      ),
    );
  dirty = true;
};
host.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || pointer) return;
  pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
  host.setPointerCapture(e.pointerId);
  autoRotate(false);
  target.weight = 0;
  follow.weight = 0;
});
host.addEventListener("pointermove", (e) => {
  if (pointer && pointer.id === e.pointerId) {
    yaw += (e.clientX - pointer.x) * 0.009;
    pitch = Math.max(
      -1.22,
      Math.min(1.22, pitch + (e.clientY - pointer.y) * 0.007),
    );
    yaw = ((yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    syncAngles();
    dirty = true;
  } else if (e.pointerType === "mouse" && !rotating) {
    const r = host.getBoundingClientRect();
    target = {
      x: ((e.clientX - r.left) / r.width) * 2 - 1,
      y: ((e.clientY - r.top) / r.height) * 2 - 1,
      weight: 1,
    };
  }
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
  host.addEventListener(type, () => {
    pointer = null;
    target.weight = 0;
  });
host.addEventListener("pointerleave", () => {
  target.weight = 0;
});
window.addEventListener("blur", () => {
  pointer = null;
  target.weight = 0;
});
host.addEventListener("keydown", (e) => {
  if (
    !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(e.key)
  )
    return;
  e.preventDefault();
  autoRotate(false);
  follow.weight = 0;
  target.weight = 0;
  if (e.key === "Home") {
    yaw = 0;
    pitch = 0;
  } else if (e.key === "ArrowLeft") yaw -= 0.1;
  else if (e.key === "ArrowRight") yaw += 0.1;
  else
    pitch = Math.max(
      -1.22,
      Math.min(1.22, pitch + (e.key === "ArrowUp" ? -0.1 : 0.1)),
    );
  yaw = ((yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  syncAngles();
  dirty = true;
});
window.addEventListener(
  "pagehide",
  (event) => {
    if (event.persisted) return;
    cancelAnimationFrame(frameId);
    renderer.destroy();
  },
  { once: true },
);
draw();
frameId = requestAnimationFrame(animate);

for (const kind of ["action", "shape"] as const)
  document
    .querySelectorAll<HTMLButtonElement>(`[data-${kind}]`)
    .forEach((button) =>
      button.addEventListener("click", () => {
        options[kind] = Number(button.dataset[kind]);
        if (kind === "shape") {
          const colors = spatialSkins[Math.min(2, options.shape!)]!.colors;
          for (const key of ["body", "face"] as const) {
            options[key] = colors[key]!;
            element<HTMLInputElement>(key).value = colors[key]!;
          }
        }
        options.time = 1;
        document
          .querySelectorAll<HTMLButtonElement>(`[data-${kind}]`)
          .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
        dirty = true;
      }),
    );
