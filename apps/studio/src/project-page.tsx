import {useMutation} from '@tanstack/react-query';
import {ArrowDownToLine,FileJson,Code2} from 'lucide-react';
import {projectMode,projectKey} from './catalog.js';
import {useModel,Action} from './components.js';
import {download} from './files.js';
import {createSvgRenderer} from '@mofli/core/browser';
export function ProjectPage() {
  const m = useModel();
  const restore = useMutation({
    mutationFn: async () => {
      const value = localStorage.getItem("mofli.pet.v1");
      if (!value) throw new Error("尚无本地保存");
      m.import(JSON.parse(value));
    },
    onError: (e) => m.changed(e.message),
  });
  return (
    <main className="project-page">
      <h1>从工作台，到你的应用。</h1>
      <p className="project-intro">
        保存一份可继续编辑的宠物，或者把它带进自己的项目。
      </p>
      <div className="delivery-grid">
        <section>
          <FileJson size={24} />
          <h2>宠物配置</h2>
          <p>包含皮肤、骨架参数、当前姿态和所有饰品。随时导入，继续创作。</p>
          <Action
            primary
            id="save-pet"
            onPress={() => {
              download(
                JSON.stringify(m.export(), null, 2),
                m.skin.id + ".pet.json",
              );
              localStorage.setItem("mofli.pet.v1", JSON.stringify(m.export()));
              m.changed("宠物配置已导出");
            }}
          >
            <ArrowDownToLine size={16} />
            导出宠物 JSON
          </Action>
          <Action id="restore-pet" onPress={() => restore.mutate()}>
            恢复本地保存
          </Action>
        </section>
        <section>
          <Code2 size={24} />
          <h2>应用运行包</h2>
          <p>
            {projectMode
              ? "先保存到项目，再在项目目录执行："
              : "在创作者项目里，用 CLI 把配置打包为独立的浏览器模块："}
          </p>
          <code>
            {projectMode
              ? "npm run export:pet"
              : "mofli export ./my-pet.pet.json"}
          </code>
          <p>运行包保留鼠标与键盘交互，无需安装 Studio。</p>
          <code>mountPet(container)</code>
        </section>
      </div>
      <div className="project-detail">
        <h3>当前项目</h3>
        <dl>
          <div>
            <dt>工作模式</dt>
            <dd>{projectMode ? "本地源码开发" : "独立工作台"}</dd>
          </div>
          <div>
            <dt>位置</dt>
            <dd>{projectMode ? projectKey : "当前浏览器"}</dd>
          </div>
          <div>
            <dt>骨架</dt>
            <dd>{m.entry.rig.id}</dd>
          </div>
          <div>
            <dt>饰品</dt>
            <dd>{m.attachments.length} 件</dd>
          </div>
        </dl>
        <div className="secondary-exports">
          <Action
            id="save-skin"
            onPress={() =>
              download(
                JSON.stringify(m.engine.exportSkin(), null, 2),
                m.skin.id + ".skin.json",
              )
            }
          >
            导出皮肤 JSON
          </Action>
          <Action
            id="export"
            onPress={() => {
              const host = document.createElement("div");
              const renderer = createSvgRenderer(host);
              try {
                renderer.render(m.frame());
                renderer.svg.setAttribute(
                  "xmlns",
                  "http://www.w3.org/2000/svg",
                );
                download(
                  new XMLSerializer().serializeToString(renderer.svg),
                  m.skin.id + ".svg",
                  "image/svg+xml",
                );
              } finally {
                renderer.destroy();
              }
            }}
          >
            导出当前 SVG
          </Action>
        </div>
      </div>
      <p className="credits">
        Bloub reference calculations by Jérémy Perret · MIT attribution
        retained.
      </p>
    </main>
  );
}
