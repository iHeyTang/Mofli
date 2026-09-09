import { test, expect } from "@playwright/test";

test("React Studio keeps the pet in view and edits a full composition", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("h1")).toContainText("Mallow");
  await expect(page.locator("#avatar")).toBeInViewport();
  await page.getByRole("button", { name: "Pebble", exact: true }).click();
  await expect(page.locator("h1")).toContainText("Pebble");
  await page.getByRole("button", { name: "饰品", exact: true }).click();
  await page.check("#wear-hat");
  await page.check("#wear-bow");
  await page.locator("#hat-height input").focus();
  await page.keyboard.press("Home");
  for(let i=0;i<27;i++)await page.keyboard.press("ArrowRight");
  await page.getByRole("tab", { name: /动作/ }).click();
  await page.locator('[data-state="notify"]').click();
  await page.getByRole("tab", { name: /表情/ }).click();
  await page.getByRole("button", { name: "Love", exact: true }).click();
  const avatar = page.locator("#avatar svg");
  await expect(avatar).toHaveCount(1);
  await avatar.press("Enter");
  await page.getByRole("link", { name: "项目与导出" }).click();
  await expect(page).toHaveURL(/\/project$/);
  const download = page.waitForEvent("download");
  await page.click("#save-pet");
  await download;
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mofli.pet.v1")!),
  );
  expect(saved.skin.id).toBe("mofli-stone");
  expect(saved.attachments).toHaveLength(2);
  expect(saved.attachments[0].parameters.hoverHeight).toBe(0.52);
  const svgDownload = page.waitForEvent("download");
  await page.click("#export");
  expect((await svgDownload).suggestedFilename()).toMatch(/\.svg$/);
  await page.getByRole("link", { name: "创作", exact: true }).click();
  await expect(page.locator("h1")).toContainText("Pebble");
  saved.skin.id = "my-custom-pet";
  saved.skin.name = "自定义宠物";
  await page
    .locator("#pet-file")
    .setInputFiles({
      name: "pet.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(saved)),
    });
  await expect(page.locator("h1")).toContainText("自定义宠物");
  await page
    .locator("#pet-file")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":99}'),
    });
  await expect(page.locator("#status")).toContainText("导入失败");
  await expect(page.locator("h1")).toContainText("自定义宠物");
  expect(errors).toEqual([]);
});

test("mobile Studio exposes panels without pushing the stage offscreen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("#avatar")).toBeInViewport();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "素材面板", exact: true }).click();
  await page.getByRole("button", { name: "Pip", exact: true }).click();
  await page.getByRole("button", { name: "素材面板", exact: true }).click();
  await expect(page.locator("h1")).toContainText("Pip");
  await page.getByRole("button", { name: "属性面板", exact: true }).click();
  await expect(page.locator("#ink")).toBeVisible();
  await page.getByRole("button", { name: "属性面板", exact: true }).click();
  await page.getByRole("link", { name: "项目与导出" }).click();
  await expect(page.locator("#save-pet")).toBeVisible();
});

test('CLI starts standalone Studio from an empty directory without an init step',async({page})=>{
 const {mkdtempSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join,resolve}=await import('node:path');const {spawn}=await import('node:child_process');
 const dir=mkdtempSync(join(tmpdir(),'mofli-standalone-'));const child=spawn(process.execPath,[resolve('apps/studio/bin/mofli.mjs'),'--port','4189'],{cwd:dir,stdio:'pipe'});let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
 try{await expect.poll(()=>logs,{timeout:20000}).toContain('127.0.0.1:4189');await page.goto('http://127.0.0.1:4189/');await expect(page.locator('#avatar svg')).toHaveCount(1);await expect(page.locator('#save-project')).toHaveCount(0);await page.getByRole('link',{name:'项目与导出'}).click();await page.reload();await expect(page.locator('#save-pet')).toBeVisible()}finally{const ended=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await ended;rmSync(dir,{recursive:true,force:true})}
});

test("each sequence links playback, thumbnails and seeking in both directions", async ({page}) => {
  const errors: string[]=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/');
  await page.click('#cycle');
  await expect(page.locator('#cycle')).toHaveText('单项循环');
  await expect(page.locator('#expression-choices button[aria-pressed="true"]')).toHaveText('Neutral',{timeout:5000});
  await expect(page.locator('.transport .chip')).toHaveText('Neutral');
  await page.click('#play');
  await page.getByRole('button',{name:'Love',exact:true}).click();
  await expect(page.locator('.transport .chip')).toHaveText('Love');
  await expect(page.locator('#seek input')).toHaveValue('43.2');
  await page.locator('#seek input').focus();
  await page.keyboard.press('Home');
  await expect(page.locator('#expression-choices button[aria-pressed="true"]')).toHaveText('默认');
  await page.getByRole('tab',{name:/动作/}).click();
  await page.locator('[data-state="notify"]').click();
  await expect(page.locator('.transport .chip')).toHaveText('Notify');
  await page.locator('#seek input').focus();await page.keyboard.press('Home');
  await expect(page.locator('[data-state="idle"]')).toHaveAttribute('aria-pressed','true');
  await page.getByRole('tab',{name:'基础形状'}).click();
  await page.getByRole('button',{name:'Triangle',exact:true}).click();
  await expect(page.locator('.transport .chip')).toHaveText('Triangle');
  await page.locator('#seek input').focus();await page.keyboard.press('Home');
  await expect(page.locator('#shape-choices button[aria-pressed="true"]')).toHaveText('皮肤默认');
  await page.click('#cycle');
  await expect(page.locator('#cycle')).toHaveText('全序列');
  expect(errors).toEqual([]);
});

test('accessory library groups seven mounts, replaces variants and exports a seven-part pet',async({page})=>{
 await page.goto('http://127.0.0.1:4173/');
 await page.getByRole('button',{name:'饰品',exact:true}).click();
 await expect(page.locator('.attachment-item')).toHaveCount(20);
 for(const id of ['sprout','bunny','flower','blush','scarf','pearls','fireflies'])await page.check('#wear-'+id);
 await page.check('#wear-halo');
 await expect(page.locator('#wear-sprout')).not.toBeChecked();
 await expect(page.locator('#wear-halo')).toBeChecked();
 await expect(page.locator('.attachment-item input:checked')).toHaveCount(7);
 await expect(page.locator('.attachment-group')).toHaveCount(7);
 await expect(page.getByRole('region',{name:'双颊表面',exact:true}).locator('.attachment-item')).toHaveCount(3);
 await page.check('#wear-freckles');
 await expect(page.locator('#wear-blush')).not.toBeChecked();
 await page.click('#save-local');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('mofli.pet.v1')!));
 expect(saved.attachments).toHaveLength(7);
 expect(saved.attachments.map((a:{type:string})=>a.type)).toContain('freckles');
 await page.locator('#pet-file').setInputFiles({name:'pet.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
 await expect(page.locator('#wear-freckles')).toBeChecked();
});

test('Grove starts Studio as a source resource project', async ({ page }) => {
  const { resolve } = await import('node:path');
  const { spawn } = await import('node:child_process');
  const root = resolve('packages/grove');
  const child = spawn(process.execPath, [resolve('apps/studio/bin/mofli.mjs'), '--port', '4193'], { cwd: root, stdio: 'pipe' });
  let logs = '';
  child.stdout.on('data', x => logs += x);
  child.stderr.on('data', x => logs += x);
  const exited = new Promise(resolve => child.once('exit', resolve));
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await expect.poll(() => logs).toContain('127.0.0.1:4193');
    expect(logs).toContain(root);
    await page.goto('http://127.0.0.1:4193/');
    await expect(page.locator('#avatar svg')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('Mallow');
    await page.getByRole('button', { name: '饰品', exact: true }).click();
    await expect(page.locator('.attachment-item')).toHaveCount(20);
    await page.getByRole('link', { name: '项目与导出' }).click();
    await expect(page.locator('#save-project')).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    child.kill('SIGTERM');
    await exited;
  }
});

test('preview background tracks the mouse without an SVG focus border', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/');
  const stage = page.locator('#stage'), svg = page.locator('#avatar svg');
  await expect(svg).toBeVisible();
  const area = (await stage.boundingBox())!, pet = (await svg.boundingBox())!;
  const left = area.x + 12, right = area.x + area.width - 12, y = area.y + area.height / 2;
  expect(left).toBeLessThan(pet.x);
  expect(right).toBeGreaterThan(pet.x + pet.width);
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(entry => entry.name).find(url => /\/src\/model\.ts(?:\?|$)/.test(url))!;
    const { model } = await import(url);
    const handle = model.engine.handle.bind(model.engine);
    (window as any).previewEvents = [];
    model.engine.handle = (event: any, time: number) => {
      (window as any).previewEvents.push(event);
      return handle(event, time);
    };
  });
  await page.mouse.move(left, y);
  await expect.poll(() => page.evaluate(() => (window as any).previewEvents.filter((e: any) => e.type === 'look').at(-1)?.value.x)).toBeLessThan(-0.9);
  await page.mouse.move(right, y);
  await expect.poll(() => page.evaluate(() => (window as any).previewEvents.filter((e: any) => e.type === 'look').at(-1)?.value.x)).toBeGreaterThan(0.9);
  await page.mouse.click(right, y);
  await expect.poll(() => page.evaluate(() => (window as any).previewEvents.some((e: any) => e.type === 'tap'))).toBe(true);
  await expect(svg).toBeFocused();
  await expect(svg).toHaveCSS('outline-style', 'none');
  await page.screenshot({path:'test-results/preview-pointer-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-results/preview-pointer-mobile.png'});
});

test('mount debugging follows real frames and clears when disabled', async ({page}) => {
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button',{name:'挂载调试',exact:true}).click();
  const mounts = page.locator('#avatar [data-mount]');
  await expect(mounts).toHaveCount(10);
  await expect(page.locator('[data-mount="head.sides/left"]')).toBeVisible();
  const crown = page.locator('[data-mount="head.crown"] circle');
  const area=(await page.locator('#stage').boundingBox())!;
  await page.mouse.move(area.x+10,area.y+area.height/2);
  await page.waitForTimeout(300);
  const first=await crown.getAttribute('cx');
  await page.mouse.move(area.x+area.width-10,area.y+30);
  await expect.poll(()=>crown.getAttribute('cx')).not.toBe(first);
  await expect(page.locator('[data-mount="head.cheeks/left"] title').first()).toHaveText(/not a boundary/);
  await page.screenshot({path:'test-results/mount-debug-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-results/mount-debug-mobile.png'});
  await page.getByRole('button',{name:'挂载调试',exact:true}).click();
  await expect(mounts).toHaveCount(0);
});
