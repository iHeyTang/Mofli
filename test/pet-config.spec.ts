import {test,expect} from '@playwright/test';
test('studio exports, imports and restores a complete custom pet',async({page})=>{
 await page.goto('http://127.0.0.1:4173/');
 await page.selectOption('#skin-select','mofli-stone');
 await page.check('#wear-hat');await page.check('#wear-bow');
 await page.locator('#hat-height').fill('0.52');
 const download=page.waitForEvent('download');await page.click('#save-pet');await download;
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('mofli.pet.v1')!));
 saved.skin.id='custom-stone';saved.skin.name='我的绒石';saved.attachments[0].id='custom-hat';
 await page.selectOption('#rig-select','cat-head');
 await page.locator('#pet-file').setInputFiles({name:'pet.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
 await expect(page.locator('#skin-select')).toHaveValue('custom-stone');
 await expect(page.locator('#hat-height')).toHaveValue('0.52');
 await expect(page.locator('#wear-bow')).toBeChecked();
 await page.selectOption('#skin-select','bloub-reference');
 await page.selectOption('#skin-select','custom-stone');
 await page.click('#save-pet');
 const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('mofli.pet.v1')!));
 expect(restored.attachments).toEqual(saved.attachments);
 expect(restored.skin.design).toEqual(saved.skin.design);
 await page.locator('#pet-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":99}')});
 await expect(page.locator('#status')).toContainText('导入失败');
 await expect(page.locator('#skin-select')).toHaveValue('custom-stone');
 await page.selectOption('#rig-select','cat-head');await page.click('#restore-pet');
 await expect(page.locator('#skin-select')).toHaveValue('custom-stone');
});

test('public browser SDK loads the saved composition and handles keyboard input',async({page})=>{
 await page.goto('http://127.0.0.1:4173/');
 await page.check('#wear-hat');await page.click('#save-pet');
 const result=await page.evaluate(async(root)=>{
  const {PetRegistry}=await import(root+'core/dist/index.js');
  const {createPet}=await import(root+'core/dist/browser.js');
  const {bloubRig}=await import(root+'rig-bloub/dist/index.js');
  const {hat}=await import(root+'attachment-hat/dist/index.js');
  const registry=new PetRegistry().registerRig(bloubRig).registerAttachment(hat);
  const container=document.createElement('div');document.body.append(container);
  const pet=createPet({container,registry,config:JSON.parse(localStorage.getItem('mofli.pet.v1')!),reducedMotion:true});
  const svg=container.querySelector('svg')!;
  svg.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  const hasHat=!!svg.querySelector('path[fill="#70866a"]');
  const config=pet.exportConfig();pet.destroy();
  return {hasHat,attachments:config.attachments,removed:!container.querySelector('svg')};
 }, '/@fs'+process.cwd()+'/packages/');
 expect(result.hasHat).toBe(true);expect(result.attachments[0].type).toBe('hat');expect(result.removed).toBe(true);
});
