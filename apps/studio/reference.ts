import projectDefinition, { projectMode, projectKey } from "./project.js";
import type { StudioProject } from "./project-types.js";
const project = projectDefinition as StudioProject;
import { hat } from "@mofli/grove/accessories";
import { bow } from "@mofli/grove/accessories";
import { PetRegistry, type PetConfig, composeAttachments } from "@mofli/core";
import { doughSkin } from "@mofli/grove/skins/mofli-dough";
import { beanSkin } from "@mofli/grove/skins/mofli-bean";
import { shapeOptions, expressionOptions } from "@mofli/grove/rigs/bloub";
import {
  expressionOptions as catExpressions,
  mewRig,
  catStates,
} from "@mofli/grove/rigs/mew";
import { sesame } from "@mofli/grove/skins/cat-ink";
import { patches } from "@mofli/grove/skins/cat-patches";
const catSkins = [sesame, patches];
import { stoneSkin } from "@mofli/grove/skins/mofli-stone";
import { bloubSkin } from "@mofli/grove/skins/bloub";
import "./reference.css";
import {
  PetEngine,
  type Skin,
  type Rig,
  type RigConfig,
  type RigPose,
} from "@mofli/core";
import { createSvgRenderer } from "@mofli/core/browser";
import {
  bloubRig,
  bloubStates,
  bloubDuration,
  bloubPosition,
} from "@mofli/grove/rigs/bloub";
const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const copy: Record<string, [string, string]> = {
  idle: ["Idle", "视线轻移，NeutralWink。身体保持安静。"],
  thinking: ["Thinking", "身体化为三个点，脉动依次传递。"],
  wink: ["Wink", "一只眼睛收成短线，头部轻轻转向。"],
  wide: ["Surprised", "眼睛拉长、睁大，视线抬起。"],
  alert: ["Alert", "倾斜的Exclaim号沿着轨迹移动。"],
  notify: ["Notify", "Blue提示点弹出，视线让开它的位置。"],
  exclaim: ["Exclaim", "身体收拢，变成一个Exclaim号。"],
  sleep: ["Sleep", "缩成小点，在安静的节拍中弹动。"],
  egg: ["Egg", "轮廓纵向收束，五官随着身体调整。"],
  hexagon: ["Hexagon", "圆润轮廓逐渐变成有棱角的姿态。"],
  play: ["Play", "彩色弧线掠过Triangle身体。"],
  orbit: ["Orbit", "轨道在身体前后穿行，轮廓旋转再舒展。"],
  burst: ["Burst", "身体收缩、散开，粒子回到中心。"],
  comet: ["Comet", "核心留在原地，彩色尾迹Orbit流动。"],
};
const catalog: { rig: Rig; name: string; skins: Skin[] }[] = [
  {
    rig: bloubRig,
    name: "Bloub · 参考骨架",
    skins: [bloubSkin, doughSkin, beanSkin, stoneSkin],
  },
  { rig: mewRig, name: "Mew · 部件骨架", skins: catSkins },
];
for (const pet of project.pets ?? []) {
  const existing = catalog.find((e) => e.rig.id === pet.rig.id);
  if (!existing) {
    catalog.push({ rig: pet.rig, name: pet.rig.name, skins: [pet.skin] });
    continue;
  }
  existing.rig = pet.rig;
  const index = existing.skins.findIndex((s) => s.id === pet.skin.id);
  if (index < 0) existing.skins.push(pet.skin);
  else existing.skins[index] = pet.skin;
}
const parts = [
  { name: "Sage Hat", attachment: hat },
  { name: "Clay Bow", attachment: bow },
];
for (const part of project.attachments ?? []) {
  if (parts.some((p) => p.attachment.id === part.attachment.id))
    throw new Error("Duplicate attachment id: " + part.attachment.id);
  parts.push(part);
}
const petRegistry = new PetRegistry();
for (const e of catalog) petRegistry.registerRig(e.rig);
for (const part of parts) petRegistry.registerAttachment(part.attachment);
const partControls = new Map<
  string,
  {
    check: HTMLInputElement;
    inputs: Record<string, HTMLInputElement>;
    instanceId: string;
  }
>();
for (const { name, attachment } of parts) {
  const label = document.createElement("label"),
    check = document.createElement("input");
  check.type = "checkbox";
  check.id = "wear-" + attachment.id;
  check.checked = false;
  label.append(check, document.createTextNode(" " + name));
  $("attachment-controls").append(label);
  const inputs: Record<string, HTMLInputElement> = {};
  for (const [key, rule] of Object.entries(attachment.parameters ?? {})) {
    const field = document.createElement("label"),
      input = document.createElement("input");
    input.type = "range";
    input.min = String(rule.min);
    input.max = String(rule.max);
    input.step = ".01";
    input.value = String(rule.default);
    input.id =
      attachment.id === "hat" && key === "hoverHeight"
        ? "hat-height"
        : attachment.id + "-" + key;
    input.setAttribute("aria-label", name + " " + key);
    input.style.width = "100px";
    field.append(
      document.createTextNode(
        name + " " + (key === "hoverHeight" ? "高度" : key) + " ",
      ),
      input,
    );
    $("attachment-controls").append(field);
    inputs[key] = input;
  }
  partControls.set(attachment.id, { check, inputs, instanceId: attachment.id });
}

const petStorageKey = "mofli.pet.v1";
const importedSkins = new Map<string, Skin>();
function selectedAttachments(): PetConfig["attachments"] {
  return parts
    .filter((p) => partControls.get(p.attachment.id)!.check.checked)
    .map(({ attachment }) => {
      const control = partControls.get(attachment.id)!;
      const parameters = Object.fromEntries(
        Object.entries(control.inputs).map(([k, v]) => [k, Number(v.value)]),
      );
      return {
        id: control.instanceId,
        type: attachment.id,
        version: 1,
        ...(Object.keys(parameters).length ? { parameters } : {}),
      };
    });
}
function mountedInstances() {
  return selectedAttachments().map((ref) => ({
    id: ref.id,
    parameters: ref.parameters,
    attachment: parts.find((p) => p.attachment.id === ref.type)!.attachment,
  }));
}
let entry = catalog[0]!;
let preset = bloubSkin;
const isBloub = () => entry.rig.id === bloubRig.id;
const isCat = () => entry.rig.id === mewRig.id;
const states = () => {
  if (isBloub()) return bloubStates;
  if (isCat()) return catStates;
  const rule = entry.rig.poseParameters?.state;
  return Array.from(
    {
      length: rule
        ? Math.min(32, Math.floor(rule.max) - Math.ceil(rule.min) + 1)
        : 1,
    },
    (_, i) => ({
      index: rule ? Math.ceil(rule.min) + i : 0,
      id: "pose-" + i,
      name: "姿态 " + i,
      description: "骨架姿态预览",
      posterTime: 1,
      duration: 2,
    }),
  );
};
const stateCopy = (id: string) => {
  if (isBloub()) return copy[id]!;
  const state = states().find((s) => s.id === id)!;
  return [
    "name" in state ? state.name : state.id,
    "description" in state ? state.description : "骨架姿态预览",
  ];
};
const poseFor = (value: RigPose): RigPose =>
  Object.fromEntries(
    Object.entries(value).filter(([key]) =>
      Object.hasOwn(entry.rig.poseParameters ?? {}, key),
    ),
  );
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
      pose: poseFor({ ...pose, state: state.index }),
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
    const host = $(key + "-choices");
    host.replaceChildren();
    if (!isBloub() && !isCat()) continue;
    const items =
      key === "shape"
        ? [
            {
              index:
                preset.rigConfig?.shape ?? entry.rig.parameters.shape!.default,
              name: "皮肤默认",
            },
            ...shapeOptions.filter(
              (option) =>
                option.index < 8 &&
                option.index !==
                  (preset.rigConfig?.shape ??
                    entry.rig.parameters.shape!.default),
            ),
          ]
        : [
            { index: -1, name: "默认" },
            ...(isBloub() ? expressionOptions : catExpressions),
          ];
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
        pose: poseFor({
          state: 0,
          expression: key === "expression" ? item.index : -1,
        }),
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
  return selected < 0
    ? bloubDuration
    : states().find((s) => s.index === selected)!.duration;
}
function render() {
  renderer.render(composeAttachments(engine.sample(clock), mountedInstances()));
  const elapsed = Math.max(0, clock - start),
    position =
      selected < 0
        ? bloubPosition(elapsed)
        : { index: selected, local: elapsed };
  if (active !== position.index) {
    active = position.index;
    const s = states().find((s) => s.index === active)!;
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
  pose = poseFor({ ...pose, state: index });
  engine.setPose(pose, clock);
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
      ...(entry.rig.colors.body
        ? { body: $<HTMLInputElement>("ink").value }
        : {}),
      ...(isBloub()
        ? { paper: $<HTMLInputElement>("paper").value }
        : {
            ...(entry.rig.colors.face
              ? { face: $<HTMLInputElement>("face").value }
              : {}),
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
  a.download = `${isBloub() ? "bloub" : skin.id}-${states().find((s) => s.index === active)!.id}.svg`;
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
function syncAttachmentCompatibility() {
  for (const { attachment } of parts) {
    const control = partControls.get(attachment.id)!;
    control.check.disabled = !entry.rig.mounts?.[attachment.mount];
    if (control.check.disabled) control.check.checked = false;
    control.check.title = control.check.disabled
      ? "当前骨架不支持此挂载接口"
      : "";
  }
}
function loadSkin(id: string, changeRig = false) {
  preset = importedSkins.get(id) ?? entry.skins.find((s) => s.id === id)!;
  skin = structuredClone(preset);
  if (changeRig) {
    selected = isBloub() ? -1 : 0;
    rigConfig = {};
    selected = isBloub() ? -1 : (entry.rig.poseParameters?.state?.default ?? 0);
    pose = poseFor({ state: selected });
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
  syncAttachmentCompatibility();
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
    ? `当前骨架有 ${entry.skins.length} 款皮肤，可调整形态、表情和饰品。`
    : isCat()
      ? "皮肤包含外观与默认耳长、脸型；换肤保留动作和表情。"
      : "外部骨架：参数来自骨架声明，皮肤由当前项目提供。";
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
    if (
      (isBloub() || isCat()) &&
      (key === "shape" ||
        [
          "customFace",
          "eyeWidth",
          "eyeHeight",
          "eyeSpacing",
          "faceYaw",
          "facePitch",
          "faceRoll",
        ].includes(key))
    )
      continue;
    const label = document.createElement("label");
    const title =
      ({ earLength: "耳长", cheek: "脸部饱满度" } as Record<string, string>)[
        key
      ] ?? key;
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
    ...[
      ...entry.skins,
      ...Array.from(importedSkins.values()).filter(
        (s) =>
          s.rig === entry.rig.id && !entry.skins.some((p) => p.id === s.id),
      ),
    ].map((s) => new Option(s.name, s.id)),
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
    "已更新" + (key === "shape" ? "基础形状" : "Idle表情") + "，在Idle状态预览";
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

for (const { check, inputs } of partControls.values()) {
  check.addEventListener("change", () => {
    try {
      render();
    } catch (error) {
      check.checked = false;
      $("status").textContent = String(error);
      render();
    }
  });
  for (const input of Object.values(inputs))
    input.addEventListener("input", render);
}

function applyPet(value: unknown) {
  const resolved = petRegistry.resolve(value); // Complete validation before mutating the studio.
  const nextEntry = catalog.find((e) => e.rig.id === resolved.config.skin.rig)!;
  entry = nextEntry;
  skin = resolved.config.skin;
  preset = skin;
  engine = resolved.engine;
  importedSkins.set(skin.id, structuredClone(skin));
  rigConfig = engine.getRigConfig();
  pose = engine.getPose();
  selected = pose.state ?? 0;
  active = -2;
  clock = start = last = 0;
  $<HTMLSelectElement>("rig-select").value = entry.rig.id;
  populateSkins();
  const picker = $<HTMLSelectElement>("skin-select");
  if (!Array.from(picker.options).some((o) => o.value === skin.id))
    picker.add(new Option(skin.name, skin.id));
  picker.value = skin.id;
  const refs = resolved.config.attachments;
  for (const { attachment } of parts) {
    const control = partControls.get(attachment.id)!,
      ref = refs.find((r) => r.type === attachment.id);
    control.instanceId = ref?.id ?? attachment.id;
    control.check.checked = !!ref;
    for (const [key, input] of Object.entries(control.inputs))
      input.value = String(
        ref?.parameters?.[key] ?? attachment.parameters![key]!.default,
      );
  }
  syncAttachmentCompatibility();
  syncColors(skin);
  syncRigControls();
  rebuildStates();
  rebuildChoices();
  $("cycle").hidden = !isBloub();
  $("face-control").hidden = isBloub();
  $("accent-control").hidden = !entry.rig.colors.accent;
  $("reference-note").hidden = !isBloub();
  $("attribution").hidden = !isBloub();
  $("assembly").textContent = `${entry.name} / ${skin.name}`;
  $("mode-label").textContent = isBloub()
    ? selected < 0
      ? "ORIGINAL SEQUENCE"
      : "SINGLE STATE"
    : "CAT HEAD RIG";
  $("cycle").setAttribute("aria-pressed", String(selected < 0));
  $<HTMLInputElement>("seek").max = String(duration());
  render();
  $("status").textContent = "已还原宠物：皮肤、骨架参数、表情状态与饰品";
}
$("save-pet").onclick = () => {
  try {
    const config = petRegistry.export(engine, selectedAttachments()),
      json = JSON.stringify(config, null, 2);
    localStorage.setItem(petStorageKey, json);
    const url = URL.createObjectURL(
        new Blob([json], { type: "application/json" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = skin.id + ".pet.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $("status").textContent = "完整宠物已导出，并保存到本地";
  } catch (error) {
    $("status").textContent = String(error);
  }
};
$("import-pet").onclick = () => $<HTMLInputElement>("pet-file").click();
$("pet-file").onchange = async () => {
  const input = $<HTMLInputElement>("pet-file"),
    file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 500000) throw new Error("宠物配置文件过大");
    applyPet(JSON.parse(await file.text()));
  } catch (error) {
    $("status").textContent = `导入失败，当前宠物保持不变：${error}`;
  } finally {
    input.value = "";
  }
};
$("restore-pet").onclick = () => {
  try {
    const saved = localStorage.getItem(petStorageKey);
    if (!saved) throw new Error("尚无本地保存");
    applyPet(JSON.parse(saved));
  } catch (error) {
    $("status").textContent = String(error);
  }
};

if (project.defaultSkin) {
  const chosen = catalog.find((e) =>
    e.skins.some((s) => s.id === project.defaultSkin),
  );
  if (chosen) {
    entry = chosen;
    $<HTMLSelectElement>("rig-select").value = entry.rig.id;
    populateSkins();
    $<HTMLSelectElement>("skin-select").value = project.defaultSkin;
    loadSkin(project.defaultSkin, true);
  }
}

for (const id of project.defaultAttachments ?? []) {
  const control = partControls.get(id);
  if (control && !control.check.disabled) control.check.checked = true;
}
try {
  render();
} catch (error) {
  for (const control of partControls.values()) control.check.checked = false;
  render();
  $("status").textContent = String(error);
}
$("save-project").hidden = !projectMode;
$("save-project").onclick = async () => {
  const button = $<HTMLButtonElement>("save-project");
  button.disabled = true;
  try {
    const config = petRegistry.export(engine, selectedAttachments());
    const response = await fetch("/__mofli/save-pet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    $("status").textContent =
      "已保存到项目 pet.json；运行 npm run export:pet 即可导出运行包";
  } catch (error) {
    $("status").textContent = "保存失败：" + error;
  } finally {
    button.disabled = false;
  }
};

// Keep manual adjustments during source reloads, without freezing the author's new defaults.
if (projectMode) {
  const draftKey = "mofli.draft:" + projectKey;
  window.addEventListener("beforeunload", () => {
    const base = Object.fromEntries(
      Object.entries(entry.rig.parameters).map(([k, r]) => [
        k,
        preset.rigConfig?.[k] ?? r.default,
      ]),
    );
    const rigOverrides = Object.fromEntries(
      Object.entries(engine.getRigConfig()).filter(([k, v]) => v !== base[k]),
    );
    const colors = Object.fromEntries(
      Object.entries(engine.getSkin().colors).filter(
        ([k, v]) => v !== preset.colors[k],
      ),
    );
    sessionStorage.setItem(
      draftKey,
      JSON.stringify({
        skinId: preset.id,
        rigOverrides,
        colors,
        pose: engine.getPose(),
        attachments: selectedAttachments(),
      }),
    );
  });
  try {
    const raw = sessionStorage.getItem(draftKey);
    if (raw) {
      const draft = JSON.parse(raw),
        base = catalog
          .flatMap((e) => e.skins)
          .find((s) => s.id === draft.skinId);
      if (base)
        applyPet({
          version: 1,
          skin: { ...base, colors: { ...base.colors, ...draft.colors } },
          rigConfig: { ...base.rigConfig, ...draft.rigOverrides },
          pose: draft.pose,
          attachments: draft.attachments,
        });
      if (base) preset = base;
    }
  } catch {
    sessionStorage.removeItem(draftKey);
    $("status").textContent =
      "源码已更新；旧调试参数不兼容，已使用项目默认配置";
  }
}
