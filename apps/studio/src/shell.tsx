import {useRef} from 'react';
import {Link,Outlet} from '@tanstack/react-router';
import {useMutation} from '@tanstack/react-query';
import {Button} from '@heroui/react';
import {Upload,Save} from 'lucide-react';
import {projectMode} from './catalog.js';
import {useModel,Action} from './components.js';
export function Shell() {
  const m = useModel();
  const file = useRef<HTMLInputElement>(null);
  const save = useMutation({
    mutationFn: async () => {
      const config = m.export();
      if (projectMode) {
        const r = await fetch("/__mofli/save-pet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
        const result = await r.json();
        if (!r.ok) throw new Error(result.error);
      }
      localStorage.setItem("mofli.pet.v1", JSON.stringify(config));
      return config;
    },
    onSuccess: () => {
      m.dirty = false;
      m.changed(projectMode ? "已保存到项目 pet.json" : "已保存到此浏览器");
      m.dirty = false;
    },
    onError: (e) => m.changed("保存失败：" + e.message),
  });
  const importing = useMutation({
    mutationFn: async (f: File) => {
      if (f.size > 500000) throw new Error("文件不能超过 500 KB");
      m.import(JSON.parse(await f.text()));
    },
    onError: (e) => m.changed("导入失败，当前宠物保持不变：" + e.message),
  });
  return (
    <div className="studio-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          <svg className="brand-symbol" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M3 19C3 8 8 5 16 5s13 3 13 14c0 6-5 8-13 8S3 25 3 19Z"/><ellipse cx="11" cy="15" rx="2" ry="2.6" fill="white"/><ellipse cx="21" cy="15" rx="2" ry="2.6" fill="white"/></svg>mofli
          <span className="brand-sub">STUDIO</span>
        </Link>
        <nav aria-label="应用导航">
          <Link to="/" activeOptions={{ exact: true }}>
            创作
          </Link>
          <Link to="/project">项目与导出</Link>
        </nav>
        <span className="project-mode">
          <span className="live-dot" />
          {projectMode ? "本地创作项目" : "个人工作台"}
        </span>
        <div className="header-actions">
          <Action
            title="导入宠物"
            id="import-pet"
            onPress={() => file.current?.click()}
          >
            <Upload size={15} />
            <span>导入</span>
          </Action>
          <Button
            id={projectMode ? "save-project" : "save-local"}
            variant="primary"
            size="sm"
            isPending={save.isPending}
            onPress={() => save.mutate()}
          >
            <Save size={15} />
            {save.isPending
              ? "保存中"
              : projectMode
                ? "保存到项目"
                : "保存宠物"}
          </Button>
        </div>
        <input
          hidden
          type="file"
          id="pet-file"
          accept="application/json,.json"
          ref={file}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importing.mutate(f);
            e.target.value = "";
          }}
        />
      </header>
      <Outlet />
      <footer className="app-footer">
        <span id="status" role="status">
          <span className="live-dot" />
          {m.status}
        </span>
        <span>
          {m.dirty ? "有未保存的调整" : "已保存"}
          <i />
          MOFLI ENGINE · V0.1
        </span>
      </footer>
    </div>
  );
}
