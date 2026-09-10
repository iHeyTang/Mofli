import {useState,useEffect,useRef} from 'react';
import {Chip,Tabs,Select,Label,ListBox} from '@heroui/react';
import {RotateCcw,Play,Pause,Shapes,SlidersHorizontal,Sparkles,Box,Check,Plus,Minus,Smile,X} from 'lucide-react';
import {catalog,parts,expressionOptions,catExpressions,shapeOptions} from './catalog.js';
import {useModel,Action,Thumbnail,Range,PetStage,PlaybackSlider} from './components.js';
const mountNames: Record<string,string> = {"head.crown":"头顶中央","head.sides":"成对侧部","head.forehead":"额头","head.cheeks":"双颊表面","head.lower.front":"下缘中央","head.lower.sides":"下缘两侧","character.orbit":"角色环绕"};
function Library({ mode }: { mode?: "skins" | "parts" } = {}) {
  const m = useModel();
  const [selectedTab, setTab] = useState<"skins" | "parts">("skins");
  const tab = mode ?? selectedTab;
  return (
    <>
      <div className="panel-heading">
        <span>{mode === "skins" ? "选择角色" : mode === "parts" ? "搭配饰品" : "素材库"}</span>
        <Shapes size={15} />
      </div>
      {!mode && <div className="segmented">
        <button aria-pressed={tab === "skins"} onClick={() => setTab("skins")}>
          <Shapes size={14} />
          角色
        </button>
        <button aria-pressed={tab === "parts"} onClick={() => setTab("parts")}>
          <Sparkles size={14} />
          饰品
        </button>
      </div>}
      {tab === "skins" ? (
        <>
          <Select
            className="rig-select-field"
            value={m.skin.rig}
            onChange={(key) => {
              const entry = catalog.find(c => c.rig.id === key);
              if (entry) m.choose(entry.skins[0]);
            }}
          >
            <Label>骨架</Label>
            <Select.Trigger id="rig-select">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover className="studio-select-popover">
              <ListBox aria-label="骨架">
                {catalog.map(entry => (
                  <ListBox.Item id={entry.rig.id} key={entry.rig.id} textValue={entry.name}>
                    {entry.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <div className="section-caption">
            兼容皮肤
            <span>{m.entry.skins.length.toString().padStart(2, "0")}</span>
          </div>
          <select
            id="skin-select"
            className="sr-only"
            aria-label="兼容皮肤"
            value={m.skin.id}
            onChange={(e) =>
              m.choose(m.entry.skins.find((s) => s.id === e.target.value)!)
            }
          >
            {[
              ...m.entry.skins,
              ...(m.entry.skins.some((s) => s.id === m.skin.id)
                ? []
                : [m.skin]),
            ].map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="skin-list">
            {m.entry.skins.map((skin, i) => (
              <button
                className="skin-tile"
                key={skin.id}
                aria-pressed={m.skin.id === skin.id}
                onClick={() => m.choose(skin)}
              >
                <Thumbnail rig={m.entry.rig} skin={skin} pose={{ state: 0 }} />
                <span>
                  <strong>{skin.name}</strong>
                  <small>
                    {skin.design
                      ? "独立轮廓 · 专属五官"
                      : m.entry.name + " / 原型"}
                  </small>
                </span>
                {m.skin.id === skin.id ? (
                  <Check size={14} />
                ) : (
                  <span className="tile-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="section-caption">
            可挂载饰品<span>{parts.length.toString().padStart(2, "0")}</span>
          </div>
          <div className="attachment-list">
            {Array.from(new Set([...Object.keys(mountNames), ...parts.map(p=>p.attachment.mount)])).map(mount=>{
              const options=parts.filter(p=>p.attachment.mount===mount);
              if(!options.length)return null;
              const selected=options.find(p=>m.attachments.some(a=>a.type===p.attachment.id));
              const worn=m.attachments.find(a=>a.type===selected?.attachment.id);
              return <section className="attachment-group" aria-label={mountNames[mount]??mount} key={mount}>
                <div className="attachment-group-heading"><h3>{mountNames[mount]??mount}</h3>
                  {selected ? <Action title={`移除${mountNames[mount]??mount}饰品`} onPress={()=>m.wear(selected.attachment.id,false)}><X size={12}/></Action> : <span>{options.length} 款</span>}
                </div>
                <div className="attachment-options">
                  {options.map(({name,attachment:a})=>{
                    const checked=!!m.attachments.find(p=>p.type===a.id),enabled=!!m.entry.rig.mounts?.[a.mount];
                    return <label className="attachment-item" key={a.id} title={enabled?name:"当前骨架不支持"}>
                      <input className="accessory-toggle" id={"wear-"+a.id} type="checkbox" checked={checked} disabled={!enabled} onChange={e=>{try{m.wear(a.id,e.target.checked)}catch(err){m.changed(String(err))}}}/>
                      {enabled ? <Thumbnail rig={m.entry.rig} skin={m.skin} pose={{state:0}} attachment={a} accessoryOnly/> : <Sparkles size={23}/>}
                      <strong>{name}</strong>{checked&&<Check className="attachment-check" size={12}/>}
                    </label>;
                  })}
                </div>
                {selected&&worn&&Object.entries(selected.attachment.parameters??{}).map(([key,r])=><Range key={key}
                  id={selected.attachment.id==="hat"?"hat-height":selected.attachment.id+"-"+key}
                  label={key==="hoverHeight"?"悬浮高度":key==="size"?"尺寸":key}
                  min={r.min} max={r.max} value={worn.parameters?.[key]??r.default}
                  onChange={v=>m.partParam(selected.attachment.id,key,v)}/>)}
              </section>;
            })}
          </div>
          <div className="library-note">
            <Sparkles size={18} />
            <p>
              不同位置可组合佩戴。
              <br />
              <span>同一位置选择新款会替换旧款。</span>
            </p>
          </div>
        </>
      )}
    </>
  );
}
function Inspector({ mobile = false }: { mobile?: boolean } = {}) {
  const m = useModel();
  const labels: Record<string, string> = {
    earLength: "耳长",
    cheek: "脸部饱满度",
    eyeWidth: "眼宽",
    eyeHeight: "眼高",
    eyeSpacing: "眼间距",
  };
  return (
    <>
      <div className="panel-heading">
        <span>角色属性</span>
        <SlidersHorizontal size={15} />
      </div>
      <div className="inspector-identity">
        <Thumbnail rig={m.entry.rig} skin={m.skin} pose={{ state: 0 }} />
        <div>
          <strong>{m.skin.name}</strong>
          <small>{m.entry.name} 骨架</small>
        </div>
      </div>
      <section className="inspector-section">
        <h3>外观色彩</h3>
        <div className="color-list">
          {Object.entries(m.skin.colors).map(([key, value]) => (
            <label key={key}>
              <span>
                {(
                  {
                    body: "身体",
                    paper: "画布",
                    face: "五官",
                    accent: "点缀",
                  } as Record<string, string>
                )[key] ?? key}
              </span>
              <span className="color-value">
                {value.toUpperCase()}
                <input
                  id={key === "body" ? "ink" : key}
                  type="color"
                  value={value}
                  onChange={(e) => m.color(key, e.target.value)}
                />
              </span>
            </label>
          ))}
        </div>
        <Action
          onPress={() =>
            m.choose(m.entry.skins.find((s) => s.id === m.skin.id) ?? m.skin)
          }
        >
          <RotateCcw size={13} />
          恢复皮肤默认
        </Action>
      </section>
      {mobile && m.entry.rig.parameters.shape && <section className="inspector-section">
        <h3>基础形状</h3>
        <div className="motion-strip">
          {[{index: m.entry.skins.find(s => s.id === m.skin.id)?.rigConfig?.shape ?? m.entry.rig.parameters.shape.default, name: "皮肤默认"}, ...shapeOptions.filter(s => s.index < 8)].map((shape, index) =>
            <button key={index} className="motion-tile" data-shape={shape.index}
              aria-pressed={m.config.shape === shape.index}
              onClick={() => {m.selectSequence("shape"); m.selectItem(index);}}>
              <Thumbnail rig={m.entry.rig} skin={m.skin} config={{...m.config, shape:shape.index}} pose={{state:0,expression:-1}} />
              <span>{shape.name}</span>
            </button>)}
        </div>
      </section>}
      <section className="inspector-section" id="rig-parameters">
        <h3>
          形态参数
        </h3>
        {Object.entries(m.entry.rig.parameters)
          .filter(([k]) => !["shape", "customFace", "faceYaw", "facePitch", "faceRoll"].includes(k))
          .map(([k, r]) => (
            <Range
              key={k}
              label={labels[k] ?? k}
              value={m.config[k]}
              min={r.min}
              max={r.max}
              onChange={(v) => m.setConfig({ [k]: v })}
            />
          ))}
      </section>
      <section className="inspector-section">
        <h3>当前装配</h3>
        <div className="assembly-row">
          <span className="assembly-dot" /> {m.skin.name}
        </div>
        {m.attachments.length ? (
          m.attachments.map((a) => (
            <div key={a.id} className="assembly-row">
              <span className="assembly-dot" />
              {parts.find((p) => p.attachment.id === a.type)!.name}
              <Action title="移除饰品" onPress={() => m.wear(a.type, false)}>
                <X size={12} />
              </Action>
            </div>
          ))
        ) : (
          <p className="muted">尚未佩戴饰品</p>
        )}
      </section>
    </>
  );
}
function MotionDock({ compact = false }: { compact?: boolean } = {}) {
  const m = useModel();
  const tab = m.sequence;
  const dock = useRef<HTMLElement>(null);
  useEffect(() => {
    if (m.cycling) dock.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({block:"nearest",inline:"nearest"});
  }, [tab, m.selectedItem, m.cycling]);
  const expressions = m.skin.rig === "cat-head" ? catExpressions : expressionOptions;
  const choices = (
<div
        className="motion-strip"
        id={tab === "state" ? "states" : tab + "-choices"}
      >
        {tab === "state"
          ? m.states.map((s, i) => (
              <button
                key={s.id}
                data-state={s.id}
                className="motion-tile"
                aria-pressed={m.selectedItem === i}
                onClick={() => m.selectItem(i)}
              >
                <Thumbnail
                  rig={m.entry.rig}
                  skin={m.skin}
                  config={m.config}
                  pose={{ ...m.pose, state: s.index }}
                  time={s.posterTime}
                />
                <span>{s.name}</span>
              </button>
            ))
          : m.items.map((s, i) => (
              <button
                key={i}
                data-shape={tab === "shape" ? s.index : undefined}
                data-expression={tab === "expression" ? s.index : undefined}
                aria-label={s.name}
                className="motion-tile"
                aria-pressed={m.selectedItem === i}
                onClick={() => m.selectItem(i)}
              >
                <Thumbnail
                  rig={m.entry.rig}
                  skin={m.skin}
                  config={{
                    ...m.config,
                    ...(tab === "shape" ? { shape: s.index } : {}),
                  }}
                  pose={{
                    state: 0,
                    expression: tab === "expression" ? s.index : -1,
                  }}
                />
                <span>{s.name}</span>
              </button>
            ))}
      </div>
  );
  if (compact) return <section className="motion-dock" ref={dock}>{choices}</section>;
  return (
    <section className="motion-dock" ref={dock}>
      <Tabs selectedKey={tab} onSelectionChange={key=>m.selectSequence(key as typeof m.sequence)}>
      <div className="dock-heading">
        <Tabs.ListContainer><Tabs.List aria-label="动作素材">
          {m.entry.rig.poseParameters?.expression&&<Tabs.Tab id="expression">表情 <Chip size="sm">{expressions.length+1}</Chip><Tabs.Indicator/></Tabs.Tab>}
          <Tabs.Tab id="state">动作 <Chip size="sm">{m.states.length}</Chip><Tabs.Indicator/></Tabs.Tab>
          {m.entry.rig.parameters.shape&&<Tabs.Tab id="shape">基础形状<Tabs.Indicator/></Tabs.Tab>}
        </Tabs.List></Tabs.ListContainer>
      </div>
      <Tabs.Panel id={tab}>
      {choices}
      </Tabs.Panel></Tabs>
    </section>
  );
}
export function Workshop() {
  const m = useModel();
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 800px)").matches);
  const [mobileTab, setMobileTab] = useState("skins");
  const editor = useRef<HTMLDivElement>(null);
  const mobileTabs = [
    {id:"skins", label:"角色", icon:Shapes},
    {id:"parts", label:"饰品", icon:Sparkles},
    {id:"properties", label:"属性", icon:SlidersHorizontal},
    {id:"expression", label:"表情", icon:Smile},
    {id:"state", label:"动作", icon:Play},
  ];
  const chooseTab = (id: string) => {
    setMobileTab(id);
    if (id === "state" || (id === "expression" && m.entry.rig.poseParameters?.expression)) {
      if (m.sequence !== id) m.selectSequence(id);
    }
    editor.current?.scrollTo({top:0});
  };
  useEffect(() => {
    const query = window.matchMedia("(max-width: 800px)");
    const update = () => setIsMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (isMobile && (mobileTab === "state" || (mobileTab === "expression" && m.entry.rig.poseParameters?.expression)) && m.sequence !== mobileTab)
      m.selectSequence(mobileTab);
  }, [isMobile, mobileTab, m, m.sequence, m.skin.rig]);
  return (
    <main className="workshop">
      {!isMobile && <aside className="library-panel" aria-label="素材库"><Library /></aside>}
      <section className="workspace" aria-label={`${m.skin.name} 宠物预览`}>
        <div className="preview-frame">
          <PetStage />
          <div className="canvas-tools">
            <Action
              title="缩小"
              onPress={() => {
                m.zoom = Math.max(0.5, m.zoom - 0.1);
                m.changed();
              }}
            >
              <Minus size={14} />
            </Action>
            <span>{Math.round(m.zoom * 100)}%</span>
            <Action
              title="放大"
              onPress={() => {
                m.zoom = Math.min(1.5, m.zoom + 0.1);
                m.changed();
              }}
            >
              <Plus size={14} />
            </Action>
            <i />
            <Action
              title="挂载调试"
              onPress={() => {
                m.debug = !m.debug;
                m.changed();
              }}
            >
              <Box size={15} />
              {m.debug ? "关闭调试" : "挂载调试"}
            </Action>
          </div>
        </div>
        <div className="transport">
          <Action
            id="play"
            title={m.playing ? "暂停" : "播放"}
            onPress={() => {
              m.playing = !m.playing;
              m.changed();
            }}
          >
            {m.playing ? <Pause size={16} /> : <Play size={16} />}
          </Action>
          <Action id="restart" title="重播" onPress={() => m.restart()}>
            <RotateCcw size={15} />
          </Action>
          <Chip size="sm" variant="soft">
            {m.currentLabel}
          </Chip>
          <PlaybackSlider />
          <span id="timecode" />
          {m.items.length > 1 && (
            <Action id="cycle" onPress={() => m.toggleCycle()}>
              {m.cycling ? "单项循环" : "全序列"}
            </Action>
          )}
        </div>
        {!isMobile && <MotionDock />}
      </section>
      {!isMobile && <aside className="inspector-panel" aria-label="角色属性"><Inspector /></aside>}
      {isMobile && <>
        <div className="mobile-editor" ref={editor} role="tabpanel" id="mobile-editor"
          aria-labelledby={`mobile-tab-${mobileTab}`} tabIndex={0}>
          {(mobileTab === "skins" || mobileTab === "parts") && <Library mode={mobileTab} />}
          {mobileTab === "properties" && <Inspector mobile />}
          {mobileTab === "expression" && (m.entry.rig.poseParameters?.expression
            ? <><div className="panel-heading">选择表情</div><MotionDock compact /></>
            : <p className="mobile-empty">当前角色不支持独立表情，可到「动作」选择姿态。</p>)}
          {mobileTab === "state" && <><div className="panel-heading">选择动作</div><MotionDock compact /></>}
        </div>
        <div className="mobile-tabs" role="tablist" aria-label="宠物编辑">
          {mobileTabs.map(({id,label,icon:Icon},index) => <button key={id} type="button" role="tab"
            id={`mobile-tab-${id}`} aria-controls="mobile-editor" aria-selected={mobileTab === id}
            tabIndex={mobileTab === id ? 0 : -1} onClick={() => chooseTab(id)}
            onKeyDown={event => {
              const next = event.key === "ArrowRight" ? (index+1)%5 : event.key === "ArrowLeft" ? (index+4)%5 : event.key === "Home" ? 0 : event.key === "End" ? 4 : -1;
              if (next >= 0) {event.preventDefault();chooseTab(mobileTabs[next].id);document.getElementById(`mobile-tab-${mobileTabs[next].id}`)?.focus();}
            }}><Icon size={18} aria-hidden="true" /><span>{label}</span></button>)}
        </div>
      </>}

    </main>
  );
}
