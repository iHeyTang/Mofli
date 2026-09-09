import { test, expect } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createServer } from "node:http";

test("creator source reloads in Studio and exported runtime mounts without Studio", async ({
  page,
}) => {
  test.setTimeout(60000);
  const root = mkdtempSync(join(tmpdir(), "mofli-workflow-")),
    project = join(root, "creator-skin");
  const cli = resolve("apps/studio/bin/mofli.mjs");
  execFileSync(process.execPath, [cli, "init", project, "--no-install"]);
  const part = join(root, "creator-part");
  execFileSync(process.execPath, [
    cli,
    "init",
    part,
    "--type",
    "attachment",
    "--no-install",
  ]);
  writeFileSync(
    join(project, "src/part.ts"),
    readFileSync(join(part, "src/index.ts")),
  );
  writeFileSync(
    join(project, "mofli.project.ts"),
    `import {pet} from './src/index.js';import {attachment} from './src/part.js';export default {pets:[pet],attachments:[{name:'Custom gem',attachment}],defaultSkin:pet.skin.id,defaultAttachments:[attachment.id]};`,
  );

  // Package isolation is covered separately by test:packages; here exercise browser behavior.
  symlinkSync(resolve("node_modules"), join(project, "node_modules"), "dir");
  const server = spawn(
    process.execPath,
    [cli, "dev", "--project", project, "--port", "4187"],
    { stdio: "pipe" },
  );
  let logs = "";
  server.stdout.on("data", (x) => (logs += x));
  server.stderr.on("data", (x) => (logs += x));
  let runtimeServer: ReturnType<typeof createServer> | undefined;
  try {
    await expect
      .poll(() => logs, { timeout: 20000 })
      .toContain("127.0.0.1:4187");
    await page.goto("http://127.0.0.1:4187/");
    await expect(page.locator("#skin-select")).toHaveValue("creator-skin");
    await page.getByRole("button", { name: "饰品", exact: true }).click();
    await expect(page.locator("#wear-creator-part")).toBeChecked();
    await page.locator("#creator-part-size input").focus();
    await page.keyboard.press("End");
    const source = join(project, "src/index.ts");
    writeFileSync(
      source,
      readFileSync(source, "utf8").replace("#536852", "#bd7964"),
    );
    await expect(page.locator("#ink")).toHaveValue("#bd7964", {
      timeout: 10000,
    });
    await page.getByRole("button", { name: "饰品", exact: true }).click();
    await page.check("#wear-hat");
    await page.check("#wear-blush");
    await page.check("#wear-fireflies");
    await page.click("#save-project");
    await expect(page.locator("#status")).toContainText(
      "已保存到项目 pet.json",
    );
    expect(
      JSON.parse(readFileSync(join(project, "pet.json"), "utf8")).skin.id,
    ).toBe("creator-skin");
    const saved=JSON.parse(readFileSync(join(project,"pet.json"),"utf8"));
    expect(saved.attachments.find(a=>a.type==='creator-part').parameters.size).toBe(1.4);
    execFileSync(
      process.execPath,
      [cli, "export", "pet.json", "--project", project],
      { stdio: "pipe" },
    );
    const out = join(project, "pet-runtime");
    runtimeServer = createServer((req, res) => {
      try {
        const file = req.url === "/" ? "index.html" : "pet.mjs";
        res.setHeader(
          "Content-Type",
          file.endsWith("html") ? "text/html" : "text/javascript",
        );
        res.end(readFileSync(join(out, file)));
      } catch {
        res.statusCode = 404;
        res.end();
      }
    });
    await new Promise<void>((r) => runtimeServer!.listen(0, "127.0.0.1", r));
    const port = (runtimeServer.address() as { port: number }).port;
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/`);
    await expect(page.locator("svg")).toHaveCount(1);
    await expect(page.locator('path[fill="#98ad8e"]').first()).toBeAttached();
    const authoredPath=page.locator('path[fill="#c38a64"]');
    await expect(authoredPath).toBeAttached();
    expect(await authoredPath.evaluate(el=>(el as SVGGraphicsElement).getBBox().width)).toBeGreaterThan(1);
    await expect(page.locator('path[fill="#d69c96"]').first()).toBeAttached();
    const glow=page.locator('path[fill="#c5a46d"]').first();
    const before=await glow.getAttribute('d');
    await expect.poll(()=>glow.getAttribute('d')).not.toBe(before);
    await page.locator("svg").press("Enter");
    expect(errors).toEqual([]);
  } finally {
    const stopped = new Promise((r) => server.once("exit", r));
    server.kill("SIGTERM");
    await stopped;
    if (runtimeServer)
      await new Promise<void>((r) => runtimeServer!.close(() => r()));
    rmSync(root, { recursive: true, force: true });
  }
});

test('mixed npm pack appears in Studio and exports its own skin and accessory',async({page})=>{
 page.on('pageerror',e=>console.log('Mixed pack page error:',e.message));
 test.setTimeout(60000);
 const root=mkdtempSync(join(tmpdir(),'mofli-mixed-browser-')),project=join(root,'mixed-kit'),cli=resolve('apps/studio/bin/mofli.mjs');
 execFileSync(process.execPath,[cli,'init',project,'--type','pack','--no-install']);
 symlinkSync(resolve('node_modules'),join(project,'node_modules'),'dir');
 const server=spawn(process.execPath,[cli,'dev','--project',project,'--port','4191'],{stdio:'pipe'});let logs='';server.stdout.on('data',x=>logs+=x);server.stderr.on('data',x=>logs+=x);
 try{
  await expect.poll(()=>logs,{timeout:20000}).toContain('127.0.0.1:4191');
  await page.goto('http://127.0.0.1:4191/');await expect(page.locator('#skin-select')).toHaveValue('mixed-kit-blob');
  await page.getByRole('button',{name:'饰品',exact:true}).click();await page.check('#wear-mixed-kit-gem');await page.click('#save-project');
  await expect(page.locator('#status')).toContainText('已保存到项目 pet.json');
  execFileSync(process.execPath,[cli,'export','pet.json','--project',project],{stdio:'pipe'});
  const config=JSON.parse(readFileSync(join(project,'pet-runtime/pet.json'),'utf8'));expect(config.skin.id).toBe('mixed-kit-blob');expect(config.attachments.some(a=>a.type==='mixed-kit-gem')).toBeTruthy();
 }finally{server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));rmSync(root,{recursive:true,force:true});}
});
