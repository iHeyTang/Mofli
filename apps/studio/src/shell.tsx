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
        </Link>
        <nav aria-label="应用导航">
          <Link to="/" activeOptions={{ exact: true }}>
            创作
          </Link>
          <Link to="/project">项目与导出</Link>
        </nav>
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
          <a
            className="github-link"
            href="https://github.com/iHeyTang/Mofli"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub 仓库（在新标签页打开）"
            title="在 GitHub 查看 Mofli"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .297C5.37.297 0 5.67 0 12.297c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.043-1.61-4.043-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.838 1.237 1.838 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.418-1.305.762-1.605-2.665-.3-5.467-1.334-5.467-5.93 0-1.31.467-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 0 1 3-.405c1.02.005 2.045.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
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
      {m.status && <footer className="app-footer">
        <span id="status" role="status">{m.status}</span>
      </footer>}
    </div>
  );
}
