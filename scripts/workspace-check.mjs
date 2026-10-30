import {setAppearance} from './browser-controls.mjs';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
const appUrl=process.env.APP_URL??'http://127.0.0.1:4173/audio-toolkit-v1/';
const root=process.env.WORKSPACE_EVIDENCE_DIR??'.artifacts/workspace-check';
await mkdir(`${root}/captures`,{recursive:true});
const records=[];
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();
 try{
  const page=await browser.newPage();
  const errors=[];const requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>requests.push(request.url()));
  await page.goto(appUrl);
  await page.getByRole('heading',{name:'Audio Toolkit'}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Back to Media Toolkit'}).getAttribute('href'),'https://ashcx.github.io/media-toolkit/');
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   await page.setViewportSize(viewport);
   for(const theme of ['light','dark']){
    await setAppearance(page,theme);
    await page.waitForFunction(expected=>document.documentElement.dataset.theme===expected,theme);
    assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
    await page.screenshot({path:`${root}/captures/${name}-${viewport.width}-${theme}.png`,fullPage:true,animations:'disabled'});
   }
  }
  await setAppearance(page,'system');
  await page.emulateMedia({colorScheme:'light'});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  await page.emulateMedia({colorScheme:'dark'});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  await page.reload();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  await page.getByLabel('Choose audio or video files').setInputFiles([{name:'very-long-recording-name-'.repeat(8)+'.wav',mimeType:'audio/wav',buffer:Buffer.alloc(128)},{name:'duplicate.wav',mimeType:'audio/wav',buffer:Buffer.alloc(64)}]);
  assert.equal(await page.getByRole('list',{name:'Selected files'}).locator('li').count(),2);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Long names do not overflow');
  await page.getByRole('button',{name:'Remove duplicate.wav'}).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.getByRole('list',{name:'Selected files'}).locator('li').count(),1);
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')?.startsWith('Remove very-long-recording'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Choose audio or video files');
  await page.getByRole('combobox',{name:'Format',exact:true}).selectOption('flac');
  assert.equal(await page.getByRole('combobox',{name:'Format',exact:true}).inputValue(),'flac');
  assert.deepEqual(errors,[]);
  assert(requests.every(url=>new URL(url).hostname==='127.0.0.1'),'No external asset or media requests');
  assert(!requests.some(url=>/\.onnx|vendor\/neural/.test(url)),'Model/runtime are not loaded at app start');
  assert.equal(await page.locator('footer').count(),0);await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('link',{name:'Licenses',exact:true}).waitFor();await page.getByRole('button',{name:'Close',exact:true}).click();
  records.push({browser:name,viewports:[1440,390],themes:['light','dark','system live change'],keyboardRemove:true,longNames:true,basePathAndReload:true,noExternalRequests:true,noEagerModel:true,errors});
  const limited=await browser.newContext({userAgent:'Mozilla/5.0 Firefox/145.0'});
  await limited.addInitScript(()=>{Object.defineProperty(window,'AudioDecoder',{value:undefined});Object.defineProperty(navigator,'storage',{value:undefined});Object.defineProperty(window,'Worker',{value:undefined});});
  const unsupported=await limited.newPage();
  await unsupported.goto(appUrl);
  await unsupported.getByText('Firefox is unsupported.',{exact:false}).waitFor();
  await unsupported.getByText('Temporary storage is unavailable.',{exact:false}).waitFor();
  await unsupported.getByText('Audio workers are unavailable.',{exact:false}).waitFor();
  await unsupported.getByText('Some formats need a compatibility component.',{exact:false}).waitFor();
  await limited.close();
  const iosFirefox=await browser.newContext({userAgent:'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 FxiOS/131.0 Mobile/15E148 Safari/605.1.15'});
  const iosPage=await iosFirefox.newPage();await iosPage.goto(appUrl);await iosPage.getByText('Firefox is unsupported.',{exact:false}).waitFor();await iosFirefox.close();
 }finally{await browser.close();}
}
await writeFile(`${root}/workspace-check.json`,JSON.stringify(records,null,2)+'\n');
console.log('PASS: Chromium/WebKit desktop/mobile, all themes, live system changes, keyboard removal, long names, base path/reload, privacy/lazy assets and capability recovery notices.');
