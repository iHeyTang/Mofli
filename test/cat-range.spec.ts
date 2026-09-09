import {test,expect} from '@playwright/test';
test('expanded controls show short slim and long full head configurations',async({page})=>{
 await page.goto('http://127.0.0.1:4173');
 await page.selectOption('#rig-select','cat-head');
 const ear=page.getByRole('slider',{name:'耳长',exact:true}), cheek=page.getByRole('slider',{name:'脸部饱满度',exact:true});
 await expect(ear).toHaveAttribute('min','12'); await expect(ear).toHaveAttribute('max','85');
 await expect(cheek).toHaveAttribute('min','-6'); await expect(cheek).toHaveAttribute('max','8');
 await ear.fill('85'); await cheek.fill('8'); await page.locator('#seek').fill('1');
 await page.screenshot({path:'test-results/range-long-full.png',fullPage:true});
 await ear.fill('12'); await cheek.fill('-6'); await page.locator('#seek').fill('1');
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'test-results/range-short-slim.png',fullPage:true});
});
