import {test,expect} from '@playwright/test';
test('studio wears and removes independent attachments on both rigs',async({page})=>{
 await page.goto('http://127.0.0.1:4173/reference.html');
 for(const rig of ['bloub-reference','cat-head']){
  await page.selectOption('#rig-select',rig);
  await page.check('#wear-hat');await page.check('#wear-bow');
  await expect(page.locator('#avatar path[fill="#98ad8e"]').first()).toBeAttached();
  await page.uncheck('#wear-hat');await page.uncheck('#wear-bow');
  await expect(page.locator('#avatar path[fill="#98ad8e"]')).toHaveCount(0);
 }
});
