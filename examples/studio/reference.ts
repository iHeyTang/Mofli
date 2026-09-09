import { shapeOptions, expressionOptions } from "@mofli/rig-bloub";
import {
  expressionOptions as catExpressions,
  catHeadRig,
  catStates,
} from "@mofli/rig-cat-head";
import { sesame } from "@mofli/skin-cat-ink";
import { patches } from "@mofli/skin-cat-patches";
const catSkins = [sesame, patches];
import { bloubSkin } from "@mofli/skin-bloub";
import "./reference.css";
import {
  PetEngine,
  type Skin,
  type RigConfig,
  type RigPose,
} from "@mofli/core";
import { createSvgRenderer } from "@mofli/core/browser";
import {
  bloubRig,
  bloubStates,
  bloubDuration,
  bloubPosition,
} from "@mofli/rig-bloub";
const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const copy: Record<string, [string, string]> = {
  idle: ["静候", "视线轻移，自然眨眼。身体保持安静。"],
  thinking: ["思考", "身体化为三个点，脉动依次传递。"],
  wink: ["眨眼", "一只眼睛收成短线，头部轻轻转向。"],
  wide: ["惊讶", "眼睛拉长、睁大，视线抬起。"],
  alert: ["警觉", "倾斜的感叹号沿着轨迹移动。"],
  notify: ["通知", "蓝色提示点弹出，视线让开它的位置。"],
  exclaim: ["感叹", "身体收拢，变成一个感叹号。"],
  sleep: ["休眠", "缩成小点，在安静的节拍中弹动。"],
  egg: ["蛋形", "轮廓纵向收束，五官随着身体调整。"],
  hexagon: ["六边形", "圆润轮廓逐渐变成有棱角的姿态。"],
  play: ["跃动", "彩色弧线掠过三角形身体。"],
  orbit: ["环绕", "轨道在身体前后穿行，轮廓旋转再舒展。"],
  burst: ["爆散", "身体收缩、散开，粒子回到中心。"],
  comet: ["彗星", "核心留在原地，彩色尾迹环绕流动。"],
};
const catalog = [
  { rig: bloubRig, name: "Bloub · 参考骨架", skins: [bloubSkin] },
  { rig: catHeadRig, name: "猫头 · 部件骨架", skins: catSkins },
];
let entry = catalog[0]!;
let preset = bloubSkin;
const isBloub = () => entry.rig.id === bloubRig.id;
const states = () => isBloub() ? bloubStates : catStates;
const stateCopy = (id: string) => {
  if (isBloub()) return copy[id]!;
  const state = catStates.find(s => s.id === id)!;
  return [state.name, state.description];
};
let skin: Skin = structuredClone(bloubSkin),
  engine = new PetEngine(entry.rig, skin, { transitionDuration: 0.45 });
let rigConfig: RigConfig = engine.getRigConfig(),
  pose: RigPose = engine.getPose();
const renderer = createSvgRenderer($("avatar"));
renderer.svg.style.cssText = "display:block;width:100%;height:100%";
renderer.svg.setAttribute("aria-label", "Bloub animated reference avatar");
let clock = 0,
  start = 0,
  last = 0,
  playing = true,
  selected = -1,
  raf = 0,
  active = -2;
const choiceRenderers: ReturnType<typeof createSvgRenderer>[] = [];
const posters: ReturnType<typeof createSvgRenderer>[] = [];
function rebuildStates() {
  posters.splice(0).forEach((p) => p.destroy());
  $("states").replaceChildren();
  $("state-count").textContent = String(states().length);
  for (const state of states()) {
    const b = document.createElement("button");
    b.className = "state";
    b.dataset.state = state.id;
    b.setAttribute("aria-pressed", "false");
    const preview = document.createElement("span");
    preview.className = "thumbnail";
    const r = createSvgRenderer(preview);
    r.svg.style.cssText = "width:100%;height:100%";
    r.svg.setAttribute("aria-hidden", "true");
    const p = new PetEngine(entry.rig, skin, {
      rigConfig,
      pose: { ...pose, state: state.index },
    });

    r.render(p.sample(state.posterTime));
    posters.push(r);
    const text = document.createElement("span");
    text.className = "state-label";
    text.textContent = stateCopy(state.id)[0];
    const code = document.createElement("small");
    code.textContent = state.id;
    text.append(code);
    b.append(preview, text);
    b.onclick = () => select(state.index);
    $("states").append(b);
  }
}
function rebuildChoices() {
  choiceRenderers.splice(0).forEach((r) => r.destroy());
  for (const key of ["shape", "expression"] as const) {
    const items =
      key === "shape"
        ? [
            { index: -1, name: isBloub() ? "原始圆形" : "软团母版" },
            ...shapeOptions,
          ]
        : [
            { index: -1, name: "默认" },
            ...(isBloub() ? expressionOptions : catExpressions),
          ];
    const host = $(key + "-choices");
    host.replaceChildren();
    for (const item of items) {
      const button = document.createElement("button");
      button.className = "preview-choice";
      button.dataset[key] = String(item.index);
      button.setAttribute("aria-label", item.name);
      button.setAttribute(
        "aria-pressed",
        String(
          (key === "shape" ? rigConfig.shape : pose.expression) === item.index,
        ),
      );
      const thumb = document.createElement("span");
      thumb.className = "choice-thumbnail";
      const r = createSvgRenderer(thumb);
      r.svg.setAttribute("aria-hidden", "true");
      const preview = new PetEngine(entry.rig, skin, {
        rigConfig: {
          ...rigConfig,
          ...(key === "shape" ? { shape: item.index } : {}),
        },
        pose: { state: 0, expression: key === "expression" ? item.index : -1 },
      });
      r.render(preview.sample(1, true));
      choiceRenderers.push(r);
      const label = document.createElement("span");
      label.textContent = item.name;
      button.append(thumb, label);
      button.onclick = () => {
        customize(key, item.index);
        host
          .querySelector<HTMLButtonElement>(`[data-${key}="${item.index}"]`)
          ?.focus({ preventScroll: true });
      };
      host.append(button);
    }
  }
}
function duration() {
  return selected < 0 ? bloubDuration : states()[selected]!.duration;
}
function render() {
  renderer.render(engine.sample(clock));
  const elapsed = Math.max(0, clock - start),
    position =
      selected < 0
        ? bloubPosition(elapsed)
        : { index: selected, local: elapsed };
  if (active !== position.index) {
    active = position.index;
    const s = states()[active]!;
    $("state-name").textContent = stateCopy(s.id)[0];
    $("description").textContent = stateCopy(s.id)[1];
    $("state-code").textContent = s.id.toUpperCase();
    document
      .querySelectorAll<HTMLElement>("[data-state]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.state === s.id)),
      );
  }
  const progress =
    selected < 0 ? elapsed % bloubDuration : Math.min(elapsed, duration());
  $<HTMLInputElement>("seek").value = String(progress);
  $("timecode").textContent =
    `${progress.toFixed(2).padStart(5, "0")} / ${duration().toFixed(2)}`;
}
function select(index: number) {
  selected = index;
  pose = { ...pose, state: index }; engine.setPose(pose, clock);
  start = clock;
  active = -2;
  $("mode-label").textContent =
    index < 0
      ? "ORIGINAL SEQUENCE"
      : isBloub()
        ? "SINGLE STATE"
        : "CAT HEAD RIG";
  $("cycle").setAttribute("aria-pressed", String(index < 0));
  $<HTMLInputElement>("seek").max = String(duration());
  render();
}
function restart() {
  engine = new PetEngine(entry.rig, skin, {
    transitionDuration: 0.45,
    rigConfig,
    pose,
  });

  clock = 0;
  start = 0;
  last = 0;
  render();
}
function tick(ms: number) {
  if (playing && !document.hidden)
    clock += last ? Math.min((ms - last) / 1000, 0.05) : 0;
  last = ms;
  if (playing) render();
  raf = requestAnimationFrame(tick);
}
$("play").onclick = () => {
  playing = !playing;
  $("play").setAttribute("aria-pressed", String(playing));
  $("play").textContent = playing ? "Ⅱ 暂停" : "▷ 播放";
  render();
};
$("cycle").onclick = () => select(-1);
$("restart").onclick = restart;
$<HTMLInputElement>("seek").oninput = (e) => {
  const local = Number((e.target as HTMLInputElement).value);
  engine = new PetEngine(entry.rig, skin, {
    transitionDuration: 0,
    rigConfig,
    pose,
  });

  clock = local;
  start = 0;
  render();
};
function color() {
  skin = {
    ...skin,
    rigConfig,
    colors: {
      ...skin.colors,
      body: $<HTMLInputElement>("ink").value,
      ...(isBloub()
        ? { paper: $<HTMLInputElement>("paper").value }
        : {
            face: $<HTMLInputElement>("face").value,
            ...(entry.rig.colors.accent
              ? { accent: $<HTMLInputElement>("accent").value }
              : {}),
          }),
    },
  };
  engine.setSkin(skin, clock, { restart: false });
  $("stage").style.background = $<HTMLInputElement>("paper").value;
  rebuildStates();
  rebuildChoices();
  render();
}
$<HTMLInputElement>("ink").oninput = color;
$<HTMLInputElement>("paper").oninput = color;
$("restore").onclick = () => {
  syncColors(preset);
  color();
};
$("export").onclick = () => {
  const clone = renderer.svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "632");
  clone.setAttribute("height", "632");
  clone.removeAttribute("style");
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
    type: "image/svg+xml",
  });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `${isBloub() ? "bloub" : skin.id}-${states()[active]!.id}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("status").textContent = "已导出当前矢量帧";
};
$("save-skin").onclick = () => {
  const blob = new Blob([JSON.stringify(engine.exportSkin(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = skin.id + ".skin.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("status").textContent = "已保存皮肤：含外观与当前骨架参数，不含动作或表情";
};
function syncColors(value: Skin) {
  for (const [id, color] of Object.entries({
    ink: value.colors.body!,
    paper: value.colors.paper ?? "#f9f9f9",
    face: value.colors.face ?? "#000000",
    accent: value.colors.accent ?? "#ffffff",
  }))
    $<HTMLInputElement>(id).value = color;
  $("stage").style.background = value.colors.paper ?? "#f9f9f9";
}
function loadSkin(id: string, changeRig = false) {
  preset = entry.skins.find((s) => s.id === id)!;
  skin = structuredClone(preset);
  if (changeRig) {
    selected = isBloub() ? -1 : 0;
    rigConfig = {};
    pose = { state: selected };
    engine = new PetEngine(entry.rig, skin, {
      transitionDuration: 0.45,
      rigConfig,
      pose,
    });
    rigConfig = engine.getRigConfig();
    pose = engine.getPose();
    clock = start = last = 0;
  } else {
    engine.setSkin(skin, clock, { restart: false });
    rigConfig = engine.getRigConfig();
  }
  active = -2;
  syncRigControls();
  rebuildChoices();
  syncColors(skin);
  rebuildStates();
  $("cycle").hidden = !isBloub();
  $("face-control").hidden = isBloub();
  $("accent-control").hidden = !entry.rig.colors.accent;
  $("mode-label").textContent = isBloub()
    ? selected < 0
      ? "ORIGINAL SEQUENCE"
      : "SINGLE STATE"
    : "CAT HEAD RIG";
  $("cycle").setAttribute("aria-pressed", String(selected < 0));
  $("assembly").textContent = `${entry.name} / ${preset.name}`;
  $("rig-note").textContent = isBloub()
    ? "Bloub 目前提供 1 款原色皮肤，可在下方调整配色。"
    : "皮肤包含外观与默认耳长、脸型；换肤保留动作和表情。";
  $("reference-note").hidden = !isBloub();
  $("attribution").hidden = !isBloub();
  renderer.svg.setAttribute("aria-label", `${entry.name} / ${preset.name}`);
  $<HTMLInputElement>("seek").max = String(duration());
  $("status").textContent = `已装配：${entry.name} / ${preset.name}`;
  render();
}
function syncRigControls() {
  $("rig-parameters").replaceChildren();
  for (const [key, rule] of Object.entries(entry.rig.parameters)) {
    if (key === "shape") continue;
    const label = document.createElement("label");
    const title =
      ({earLength: "耳长", cheek: "脸部饱满度"} as Record<string, string>)[key] ?? key;
    const text = document.createElement("span");
    text.textContent = title;
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(rule.min);
    input.max = String(rule.max);
    input.step = "0.01";
    input.value = String(rigConfig[key]);
    input.setAttribute("aria-label", title);
    const output = document.createElement("output");
    output.textContent = input.value;
    input.oninput = () => {
      rigConfig = { ...rigConfig, [key]: Number(input.value) };
      engine.setRigConfig(rigConfig, clock);
      output.textContent = Number(input.value).toFixed(2);
      render();
    };
    input.onchange = () => {
      rebuildStates();
      rebuildChoices();
    };
    label.append(text, input, output);
    $("rig-parameters").append(label);
  }
}
function populateSkins() {
  $<HTMLSelectElement>("skin-select").replaceChildren(
    ...entry.skins.map((s) => new Option(s.name, s.id)),
  );
}
$<HTMLSelectElement>("rig-select").replaceChildren(
  ...catalog.map((e) => new Option(e.name, e.rig.id)),
);
$("rig-select").onchange = () => {
  entry = catalog.find(
    (e) => e.rig.id === $<HTMLSelectElement>("rig-select").value,
  )!;
  populateSkins();
  loadSkin(entry.skins[0]!.id, true);
};
$("skin-select").onchange = () =>
  loadSkin($<HTMLSelectElement>("skin-select").value);
$("face").oninput = color;
$("accent").oninput = color;
function customize(key: "shape" | "expression", value: number) {
  if (key === "shape") {
    rigConfig = { ...rigConfig, shape: value };
    engine.setRigConfig(rigConfig, clock);
    syncRigControls();
  } else pose = { ...pose, expression: value };
  select(0);
  rebuildStates();
  rebuildChoices();
  $("status").textContent =
    "已更新" + (key === "shape" ? "基础形状" : "静候表情") + "，在静候状态预览";
}
populateSkins();
loadSkin(bloubSkin.id, true);
render();
raf = requestAnimationFrame(tick);
window.addEventListener("pagehide", () => {
  cancelAnimationFrame(raf);
  renderer.destroy();
  posters.forEach((p) => p.destroy());
  choiceRenderers.forEach((p) => p.destroy());
});

// This studio supplies input only; the rig owns gaze and click response.
const interactionHost = $("avatar");
interactionHost.tabIndex = 0;
interactionHost.setAttribute("role", "button");
interactionHost.setAttribute(
  "aria-label",
  "互动宠物：移动鼠标跟随视线，点击或按回车回应",
);
interactionHost.style.touchAction = "none";
interactionHost.style.cursor = "pointer";
let pointer: { id: number; x: number; y: number; moved: boolean } | null = null;
const lookAtPointer = (e: PointerEvent) => {
  const box = interactionHost.getBoundingClientRect();
  if (!box.width || !box.height) return;
  engine.handle(
    {
      type: "look",
      value: {
        x: ((e.clientX - box.left) / box.width) * 2 - 1,
        y: ((e.clientY - box.top) / box.height) * 2 - 1,
      },
    },
    clock,
  );
};
interactionHost.addEventListener("pointermove", (e) => {
  lookAtPointer(e);
  if (pointer?.id === e.pointerId)
    pointer.moved ||=
      Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 6;
  render();
});
interactionHost.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || pointer) return;
  lookAtPointer(e);
  pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  interactionHost.setPointerCapture(e.pointerId);
  render();
});
const releasePointer = (e: PointerEvent) => {
  if (pointer?.id !== e.pointerId) return;
  const tap = e.type === "pointerup" && !pointer.moved;
  pointer = null;
  if (tap) engine.handle({ type: "tap" }, clock);
  if (interactionHost.hasPointerCapture(e.pointerId))
    interactionHost.releasePointerCapture(e.pointerId);
  const b = interactionHost.getBoundingClientRect();
  if (
    e.pointerType === "touch" ||
    e.type !== "pointerup" ||
    e.clientX < b.left ||
    e.clientX > b.right ||
    e.clientY < b.top ||
    e.clientY > b.bottom
  )
    engine.handle({ type: "hover", value: false }, clock);
  render();
};
for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
  interactionHost.addEventListener(type, releasePointer as EventListener);
interactionHost.addEventListener("pointerleave", () => {
  if (!pointer) engine.handle({ type: "hover", value: false }, clock);
});
interactionHost.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
    e.preventDefault();
    engine.handle({ type: "tap" }, clock);
    render();
  }
});
