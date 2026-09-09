import {test,expect} from '@playwright/test';
test('silhouette hit testing handles whitespace, subregions and display scaling',async({page})=>{
 await page.goto('http://127.0.0.1:4173/');
 const result=await page.evaluate(async(root)=>{
  const {createSvgRenderer}=await import(root+'core/dist/browser.js');
  const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:400px;height:300px';document.body.append(host);
  const r=createSvgRenderer(host);r.svg.style.cssText='width:100%;height:100%';
  r.render({viewBox:{x:0,y:0,width:100,height:100},bounds:{x:0,y:0,width:100,height:100},anchors:[],shapes:[{id:'body',kind:'ellipse',attrs:{cx:50,cy:50,rx:25,ry:30,fill:'#222'}}],hitArea:{shape:'body',regions:[{id:'crown',x:0,y:0,width:1,height:.3},{id:'face',x:0,y:.3,width:1,height:.7}]}});
  const at=(x:number,y:number)=>{const p=new DOMPoint(x,y).matrixTransform(r.svg.getScreenCTM()!);return r.hitTest(p.x,p.y).region;};
  const hits=[at(5,5),at(26,21),at(50,23),at(50,50)];r.destroy();host.remove();return hits;
 },'/@fs'+process.cwd()+'/packages/');
 expect(result).toEqual(['outside','outside','crown','face']);
});
test('exportable browser runtime routes real clicks into regional reactions',async({page})=>{
 await page.goto('http://127.0.0.1:4173/');
 const result=await page.evaluate(async(root)=>{
  const {createPet}=await import(root+'core/dist/browser.js');
  const {bloubRig}=await import(root+'grove/dist/rigs/bloub/index.js');
  const {doughSkin}=await import(root+'grove/dist/skins/mofli-dough/index.js');
  const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:320px;height:320px';document.body.append(host);
  let latest:any;
  const rig={...bloubRig,sample:(input:any)=>{latest=input.state.click;return bloubRig.sample(input);}};
  const pet=createPet({container:host,rig,skin:doughSkin,pose:{state:0}});
  await new Promise(r=>setTimeout(r,100));
  // Use a real pointer below: expose the observed state only, not a test-only runtime API.
  (window as any).runtimePet=pet;(window as any).runtimeHost=host;(window as any).latestClick=()=>latest;
  return true;
 },'/@fs'+process.cwd()+'/packages/');
 expect(result).toBe(true);
 await page.mouse.click(5,5);
 await expect.poll(()=>page.evaluate(()=>(window as any).latestClick()?.region)).toBe('outside');
 await page.waitForTimeout(100);
 const body=await page.evaluate(()=>{const r=(window as any).runtimeHost.querySelector('svg > g > path').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
 await page.mouse.click(body.x,body.y);
 await expect.poll(()=>page.evaluate(()=>(window as any).latestClick()?.count)).toBe(1);
 await page.evaluate(()=>{(window as any).runtimePet.destroy();(window as any).runtimeHost.remove();});
});
