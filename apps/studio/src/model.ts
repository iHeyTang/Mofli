import {
  PetEngine,
  composeAttachments,
  type PetConfig,
  type RigConfig,
  type RigPose,
  type Skin,
} from "@mofli/core";
import {
  catalog,
  registry,
  parts,
  initialSkin,
  project,
  projectMode,
  projectKey,
  statesFor,
  shapeOptions,
  expressionOptions,
  catExpressions,
} from "./catalog.js";
export class StudioModel {
  engine: PetEngine;
  time = 0;
  timelineStart = 0;
  sequence: "expression" | "state" | "shape" = "expression";
  cycling = false;
  activeItem = 0;
  playing = true;
  debug = false;
  zoom = 1;
  status = "准备就绪";
  dirty = false;
  attachments: PetConfig["attachments"] = [];
  listeners = new Set<() => void>();
  revision = 0;
  constructor() {
    const rig = catalog.find((e) => e.rig.id === initialSkin.rig)!.rig;
    this.engine = new PetEngine(rig, initialSkin, {
      pose: rig.poseParameters?.state
        ? {
            state: Math.max(
              rig.poseParameters.state.min,
              Math.min(0, rig.poseParameters.state.max),
            ),
          }
        : {},
    });
    this.attachments = (project.defaultAttachments ?? []).map((id) => ({
      id,
      type: id,
      version: 1,
    }));
    try {
      registry.resolve(this.export());
    } catch {
      this.attachments = [];
    }
    if (projectMode) {
      try {
        const raw = sessionStorage.getItem("mofli.draft:" + projectKey);
        if (raw) {
          const draft = JSON.parse(raw),
            base = catalog
              .flatMap((e) => e.skins)
              .find((s) => s.id === draft.skinId);
          if (base)
            this.import({
              version: 1,
              skin: { ...base, colors: { ...base.colors, ...draft.colors } },
              rigConfig: { ...base.rigConfig, ...draft.rigConfig },
              pose: draft.pose,
              attachments: draft.attachments,
            });
        }
      } catch {
        this.status = "源码已更新，使用项目默认配置";
      }
    }
  }
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  snapshot = () => this.revision;
  changed(message?: string) {
    this.revision++;
    this.dirty = true;
    if (message) this.status = message;
    this.saveDraft();
    for (const fn of this.listeners) fn();
  }
  get skin() {
    return this.engine.getSkin();
  }
  get entry() {
    return catalog.find((e) => e.rig.id === this.skin.rig)!;
  }
  get pose() {
    return this.engine.getPose();
  }
  get config() {
    return this.engine.getRigConfig();
  }
  get states() {
    return statesFor(this.entry.rig);
  }
  get items() {
    if (this.sequence === "state") return this.states;
    const options = this.sequence === "expression"
      ? [{ index: -1, name: "默认" }, ...(this.skin.rig === "cat-head" ? catExpressions : expressionOptions)]
      : [{ index: this.entry.skins.find(s => s.id === this.skin.id)?.rigConfig?.shape ?? this.entry.rig.parameters.shape?.default ?? 0, name: "皮肤默认" }, ...shapeOptions.filter(s => s.index < 8)];
    return options.map(s => ({ ...s, duration: 2.4 }));
  }
  get duration() {
    return this.cycling ? this.items.reduce((sum, item) => sum + item.duration, 0)
      : this.items[this.selectedItem]?.duration ?? 2.4;
  }
  get selectedItem() {
    if (this.cycling) return this.activeItem;
    const value = this.sequence === "state" ? this.pose.state : this.sequence === "shape" ? this.config.shape : this.pose.expression;
    return Math.max(0, this.items.findIndex(s => s.index === value));
  }
  get currentLabel() { return this.items[this.selectedItem]?.name ?? "默认"; }
  get progress() { return ((this.time - this.timelineStart) % this.duration + this.duration) % this.duration; }
  notifyPlayback() {
    this.revision++;
    for (const fn of this.listeners) fn();
  }
  selectSequence(sequence: StudioModel["sequence"]) {
    this.sequence = sequence;
    this.timelineStart = this.time;
    this.selectItem(0);
  }
  applyItem(position: number, at = this.time) {
    const item = this.items[position];
    if (!item) return;
    this.activeItem = position;
    const idle: RigPose = this.entry.rig.poseParameters?.state ? { state: 0 } : {};
    const natural: RigPose = this.entry.rig.poseParameters?.expression ? { expression: -1 } : {};
    if (this.sequence === "shape") {
      this.engine.setPose({ ...this.pose, ...idle, ...natural }, at);
      this.engine.setRigConfig({ ...this.config, shape: item.index }, at);
    } else {
      this.engine.setPose({ ...this.pose, ...(this.sequence === "state" ? { state: item.index, ...natural } : { ...idle, expression: item.index }) }, at);
    }
  }
  selectItem(position: number) {
    this.applyItem(position);
    this.timelineStart = this.time - (this.cycling ? this.items.slice(0, position).reduce((sum, item) => sum + item.duration, 0) : 0);
    this.changed();
  }
  toggleCycle() {
    const position = this.selectedItem;
    this.cycling = !this.cycling;
    this.selectItem(position);
  }
  syncSequence() {
    if (!this.cycling) return;
    let remaining = this.progress;
    const position = this.items.findIndex(item => {
      if (remaining < item.duration - 1e-8) return true;
      remaining -= item.duration;
      return false;
    });
    if (position >= 0 && position !== this.activeItem) {
      this.applyItem(position);
      this.notifyPlayback();
    }
  }
  export() {
    return registry.export(this.engine, this.attachments);
  }
  import(value: unknown) {
    const next = registry.resolve(value);
    this.engine = next.engine;
    this.cycling = false;
    const entry = catalog.find((e) => e.rig.id === next.config.skin.rig)!;
    if (!entry.skins.some((s) => s.id === next.config.skin.id))
      entry.skins.push(next.config.skin);
    this.attachments = next.config.attachments;
    this.time = 0;
    this.timelineStart = 0;
    this.changed("已还原完整宠物");
  }
  choose(skin: Skin) {
    const same = skin.rig === this.skin.rig;
    if (same) this.engine.setSkin(skin, this.time, { restart: false });
    else {
      const rig = catalog.find((e) => e.rig.id === skin.rig)!.rig;
      this.engine = new PetEngine(rig, skin, {
        pose: rig.poseParameters?.state
          ? {
              state: Math.max(
                rig.poseParameters.state.min,
                Math.min(0, rig.poseParameters.state.max),
              ),
            }
          : {},
      });
      this.time = 0;
      this.attachments = this.attachments.filter(
        (a) =>
          rig.mounts?.[
            parts.find((p) => p.attachment.id === a.type)!.attachment.mount
          ],
      );
    }
    this.timelineStart = this.time;
    if (this.sequence === "expression" && !this.entry.rig.poseParameters?.expression) this.sequence = "state";
    if (this.sequence === "shape" && !this.entry.rig.parameters.shape) this.sequence = "state";
    if (this.cycling) this.applyItem(0);
    this.changed("已切换到 " + skin.name);
  }
  setConfig(config: RigConfig) {
    const faceControls = ["eyeWidth", "eyeHeight", "eyeSpacing", "faceYaw", "facePitch", "faceRoll"];
    if (Object.keys(config).some(key => faceControls.includes(key)) && this.entry.rig.parameters.customFace) {
      this.cycling = false;
      this.sequence = "expression";
      config = { ...config, customFace: 1 };
      this.engine.setPose({ ...this.pose, state: 0, expression: -1 }, this.time);
      this.timelineStart = this.time;
    }
    this.engine.setRigConfig({ ...this.config, ...config }, this.time);
    this.changed();
  }
  setPose(pose: RigPose) {
    this.engine.setPose({ ...this.pose, ...pose }, this.time);
    this.timelineStart = this.time;
    this.changed();
  }
  state(index: number) {
    this.setPose({ state: index });
  }
  color(key: string, value: string) {
    this.engine.setSkin(
      { ...this.skin, colors: { ...this.skin.colors, [key]: value } },
      this.time,
      { restart: false },
    );
    this.changed();
  }
  wear(type: string, on: boolean) {
    const mount = parts.find(p => p.attachment.id === type)?.attachment.mount;
    const next = this.attachments.filter(a => a.type !== type && (!on || parts.find(p => p.attachment.id === a.type)?.attachment.mount !== mount));
    if (on) next.push({ id: type, type, version: 1 });
    registry.export(this.engine, next);
    this.attachments = next;
    this.changed();
  }
  partParam(type: string, key: string, value: number) {
    const next = this.attachments.map((a) =>
      a.type === type
        ? { ...a, parameters: { ...a.parameters, [key]: value } }
        : a,
    );
    registry.export(this.engine, next);
    this.attachments = next;
    this.changed();
  }
  frame() {
    this.syncSequence();
    return composeAttachments(
      this.engine.sample(this.time),
      this.attachments.map((a) => ({
        id: a.id,
        parameters: a.parameters,
        attachment: parts.find((p) => p.attachment.id === a.type)!.attachment,
      })),
      this.time,
    );
  }
  seek(value: number) {
    this.time = Math.max(0, Math.min(value, this.duration - 0.0001));
    this.timelineStart = 0;
    this.engine = new PetEngine(this.entry.rig, this.skin, {
      rigConfig: this.config,
      pose: this.pose,
      transitionDuration: 0,
    });
    if (this.cycling) {
      let remaining = this.time;
      const position = this.items.findIndex(item => {
        if (remaining < item.duration - 1e-8) return true;
        remaining -= item.duration;
        return false;
      });
      this.applyItem(Math.max(0, position), Math.max(0, this.time - remaining));
    }
    this.timelineStart = 0;
    this.changed();
  }
  restart() {
    this.seek(0);
  }
  saveDraft() {
    if (!projectMode) return;
    const base =
      this.entry.skins.find((s) => s.id === this.skin.id) ?? this.skin;
    const defaults = Object.fromEntries(
      Object.entries(this.entry.rig.parameters).map(([k, r]) => [
        k,
        base.rigConfig?.[k] ?? r.default,
      ]),
    );
    sessionStorage.setItem(
      "mofli.draft:" + projectKey,
      JSON.stringify({
        skinId: base.id,
        colors: Object.fromEntries(
          Object.entries(this.skin.colors).filter(
            ([k, v]) => v !== base.colors[k],
          ),
        ),
        rigConfig: Object.fromEntries(
          Object.entries(this.config).filter(([k, v]) => v !== defaults[k]),
        ),
        pose: this.pose,
        attachments: this.attachments,
      }),
    );
  }
}
export const model = new StudioModel();
